'use client';

import Link from 'next/link';
import Image from 'next/image';
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

interface SessionData {
  restaurant_name: string;
  total_amount: number;
  split_type: 'equal' | 'custom';
  number_of_participants: number;
  subtotal: number;
  tax_amount: number;
  tip_amount: number;
  receipt_id: string;
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

export default function Pay() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PayContent />
    </Suspense>
  );
}

function PayContent() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [venmoInitiated, setVenmoInitiated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [ownerData, setOwnerData] = useState<{ venmo_username: string } | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');
  const participantId = searchParams.get('participant');

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
          .select('restaurant_name, total_amount, split_type, number_of_participants, subtotal, tax_amount, tip_amount, receipt_id')
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

        // Fetch current participant
        const { data: participantData, error: participantError } = await supabase
          .from('bill_participants')
          .select('*')
          .eq('id', participantId)
          .single();

        if (participantError) throw participantError;
        if (!participantData) throw new Error('Participant not found');

        // Fetch owner's data to get Venmo username
        const { data: ownerData, error: ownerError } = await supabase
          .from('bill_participants')
          .select('venmo_username')
          .eq('session_id', sessionId)
          .eq('is_owner', true)
          .single();

        if (ownerError) throw ownerError;
        if (!ownerData) throw new Error('Owner not found');

        setOwnerData(ownerData);

        // Calculate amount based on split type
        if (sessionData.split_type === 'equal') {
          const amount = sessionData.total_amount / sessionData.number_of_participants;
          setAmount(amount);
          setCurrentParticipant({ ...participantData, amount });
        } else {
          // For custom split, fetch selections and calculate
          const { data: allSelectionsData, error: selectionsError } = await supabase
            .from('item_selections')
            .select('item_id, participant_id, percentage')
            .eq('session_id', sessionId);

          if (selectionsError) throw selectionsError;

          // Group selections by item to calculate percentages
          const itemSelections: Record<string, { total: number, selections: ItemSelection[] }> = {};
          allSelectionsData.forEach(selection => {
            if (!itemSelections[selection.item_id]) {
              itemSelections[selection.item_id] = { total: 0, selections: [] };
            }
            itemSelections[selection.item_id].total += selection.percentage;
            itemSelections[selection.item_id].selections.push(selection);
          });

          // Get current participant's selections
          const participantSelections = allSelectionsData.filter(s => s.participant_id === participantId);

          const items = participantSelections.map(selection => {
            const item = billItems[selection.item_id];
            if (!item) {
              console.error(`Item not found for ID: ${selection.item_id}`);
              return null;
            }
            // Calculate the actual percentage based on total percentages for this item
            const totalPercentage = itemSelections[selection.item_id].total;
            const adjustedPercentage = (selection.percentage / totalPercentage) * 100;
            const itemPrice = item.price * (adjustedPercentage / 100);
            
            return {
              name: item.name,
              price: itemPrice,
              percentage: adjustedPercentage
            };
          }).filter((item): item is NonNullable<typeof item> => item !== null);

          const subtotalAmount = items.reduce((sum, item) => sum + item.price, 0);
          const taxRatio = sessionData.tax_amount / sessionData.subtotal;
          const tipRatio = sessionData.tip_amount / sessionData.subtotal;
          const taxAmount = subtotalAmount * taxRatio;
          const tipAmount = subtotalAmount * tipRatio;
          const totalAmount = subtotalAmount + taxAmount + tipAmount;

          setAmount(totalAmount);
          setCurrentParticipant({ ...participantData, amount: totalAmount, items });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load payment details. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [sessionId, participantId, router]);

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
    if (!ownerData?.venmo_username) {
      setError('Owner\'s Venmo username not found');
      return;
    }
    
    const note = `Split payment for ${sessionData?.restaurant_name || 'bill'}`;
    
    // Create Venmo deep link
    const venmoUrl = `venmo://paycharge?txn=pay&recipients=${ownerData.venmo_username}&amount=${amount.toFixed(2)}&note=${encodeURIComponent(note)}`;
    
    // Set Venmo as initiated
    setVenmoInitiated(true);
    
    // Open Venmo app
    window.location.href = venmoUrl;
  };

  const handleContinue = () => {
    router.push(`/virtual-card?session=${sessionId}&participant=${participantId}`);
  };

  // Check if we should enable the continue button
  const canContinue = isComplete || venmoInitiated;

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
          Pay Your Share
        </h1>

        {/* Amount Card */}
        <div className="w-full bg-blue-50 p-6 rounded-xl space-y-3">
          <div className="text-center space-y-2">
            <span className="text-sm font-medium text-gray-600">Your Share</span>
            <div className="text-4xl font-bold text-blue-600">
              ${amount.toFixed(2)}
            </div>
            <div className="text-sm text-gray-500">
              for {sessionData.restaurant_name}
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="w-full space-y-4">
          <button
            onClick={handleApplePay}
            disabled={isProcessing || isComplete}
            className={`w-full flex items-center justify-center space-x-3 bg-black text-white py-4 px-6 rounded-2xl transition-all duration-300
              ${(isProcessing || isComplete) && 'opacity-50 cursor-not-allowed'}`}
          >
            {isProcessing ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                <span>Processing...</span>
              </div>
            ) : isComplete ? (
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Paid with Apple Pay</span>
              </div>
            ) : (
              <>
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.0457 12.7422C17.0343 10.8455 18.5751 9.8125 18.6525 9.76563C17.7778 8.49609 16.4096 8.29687 15.9263 8.27344C14.7361 8.15625 13.5927 8.99219 12.9849 8.99219C12.3654 8.99219 11.4087 8.28516 10.4013 8.30859C9.09815 8.33203 7.88611 9.07031 7.23142 10.2344C5.87533 12.6094 6.86939 16.1133 8.17689 18.0039C8.82689 18.9258 9.58689 19.957 10.5943 19.9219C11.5779 19.8867 11.9458 19.2969 13.1243 19.2969C14.2912 19.2969 14.6357 19.957 15.6662 19.9336C16.7271 19.9219 17.3935 18.9961 18.0318 18.0664C18.7857 17.0039 19.0966 15.9648 19.1079 15.9062C19.0849 15.8945 17.0591 15.1055 17.0457 12.7422Z" />
                  <path d="M15.4429 7.05469C15.9732 6.39844 16.3411 5.49219 16.2404 4.57031C15.4546 4.60547 14.4732 5.10156 13.9196 5.74609C13.4246 6.30859 12.9779 7.25 13.0904 8.14453C13.9654 8.21484 14.9009 7.70703 15.4429 7.05469Z" />
                </svg>
                <span>Pay with Apple Pay</span>
              </>
            )}
          </button>

          <button
            onClick={handleVenmo}
            disabled={venmoInitiated}
            className={`w-full flex items-center justify-center space-x-3 bg-[#008CFF] text-white py-4 px-6 rounded-2xl transition-all duration-300
              ${venmoInitiated && 'opacity-50 cursor-not-allowed'}`}
          >
            {venmoInitiated ? (
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Venmo Initiated</span>
              </div>
            ) : (
              <>
                <Image
                  src="/images/venmo_icon.png"
                  alt="Venmo"
                  width={24}
                  height={24}
                  className="text-white"
                />
                <span>Pay with Venmo</span>
              </>
            )}
          </button>
        </div>

        {/* Navigation */}
        <div className="flex w-full space-x-4">
          <Link
            href={`/summary?session=${sessionId}&participant=${participantId}`}
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