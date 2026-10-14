/**
 * NSFW Scan Hook
 * 
 * Handles retroactive NSFW tagging of models on initial load.
 * Uses the detectNSFW utility to identify and tag/untag models.
 */

import { useEffect, useRef } from 'react';
import { Model } from '../types';
import { detectNSFW } from '../utils/nsfw';

/** Longest stretch of scanning before yielding to the UI. */
const NSFW_SLICE_MS = 8;

interface UseNSFWScanOptions {
    /** Current models in the database */
    models: Model[];
    /** Whether the app is still loading */
    isLoading: boolean;
    /** Custom NSFW keywords from settings */
    customNSFWKeywords: string[];
    /** Function to update models */
    setModels: React.Dispatch<React.SetStateAction<Model[]>>;
    /** Logging function */
    addConsoleLog: (message: string) => void;
}

/**
 * Retroactively scan models for NSFW content on initial load.
 * This runs once when models are loaded to ensure old models get tagged
 * and fixes false positives by re-evaluating all models.
 */
export function useNSFWScan({
    models,
    isLoading,
    customNSFWKeywords,
    setModels,
    addConsoleLog,
}: UseNSFWScanOptions) {
    const hasRunNSFWScan = useRef(false);

    const unmounted = useRef(false);
    useEffect(() => {
        unmounted.current = false;
        return () => { unmounted.current = true; };
    }, []);

    useEffect(() => {
        // Only run once after initial load
        if (hasRunNSFWScan.current || models.length === 0 || isLoading) return;
        hasRunNSFWScan.current = true;

        // Re-evaluate ALL models to catch new ones and fix false positives. The scan is cut into
        // short slices so the first screen stays responsive; it used to run as one long task.
        // (It is deliberately not cancelled when `models` changes: the result is applied by id.)
        const snapshot = models;
        const keywords = customNSFWKeywords || [];

        const scan = async () => {
            const modelsToFlag: Model[] = [];
            const modelsToUnflag: Model[] = [];
            let sliceStart = performance.now();

            for (const model of snapshot) {
                const nsfwCheck = detectNSFW(model, keywords);

                if (nsfwCheck.isNSFW) {
                    // Should be flagged - check if it already is
                    if (!model.isNSFWFlagged && !model.tags?.includes('nsfw')) {
                        modelsToFlag.push({
                            ...model,
                            isNSFWFlagged: true,
                            tags: [...new Set([...(model.tags || []), 'nsfw'])]
                        });
                    }
                } else if (model.isNSFWFlagged || model.tags?.includes('nsfw')) {
                    // Should NOT be flagged - unflag if it was a false positive
                    modelsToUnflag.push({
                        ...model,
                        isNSFWFlagged: false,
                        tags: (model.tags || []).filter(t => t !== 'nsfw')
                    });
                }

                if (performance.now() - sliceStart > NSFW_SLICE_MS) {
                    await new Promise<void>(resolve => setTimeout(resolve, 0));
                    if (unmounted.current) return;
                    sliceStart = performance.now();
                }
            }

            if (modelsToFlag.length === 0 && modelsToUnflag.length === 0) return;
            if (modelsToFlag.length > 0) {
                addConsoleLog(`[NSFW Scan] Tagged ${modelsToFlag.length} models as NSFW`);
            }
            if (modelsToUnflag.length > 0) {
                addConsoleLog(`[NSFW Scan] Untagged ${modelsToUnflag.length} false positives`);
            }

            // Index by id once; looking each model up with find() was O(flagged x models).
            const flaggedById = new Map(modelsToFlag.map(m => [m.id, m] as const));
            const unflaggedById = new Map(modelsToUnflag.map(m => [m.id, m] as const));

            setModels(prev => prev.map(m => {
                // Preserve existing user flags while updating with the re-evaluated model data
                const updated = flaggedById.get(m.id) ?? unflaggedById.get(m.id);
                return updated
                    ? { ...updated, isFavorite: m.isFavorite, flaggedImageUrls: m.flaggedImageUrls }
                    : m;
            }));
        };

        void scan();
    }, [models, models.length, isLoading, customNSFWKeywords, setModels, addConsoleLog]);

    /**
     * Reset the scan flag to allow re-scanning (useful for testing or manual trigger)
     */
    const resetScan = () => {
        hasRunNSFWScan.current = false;
    };

    return { resetScan };
}
