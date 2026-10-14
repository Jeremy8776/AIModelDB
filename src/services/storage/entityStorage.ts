/**
 * IndexedDB storage for the MCP servers and Skills lists.
 *
 * These lists used to live in localStorage as one JSON string each. localStorage
 * holds about 5 MB per origin, and a full crawl of the MCP registry alone is
 * larger than that, so saves started failing (silently) and the list vanished at
 * the next launch. IndexedDB has no such practical limit and stores each list
 * as one structured-cloned record without blocking on a giant JSON.stringify.
 *
 * Kept as a separate small database so the models database schema is untouched.
 */

const DB_NAME = 'aiModelDBEntities';
const DB_VERSION = 1;
const STORE = 'lists';

interface ListRecord {
    key: string;
    value: unknown[];
    savedAt: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
    if (dbPromise) return dbPromise;
    const opening = new Promise<IDBDatabase>((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('IndexedDB is not available'));
            return;
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains(STORE)) {
                request.result.createObjectStore(STORE, { keyPath: 'key' });
            }
        };
        request.onsuccess = () => {
            // Let a delete or upgrade from another tab proceed instead of blocking on this connection.
            request.result.onversionchange = () => {
                request.result.close();
                dbPromise = null;
            };
            resolve(request.result);
        };
        request.onerror = () => reject(request.error);
    });
    // On failure, forget the attempt so a later call can retry.
    opening.catch(() => { dbPromise = null; });
    dbPromise = opening;
    return opening;
}

/** Returns the saved list, or null when nothing has been saved under this key. */
export async function loadEntityList(key: string): Promise<unknown[] | null> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const request = db.transaction([STORE], 'readonly').objectStore(STORE).get(key);
        request.onsuccess = () => {
            const record = request.result as ListRecord | undefined;
            resolve(record && Array.isArray(record.value) ? record.value : null);
        };
        request.onerror = () => reject(request.error);
    });
}

export async function saveEntityList(key: string, value: unknown[]): Promise<void> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE], 'readwrite');
        transaction.objectStore(STORE).put({ key, value, savedAt: new Date().toISOString() } satisfies ListRecord);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
    });
}

export async function clearEntityList(key: string): Promise<void> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE], 'readwrite');
        transaction.objectStore(STORE).delete(key);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}
