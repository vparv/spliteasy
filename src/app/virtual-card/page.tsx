'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function VirtualCard() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const router = useRouter();

  // Mock state for payment collection
  const [collectionStatus, setCollectionStatus] = useState({
    totalAmount: 100,
    collectedAmount: 25,
    remainingAmount: 75,
    participants: 4,
    participantsPaid: 1
  });

  useEffect(() => {
    // Simulate polling for payments
    const pollInterval = setInterval(() => {
      setCollectionStatus(prev => {
        // Randomly decide if we should update (to make it feel more realistic)
        const shouldUpdate = Math.random() > 0.5;
        if (!shouldUpdate || prev.remainingAmount === 0) return prev;

        const newCollectedAmount = Math.min(
          prev.collectedAmount + 25,
          prev.totalAmount
        );
        const newRemainingAmount = prev.totalAmount - newCollectedAmount;
        // Calculate new participants paid (25 per participant)
        const newParticipantsPaid = Math.ceil(newCollectedAmount / 25);

        return {
          ...prev,
          collectedAmount: newCollectedAmount,
          remainingAmount: newRemainingAmount,
          participantsPaid: newParticipantsPaid
        };
      });
    }, 1000); // Poll every second

    // Stop polling after 5 seconds and set as fully paid
    setTimeout(() => {
      clearInterval(pollInterval);
      setCollectionStatus(prev => ({
        ...prev,
        collectedAmount: prev.totalAmount,
        remainingAmount: 0,
        participantsPaid: prev.participants
      }));
    }, 5000);

    return () => clearInterval(pollInterval);
  }, []);

  const handleGenerateCard = () => {
    setIsGenerating(true);
    // Simulate card generation
    setTimeout(() => {
      setIsGenerating(false);
      setIsComplete(true);
    }, 2000);
  };

  const handleContinue = () => {
    router.push('/virtual-card/details');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center p-6">
      <div className="w-full max-w-md mx-auto flex flex-col items-center space-y-8">
        {/* Page Title */}
        <h1 className="text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
          Virtual Card
        </h1>

        {/* Collection Status */}
        <div className="w-full bg-blue-50 p-6 rounded-xl space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium text-gray-700">Total Amount</span>
              <span className="text-xl font-bold text-blue-600">${collectionStatus.totalAmount}.00</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium text-gray-700">Collected</span>
              <span className="text-xl font-bold text-green-600">${collectionStatus.collectedAmount}.00</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium text-gray-700">Remaining</span>
              <span className="text-xl font-bold text-red-600">${collectionStatus.remainingAmount}.00</span>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" 
              style={{ width: `${(collectionStatus.collectedAmount / collectionStatus.totalAmount) * 100}%` }}
            ></div>
          </div>
          
          <div className="text-sm text-gray-500 text-center">
            {collectionStatus.participantsPaid} out of {collectionStatus.participants} people have paid
          </div>
        </div>

        {/* Generation Status */}
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
              <h3 className="text-xl font-semibold text-gray-900">Card Generated!</h3>
              <p className="text-gray-500 mt-1">Your virtual card has been generated successfully.</p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex w-full space-x-4">
          <Link
            href="/pay"
            className="w-1/2 py-4 px-6 border-2 border-blue-600 text-blue-600 rounded-2xl transition-all duration-300 font-medium text-center text-lg hover:bg-blue-50"
          >
            Back
          </Link>
          <button
            onClick={isComplete ? handleContinue : handleGenerateCard}
            disabled={isGenerating || collectionStatus.remainingAmount > 0}
            className={`w-1/2 py-4 px-6 bg-blue-600 text-white rounded-2xl transition-all duration-300 font-medium text-lg flex items-center justify-center ${
              (isGenerating || collectionStatus.remainingAmount > 0) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
            }`}
          >
            {isGenerating ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Generating...</span>
              </div>
            ) : isComplete ? (
              <span>Show Card</span>
            ) : collectionStatus.remainingAmount > 0 ? (
              <span>Waiting...</span>
            ) : (
              <span>Generate Card</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 