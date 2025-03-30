'use client';

import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface BillItem {
  id: string;
  name: string;
  price: number;
}

interface Participant {
  id: string;
  name: string;
  is_owner: boolean;
}

interface ItemSelection {
  itemId: string;
  participantId: string;
  percentage: number;
}

interface SessionData {
  restaurant_name: string;
  total_amount: number;
  number_of_participants: number;
  receipt_id: string;
}

interface ReceiptData {
  id: string;
  itemized_list: {
    items: Array<{
      name: string;
      price: number;
    }>;
  };
}

interface ReceiptItem {
  name: string;
  price: number;
}

export default function Select() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SelectContent />
    </Suspense>
  );
}

function SelectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
  const participantId = searchParams.get('participant');

  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [items, setItems] = useState<BillItem[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selections, setSelections] = useState<ItemSelection[]>([]);
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);

  // Fetch session data, items, and participants
  useEffect(() => {
    if (!sessionId || !participantId) {
      router.push('/');
      return;
    }

    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch session details
        const { data: sessionData, error: sessionError } = await supabase
          .from('bill_sessions')
          .select('restaurant_name, total_amount, number_of_participants, receipt_id')
          .eq('id', sessionId)
          .single();

        if (sessionError) throw sessionError;
        if (!sessionData) throw new Error('Session not found');
        if (!sessionData.receipt_id) throw new Error('Receipt not found');

        setSessionData(sessionData);

        // Fetch receipt data
        const { data: receiptData, error: receiptError } = await supabase
          .from('receipts')
          .select('itemized_list')
          .eq('id', sessionData.receipt_id)
          .single();

        if (receiptError) throw receiptError;
        if (!receiptData) throw new Error('Receipt data not found');

        // Convert receipt items to BillItems
        const billItems: BillItem[] = receiptData.itemized_list.items.map((item: ReceiptItem, index: number) => ({
          id: index.toString(), // Use index as ID since receipt items don't have IDs
          name: item.name,
          price: item.price
        }));

        setItems(billItems);

        // Fetch participants
        const { data: participantsData, error: participantsError } = await supabase
          .from('bill_participants')
          .select('*')
          .eq('session_id', sessionId);

        if (participantsError) throw participantsError;
        setParticipants(participantsData || []);

        // Set current participant
        const currentParticipant = participantsData?.find(p => p.id === participantId);
        if (!currentParticipant) throw new Error('Participant not found');
        setCurrentParticipant(currentParticipant);

        // Fetch existing selections
        const { data: selectionsData, error: selectionsError } = await supabase
          .from('item_selections')
          .select('*')
          .eq('session_id', sessionId);

        if (selectionsError) throw selectionsError;
        
        setSelections(
          selectionsData?.map(s => ({
            itemId: s.item_id,
            participantId: s.participant_id,
            percentage: s.percentage
          })) || []
        );

      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load bill details. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [sessionId, participantId, router]);

  const handleItemSelect = (itemId: string) => {
    if (!currentParticipant) return;

    setSelections(prev => {
      const existingSelection = prev.find(
        s => s.itemId === itemId && s.participantId === currentParticipant.id
      );

      if (existingSelection) {
        return prev.filter(s => !(s.itemId === itemId && s.participantId === currentParticipant.id));
      } else {
        return [...prev, { itemId, participantId: currentParticipant.id, percentage: 100 }];
      }
    });
  };

  const handleContinue = async () => {
    if (!sessionId || !currentParticipant) return;

    if (!isReviewing) {
      setIsReviewing(true);
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      console.log('Saving selections:', selections);

      // Only get selections for the current participant
      const currentParticipantSelections = selections.filter(s => s.participantId === currentParticipant.id);

      // Delete existing selections for this participant only
      const { error: deleteError } = await supabase
        .from('item_selections')
        .delete()
        .eq('session_id', sessionId)
        .eq('participant_id', currentParticipant.id);

      if (deleteError) {
        console.error('Error deleting existing selections:', deleteError);
        throw deleteError;
      }

      // Only insert selections for the current participant
      if (currentParticipantSelections.length > 0) {
        const { data: insertData, error: insertError } = await supabase
          .from('item_selections')
          .insert(
            currentParticipantSelections.map(s => ({
              session_id: sessionId,
              item_id: s.itemId,
              participant_id: currentParticipant.id,
              percentage: s.percentage
            }))
          )
          .select();

        if (insertError) {
          console.error('Error inserting selections:', insertError);
          throw insertError;
        }

        console.log('Inserted selections:', insertData);
      }

      // Navigate to waiting page
      router.push(`/waiting?session=${sessionId}&participant=${currentParticipant.id}`);
    } catch (error) {
      console.error('Error saving selections:', error);
      if (error instanceof Error) {
        setError(`Failed to save selections: ${error.message}`);
      } else if (typeof error === 'object' && error !== null) {
        setError(`Failed to save selections: ${JSON.stringify(error)}`);
      } else {
        setError('Failed to save selections. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !sessionData || !currentParticipant) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  // Get selected and unselected items
  const selectedItems = items.filter(item =>
    selections.some(s => s.itemId === item.id && s.participantId === currentParticipant.id)
  );
  const unselectedItems = items.filter(item =>
    !selections.some(s => s.itemId === item.id && s.participantId === currentParticipant.id)
  );

  return (
    <div className="min-h-screen bg-white flex flex-col items-center p-6">
      <div className="w-full max-w-md mx-auto flex flex-col items-center space-y-8">
        {/* Page Title */}
        <h1 className="text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
          {isReviewing ? 'Review Your Items' : 'Select Your Items'}
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
          {!isReviewing && (
            <div className="text-sm text-gray-600 mt-2">
              <span>Selecting items as: <span className="font-medium text-blue-600">{currentParticipant.name}</span></span>
            </div>
          )}
        </div>

        {/* Items List */}
        {isReviewing ? (
          <div className="w-full space-y-6">
            {/* Selected Items Section */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-gray-900">I had these items:</h2>
              <div className="space-y-3">
                {selectedItems.map((item) => (
                  <button
                    key={item.id}
                    className="w-full text-left bg-blue-500 text-white border-blue-600 p-4 rounded-xl border cursor-default"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium text-inherit">
                          {item.name}
                        </h3>
                      </div>
                      <span className="font-medium text-inherit">
                        ${item.price.toFixed(2)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Unselected Items Section */}
            {unselectedItems.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-medium text-gray-900">I did not have these items:</h2>
                <div className="space-y-3">
                  {unselectedItems.map((item) => (
                    <button
                      key={item.id}
                      className="w-full text-left bg-gray-50 text-gray-500 border-gray-200 p-4 rounded-xl border cursor-default"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium text-inherit">
                            {item.name}
                          </h3>
                        </div>
                        <span className="font-medium text-inherit">
                          ${item.price.toFixed(2)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full space-y-4">
            {items.map((item) => {
              const isSelected = selections.some(
                s => s.itemId === item.id && s.participantId === currentParticipant.id
              );

              return (
                <button
                  key={item.id}
                  onClick={() => handleItemSelect(item.id)}
                  className={`w-full text-left transition-all duration-200
                    ${isSelected
                      ? 'bg-blue-500 text-white border-blue-600'
                      : 'bg-white text-gray-900 border-gray-200 hover:border-blue-300'
                    } p-4 rounded-xl border cursor-pointer`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium text-inherit">
                        {item.name}
                      </h3>
                    </div>
                    <span className="font-medium text-inherit">
                      ${item.price.toFixed(2)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {error && (
          <div className="text-red-500 text-sm text-center">
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex w-full space-x-4">
          <button 
            onClick={() => isReviewing ? setIsReviewing(false) : router.push(`/split?session=${sessionId}`)}
            className="w-1/2 py-4 px-6 border-2 border-blue-600 text-blue-600 rounded-2xl transition-all duration-300 font-medium text-center text-lg hover:bg-blue-50"
          >
            {isReviewing ? 'Edit Selections' : 'Back'}
          </button>
          <button
            onClick={handleContinue}
            disabled={isSaving || selections.length === 0}
            className={`w-1/2 py-4 px-6 bg-blue-500 text-white rounded-2xl transition-all duration-300 font-medium text-lg text-center hover:bg-blue-600 relative
              ${(isSaving || selections.length === 0) && 'opacity-50 cursor-not-allowed'}`}
          >
            {isSaving ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </div>
            ) : (
              isReviewing ? 'Confirm & Continue' : 'Continue'
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 