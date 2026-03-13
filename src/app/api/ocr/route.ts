import { NextResponse } from 'next/server';

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
    const { base64, mimeType } = await req.json();

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

    const diKey = process.env.AZURE_DI_KEY;
    const diEndpoint = process.env.AZURE_DI_ENDPOINT;

    if (!diKey || !diEndpoint) {
      console.error('Missing AZURE_DI_KEY or AZURE_DI_ENDPOINT environment variables');
      return NextResponse.json(
        { error: 'Server configuration error for document analysis.' },
        { status: 500 }
      );
    }

    // ---- Step 1: Submit the document for analysis ----
    // Using the prebuilt-read model with formula extraction add-on
    const analyzeUrl = `${diEndpoint.replace(/\/$/, '')}/documentintelligence/documentModels/prebuilt-read:analyze?api-version=2024-11-30&features=formulas`;

    const submitResponse = await fetch(analyzeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': diKey,
      },
      body: JSON.stringify({
        base64Source: base64,
      }),
    });

    if (!submitResponse.ok) {
      const errText = await submitResponse.text();
      console.error('Azure DI submit error:', submitResponse.status, errText);
      return NextResponse.json(
        { error: 'Failed to submit document for analysis.' },
        { status: 502 }
      );
    }

    const operationLocation = submitResponse.headers.get('Operation-Location');
    if (!operationLocation) {
      console.error('No Operation-Location header in Azure DI response');
      return NextResponse.json(
        { error: 'Unexpected response from document analysis service.' },
        { status: 502 }
      );
    }

    // ---- Step 2: Poll until the analysis is complete ----
    const maxAttempts = 30; // 30 seconds max
    const pollInterval = 1000; // 1 second

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      const pollResponse = await fetch(operationLocation, {
        method: 'GET',
        headers: {
          'Ocp-Apim-Subscription-Key': diKey,
        },
      });

      if (!pollResponse.ok) {
        const errText = await pollResponse.text();
        console.error('Azure DI poll error:', pollResponse.status, errText);
        return NextResponse.json(
          { error: 'Error while checking analysis status.' },
          { status: 502 }
        );
      }

      const result = await pollResponse.json();
      const status = result.status;

      if (status === 'succeeded') {
        // ---- Step 3: Extract text from the result ----
        const rawText = extractTextFromResult(result.analyzeResult);

        // ---- Step 4: Clean via GPT to extract only the math problem ----
        const cleanedText = await cleanOcrWithGpt(rawText);
        return NextResponse.json({ text: cleanedText });
      }

      if (status === 'failed') {
        console.error('Azure DI analysis failed:', JSON.stringify(result));
        return NextResponse.json(
          { error: 'Document analysis failed. Please try a different file.' },
          { status: 422 }
        );
      }

      // status is 'running' or 'notStarted' — continue polling
    }

    // Timed out
    return NextResponse.json(
      { error: 'Document analysis timed out. Please try a smaller file.' },
      { status: 504 }
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
 * Use GPT to clean up raw OCR text and extract only the math problem.
 * Strips noise like problem numbers, stray fragments, and OCR artifacts.
 */
async function cleanOcrWithGpt(rawText: string): Promise<string> {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;

  if (!apiKey || !endpoint || !rawText.trim()) {
    return rawText; // Fallback to raw text
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: `You are an OCR post-processor for a math solver app. The user has uploaded an image of a math problem. The OCR has extracted raw text which may include noise like problem numbers (e.g. "2)"), stray text fragments, or partial duplicates.

Your job: Extract ONLY the actual math problem/equation from the raw OCR text. Return it as clean, readable text. If there are LaTeX expressions, keep them. Remove problem numbers, noise, and duplicates.

Rules:
- Return ONLY the cleaned math problem, nothing else.
- Do NOT add explanations or commentary.
- Do NOT solve the problem.
- If there are multiple problems, separate them with newlines.
- Keep the math notation as-is (LaTeX or plain text).`
          },
          {
            role: 'user',
            content: `Raw OCR text:\n${rawText}`
          }
        ],
        temperature: 0,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.warn('GPT cleanup failed, returning raw text');
      return rawText;
    }

    const data = await response.json();
    const cleaned = data.choices?.[0]?.message?.content?.trim();
    return cleaned || rawText;
  } catch (error) {
    console.warn('GPT cleanup error, returning raw text:', error);
    return rawText;
  }
}

/**
 * Extract readable text from the Azure DI analyzeResult.
 *
 * Azure DI with the "formulas" add-on inserts `:formula:` placeholders into
 * `analyzeResult.content` and stores actual LaTeX values in per-page
 * `formulas[]` arrays, each with a `span` indicating offset + length inside
 * the content string. We replace each placeholder with the real LaTeX,
 * wrapped in $ (inline) or $$ (display).
 */
function extractTextFromResult(analyzeResult: AnalyzeResult): string {
  if (!analyzeResult) return '';

  const content = analyzeResult.content || '';

  // Collect all formulas across all pages, sorted by span offset
  const allFormulas: Formula[] = [];
  if (analyzeResult.pages) {
    for (const page of analyzeResult.pages) {
      if (page.formulas) {
        allFormulas.push(...page.formulas);
      }
    }
  }

  // If no formulas, return the raw content
  if (allFormulas.length === 0) {
    return content;
  }

  // Sort formulas by span offset descending so we can replace from the end
  // without shifting earlier offsets
  const formulasWithSpans = allFormulas
    .filter((f) => f.span && f.value)
    .sort((a, b) => (b.span!.offset) - (a.span!.offset));

  let result = content;

  for (const formula of formulasWithSpans) {
    const { offset, length } = formula.span!;

    // Replace the span region (which contains `:formula:` placeholder) with raw LaTeX
    result = result.slice(0, offset) + formula.value + result.slice(offset + length);
  }

  return result.trim();
}

// ---- Type definitions for Azure DI response ----

interface Span {
  offset: number;
  length: number;
}

interface Formula {
  value: string;
  kind?: 'inline' | 'display';
  span?: Span;
  confidence?: number;
}

interface Page {
  pageNumber: number;
  lines?: { content: string }[];
  formulas?: Formula[];
}

interface AnalyzeResult {
  content?: string;
  pages?: Page[];
}
