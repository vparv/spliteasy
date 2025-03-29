'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Participant {
  id: string;
  name: string;
  is_owner: boolean;
}

interface ParticipantStatus extends Participant {
  has_selected: boolean;
}

export default function WaitingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <WaitingPageContent />
    </Suspense>
  );
}

function WaitingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
  const participantId = searchParams.get('participant');

  const [participants, setParticipants] = useState<ParticipantStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to changes in item_selections
  useEffect(() => {
    if (!sessionId || !participantId) {
      router.push('/');
      return;
    }

    // Initial fetch of participants and their selection status
    async function fetchParticipants() {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch all participants for this session
        const { data: participantsData, error: participantsError } = await supabase
          .from('bill_participants')
          .select('*')
          .eq('session_id', sessionId);

        if (participantsError) throw participantsError;

        // Fetch all selections for this session
        const { data: selectionsData, error: selectionsError } = await supabase
          .from('item_selections')
          .select('participant_id')
          .eq('session_id', sessionId);

        if (selectionsError) throw selectionsError;

        // Create a set of participant IDs who have made selections
        const participantsWithSelections = new Set(
          selectionsData.map(s => s.participant_id)
        );

        // Combine the data
        const participantsWithStatus = participantsData.map(p => ({
          ...p,
          has_selected: participantsWithSelections.has(p.id)
        }));

        setParticipants(participantsWithStatus);

        // If everyone has selected, proceed to summary
        if (participantsWithStatus.every(p => p.has_selected)) {
          router.push(`/summary?session=${sessionId}&participant=${participantId}`);
        }
      } catch (error) {
        console.error('Error fetching participants:', error);
        setError('Failed to load participants. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchParticipants();

    // Subscribe to changes in item_selections
    const selectionsSubscription = supabase
      .channel('item_selections_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'item_selections',
          filter: `session_id=eq.${sessionId}`
        },
        () => {
          // Refetch participants and their status when selections change
          fetchParticipants();
        }
      )
      .subscribe();

    return () => {
      selectionsSubscription.unsubscribe();
    };
  }, [sessionId, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  const completedCount = participants.filter(p => p.has_selected).length;
  const totalCount = participants.length;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center p-6">
      <div className="w-full max-w-md mx-auto flex flex-col items-center space-y-8">
        {/* Page Title */}
        <h1 className="text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
          Waiting for Others
        </h1>

        {/* Progress Info */}
        <div className="w-full bg-blue-50 p-4 rounded-xl space-y-4">
          <div className="text-center">
            <span className="text-lg font-medium text-gray-900">
              {completedCount} of {totalCount} people have made their selections
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-500 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>

        {/* Participants List */}
        <div className="w-full space-y-3">
          {participants.map((participant) => (
            <div
              key={participant.id}
              className={`flex items-center justify-between p-4 rounded-xl border
                ${participant.has_selected
                  ? 'bg-green-50 border-green-200'
                  : 'bg-gray-50 border-gray-200'
                }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full
                  ${participant.has_selected ? 'bg-green-500' : 'bg-gray-400'}`}
                />
                <span className={`font-medium
                  ${participant.has_selected ? 'text-green-700' : 'text-gray-600'}
                  ${participant.id === participantId ? 'font-bold' : ''}`}
                >
                  {participant.name}
                  {participant.id === participantId && ' (You)'}
                </span>
              </div>
              <span className={`text-sm
                ${participant.has_selected ? 'text-green-600' : 'text-gray-500'}`}
              >
                {participant.has_selected ? 'Done' : 'Selecting...'}
              </span>
            </div>
          ))}
        </div>

        {error && (
          <div className="text-red-500 text-sm text-center">
            {error}
          </div>
        )}

        {/* Info Message */}
        <p className="text-gray-500 text-center text-sm">
          Please wait while others make their selections.
          You'll be automatically redirected when everyone is done.
        </p>
      </div>
    </div>
  );
} 