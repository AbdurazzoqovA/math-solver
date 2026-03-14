import { NextResponse } from 'next/server';
import { validateRequest } from '@/lib/captcha';

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

    const { messages } = validation.body as { messages?: unknown };

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid request format. Expected an array of messages.' },
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

    // Construct the payload for Azure OpenAI
    // We prepend the system prompt to guide the model's behavior
    const payload = {
      messages: [
        { role: 'system', content: MATH_TUTOR_PROMPT },
        ...messages
      ],
      temperature: 0.2, // Low temperature for more deterministic, accurate math logic
      max_tokens: 2000,
      stream: true,
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

    if (!response.body) {
      throw new Error('No body returned from Azure OpenAI');
    }

    // Create a robust stream that converts Azure's SSE format into clean text chunks
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;
              if (trimmedLine === 'data: [DONE]') continue;

              try {
                const data = JSON.parse(trimmedLine.slice(6));
                const content = data.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(new TextEncoder().encode(content));
                }
              } catch (e) {
                console.warn('Could not parse SSE line', trimmedLine, e);
              }
            }
          }

          // Flush whatever is left in the buffer
          if (buffer.trim() && buffer.startsWith('data: ') && buffer.trim() !== 'data: [DONE]') {
            try {
              const data = JSON.parse(buffer.trim().slice(6));
              const content = data.choices?.[0]?.delta?.content;
              if (content) {
                controller.enqueue(new TextEncoder().encode(content));
              }
            } catch (e) { }
          }
        } catch (e) {
          console.error('Error reading stream', e);
        } finally {
          controller.close();
        }
      }
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
