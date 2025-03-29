'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import QRCode from 'react-qr-code';

interface SessionData {
  restaurant_name: string;
  total_amount: number;
  number_of_participants: number;
  split_type: 'equal' | 'custom';
}

interface Participant {
  id: string;
  name: string;
  is_owner: boolean;
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <JoinPageContent />
    </Suspense>
  );
}

function JoinPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
  
  const [name, setName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [currentParticipantId, setCurrentParticipantId] = useState<string | null>(null);
  const [joinUrl, setJoinUrl] = useState<string>('');
  const [showCopySuccess, setShowCopySuccess] = useState(false);

  // Set join URL when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined' && sessionId) {
      setJoinUrl(`${window.location.origin}/join?session=${sessionId}`);
    }
  }, [sessionId]);

  // Fetch session data and current participants
  useEffect(() => {
    if (!sessionId) {
      router.push('/');
      return;
    }

    async function fetchSessionData() {
      try {
        // Fetch session details
        const { data: sessionData, error: sessionError } = await supabase
          .from('bill_sessions')
          .select('restaurant_name, total_amount, number_of_participants, split_type')
          .eq('id', sessionId)
          .single();

        if (sessionError) throw sessionError;
        if (!sessionData) throw new Error('Session not found');

        setSessionData(sessionData);

        // Fetch current participants including owner
        const { data: participantsData, error: participantsError } = await supabase
          .from('bill_participants')
          .select('id, name, is_owner')
          .eq('session_id', sessionId);

        if (participantsError) throw participantsError;
        
        setParticipants(participantsData);
        
        // Check if we're the owner by looking in localStorage
        const storedOwnerId = localStorage.getItem(`session_${sessionId}_owner`);
        
        // Find the owner in participants
        const owner = participantsData.find(p => p.is_owner);
        if (owner) {
          setOwnerId(owner.id);
          // Only set current participant ID if we are the owner
          if (storedOwnerId === owner.id) {
            setCurrentParticipantId(owner.id);
          }
        }

        // If we have a participant ID in the URL and we're not the owner, set it as current
        const participantId = searchParams.get('participant');
        if (participantId && (!storedOwnerId || storedOwnerId !== owner?.id)) {
          const participant = participantsData.find(p => p.id === participantId);
          if (participant) {
            setCurrentParticipantId(participantId);
          }
        }
      } catch (error) {
        console.error('Error fetching session:', error);
        setError('Failed to load session details. Please try again.');
      }
    }

    fetchSessionData();

    // Set up real-time subscription for participants
    const participantsSubscription = supabase
      .channel('participants_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bill_participants',
          filter: `session_id=eq.${sessionId}`
        },
        () => {
          fetchSessionData();
        }
      )
      .subscribe();

    return () => {
      participantsSubscription.unsubscribe();
    };
  }, [sessionId, router, searchParams]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId || !sessionData || !name.trim()) return;

    try {
      setIsJoining(true);
      setError(null);

      // Check if we've reached the participant limit
      if (participants.length >= sessionData.number_of_participants) {
        throw new Error('This bill has reached its participant limit.');
      }

      // Check if name is already taken
      if (participants.some(p => p.name === name.trim())) {
        throw new Error('This name is already taken. Please choose another.');
      }

      // Check if we're trying to join as a non-owner
      const storedOwnerId = localStorage.getItem(`session_${sessionId}_owner`);
      const owner = participants.find(p => p.is_owner);
      if (storedOwnerId && owner && storedOwnerId === owner.id) {
        throw new Error('You are the owner of this session.');
      }

      // Add participant to the session
      const { data: participantData, error: joinError } = await supabase
        .from('bill_participants')
        .insert([
          {
            session_id: sessionId,
            name: name.trim(),
            is_owner: false
          }
        ])
        .select()
        .single();

      if (joinError) throw joinError;
      if (!participantData) throw new Error('Failed to create participant');

      // Always navigate to select page for item selection
      router.push(`/select?session=${sessionId}&participant=${participantData.id}`);
    } catch (error) {
      console.error('Error joining session:', error);
      setError(error instanceof Error ? error.message : 'Failed to join. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleContinueToSelect = () => {
    if (sessionId && ownerId) {
      router.push(`/select?session=${sessionId}&participant=${ownerId}`);
    }
  };

  const handleShare = async () => {
    if (!sessionData) return;

    try {
      // Check if running on iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      // Try Web Share API first (works on iOS)
      if (typeof navigator.share !== 'undefined') {
        await navigator.share({
          title: `Join Bill Split - ${sessionData.restaurant_name}`,
          text: `Join me in splitting the bill for ${sessionData.restaurant_name}`,
          url: joinUrl
        });
        return;
      }

      // Fallback for non-iOS devices with clipboard API
      if (typeof navigator.clipboard !== 'undefined' && !isIOS) {
        await navigator.clipboard.writeText(joinUrl);
        setShowCopySuccess(true);
        setTimeout(() => setShowCopySuccess(false), 2000);
        return;
      }

      // Final fallback: create a temporary input element
      const tempInput = document.createElement('input');
      tempInput.value = joinUrl;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 2000);
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error sharing:', error);
      }
    }
  };

  if (!sessionId || !sessionData) {
    return null; // Don't render anything while loading or redirecting
  }

  const isOwner = currentParticipantId === ownerId;
  const allParticipantsJoined = participants.length === sessionData.number_of_participants;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md mx-auto flex flex-col items-center space-y-8">
        {/* Page Title */}
        <h1 className="text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
          Join Bill Split
        </h1>

        {/* Session Info */}
        <div className="w-full bg-blue-50 p-4 rounded-xl space-y-2">
          <div className="text-lg font-medium text-gray-900">
            {sessionData.restaurant_name}
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total Amount:</span>
            <span className="text-xl font-bold text-blue-600">
              ${sessionData.total_amount.toFixed(2)}
            </span>
          </div>
          <div className="text-sm text-gray-500">
            {participants.length} of {sessionData.number_of_participants} people joined
          </div>
        </div>

        {/* QR Code Section */}
        <div className="w-full bg-white p-4 rounded-xl border-2 border-gray-100 space-y-4">
          <h2 className="text-center text-gray-700 font-medium">
            Scan to Join
          </h2>
          <div className="flex justify-center bg-white p-4">
            {joinUrl && (
              <QRCode
                value={joinUrl}
                size={200}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                viewBox="0 0 256 256"
                level="H"
              />
            )}
          </div>
          <div className="flex justify-center">
            <button
              onClick={handleShare}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" 
                />
              </svg>
              <span>Share Link</span>
            </button>
          </div>
          {showCopySuccess && (
            <div className="text-center text-sm text-green-600">
              Link copied to clipboard!
            </div>
          )}
        </div>

        {/* Current Participants */}
        {participants.length > 0 && (
          <div className="w-full">
            <h2 className="text-sm font-medium text-gray-700 mb-2">Current Participants:</h2>
            <div className="flex flex-wrap gap-2">
              {participants.map((participant) => (
                <span
                  key={participant.id}
                  className={`px-3 py-1 rounded-full text-sm ${
                    participant.is_owner 
                      ? 'bg-purple-50 text-purple-700' 
                      : 'bg-blue-50 text-blue-700'
                  }`}
                >
                  {participant.name} {participant.is_owner && '(Owner)'}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Owner's Continue Button */}
        {isOwner && allParticipantsJoined && (
          <button
            onClick={handleContinueToSelect}
            className="w-full py-4 px-6 bg-purple-500 text-white rounded-2xl transition-all duration-300 font-medium text-lg text-center hover:bg-purple-600"
          >
            Continue to Item Selection
          </button>
        )}

        {/* Join Form (only show if not owner) */}
        {!isOwner && (
          <form onSubmit={handleJoin} className="w-full space-y-6">
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Your Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border text-black border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                placeholder="Enter your name"
                required
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isJoining || !name.trim()}
              className={`w-full py-4 px-6 bg-blue-500 text-white rounded-2xl transition-all duration-300 font-medium text-lg text-center hover:bg-blue-600 relative
                ${(isJoining || !name.trim()) && 'opacity-50 cursor-not-allowed'}`}
            >
              {isJoining ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Joining...
                </div>
              ) : (
                'Join Split'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
} 