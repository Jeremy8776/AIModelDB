/**
 * IndexedDB Storage Service
 * 
 * Provides persistent storage for large model datasets that exceed localStorage limits.
 * Falls back to localStorage for smaller datasets or if IndexedDB is unavailable.
 * 
 * Benefits over localStorage:
 * - No practical size limit (localStorage caps at ~5-10MB)
 * - Non-blocking async operations
 * - Structured data with indexing support
 * - Transaction support for data integrity
 */

import { Model } from '../../types';
import { loggers } from '../../utils/logger';

const logger = loggers.storage;

const DB_NAME = 'aiModelDB';
const DB_VERSION = 1;
const MODELS_STORE = 'models';
const METADATA_STORE = 'metadata';

interface StorageMetadata {
    key: string;
    value: string;
    updatedAt: string;
}

let dbInstance: IDBDatabase | null = null;

/**
 * Opens or creates the IndexedDB database
 */
async function openDatabase(): Promise<IDBDatabase> {
    if (dbInstance && dbInstance.name === DB_NAME) {
        return dbInstance;
    }

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            logger.error('Failed to open database:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            dbInstance = request.result;
            logger.debug('Database opened successfully');
            resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            logger.debug('Upgrading database schema...');

            // Create models store with ID as key
            if (!db.objectStoreNames.contains(MODELS_STORE)) {
                const modelsStore = db.createObjectStore(MODELS_STORE, { keyPath: 'id' });
                // Add indexes for common queries
                modelsStore.createIndex('name', 'name', { unique: false });
                modelsStore.createIndex('provider', 'provider', { unique: false });
                modelsStore.createIndex('source', 'source', { unique: false });
                modelsStore.createIndex('domain', 'domain', { unique: false });
                modelsStore.createIndex('updated_at', 'updated_at', { unique: false });
                logger.debug('Models store created with indexes');
            }

            // Create metadata store for sync timestamps, etc.
            if (!db.objectStoreNames.contains(METADATA_STORE)) {
                db.createObjectStore(METADATA_STORE, { keyPath: 'key' });
                logger.debug('Metadata store created');
            }
        };
    });
}

/**
 * Check if IndexedDB is available and working
 */
export async function isIndexedDBAvailable(): Promise<boolean> {
    if (typeof indexedDB === 'undefined') {
        return false;
    }

    try {
        await openDatabase();
        return true;
    } catch {
        return false;
    }
}

/**
 * Save all models to IndexedDB
 * Uses a transaction to ensure atomicity
 */
export async function saveModels(models: Model[]): Promise<void> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([MODELS_STORE], 'readwrite');
        const store = transaction.objectStore(MODELS_STORE);

        transaction.onerror = () => {
            logger.error('Transaction error:', transaction.error);
            reject(transaction.error);
        };

        transaction.oncomplete = () => {
            logger.debug(`Saved ${models.length} models successfully`);
            resolve();
        };

        // Clear existing data and add all models
        const clearRequest = store.clear();

        clearRequest.onsuccess = () => {
            // Add all models in the same transaction
            for (const model of models) {
                try {
                    store.add(model);
                } catch (err) {
                    logger.warn('Failed to add model:', model.id, err);
                }
            }
        };
    });
}

/**
 * Load all models from IndexedDB
 */
export async function loadModels(): Promise<Model[]> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([MODELS_STORE], 'readonly');
        const store = transaction.objectStore(MODELS_STORE);
        const request = store.getAll();

        request.onerror = () => {
            logger.error('Failed to load models:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            const models = request.result as Model[];
            logger.debug(`Loaded ${models.length} models`);
            resolve(models);
        };
    });
}

/**
 * Add or update a single model
 */
export async function upsertModel(model: Model): Promise<void> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([MODELS_STORE], 'readwrite');
        const store = transaction.objectStore(MODELS_STORE);
        const request = store.put(model);

        request.onerror = () => {
            reject(request.error);
        };

        request.onsuccess = () => {
            resolve();
        };
    });
}

/**
 * Delete a model by ID
 */
export async function deleteModel(id: string): Promise<void> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([MODELS_STORE], 'readwrite');
        const store = transaction.objectStore(MODELS_STORE);
        const request = store.delete(id);

        request.onerror = () => {
            reject(request.error);
        };

        request.onsuccess = () => {
            resolve();
        };
    });
}

/**
 * Clear all models from the database
 */
export async function clearModels(): Promise<void> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([MODELS_STORE], 'readwrite');
        const store = transaction.objectStore(MODELS_STORE);
        const request = store.clear();

        request.onerror = () => {
            reject(request.error);
        };

        request.onsuccess = () => {
            logger.debug('All models cleared');
            resolve();
        };
    });
}

/**
 * Get model count without loading all data
 */
export async function getModelCount(): Promise<number> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([MODELS_STORE], 'readonly');
        const store = transaction.objectStore(MODELS_STORE);
        const request = store.count();

        request.onerror = () => {
            reject(request.error);
        };

        request.onsuccess = () => {
            resolve(request.result);
        };
    });
}

/**
 * Save metadata (like last sync time)
 */
export async function saveMetadata(key: string, value: string): Promise<void> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([METADATA_STORE], 'readwrite');
        const store = transaction.objectStore(METADATA_STORE);
        const metadata: StorageMetadata = {
            key,
            value,
            updatedAt: new Date().toISOString()
        };
        const request = store.put(metadata);

        request.onerror = () => {
            reject(request.error);
        };

        request.onsuccess = () => {
            resolve();
        };
    });
}

/**
 * Load metadata by key
 */
export async function loadMetadata(key: string): Promise<string | null> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([METADATA_STORE], 'readonly');
        const store = transaction.objectStore(METADATA_STORE);
        const request = store.get(key);

        request.onerror = () => {
            reject(request.error);
        };

        request.onsuccess = () => {
            const result = request.result as StorageMetadata | undefined;
            resolve(result?.value ?? null);
        };
    });
}

/**
 * Clear all metadata
 */
export async function clearMetadata(): Promise<void> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([METADATA_STORE], 'readwrite');
        const store = transaction.objectStore(METADATA_STORE);
        const request = store.clear();

        request.onerror = () => {
            reject(request.error);
        };

        request.onsuccess = () => {
            resolve();
        };
    });
}

/**
 * Migrate data from localStorage to IndexedDB
 * This is a one-time operation for existing users
 */
export async function migrateFromLocalStorage(): Promise<{ success: boolean; modelCount: number }> {
    try {
        // Check if we already have data in IndexedDB
        const existingCount = await getModelCount();
        if (existingCount > 0) {
            logger.debug('Database already has data, skipping migration');
            return { success: true, modelCount: existingCount };
        }

        // Load from localStorage
        const savedModels = localStorage.getItem('aiModelDB_models');
        if (!savedModels) {
            logger.debug('No localStorage data to migrate');
            return { success: true, modelCount: 0 };
        }

        const models: Model[] = JSON.parse(savedModels);
        logger.info(`Migrating ${models.length} models from localStorage...`);

        // Save to IndexedDB
        await saveModels(models);

        // Migrate metadata
        const lastSync = localStorage.getItem('aiModelDB_lastSync');
        if (lastSync) {
            await saveMetadata('lastSync', lastSync);
        }

        // Don't remove from localStorage yet - keep as backup
        // localStorage.removeItem('aiModelDB_models');

        logger.info('Migration complete');
        return { success: true, modelCount: models.length };
    } catch (error) {
        logger.error('Migration failed:', error);
        return { success: false, modelCount: 0 };
    }
}

/**
 * Delete the entire database (for hard reset)
 */
export async function deleteDatabase(): Promise<void> {
    // Close existing connection
    if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
    }

    return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(DB_NAME);

        request.onerror = () => {
            logger.error('Failed to delete database:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            logger.info('Database deleted successfully');
            resolve();
        };
    });
}
