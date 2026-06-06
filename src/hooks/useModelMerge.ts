import { useState, useEffect, useRef, useCallback } from 'react';
import { Model } from '../types';
import { useSettings } from '../context/SettingsContext';
import { mapDomain, cleanModelDescription } from '../utils/format';
import { toNormalizedModel } from '../utils/importNormalization';
import { performMergeBatch } from '../utils/mergeLogic';

export function useModelMerge(
    models: Model[],
    setModels: React.Dispatch<React.SetStateAction<Model[]>>,
    onSaveModelsNow?: (models: Model[]) => Promise<void>
) {
    const { settings } = useSettings();
    const [lastMergeStats, setLastMergeStats] = useState<{ added: number; updated: number; duplicates?: number } | null>(null);
    const workerRef = useRef<Worker | null>(null);
    const requestIdRef = useRef(0);
    const pendingMergeRef = useRef(new Map<number, { baseIds: Set<string>; autoMergeDuplicates: boolean }>());

    // Use ref to track the save callback so we don't recreate the worker when it changes
    const saveCallbackRef = useRef(onSaveModelsNow);
    useEffect(() => {
        saveCallbackRef.current = onSaveModelsNow;
    }, [onSaveModelsNow]);

    // Use ref to track setModels to avoid recreating worker
    const setModelsRef = useRef(setModels);
    useEffect(() => {
        setModelsRef.current = setModels;
    }, [setModels]);

    useEffect(() => {
        try {
            // Initialize the worker ONCE - don't depend on callbacks that change frequently
            workerRef.current = new Worker(new URL('../workers/modelProcessor.worker.ts', import.meta.url), { type: 'module' });

            // Set up listener for worker responses
            workerRef.current.onmessage = (event) => {
                const { type, payload, error } = event.data;
                if (type === 'MERGE_COMPLETE') {
                    const { models: workerModels, added, updated, duplicates, requestId } = payload;
                    const pending = pendingMergeRef.current.get(requestId);
                    pendingMergeRef.current.delete(requestId);

                    setModelsRef.current(latestModels => {
                        const deletedSinceStart = new Set(
                            [...(pending?.baseIds || [])].filter(id => !latestModels.some(model => model.id === id))
                        );
                        const candidates = workerModels.filter((model: Model) => !deletedSinceStart.has(model.id));
                        const reconciled = performMergeBatch(
                            latestModels,
                            candidates,
                            pending?.autoMergeDuplicates ?? false
                        ).models;
                        if (saveCallbackRef.current) {
                            saveCallbackRef.current(reconciled);
                        }
                        return reconciled;
                    });
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
    }, []); // Empty deps - worker is created once and uses refs for callbacks

    const modelsRef = useRef(models);
    useEffect(() => {
        modelsRef.current = models;
    }, [models]);

    const postWorkerMerge = useCallback((incomingList: Model[]) => {
        if (!incomingList || incomingList.length === 0) return;
        const currentModels = modelsRef.current;
        const autoMergeDuplicates = settings.autoMergeDuplicates ?? false;

        if (workerRef.current) {
            const requestId = ++requestIdRef.current;
            pendingMergeRef.current.set(requestId, {
                baseIds: new Set(currentModels.map(model => model.id)),
                autoMergeDuplicates
            });
            workerRef.current.postMessage({
                type: 'MERGE_MODELS',
                payload: {
                    requestId,
                    currentModels,
                    newModels: incomingList,
                    autoMergeDuplicates
                }
            });
        } else {
            console.warn('Worker not ready, falling back to main thread');
            try {
                setModels(prev => {
                    const result = performMergeBatch(prev, incomingList, autoMergeDuplicates);
                    if (saveCallbackRef.current) saveCallbackRef.current(result.models);
                    setLastMergeStats({
                        added: result.added,
                        updated: result.updated,
                        duplicates: result.duplicates
                    });
                    return result.models;
                });
            } catch (err) {
                console.error("Main thread merge failed:", err);
            }
        }
    }, [settings.autoMergeDuplicates, setModels]);

    const mergeInModels = useCallback((incomingList: Model[]) => {
        postWorkerMerge(incomingList);
    }, [postWorkerMerge]);

    const importModels = useCallback((newModels: Model[]) => {
        const normalized: Model[] = (newModels || []).map((m: any, idx: number) => toNormalizedModel(m, idx));

        // Turn this off for large imports if using main thread to prevent freeze? 
        // For now we assume safety.

        postWorkerMerge(normalized);
    }, [postWorkerMerge]);

    return {
        importModels,
        mergeInModels,
        lastMergeStats,
        setLastMergeStats
    };
}
