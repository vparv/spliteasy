'use client';

import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface SessionData {
  total_amount: number;
  restaurant_name: string;
}

export default function Split() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SplitContent />
    </Suspense>
  );
}

function SplitContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);

  const [splitData, setSplitData] = useState({
    splitType: 'equal' as 'equal' | 'custom',
    numberOfPeople: 2,
    name: '',
    venmoUsername: ''
  });

  // Fetch session data
  useEffect(() => {
    if (!sessionId) {
      router.push('/upload');
      return;
    }

    async function fetchSessionData() {
      try {
        const { data, error } = await supabase
          .from('bill_sessions')
          .select('total_amount, restaurant_name')
          .eq('id', sessionId)
          .single();

        if (error) throw error;
        if (!data) throw new Error('Session not found');

        setSessionData(data);
      } catch (error) {
        console.error('Error fetching session:', error);
        setError('Failed to load bill details. Please try again.');
      }
    }

    fetchSessionData();
  }, [sessionId, router]);

  const handleContinue = async () => {
    if (!sessionId || !sessionData) return;
    
    try {
      setIsUpdating(true);
      setError(null);

      // Validate inputs
      if (!splitData.name.trim()) {
        throw new Error('Please enter your name');
      }
      if (!splitData.venmoUsername.trim()) {
        throw new Error('Please enter your Venmo username');
      }

      console.log('Updating session with:', {
        split_type: splitData.splitType,
        number_of_participants: splitData.numberOfPeople,
        status: 'setup_completed'
      });

      // Update session with split details
      const { data: updateData, error: updateError } = await supabase
        .from('bill_sessions')
        .update({
          split_type: splitData.splitType,
          number_of_participants: splitData.numberOfPeople,
          status: 'setup_completed'
        })
        .eq('id', sessionId)
        .select();

      if (updateError) {
        console.error('Error updating session:', updateError);
        throw new Error(`Failed to update session: ${updateError.message}`);
      }

      console.log('Session updated successfully:', updateData);

      // Create the initial participant (owner)
      const { data: participantData, error: participantError } = await supabase
        .from('bill_participants')
        .insert([
          {
            session_id: sessionId,
            name: splitData.name.trim(),
            venmo_username: splitData.venmoUsername.trim(),
            is_owner: true
          }
        ])
        .select()
        .single();

      if (participantError) {
        console.error('Error creating participant:', participantError);
        throw new Error(`Failed to create participant: ${participantError.message}`);
      }

      console.log('Participant created successfully:', participantData);

      // Store owner's participant ID in localStorage
      localStorage.setItem(`session_${sessionId}_owner`, participantData.id);

      // Navigate to join page
      router.push(`/join?session=${sessionId}`);
    } catch (error) {
      console.error('Error in handleContinue:', error);
      setError(error instanceof Error ? error.message : 'Failed to save split details. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (!sessionId || !sessionData) {
    return null; // Don't render anything while loading or redirecting
  }

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
            <span className="text-xl font-bold text-blue-600">
              ${sessionData.total_amount.toFixed(2)}
            </span>
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {sessionData.restaurant_name}
          </div>
        </div>

        {/* Split Settings */}
        <div className="w-full space-y-6">
          {/* Your Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">Your Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  value={splitData.name}
                  onChange={(e) => setSplitData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter your name"
                  className="w-full px-4 py-2 border-2 text-black border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Venmo Username
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-2 text-gray-500">@</span>
                  <input
                    type="text"
                    value={splitData.venmoUsername}
                    onChange={(e) => setSplitData(prev => ({ ...prev, venmoUsername: e.target.value }))}
                    placeholder="your_venmo_username"
                    className="w-full pl-8 pr-4 py-2 text-black border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          <h2 className="text-lg font-semibold text-gray-800">How would you like to split?</h2>

          {/* Split Type Selection */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setSplitData(prev => ({ ...prev, splitType: 'equal' }))}
              className={`p-6 rounded-xl border-2 transition-all text-center
                ${splitData.splitType === 'equal'
                  ? 'border-blue-500 bg-blue-50 text-blue-600'
                  : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                }`}
            >
              <div className="font-semibold text-lg">Split Equally</div>
              <div className="text-sm text-gray-500 mt-1">Everyone pays the same</div>
            </button>

            <button
              onClick={() => setSplitData(prev => ({ ...prev, splitType: 'custom' }))}
              className={`p-6 rounded-xl border-2 transition-all text-center
                ${splitData.splitType === 'custom'
                  ? 'border-blue-500 bg-blue-50 text-blue-600'
                  : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50'
                }`}
            >
              <div className="font-semibold text-lg">Split by Items</div>
              <div className="text-sm text-gray-500 mt-1">Choose items per person</div>
            </button>
          </div>

          {/* Number of People */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Number of People
            </label>
            <div className="flex items-center justify-center space-x-4 w-full">
              <button
                onClick={() => setSplitData(prev => ({ 
                  ...prev, 
                  numberOfPeople: Math.max(2, prev.numberOfPeople - 1)
                }))}
                className="w-12 h-12 rounded-xl border-2 border-gray-200 flex items-center justify-center text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>

              <span className="text-4xl font-bold text-gray-900 w-12 text-center">
                {splitData.numberOfPeople}
              </span>

              <button
                onClick={() => setSplitData(prev => ({ 
                  ...prev, 
                  numberOfPeople: Math.min(20, prev.numberOfPeople + 1)
                }))}
                className="w-12 h-12 rounded-xl border-2 border-gray-200 flex items-center justify-center text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
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
          <button
            onClick={handleContinue}
            disabled={isUpdating}
            className={`w-1/2 py-4 px-6 bg-blue-500 text-white rounded-2xl transition-all duration-300 font-medium text-lg
              ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}`}
          >
            {isUpdating ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                <span>Saving...</span>
              </div>
            ) : (
              'Continue'
            )}
          </button>
        </div>

        {error && (
          <div className="text-red-500 text-sm text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  );
} 