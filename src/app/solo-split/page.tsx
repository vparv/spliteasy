'use client';

import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface ReceiptItem {
  name: string;
  price: number;
}

interface Fee {
  name: string;
  amount: number;
}

interface ItemSelection {
  item_id: string;
  participant_id: string;
  participant_name: string;
  percentage: number;
}

export default function SoloSplit() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SoloSplitContent />
    </Suspense>
  );
}

function SoloSplitContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [tax, setTax] = useState(0);
  const [tipAmount, setTipAmount] = useState(0);
  const [restaurantName, setRestaurantName] = useState('');
  const [selections, setSelections] = useState<ItemSelection[]>([]);
  const [participants, setParticipants] = useState<{ id: string; name: string }[]>([]);

  // Current person's state
  const [currentName, setCurrentName] = useState('');
  const [isEnteringName, setIsEnteringName] = useState(true);
  const [currentParticipantId, setCurrentParticipantId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // Fetch session data
  useEffect(() => {
    if (!sessionId) {
      router.push('/upload');
      return;
    }

    async function fetchData() {
      try {
        setIsLoading(true);

        // Fetch session details
        const { data: session, error: sessionError } = await supabase
          .from('bill_sessions')
          .select('*, receipts(*)')
          .eq('id', sessionId)
          .single();

        if (sessionError) throw sessionError;
        if (!session) throw new Error('Session not found');

        setRestaurantName(session.restaurant_name || '');
        setTax(session.tax_amount || 0);
        setTipAmount(session.tip_amount || 0);

        // Get items from receipt
        const receiptItems = session.receipts?.itemized_list?.items || [];
        setItems(receiptItems);

        // Get fees (non-tip fees)
        const receiptFees = session.receipts?.itemized_list?.fees || [];
        const nonTipFees = receiptFees.filter((fee: Fee) => {
          const name = fee.name.toLowerCase();
          return !name.includes('tip') && !name.includes('gratuity');
        });
        setFees(nonTipFees);

        // Fetch existing participants
        const { data: existingParticipants, error: participantsError } = await supabase
          .from('bill_participants')
          .select('id, name')
          .eq('session_id', sessionId);

        if (participantsError) throw participantsError;
        setParticipants(existingParticipants || []);

        // Fetch existing selections
        const { data: existingSelections, error: selectionsError } = await supabase
          .from('item_selections')
          .select('item_id, participant_id, percentage, bill_participants(name)')
          .eq('session_id', sessionId);

        if (selectionsError) throw selectionsError;

        const formattedSelections: ItemSelection[] = (existingSelections || []).map((sel: {
          item_id: string;
          participant_id: string;
          percentage: number;
          bill_participants: { name: string }[] | { name: string } | null;
        }) => ({
          item_id: sel.item_id,
          participant_id: sel.participant_id,
          participant_name: Array.isArray(sel.bill_participants)
            ? sel.bill_participants[0]?.name || 'Unknown'
            : sel.bill_participants?.name || 'Unknown',
          percentage: sel.percentage,
        }));
        setSelections(formattedSelections);

      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load session. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [sessionId, router]);

  // Get selections for a specific item
  const getItemSelections = (itemIndex: number) => {
    return selections.filter(s => s.item_id === String(itemIndex));
  };

  // Check if current user has selected an item
  const isItemSelectedByMe = (itemIndex: number) => {
    return selectedItems.has(itemIndex);
  };

  // Toggle item selection
  const toggleItem = (itemIndex: number) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemIndex)) {
        newSet.delete(itemIndex);
      } else {
        newSet.add(itemIndex);
      }
      return newSet;
    });
  };

  // Remove another person's selection from an item
  const removeSelection = async (itemIndex: number, participantId: string) => {
    try {
      const { error } = await supabase
        .from('item_selections')
        .delete()
        .eq('session_id', sessionId)
        .eq('item_id', String(itemIndex))
        .eq('participant_id', participantId);

      if (error) throw error;

      // Update local state
      setSelections(prev => prev.filter(s =>
        !(s.item_id === String(itemIndex) && s.participant_id === participantId)
      ));
    } catch (error) {
      console.error('Error removing selection:', error);
    }
  };

  // Add existing participant to an item
  const addParticipantToItem = async (itemIndex: number, participantId: string) => {
    try {
      const participant = participants.find(p => p.id === participantId);
      if (!participant) return;

      const { error } = await supabase
        .from('item_selections')
        .insert({
          session_id: sessionId,
          item_id: String(itemIndex),
          participant_id: participantId,
          percentage: 100,
        });

      if (error) throw error;

      // Update local state
      setSelections(prev => [...prev, {
        item_id: String(itemIndex),
        participant_id: participantId,
        participant_name: participant.name,
        percentage: 100,
      }]);
    } catch (error) {
      console.error('Error adding selection:', error);
    }
  };

  // Start selecting items (after entering name)
  const startSelecting = async () => {
    if (!currentName.trim()) return;

    try {
      // Check if this name already exists
      const existingParticipant = participants.find(
        p => p.name.toLowerCase() === currentName.trim().toLowerCase()
      );

      if (existingParticipant) {
        // Use existing participant
        setCurrentParticipantId(existingParticipant.id);

        // Pre-select their items
        const theirSelections = selections.filter(s => s.participant_id === existingParticipant.id);
        setSelectedItems(new Set(theirSelections.map(s => parseInt(s.item_id))));
      } else {
        // Create new participant
        const { data: newParticipant, error } = await supabase
          .from('bill_participants')
          .insert({
            session_id: sessionId,
            name: currentName.trim(),
            is_owner: participants.length === 0, // First person is owner
          })
          .select()
          .single();

        if (error) throw error;

        setCurrentParticipantId(newParticipant.id);
        setParticipants(prev => [...prev, { id: newParticipant.id, name: newParticipant.name }]);
      }

      setIsEnteringName(false);
    } catch (error) {
      console.error('Error creating participant:', error);
      setError('Failed to save name. Please try again.');
    }
  };

  // Save current person's selections and prepare for next person
  const saveAndContinue = async () => {
    if (!currentParticipantId) return;

    try {
      setIsSaving(true);

      // Delete existing selections for this participant
      await supabase
        .from('item_selections')
        .delete()
        .eq('session_id', sessionId)
        .eq('participant_id', currentParticipantId);

      // Insert new selections
      if (selectedItems.size > 0) {
        const newSelections = Array.from(selectedItems).map(itemIndex => ({
          session_id: sessionId,
          item_id: String(itemIndex),
          participant_id: currentParticipantId,
          percentage: 100,
        }));

        const { error } = await supabase
          .from('item_selections')
          .insert(newSelections);

        if (error) throw error;
      }

      // Update local selections state
      const currentParticipant = participants.find(p => p.id === currentParticipantId);
      const updatedSelections = selections.filter(s => s.participant_id !== currentParticipantId);

      Array.from(selectedItems).forEach(itemIndex => {
        updatedSelections.push({
          item_id: String(itemIndex),
          participant_id: currentParticipantId,
          participant_name: currentParticipant?.name || currentName,
          percentage: 100,
        });
      });

      setSelections(updatedSelections);

      // Reset for next person
      setCurrentName('');
      setCurrentParticipantId(null);
      setSelectedItems(new Set());
      setIsEnteringName(true);

    } catch (error) {
      console.error('Error saving selections:', error);
      setError('Failed to save selections. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Finish and go to summary
  const finishAndViewSummary = async () => {
    // Save current selections first if there are any
    if (currentParticipantId && selectedItems.size > 0) {
      await saveAndContinue();
    }

    // Update session status
    await supabase
      .from('bill_sessions')
      .update({ status: 'completed', split_type: 'custom' })
      .eq('id', sessionId);

    router.push(`/summary?session=${sessionId}`);
  };

  // Calculate subtotal of selected items
  const calculateSelectedSubtotal = () => {
    return Array.from(selectedItems).reduce((sum, index) => sum + (items[index]?.price || 0), 0);
  };

  // Calculate total items subtotal (for ratio calculations)
  const totalItemsSubtotal = items.reduce((sum, item) => sum + item.price, 0);

  // Calculate fees total
  const feesTotal = fees.reduce((sum, fee) => sum + fee.amount, 0);

  // Calculate proportional share of fees, tax, and tip
  const calculateProportionalShare = () => {
    const selectedSubtotal = calculateSelectedSubtotal();
    if (totalItemsSubtotal === 0) return { fees: 0, tax: 0, tip: 0, total: 0 };

    const ratio = selectedSubtotal / totalItemsSubtotal;
    const proportionalFees = feesTotal * ratio;
    const proportionalTax = tax * ratio;
    const proportionalTip = tipAmount * ratio;
    const total = selectedSubtotal + proportionalFees + proportionalTax + proportionalTip;

    return {
      fees: proportionalFees,
      tax: proportionalTax,
      tip: proportionalTip,
      total,
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  // Name entry screen
  if (isEnteringName) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center p-6">
        <div className="w-full max-w-md mx-auto flex flex-col space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Pass & Play
            </h1>
            {restaurantName && (
              <p className="text-lg font-medium text-gray-900">{restaurantName}</p>
            )}
            {participants.length > 0 && (
              <p className="text-sm text-gray-500">
                {participants.length} {participants.length === 1 ? 'person has' : 'people have'} selected items
              </p>
            )}
          </div>

          {/* Participants who have gone */}
          {participants.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Already selected:</h3>
              <div className="flex flex-wrap gap-2">
                {participants.map(p => (
                  <span key={p.id} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Name entry */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                {participants.length === 0 ? "What's your name?" : "Next person's name"}
              </label>
              <input
                type="text"
                id="name"
                value={currentName}
                onChange={(e) => setCurrentName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && startSelecting()}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-gray-900"
                placeholder="Enter your name"
                autoFocus
              />
            </div>

            <button
              onClick={startSelecting}
              disabled={!currentName.trim()}
              className={`w-full py-4 px-6 bg-blue-500 text-white rounded-2xl transition-all duration-300 font-medium text-lg hover:bg-blue-600 ${!currentName.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Select My Items
            </button>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          {/* Navigation */}
          <div className="flex gap-4 pt-4">
            <Link
              href={`/setup?session=${sessionId}`}
              className="flex-1 py-3 px-4 border-2 border-gray-300 text-gray-600 rounded-xl transition-all font-medium text-center hover:bg-gray-50"
            >
              Back
            </Link>
            {participants.length > 0 && (
              <button
                onClick={finishAndViewSummary}
                className="flex-1 py-3 px-4 bg-green-500 text-white rounded-xl transition-all font-medium hover:bg-green-600"
              >
                View Summary
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Item selection screen
  return (
    <div className="min-h-screen bg-white flex flex-col p-6">
      <div className="w-full max-w-md mx-auto flex flex-col space-y-4 flex-1">
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            {currentName}'s Items
          </h1>
          <p className="text-sm text-gray-500">Tap items you ordered</p>
        </div>

        {/* Items List */}
        <div className="space-y-2 flex-1 overflow-auto">
          {items.map((item, index) => {
            const itemSelections = getItemSelections(index);
            const isSelected = isItemSelectedByMe(index);
            const othersSelected = itemSelections.filter(s => s.participant_id !== currentParticipantId);

            return (
              <div
                key={index}
                className={`rounded-xl border-2 p-3 transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleItem(index)}
                >
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-medium truncate ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                      {item.name}
                    </h3>
                    {/* Show who else selected this */}
                    {othersSelected.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {othersSelected.map((sel, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                          >
                            {sel.participant_name}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeSelection(index, sel.participant_id);
                              }}
                              className="ml-1 text-gray-400 hover:text-red-500"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                      ${item.price.toFixed(2)}
                    </span>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      isSelected
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : 'border-gray-300'
                    }`}>
                      {isSelected && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>

                {/* Add existing participant dropdown */}
                {participants.length > 1 && !isSelected && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <select
                      className="text-xs text-gray-500 bg-transparent cursor-pointer"
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          addParticipantToItem(index, e.target.value);
                          e.target.value = '';
                        }
                      }}
                    >
                      <option value="">+ Add someone else</option>
                      {participants
                        .filter(p => !itemSelections.some(s => s.participant_id === p.id))
                        .map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))
                      }
                    </select>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Your items ({selectedItems.size})</span>
            <span>${calculateSelectedSubtotal().toFixed(2)}</span>
          </div>
          {calculateProportionalShare().fees > 0 && (
            <div className="flex justify-between text-sm text-amber-600">
              <span>+ Fees</span>
              <span>${calculateProportionalShare().fees.toFixed(2)}</span>
            </div>
          )}
          {calculateProportionalShare().tax > 0 && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>+ Tax</span>
              <span>${calculateProportionalShare().tax.toFixed(2)}</span>
            </div>
          )}
          {calculateProportionalShare().tip > 0 && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>+ Tip</span>
              <span>${calculateProportionalShare().tip.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t border-gray-200">
            <span>Your total</span>
            <span className="text-blue-600">${calculateProportionalShare().total.toFixed(2)}</span>
          </div>
        </div>

        {error && (
          <div className="text-red-500 text-sm text-center">{error}</div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => {
              setIsEnteringName(true);
              setCurrentName('');
              setSelectedItems(new Set());
              setCurrentParticipantId(null);
            }}
            className="flex-1 py-4 px-4 border-2 border-gray-300 text-gray-600 rounded-2xl transition-all font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={saveAndContinue}
            disabled={isSaving}
            className={`flex-1 py-4 px-4 bg-blue-500 text-white rounded-2xl transition-all font-medium hover:bg-blue-600 ${isSaving ? 'opacity-50' : ''}`}
          >
            {isSaving ? 'Saving...' : 'Done, Next Person'}
          </button>
        </div>

        <button
          onClick={finishAndViewSummary}
          disabled={isSaving}
          className="w-full py-3 px-4 bg-green-500 text-white rounded-xl transition-all font-medium hover:bg-green-600"
        >
          Everyone's Done - View Summary
        </button>
      </div>
    </div>
  );
}
