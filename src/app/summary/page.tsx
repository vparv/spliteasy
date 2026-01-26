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

interface ItemSelection {
  item_id: string;
  participant_id: string;
  percentage: number;
}

interface Participant {
  id: string;
  name: string;
  is_owner: boolean;
  amount?: number;
  items?: {
    name: string;
    price: number;
    percentage: number;
  }[];
  unselectedShare?: number;
}

interface SessionData {
  restaurant_name: string;
  total_amount: number;
  number_of_participants: number;
  split_type: 'equal' | 'custom';
  subtotal: number;
  tax_amount: number;
  tip_amount: number;
  receipt_id: string;
}

interface Fee {
  name: string;
  amount: number;
}

interface ReceiptData {
  id: string;
  itemized_list: {
    items: Array<{
      name: string;
      price: number;
    }>;
    fees?: Fee[];
  };
}

export default function Summary() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SummaryContent />
    </Suspense>
  );
}

function SummaryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
  const participantId = searchParams.get('participant');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
  const [unselectedItems, setUnselectedItems] = useState<{ name: string; price: number }[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);

  useEffect(() => {
    if (!sessionId) {
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
          .select('restaurant_name, total_amount, number_of_participants, split_type, subtotal, tax_amount, tip_amount, receipt_id')
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
        const billItems: Record<string, BillItem> = {};
        receiptData.itemized_list.items.forEach((item: { name: string; price: number }, index: number) => {
          billItems[index.toString()] = {
            id: index.toString(),
            name: item.name,
            price: item.price
          };
        });

        // Extract fees from receipt (excluding tips which are handled separately)
        const receiptFees: Fee[] = [];
        if (receiptData.itemized_list.fees && Array.isArray(receiptData.itemized_list.fees)) {
          receiptData.itemized_list.fees.forEach((fee: Fee) => {
            const feeName = fee.name.toLowerCase();
            // Exclude tips/gratuity as they're already in tip_amount
            if (!feeName.includes('tip') && !feeName.includes('gratuity')) {
              receiptFees.push(fee);
            }
          });
        }
        setFees(receiptFees);

        // Fetch all participants
        const { data: participantsData, error: participantsError } = await supabase
          .from('bill_participants')
          .select('id, name, is_owner')
          .eq('session_id', sessionId);

        if (participantsError) throw participantsError;

        // Fetch all item selections
        const { data: selectionsData, error: selectionsError } = await supabase
          .from('item_selections')
          .select('item_id, participant_id, percentage')
          .eq('session_id', sessionId);

        if (selectionsError) throw selectionsError;

        // Group selections by item to calculate percentages
        const itemSelections: Record<string, { total: number, selections: ItemSelection[] }> = {};
        selectionsData.forEach(selection => {
          if (!itemSelections[selection.item_id]) {
            itemSelections[selection.item_id] = { total: 0, selections: [] };
          }
          itemSelections[selection.item_id].total += selection.percentage;
          itemSelections[selection.item_id].selections.push(selection);
        });

        // Find unselected items (items not selected by anyone)
        const unselected = Object.values(billItems).filter(item => !itemSelections[item.id]);
        setUnselectedItems(unselected.map(item => ({ name: item.name, price: item.price })));

        // Calculate the total from all receipt items
        const receiptItemsTotal = Object.values(billItems).reduce((sum, item) => sum + item.price, 0);

        // Calculate fees total from receipt
        const receiptFeesTotal = receiptFees.reduce((sum, fee) => sum + fee.amount, 0);

        // Items-only subtotal (sessionData.subtotal includes fees, so subtract them)
        const itemsOnlySubtotal = sessionData.subtotal - receiptFeesTotal;

        // Calculate total cost of unselected items to split evenly
        const unselectedTotal = unselected.reduce((sum, item) => sum + item.price, 0);
        const unselectedPerPerson = unselectedTotal / participantsData.length;

        // Calculate amounts for each participant
        const enrichedParticipantsRaw = participantsData.map(participant => {
          const participantSelections = selectionsData.filter(s => s.participant_id === participant.id);

          if (sessionData.split_type === 'equal') {
            return {
              ...participant,
              amount: sessionData.total_amount / participantsData.length,
              items: [],
              unselectedShare: 0
            };
          } else {
            // Calculate the scaling factor to convert receipt item prices to actual items-only subtotal
            // This accounts for any discrepancy between receipt items and the bill subtotal (excluding fees)
            const scalingFactor = receiptItemsTotal > 0
              ? itemsOnlySubtotal / receiptItemsTotal
              : 1;

            const items = participantSelections.map(selection => {
              const item = billItems[selection.item_id];
              if (!item) {
                console.error(`Item not found for ID: ${selection.item_id}`);
                return null;
              }
              // Calculate the actual percentage based on total percentages for this item
              const totalPercentage = itemSelections[selection.item_id].total;
              const adjustedPercentage = (selection.percentage / totalPercentage) * 100;
              // Scale the item price to match the items-only subtotal
              const itemPrice = item.price * (adjustedPercentage / 100) * scalingFactor;

              return {
                name: item.name,
                price: itemPrice,
                percentage: adjustedPercentage
              };
            }).filter((item): item is NonNullable<typeof item> => item !== null);

            // Calculate participant's items subtotal share
            const selectedItemsTotal = items.reduce((sum, item) => sum + item.price, 0);
            const scaledUnselectedShare = unselectedPerPerson * scalingFactor;
            const itemsSubtotalShare = selectedItemsTotal + scaledUnselectedShare;

            // Calculate participant's proportion of items subtotal
            const itemsProportion = itemsOnlySubtotal > 0
              ? itemsSubtotalShare / itemsOnlySubtotal
              : 1 / participantsData.length;

            // Calculate participant's share of fees, tax, and tip based on their proportion
            const feesShare = receiptFeesTotal * itemsProportion;
            const taxShare = sessionData.tax_amount * itemsProportion;
            const tipShare = sessionData.tip_amount * itemsProportion;

            // Total = items + fees + tax + tip
            const totalAmount = itemsSubtotalShare + feesShare + taxShare + tipShare;

            return {
              ...participant,
              amount: totalAmount,
              items,
              unselectedShare: scaledUnselectedShare
            };
          }
        });

        // Round amounts and ensure they sum to the total
        const roundedTotal = Math.round(sessionData.total_amount * 100) / 100;
        let enrichedParticipants = enrichedParticipantsRaw.map(p => ({
          ...p,
          amount: Math.round((p.amount || 0) * 100) / 100
        }));
        
        // Calculate the sum of rounded amounts
        const sumOfAmounts = enrichedParticipants.reduce((sum, p) => sum + (p.amount || 0), 0);
        const roundedSum = Math.round(sumOfAmounts * 100) / 100;
        
        // If there's a rounding difference, adjust the owner's amount (or first participant)
        if (roundedSum !== roundedTotal) {
          const difference = Math.round((roundedTotal - roundedSum) * 100) / 100;
          const ownerIndex = enrichedParticipants.findIndex(p => p.is_owner);
          const adjustIndex = ownerIndex >= 0 ? ownerIndex : 0;
          enrichedParticipants = enrichedParticipants.map((p, index) => 
            index === adjustIndex 
              ? { ...p, amount: Math.round(((p.amount || 0) + difference) * 100) / 100 }
              : p
          );
        }

        setParticipants(enrichedParticipants);
        // Set current participant if participantId is provided, otherwise use first participant
        setCurrentParticipant(
          participantId
            ? enrichedParticipants.find(p => p.id === participantId) || enrichedParticipants[0] || null
            : enrichedParticipants[0] || null
        );

      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load summary. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [sessionId, participantId, router]);

  if (isLoading || !sessionData || participants.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center p-6">
      <div className="w-full max-w-md mx-auto flex flex-col items-center space-y-8">
        {/* Page Title */}
        <h1 className="text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
          Summary
        </h1>

        {/* Total Amount Card */}
        <div className="w-full bg-blue-50 p-6 rounded-xl space-y-4">
          {(() => {
            // sessionData.subtotal includes fees, so subtract them to get items-only subtotal
            const feesTotal = fees.reduce((sum, fee) => sum + fee.amount, 0);
            const itemsSubtotal = Math.round((sessionData.subtotal - feesTotal) * 100) / 100;
            const displayedTax = Math.round(sessionData.tax_amount * 100) / 100;
            const displayedTip = Math.round(sessionData.tip_amount * 100) / 100;
            const displayedTotal = Math.round(sessionData.total_amount * 100) / 100;

            return (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-gray-700">Total Bill</span>
                  <span className="text-3xl font-bold text-blue-600">
                    ${displayedTotal.toFixed(2)}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium text-gray-800">${itemsSubtotal.toFixed(2)}</span>
                  </div>
                  {fees.map((fee, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">{fee.name}</span>
                      <span className="font-medium text-gray-800">${fee.amount.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Tax</span>
                    <span className="font-medium text-gray-800">${displayedTax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Tip</span>
                    <span className="font-medium text-gray-800">${displayedTip.toFixed(2)}</span>
                  </div>
                </div>
              </>
            );
          })()}
          <div className="text-sm text-gray-500">
            Split {sessionData.split_type === 'equal' ? 'equally' : 'by items'} between {sessionData.number_of_participants} people
          </div>
        </div>

        {/* Unselected Items Notice */}
        {sessionData.split_type === 'custom' && unselectedItems.length > 0 && (
          <div className="w-full bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-3">
            <div className="flex items-center space-x-2">
              <span className="text-amber-600 text-lg">&#9432;</span>
              <span className="font-medium text-amber-800">Items Split Evenly</span>
            </div>
            <p className="text-sm text-amber-700">
              The following items were not selected by anyone and have been split evenly among all {participants.length} participants:
            </p>
            <div className="space-y-1">
              {unselectedItems.map((item, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="text-amber-700">{item.name}</span>
                  <span className="text-amber-800 font-medium">${item.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-amber-200 flex justify-between items-center text-sm">
              <span className="text-amber-700 font-medium">Per person share:</span>
              <span className="text-amber-800 font-bold">
                ${(unselectedItems.reduce((sum, item) => sum + item.price, 0) / participants.length).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Individual Splits */}
        <div className="w-full space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Split Details</h2>
          
          {participants.map((participant) => {
            // Items subtotal = sum of individual items + shared items (already scaled to items-only subtotal)
            const selectedItemsTotal = participant.items?.reduce((sum, item) => sum + item.price, 0) || 0;
            const unselectedShare = participant.unselectedShare || 0;
            const itemsSubtotalShare = selectedItemsTotal + unselectedShare;

            // Calculate fees total
            const feesTotal = fees.reduce((sum, fee) => sum + fee.amount, 0);

            // For equal split, calculate proportion differently
            // For custom split, items are already scaled correctly
            const itemsOnlySubtotalTotal = sessionData.subtotal - feesTotal;
            const itemsProportion = sessionData.split_type === 'equal'
              ? 1 / participants.length
              : (itemsOnlySubtotalTotal > 0 ? itemsSubtotalShare / itemsOnlySubtotalTotal : 1 / participants.length);

            // Calculate fees, tax, and tip based on proportion
            const feesShare = Math.round(feesTotal * itemsProportion * 100) / 100;
            const taxAmount = Math.round(sessionData.tax_amount * itemsProportion * 100) / 100;
            const tipAmount = Math.round(sessionData.tip_amount * itemsProportion * 100) / 100;

            // Round items subtotal
            const displayedItemsSubtotal = sessionData.split_type === 'equal'
              ? Math.round(itemsOnlySubtotalTotal / participants.length * 100) / 100
              : Math.round(itemsSubtotalShare * 100) / 100;

            // Total for this participant (should equal items subtotal + fees + tax + tip)
            const displayedTotal = Math.round((participant.amount || 0) * 100) / 100;

            return (
              <div
                key={participant.id}
                className={`bg-white border-2 rounded-xl p-4 space-y-3
                  ${participantId && participant.id === currentParticipant?.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'}`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">
                      {participant.name}
                    </span>
                    {participant.is_owner && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                        Owner
                      </span>
                    )}
                    {participantId && participant.id === currentParticipant?.id && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        You
                      </span>
                    )}
                  </div>
                  <span className="text-xl font-bold text-blue-600">
                    ${participant.amount?.toFixed(2)}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium text-gray-800">${displayedItemsSubtotal.toFixed(2)}</span>
                  </div>
                  {fees.length > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Fees</span>
                      <span className="font-medium text-gray-800">${feesShare.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Tax</span>
                    <span className="font-medium text-gray-800">${taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Tip</span>
                    <span className="font-medium text-gray-800">${tipAmount.toFixed(2)}</span>
                  </div>
                </div>
                
                {sessionData.split_type === 'custom' && (participant.items && participant.items.length > 0 || (participant.unselectedShare || 0) > 0) && (
                  <div className="space-y-2">
                    <div className="h-px bg-gray-200"></div>
                    {participant.items && participant.items.length > 0 && (
                      <>
                        <div className="text-sm font-medium text-gray-700">Items:</div>
                        {participant.items.map((item, itemIndex) => (
                          <div key={itemIndex} className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">{item.name}</span>
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-400">({item.percentage.toFixed(1)}%)</span>
                              <span className="text-gray-900">${item.price.toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                    {(participant.unselectedShare || 0) > 0 && (
                      <div className="flex justify-between items-center text-sm bg-amber-50 p-2 rounded-lg -mx-2">
                        <span className="text-amber-700">Shared items (split evenly)</span>
                        <span className="text-amber-800 font-medium">${(participant.unselectedShare || 0).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Verification: Sum of all amounts */}
          <div className="mt-4 pt-4 border-t-2 border-gray-200 flex justify-between items-center">
            <span className="font-medium text-gray-700">Total (all shares)</span>
            <span className="text-xl font-bold text-green-600">
              ${participants.reduce((sum, p) => sum + (p.amount || 0), 0).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex w-full space-x-4">
          <Link
            href={participantId ? `/select?session=${sessionId}&participant=${participantId}` : `/solo-split?session=${sessionId}`}
            className="w-1/2 py-4 px-6 border-2 border-blue-600 text-blue-600 rounded-2xl transition-all duration-300 font-medium text-center text-lg hover:bg-blue-50"
          >
            Back
          </Link>
          {participantId ? (
            <Link
              href={`/pay?session=${sessionId}&participant=${participantId}`}
              className="w-1/2 py-4 px-6 bg-blue-500 text-white rounded-2xl transition-all duration-300 font-medium text-lg text-center hover:bg-blue-600"
            >
              Pay Now
            </Link>
          ) : (
            <button
              onClick={() => {
                // Share functionality or copy link
                if (navigator.share) {
                  navigator.share({
                    title: `Bill Split - ${sessionData.restaurant_name}`,
                    text: `Check out our bill split from ${sessionData.restaurant_name}`,
                    url: window.location.href,
                  });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Link copied to clipboard!');
                }
              }}
              className="w-1/2 py-4 px-6 bg-blue-500 text-white rounded-2xl transition-all duration-300 font-medium text-lg text-center hover:bg-blue-600"
            >
              Share
            </button>
          )}
        </div>

        {/* New Session Button */}
        <Link
          href="/upload"
          className="w-full py-4 px-6 bg-green-500 text-white rounded-2xl transition-all duration-300 font-medium text-lg text-center hover:bg-green-600"
        >
          New Session
        </Link>
      </div>
    </div>
  );
} 