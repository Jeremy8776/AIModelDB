import { useState, useEffect, useRef, useCallback } from 'react';
import { Model } from '../types';
import { useSettings } from '../context/SettingsContext';
import { mapDomain, cleanModelDescription } from '../utils/format';
import { toNormalizedModel } from '../utils/importNormalization';

export function useModelMerge(
    models: Model[],
    setModels: React.Dispatch<React.SetStateAction<Model[]>>
) {
    const { settings } = useSettings();
    const [lastMergeStats, setLastMergeStats] = useState<{ added: number; updated: number; duplicates?: number } | null>(null);
    const workerRef = useRef<Worker | null>(null);

    useEffect(() => {
        try {
            // Initialize the worker
            workerRef.current = new Worker(new URL('../workers/modelProcessor.worker.ts', import.meta.url), { type: 'module' });

            // Set up listener for worker responses
            workerRef.current.onmessage = (event) => {
                const { type, payload, error } = event.data;
                if (type === 'MERGE_COMPLETE') {
                    const { models: newModels, added, updated, duplicates } = payload;
                    setModels(newModels);
                    setLastMergeStats({ added, updated, duplicates });
                } else if (type === 'ERROR') {
                    console.error('Worker error:', error);
                }
            };

            return () => {
                workerRef.current?.terminate();
                workerRef.current = null;
            };
        } catch (error) {
            console.error("Failed to initialize model processor worker:", error);
        }
    }, [setModels]);

    const modelsRef = useRef(models);
    useEffect(() => {
        modelsRef.current = models;
    }, [models]);

    const mergeInModels = useCallback((incomingList: Model[]) => {
        if (!incomingList || incomingList.length === 0) return;

        if (workerRef.current) {
            workerRef.current.postMessage({
                type: 'MERGE_MODELS',
                payload: {
                    currentModels: modelsRef.current,
                    newModels: incomingList,
                    autoMergeDuplicates: settings.autoMergeDuplicates ?? false
                }
            });
        } else {
            console.warn('Worker not ready, falling back to main thread (or skipping)');
        }
    }, [settings.autoMergeDuplicates]);

    // ...

    const importModels = useCallback((newModels: Model[]) => {
        const normalized: Model[] = (newModels || []).map((m: any, idx: number) => toNormalizedModel(m, idx));

        // Send to worker for merging
        if (workerRef.current) {
            workerRef.current.postMessage({
                type: 'MERGE_MODELS',
                payload: {
                    currentModels: modelsRef.current,
                    newModels: normalized,
                    autoMergeDuplicates: settings.autoMergeDuplicates ?? false
                }
            });
        }
    }, [settings.autoMergeDuplicates]);

    return {
        importModels,
        mergeInModels,
        lastMergeStats,
        setLastMergeStats
    };
}
