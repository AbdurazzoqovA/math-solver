import { NextResponse } from 'next/server';
import { validateRequest } from '@/lib/captcha';

const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/bmp',
  'image/tiff',
  'image/webp',
  'application/pdf',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

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

    const { base64, mimeType, source } = validation.body as { base64?: string; mimeType?: string; source?: string };

    if (!base64 || !mimeType) {
      return NextResponse.json(
        { error: 'Missing base64 or mimeType in request body.' },
        { status: 400 }
      );
    }

    if (!ACCEPTED_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload an image or PDF.' },
        { status: 400 }
      );
    }

    // Decode base64 to check size
    const fileBuffer = Buffer.from(base64, 'base64');
    if (fileBuffer.length > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10 MB.' },
        { status: 400 }
      );
    }

    const text = await recognizeWithGemini(base64, mimeType, source);
    if (text && text.trim()) {
      return NextResponse.json({ text: text.trim() });
    }
    
    return NextResponse.json(
      { error: 'Could not recognize math expressions in the provided file. Please try again with a clearer image or document.' },
      { status: 422 }
    );

  } catch (error) {
    console.error('Error in /api/ocr:', error);
    return NextResponse.json(
      { error: 'Internal server error during document analysis.' },
      { status: 500 }
    );
  }
}

/**
 * Use Google Gemini to directly interpret the document or hand-drawn math expression.
 */
async function recognizeWithGemini(base64: string, mimeType: string, source?: string): Promise<string> {
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
  const modelName = 'gemini-3.1-flash-lite';

  if (!apiKey) {
    throw new Error('Missing GOOGLE_CLOUD_API_KEY environment variable');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const systemInstructionText = source === 'drawing' 
    ? 'You are a math expression recognizer. The user has drawn a math problem by hand on a digital canvas. Your job is to accurately interpret the hand-drawn mathematical expression and output it as clean text.\n\nRules:\n- Output ONLY the mathematical expression/equation, nothing else.\n- Use standard math notation. For complex expressions use LaTeX.\n- Do NOT solve the problem.\n- Do NOT add explanations or commentary.\n- Be very careful with superscripts (exponents), subscripts, fractions, and operators.\n- If you see something like "2x²=4" write it as "2x^2 = 4" or in LaTeX as "2x^{2} = 4".\n- If multiple expressions are drawn, separate them with newlines.'
    : 'You are an OCR and Document Parsing expert for a math solver app. The user has uploaded an image or PDF of a math problem. Extract ONLY the actual math problem/equation from the document. Return it as clean, readable text. If there are LaTeX expressions, keep them. Remove problem numbers, noise, and duplicates.\n\nRules:\n- Return ONLY the cleaned math problem, nothing else.\n- Do NOT add explanations or commentary.\n- Do NOT solve the problem.\n- If there are multiple problems, separate them with newlines.\n- Keep the math notation as-is (LaTeX or plain text).';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text: systemInstructionText
          }
        ]
      },
      contents: [
        {
          parts: [
            {
              text: 'What mathematical expression is in this file? Output only the expression.'
            },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 1000,
      }
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Gemini recognition failed:', response.status, errText);
    throw new Error('Failed to recognize math expression');
  }

  const data = await response.json();
  const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  
  // Gemini sometimes includes markdown code block formatting like ```latex ... ```
  // We'll strip that out so we only return the raw text/latex
  return textContent.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '').trim();
}
