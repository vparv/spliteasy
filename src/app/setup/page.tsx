'use client';

import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface ReceiptItem {
  name: string;
  price: number;
}

interface Fee {
  name: string;
  amount: number;
}

export default function Setup() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SetupContent />
    </Suspense>
  );
}

function SetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
  const receiptId = searchParams.get('receipt');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    restaurantName: '',
    date: new Date().toISOString().split('T')[0], // Today's date as default
    subtotal: '',
    tax: '',
    tipAmount: '',
  });
  const [fees, setFees] = useState<Fee[]>([]);
  const [tipFromReceipt, setTipFromReceipt] = useState(false);

  // Fetch receipt data and pre-fill form
  useEffect(() => {
    async function fetchReceiptData() {
      if (!receiptId) return;

      try {
        setIsLoading(true);
        const { data: receiptData, error: receiptError } = await supabase
          .from('receipts')
          .select('*')
          .eq('id', receiptId)
          .single();

        if (receiptError) throw receiptError;
        if (!receiptData) throw new Error('Receipt not found');

        // Calculate subtotal from items
        const subtotal = receiptData.itemized_list.items.reduce(
          (sum: number, item: ReceiptItem) => sum + item.price,
          0
        );

        // Load fees from itemized_list and check for tip
        let tipAmount = 0;
        const nonTipFees: Fee[] = [];

        if (receiptData.itemized_list.fees && Array.isArray(receiptData.itemized_list.fees)) {
          receiptData.itemized_list.fees.forEach((fee: Fee) => {
            // Check if this fee is a tip/gratuity
            const feeName = fee.name.toLowerCase();
            if (feeName.includes('tip') || feeName.includes('gratuity')) {
              tipAmount += fee.amount;
              setTipFromReceipt(true);
            } else {
              nonTipFees.push(fee);
            }
          });
        }

        setFees(nonTipFees);

        setFormData(prev => ({
          ...prev,
          restaurantName: receiptData.merchant || '',
          date: receiptData.date || new Date().toISOString().split('T')[0],
          subtotal: subtotal.toFixed(2),
          tax: receiptData.tax?.toFixed(2) || '0',
          tipAmount: tipAmount > 0 ? tipAmount.toFixed(2) : '0.00',
        }));
      } catch (error) {
        console.error('Error fetching receipt:', error);
        setError('Failed to load receipt details. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchReceiptData();
  }, [receiptId]);

  // Redirect if no session ID
  useEffect(() => {
    if (!sessionId) {
      router.push('/upload');
    }
  }, [sessionId, router]);

  const tipPercentages = [
    { value: 15, label: '15%' },
    { value: 18, label: '18%' },
    { value: 20, label: '20%' },
    { value: 25, label: '25%' }
  ];

  const calculateFeesTotal = () => {
    return fees.reduce((sum, fee) => sum + fee.amount, 0);
  };

  const getTipAmount = () => {
    return parseFloat(formData.tipAmount) || 0;
  };

  const calculateTotal = () => {
    const subtotal = parseFloat(formData.subtotal) || 0;
    const tax = parseFloat(formData.tax) || 0;
    const feesTotal = calculateFeesTotal();
    const tip = getTipAmount();
    return (subtotal + tax + feesTotal + tip).toFixed(2);
  };

  const applyTipPercentage = (percentage: number) => {
    const subtotal = parseFloat(formData.subtotal) || 0;
    const tip = (subtotal * percentage / 100).toFixed(2);
    setFormData(prev => ({ ...prev, tipAmount: tip }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const saveSessionData = async () => {
    const subtotal = parseFloat(formData.subtotal);
    const tax = parseFloat(formData.tax) || 0;
    const feesTotal = calculateFeesTotal();
    const tip = getTipAmount();
    const total = parseFloat(calculateTotal());

    // Calculate tip percentage for storage (if subtotal > 0)
    const tipPercentage = subtotal > 0 ? Math.round((tip / subtotal) * 100) : 0;

    // Update session with bill details
    const { error: updateError } = await supabase
      .from('bill_sessions')
      .update({
        restaurant_name: formData.restaurantName,
        date: formData.date,
        subtotal: subtotal + feesTotal, // Include fees in subtotal for splitting purposes
        tax_amount: tax,
        tip_amount: tip,
        total_amount: total,
        tip_percentage: tipPercentage,
        status: 'setup_completed'
      })
      .eq('id', sessionId);

    if (updateError) throw updateError;
  };

  const handleContinue = async () => {
    if (!sessionId) return;

    try {
      setIsUpdating(true);
      setError(null);

      await saveSessionData();

      // Navigate to split page with session ID
      router.push(`/split?session=${sessionId}`);
    } catch (error) {
      console.error('Error updating session:', error);
      setError('Failed to save bill details. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePassAndPlay = async () => {
    if (!sessionId) return;

    try {
      setIsUpdating(true);
      setError(null);

      await saveSessionData();

      // Navigate to solo-split page
      router.push(`/solo-split?session=${sessionId}`);
    } catch (error) {
      console.error('Error updating session:', error);
      setError('Failed to save bill details. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const isFormValid = () => {
    return formData.restaurantName.trim() !== '' && 
           parseFloat(formData.subtotal) > 0 && 
           parseFloat(formData.tax) >= 0;
  };

  if (!sessionId) {
    return null; // Don't render anything while redirecting
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center p-6">
      <div className="w-full max-w-md mx-auto flex flex-col items-center space-y-8">
        {/* Page Title */}
        <h1 className="text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
          Setup Bill
        </h1>
        
        {/* Form Fields */}
        <div className="w-full space-y-6">
          {/* Restaurant Details */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Restaurant Details</h2>
            <div className="space-y-2">
              <label htmlFor="restaurantName" className="block text-sm font-medium text-gray-700">
                Restaurant Name
              </label>
              <input
                type="text"
                id="restaurantName"
                name="restaurantName"
                value={formData.restaurantName}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl text-black border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                placeholder="Enter restaurant name"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="date" className="block text-sm text-black font-medium text-gray-700">
                Date
              </label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl border text-black border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
              />
            </div>
          </div>

          {/* Bill Details */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Bill Details</h2>
            <div className="space-y-2">
              <label htmlFor="subtotal" className="block text-sm font-medium text-gray-700">
                Subtotal
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  id="subtotal"
                  name="subtotal"
                  value={formData.subtotal}
                  onChange={handleInputChange}
                  className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-gray-900"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="tax" className="block text-sm font-medium text-gray-700">
                Tax
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  id="tax"
                  name="tax"
                  value={formData.tax}
                  onChange={handleInputChange}
                  className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-gray-900"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="tipAmount" className="block text-sm font-medium text-gray-700">
                Tip {tipFromReceipt && <span className="text-green-600 text-xs">(from receipt)</span>}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  id="tipAmount"
                  name="tipAmount"
                  value={formData.tipAmount}
                  onChange={handleInputChange}
                  className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-gray-900"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
              <div className="flex gap-2 mt-2">
                {tipPercentages.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => applyTipPercentage(value)}
                    className="flex-1 py-2 px-2 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-600 hover:text-blue-700 text-sm transition-all"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bill Summary */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>${parseFloat(formData.subtotal || '0').toFixed(2)}</span>
              </div>
              {fees.length > 0 && (
                <>
                  {fees.map((fee, index) => (
                    <div key={index} className="flex justify-between text-sm text-amber-700">
                      <span>{fee.name}</span>
                      <span>${fee.amount.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Fees Total</span>
                    <span>${calculateFeesTotal().toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-sm text-gray-600">
                <span>Tax</span>
                <span>${parseFloat(formData.tax || '0').toFixed(2)}</span>
              </div>
              {getTipAmount() > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tip</span>
                  <span>${getTipAmount().toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t border-gray-200">
                <span>Total</span>
                <span className="text-blue-600">${calculateTotal()}</span>
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Split Method Selection */}
        <div className="w-full space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">How do you want to split?</h2>

          {/* Pass & Play Option */}
          <button
            onClick={handlePassAndPlay}
            disabled={!isFormValid() || isUpdating}
            className={`w-full p-4 rounded-2xl border-2 border-purple-200 hover:border-purple-400 bg-purple-50 hover:bg-purple-100 transition-all text-left ${(!isFormValid() || isUpdating) && 'opacity-50 cursor-not-allowed'}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-purple-900">Pass & Play</h3>
                <p className="text-sm text-purple-700">Pass the phone around - each person selects their items</p>
              </div>
            </div>
          </button>

          {/* QR Code Option */}
          <button
            onClick={handleContinue}
            disabled={!isFormValid() || isUpdating}
            className={`w-full p-4 rounded-2xl border-2 border-blue-200 hover:border-blue-400 bg-blue-50 hover:bg-blue-100 transition-all text-left ${(!isFormValid() || isUpdating) && 'opacity-50 cursor-not-allowed'}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-blue-900">Share QR Code</h3>
                <p className="text-sm text-blue-700">Everyone joins on their own phone</p>
              </div>
            </div>
          </button>
        </div>

        {/* Back Button */}
        <Link
          href={`/items?receipt=${receiptId}`}
          className="w-full py-4 px-6 border-2 border-gray-300 text-gray-600 rounded-2xl transition-all duration-300 font-medium text-center text-lg hover:bg-gray-50"
        >
          Back
        </Link>
      </div>
    </div>
  );
} 