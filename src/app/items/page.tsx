'use client';

import Link from 'next/link';
import { useState, useEffect, Suspense, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowsRightLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { supabase } from '@/lib/supabase';
import { getReceiptImages } from '@/lib/receiptImageCache';

interface ReceiptItem {
  name: string;
  price: number;
}

interface Fee {
  name: string;
  amount: number;
}

interface GroupedItem {
  name: string;
  unitPrice: number;
  quantity: number;
}

interface ReceiptData {
  id: string;
  raw_analysis: string;
  itemized_list: {
    items: ReceiptItem[];
    fees?: Fee[];
  };
  merchant?: string;
  date?: string;
  tax?: number;
  created_at: string;
}

export default function Items() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ItemsContent />
    </Suspense>
  );
}

function ItemsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const receiptId = searchParams.get('receipt');

  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemQuantities, setItemQuantities] = useState<Map<string, number>>(new Map());
  const [fees, setFees] = useState<Fee[]>([]);
  const [tax, setTax] = useState<number>(0);
  const [receiptImages, setReceiptImages] = useState<string[]>([]);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isReceiptTranslucent, setIsReceiptTranslucent] = useState(true);
  const [activeReceiptImage, setActiveReceiptImage] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const viewReceiptButtonRef = useRef<HTMLButtonElement>(null);
  const closeReceiptButtonRef = useRef<HTMLButtonElement>(null);
  const receiptDialogRef = useRef<HTMLDivElement>(null);

  // Modal states
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showAddFeeModal, setShowAddFeeModal] = useState(false);
  const [editingItem, setEditingItem] = useState<{ key: string; name: string; price: number } | null>(null);
  const [editingFeeIndex, setEditingFeeIndex] = useState<number | null>(null);
  const [editingTax, setEditingTax] = useState(false);

  // Form states
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemQty, setNewItemQty] = useState('1');
  const [newFeeName, setNewFeeName] = useState('');
  const [newFeeAmount, setNewFeeAmount] = useState('');
  const [editTaxValue, setEditTaxValue] = useState('');

  // Fetch receipt data
  useEffect(() => {
    if (!receiptId) {
      router.push('/upload');
      return;
    }

    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);

        const { data: receiptData, error: receiptError } = await supabase
          .from('receipts')
          .select('*')
          .eq('id', receiptId)
          .single();

        if (receiptError) throw receiptError;
        if (!receiptData) throw new Error('Receipt not found');

        setReceiptData(receiptData);

        const grouped = new Map<string, number>();
        receiptData.itemized_list.items.forEach((item: ReceiptItem) => {
          const key = `${item.name}|${item.price}`;
          grouped.set(key, (grouped.get(key) || 0) + 1);
        });
        setItemQuantities(grouped);

        if (receiptData.itemized_list.fees) {
          setFees(receiptData.itemized_list.fees);
        }

        if (receiptData.tax) {
          setTax(receiptData.tax);
        }

      } catch (error) {
        console.error('Error fetching receipt:', error);
        setError('Failed to load receipt details. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [receiptId, router]);

  useEffect(() => {
    if (!receiptId) return;

    let isCurrent = true;

    const receiptImageUrls: string[] = [];

    getReceiptImages(receiptId)
      .then((images) => {
        receiptImageUrls.push(...images.map((image) => URL.createObjectURL(image)));

        if (isCurrent) {
          setReceiptImages(receiptImageUrls);
        } else {
          receiptImageUrls.forEach((imageUrl) => URL.revokeObjectURL(imageUrl));
        }
      })
      .catch((cacheError) => {
        console.warn('Could not load receipt images for comparison:', cacheError);
      });

    return () => {
      isCurrent = false;
      receiptImageUrls.forEach((imageUrl) => URL.revokeObjectURL(imageUrl));
    };
  }, [receiptId]);

  useEffect(() => {
    if (!isReceiptOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeReceiptButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsReceiptOpen(false);
        requestAnimationFrame(() => viewReceiptButtonRef.current?.focus());
      }

      if (event.key === 'Tab') {
        const focusableElements = Array.from(
          receiptDialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href]') ?? [],
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isReceiptOpen]);

  const openReceipt = () => {
    if (receiptImages.length > 0) setIsReceiptOpen(true);
  };

  const closeReceipt = () => {
    setIsReceiptOpen(false);
    requestAnimationFrame(() => viewReceiptButtonRef.current?.focus());
  };

  const handleTouchStart = (event: React.TouchEvent) => {
    const touch = event.changedTouches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (!touchStart.current) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    touchStart.current = null;

    if (Math.abs(deltaX) < 70 || Math.abs(deltaX) <= Math.abs(deltaY)) return;

    if (deltaX < 0 && !isReceiptOpen) openReceipt();
    if (deltaX > 0 && isReceiptOpen) closeReceipt();
  };

  const groupedItems = useMemo(() => {
    const items: GroupedItem[] = [];
    itemQuantities.forEach((quantity, key) => {
      const [name, priceStr] = key.split('|');
      const unitPrice = parseFloat(priceStr);
      if (quantity > 0) {
        items.push({ name, unitPrice, quantity });
      }
    });
    return items;
  }, [itemQuantities]);

  const subtotal = useMemo(() => {
    return groupedItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  }, [groupedItems]);

  const feesTotal = useMemo(() => {
    return fees.reduce((sum, fee) => sum + fee.amount, 0);
  }, [fees]);

  const total = useMemo(() => {
    return subtotal + feesTotal + tax;
  }, [subtotal, feesTotal, tax]);

  const updateQuantity = (key: string, delta: number) => {
    setItemQuantities(prev => {
      const newMap = new Map(prev);
      const currentQty = newMap.get(key) || 0;
      const newQty = Math.max(0, currentQty + delta);
      if (newQty === 0) {
        newMap.delete(key);
      } else {
        newMap.set(key, newQty);
      }
      return newMap;
    });
  };

  const addItem = () => {
    const price = parseFloat(newItemPrice);
    const qty = parseInt(newItemQty) || 1;
    if (newItemName.trim() && !isNaN(price) && price > 0) {
      const key = `${newItemName.trim()}|${price}`;
      setItemQuantities(prev => {
        const newMap = new Map(prev);
        newMap.set(key, (newMap.get(key) || 0) + qty);
        return newMap;
      });
      setNewItemName('');
      setNewItemPrice('');
      setNewItemQty('1');
      setShowAddItemModal(false);
    }
  };

  const startEditItem = (key: string) => {
    const [name, priceStr] = key.split('|');
    setEditingItem({ key, name, price: parseFloat(priceStr) });
    setNewItemName(name);
    setNewItemPrice(priceStr);
  };

  const saveEditItem = () => {
    if (!editingItem) return;
    const newPrice = parseFloat(newItemPrice);
    if (newItemName.trim() && !isNaN(newPrice) && newPrice > 0) {
      const oldKey = editingItem.key;
      const newKey = `${newItemName.trim()}|${newPrice}`;
      setItemQuantities(prev => {
        const newMap = new Map(prev);
        const qty = newMap.get(oldKey) || 1;
        newMap.delete(oldKey);
        newMap.set(newKey, qty);
        return newMap;
      });
      setEditingItem(null);
      setNewItemName('');
      setNewItemPrice('');
    }
  };

  const addFee = () => {
    const amount = parseFloat(newFeeAmount);
    if (newFeeName.trim() && !isNaN(amount) && amount > 0) {
      setFees(prev => [...prev, { name: newFeeName.trim(), amount }]);
      setNewFeeName('');
      setNewFeeAmount('');
      setShowAddFeeModal(false);
    }
  };

  const startEditFee = (index: number) => {
    setEditingFeeIndex(index);
    setNewFeeName(fees[index].name);
    setNewFeeAmount(fees[index].amount.toString());
  };

  const saveEditFee = () => {
    if (editingFeeIndex === null) return;
    const amount = parseFloat(newFeeAmount);
    if (newFeeName.trim() && !isNaN(amount) && amount > 0) {
      setFees(prev => {
        const updated = [...prev];
        updated[editingFeeIndex] = { name: newFeeName.trim(), amount };
        return updated;
      });
      setEditingFeeIndex(null);
      setNewFeeName('');
      setNewFeeAmount('');
    }
  };

  const removeFee = (index: number) => {
    setFees(prev => prev.filter((_, i) => i !== index));
  };

  const startEditTax = () => {
    setEditTaxValue(tax.toString());
    setEditingTax(true);
  };

  const saveEditTax = () => {
    const newTax = parseFloat(editTaxValue);
    if (!isNaN(newTax) && newTax >= 0) {
      setTax(newTax);
    }
    setEditingTax(false);
  };

  const handleContinue = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const expandedItems: ReceiptItem[] = [];
      itemQuantities.forEach((quantity, key) => {
        const [name, priceStr] = key.split('|');
        const price = parseFloat(priceStr);
        for (let i = 0; i < quantity; i++) {
          expandedItems.push({ name, price });
        }
      });

      const updatedItemizedList = {
        ...receiptData?.itemized_list,
        items: expandedItems,
        fees: fees.length > 0 ? fees : undefined,
      };

      const { error: updateError } = await supabase
        .from('receipts')
        .update({
          itemized_list: updatedItemizedList,
          tax: tax > 0 ? tax : null,
        })
        .eq('id', receiptId);

      if (updateError) throw updateError;

      const { data: session, error: sessionError } = await supabase
        .from('bill_sessions')
        .insert([{ status: 'created', receipt_id: receiptId }])
        .select()
        .single();

      if (sessionError) throw sessionError;

      router.push(`/setup?session=${session.id}&receipt=${receiptId}`);
    } catch (error) {
      console.error('Error creating session:', error);
      setError('Failed to create session. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-white flex flex-col items-center p-6 touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="w-full max-w-md mx-auto flex flex-col space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 sm:text-4xl">
              Receipt Items
            </h1>
            {receiptImages.length > 0 && (
              <button
                ref={viewReceiptButtonRef}
                type="button"
                onClick={openReceipt}
                className="mt-1 shrink-0 inline-flex min-h-10 items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-2 text-sm font-semibold text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-haspopup="dialog"
              >
                <EyeIcon className="h-4 w-4" aria-hidden="true" />
                View receipt
              </button>
            )}
          </div>
          <div className="text-left space-y-1">
            {receiptData?.merchant && (
              <p className="text-lg font-medium text-gray-900">{receiptData.merchant}</p>
            )}
            {receiptData?.date && (
              <p className="text-sm text-gray-600">{new Date(receiptData.date).toLocaleDateString()}</p>
            )}
          </div>
        </div>

        {/* Items List */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Items</h2>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          {groupedItems.map((item) => {
            const key = `${item.name}|${item.unitPrice}`;
            const isEditing = editingItem?.key === key;

            if (isEditing) {
              return (
                <div key={key} className="bg-blue-50 rounded-xl border border-blue-300 p-4 space-y-3">
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="Item name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  />
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500">Price</label>
                      <input
                        type="number"
                        step="0.01"
                        value={newItemPrice}
                        onChange={(e) => setNewItemPrice(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditingItem(null); setNewItemName(''); setNewItemPrice(''); }}
                      className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveEditItem}
                      className="flex-1 py-2 bg-blue-500 text-white rounded-lg"
                    >
                      Save
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={key}
                className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 hover:border-blue-500 transition-colors"
              >
                <div className="flex-1 min-w-0" onClick={() => startEditItem(key)}>
                  <h3 className="font-medium text-gray-900 truncate cursor-pointer hover:text-blue-600">{item.name}</h3>
                  <p className="text-sm text-gray-500">${item.unitPrice.toFixed(2)} each</p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateQuantity(key, -1)}
                    className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-medium transition-colors text-sm"
                  >
                    −
                  </button>
                  <span className="w-6 text-center font-medium text-gray-900 text-sm">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(key, 1)}
                    className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 font-medium transition-colors text-sm"
                  >
                    +
                  </button>
                </div>

                <div className="text-right w-16">
                  <p className="text-gray-900 font-medium text-sm">${(item.unitPrice * item.quantity).toFixed(2)}</p>
                </div>
              </div>
            );
          })}

          {groupedItems.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No items yet. Add some items to get started.
            </div>
          )}

          {/* Add Item Button - centered at bottom of items */}
          <button
            onClick={() => setShowAddItemModal(true)}
            className="w-full py-3 text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium flex items-center justify-center gap-1 rounded-xl border border-dashed border-blue-300 hover:border-blue-400 transition-colors"
          >
            <span>+</span> Add Item
          </button>
        </div>

        {/* Fees & Charges Section */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Fees & Tax</h2>

          {fees.map((fee, index) => {
            const isEditing = editingFeeIndex === index;

            if (isEditing) {
              return (
                <div key={`fee-${index}`} className="bg-amber-50 rounded-xl border border-amber-300 p-4 space-y-3">
                  <input
                    type="text"
                    value={newFeeName}
                    onChange={(e) => setNewFeeName(e.target.value)}
                    placeholder="Fee name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={newFeeAmount}
                    onChange={(e) => setNewFeeAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditingFeeIndex(null); setNewFeeName(''); setNewFeeAmount(''); }}
                      className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveEditFee}
                      className="flex-1 py-2 bg-amber-500 text-white rounded-lg"
                    >
                      Save
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={`fee-${index}`}
                className="bg-amber-50 rounded-xl border border-amber-200 p-4 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => startEditFee(index)}>
                  <h3 className="font-medium text-gray-900 hover:text-amber-700">{fee.name}</h3>
                </div>
                <button
                  onClick={() => removeFee(index)}
                  className="w-7 h-7 rounded-full bg-amber-100 hover:bg-amber-200 flex items-center justify-center text-amber-700 font-medium transition-colors text-sm"
                >
                  ×
                </button>
                <div className="text-right w-16">
                  <p className="text-gray-900 font-medium text-sm">${fee.amount.toFixed(2)}</p>
                </div>
              </div>
            );
          })}

          {/* Add Fee Button - centered at bottom of fees */}
          <button
            onClick={() => setShowAddFeeModal(true)}
            className="w-full py-3 text-amber-600 hover:text-amber-700 hover:bg-amber-50 font-medium flex items-center justify-center gap-1 rounded-xl border border-dashed border-amber-300 hover:border-amber-400 transition-colors"
          >
            <span>+</span> Add Fee
          </button>

          {/* Tax */}
          {editingTax ? (
            <div className="bg-gray-50 rounded-xl border border-gray-300 p-4 space-y-3">
              <label className="text-sm text-gray-600">Tax Amount</label>
              <input
                type="number"
                step="0.01"
                value={editTaxValue}
                onChange={(e) => setEditTaxValue(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingTax(false)}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEditTax}
                  className="flex-1 py-2 bg-gray-600 text-white rounded-lg"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div
              className="bg-gray-50 rounded-xl border border-gray-200 p-4 flex items-center gap-3 cursor-pointer hover:border-gray-400"
              onClick={startEditTax}
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900">Tax</h3>
              </div>
              <div className="text-right w-16">
                <p className="text-gray-900 font-medium text-sm">${tax.toFixed(2)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          {feesTotal > 0 && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>Fees</span>
              <span>${feesTotal.toFixed(2)}</span>
            </div>
          )}
          {tax > 0 && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>Tax</span>
              <span>${tax.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t border-gray-200">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex w-full space-x-4 pt-2">
          <Link
            href="/upload"
            className="w-1/2 py-4 px-6 border-2 border-blue-600 text-blue-600 rounded-2xl transition-all duration-300 font-medium text-center text-lg hover:bg-blue-50"
          >
            Back
          </Link>
          <button
            onClick={handleContinue}
            disabled={groupedItems.length === 0}
            className={`w-1/2 py-4 px-6 bg-blue-500 text-white rounded-2xl transition-all duration-300 font-medium text-lg text-center hover:bg-blue-600 ${groupedItems.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Continue
          </button>
        </div>
      </div>

      {isReceiptOpen && receiptImages.length > 0 && (
        <div
          ref={receiptDialogRef}
          className="fixed inset-0 z-[70] overflow-hidden bg-white/10 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-label="Original receipt"
          onClick={closeReceipt}
        >
          <div
            className="absolute inset-x-0 top-0 z-20 flex min-h-16 items-center justify-between gap-3 border-b border-gray-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur-md"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-950">Original receipt</p>
              <p className="text-xs text-gray-500">
                {isReceiptTranslucent ? 'Compare mode · 70% opacity' : 'Full opacity'}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setIsReceiptTranslucent((current) => !current)}
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-pressed={isReceiptTranslucent}
              >
                <ArrowsRightLeftIcon className="h-4 w-4" aria-hidden="true" />
                {isReceiptTranslucent ? 'Make solid' : 'Compare'}
              </button>
              <button
                ref={closeReceiptButtonRef}
                type="button"
                onClick={closeReceipt}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-950 text-white transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Close receipt"
              >
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-12 top-16 overflow-y-auto px-3 py-4 sm:px-8">
            <div
              className="mx-auto w-full max-w-lg transition-opacity duration-200"
              style={{ opacity: isReceiptTranslucent ? 0.7 : 1 }}
              onClick={(event) => event.stopPropagation()}
            >
              {/* The local object URL should render at its natural aspect ratio. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={receiptImages[activeReceiptImage]}
                alt={`Original receipt${receiptImages.length > 1 ? `, photo ${activeReceiptImage + 1}` : ''}`}
                className="block h-auto w-full drop-shadow-2xl"
              />
            </div>
          </div>

          {receiptImages.length > 1 && (
            <div
              className="absolute inset-x-0 bottom-14 z-20 flex items-center justify-center gap-3"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setActiveReceiptImage((current) => (current - 1 + receiptImages.length) % receiptImages.length)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-950/90 text-white hover:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Previous receipt photo"
              >
                <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
              </button>
              <span className="rounded-full bg-gray-950/90 px-3 py-2 text-xs font-semibold text-white">
                {activeReceiptImage + 1} / {receiptImages.length}
              </span>
              <button
                type="button"
                onClick={() => setActiveReceiptImage((current) => (current + 1) % receiptImages.length)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-950/90 text-white hover:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Next receipt photo"
              >
                <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          )}

          <p className="absolute inset-x-0 bottom-4 z-10 text-center text-xs font-medium text-gray-700">
            Swipe right or tap outside the receipt to close
          </p>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-xl font-semibold text-gray-900">Add Item</h3>
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Item name"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900"
              autoFocus
            />
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900"
                />
              </div>
              <div className="w-20">
                <label className="text-xs text-gray-500 mb-1 block">Qty</label>
                <input
                  type="number"
                  min="1"
                  value={newItemQty}
                  onChange={(e) => setNewItemQty(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowAddItemModal(false); setNewItemName(''); setNewItemPrice(''); setNewItemQty('1'); }}
                className="flex-1 py-3 border-2 border-gray-300 rounded-xl text-gray-600 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={addItem}
                className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Fee Modal */}
      {showAddFeeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-xl font-semibold text-gray-900">Add Fee</h3>
            <input
              type="text"
              value={newFeeName}
              onChange={(e) => setNewFeeName(e.target.value)}
              placeholder="Fee name (e.g., Service Fee)"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900"
              autoFocus
            />
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Amount</label>
              <input
                type="number"
                step="0.01"
                value={newFeeAmount}
                onChange={(e) => setNewFeeAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowAddFeeModal(false); setNewFeeName(''); setNewFeeAmount(''); }}
                className="flex-1 py-3 border-2 border-gray-300 rounded-xl text-gray-600 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={addFee}
                className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-medium"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
