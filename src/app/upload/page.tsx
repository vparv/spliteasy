'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabase';

interface Fee {
  name: string;
  amount: number;
}

interface ItemizedList {
  merchant?: string;
  date?: string;
  tax?: number;
  fees?: Fee[];
  items: Array<{
    name: string;
    price: number;
    quantity?: number;
  }>;
}

interface RawItem {
  name: string | undefined;
  price: string | number | undefined;
  quantity?: string | number | undefined;
}

interface RawFee {
  name: string | undefined;
  amount: string | number | undefined;
}

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');

export default function Upload() {
  const [previews, setPreviews] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddPhoto = () => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = "image/*";
      fileInputRef.current.click();
    }
  };

  const removePhoto = (index: number) => {
    setPreviews(prev => prev.filter((_, i) => i !== index));
    setError(null);
  };

  const parseAnalysis = (analysisText: string | null): ItemizedList => {
    if (!analysisText) {
      throw new Error('No analysis text provided');
    }

    try {
      // Try to parse the response as JSON
      let parsed;
      try {
        parsed = JSON.parse(analysisText);
      } catch (e) {
        // If direct parsing fails, try to find a JSON object in the text
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Could not find valid JSON in the response');
        }
      }

      // Validate the structure
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid response format: not an object');
      }

      if (!Array.isArray(parsed.items)) {
        throw new Error('Invalid response format: items is not an array');
      }

      // Parse optional fields
      let merchant: string | undefined = undefined;
      let date: string | undefined = undefined;
      let tax: number | undefined = undefined;

      // Parse merchant if present
      if (parsed.merchant && typeof parsed.merchant === 'string') {
        merchant = parsed.merchant;
      }

      // Parse date if present and valid
      if (parsed.date && typeof parsed.date === 'string') {
        // Check if it's a valid date (not a placeholder like "YYYY-MM-DD")
        const dateStr = parsed.date.trim();
        // Try to parse as a date - must have actual numbers
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          const parsedDate = new Date(dateStr);
          if (!isNaN(parsedDate.getTime())) {
            date = dateStr;
          }
        } else if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(dateStr)) {
          // Handle MM/DD/YYYY or M/D/YY format
          const parts = dateStr.split('/');
          const month = parts[0].padStart(2, '0');
          const day = parts[1].padStart(2, '0');
          let year = parts[2];
          if (year.length === 2) {
            year = '20' + year;
          }
          const isoDate = `${year}-${month}-${day}`;
          const parsedDate = new Date(isoDate);
          if (!isNaN(parsedDate.getTime())) {
            date = isoDate;
          }
        }
        // If date couldn't be parsed, leave it undefined
      }

      // Parse tax if present
      if (parsed.tax !== undefined) {
        const parsedTax = typeof parsed.tax === 'string'
          ? parseFloat(parsed.tax.replace(/[^0-9.-]+/g, ''))
          : Number(parsed.tax);

        if (!isNaN(parsedTax)) {
          tax = parsedTax;
        }
      }

      // Parse fees if present
      const fees: Fee[] = [];
      if (Array.isArray(parsed.fees)) {
        parsed.fees.forEach((fee: RawFee) => {
          if (fee.name) {
            const amount = typeof fee.amount === 'string'
              ? parseFloat(fee.amount.replace(/[^0-9.-]+/g, ''))
              : Number(fee.amount);

            if (!isNaN(amount) && amount !== 0) {
              fees.push({
                name: String(fee.name),
                amount: amount
              });
            }
          }
        });
      }

      // Convert and validate each item, expanding quantities into separate line items
      const validatedItems: Array<{ name: string; price: number }> = [];

      parsed.items.forEach((item: RawItem, index: number) => {
        if (!item.name) {
          throw new Error(`Item at index ${index} is missing a name`);
        }

        const totalPrice = typeof item.price === 'string'
          ? parseFloat(item.price.replace(/[^0-9.-]+/g, ''))
          : Number(item.price);

        if (isNaN(totalPrice)) {
          throw new Error(`Invalid price for item "${item.name}"`);
        }

        // Parse quantity (default to 1 if not provided)
        const quantity = item.quantity
          ? (typeof item.quantity === 'string' ? parseInt(item.quantity, 10) : Number(item.quantity))
          : 1;

        const validQuantity = isNaN(quantity) || quantity < 1 ? 1 : quantity;

        // Calculate unit price and expand into individual items
        const unitPrice = Math.round((totalPrice / validQuantity) * 100) / 100;

        for (let i = 0; i < validQuantity; i++) {
          validatedItems.push({
            name: String(item.name),
            price: unitPrice
          });
        }
      });

      const result: ItemizedList = { items: validatedItems };
      if (merchant !== undefined) result.merchant = merchant;
      if (date !== undefined) result.date = date;
      if (tax !== undefined) result.tax = tax;
      if (fees.length > 0) result.fees = fees;

      return result;
    } catch (e) {
      console.error('Failed to parse analysis:', e);
      throw new Error(`Failed to parse receipt: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const analyzeImage = async (imageData: string): Promise<ItemizedList> => {
    const [mimeInfo, base64Image] = imageData.split(',');
    const mimeType = mimeInfo.match(/:(.*?);/)?.[1] || 'image/jpeg';

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Analyze this receipt image carefully and extract ALL items and charges. Return ONLY a valid JSON object with no additional text, markdown, or code blocks.

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

    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: mimeType,
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const rawAnalysis = response.text();

    return parseAnalysis(rawAnalysis);
  };

  const handleContinue = async () => {
    if (previews.length === 0) return;

    try {
      setIsAnalyzing(true);
      setError(null);

      // Analyze all images and combine results
      const allResults: ItemizedList[] = [];

      for (const preview of previews) {
        const result = await analyzeImage(preview);
        allResults.push(result);
      }

      // Combine all items from all receipts
      const combinedItems: Array<{ name: string; price: number }> = [];
      const combinedFees: Fee[] = [];
      let totalTax = 0;
      let merchant: string | undefined;
      let date: string | undefined;

      for (const result of allResults) {
        combinedItems.push(...result.items);
        if (result.tax) totalTax += result.tax;
        if (result.fees) combinedFees.push(...result.fees);
        // Use the first merchant/date found
        if (!merchant && result.merchant) merchant = result.merchant;
        if (!date && result.date) date = result.date;
      }

      if (combinedItems.length === 0) {
        throw new Error('No items were found in the receipt(s)');
      }

      const combinedResult: ItemizedList = {
        items: combinedItems,
        tax: totalTax > 0 ? totalTax : undefined,
        fees: combinedFees.length > 0 ? combinedFees : undefined,
        merchant,
        date,
      };

      // Generate a unique receipt ID (timestamp + random string)
      const receiptId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

      // Store the receipt data in Supabase
      const { error: insertError } = await supabase
        .from('receipts')
        .insert([
          {
            id: receiptId,
            raw_analysis: JSON.stringify({ imageCount: previews.length, results: allResults }),
            itemized_list: combinedResult,
            merchant: combinedResult.merchant,
            date: combinedResult.date,
            tax: combinedResult.tax,
            created_at: new Date().toISOString()
          }
        ]);

      if (insertError) {
        throw new Error(`Failed to save receipt: ${insertError.message}`);
      }

      // Navigate to the next page with the receipt ID
      router.push(`/items?receipt=${receiptId}`);
    } catch (error) {
      console.error('Error processing receipt:', error);
      setError(error instanceof Error ? error.message : 'Failed to process receipt. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center space-y-8">
        {/* Page Title */}
        <h1 className="text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
          Upload Receipt
        </h1>

        {/* Upload Area */}
        <div className="w-full space-y-4">
          {/* Photo Grid */}
          {previews.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {previews.map((preview, index) => (
                <div key={index} className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-gray-50">
                  <Image
                    src={preview}
                    alt={`Receipt ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                  <button
                    onClick={() => removePhoto(index)}
                    className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Photo Button */}
          <button
            onClick={handleAddPhoto}
            className={`w-full py-4 px-6 ${previews.length > 0 ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40'} rounded-2xl flex items-center justify-center space-x-3 transition-all text-xl font-medium`}
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {previews.length > 0 ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              )}
            </svg>
            <span>{previews.length > 0 ? 'Add Another Photo' : 'Add Photo'}</span>
          </button>

          {previews.length > 0 && (
            <p className="text-center text-sm text-gray-500">
              {previews.length} photo{previews.length > 1 ? 's' : ''} added
            </p>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*"
            multiple
          />

          {error && (
            <div className="mt-4 text-red-500 text-sm text-center">
              {error}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex w-full space-x-4">
          <Link
            href="/"
            className="w-1/2 py-4 px-6 border-2 border-blue-600 text-blue-600 rounded-2xl transition-all duration-300 font-medium text-center text-lg hover:bg-blue-50"
          >
            Back
          </Link>
          <button
            onClick={handleContinue}
            disabled={previews.length === 0 || isAnalyzing}
            className={`w-1/2 py-4 px-6 bg-blue-500 text-white rounded-2xl transition-all duration-300 font-medium text-lg text-center hover:bg-blue-600 relative
              ${(previews.length === 0 || isAnalyzing) && 'opacity-50 cursor-not-allowed'}`}
          >
            {isAnalyzing ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing...
              </div>
            ) : (
              'Continue'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
