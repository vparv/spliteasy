'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import Image from 'next/image';

export default function Setup() {
  const [receipt, setReceipt] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center space-y-12">
        {/* Page Title */}
        <h1 className="text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
          Setup Bill
        </h1>
        
        {/* Receipt Display */}
        <div className="w-full">
          <div className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden bg-gray-50">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-gray-400 flex flex-col items-center space-y-2">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-lg">Processing receipt...</span>
              </div>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="w-full space-y-6">
          <div className="space-y-2">
            <label htmlFor="restaurant" className="block text-sm font-medium text-gray-700">
              Restaurant Name
            </label>
            <input
              type="text"
              id="restaurant"
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
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="total" className="block text-sm font-medium text-gray-700">
              Total Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                id="total"
                className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                placeholder="0.00"
                step="0.01"
              />
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
            className="w-1/2 py-4 px-6 bg-blue-500 text-white rounded-2xl transition-all duration-300 font-medium text-lg text-center hover:bg-blue-600"
          >
            Continue
          </Link>
        </div>
      </div>
    </div>
  );
} 