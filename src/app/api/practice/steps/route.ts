import { NextResponse } from 'next/server';
import { validateRequest } from '@/lib/captcha';
import { generateText } from '@/lib/llm';
import { PRACTICE_STEPS_SCHEMA } from '@/lib/llm-schemas';
import { buildLanguageInstruction, getLanguage } from '@/lib/i18n/locales';

const STEPS_PROMPT = `You are MathSolver, an expert AI math tutor. 
Generate a step-by-step explanation for the provided multiple-choice math question.
The output MUST be a valid JSON object with a "steps" array. Do not wrap the JSON in markdown blocks (e.g., \`\`\`json). Just return the raw JSON object.

The input will include the question, the options, and the exact index of the correct answer.
You must generate a logical step-by-step breakdown explaining HOW to arrive at that correct answer.

Use this strict schema; keep the "steps" property name unchanged:
{ "steps": [
  {
    "title": "A short, descriptive title for this step (e.g. 'Identify the knowns', 'Isolate the variable', 'Final Calculation')",
    "explanation": "A detailed markdown/latex explanation for just this specific step."
  }
] }

CRITICAL JSON RULES:
1. You MUST double-escape ALL LaTeX backslashes. For example, write \\\\cdot instead of \\cdot, \\\\frac instead of \\frac, \\\\neq instead of \\neq, etc. This is essential for the output to be valid JSON.
2. For line breaks in any string, use the standard JSON newline escape \\n (one backslash in the JSON source). Use \\n\\n when Markdown should start a new paragraph. Never double-escape a newline as \\\\n.
3. Do not include raw unescaped newlines in your string properties.
4. You MUST use standard markdown math delimiters. For inline math, use $ ... $. For block math, use $$ ... $$. Do NOT use \\( ... \\) or \\[ ... \\].`;

function readSteps(value: unknown) {
  // Azure's JSON mode requires a top-level object. The HTTP API still returns
  // the original array, and accepts legacy arrays from either provider.
  const steps = Array.isArray(value)
    ? value
    : value && typeof value === 'object' && 'steps' in value
      ? value.steps
      : null;
  if (
    !Array.isArray(steps) || steps.length === 0 ||
    !steps.every((step) => step && typeof step === 'object' &&
      typeof step.title === 'string' && typeof step.explanation === 'string')
  ) {
    throw new Error('Invalid response structure: expected nonempty step objects.');
  }
  return steps;
}

export async function POST(req: Request) {
  try {
    // ── Captcha / rate-limit gate ──
    const validation = await validateRequest(req);
    if (!validation.allowed) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    const { question, options, correctAnswerIndex, language } = validation.body as {
      question?: string;
      options?: string[];
      correctAnswerIndex?: number;
      language?: unknown;
    };

    if (!question || !options || typeof correctAnswerIndex !== 'number') {
      return NextResponse.json(
        { error: 'Invalid request format. Expected question, options, and correctAnswerIndex.' },
        { status: 400 }
      );
    }

    const correctOptionText = options[correctAnswerIndex];
    const userPrompt = `
Generate the step-by-step explanation to arrive at the correct answer for this problem:
Question: ${question}
Options: ${JSON.stringify(options)}
Correct Answer: Option ${correctAnswerIndex + 1} ("${correctOptionText}")
${language === undefined ? '' : `Write all step titles and explanations in ${getLanguage(language).name}, even if the source question uses another language.`}
`;

    const content = await generateText({
      systemInstruction: STEPS_PROMPT + buildLanguageInstruction(language, 'json'),
      messages: [
        { role: 'user', text: userPrompt },
      ],
      temperature: 0.4,
      maxOutputTokens: 2000,
      responseMimeType: 'application/json',
      jsonSchema: PRACTICE_STEPS_SCHEMA,
    });

    try {
      // 1. Remove potential markdown wrappers
      const cleanContent = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
      
      // 2. Try standard parsing first
      try {
        return NextResponse.json(readSteps(JSON.parse(cleanContent)));
      } catch (innerErr) {
        // 3. Fallback: if the AI included unescaped newlines or unescaped LaTeX backslashes
        console.warn('First pass JSON.parse failed, attempting sanitization:', innerErr);
        
        let sanitized = cleanContent;
        // Replace unescaped newlines and carriage returns with spaces to keep JSON valid
        sanitized = sanitized.replace(/[\u0000-\u001F]+/g, " ");
        // Attempt to double-escape single backslashes used for LaTeX commands that aren't valid JSON escapes.
        sanitized = sanitized.replace(/\\([^"\\\/bfnrtu])/g, '\\\\$1');
        
        return NextResponse.json(readSteps(JSON.parse(sanitized)));
      }
      
    } catch {
      console.error('Failed to parse AI practice-step response');
      return NextResponse.json(
        { error: 'Failed to parse AI response.' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in /api/practice/steps:', error);
    return NextResponse.json(
      { error: 'Internal server error while generating steps.' },
      { status: 500 }
    );
  }
}
