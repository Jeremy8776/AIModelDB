import { Model, ProviderCfg, ProviderKey } from "../../types";
import { SyncOptions, SyncCallbacks } from "./SyncTypes";
import { callProviderLLM } from "../api";
import { SYSTEM_PROMPT_DISCOVERY, USER_PROMPT_DISCOVERY } from "../../constants/prompts";

export async function runLLMDiscovery(
    options: SyncOptions,
    callbacks?: SyncCallbacks
): Promise<Model[]> {
    const results: Model[] = [];

    // 1. API Discovery (Existing logic)
    if (options.dataSources?.apiDiscovery) {
        const apiModels = await runApiDiscovery(options, callbacks);
        results.push(...apiModels);
    }

    // 2. Local Discovery (Ollama Instance)
    if (options.dataSources?.localDiscovery) {
        const localModels = await runLocalDiscovery(options, callbacks);
        results.push(...localModels);
    }

    return results;
}

/**
 * Discovers models using a configured cloud LLM (API-based)
 */
async function runApiDiscovery(
    options: SyncOptions,
    callbacks?: SyncCallbacks
): Promise<Model[]> {
    const { onLog } = callbacks || {};
    try {
        if (!options.apiConfig) return [];

        const hasValidKey = async (key: string, cfg: ProviderCfg): Promise<boolean> => {
            if (cfg.apiKey && cfg.apiKey.trim() !== '') return true;
            return false;
        };

        let discoveryProvider: string | null = null;
        let discoveryCfg: ProviderCfg | null = null;

        if (options.preferredModelProvider) {
            const cfg = options.apiConfig[options.preferredModelProvider as keyof typeof options.apiConfig];
            if (cfg?.enabled && await hasValidKey(options.preferredModelProvider, cfg)) {
                discoveryProvider = options.preferredModelProvider;
                discoveryCfg = cfg;
            }
        }

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
            if (onLog) onLog(`API Discovery: Searching using ${discoveryProvider}...`);
            const systemPrompt = options.systemPrompt || SYSTEM_PROMPT_DISCOVERY;
            const discoveryPrompt = USER_PROMPT_DISCOVERY;

            const llmResults = await callProviderLLM(
                discoveryProvider as ProviderKey,
                discoveryCfg,
                systemPrompt,
                discoveryPrompt
            );

            if (Array.isArray(llmResults) && llmResults.length) {
                if (onLog) onLog(`API Discovery: Found ${llmResults.length} new models`);
                return llmResults;
            }
        }
    } catch (e) {
        if (onLog) onLog(`[API Discovery] Error: ${e instanceof Error ? e.message : String(e)}`);
    }
    return [];
}

/**
 * Discovers models installed on the local machine (e.g. via Ollama)
 */
async function runLocalDiscovery(
    options: SyncOptions,
    callbacks?: SyncCallbacks
): Promise<Model[]> {
    const { onLog } = callbacks || {};
    try {
        const ollamaCfg = options.apiConfig?.ollama;
        if (!ollamaCfg || !ollamaCfg.enabled) return [];

        if (onLog) onLog(`Local Discovery: Checking local Ollama instance...`);

        let baseUrl = ollamaCfg.baseUrl || 'http://127.0.0.1:11434';
        if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

        // Standard Ollama tags endpoint
        const url = `${baseUrl}/api/tags`;

        let data: any;
        if ((window as any).electronAPI?.proxyRequest) {
            const result = await (window as any).electronAPI.proxyRequest({ url, method: 'GET' });
            if (result?.success) data = result.data;
        } else {
            const res = await fetch(url);
            if (res.ok) data = await res.json();
        }

        if (data && Array.isArray(data.models)) {
            const models: Model[] = data.models.map((m: any) => ({
                id: `local-ollama-${m.name.replace(':', '-')}`,
                name: m.name,
                provider: 'Local (Ollama)',
                domain: 'LLM',
                source: 'Local',
                updated_at: m.modified_at,
                release_date: m.modified_at,
                tags: ['local', 'ollama'],
                parameters: m.details?.parameter_size || '',
                context_window: 'Varies',
                license: {
                    name: 'Local',
                    type: 'Custom',
                    commercial_use: true,
                    attribution_required: false,
                    share_alike: false,
                    copyleft: false,
                    notes: 'Model installed locally'
                },
                hosting: {
                    weights_available: true,
                    api_available: true,
                    on_premise_friendly: true,
                    providers: ['Ollama (Local)']
                }
            }));

            if (onLog) onLog(`Local Discovery: Found ${models.length} local models`);
            return models;
        }
    } catch (e) {
        if (onLog) onLog(`[Local Discovery] Error: ${e instanceof Error ? e.message : String(e)}`);
    }
    return [];
}

