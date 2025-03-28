'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Split() {
  const [splitData, setSplitData] = useState({
    numberOfPeople: '2',
    splitType: 'equal' as 'equal' | 'custom',
    customSplits: [] as { name: string; percentage: number }[]
  });

  // Placeholder total amount - this would come from the previous page in a real app
  const totalAmount = 100.00;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSplitData(prev => ({ ...prev, [name]: value }));
  };

  const calculateEqualSplit = () => {
    const numPeople = parseInt(splitData.numberOfPeople) || 2;
    return (totalAmount / numPeople).toFixed(2);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center space-y-12">
        {/* Page Title */}
        <h1 className="text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
          Split Bill
        </h1>
        
        {/* Bill Summary */}
        <div className="w-full bg-blue-50 p-4 rounded-xl space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Total Amount:</span>
            <span className="text-xl font-bold text-blue-600">${totalAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Split Settings */}
        <div className="w-full space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Split Settings</h2>
            
            <div className="space-y-2">
              <label htmlFor="numberOfPeople" className="block text-sm font-medium text-gray-700">
                Number of People
              </label>
              <input
                type="number"
                id="numberOfPeople"
                name="numberOfPeople"
                value={splitData.numberOfPeople}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                min="2"
                max="20"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="splitType" className="block text-sm font-medium text-gray-700">
                Split Type
              </label>
              <select
                id="splitType"
                name="splitType"
                value={splitData.splitType}
                onChange={handleInputChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
              >
                <option value="equal">Split Equally</option>
                <option value="custom">Split by Items</option>
              </select>
            </div>

            {splitData.splitType === 'equal' ? (
              <div className="bg-blue-50 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium text-gray-700">Amount per person</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ${calculateEqualSplit()}
                  </p>
                </div>
                <p className="text-sm text-gray-500">
                  Each person will pay the same amount
                </p>
              </div>
            ) : (
              <div className="bg-blue-50 p-4 rounded-xl space-y-3">
                <p className="text-sm text-gray-500">
                  You'll be able to select specific items for each person on the next screen
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex w-full space-x-4">
          <Link 
            href="/setup"
            className="w-1/2 py-4 px-6 border-2 border-blue-600 text-blue-600 rounded-2xl transition-all duration-300 font-medium text-center text-lg hover:bg-blue-50"
          >
            Back
          </Link>
          <Link 
            href={splitData.splitType === 'equal' ? "/summary" : "/items"}
            className="w-1/2 py-4 px-6 bg-blue-500 text-white rounded-2xl transition-all duration-300 font-medium text-lg text-center hover:bg-blue-600"
          >
            Continue
          </Link>
        </div>
      </div>
    </div>
  );
} 