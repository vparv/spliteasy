'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Setup() {
  const [formData, setFormData] = useState({
    restaurantName: '',
    date: '',
    subtotal: '',
    tax: '',
    tipPercentage: 18,
  });

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

  const isFormValid = () => {
    return parseFloat(formData.subtotal) > 0 && 
           parseFloat(formData.tax) >= 0;
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center space-y-12">
        {/* Page Title */}
        <h1 className="text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
          Setup Bill
        </h1>
        
        {/* Form Fields */}
        <div className="w-full space-y-6">

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
                  className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
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
                  className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
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
                    className={`py-2 px-3 rounded-xl text-sm font-medium transition-all
                      ${formData.tipPercentage === value
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="bg-blue-50/50 p-3 rounded-xl flex justify-between items-center">
                <span className="text-sm text-gray-600">Calculated Tip:</span>
                <span className="text-lg font-semibold text-blue-600">${calculateTip()}</span>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl">
              <p className="text-sm font-medium text-gray-700">Total Amount</p>
              <p className="text-2xl font-bold text-blue-600">${calculateTotal()}</p>
            </div>
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
          <Link 
            href="/split"
            className={`w-1/2 py-4 px-6 bg-blue-500 text-white rounded-2xl transition-all duration-300 font-medium text-lg text-center hover:bg-blue-600 ${!isFormValid() && 'opacity-50 pointer-events-none'}`}
          >
            Continue
          </Link>
        </div>
      </div>
    </div>
  );
} 