import type { SupportedStorage } from '@supabase/supabase-js';

let database: Promise<IDBDatabase> | undefined;

function openDatabase() {
  database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('attendance-portal-auth', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('sessions');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close other portal tabs and try again.'));
  }).catch((error) => {
    database = undefined;
    throw error;
  });
  return database;
}

async function withStore<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('sessions', mode);
    const request = operation(transaction.objectStore('sessions'));
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error ?? new Error('Session storage transaction canceled.'));
  });
}

export const authSessionStorage: SupportedStorage = {
  getItem: async (key) => (await withStore<string | undefined>('readonly', (store) => store.get(key))) ?? null,
  setItem: async (key, value) => { await withStore('readwrite', (store) => store.put(value, key)); },
  removeItem: async (key) => { await withStore('readwrite', (store) => store.delete(key)); },
};
