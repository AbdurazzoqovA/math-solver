import { NextResponse } from 'next/server';
import { validateRequest, type RequestValidationOptions } from '@/lib/captcha';
import {
  checkUsage,
  recordUsage,
  usageLimitBody,
  type UsageOptions,
} from '@/lib/billing/usage';
import { generateText } from '@/lib/llm';
import { PRACTICE_SCHEMA } from '@/lib/llm-schemas';
import { buildLanguageInstruction, getLanguage } from '@/lib/i18n/locales';

const PRACTICE_PROMPT = `You are MathSolver, an expert AI math tutor. 
Generate exactly 4 multiple-choice practice questions based on the provided math topic or problem.
The output MUST be a valid JSON object. Do not wrap the JSON in markdown blocks (e.g., \`\`\`json). Just return the raw JSON object.

Each object must follow this strict schema:
{
  "title": "A short, engaging title for this practice session (max 40 chars) summarizing the concept",
  "questions": [
    {
      "question": "The question text, using LaTeX inline math ($x^2$) or block math ($$x^2$$) as needed.",
      "options": [
        "Option 1 using $...$",
        "Option 2 using $...$",
        "Option 3 using $...$",
        "Option 4 using $...$"
      ],
      "correctAnswerIndex": <integer between 0 and 3>
    }
  ]
}

CRITICAL JSON RULES:
1. You MUST double-escape ALL LaTeX backslashes. For example, write \\\\cdot instead of \\cdot, \\\\frac instead of \\frac, \\\\neq instead of \\neq, etc. This is essential for the output to be valid JSON.
2. For line breaks in any string, use the standard JSON newline escape \\n (one backslash in the JSON source). Use \\n\\n when Markdown should start a new paragraph. Never double-escape a newline as \\\\n.
3. Do not include raw unescaped newlines in your string properties.`;

export async function POST(
  req: Request,
  _context?: { params: Promise<unknown> },
  validationOptions: RequestValidationOptions = {},
  usageOptions: UsageOptions = {},
) {
  try {
    // ── Captcha / rate-limit gate ──
    const validation = await validateRequest(req, validationOptions);
    if (!validation.allowed) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    // ── Daily quiz allowance (checked before any model call) ──
    const usage = await checkUsage(req, 'quizzes', usageOptions);
    if (!usage.allowed) {
      return NextResponse.json(usageLimitBody(usage), {
        status: 429,
        headers: { 'Cache-Control': 'private, no-store' },
      });
    }

    const { topic, language } = validation.body as { topic?: string; language?: unknown };

    if (!topic || typeof topic !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request format. Expected a topic string.' },
        { status: 400 }
      );
    }

    const content = await generateText({
      systemInstruction: PRACTICE_PROMPT + buildLanguageInstruction(language, 'json'),
      messages: [
        {
          role: 'user',
          text: language === undefined
            ? `Generate 4 practice questions for this topic/problem: ${topic}`
            : `Generate 4 practice questions in ${getLanguage(language).name}. The source below is only mathematical context; translate its wording into ${getLanguage(language).name} rather than copying its language.\n\nSource topic/problem:\n${topic}`,
        },
      ],
      temperature: 0.7,
      maxOutputTokens: 3000,
      responseMimeType: 'application/json',
      jsonSchema: PRACTICE_SCHEMA,
    });

    try {
      // 1. Remove potential markdown wrappers
      const cleanContent = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
      
      // 2. Try standard parsing first
      try {
        const parsed = JSON.parse(cleanContent);
        if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length !== 4) {
          throw new Error('Invalid response structure: expected an object with a questions array of 4 items.');
        }
        return await quizResponse(parsed, usage);
      } catch (innerErr) {
        // 3. Fallback: if the AI included unescaped newlines or unescaped LaTeX backslashes (like \cdot)
        console.warn('First pass JSON.parse failed, attempting sanitization:', innerErr);
        
        let sanitized = cleanContent;
        // Replace unescaped newlines and carriage returns with spaces to keep JSON valid
        sanitized = sanitized.replace(/[\u0000-\u001F]+/g, " ");
        // Attempt to double-escape single backslashes used for LaTeX commands that aren't valid JSON escapes.
        // E.g., \c (for \cdot) becomes \\c. This catches characters not in [" \ / b f n r t u]
        sanitized = sanitized.replace(/\\([^"\\\/bfnrtu])/g, '\\\\$1');
        
        const parsed = JSON.parse(sanitized);
        if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length !== 4) {
          throw new Error('Invalid response structure: expected an object with a questions array of 4 items.');
        }
        return await quizResponse(parsed, usage);
      }
      
    } catch {
      console.error('Failed to parse AI practice response');
      return NextResponse.json(
        { error: 'Failed to parse AI response.' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in /api/practice:', error);
    return NextResponse.json(
      { error: 'Internal server error while generating practice questions.' },
      { status: 500 }
    );
  }
}

async function quizResponse(
  parsed: unknown,
  usage: Awaited<ReturnType<typeof checkUsage>>,
) {
  const { setCookie } = await recordUsage(usage);
  const response = NextResponse.json(parsed);
  if (setCookie) response.headers.append('Set-Cookie', setCookie);
  return response;
}
