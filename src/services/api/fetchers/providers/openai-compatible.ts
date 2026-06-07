/**
 * Generic builder for OpenAI-compatible `/models` providers.
 *
 * Many provider APIs return `{ object: "list", data: [{ id, created, owned_by }] }`
 * and authenticate with a `Bearer <key>` header. This module factors out that
 * shape so each provider is just a tiny config object. Providers with richer
 * payloads (Together, Fireworks) extend the raw type and pass a custom `enrich`.
 */

import { Model, Pricing, Domain } from '../../../../types';
import { Fetcher, SyncOptions, SyncCallbacks, SyncResult } from '../../../sync/SyncTypes';
import { isModelComplete } from '../../filtering';
import {
    fetchProviderJson,
    inferDomainFromId,
    unixToIsoDate,
    namespacedId,
    COMMERCIAL_API_LICENSE,
    COMMERCIAL_API_HOSTING,
} from './_shared';

/** Minimal OpenAI-compatible model entry; providers may add fields. */
export interface OpenAICompatModel {
    id: string;
    object?: string;
    created?: number;
    owned_by?: string;
    // Common extensions seen across providers:
    context_length?: number | null;
    context_window?: number | null;
    type?: string;                  // together: "chat" | "image" | "embedding" | ...
    display_name?: string;
    organization?: string;
    pricing?: Record<string, number | string | null | undefined>;
    [key: string]: unknown;
}

interface OpenAICompatResponse {
    object?: string;
    data: OpenAICompatModel[];
}

export interface ProviderConfig {
    /** Catalog key in MODEL_SOURCES / dataSources (e.g. 'groq'). */
    key: string;
    /** Display name. */
    name: string;
    /** `source` value written onto every Model (catalog key family label). */
    source: string;
    /** Full models endpoint URL. */
    url: string;
    /** Default domain when id-inference is inconclusive. */
    defaultDomain?: Domain;
    /** Brand/provider attributed to each model when `owned_by` is missing. */
    providerLabel?: string;
    /** Build auth headers from the key (default: Bearer). */
    authHeaders?: (key: string) => Record<string, string>;
    /** Hook to pull extra fields (pricing, context) into the mapped Model. */
    enrich?: (raw: OpenAICompatModel, model: Model) => Model;
}

function defaultBearer(key: string): Record<string, string> {
    return { Authorization: `Bearer ${key}` };
}

/**
 * Map one OpenAI-compatible entry to the canonical Model. Pure given its config.
 */
export function mapOpenAICompatModel(raw: OpenAICompatModel, cfg: ProviderConfig): Model {
    const provider = raw.owned_by || raw.organization || cfg.providerLabel || cfg.name;

    const ctxRaw = raw.context_length ?? raw.context_window ?? null;

    let model: Model = {
        id: namespacedId(cfg.key, raw.id),
        name: raw.display_name || raw.id,
        description: null,
        provider,
        domain: inferDomainFromId(raw.id, cfg.defaultDomain ?? 'LLM'),
        source: cfg.source,
        url: null,
        repo: null,
        license: COMMERCIAL_API_LICENSE,
        pricing: [],
        updated_at: null,
        release_date: unixToIsoDate(raw.created),
        tags: ['api', 'commercial', cfg.key],
        parameters: null,
        context_window: ctxRaw != null ? String(ctxRaw) : null,
        indemnity: 'Unknown',
        data_provenance: 'Commercial',
        usage_restrictions: [],
        hosting: { ...COMMERCIAL_API_HOSTING, providers: [cfg.name] },
        downloads: null,
        analytics: {},
    };

    if (cfg.enrich) model = cfg.enrich(raw, model);
    return model;
}

/** Helper for providers exposing $/1M-token pricing fields. */
export function pricingFromPerMillion(
    modelName: string,
    input?: number | null,
    output?: number | null
): Pricing[] {
    if (input == null && output == null) return [];
    return [{
        model: modelName,
        unit: '1M tokens',
        input: input ?? null,
        output: output ?? null,
        currency: 'USD',
    }];
}

/**
 * Build a Fetcher for an OpenAI-compatible provider.
 *
 * Key-gated: `isEnabled` requires both the dataSources toggle AND a non-empty
 * key in `options.providerApiKeys[cfg.key]`. The fetch gates again (returns
 * empty) so a missing key never produces a 401 storm — mirroring the
 * ArtificialAnalysis precedent.
 */
export function buildOpenAICompatFetcher(cfg: ProviderConfig): Fetcher {
    const getKey = (options: SyncOptions): string =>
        (options.apiConfig?.[cfg.key]?.apiKey || '').trim();

    return {
        id: cfg.key,
        name: cfg.name,
        isEnabled: (options: SyncOptions) =>
            options.dataSources?.[cfg.key] === true && getKey(options).length > 0,
        async fetch(options: SyncOptions, callbacks?: SyncCallbacks): Promise<SyncResult> {
            const key = getKey(options);
            if (!key) {
                console.log(`[${cfg.name}] Skipping fetch: no API key provided`);
                return { complete: [], flagged: [] };
            }
            try {
                const headers = (cfg.authHeaders || defaultBearer)(key);
                const data = await fetchProviderJson<OpenAICompatResponse | OpenAICompatModel[]>(
                    cfg.url,
                    headers,
                    callbacks?.abortSignal
                );
                const list = Array.isArray(data) ? data : (data?.data ?? []);
                const models = list.map(raw => mapOpenAICompatModel(raw, cfg));
                return {
                    complete: models.filter(isModelComplete),
                    flagged: models.filter(m => !isModelComplete(m)),
                };
            } catch (err: any) {
                if (err?.name === 'AbortError') throw err;
                console.error(`[${cfg.name}] Fetch error:`, err?.message || err);
                return { complete: [], flagged: [] };
            }
        },
    };
}
