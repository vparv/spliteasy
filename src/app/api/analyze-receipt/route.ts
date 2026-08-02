import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
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

interface AnalyzeReceiptBody {
  imageData?: unknown;
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

  let body: AnalyzeReceiptBody;

  try {
    body = (await request.json()) as AnalyzeReceiptBody;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (typeof body.imageData !== 'string') {
    return NextResponse.json({ error: 'A receipt image is required.' }, { status: 400 });
  }

  const imageMatch = body.imageData.match(
    /^data:(image\/(?:jpeg|png|webp|heic|heif));base64,([A-Za-z0-9+/=\r\n]+)$/,
  );

  if (!imageMatch) {
    return NextResponse.json({ error: 'Unsupported receipt image format.' }, { status: 400 });
  }

  const [, mimeType, base64Image] = imageMatch;
  const imageBytes = Buffer.from(base64Image, 'base64').byteLength;

  if (imageBytes > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: 'Receipt image must be smaller than 3 MB.' },
      { status: 413 },
    );
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent([
      RECEIPT_PROMPT,
      {
        inlineData: {
          data: base64Image,
          mimeType,
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
  }
}
