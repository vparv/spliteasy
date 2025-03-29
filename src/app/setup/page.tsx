'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Setup() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    restaurantName: '',
    date: new Date().toISOString().split('T')[0], // Today's date as default
    subtotal: '',
    tax: '',
    tipPercentage: 18,
  });

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

  const calculateTip = () => {
    const subtotal = parseFloat(formData.subtotal) || 0;
    return ((subtotal * formData.tipPercentage) / 100).toFixed(2);
  };

  const calculateTotal = () => {
    const subtotal = parseFloat(formData.subtotal) || 0;
    const tax = parseFloat(formData.tax) || 0;
    const tip = parseFloat(calculateTip());
    return (subtotal + tax + tip).toFixed(2);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTipSelect = (percentage: number) => {
    setFormData(prev => ({ ...prev, tipPercentage: percentage }));
  };

  const handleContinue = async () => {
    if (!sessionId) return;
    
    try {
      setIsUpdating(true);
      setError(null);

      const subtotal = parseFloat(formData.subtotal);
      const tax = parseFloat(formData.tax);
      const tip = parseFloat(calculateTip());
      const total = parseFloat(calculateTotal());

      // Update session with bill details
      const { error: updateError } = await supabase
        .from('bill_sessions')
        .update({
          restaurant_name: formData.restaurantName,
          date: formData.date,
          subtotal: subtotal,
          tax_amount: tax,
          tip_amount: tip,
          total_amount: total,
          tip_percentage: formData.tipPercentage,
          status: 'setup'
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;

      // Navigate to split page with session ID
      router.push(`/split?session=${sessionId}`);
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
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                placeholder="Enter restaurant name"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                Date
              </label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
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
              <label className="block text-sm font-medium text-gray-700">
                Tip
              </label>
              <div className="grid grid-cols-4 gap-2">
                {tipPercentages.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => handleTipSelect(value)}
                    className={`py-2 px-4 rounded-lg border-2 transition-all
                      ${formData.tipPercentage === value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="mt-2 text-sm text-gray-500">
                Tip amount: ${calculateTip()}
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl">
              <p className="text-sm font-medium text-gray-700">Total Amount</p>
              <p className="text-2xl font-bold text-blue-600">${calculateTotal()}</p>
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex w-full space-x-4">
          <Link 
            href="/upload"
            className="w-1/2 py-4 px-6 border-2 border-blue-600 text-blue-600 rounded-2xl transition-all duration-300 font-medium text-center text-lg hover:bg-blue-50"
          >
            Back
          </Link>
          <button
            onClick={handleContinue}
            disabled={!isFormValid() || isUpdating}
            className={`w-1/2 py-4 px-6 bg-blue-500 text-white rounded-2xl transition-all duration-300 font-medium text-lg text-center hover:bg-blue-600 relative
              ${(!isFormValid() || isUpdating) && 'opacity-50 cursor-not-allowed'}`}
          >
            {isUpdating ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
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