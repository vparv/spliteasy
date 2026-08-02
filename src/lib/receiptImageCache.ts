const DATABASE_NAME = 'splitter-receipt-images';
const DATABASE_VERSION = 1;
const STORE_NAME = 'receipts';

interface CachedReceiptImages {
  receiptId: string;
  images: Blob[];
  cachedAt: number;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'receiptId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveReceiptImages(receiptId: string, images: Blob[]): Promise<void> {
  if (typeof indexedDB === 'undefined' || images.length === 0) return;

  const database = await openDatabase();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put({
      receiptId,
      images,
      cachedAt: Date.now(),
    } satisfies CachedReceiptImages);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });

  database.close();
}

export async function getReceiptImages(receiptId: string): Promise<Blob[]> {
  if (typeof indexedDB === 'undefined') return [];

  const database = await openDatabase();

  const cachedReceipt = await new Promise<CachedReceiptImages | undefined>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(receiptId);

    request.onsuccess = () => resolve(request.result as CachedReceiptImages | undefined);
    request.onerror = () => reject(request.error);
  });

  database.close();
  return cachedReceipt?.images ?? [];
}
