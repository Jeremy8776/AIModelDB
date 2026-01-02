/**
 * Sync Service
 * 
 * Handles synchronization of AI model data from multiple external sources.
 * This service orchestrates fetching, filtering, translation, and enrichment
 * of model data from various APIs and data sources.
 * 
 * @module syncService
 */

import { Model, ApiDir } from "../types";
import {
    fetchHuggingFaceRecent,
    fetchArtificialAnalysisIndex,
    fetchCivitai,
    fetchCivitasBay,
    fetchOpenModelDB,
    fetchOllamaLibrary,
    callProviderLLM,
    enrichModelsDeep,
    translateChineseModels,
    applyCorporateFilteringAsync
} from "./api";

/**
 * Configuration options for synchronization operations
 */
export interface SyncOptions {
    dataSources: {
        huggingface?: boolean;
        artificialanalysis?: boolean;
        civitai?: boolean;
        openmodeldb?: boolean;
        civitasbay?: boolean;
        ollamaLibrary?: boolean;
        llmDiscovery?: boolean;
    };
    artificialAnalysisApiKey?: string;
    enableNSFWFiltering?: boolean;
    logNSFWAttempts?: boolean;
    apiConfig?: ApiDir;
    preferredModelProvider?: string | null;
    systemPrompt?: string;
}

/**
 * Progress information for sync operations
 */
export interface SyncProgress {
    /** Current number of sources completed */
    current: number;
    /** Total number of sources to sync */
    total: number;
    /** Name of the current source being synced */
    source?: string;
    /** Number of models found from current source */
    found?: number;
    /** Live status message from console */
    statusMessage?: string;
    /** Estimated time remaining */
    eta?: string;
}

/**
 * Result of a sync operation
 */
export interface SyncResult {
    /** Successfully synced models */
    complete: Model[];
    /** Models that were flagged during sync (e.g., NSFW content) */
    flagged: Model[];
}

/**
 * Callback functions for sync operation events
 */
export interface SyncCallbacks {
    /** Called when sync progress updates */
    onProgress?: (progress: SyncProgress) => void;
    /** Called when a log message is generated */
    onLog?: (message: string) => void;
    /** Called when new models are available for progressive display */
    onModelsUpdate?: (models: Model[]) => void;
    /** Signal to skip long operations */
    skipSignal?: { current: boolean };
    /** Called to confirm if user wants to run LLM NSFW check (returns true to proceed, false to skip) */
    onConfirmLLMCheck?: (modelCount: number, estimatedTimeMs: number) => Promise<boolean>;
}

/**
 * Synchronize all enabled data sources and return combined results.
 * 
 * This function fetches model data from all enabled sources in parallel,
 * applies filtering, translation, and enrichment, and returns the combined results.
 * 
 * Features:
 * - Parallel fetching from multiple sources
 * - Progressive model updates during sync
 * - NSFW content filtering
 * - LLM-powered model discovery
 * - Chinese/CJK content translation
 * - Deep enrichment of model metadata
 * 
 * @param options - Sync configuration options
 * @param callbacks - Optional callback functions for progress and logging
 * @returns Promise resolving to sync results with complete and flagged models
 * @throws Error if sync operation fails
 * @hasTurbo
 */
export async function syncAllSources(
    options: SyncOptions,
    callbacks?: SyncCallbacks
): Promise<SyncResult> {
    const { onProgress, onLog, onModelsUpdate, skipSignal, onConfirmLLMCheck } = callbacks || {};

    try {
        // Count enabled sources dynamically
        // Note: Civitai is blocked in UK due to Online Safety Act (OSA)
        const enabledSources = [
            options.dataSources?.huggingface && 'HuggingFace',
            options.dataSources?.artificialanalysis && 'ArtificialAnalysis',
            // options.dataSources?.civitai && 'Civitai', // Blocked in UK due to OSA
            options.dataSources?.openmodeldb && 'OpenModelDB',
            options.dataSources?.civitasbay && 'CivitasBay',
            options.dataSources?.ollamaLibrary && 'OllamaLibrary',
        ].filter(Boolean);

        const totalSources = enabledSources.length;
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
            // Generate status string from active sources
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

        const withProgress = async <T,>(p: Promise<T>, name: string, fallback: T): Promise<T> => {
            activeSources.add(name);
            // Log that we're starting this source
            if (onLog) {
                onLog(`Fetching from ${name}...`);
            }
            // Initial update to show this source started
            if (onProgress) {
                onProgress({
                    current: completedSources,
                    total: totalSources,
                    source: Array.from(activeSources).join(', ')
                });
            }

            try {
                const res = await p;
                activeSources.delete(name);

                // Progressive display: Update models immediately as each source completes
                if (res && typeof res === 'object' && 'complete' in res && Array.isArray(res.complete)) {
                    const newModels = res.complete as Model[];
                    if (newModels.length > 0 && onLog) {
                        onLog(`${name}: Found ${newModels.length} models`);
                    }
                    if (onModelsUpdate && newModels.length > 0) {
                        onModelsUpdate(newModels);
                    }
                    // Update progress with completion
                    updateProgress(true, name, newModels.length);
                    return res;
                }
                activeSources.delete(name); // Ensure deleted if condition above fails
                updateProgress(true, name, 0);
                return res;
            } catch (error) {
                activeSources.delete(name);
                console.error(`Error fetching from ${name}:`, error);
                if (onLog) {
                    onLog(`${name}: Failed - ${error instanceof Error ? error.message : String(error)}`);
                }
                updateProgress(true, name, 0);
                return fallback;
            }
        };

        // Build array of enabled fetching promises dynamically
        const fetchPromises = [];

        if (options.dataSources?.huggingface) {
            fetchPromises.push(withProgress(fetchHuggingFaceRecent(), 'HuggingFace', { complete: [], flagged: [] }));
        }
        if (options.dataSources?.artificialanalysis) {
            fetchPromises.push(withProgress(
                fetchArtificialAnalysisIndex(options.artificialAnalysisApiKey),
                'Artificial Analysis',
                { complete: [], flagged: [] }
            ));
        }
        // Civitai is blocked in UK due to Online Safety Act (OSA)
        // if (options.dataSources?.civitai) {
        //     fetchPromises.push(withProgress(fetchCivitai(500), 'Civitai', { complete: [], flagged: [] }));
        // }
        if (options.dataSources?.openmodeldb) {
            fetchPromises.push(withProgress(fetchOpenModelDB(), 'OpenModelDB', { complete: [], flagged: [] }));
        }
        if (options.dataSources?.civitasbay) {
            fetchPromises.push(withProgress(fetchCivitasBay(options.apiConfig), 'CivitasBay', { complete: [], flagged: [] }));
        }
        if (options.dataSources?.ollamaLibrary) {
            fetchPromises.push(withProgress(fetchOllamaLibrary(), 'Ollama Library', { complete: [], flagged: [] }));
        }

        // Parallel fetching with individual progress updates
        const results = await Promise.all(fetchPromises);

        // Handle complete and flagged models from all sources
        let allComplete = results.map(r => r.complete || []).flat();

        if (onLog) {
            onLog(`Collected ${allComplete.length} models from all sources`);
        }

        // Apply final corporate safety filter across all results
        if (options.enableNSFWFiltering) {
            if (onLog) {
                onLog(`Running NSFW filter on ${allComplete.length} models...`);
            }

            const finalFilter = await applyCorporateFilteringAsync(
                allComplete,
                options.enableNSFWFiltering,
                options.logNSFWAttempts,
                options.apiConfig, // Pass API config for LLM validation
                skipSignal,
                onConfirmLLMCheck
            );

            allComplete = finalFilter.complete;

            // Log final filtering results
            if (onLog) {
                if (finalFilter.flagged.length > 0) {
                    onLog(`NSFW filter: ${finalFilter.flagged.length} blocked, ${allComplete.length} passed`);
                } else {
                    onLog(`NSFW filter complete: ${allComplete.length} models passed`);
                }
            }
        }

        // LLM discovery: allow the LLM to surface missing/new models and fill gaps
        try {
            if (options.dataSources?.llmDiscovery && options.apiConfig) {
                // Helper function to check if a provider has a valid key
                const hasValidKey = async (key: string, cfg: any): Promise<boolean> => {
                    if (cfg.apiKey && cfg.apiKey.trim() !== '') return true;
                    return false;
                };

                // Find the provider to use for LLM discovery
                let discoveryProvider: string | null = null;
                let discoveryCfg: any = null;

                // First, try preferred provider
                if (options.preferredModelProvider) {
                    const cfg = options.apiConfig[options.preferredModelProvider as keyof typeof options.apiConfig];
                    if (cfg?.enabled && await hasValidKey(options.preferredModelProvider, cfg)) {
                        discoveryProvider = options.preferredModelProvider;
                        discoveryCfg = cfg;
                    }
                }

                // If no preferred provider, find first enabled provider
                if (!discoveryProvider) {
                    for (const [key, cfg] of Object.entries(options.apiConfig)) {
                        if (cfg.enabled && await hasValidKey(key, cfg)) {
                            discoveryProvider = key;
                            discoveryCfg = cfg;
                            break;
                        }
                    }
                }

                if (discoveryProvider && discoveryCfg) {
                    if (onLog) {
                        onLog(`LLM Discovery: Searching for new models using ${discoveryProvider}...`);
                    }

                    // Use system prompt from options, fallback to default discovery prompt
                    const systemPrompt = options.systemPrompt ||
                        `You are an AI research assistant. Find newly released or significantly updated AI models and summarize key metadata.

Domain catalog (grouped):
LLM: LLM
Multimodal Language: VLM
Vision (CV): Vision
Image Generation: ImageGen, LoRA (image), FineTune (image)
Video Generation: VideoGen, LoRA (video), FineTune (video)
Audio: Audio, ASR, TTS
3D: 3D
Simulation/World: World/Sim
Background Removal: BackgroundRemoval
Upscaling/Super-Resolution: Upscaler
Other: Other

Cover multiple groups above. Prioritize license terms, parameters (e.g., 7B), context window (e.g., 128K), release/update dates, and availability (weights/API).

Return ONLY a JSON array of model objects with fields: id(optional), name, provider, domain, source, url, repo(optional), description(optional), license{name,type,commercial_use}, updated_at(optional), release_date(optional), tags(optional), parameters(optional), context_window(optional), hosting{weights_available,api_available,on_premise_friendly}.`;

                    const discoveryPrompt = `Find newly released or significantly updated AI models from the past 30 days. Focus on models that might not be captured by standard API sources (HuggingFace, ArtificialAnalysis). 

Look for:
- New model releases from major AI companies (OpenAI, Anthropic, Google, Meta, etc.)
- Open source models on GitHub, GitLab, or other platforms
- Research paper implementations that have become available
- Updated versions of existing models with significant improvements
- Models from new or smaller providers/researchers

Return a JSON array of discovered models. Each model should include complete metadata.`;

                    const llmResults = await callProviderLLM(
                        discoveryProvider as any,
                        discoveryCfg,
                        systemPrompt,
                        discoveryPrompt
                    );

                    if (Array.isArray(llmResults) && llmResults.length) {
                        if (onLog) {
                            onLog(`LLM Discovery: Found ${llmResults.length} new models`);
                        }
                        allComplete = allComplete.concat(llmResults as any);
                    } else {
                        if (onLog) {
                            onLog(`LLM Discovery: No new models found`);
                        }
                    }
                } else {
                    if (onLog) {
                        onLog(`LLM Discovery: Skipped (no API configured)`);
                    }
                }
            } else {
                if (onLog) {
                    onLog(`[LLM Discovery] Disabled in settings`);
                }
            }
        } catch (e) {
            if (onLog) {
                onLog(`[LLM Discovery] Error: ${e instanceof Error ? e.message : String(e)}`);
            }
        }

        // Translate Chinese content to English (names/descriptions)
        try {
            if (onLog) {
                onLog('Translation: Checking for Chinese/CJK content...');
            }
            const beforeCount = allComplete.filter(m => m.tags?.includes('translated')).length;
            if (options.apiConfig) {
                if (onProgress) {
                    onProgress({
                        current: completedSources,
                        total: totalSources,
                        source: 'Translating models...'
                    });
                }
                allComplete = await translateChineseModels(allComplete, options.apiConfig, (msg) => {
                    // Update header with detailed progress
                    if (onProgress) {
                        onProgress({
                            current: completedSources,
                            total: totalSources,
                            source: msg
                        });
                    }
                });

                // Restore completed state
                updateProgressState();
            }
            const afterCount = allComplete.filter(m => m.tags?.includes('translated')).length;
            const translatedCount = afterCount - beforeCount;
            if (translatedCount > 0 && onLog) {
                onLog(`Translation: Translated ${translatedCount} models to English`);
            } else if (onLog) {
                onLog('Translation: No translation needed');
            }
        } catch (e: any) {
            if (onLog) {
                onLog(`[Translation] Error: ${e?.message || e}`);
            }
        }

        // Deep enrichment with LLM usage to fill in missing fields
        // REMOVED per user request to avoid high costs during sync
        // allComplete = await enrichModelsDeep(allComplete, 80);
        const allFlagged = results.map(r => r.flagged || []).flat();

        return {
            complete: allComplete,
            flagged: allFlagged
        };
    } catch (error) {
        console.error("Error syncing models:", error);
        if (callbacks?.onLog) {
            callbacks.onLog(`Error syncing models: ${error instanceof Error ? error.message : String(error)}`);
        }
        throw error;
    }
}

/**
 * Synchronize with live options including auto-refresh and custom prompts.
 * 
 * This is a wrapper around syncAllSources that adds support for auto-refresh
 * configuration and minimum download bypass settings.
 * 
 * @param options - Extended sync options including auto-refresh settings
 * @param callbacks - Optional callback functions for progress and logging
 * @returns Promise resolving to sync results
 */
export async function syncWithLiveOptions(
    options: SyncOptions & {
        autoRefresh?: { enabled: boolean; interval: number; unit: string };
        minDownloadsBypass?: number;
    },
    callbacks?: SyncCallbacks
): Promise<SyncResult> {
    const { onLog } = callbacks || {};

    if (options.autoRefresh?.enabled) {
        const intervalValue = options.autoRefresh.interval;
        const unit = options.autoRefresh.unit;
        console.log(`Auto-refresh set for every ${intervalValue} ${unit}`);
        if (onLog) {
            onLog(`Auto-refresh set for every ${intervalValue} ${unit}`);
        }
    }

    // Use the main sync function
    return syncAllSources(options, callbacks);
}
