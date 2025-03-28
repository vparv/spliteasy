'use client';

import Link from 'next/link';
import { useState } from 'react';

// Mock data for bill items
const mockBillItems = [
  { id: 1, name: 'Chicken Pasta', price: 16.99, category: 'Mains' },
  { id: 2, name: 'Caesar Salad', price: 12.99, category: 'Starters' },
  { id: 3, name: 'Garlic Bread', price: 5.99, category: 'Sides' },
  { id: 4, name: 'Margherita Pizza', price: 18.99, category: 'Mains' },
  { id: 5, name: 'Tiramisu', price: 8.99, category: 'Desserts' },
  { id: 6, name: 'Soft Drinks', price: 3.99, category: 'Beverages' },
  { id: 7, name: 'French Fries', price: 4.99, category: 'Sides' },
  { id: 8, name: 'Chocolate Cake', price: 7.99, category: 'Desserts' },
];

// Mock data for people
const mockPeople = [
  { id: 1, name: 'You' },
  { id: 2, name: 'Person 2' },
  { id: 3, name: 'Person 3' },
  { id: 4, name: 'Person 4' },
];

type ItemSelection = {
  itemId: number;
  personId: number;
  percentage: number;
};

export default function Select() {
  const [selections, setSelections] = useState<ItemSelection[]>([]);
  const [expandedItem, setExpandedItem] = useState<number | null>(null);

  const toggleItemExpansion = (itemId: number) => {
    setExpandedItem(expandedItem === itemId ? null : itemId);
  };

  const getItemTotal = (itemId: number) => {
    const itemSelections = selections.filter(s => s.itemId === itemId);
    return itemSelections.reduce((sum, s) => sum + s.percentage, 0);
  };

  const togglePersonSelection = (itemId: number, personId: number) => {
    const existingSelection = selections.find(
      s => s.itemId === itemId && s.personId === personId
    );

    if (existingSelection) {
      setSelections(selections.filter(s => !(s.itemId === itemId && s.personId === personId)));
    } else {
      const itemTotal = getItemTotal(itemId);
      if (itemTotal < 100) {
        setSelections([...selections, { itemId, personId, percentage: 100 - itemTotal }]);
      }
    }
  };

  const getPersonShare = (itemId: number, personId: number) => {
    const selection = selections.find(s => s.itemId === itemId && s.personId === personId);
    return selection?.percentage || 0;
  };

  const calculatePersonTotal = (personId: number) => {
    return selections
      .filter(s => s.personId === personId)
      .reduce((total, selection) => {
        const item = mockBillItems.find(item => item.id === selection.itemId);
        if (item) {
          return total + (item.price * selection.percentage) / 100;
        }
        return total;
      }, 0);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center p-6">
      <div className="w-full max-w-md mx-auto flex flex-col items-center space-y-8">
        {/* Page Title */}
        <h1 className="text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
          Select Items
        </h1>

        {/* Instructions */}
        <div className="w-full bg-blue-50 p-4 rounded-xl space-y-2">
          <p className="text-sm text-gray-600">
            Tap on an item to select who had it. You can split items between multiple people.
          </p>
        </div>

        {/* Bill Items */}
        <div className="w-full space-y-4">
          {mockBillItems.map((item) => (
            <div key={item.id} className="w-full">
              <button
                onClick={() => toggleItemExpansion(item.id)}
                className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-300 transition-all"
              >
                <div className="flex flex-col items-start">
                  <span className="font-medium text-gray-900">{item.name}</span>
                  <span className="text-sm text-gray-500">{item.category}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="font-medium text-gray-900">
                    ${item.price.toFixed(2)}
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      expandedItem === item.id ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </button>

              {/* Selection Panel */}
              {expandedItem === item.id && (
                <div className="mt-2 p-4 bg-gray-50 rounded-xl space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {mockPeople.map((person) => (
                      <button
                        key={person.id}
                        onClick={() => togglePersonSelection(item.id, person.id)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all
                          ${getPersonShare(item.id, person.id) > 0
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                      >
                        {person.name}
                        {getPersonShare(item.id, person.id) > 0 && 
                          ` (${getPersonShare(item.id, person.id)}%)`
                        }
                      </button>
                    ))}
                  </div>
                  <div className="text-sm text-gray-500">
                    {getItemTotal(item.id) === 100 ? (
                      <span className="text-green-600">✓ Fully allocated</span>
                    ) : (
                      <span>
                        {100 - getItemTotal(item.id)}% remaining to allocate
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="w-full bg-blue-50 p-4 rounded-xl space-y-3">
          <h3 className="font-medium text-gray-900">Current Split</h3>
          {mockPeople.map((person) => {
            const total = calculatePersonTotal(person.id);
            if (total > 0) {
              return (
                <div key={person.id} className="flex justify-between items-center">
                  <span className="text-gray-600">{person.name}</span>
                  <span className="font-medium text-blue-600">
                    ${total.toFixed(2)}
                  </span>
                </div>
              );
            }
            return null;
          })}
        </div>

        {/* Navigation */}
        <div className="flex w-full space-x-4">
          <Link 
            href="/split"
            className="w-1/2 py-4 px-6 border-2 border-blue-600 text-blue-600 rounded-2xl transition-all duration-300 font-medium text-center text-lg hover:bg-blue-50"
          >
            Back
          </Link>
          <Link 
            href="/summary"
            className="w-1/2 py-4 px-6 bg-blue-500 text-white rounded-2xl transition-all duration-300 font-medium text-lg text-center hover:bg-blue-600"
          >
            Continue
          </Link>
        </div>
      </div>
    </div>
  );
} 