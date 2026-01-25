import { Model } from "../../types";
import { SyncOptions, SyncCallbacks, SyncResult, Fetcher } from "./SyncTypes";
import { FetcherRegistry } from "./FetcherRegistry";
import {
    huggingFaceFetcher,
    openModelDBFetcher,
    ollamaLibraryFetcher,
    fetchArtificialAnalysisIndex,
    fetchCivitasBay,
    // Legacy imports referenced in adapters
    fetchOpenModelDB, // Keeping if needed for types, but we use the fetcher object
    fetchOllamaLibrary
} from "../api";
import { runLLMDiscovery } from "./DiscoveryService";
import { runTranslation } from "./TranslationService";
import { runSafetyCheck } from "./SafetyService";
import { normalizeNameForMatch } from "../../utils/format";
import { mergeRecords } from "../../utils/mergeLogic";

/**
 * Orchestrates the synchronization process across multiple sources.
 */
export async function orchestrateSync(
    options: SyncOptions,
    callbacks?: SyncCallbacks
): Promise<SyncResult> {
    const { onProgress, onLog, onModelsUpdate, skipSignal, onConfirmLLMCheck } = callbacks || {};

    // Helper to check if the operation should be aborted
    const checkAborted = () => {
        if (callbacks?.abortSignal?.aborted) {
            throw new DOMException('Sync operation was cancelled', 'AbortError');
        }
    };

    try {
        // Initialize Registry
        const registry = new FetcherRegistry();

        // Register Standard Fetchers
        registry.register(huggingFaceFetcher);
        registry.register(openModelDBFetcher);
        registry.register(ollamaLibraryFetcher);

        // Register Adapters for Legacy Fetchers (to be converted later)

        // Artificial Analysis Adapter
        const aaFetcher: Fetcher = {
            id: 'artificialAnalysis',
            name: 'Artificial Analysis',
            isEnabled: (opts) => opts.dataSources?.artificialanalysis === true,
            fetch: async (opts) => fetchArtificialAnalysisIndex(opts.artificialAnalysisApiKey)
        };
        registry.register(aaFetcher);

        // CivitasBay Adapter
        const civitasFetcher: Fetcher = {
            id: 'civitasBay',
            name: 'CivitasBay',
            isEnabled: (opts) => opts.dataSources?.civitasbay === true,
            fetch: async (opts, cb) => {
                const civitasBayLogger = (msg: string) => {
                    if (onLog) onLog(msg);
                    if (onProgress) {
                        onProgress({
                            current: completedSources, // Closure capture of completedSources
                            total: totalSources,
                            source: 'CivitasBay',
                            statusMessage: msg
                        });
                    }
                };
                return fetchCivitasBay(opts.apiConfig, civitasBayLogger, cb?.onConfirmLLMCheck);
            }
        };
        registry.register(civitasFetcher);

        // Calculate Workload
        const allFetchers = registry.getAll();
        const enabledFetchers = allFetchers.filter(f => f.isEnabled(options));
        const totalSources = enabledFetchers.length;
        let completedSources = 0;

        if (onProgress) {
            onProgress({ current: 0, total: totalSources });
        }

        const activeSources = new Set<string>();

        const updateProgress = (completed: boolean, name?: string, found?: number) => {
            if (completed) completedSources++;
            updateProgressState(name, found);
        };

        const updateProgressState = (name?: string, found?: number) => {
            const activeList = Array.from(activeSources);
            const statusSource = activeList.length > 0
                ? activeList.join(', ')
                : (name || 'Completed');

            if (onProgress) {
                onProgress({
                    current: completedSources,
                    total: totalSources,
                    source: statusSource,
                    found
                });
            }
        };

        const executeFetcher = async (fetcher: Fetcher): Promise<SyncResult> => {
            const name = fetcher.name;
            activeSources.add(name);
            if (onLog) onLog(`Fetching from ${name}...`);
            updateProgressState();

            try {
                const res = await fetcher.fetch(options, callbacks);
                activeSources.delete(name);

                // Progressive display
                if (res && typeof res === 'object' && 'complete' in res && Array.isArray(res.complete)) {
                    const newModels = res.complete;
                    if (newModels.length > 0 && onLog) {
                        onLog(`${name}: Found ${newModels.length} models`);
                    }
                    if (onModelsUpdate && newModels.length > 0) {
                        onModelsUpdate(newModels);
                    }
                    updateProgress(true, name, newModels.length);
                    return res;
                }
                updateProgress(true, name, 0);
                return res;
            } catch (error) {
                activeSources.delete(name);
                console.error(`Error fetching from ${name}:`, error);
                if (onLog) {
                    onLog(`${name}: Failed - ${error instanceof Error ? error.message : String(error)}`);
                }
                updateProgress(true, name, 0);
                return { complete: [], flagged: [] };
            }
        };

        // Execute Fetchers in Parallel
        const fetchPromises = enabledFetchers.map(f => executeFetcher(f));
        const results = await Promise.all(fetchPromises);

        checkAborted();

        // 1. Collect initial models from fetchers
        let allModels = results.map(r => r.complete || []).flat();
        const initialSafetyFlagged = results.map(r => r.flagged || []).flat();

        // 2. Run LLM Discovery (API & Local)
        // This adds to the pool before we deduplicate and safety-check
        const discoveredModels = await runLLMDiscovery(options, callbacks);
        if (discoveredModels.length > 0) {
            allModels = allModels.concat(discoveredModels);
        }

        checkAborted();

        // 3. Deduplicate ALL collected models
        const beforeCount = allModels.length;
        let allComplete = deduplicateModels(allModels);
        const afterCount = allComplete.length;
        const consolidated = beforeCount - afterCount;

        if (onLog) {
            onLog(`[Sync] Processed ${beforeCount} total models from all sources.`);
            if (consolidated > 0) {
                onLog(`[Sync] Successfully consolidated ${consolidated} duplicate models based on name matching.`);
            }
            onLog(`[Sync] Resulting unique database: ${afterCount} models.`);
        }

        // 4. Run Safety Checks on the consolidated list
        const safetyResult = await runSafetyCheck(allComplete, options, callbacks);
        allComplete = safetyResult.complete;
        const safetyFlagged = safetyResult.flagged;

        checkAborted();

        // 5. Run Translation
        allComplete = await runTranslation(allComplete, options, callbacks, completedSources, totalSources);

        // Final Status Update
        if (onProgress) {
            onProgress({
                current: totalSources,
                total: totalSources,
                source: 'Completed'
            });
        }

        const allFlagged = results.map(r => r.flagged || []).flat().concat(safetyFlagged);

        return {
            complete: allComplete,
            flagged: allFlagged,
            duplicates: allModels.length - allComplete.length
        };
    } catch (error) {
        console.error("Error syncing models:", error);
        if (onLog) {
            onLog(`Error syncing models: ${error instanceof Error ? error.message : String(error)}`);
        }
        throw error;
    }
}

/**
 * Helper to deduplicate and merge models from different sources
 */
function deduplicateModels(models: Model[]): Model[] {
    const map = new Map<string, Model>();

    for (const model of models) {
        // Create an extremely robust key for fuzzy matching using centralized normalization
        const key = normalizeNameForMatch(model.name);

        if (!key) {
            map.set(model.id, model); // Fallback to ID if name normalization fails
            continue;
        }

        if (map.has(key)) {
            const existing = map.get(key)!;
            console.log(`[Sync] Merging duplicate: "${model.name}" -> "${existing.name}" (Key: ${key})`);
            map.set(key, mergeRecords(existing, model));
        } else {
            map.set(key, { ...model });
        }
    }

    return Array.from(map.values());
}
