import type { Art } from "../types.ts";

const dbName = "unicode-art-maker-cache";
const storeName = "art";
export const memoryColumns = 256;

let dbPromise: Promise<IDBDatabase> | null = null;

const db = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.addEventListener("upgradeneeded", () => {
      const value = request.result;
      if (!value.objectStoreNames.contains(storeName)) value.createObjectStore(storeName);
    });
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(request.error ?? new Error("Could not open the Unicode art cache.")), { once: true });
  });
  return dbPromise;
};

const done = (transaction: IDBTransaction): Promise<void> => new Promise((resolve, reject) => {
  transaction.addEventListener("complete", () => resolve(), { once: true });
  transaction.addEventListener("abort", () => reject(transaction.error ?? new Error("Unicode art cache transaction aborted.")), { once: true });
  transaction.addEventListener("error", () => reject(transaction.error ?? new Error("Unicode art cache transaction failed.")), { once: true });
});

export const storeArt = async (key: string, art: Art): Promise<void> => {
  const value = await db();
  const transaction = value.transaction(storeName, "readwrite");
  transaction.objectStore(storeName).put(art, key);
  await done(transaction);
};

export const loadArt = async (key: string): Promise<Art> => {
  const value = await db();
  const transaction = value.transaction(storeName, "readonly");
  const request = transaction.objectStore(storeName).get(key);
  const art = await new Promise<Art | undefined>((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result as Art | undefined), { once: true });
    request.addEventListener("error", () => reject(request.error ?? new Error("Could not read cached Unicode art.")), { once: true });
  });
  await done(transaction);
  if (!art) throw new Error("Cached Unicode art is unavailable.");
  return art;
};

export const removeArt = async (key: string): Promise<void> => {
  const value = await db();
  const transaction = value.transaction(storeName, "readwrite");
  transaction.objectStore(storeName).delete(key);
  await done(transaction);
};
