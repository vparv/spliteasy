'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function VirtualCardDetails() {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isAddingToWallet, setIsAddingToWallet] = useState(false);
  const [isAddedToWallet, setIsAddedToWallet] = useState(false);
  const router = useRouter();

  // Mock card details
  const cardDetails = {
    cardNumber: '4532 9856 3214 7890',
    expiryDate: '12/25',
    cvv: '123',
    balance: '$100.00',
    cardholderName: 'VIRTUAL CARD',
    issuer: 'VISA'
  };

  const handleAddToWallet = () => {
    setIsAddingToWallet(true);
    // Simulate adding to wallet
    setTimeout(() => {
      setIsAddingToWallet(false);
      setIsAddedToWallet(true);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center p-6">
      <div className="w-full max-w-md mx-auto flex flex-col items-center space-y-8">
        {/* Page Title */}
        <h1 className="text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
          Card Details
        </h1>

        {/* Virtual Card Display */}
        <div className="w-full aspect-[1.586/1] bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl p-6 relative overflow-hidden shadow-xl">
          {/* Card Chip */}
          <div className="w-12 h-9 bg-yellow-300 rounded-lg mb-8 opacity-90" />
          
          {/* Card Number */}
          <div className="text-2xl font-mono text-white tracking-wider mb-8">
            {isRevealed ? cardDetails.cardNumber : '•••• •••• •••• 7890'}
          </div>

          {/* Card Details Row */}
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <div className="text-xs text-white/70">CARD HOLDER</div>
              <div className="text-white font-medium">{cardDetails.cardholderName}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-white/70">EXPIRES</div>
              <div className="text-white font-medium">{cardDetails.expiryDate}</div>
            </div>
            <div className="text-2xl font-bold text-white">{cardDetails.issuer}</div>
          </div>

          {/* Decorative Circle */}
          <div className="absolute -right-20 -top-20 w-48 h-48 bg-white/10 rounded-full" />
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/10 rounded-full" />
        </div>

        {/* Card Details Section */}
        <div className="w-full bg-blue-50 p-6 rounded-xl space-y-4">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium text-gray-700">Card Number</span>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-blue-600">
                  {isRevealed ? cardDetails.cardNumber : '•••• •••• •••• 7890'}
                </span>
                <button
                  onClick={() => setIsRevealed(!isRevealed)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {isRevealed ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    )}
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium text-gray-700">Expiry Date</span>
              <span className="font-mono text-blue-600">{cardDetails.expiryDate}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium text-gray-700">CVV</span>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-blue-600">
                  {isRevealed ? cardDetails.cvv : '•••'}
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium text-gray-700">Balance</span>
              <span className="font-mono text-blue-600">{cardDetails.balance}</span>
            </div>
          </div>
        </div>

        {/* Add to Wallet Button */}
        <button
          onClick={handleAddToWallet}
          disabled={isAddingToWallet || isAddedToWallet}
          className={`w-full py-4 px-6 bg-black text-white rounded-2xl transition-all duration-300 font-medium text-lg flex items-center justify-center space-x-2 ${
            (isAddingToWallet || isAddedToWallet) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-900'
          }`}
        >
          {isAddingToWallet ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Adding to Wallet...</span>
            </>
          ) : isAddedToWallet ? (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Added to Wallet</span>
            </>
          ) : (
            <>
              <Image
                src="/images/wallet.svg"
                alt="Wallet"
                width={24}
                height={24}
                className="invert"
              />
              <span>Add to Wallet</span>
            </>
          )}
        </button>

        {/* Warning Message */}
        <div className="text-sm text-gray-500 text-center px-4">
          Keep your card details secure. Never share them with anyone.
        </div>

        {/* Navigation */}
        <div className="flex w-full space-x-4">
          <Link
            href="/virtual-card"
            className="w-1/2 py-4 px-6 border-2 border-blue-600 text-blue-600 rounded-2xl transition-all duration-300 font-medium text-center text-lg hover:bg-blue-50"
          >
            Back
          </Link>
          <button
            onClick={() => router.push('/')}
            className="w-1/2 py-4 px-6 bg-blue-600 text-white rounded-2xl transition-all duration-300 font-medium text-lg hover:bg-blue-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
} 