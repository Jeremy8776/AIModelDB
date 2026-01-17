import { Model } from "../../types";
import { SyncOptions, SyncCallbacks, SyncResult } from "./SyncTypes";
import { applyCorporateFiltering, applyCorporateFilteringAsync } from "../api";

export async function runSafetyCheck(
    models: Model[],
    options: SyncOptions,
    callbacks?: SyncCallbacks
): Promise<SyncResult> {
    const { onLog, skipSignal, onConfirmLLMCheck } = callbacks || {};

    // Default result
    let complete = [...models];
    let flagged: Model[] = [];

    // NSFW Detection and Filtering
    // This ALWAYS runs to tag NSFW models
    // - When enableNSFWFiltering is ON: NSFW models are BLOCKED (excluded from complete)
    // - When enableNSFWFiltering is OFF: NSFW models are TAGGED but still included
    if (onLog) {
        const mode = options.enableNSFWFiltering ? 'blocking' : 'tagging';
        onLog(`Safety filter: Running in ${mode} mode on ${complete.length} models...`);
    }

    // 1. Run the corporate filtering (this handles both modes)
    const regexFilter = applyCorporateFiltering(
        complete,
        options.enableNSFWFiltering ?? false,  // Pass the setting - handles blocking vs tagging
        options.logNSFWAttempts,
        options.customNSFWKeywords
    );

    complete = regexFilter.complete;
    flagged = regexFilter.flagged;

    if (options.enableNSFWFiltering) {
        // Blocking mode - report blocked models
        if (regexFilter.flagged.length > 0 && onLog) {
            onLog(`Safety Filter: Blocked ${regexFilter.flagged.length} NSFW models`);
        }

        // 2. Optional LLM Filter (only when blocking mode is ON)
        if (options.apiConfig) {
            if (onLog) onLog(`Checking LLM safety inspection availability...`);

            const finalFilter = await applyCorporateFilteringAsync(
                complete,
                true, // Force enable since we are in blocking mode
                options.logNSFWAttempts,
                options.apiConfig,
                skipSignal,
                onConfirmLLMCheck,
                undefined, // progress callback
                options.customNSFWKeywords
            );

            complete = finalFilter.complete;
            if (finalFilter.flagged.length > 0) {
                flagged = [...flagged, ...finalFilter.flagged];
                if (onLog) onLog(`LLM Safety: Flagged ${finalFilter.flagged.length} additional models`);
            }
        }
    } else {
        // Tagging mode - count how many were tagged
        const taggedCount = complete.filter(m => m.isNSFWFlagged || m.tags?.includes('nsfw')).length;
        if (taggedCount > 0 && onLog) {
            onLog(`Safety Filter: Tagged ${taggedCount} NSFW models (not blocking)`);
        }
    }

    if (onLog) onLog(`Safety analysis complete.`);

    return { complete, flagged };
}
