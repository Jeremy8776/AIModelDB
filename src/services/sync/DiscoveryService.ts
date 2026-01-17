import { Model, ProviderCfg, ProviderKey } from "../../types";
import { SyncOptions, SyncCallbacks } from "./SyncTypes";
import { callProviderLLM } from "../api";
import { SYSTEM_PROMPT_DISCOVERY, USER_PROMPT_DISCOVERY } from "../../constants/prompts";

export async function runLLMDiscovery(
    options: SyncOptions,
    callbacks?: SyncCallbacks
): Promise<Model[]> {
    const { onLog } = callbacks || {};

    try {
        if (options.dataSources?.llmDiscovery && options.apiConfig) {
            // Helper function to check if a provider has a valid key
            const hasValidKey = async (key: string, cfg: ProviderCfg): Promise<boolean> => {
                if (cfg.apiKey && cfg.apiKey.trim() !== '') return true;
                return false;
            };

            // Find the provider to use for LLM discovery
            let discoveryProvider: string | null = null;
            let discoveryCfg: ProviderCfg | null = null;

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
                const systemPrompt = options.systemPrompt || SYSTEM_PROMPT_DISCOVERY;
                const discoveryPrompt = USER_PROMPT_DISCOVERY;

                const llmResults = await callProviderLLM(
                    discoveryProvider as ProviderKey,
                    discoveryCfg,
                    systemPrompt,
                    discoveryPrompt
                );

                if (Array.isArray(llmResults) && llmResults.length) {
                    if (onLog) {
                        onLog(`LLM Discovery: Found ${llmResults.length} new models`);
                    }
                    return llmResults;
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
    return [];
}
