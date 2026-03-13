import { NextResponse } from 'next/server';

// System prompt defining the AI's persona and formatting rules
const MATH_TUTOR_PROMPT = `You are MathSolver, an expert AI math tutor. Your goal is to provide clear, accurate, and step-by-step solutions to mathematical problems.

CRITICAL FORMATTING RULES:
1. Always break down the solution into logical, numbered steps.
2. Make step headers **BOLD** (e.g., **Step 1: Simplify the equation** or **Step 1:**).
3. ALWAYS use LaTeX for mathematical expressions.
4. For inline math, wrap the expression in single dollar signs: \`$x^2$\`.
5. For block math (equations on their own line), wrap the expression in double dollar signs: \`$$y = mx + b$$\`.
6. NEVER use plain text for math symbols (like writing 'x^2' without dollar signs).
7. Explain *why* you are doing a step, not just *what* you are doing. Be encouraging and educational.
8. If the problem is not math or STEM related, gently remind the user that you are a math tutor.`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

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
