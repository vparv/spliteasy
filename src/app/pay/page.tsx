'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Pay() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [venmoInitiated, setVenmoInitiated] = useState(false);
  const router = useRouter();

  // Mock function to simulate Apple Pay payment
  const handleApplePay = () => {
    setIsProcessing(true);
    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      setIsComplete(true);
    }, 2000);
  };

  // Handle Venmo payment
  const handleVenmo = () => {
    // Mock Venmo username
    const venmoUsername = 'vparv';
    const amount = '25.00';
    const note = 'Split payment';
    
    // Create Venmo deep link
    const venmoUrl = `venmo://paycharge?txn=pay&recipients=${venmoUsername}&amount=${amount}&note=${encodeURIComponent(note)}`;
    
    // Set Venmo as initiated
    setVenmoInitiated(true);
    
    // Open Venmo app
    window.location.href = venmoUrl;
  };

  const handleContinue = () => {
    router.push('/virtual-card');
  };

  // Check if we should enable the continue button
  const canContinue = isComplete || venmoInitiated;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center p-6">
      <div className="w-full max-w-md mx-auto flex flex-col items-center space-y-8">
        {/* Page Title */}
        <h1 className="text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
          Payment
        </h1>

        {/* Payment Summary */}
        <div className="w-full bg-blue-50 p-6 rounded-xl space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium text-gray-700">Your Share</span>
            <span className="text-3xl font-bold text-blue-600">$25.00</span>
          </div>
          <div className="text-sm text-gray-500">
            Split equally between 4 people
          </div>
        </div>

        {/* Payment Status */}
        {isComplete && (
          <div className="w-full text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-500"
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
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Payment Complete!</h3>
              <p className="text-gray-500 mt-1">Your payment has been processed successfully.</p>
            </div>
          </div>
        )}

        {/* Payment Options */}
        {!isComplete && (
          <div className="w-full space-y-4">
            <button
              onClick={handleApplePay}
              disabled={isProcessing || venmoInitiated}
              className={`w-full py-4 px-6 bg-black text-white rounded-2xl transition-all duration-300 font-medium text-lg flex items-center justify-center ${
                (isProcessing || venmoInitiated) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-900'
              }`}
            >
              {isProcessing ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                <Image
                  src="/images/apple-pay.svg"
                  alt="Apple Pay"
                  width={50}
                  height={32}
                  className="h-8 w-auto invert"
                />
              )}
            </button>

            <button
              onClick={handleVenmo}
              disabled={isProcessing || venmoInitiated}
              className={`w-full py-4 px-6 bg-[#008CFF] text-white rounded-2xl transition-all duration-300 font-medium text-lg flex items-center justify-center ${
                (isProcessing || venmoInitiated) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#0074D4]'
              }`}
            >
              <span className="font-bold">Venmo</span>
            </button>
          </div>
        )}

        {/* Navigation */}
        <div className="flex w-full space-x-4">
          <Link
            href="/summary"
            className="w-1/2 py-4 px-6 border-2 border-blue-600 text-blue-600 rounded-2xl transition-all duration-300 font-medium text-center text-lg hover:bg-blue-50"
          >
            Back
          </Link>
          <button
            onClick={handleContinue}
            disabled={!canContinue}
            className={`w-1/2 py-4 px-6 bg-blue-600 text-white rounded-2xl transition-all duration-300 font-medium text-lg ${
              canContinue ? 'hover:bg-blue-700' : 'opacity-50 cursor-not-allowed'
            }`}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
} 