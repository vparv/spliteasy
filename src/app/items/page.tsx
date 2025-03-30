'use client';

import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface ReceiptItem {
  name: string;
  price: number;
}

interface ReceiptData {
  id: string;
  raw_analysis: string;
  itemized_list: {
    items: ReceiptItem[];
  };
  merchant?: string;
  date?: string;
  tax?: number;
  created_at: string;
}

export default function Items() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ItemsContent />
    </Suspense>
  );
}

function ItemsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const receiptId = searchParams.get('receipt');

  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Fetch receipt data
  useEffect(() => {
    if (!receiptId) {
      router.push('/upload');
      return;
    }

    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch receipt details
        const { data: receiptData, error: receiptError } = await supabase
          .from('receipts')
          .select('*')
          .eq('id', receiptId)
          .single();

        if (receiptError) throw receiptError;
        if (!receiptData) throw new Error('Receipt not found');

        setReceiptData(receiptData);
        
        // Calculate total
        const total = receiptData.itemized_list.items.reduce(
          (sum: number, item: ReceiptItem) => sum + item.price,
          0
        );
        setTotal(total);

      } catch (error) {
        console.error('Error fetching receipt:', error);
        setError('Failed to load receipt details. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [receiptId, router]);

  const handleContinue = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Create a new session
      const { data: session, error: sessionError } = await supabase
        .from('bill_sessions')
        .insert([
          {
            status: 'created',
            receipt_id: receiptId
          }
        ])
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Navigate to setup page with session ID
      router.push(`/setup?session=${session.id}&receipt=${receiptId}`);
    } catch (error) {
      console.error('Error creating session:', error);
      setError('Failed to create session. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center p-6">
      <div className="w-full max-w-md mx-auto flex flex-col space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            Receipt Items
          </h1>
          {receiptData?.merchant && (
            <p className="text-lg font-medium text-gray-900">
              {receiptData.merchant}
            </p>
          )}
          {receiptData?.date && (
            <p className="text-sm text-gray-600">
              {new Date(receiptData.date).toLocaleDateString()}
            </p>
          )}
          <div className="flex justify-between items-center px-4 py-2 bg-gray-50 rounded-lg">
            <div className="space-y-1">
              <p className="text-sm text-gray-600">Subtotal</p>
              {receiptData?.tax !== undefined && (
                <p className="text-sm text-gray-600">Tax</p>
              )}
              <p className="font-medium text-gray-600">Total</p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-sm text-gray-600">
                ${(receiptData?.tax !== undefined ? total - receiptData.tax : total).toFixed(2)}
              </p>
              {receiptData?.tax !== undefined && (
                <p className="text-sm text-gray-600">${receiptData.tax.toFixed(2)}</p>
              )}
              <p className="font-medium text-gray-600">${total.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Items List */}
        <div className="space-y-4">
          {error && (
            <div className="text-red-500 text-sm text-center">
              {error}
            </div>
          )}

          {receiptData?.itemized_list.items.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-xl border border-gray-200 p-4 flex justify-between items-center hover:border-blue-500 transition-colors"
            >
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{item.name}</h3>
              </div>
              <div className="text-right">
                <p className="text-gray-900 font-medium">
                  ${item.price.toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex w-full space-x-4 pt-4">
          <Link 
            href="/upload"
            className="w-1/2 py-4 px-6 border-2 border-blue-600 text-blue-600 rounded-2xl transition-all duration-300 font-medium text-center text-lg hover:bg-blue-50"
          >
            Back
          </Link>
          <button 
            onClick={handleContinue}
            className="w-1/2 py-4 px-6 bg-blue-500 text-white rounded-2xl transition-all duration-300 font-medium text-lg text-center hover:bg-blue-600"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
} 