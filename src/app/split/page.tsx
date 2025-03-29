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
  const [showShareSuccess, setShowShareSuccess] = useState(false);

  const [splitData, setSplitData] = useState({
    splitType: 'equal' as 'equal' | 'custom',
    numberOfPeople: 2
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
            name: 'You',
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

  const handleShare = async () => {
    if (!sessionData) return;
    
    const joinUrl = `${window.location.origin}/join?session=${sessionId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Bill Split',
          text: `Join me in splitting the bill for ${sessionData.restaurant_name}`,
          url: joinUrl
        });
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(joinUrl);
        setShowShareSuccess(true);
        setTimeout(() => setShowShareSuccess(false), 2000);
      } catch (err) {
        console.error('Error copying to clipboard:', err);
      }
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
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">How would you like to split?</h2>
            <button
              onClick={handleShare}
              className="p-2 rounded-lg border-2 border-blue-500 text-blue-600 hover:bg-blue-50"
              title="Share join link"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
            </button>
          </div>

          {showShareSuccess && (
            <div className="absolute top-4 right-4 bg-green-100 text-green-800 px-4 py-2 rounded-lg shadow-lg">
              Link copied to clipboard!
            </div>
          )}

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

          {/* Number of People */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Number of People
            </label>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSplitData(prev => ({ 
                  ...prev, 
                  numberOfPeople: Math.max(2, prev.numberOfPeople - 1)
                }))}
                className="p-2 rounded-lg border-2 border-gray-200 hover:border-gray-300 text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="text-2xl font-semibold text-gray-900 w-12 text-center">
                {splitData.numberOfPeople}
              </span>
              <button
                onClick={() => setSplitData(prev => ({ 
                  ...prev, 
                  numberOfPeople: Math.min(20, prev.numberOfPeople + 1)
                }))}
                className="p-2 rounded-lg border-2 border-gray-200 hover:border-gray-300 text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>

          {splitData.splitType === 'custom' && (
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

          {error && (
            <div className="text-red-500 text-sm text-center">
              {error}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex w-full space-x-4">
          <Link 
            href={`/setup?session=${sessionId}`}
            className="w-1/2 py-4 px-6 border-2 border-blue-600 text-blue-600 rounded-2xl transition-all duration-300 font-medium text-center text-lg hover:bg-blue-50"
          >
            Back
          </Link>
          <button
            onClick={handleContinue}
            disabled={isUpdating}
            className={`w-1/2 py-4 px-6 bg-blue-500 text-white rounded-2xl transition-all duration-300 font-medium text-lg text-center hover:bg-blue-600 relative
              ${isUpdating && 'opacity-50 cursor-not-allowed'}`}
          >
            {isUpdating ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </div>
            ) : (
              'Continue'
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 