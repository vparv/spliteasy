'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

interface SplitSummary {
  totalAmount: number;
  splitType: 'equal' | 'custom';
  numberOfPeople: number;
  splits: {
    name: string;
    amount: number;
    items?: {
      name: string;
      amount: number;
      percentage?: number;
    }[];
  }[];
}

export default function Summary() {
  // This would come from your app's state management in a real app
  const [summary, setSummary] = useState<SplitSummary>({
    totalAmount: 100.00,
    splitType: 'equal',
    numberOfPeople: 4,
    splits: [
      {
        name: 'Person 1',
        amount: 25.00,
        items: [
          { name: 'Pizza', amount: 15.00 },
          { name: 'Drinks', amount: 10.00 },
        ],
      },
      {
        name: 'Person 2',
        amount: 25.00,
        items: [
          { name: 'Pasta', amount: 18.00 },
          { name: 'Salad', amount: 7.00 },
        ],
      },
      {
        name: 'Person 3',
        amount: 25.00,
        items: [
          { name: 'Burger', amount: 16.00 },
          { name: 'Fries', amount: 9.00 },
        ],
      },
      {
        name: 'Person 4',
        amount: 25.00,
        items: [
          { name: 'Steak', amount: 20.00 },
          { name: 'Soup', amount: 5.00 },
        ],
      },
    ],
  });

  return (
    <div className="min-h-screen bg-white flex flex-col items-center p-6">
      <div className="w-full max-w-md mx-auto flex flex-col items-center space-y-8">
        {/* Page Title */}
        <h1 className="text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
          Summary
        </h1>

        {/* Total Amount Card */}
        <div className="w-full bg-blue-50 p-6 rounded-xl space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium text-gray-700">Total Bill</span>
            <span className="text-3xl font-bold text-blue-600">
              ${summary.totalAmount.toFixed(2)}
            </span>
          </div>
          <div className="text-sm text-gray-500">
            Split {summary.splitType === 'equal' ? 'equally' : 'by items'} between {summary.numberOfPeople} people
          </div>
        </div>

        {/* Individual Splits */}
        <div className="w-full space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Split Details</h2>
          
          {summary.splits.map((split, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-900">{split.name}</span>
                <span className="text-xl font-bold text-blue-600">
                  ${split.amount.toFixed(2)}
                </span>
              </div>
              
              {summary.splitType === 'custom' && split.items && (
                <div className="space-y-2">
                  <div className="h-px bg-gray-200"></div>
                  {split.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">{item.name}</span>
                      <div className="flex items-center space-x-2">
                        {item.percentage && (
                          <span className="text-gray-400">({item.percentage}%)</span>
                        )}
                        <span className="text-gray-900">${item.amount.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex w-full space-x-4">
          <Link 
            href={summary.splitType === 'equal' ? "/split" : "/select"}
            className="w-1/2 py-4 px-6 border-2 border-blue-600 text-blue-600 rounded-2xl transition-all duration-300 font-medium text-center text-lg hover:bg-blue-50"
          >
            Back
          </Link>
          <Link 
            href="/pay"
            className="w-1/2 py-4 px-6 bg-blue-500 text-white rounded-2xl transition-all duration-300 font-medium text-lg text-center hover:bg-blue-600"
          >
            Pay Now
          </Link>
        </div>
      </div>
    </div>
  );
} 