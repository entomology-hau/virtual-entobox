import { CollectionData } from "../types";
import { normaliseCollection } from "./collection";
let database: Promise<IDBDatabase> | undefined;
function db() {
  if (!database)
    database = new Promise((resolve, reject) => {
      const req = indexedDB.open("virtual-entobox-v3", 1);
      req.onupgradeneeded = () =>
        req.result.createObjectStore("collections", {
          keyPath: "collectionId",
        });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        database = undefined;
        reject(
          new Error(
            "Browser storage is unavailable. You can still work and export a backup.",
          ),
        );
      };
    });
  return database;
}
export async function loadCollections(): Promise<CollectionData[]> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction("collections", "readonly");
    const req = tx.objectStore("collections").getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
export async function saveCollection(c: CollectionData) {
  const d = await db();
  return new Promise<void>((resolve, reject) => {
    const tx = d.transaction("collections", "readwrite");
    tx.objectStore("collections").put(c);
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error);
    tx.onerror = () => reject(tx.error);
  });
}
export function legacyCollections(): {
  collections: CollectionData[];
  failed: number;
} {
  const collections: CollectionData[] = [];
  let failed = 0;
  try {
    for (let n = 0; n < localStorage.length; n++) {
      const key = localStorage.key(n);
      if (!key?.startsWith("collection_")) continue;
      try {
        const c = normaliseCollection(
          JSON.parse(localStorage.getItem(key) || ""),
        );
        c.collectionId = `legacy-${key}`;
        collections.push(c);
      } catch {
        failed++;
      }
    }
  } catch {
    failed++;
  }
  return { collections, failed };
}
export function preference(key: string, value?: string): string | null {
  try {
    if (value !== undefined) localStorage.setItem(`entobox:${key}`, value);
    return localStorage.getItem(`entobox:${key}`);
  } catch {
    return null;
  }
}
