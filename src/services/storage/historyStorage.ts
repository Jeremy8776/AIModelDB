/**
 * Sync-history snapshots ("Pre-sync backup (28,000 models)" etc.).
 *
 * Each snapshot used to be one IndexedDB record holding the whole model list, and
 * the history screen loaded every snapshot, models included, at startup. With five
 * snapshots of ~28,000 models that is roughly 140,000 records deserialised at
 * every launch just to show five lines of text, and each new snapshot cloned the
 * full list in a single multi-hundred-millisecond main-thread task (plus a
 * JSON.stringify of it to compute the size).
 *
 * Layout now (separate database, so the models database is untouched):
 *   meta   one small record per snapshot (what the history list shows)
 *   chunks the models, split into CHUNK_SIZE pieces, keyed `${id}#${index}`
 *
 * Writes go chunk by chunk (the event loop breathes between them) and the meta
 * record is written last, so an interrupted save never appears in the list.
 * Snapshots from the old layout are moved over once, on first use.
 */
import type { Model } from '../../types';

const DB_NAME = 'aiModelDBHistory';
const DB_VERSION = 1;
const META_STORE = 'meta';
const CHUNK_STORE = 'chunks';
const CHUNK_SIZE = 1500;

const LEGACY_DB_NAME = 'aiModelDB';
const LEGACY_STORE = 'history';

export interface HistoryMeta {
    id: string;
    timestamp: number;
    dateStr: string;
    modelCount: number;
    description: string;
    sizeBytes: number;
}

interface ChunkRecord {
    key: string;
    id: string;
    models: Model[];
}

let dbPromise: Promise<IDBDatabase> | null = null;
let migrationPromise: Promise<void> | null = null;

function openDatabase(): Promise<IDBDatabase> {
    if (dbPromise) return dbPromise;
    const opening = new Promise<IDBDatabase>((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('IndexedDB is not available'));
            return;
        }
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE, { keyPath: 'id' });
            if (!db.objectStoreNames.contains(CHUNK_STORE)) db.createObjectStore(CHUNK_STORE, { keyPath: 'key' });
        };
        request.onsuccess = () => {
            // Let a delete or upgrade from another tab/module proceed instead of blocking on this connection.
            request.result.onversionchange = () => {
                request.result.close();
                dbPromise = null;
            };
            resolve(request.result);
        };
        request.onerror = () => reject(request.error);
    });
    opening.catch(() => { dbPromise = null; });
    dbPromise = opening;
    return opening;
}

const chunkKey = (id: string, index: number) => `${id}#${String(index).padStart(5, '0')}`;
const chunkRange = (id: string) => IDBKeyRange.bound(`${id}#`, `${id}#\uffff`);

function done(transaction: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
    });
}

/** Rough serialised size without stringifying the whole list: sample evenly and scale. */
export function estimateSizeBytes(models: Model[]): number {
    if (models.length === 0) return 0;
    const sampleSize = Math.min(models.length, 200);
    const step = models.length / sampleSize;
    const sample: Model[] = [];
    for (let i = 0; i < sampleSize; i++) sample.push(models[Math.floor(i * step)]);
    return Math.round((JSON.stringify(sample).length / sampleSize) * models.length);
}

export function buildMeta(models: Model[], description: string): HistoryMeta {
    const timestamp = Date.now();
    return {
        id: crypto.randomUUID(),
        timestamp,
        dateStr: new Date(timestamp).toLocaleString(),
        modelCount: models.length,
        description,
        sizeBytes: estimateSizeBytes(models),
    };
}

async function deleteChunks(db: IDBDatabase, id: string): Promise<void> {
    const transaction = db.transaction([CHUNK_STORE], 'readwrite');
    transaction.objectStore(CHUNK_STORE).delete(chunkRange(id));
    await done(transaction);
}

export async function saveSnapshot(meta: HistoryMeta, models: Model[]): Promise<void> {
    await migrateLegacyHistory();
    await saveSnapshotRaw(meta, models);
}

/** Snapshot list for the history screen, newest first. Never loads the models. */
export async function getSnapshots(): Promise<HistoryMeta[]> {
    await migrateLegacyHistory();
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const request = db.transaction([META_STORE], 'readonly').objectStore(META_STORE).getAll();
        request.onsuccess = () => resolve((request.result as HistoryMeta[]).sort((a, b) => b.timestamp - a.timestamp));
        request.onerror = () => reject(request.error);
    });
}

/** The models of one snapshot, or null when it does not exist. */
export async function getSnapshotModels(id: string): Promise<Model[] | null> {
    await migrateLegacyHistory();
    const db = await openDatabase();
    const hasMeta = await new Promise<boolean>((resolve, reject) => {
        const request = db.transaction([META_STORE], 'readonly').objectStore(META_STORE).count(id);
        request.onsuccess = () => resolve(request.result > 0);
        request.onerror = () => reject(request.error);
    });
    if (!hasMeta) return null;
    return new Promise((resolve, reject) => {
        const request = db.transaction([CHUNK_STORE], 'readonly').objectStore(CHUNK_STORE).getAll(chunkRange(id));
        request.onsuccess = () => resolve((request.result as ChunkRecord[]).flatMap(chunk => chunk.models));
        request.onerror = () => reject(request.error);
    });
}

export async function deleteSnapshot(id: string): Promise<void> {
    await migrateLegacyHistory();
    const db = await openDatabase();
    const transaction = db.transaction([META_STORE, CHUNK_STORE], 'readwrite');
    transaction.objectStore(META_STORE).delete(id);
    transaction.objectStore(CHUNK_STORE).delete(chunkRange(id));
    await done(transaction);
}

export async function clearSnapshots(): Promise<void> {
    await migrateLegacyHistory();
    const db = await openDatabase();
    const transaction = db.transaction([META_STORE, CHUNK_STORE], 'readwrite');
    transaction.objectStore(META_STORE).clear();
    transaction.objectStore(CHUNK_STORE).clear();
    await done(transaction);
}

/** Used by "Delete all local data" so the snapshots go with the models, as before. */
export async function deleteHistoryDatabase(): Promise<void> {
    if (dbPromise) {
        (await dbPromise.catch(() => null))?.close();
        dbPromise = null;
    }
    migrationPromise = null;
    await new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase(DB_NAME);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        request.onblocked = () => resolve();
    });
}

/**
 * Move snapshots saved in the old layout (one record per snapshot inside the
 * models database) into this one. Runs once; entries are moved one at a time so at
 * most one old snapshot is in memory.
 */
export function migrateLegacyHistory(): Promise<void> {
    if (migrationPromise) return migrationPromise;
    migrationPromise = (async () => {
        if (typeof indexedDB === 'undefined' || typeof indexedDB.databases !== 'function') return;
        const existing = await indexedDB.databases();
        if (!existing.some(info => info.name === LEGACY_DB_NAME)) return; // never open it just to find nothing

        const legacy = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open(LEGACY_DB_NAME);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        try {
            if (!legacy.objectStoreNames.contains(LEGACY_STORE)) return;
            const ids = await new Promise<string[]>((resolve, reject) => {
                const request = legacy.transaction([LEGACY_STORE], 'readonly').objectStore(LEGACY_STORE).getAllKeys();
                request.onsuccess = () => resolve(request.result.map(String));
                request.onerror = () => reject(request.error);
            });
            for (const id of ids) {
                const entry = await new Promise<(HistoryMeta & { models?: Model[] }) | undefined>((resolve, reject) => {
                    const request = legacy.transaction([LEGACY_STORE], 'readonly').objectStore(LEGACY_STORE).get(id);
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                });
                if (entry && Array.isArray(entry.models)) {
                    const { models, ...meta } = entry;
                    await saveSnapshotRaw(meta, models);
                }
                const removal = legacy.transaction([LEGACY_STORE], 'readwrite');
                removal.objectStore(LEGACY_STORE).delete(id);
                await done(removal);
            }
        } finally {
            legacy.close();
        }
    })().catch(error => {
        console.warn('[History] Could not migrate old snapshots:', error);
    });
    return migrationPromise;
}

/** Chunked write, meta last. Also used by the migration, which must not wait on itself. */
async function saveSnapshotRaw(meta: HistoryMeta, models: Model[]): Promise<void> {
    const db = await openDatabase();
    try {
        for (let start = 0, index = 0; start < models.length; start += CHUNK_SIZE, index++) {
            const transaction = db.transaction([CHUNK_STORE], 'readwrite');
            const record: ChunkRecord = { key: chunkKey(meta.id, index), id: meta.id, models: models.slice(start, start + CHUNK_SIZE) };
            transaction.objectStore(CHUNK_STORE).put(record);
            await done(transaction);
        }
        const transaction = db.transaction([META_STORE], 'readwrite');
        transaction.objectStore(META_STORE).put(meta);
        await done(transaction);
    } catch (error) {
        await deleteChunks(db, meta.id).catch(() => { /* best effort */ });
        throw error;
    }
}
