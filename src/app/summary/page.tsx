'use client';

import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface BillItem {
  id: string;
  name: string;
  price: number;
  category: string;
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
}

interface SessionData {
  restaurant_name: string;
  total_amount: number;
  number_of_participants: number;
  split_type: 'equal' | 'custom';
  subtotal: number;
  tax_amount: number;
  tip_amount: number;
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
          .select('restaurant_name, total_amount, number_of_participants, split_type, subtotal, tax_amount, tip_amount')
          .eq('id', sessionId)
          .single();

        if (sessionError) throw sessionError;
        if (!sessionData) throw new Error('Session not found');

        setSessionData(sessionData);

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

        // Mock items (replace with real items later)
        const mockItems: Record<string, BillItem> = {
          '1': { id: '1', name: 'Chicken Pasta', price: 16.99, category: 'Mains' },
          '2': { id: '2', name: 'Caesar Salad', price: 12.99, category: 'Starters' },
          '3': { id: '3', name: 'Garlic Bread', price: 5.99, category: 'Sides' },
          '4': { id: '4', name: 'Margherita Pizza', price: 18.99, category: 'Mains' },
          '5': { id: '5', name: 'Tiramisu', price: 8.99, category: 'Desserts' },
          '6': { id: '6', name: 'Soft Drinks', price: 3.99, category: 'Beverages' },
          '7': { id: '7', name: 'French Fries', price: 4.99, category: 'Sides' },
          '8': { id: '8', name: 'Chocolate Cake', price: 7.99, category: 'Desserts' },
        };

        // Calculate amounts for each participant
        const enrichedParticipants = participantsData.map(participant => {
          const participantSelections = selectionsData.filter(s => s.participant_id === participant.id);
          
          if (sessionData.split_type === 'equal') {
            return {
              ...participant,
              amount: sessionData.total_amount / participantsData.length,
              items: []
            };
          } else {
            const items = participantSelections.map(selection => {
              const item = mockItems[selection.item_id];
              return {
                name: item.name,
                price: (item.price * selection.percentage) / 100,
                percentage: selection.percentage
              };
            });

            const subtotalAmount = items.reduce((sum, item) => sum + item.price, 0);
            const taxRatio = sessionData.tax_amount / sessionData.subtotal;
            const tipRatio = sessionData.tip_amount / sessionData.subtotal;
            const taxAmount = subtotalAmount * taxRatio;
            const tipAmount = subtotalAmount * tipRatio;
            const totalAmount = subtotalAmount + taxAmount + tipAmount;

            return {
              ...participant,
              amount: totalAmount,
              items
            };
          }
        });

        setParticipants(enrichedParticipants);
        setCurrentParticipant(enrichedParticipants.find(p => p.id === participantId) || null);

      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load summary. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [sessionId, participantId, router]);

  if (isLoading || !sessionData || !currentParticipant) {
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
        <div className="w-full bg-blue-50 p-6 rounded-xl space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-lg font-medium text-gray-700">Total Bill</span>
            <span className="text-3xl font-bold text-blue-600">
              ${sessionData.total_amount.toFixed(2)}
            </span>
          </div>
          <div className="text-sm text-gray-500">
            Split {sessionData.split_type === 'equal' ? 'equally' : 'by items'} between {sessionData.number_of_participants} people
          </div>
        </div>

        {/* Individual Splits */}
        <div className="w-full space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Split Details</h2>
          
          {participants.map((participant) => (
            <div 
              key={participant.id} 
              className={`bg-white border-2 rounded-xl p-4 space-y-3
                ${participant.id === currentParticipant.id 
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
                  {participant.id === currentParticipant.id && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      You
                    </span>
                  )}
                </div>
                <span className="text-xl font-bold text-blue-600">
                  ${participant.amount?.toFixed(2)}
                </span>
              </div>
              
              {sessionData.split_type === 'custom' && participant.items && participant.items.length > 0 && (
                <div className="space-y-2">
                  <div className="h-px bg-gray-200"></div>
                  {participant.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">{item.name}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-400">({item.percentage}%)</span>
                        <span className="text-gray-900">${item.price.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex w-full space-x-4">
          <Link 
            href={`/select?session=${sessionId}&participant=${participantId}`}
            className="w-1/2 py-4 px-6 border-2 border-blue-600 text-blue-600 rounded-2xl transition-all duration-300 font-medium text-center text-lg hover:bg-blue-50"
          >
            Back
          </Link>
          <Link 
            href={`/pay?session=${sessionId}&participant=${participantId}`}
            className="w-1/2 py-4 px-6 bg-blue-500 text-white rounded-2xl transition-all duration-300 font-medium text-lg text-center hover:bg-blue-600"
          >
            Pay Now
          </Link>
        </div>
      </div>
    </div>
  );
} 