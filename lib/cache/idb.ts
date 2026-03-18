import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'pref-puzzle-cache';
const DB_VERSION = 1;
const STORE_DEM = 'dem-tiles';
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_DEM)) {
          db.createObjectStore(STORE_DEM);
        }
      },
    });
  }
  return dbPromise;
}

export async function getDemTile(key: string): Promise<Float32Array | null> {
  try {
    const db = await getDb();
    const entry = await db.get(STORE_DEM, key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > TTL_MS) {
      await db.delete(STORE_DEM, key);
      return null;
    }
    return new Float32Array(entry.data);
  } catch { return null; }
}

export async function setDemTile(key: string, data: Float32Array): Promise<void> {
  try {
    const db = await getDb();
    await db.put(STORE_DEM, { data: data.buffer.slice(0) as ArrayBuffer, cachedAt: Date.now() }, key);
  } catch { /* ignore */ }
}
