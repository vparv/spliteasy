'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';

export default function Split() {
  const [splitData, setSplitData] = useState({
    numberOfPeople: 2,
    splitType: 'equal' as 'equal' | 'custom',
    customSplits: [] as { name: string; percentage: number }[]
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const numbers = Array.from({ length: 19 }, (_, i) => i + 2);

  useEffect(() => {
    if (scrollContainerRef.current) {
      const selectedButton = scrollContainerRef.current.querySelector(`[data-number="${splitData.numberOfPeople}"]`);
      if (selectedButton) {
        const container = scrollContainerRef.current;
        const scrollLeft = selectedButton.getBoundingClientRect().left - 
                         container.getBoundingClientRect().left - 
                         (container.offsetWidth - (selectedButton as HTMLElement).offsetWidth) / 2;
        container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
      }
    }
  }, [splitData.numberOfPeople]);

  // Placeholder total amount - this would come from the previous page in a real app
  const totalAmount = 100.00;

  const handleNumberSelect = (number: number) => {
    setSplitData(prev => ({ ...prev, numberOfPeople: number }));
  };

  const calculateEqualSplit = () => {
    return (totalAmount / splitData.numberOfPeople).toFixed(2);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center p-6">
      <div className="w-full max-w-md mx-auto flex flex-col items-center space-y-8">
        {/* Page Title */}
        <h1 className="text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
          Split Bill
        </h1>
        
        {/* Bill Summary */}
        <div className="w-full bg-blue-50 p-4 rounded-xl">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Total Amount:</span>
            <span className="text-xl font-bold text-blue-600">${totalAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Split Settings */}
        <div className="w-full space-y-6">
          <h2 className="text-lg font-semibold text-gray-800">How would you like to split?</h2>

          {/* Split Type Selection */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSplitData(prev => ({ ...prev, splitType: 'equal' }))}
              className={`p-4 rounded-xl border-2 transition-all text-center
                ${splitData.splitType === 'equal'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
            >
              <div className="font-medium mb-1">Split Equally</div>
              <div className="text-sm text-gray-500">Everyone pays the same</div>
            </button>
            <button
              onClick={() => setSplitData(prev => ({ ...prev, splitType: 'custom' }))}
              className={`p-4 rounded-xl border-2 transition-all text-center
                ${splitData.splitType === 'custom'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
            >
              <div className="font-medium mb-1">Split by Items</div>
              <div className="text-sm text-gray-500">Choose items per person</div>
            </button>
          </div>

          {splitData.splitType === 'equal' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  How many people?
                </label>
                <div 
                  ref={scrollContainerRef}
                  className="flex overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2 scroll-smooth"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  <div className="flex space-x-3">
                    {numbers.map((number) => (
                      <button
                        key={number}
                        data-number={number}
                        onClick={() => handleNumberSelect(number)}
                        className={`flex-none w-12 h-12 flex items-center justify-center rounded-full text-lg font-medium transition-all
                          ${splitData.numberOfPeople === number
                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25 scale-110'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                      >
                        {number}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

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
            </div>
          ) : (
            <div className="bg-blue-50 p-4 rounded-xl space-y-3">
              <p className="text-sm text-gray-500">
                On the next screen, you&apos;ll be able to:
              </p>
              <ul className="text-sm text-gray-600 space-y-2 list-disc pl-4">
                <li>Select specific items for each person</li>
                <li>Split individual items between multiple people</li>
                <li>Add custom amounts or adjustments</li>
              </ul>
            </div>
          )}
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
            href={splitData.splitType === 'equal' ? "/summary" : "/select"}
            className="w-1/2 py-4 px-6 bg-blue-500 text-white rounded-2xl transition-all duration-300 font-medium text-lg text-center hover:bg-blue-600"
          >
            Continue
          </Link>
        </div>
      </div> 
    </div>
  );
} 