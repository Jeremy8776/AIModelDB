import { useState, useEffect, useRef, useCallback } from 'react';
import { Model, ApiDir } from '../types';
import { useSettings } from '../context/SettingsContext';
import { DEFAULT_API_DIR } from '../services/api';
import {
    isIndexedDBAvailable,
    saveModels as saveModelsToIDB,
    loadModels as loadModelsFromIDB,
    clearModels as clearModelsFromIDB,
    saveMetadata,
    loadMetadata,
    deleteDatabase,
    migrateFromLocalStorage
} from '../services/storage';

// Storage threshold - use IndexedDB if more than 500 models (to stay well under localStorage limits)
const INDEXEDDB_THRESHOLD = 500;

/**
 * Hook for persisting models to IndexedDB (primary) with localStorage fallback
 * Handles migration from localStorage for existing users
 */
export function useModelPersistence() {
    const { settings } = useSettings();
    const [models, setModels] = useState<Model[]>([]);
    const [lastSync, setLastSync] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState<{ current: number; total: number } | null>(null);
    const [apiConfig, setApiConfig] = useState<ApiDir>(DEFAULT_API_DIR);
    const [storageType, setStorageType] = useState<'indexeddb' | 'localstorage'>('indexeddb');

    const initialized = useRef(false);
    const pendingSave = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Synchronize internal apiConfig with SettingsContext
    useEffect(() => {
        try {
            if (settings?.apiConfig) {
                setApiConfig(settings.apiConfig);
            }
        } catch { }
    }, [settings?.apiConfig]);

    // Load API config from localStorage
    useEffect(() => {
        try {
            const savedConfig = localStorage.getItem('aiModelDB_apiConfig');
            if (savedConfig) {
                setApiConfig(JSON.parse(savedConfig));
            }
        } catch (error) {
            console.error('Error loading API config from localStorage:', error);
        }
    }, []);

    // Sanitize pricing data for consistency
    const sanitizePricing = useCallback((modelsIn: Model[]): Model[] => {
        return modelsIn.map((m) => {
            if (!m.pricing || !Array.isArray(m.pricing)) return m;
            const sanitized = m.pricing.map((p: any) => {
                const unit = (p.unit || '').toLowerCase();
                const isApiUnit = unit.includes('token') || unit.includes('request') || unit.includes('call');
                // If API-like unit and flat present, drop flat (avoid mislabel as subscription)
                const flat = (isApiUnit ? null : (isFinite(Number(p.flat)) ? Number(p.flat) : null));
                const input = isFinite(Number(p.input)) ? Number(p.input) : null;
                const output = isFinite(Number(p.output)) ? Number(p.output) : null;
                const currency = (p.currency && typeof p.currency === 'string') ? p.currency : 'USD';
                return { ...p, unit: p.unit || (flat != null ? 'month' : p.unit), flat, input, output, currency };
            });
            return { ...m, pricing: sanitized };
        });
    }, []);

    // Load from localStorage (fallback)
    const loadFromLocalStorage = useCallback(async (): Promise<{ models: Model[]; lastSync: string | null }> => {
        const savedModels = localStorage.getItem('aiModelDB_models');
        const lastSyncTime = localStorage.getItem('aiModelDB_lastSync');

        if (!savedModels) {
            return { models: [], lastSync: lastSyncTime };
        }

        const parsed: Model[] = JSON.parse(savedModels);
        return { models: sanitizePricing(parsed), lastSync: lastSyncTime };
    }, [sanitizePricing]);

    // Load from IndexedDB (primary)
    const loadFromIndexedDB = useCallback(async (): Promise<{ models: Model[]; lastSync: string | null }> => {
        const loadedModels = await loadModelsFromIDB();
        const lastSyncTime = await loadMetadata('lastSync');
        return { models: sanitizePricing(loadedModels), lastSync: lastSyncTime };
    }, [sanitizePricing]);

    // Load models on initial mount
    useEffect(() => {
        if (initialized.current) return;

        const loadModels = async () => {
            try {
                setLoadingProgress({ current: 0, total: 100 });

                // Check if IndexedDB is available
                const idbAvailable = await isIndexedDBAvailable();

                if (idbAvailable) {
                    setStorageType('indexeddb');

                    // Try to migrate from localStorage if needed
                    const migration = await migrateFromLocalStorage();
                    if (migration.success && migration.modelCount > 0) {
                        console.log(`[Persistence] Migrated ${migration.modelCount} models from localStorage to IndexedDB`);
                    }

                    setLoadingProgress({ current: 50, total: 100 });

                    // Load from IndexedDB
                    const { models: loadedModels, lastSync: loadedSync } = await loadFromIndexedDB();

                    if (loadedModels.length > 0) {
                        setModels(loadedModels);
                        setLastSync(loadedSync);
                        console.log(`[Persistence] Loaded ${loadedModels.length} models from IndexedDB`);
                    } else {
                        // Fallback: try localStorage in case IndexedDB is empty
                        const { models: lsModels, lastSync: lsSync } = await loadFromLocalStorage();
                        if (lsModels.length > 0) {
                            setModels(lsModels);
                            setLastSync(lsSync);
                            // Save to IndexedDB for next time
                            await saveModelsToIDB(lsModels);
                            console.log(`[Persistence] Loaded ${lsModels.length} models from localStorage, migrated to IndexedDB`);
                        }
                    }
                } else {
                    // Fall back to localStorage
                    setStorageType('localstorage');
                    console.warn('[Persistence] IndexedDB not available, using localStorage');

                    const { models: loadedModels, lastSync: loadedSync } = await loadFromLocalStorage();
                    setModels(loadedModels);
                    setLastSync(loadedSync);
                }

                setLoadingProgress({ current: 100, total: 100 });
                initialized.current = true;
                setIsLoading(false);
                setLoadingProgress(null);
            } catch (error) {
                console.error('Error loading models:', error);
                // Last resort fallback to localStorage
                try {
                    const { models: lsModels, lastSync: lsSync } = await loadFromLocalStorage();
                    setModels(lsModels);
                    setLastSync(lsSync);
                    setStorageType('localstorage');
                } catch {
                    setModels([]);
                }
                initialized.current = true;
                setIsLoading(false);
                setLoadingProgress(null);
            }
        };

        loadModels();
    }, [loadFromIndexedDB, loadFromLocalStorage]);

    // Save models whenever they change (debounced)
    useEffect(() => {
        if (!initialized.current) return;

        // Clear any pending save
        if (pendingSave.current) {
            clearTimeout(pendingSave.current);
        }

        // Debounce saves to avoid excessive writes
        pendingSave.current = setTimeout(async () => {
            try {
                if (storageType === 'indexeddb') {
                    await saveModelsToIDB(models);
                    console.log(`[Persistence] Saved ${models.length} models to IndexedDB`);
                } else {
                    // Fall back to localStorage (will fail if data is too large)
                    try {
                        localStorage.setItem('aiModelDB_models', JSON.stringify(models));
                    } catch (quotaError) {
                        console.error('[Persistence] localStorage quota exceeded, attempting IndexedDB migration');
                        // Try to upgrade to IndexedDB
                        const idbAvailable = await isIndexedDBAvailable();
                        if (idbAvailable) {
                            await saveModelsToIDB(models);
                            setStorageType('indexeddb');
                            console.log('[Persistence] Migrated to IndexedDB after localStorage quota exceeded');
                        } else {
                            throw quotaError;
                        }
                    }
                }
            } catch (error) {
                console.error('Error saving models:', error);
            }
        }, 500);

        return () => {
            if (pendingSave.current) {
                clearTimeout(pendingSave.current);
            }
        };
    }, [models, storageType]);

    // Save lastSync when it changes
    useEffect(() => {
        if (!initialized.current || !lastSync) return;

        const saveLastSync = async () => {
            try {
                if (storageType === 'indexeddb') {
                    await saveMetadata('lastSync', lastSync);
                }
                // Always save to localStorage as backup for quick access
                localStorage.setItem('aiModelDB_lastSync', lastSync);
            } catch (error) {
                console.error('Error saving lastSync:', error);
            }
        };

        saveLastSync();
    }, [lastSync, storageType]);

    const clearAllModels = useCallback(async () => {
        try {
            if (storageType === 'indexeddb') {
                await clearModelsFromIDB();
            }
            localStorage.removeItem('aiModelDB_models');
            setModels([]);
        } catch (error) {
            console.error('Error clearing models:', error);
        }
    }, [storageType]);

    const resetToDefault = useCallback(async () => {
        try {
            if (storageType === 'indexeddb') {
                await clearModelsFromIDB();
            }
            localStorage.removeItem('aiModelDB_models');
            localStorage.removeItem('aiModelDB_lastSync');
            localStorage.removeItem('aiModelDB_apiConfig');
            setModels([]);
            setLastSync(null);
            setApiConfig(DEFAULT_API_DIR);
        } catch (error) {
            console.error('Error resetting to default:', error);
        }
    }, [storageType]);

    const hardResetDatabase = useCallback(async () => {
        try {
            // Clear IndexedDB
            await deleteDatabase();
        } catch { }

        try {
            // Clear localStorage (except settings)
            const toRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i) as string;
                // Wipe everything EXCEPT settings (to preserve keys/config)
                if (k && k.startsWith('aiModelDB_') && k !== 'aiModelDB_settings') {
                    toRemove.push(k);
                }
            }
            toRemove.forEach(k => localStorage.removeItem(k));
        } catch { }

        try {
            // Clear caches
            if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map(k => caches.delete(k)));
            }
        } catch { }

        setModels([]);
        setLastSync(null);
        setApiConfig(DEFAULT_API_DIR);
    }, []);

    // Expose hard reset via custom event (cleaner than global window mutation)
    useEffect(() => {
        const onHardReset = async () => {
            await hardResetDatabase();
        };
        window.addEventListener('hard-reset', onHardReset as EventListener);
        return () => {
            window.removeEventListener('hard-reset', onHardReset as EventListener);
        };
    }, [hardResetDatabase]);

    return {
        models,
        setModels,
        lastSync,
        setLastSync,
        isLoading,
        loadingProgress,
        apiConfig,
        setApiConfig,
        clearAllModels,
        resetToDefault,
        hardResetDatabase,
        storageType // Expose for debugging/UI display
    };
}
