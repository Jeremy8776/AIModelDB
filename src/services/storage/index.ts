/**
 * Storage Module
 * 
 * Provides a unified interface for persistent storage with IndexedDB as primary
 * and localStorage as fallback.
 */

export {
    isIndexedDBAvailable,
    saveModels,
    loadModels,
    upsertModel,
    deleteModel,
    clearModels,
    getModelCount,
    saveMetadata,
    loadMetadata,
    clearMetadata,
    migrateFromLocalStorage,
    deleteDatabase
} from './indexedDBStorage';
