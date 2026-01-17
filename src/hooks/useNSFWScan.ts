/**
 * NSFW Scan Hook
 * 
 * Handles retroactive NSFW tagging of models on initial load.
 * Uses the detectNSFW utility to identify and tag/untag models.
 */

import { useEffect, useRef } from 'react';
import { Model } from '../types';
import { detectNSFW } from '../utils/nsfw';

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

    useEffect(() => {
        // Only run once after initial load
        if (hasRunNSFWScan.current || models.length === 0 || isLoading) return;
        hasRunNSFWScan.current = true;

        // Re-evaluate ALL models to catch new ones and fix false positives
        const modelsToFlag: Model[] = [];
        const modelsToUnflag: Model[] = [];

        for (const model of models) {
            // Run NSFW detection
            const nsfwCheck = detectNSFW(model, customNSFWKeywords || []);

            if (nsfwCheck.isNSFW) {
                // Should be flagged - check if it already is
                if (!model.isNSFWFlagged && !model.tags?.includes('nsfw')) {
                    modelsToFlag.push({
                        ...model,
                        isNSFWFlagged: true,
                        tags: [...new Set([...(model.tags || []), 'nsfw'])]
                    });
                }
            } else {
                // Should NOT be flagged - unflag if it was a false positive
                if (model.isNSFWFlagged || model.tags?.includes('nsfw')) {
                    modelsToUnflag.push({
                        ...model,
                        isNSFWFlagged: false,
                        tags: (model.tags || []).filter(t => t !== 'nsfw')
                    });
                }
            }
        }

        if (modelsToFlag.length > 0 || modelsToUnflag.length > 0) {
            if (modelsToFlag.length > 0) {
                addConsoleLog(`[NSFW Scan] Tagged ${modelsToFlag.length} models as NSFW`);
            }
            if (modelsToUnflag.length > 0) {
                addConsoleLog(`[NSFW Scan] Untagged ${modelsToUnflag.length} false positives`);
            }

            setModels(prev => {
                const flaggedIds = new Set(modelsToFlag.map(m => m.id));
                const unflaggedIds = new Set(modelsToUnflag.map(m => m.id));

                return prev.map(m => {
                    if (flaggedIds.has(m.id)) {
                        const flaggedModel = modelsToFlag.find(u => u.id === m.id)!;
                        // Preserve existing user flags while updating with flagged model data
                        return {
                            ...flaggedModel,
                            isFavorite: m.isFavorite,
                            flaggedImageUrls: m.flaggedImageUrls
                        };
                    }
                    if (unflaggedIds.has(m.id)) {
                        const unflaggedModel = modelsToUnflag.find(u => u.id === m.id)!;
                        // Preserve existing user flags while updating with unflagged model data
                        return {
                            ...unflaggedModel,
                            isFavorite: m.isFavorite,
                            flaggedImageUrls: m.flaggedImageUrls
                        };
                    }
                    return m;
                });
            });
        }
    }, [models.length, isLoading, customNSFWKeywords, setModels, addConsoleLog]);

    /**
     * Reset the scan flag to allow re-scanning (useful for testing or manual trigger)
     */
    const resetScan = () => {
        hasRunNSFWScan.current = false;
    };

    return { resetScan };
}
