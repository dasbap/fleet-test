import type { StorageAdapter } from "@/lib/storage/adapters/storage-adapter.interface";

const DB_NAME = "flotte-esamba-offline";
const DB_VERSION = 1;
const STORE_NAME = "kv";

function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDbAvailable()) {
      reject(new Error("IndexedDB non disponible dans cet environnement."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error ?? new Error("Erreur IndexedDB inconnue."));
    };
  });
}

export class IndexedDbStorageAdapter implements StorageAdapter {
  async getItem<T>(key: string): Promise<T | null> {
    try {
      const db = await openDb();
      return await new Promise<T | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(key);

        request.onsuccess = () => {
          const raw = request.result;
          if (typeof raw !== "string") {
            resolve(null);
            return;
          }
          try {
            resolve(JSON.parse(raw) as T);
          } catch {
            resolve(null);
          }
        };

        request.onerror = () => {
          reject(request.error ?? new Error("Erreur lecture IndexedDB."));
        };
      });
    } catch {
      return null;
    }
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const payload = JSON.stringify(value);
      const request = store.put(payload, key);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        reject(request.error ?? new Error("Erreur écriture IndexedDB."));
      };
    });
  }

  async removeItem(key: string): Promise<void> {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        reject(request.error ?? new Error("Erreur suppression IndexedDB."));
      };
    });
  }
}

