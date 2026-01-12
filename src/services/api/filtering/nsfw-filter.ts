import { Model, ApiDir } from "../../../types";
import { filterNSFWModels, getSafetyReport } from "../../../utils/nsfw";
import { callProviderText } from "../../api/providers/provider-calls";
import { safeJsonFromText } from "../../../utils/format";

/**
 * Apply NSFW filtering to model results for corporate safety
 * 
 * Two modes:
 * - enableNSFWFiltering = true: Block NSFW models (return in flagged array)
 * - enableNSFWFiltering = false: Tag NSFW models with 'nsfw' tag and isNSFWFlagged=true
 *   but still include them in complete array (for later UI hiding)
 * 
 * @param models - Array of models to filter
 * @param enableNSFWFiltering - Whether to BLOCK NSFW models or just TAG them
 * @param logAttempts - Whether to log filtered models (default: true)
 * @returns Object containing complete (safe/tagged) and flagged (blocked) models
 */
export function applyCorporateFiltering(
    models: Model[],
    enableNSFWFiltering: boolean = true,
    logAttempts: boolean = true,
    customKeywords: string[] = []
): { complete: Model[], flagged: Model[] } {
    // Always run the NSFW detection to identify NSFW models
    const { safeModels, flaggedModels, filteredCount } = filterNSFWModels(models, true, customKeywords); // Always detect

    if (filteredCount > 0 && logAttempts) {
        // Compressed summary log
        console.warn(`[Safety Filter] Detected ${filteredCount} NSFW models`);
        if (filteredCount <= 10) {
            const names = flaggedModels.map(m => m.name?.substring(0, 40) || 'Unknown').join(', ');
            console.log(`[Safety Filter] NSFW: ${names}`);
        } else {
            const first5 = flaggedModels.slice(0, 5).map(m => m.name?.substring(0, 30) || 'Unknown').join(', ');
            console.log(`[Safety Filter] NSFW: ${first5}... and ${filteredCount - 5} more`);
        }
    }

    if (enableNSFWFiltering) {
        // BLOCKING MODE: Return NSFW models in flagged array (they won't be imported)
        console.log(`[Safety Filter] Blocking ${filteredCount} NSFW models`);
        return {
            complete: safeModels,
            flagged: flaggedModels
        };
    } else {
        // TAGGING MODE: Tag NSFW models and include them in complete array
        // They can be hidden later in the UI using the "Hide NSFW" toggle
        const taggedNSFWModels = flaggedModels.map(m => ({
            ...m,
            isNSFWFlagged: true,
            tags: [...new Set([...(m.tags || []), 'nsfw'])]
        }));

        if (filteredCount > 0) {
            console.log(`[Safety Filter] Tagged ${filteredCount} models as NSFW (not blocking)`);
        }

        return {
            complete: [...safeModels, ...taggedNSFWModels],
            flagged: [] // Nothing blocked, just tagged
        };
    }
}

/**
 * Async version of corporate filtering that uses LLM for deeper inspection if configured
 */
export async function applyCorporateFilteringAsync(
    models: Model[],
    enableNSFWFiltering: boolean = true,
    logAttempts: boolean = true,
    apiConfig?: ApiDir,
    skipSignal?: { current: boolean },
    onConfirmLLMCheck?: (modelCount: number, estimatedTimeMs: number) => Promise<boolean>,
    onProgress?: (current: number, total: number) => void,
    customKeywords: string[] = []
): Promise<{ complete: Model[], flagged: Model[] }> {
    // 1. Run standard synchronous/regex filtering first (fast)
    const syncResult = applyCorporateFiltering(models, enableNSFWFiltering, logAttempts, customKeywords);

    // If filtering is disabled or no apiConfig, return sync result
    if (!enableNSFWFiltering || !apiConfig) {
        return syncResult;
    }

    // 2. Run LLM-based filtering on the "safe" models to catch subtle NSFW content
    // Check if we have a capable provider enabled (Ollama preferred for local/privacy)
    let providerKey: string | null = null;
    let providerCfg: any = null;

    // Prefer Ollama for privacy/cost
    if (apiConfig.ollama?.enabled) {
        providerKey = 'ollama';
        providerCfg = apiConfig.ollama;
    } else {
        // Fallback to other providers if enabled
        const entry = Object.entries(apiConfig).find(([k, c]) => c.enabled && (c.apiKey || k === 'ollama'));
        if (entry) {
            providerKey = entry[0];
            providerCfg = entry[1];
        }
    }

    if (!providerKey || !providerCfg) {
        // No LLM provider available - auto-skip LLM check
        console.log(`[Corporate Filter] Skipping LLM NSFW check - no LLM API configured (Ollama or API key required)`);
        return syncResult;
    }

    // Estimate time: ~2 seconds per batch of 10 models
    const BATCH_SIZE = 10;
    const totalBatches = Math.ceil(syncResult.complete.length / BATCH_SIZE);
    const estimatedTimeMs = totalBatches * 2000; // ~2s per batch

    // Ask user for confirmation if callback provided
    if (onConfirmLLMCheck) {
        const shouldProceed = await onConfirmLLMCheck(syncResult.complete.length, estimatedTimeMs);
        if (!shouldProceed) {
            console.log(`[Corporate Filter] User skipped LLM NSFW check`);
            return syncResult;
        }
    }

    console.log(`[Corporate Filter] Running deep LLM inspection on ${syncResult.complete.length} candidates using ${providerKey}...`);

    const finalSafe: Model[] = [];
    const finalFlagged: Model[] = [...syncResult.flagged];

    // Process in batches
    const candidates = syncResult.complete;
    let parseFailures = 0;

    for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
        // Check if skip was requested
        if (skipSignal?.current) {
            console.log(`[Corporate Filter] Skip requested - adding remaining ${candidates.length - i} models as safe`);
            finalSafe.push(...candidates.slice(i));
            break;
        }

        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const batch = candidates.slice(i, i + BATCH_SIZE);

        // Prepare minimal metadata for the LLM to analyze
        const batchMeta = batch.map(m => ({
            id: m.id,
            name: m.name,
            description: (m.description || '').slice(0, 300), // Truncate description
            tags: m.tags || []
        }));

        const systemPrompt = `You are a Content Safety Validator. 
Analyze the provided AI model metadata for Not-Safe-For-Work (NSFW) content.
NSFW includes: Nudity, Pornography, Sexual Acts, Fetishes, and sexually explicit Lora/Checkpoints.
Pay attention to terms like "Labia", "Breasts", "Nude", "Hentai", "Ecchi", "Pussy", "Dick", "Penis" or slang that implies explicit content.
Be strict. If a model seems designed for generating nude or pornographic content, flag it.
Return valid JSON ONLY: A map where keys are model IDs and values are objects: { "isNSFW": boolean, "reason": "string" }.
Example: { "model-1": { "isNSFW": true, "reason": "Explicit tag detected" }, "model-2": { "isNSFW": false, "reason": "Safe" } }`;

        try {
            const responseText = await callProviderText(
                providerKey as any,
                providerCfg,
                systemPrompt,
                JSON.stringify(batchMeta)
            );

            const analysis = safeJsonFromText(responseText);

            if (analysis) {
                batch.forEach(model => {
                    const result = analysis[model.id];
                    if (result && result.isNSFW) {
                        console.warn(`[Corporate Filter] LLM Flagged: ${model.name} - ${result.reason}`);
                        finalFlagged.push({
                            ...model,
                            isNSFWFlagged: true,
                            // Add internal note if possible, or just rely on the flag
                        });
                    } else {
                        finalSafe.push(model);
                    }
                });
            } else {
                // If JSON parsing fails, assume safe to avoid blocking valid content due to error
                parseFailures++;
                finalSafe.push(...batch);
            }
        } catch (err) {
            // On error, fall back to safe (don't log each one to reduce spam)
            parseFailures++;
            finalSafe.push(...batch);
        }
    }

    // Log summary of issues only once at the end
    if (parseFailures > 0) {
        console.warn(`[Corporate Filter] ${parseFailures}/${totalBatches} batches had parse failures (models assumed safe)`);
    }

    if (finalFlagged.length > syncResult.flagged.length) {
        console.log(`[Corporate Filter] LLM caught ${finalFlagged.length - syncResult.flagged.length} additional NSFW models.`);
    }

    return {
        complete: finalSafe,
        flagged: finalFlagged
    };
}
