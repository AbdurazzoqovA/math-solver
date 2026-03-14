import { NextResponse } from 'next/server';
import { validateRequest } from '@/lib/captcha';

const STEPS_PROMPT = `You are MathSolver, an expert AI math tutor. 
Generate a step-by-step explanation for the provided multiple-choice math question.
The output MUST be a valid JSON array of step objects. Do not wrap the JSON in markdown blocks (e.g., \`\`\`json). Just return the raw JSON array.

The input will include the question, the options, and the exact index of the correct answer.
You must generate a logical step-by-step breakdown explaining HOW to arrive at that correct answer.

Each object in the array must follow this strict schema:
[
  {
    "title": "A short, descriptive title for this step (e.g. 'Identify the knowns', 'Isolate the variable', 'Final Calculation')",
    "explanation": "A detailed markdown/latex explanation for just this specific step."
  }
]

CRITICAL JSON RULES:
1. You MUST double-escape ALL LaTeX backslashes. For example, write \\\\cdot instead of \\cdot, \\\\frac instead of \\frac, \\\\neq instead of \\neq, etc. This is essential for the output to be valid JSON.
2. For line breaks in any string, use double-escaped newlines: \\\\n
3. Do not include raw unescaped newlines in your string properties.
4. You MUST use standard markdown math delimiters. For inline math, use $ ... $. For block math, use $$ ... $$. Do NOT use \\( ... \\) or \\[ ... \\].`;

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

    const { question, options, correctAnswerIndex } = validation.body as {
      question?: string;
      options?: string[];
      correctAnswerIndex?: number;
    };

    if (!question || !options || typeof correctAnswerIndex !== 'number') {
      return NextResponse.json(
        { error: 'Invalid request format. Expected question, options, and correctAnswerIndex.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;

    if (!apiKey || !endpoint) {
      console.error('Missing Azure OpenAI environment variables');
      return NextResponse.json(
        { error: 'Server configuration error.' },
        { status: 500 }
      );
    }

    const correctOptionText = options[correctAnswerIndex];
    const userPrompt = `
Generate the step-by-step explanation to arrive at the correct answer for this problem:
Question: ${question}
Options: ${JSON.stringify(options)}
Correct Answer: Option ${correctAnswerIndex + 1} ("${correctOptionText}")
`;

    const payload = {
      messages: [
        { role: 'system', content: STEPS_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.4, // slightly lower temperature for more deterministic logic steps
      max_tokens: 2000,
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Azure OpenAI API Error:', response.status, errorData);
      return NextResponse.json(
        { error: 'Failed to communicate with AI provider.' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content returned from Azure OpenAI');
    }

    try {
      // 1. Remove potential markdown wrappers
      const cleanContent = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
      
      // 2. Try standard parsing first
      try {
        const parsed = JSON.parse(cleanContent);
        if (!Array.isArray(parsed)) {
          throw new Error('Invalid response structure: expected a JSON array of step objects.');
        }
        return NextResponse.json(parsed);
      } catch (innerErr) {
        // 3. Fallback: if the AI included unescaped newlines or unescaped LaTeX backslashes
        console.warn('First pass JSON.parse failed, attempting sanitization:', innerErr);
        
        let sanitized = cleanContent;
        // Replace unescaped newlines and carriage returns with spaces to keep JSON valid
        sanitized = sanitized.replace(/[\u0000-\u001F]+/g, " ");
        // Attempt to double-escape single backslashes used for LaTeX commands that aren't valid JSON escapes.
        sanitized = sanitized.replace(/\\([^"\\\/bfnrtu])/g, '\\\\$1');
        
        const parsed = JSON.parse(sanitized);
        if (!Array.isArray(parsed)) {
          throw new Error('Invalid response structure: expected a JSON array of step objects.');
        }
        return NextResponse.json(parsed);
      }
      
    } catch (parseError) {
      console.error('Failed to parse AI JSON response:', content);
      return NextResponse.json(
        { error: 'Failed to parse AI response.', details: content },
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
