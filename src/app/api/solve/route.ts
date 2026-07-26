import { NextResponse } from 'next/server';
import { validateRequest } from '@/lib/captcha';
import { getCalculator } from '@/lib/calculators';
import { streamGeminiText, type GeminiMessage } from '@/lib/gemini';

// System prompt defining the AI's persona and formatting rules
const MATH_TUTOR_PROMPT = `You are MathSolver, an expert AI math tutor. Your goal is to provide clear, visually distinct, and step-by-step solutions to mathematical problems. Start directly with the steps.

CRITICAL FORMATTING RULES:
0. ABSOLUTELY NO CONVERSATIONAL FILLER. Do not say "I see you have an equation..." or "Let's break it down...". Start immediately with Step 1.
1. Break down the solution into logical steps using **BOLD** text for headers like **Step 1: Identify the coefficients**. Do NOT use markdown headers like hash symbols.
2. IMMEDIATELY before every new step (starting from Step 1), you MUST output a DOUBLE newline, then a Markdown horizontal rule (---), then another DOUBLE newline, to act as a visual divider with plenty of blank space.
3. Do NOT write dense paragraphs. Use line breaks and bullet points to keep explanations airy and easy to read.
4. ALWAYS use LaTeX for mathematical expressions.
5. Use inline math ($x^2$) for equations within a sentence.
6. Use block math ($$ ... $$) for larger equations, but do not force everything into block math if it breaks the flow of the explanation. Let your LaTeX formatting dictate what is centered and what is aligned left.
7. NEVER use plain text for math symbols (like writing 'x^2' without dollar signs).
8. Explain *why* you are doing a step, not just *what* you are doing, but keep it concise.
9. End the solution with a clear, distinct section headed **Final Answer** showing the final outcome in a $$ block.`;

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

    const { messages, source } = validation.body as {
      messages?: unknown;
      source?: unknown;
    };

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid request format. Expected an array of messages.' },
        { status: 400 }
      );
    }

    const calculatorSlug =
      typeof source === 'string' && source.startsWith('calculator:')
        ? source.slice('calculator:'.length)
        : null;
    const calculator = calculatorSlug ? getCalculator(calculatorSlug) : undefined;
    const systemPrompt = calculator?.solverInstruction
      ? `${MATH_TUTOR_PROMPT}

CALCULATOR MODE:
The user started this chat from the ${calculator.name}. Apply this trusted topic instruction:
${calculator.solverInstruction}`
      : MATH_TUTOR_PROMPT;

    const geminiMessages = messages.flatMap((message): GeminiMessage[] => {
      if (!message || typeof message !== 'object') return [];
      const role = 'role' in message ? message.role : undefined;
      const content = 'content' in message ? message.content : undefined;
      if (
        (role !== 'user' && role !== 'assistant') ||
        typeof content !== 'string'
      ) {
        return [];
      }
      return [{ role: role === 'assistant' ? 'model' : 'user', text: content }];
    });

    if (geminiMessages.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request format. Expected text messages.' },
        { status: 400 }
      );
    }

    // Calculator instructions are looked up from the server registry, never
    // trusted from client text.
    const stream = await streamGeminiText({
      systemInstruction: systemPrompt,
      messages: geminiMessages,
      temperature: 0.2,
      maxOutputTokens: 2000,
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error in /api/solve:', error);
    return NextResponse.json(
      { error: 'Internal server error while processing the problem.' },
      { status: 500 }
    );
  }
}
