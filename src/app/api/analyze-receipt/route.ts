import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com';
const RECEIPT_PROMPT = `Analyze this receipt image carefully and extract ALL items and charges. Return ONLY a valid JSON object with no additional text, markdown, or code blocks.

IMPORTANT RULES:
1. Look for quantity indicators like "2x", "x2", "Qty: 2", or a number before/after the item name
2. If an item has quantity > 1, the "price" should be the TOTAL price for all units (not unit price)
3. Include ALL items on the receipt, even if they appear similar
4. Do NOT skip any items or combine them
5. Extract ALL additional charges into the "fees" array - this includes:
   - Service fees / Service charge
   - Delivery fees
   - Tip / Gratuity (if already added to bill)
   - Convenience fees
   - Platform fees
   - Processing fees
   - Any other surcharges or additional charges
6. Tax should go in "tax", NOT in fees
7. The goal is to capture the ENTIRE bill total

Return this exact JSON structure:
{
  "merchant": "store name",
  "date": "YYYY-MM-DD",
  "tax": 0.00,
  "fees": [
    { "name": "Service Fee", "amount": 0.00 },
    { "name": "Delivery Fee", "amount": 0.00 }
  ],
  "items": [
    { "name": "item name", "quantity": 1, "price": 0.00 }
  ]
}

Rules for values:
- "price" = total price for that line item (quantity × unit price)
- "quantity" = number of units (default 1 if not shown)
- "fees" = array of all additional charges (service fee, delivery fee, tip, etc.)
- "tax" = sales tax only
- All amounts must be numbers without currency symbols
- Date format: YYYY-MM-DD
- If no fees exist, return an empty fees array: "fees": []`;

interface CreateUploadBody {
  action: 'create-upload';
  fileName?: unknown;
  mimeType?: unknown;
  size?: unknown;
}

interface AnalyzeBody {
  action: 'analyze';
  fileName?: unknown;
}

interface GeminiFile {
  name?: string;
  uri?: string;
  mimeType?: string;
  sizeBytes?: string;
  state?: string;
}

async function createUpload(body: CreateUploadBody, apiKey: string) {
  if (
    typeof body.fileName !== 'string' ||
    typeof body.mimeType !== 'string' ||
    typeof body.size !== 'number' ||
    !Number.isInteger(body.size) ||
    body.size <= 0
  ) {
    return NextResponse.json({ error: 'Invalid receipt image.' }, { status: 400 });
  }

  if (!ALLOWED_IMAGE_TYPES.has(body.mimeType)) {
    return NextResponse.json({ error: 'Unsupported receipt image format.' }, { status: 400 });
  }

  if (body.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: 'Each receipt photo must be smaller than 20 MB.' },
      { status: 413 },
    );
  }

  try {
    const response = await fetch(`${GEMINI_API_BASE}/upload/v1beta/files`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': String(body.size),
        'X-Goog-Upload-Header-Content-Type': body.mimeType,
      },
      body: JSON.stringify({
        file: { display_name: body.fileName.slice(0, 255) },
      }),
    });

    const uploadUrl = response.headers.get('x-goog-upload-url');

    if (!response.ok || !uploadUrl) {
      console.error('Gemini upload initialization failed:', response.status);
      return NextResponse.json(
        { error: 'Failed to prepare receipt upload. Please try again.' },
        { status: 502 },
      );
    }

    return NextResponse.json({ uploadUrl });
  } catch (error) {
    console.error('Gemini upload initialization failed:', error);
    return NextResponse.json(
      { error: 'Failed to prepare receipt upload. Please try again.' },
      { status: 502 },
    );
  }
}

async function analyzeFile(body: AnalyzeBody, apiKey: string) {
  if (
    typeof body.fileName !== 'string' ||
    !/^files\/[A-Za-z0-9_-]+$/.test(body.fileName)
  ) {
    return NextResponse.json({ error: 'Invalid uploaded receipt.' }, { status: 400 });
  }

  try {
    const metadataResponse = await fetch(
      `${GEMINI_API_BASE}/v1beta/${body.fileName}`,
      { headers: { 'X-Goog-Api-Key': apiKey } },
    );

    if (!metadataResponse.ok) {
      throw new Error(`Gemini file lookup failed with status ${metadataResponse.status}`);
    }

    const file = (await metadataResponse.json()) as GeminiFile;
    const fileSize = Number(file.sizeBytes);

    if (
      !file.uri ||
      !file.mimeType ||
      !ALLOWED_IMAGE_TYPES.has(file.mimeType) ||
      !Number.isFinite(fileSize) ||
      fileSize <= 0 ||
      fileSize > MAX_IMAGE_BYTES ||
      (file.state && file.state !== 'ACTIVE')
    ) {
      return NextResponse.json({ error: 'Uploaded receipt is not valid.' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent([
      RECEIPT_PROMPT,
      {
        fileData: {
          fileUri: file.uri,
          mimeType: file.mimeType,
        },
      },
    ]);

    return NextResponse.json({ analysis: result.response.text() });
  } catch (error) {
    console.error('Gemini receipt analysis failed:', error);
    return NextResponse.json(
      { error: 'Failed to analyze receipt. Please try again.' },
      { status: 502 },
    );
  } finally {
    try {
      const deleteResponse = await fetch(
        `${GEMINI_API_BASE}/v1beta/${body.fileName}`,
        {
          method: 'DELETE',
          headers: { 'X-Goog-Api-Key': apiKey },
        },
      );

      if (!deleteResponse.ok && deleteResponse.status !== 404) {
        console.error('Gemini file cleanup failed:', deleteResponse.status);
      }
    } catch (error) {
      console.error('Gemini file cleanup failed:', error);
    }
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('GEMINI_API_KEY is not configured');
    return NextResponse.json(
      { error: 'Receipt analysis is not configured.' },
      { status: 500 },
    );
  }

  let body: CreateUploadBody | AnalyzeBody;

  try {
    body = (await request.json()) as CreateUploadBody | AnalyzeBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (body.action === 'create-upload') {
    return createUpload(body, apiKey);
  }

  if (body.action === 'analyze') {
    return analyzeFile(body, apiKey);
  }

  return NextResponse.json({ error: 'Invalid request action.' }, { status: 400 });
}
