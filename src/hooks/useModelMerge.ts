import { useState, useRef, useCallback, useEffect } from 'react';
import { Model } from '../types';
import { useSettings } from '../context/SettingsContext';
import { toNormalizedModel } from '../utils/importNormalization';
import { performMergeBatch } from '../utils/mergeLogic';

/**
 * Merges synced or imported models into the database.
 *
 * The merge runs on the main thread. `performMergeBatch` is index based (tens of
 * milliseconds for thousands of records), so a web worker no longer pays for
 * itself: structured-cloning the whole list to the worker and back cost more than
 * the merge, and the result then had to be merged a second time on the main thread
 * to reconcile concurrent edits.
 */
export function useModelMerge(
    models: Model[],
    setModels: React.Dispatch<React.SetStateAction<Model[]>>,
    onSaveModelsNow?: (models: Model[]) => Promise<void>
) {
    const { settings } = useSettings();
    const [lastMergeStats, setLastMergeStats] = useState<{ added: number; updated: number; duplicates?: number } | null>(null);

    const modelsRef = useRef(models);
    useEffect(() => {
        modelsRef.current = models;
    }, [models]);

    // Ref keeps mergeList stable when the save callback changes identity.
    const saveCallbackRef = useRef(onSaveModelsNow);
    useEffect(() => {
        saveCallbackRef.current = onSaveModelsNow;
    }, [onSaveModelsNow]);

    const autoMergeDuplicates = settings.autoMergeDuplicates ?? false;

    const mergeList = useCallback((incomingList: Model[]) => {
        if (!incomingList || incomingList.length === 0) return;
        try {
            const base = modelsRef.current;
            const result = performMergeBatch(base, incomingList, autoMergeDuplicates);
            // Usually nothing else touched the list, so the merge result is final. If a queued
            // update changed it meanwhile, redo the merge against the latest list instead.
            setModels(prev => (prev === base ? result.models : performMergeBatch(prev, incomingList, autoMergeDuplicates).models));
            setLastMergeStats({ added: result.added, updated: result.updated, duplicates: result.duplicates });
            if (saveCallbackRef.current) void saveCallbackRef.current(result.models);
        } catch (err) {
            console.error('Model merge failed:', err);
        }
    }, [autoMergeDuplicates, setModels]);

    const mergeInModels = useCallback((incomingList: Model[]) => {
        mergeList(incomingList);
    }, [mergeList]);

    const importModels = useCallback((newModels: Model[]) => {
        mergeList((newModels || []).map((m: any, idx: number) => toNormalizedModel(m, idx)));
    }, [mergeList]);

    return {
        importModels,
        mergeInModels,
        lastMergeStats,
        setLastMergeStats
    };
}
