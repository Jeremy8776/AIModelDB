import { useState, useEffect, useRef } from 'react';
import { Model, ApiDir } from '../types';
import { useSettings } from '../context/SettingsContext';
import { DEFAULT_API_DIR } from '../services/api';

export function useModelPersistence() {
    const { settings } = useSettings();
    const [models, setModels] = useState<Model[]>([]);
    const [lastSync, setLastSync] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState<{ current: number; total: number } | null>(null);
    const [apiConfig, setApiConfig] = useState<ApiDir>(DEFAULT_API_DIR);

    const initialized = useRef(false);

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
            const savedConfig = localStorage.getItem('aiModelDBPro_apiConfig');
            if (savedConfig) {
                setApiConfig(JSON.parse(savedConfig));
            }
        } catch (error) {
            console.error('Error loading API config from localStorage:', error);
        }
    }, []);

    // Load models from localStorage on initial mount
    useEffect(() => {
        if (initialized.current) return;

        const sanitizePricing = (modelsIn: Model[]): Model[] => {
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
        };

        const loadModels = async () => {
            try {
                const savedModels = localStorage.getItem('aiModelDBPro_models');
                if (savedModels) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                    const parsed: Model[] = JSON.parse(savedModels);

                    const chunkSize = 1000;
                    if (parsed.length > chunkSize) {
                        setLoadingProgress({ current: 0, total: parsed.length });

                        const chunks = [];
                        for (let i = 0; i < parsed.length; i += chunkSize) {
                            chunks.push(parsed.slice(i, i + chunkSize));
                        }

                        let processedModels: Model[] = [];
                        for (let i = 0; i < chunks.length; i++) {
                            await new Promise(resolve => setTimeout(resolve, 0));
                            processedModels = processedModels.concat(sanitizePricing(chunks[i]));
                            setLoadingProgress({ current: Math.min((i + 1) * chunkSize, parsed.length), total: parsed.length });
                        }
                        setModels(processedModels);
                        setLoadingProgress(null);
                    } else {
                        setModels(sanitizePricing(parsed));
                    }
                } else {
                    setModels([]);
                }

                const lastSyncTime = localStorage.getItem('aiModelDBPro_lastSync');
                if (lastSyncTime) {
                    setLastSync(lastSyncTime);
                }

                initialized.current = true;
                setIsLoading(false);
            } catch (error) {
                console.error('Error loading models from localStorage:', error);
                setModels([]);
                initialized.current = true;
                setIsLoading(false);
                setLoadingProgress(null);
            }
        };

        loadModels();
    }, []);

    // Save models to localStorage whenever they change
    useEffect(() => {
        if (!initialized.current) return;

        const timeoutId = setTimeout(() => {
            try {
                localStorage.setItem('aiModelDBPro_models', JSON.stringify(models));
            } catch (error) {
                console.error('Error saving models to localStorage:', error);
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [models]);

    const clearAllModels = () => {
        localStorage.removeItem('aiModelDBPro_models');
        setModels([]);
    };

    const resetToDefault = () => {
        localStorage.removeItem('aiModelDBPro_models');
        localStorage.removeItem('aiModelDBPro_lastSync');
        localStorage.removeItem('aiModelDBPro_apiConfig');
        setModels([]);
        setLastSync(null);
        setApiConfig(DEFAULT_API_DIR);
    };

    const hardResetDatabase = async () => {
        try {
            const toRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i) as string;
                if (k && k.startsWith('aiModelDBPro_')) toRemove.push(k);
            }
            toRemove.forEach(k => localStorage.removeItem(k));
        } catch { }
        try {
            if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map(k => caches.delete(k)));
            }
        } catch { }
        try {
            const anyIdx: any = indexedDB as any;
            if (anyIdx && typeof anyIdx.databases === 'function') {
                const dbs = await anyIdx.databases();
                await Promise.all((dbs || []).map((d: any) => d?.name ? indexedDB.deleteDatabase(d.name) : Promise.resolve()));
            }
        } catch { }

        setModels([]);
        setLastSync(null);
        setApiConfig(DEFAULT_API_DIR);
    };

    // Expose a global hard reset function and event listener
    useEffect(() => {
        (window as any).__hardReset = async () => {
            await hardResetDatabase();
        };
        const onHardReset = async () => {
            await hardResetDatabase();
        };
        window.addEventListener('hard-reset', onHardReset as EventListener);
        return () => {
            delete (window as any).__hardReset;
            window.removeEventListener('hard-reset', onHardReset as EventListener);
        };
    }, []);

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
        hardResetDatabase
    };
}
