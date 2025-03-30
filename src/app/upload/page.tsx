'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabase';

interface ItemizedList {
  merchant?: string;
  date?: string;
  tax?: number;
  items: Array<{
    name: string;
    price: number;
  }>;
}

interface RawItem {
  name: string | undefined;
  price: string | number | undefined;
}

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export default function Upload() {
  const [preview, setPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddPhoto = () => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = "image/*";
      fileInputRef.current.click();
    }
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

      // Parse date if present
      if (parsed.date && typeof parsed.date === 'string') {
        date = parsed.date;
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

      // Convert and validate each item
      const validatedItems = parsed.items.map((item: RawItem, index: number) => {
        if (!item.name) {
          throw new Error(`Item at index ${index} is missing a name`);
        }

        const price = typeof item.price === 'string' 
          ? parseFloat(item.price.replace(/[^0-9.-]+/g, ''))
          : Number(item.price);

        if (isNaN(price)) {
          throw new Error(`Invalid price for item "${item.name}"`);
        }

        return {
          name: String(item.name),
          price: price
        };
      });

      const result: ItemizedList = { items: validatedItems };
      if (merchant !== undefined) result.merchant = merchant;
      if (date !== undefined) result.date = date;
      if (tax !== undefined) result.tax = tax;

      return result;
    } catch (e) {
      console.error('Failed to parse analysis:', e);
      throw new Error(`Failed to parse receipt: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const handleContinue = async () => {
    if (!preview) return;
    
    try {
      setIsAnalyzing(true);
      setError(null);

      // Remove the data:image/[type];base64, prefix
      const base64Image = preview.split(',')[1];

      // Analyze the receipt with GPT-4V
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this receipt and return ONLY a JSON object in this exact format, with no additional text:\n{\n  \"merchant\": \"store name\",\n  \"date\": \"YYYY-MM-DD\",\n  \"tax\": number,\n  \"items\": [\n    { \"name\": \"item name\", \"price\": number }\n  ]\n}\nEnsure prices and tax are numbers without currency symbols. Format the date as YYYY-MM-DD."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000
      });

      const rawAnalysis = response.choices[0].message.content;
      
      // Parse and validate the response
      let parsedItems;
      try {
        parsedItems = parseAnalysis(rawAnalysis);
      } catch (parseError) {
        throw new Error(`Failed to parse receipt items: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }

      if (parsedItems.items.length === 0) {
        throw new Error('No items were found in the receipt');
      }
      
      // Generate a unique receipt ID (timestamp + random string)
      const receiptId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      
      // Store the receipt data in Supabase
      const { error: insertError } = await supabase
        .from('receipts')
        .insert([
          {
            id: receiptId,
            raw_analysis: rawAnalysis,
            itemized_list: parsedItems,
            merchant: parsedItems.merchant,
            date: parsedItems.date,
            tax: parsedItems.tax,
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
      <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center space-y-12">
        {/* Page Title */}
        <h1 className="text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
          Upload Receipt
        </h1>
        
        {/* Upload Area */}
        <div className="w-full">
          {preview ? (
            <div className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden bg-gray-50">
              <Image
                src={preview}
                alt="Receipt preview"
                fill
                className="object-cover"
              />
              <button
                onClick={() => {
                  setPreview(null);
                  setError(null);
                }}
                className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={handleAddPhoto}
              className="w-full py-4 px-6 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl flex items-center justify-center space-x-3 transition-all text-xl font-medium shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              </svg>
              <span>Add Photo</span>
            </button>
          )}
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*"
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
            disabled={!preview || isAnalyzing}
            className={`w-1/2 py-4 px-6 bg-blue-500 text-white rounded-2xl transition-all duration-300 font-medium text-lg text-center hover:bg-blue-600 relative
              ${(!preview || isAnalyzing) && 'opacity-50 cursor-not-allowed'}`}
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