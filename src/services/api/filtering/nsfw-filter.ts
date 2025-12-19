import { Model } from "../../../types";
import { filterNSFWModels, getSafetyReport } from "../../../utils/nsfw";

/**
 * Apply NSFW filtering to model results for corporate safety
 * 
 * @param models - Array of models to filter
 * @param enableNSFWFiltering - Whether to enable NSFW filtering (default: true)
 * @param logAttempts - Whether to log filtered models (default: true)
 * @returns Object containing complete (safe) and flagged (NSFW) models
 */
export function applyCorporateFiltering(
    models: Model[],
    enableNSFWFiltering: boolean = true,
    logAttempts: boolean = true
): { complete: Model[], flagged: Model[] } {
    if (!enableNSFWFiltering) {
        console.log('[Corporate Filter] NSFW filtering disabled');
        return { complete: models, flagged: [] };
    }

    const { safeModels, flaggedModels, filteredCount } = filterNSFWModels(models, enableNSFWFiltering);

    if (filteredCount > 0) {
        console.warn(`[Corporate Filter] Filtered ${filteredCount} NSFW models from results`);

        if (logAttempts) {
            flaggedModels.forEach(model => {
                const report = getSafetyReport(model);
                console.warn(`[Corporate Filter] Blocked: ${model.name} - ${report}`);
            });
        }
    }

    return {
        complete: safeModels,
        flagged: flaggedModels
    };
}
