/**
 * OpenRouter fetcher.
 *
 * Source: https://openrouter.ai/api/v1/models — PUBLIC, no API key required.
 * Returns `{ data: [...] }` with the richest provider catalog available:
 * per-model pricing (prompt/completion $/token), context length, and an
 * `architecture` block describing modality. We map each entry to the canonical
 * Model type.
 */

import { Model, Pricing } from '../../../../types';
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

export const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
const SOURCE = 'OpenRouter';

interface RawOpenRouterModel {
    id: string;                       // e.g. "anthropic/claude-3.5-sonnet"
    canonical_slug?: string;
    name?: string;                    // e.g. "Anthropic: Claude 3.5 Sonnet"
    created?: number;                 // unix seconds
    description?: string;
    context_length?: number | null;
    architecture?: {
        modality?: string;            // e.g. "text->text", "text+image->text"
        input_modalities?: string[];
        output_modalities?: string[];
        tokenizer?: string;
    };
    pricing?: {
        prompt?: string;              // $ per token, as string
        completion?: string;
        request?: string;
        image?: string;
    };
    top_provider?: {
        context_length?: number | null;
        max_completion_tokens?: number | null;
        is_moderated?: boolean;
    };
    per_request_limits?: unknown;
    supported_parameters?: string[];
}

interface OpenRouterResponse {
    data: RawOpenRouterModel[];
}

/** OpenRouter ids are "vendor/model". The vendor is the real model provider. */
function providerFromId(id: string, name?: string): string | null {
    if (name && name.includes(':')) return name.split(':')[0].trim();
    if (id.includes('/')) return id.split('/')[0].trim();
    return null;
}

/** Convert OpenRouter's "$ per token" strings to "$ per 1M tokens" numbers. */
function toPerMillion(perToken?: string): number | null {
    if (!perToken) return null;
    const n = Number(perToken);
    if (!Number.isFinite(n) || n < 0) return null;
    // "0" means free; keep it as 0 so the merge layer records a free tier.
    return Math.round(n * 1_000_000 * 1e6) / 1e6;
}

function domainFromArchitecture(raw: RawOpenRouterModel): Model['domain'] {
    const out = raw.architecture?.output_modalities || [];
    const inp = raw.architecture?.input_modalities || [];
    const modality = (raw.architecture?.modality || '').toLowerCase();

    if (out.includes('image') || modality.includes('->image')) return 'ImageGen';
    if (inp.includes('image') || modality.includes('image')) return 'VLM';
    if (inp.includes('audio') || out.includes('audio')) return 'Audio';
    // Fall back to id-based inference, defaulting to LLM.
    return inferDomainFromId(raw.id, 'LLM');
}

/**
 * Map a raw OpenRouter model to the canonical Model record.
 * Pure — unit-tested in isolation.
 */
export function mapOpenRouterModel(raw: RawOpenRouterModel): Model {
    const provider = providerFromId(raw.id, raw.name);

    const pricing: Pricing[] = [];
    const input = toPerMillion(raw.pricing?.prompt);
    const output = toPerMillion(raw.pricing?.completion);
    if (input != null || output != null) {
        pricing.push({
            model: raw.name || raw.id,
            unit: '1M tokens',
            input: input ?? null,
            output: output ?? null,
            currency: 'USD',
            url: `https://openrouter.ai/${raw.id}`,
        });
    }

    const ctx = raw.context_length ?? raw.top_provider?.context_length ?? null;

    const tags = ['api', 'commercial', 'openrouter'];
    if (raw.architecture?.tokenizer) tags.push(`tokenizer:${raw.architecture.tokenizer}`);
    if (raw.architecture?.modality) tags.push(`modality:${raw.architecture.modality}`);

    return {
        id: namespacedId('openrouter', raw.id),
        name: raw.name || raw.id,
        description: raw.description ?? null,
        provider: provider,
        domain: domainFromArchitecture(raw),
        source: SOURCE,
        url: `https://openrouter.ai/${raw.id}`,
        repo: null,
        license: COMMERCIAL_API_LICENSE,
        pricing: pricing.length ? pricing : [],
        updated_at: null,
        release_date: unixToIsoDate(raw.created),
        tags,
        parameters: null,
        context_window: ctx != null ? String(ctx) : null,
        indemnity: 'Unknown',
        data_provenance: 'Commercial',
        usage_restrictions: [],
        hosting: { ...COMMERCIAL_API_HOSTING },
        downloads: null,
        analytics: {},
    };
}

export async function fetchOpenRouterModels(abortSignal?: AbortSignal): Promise<SyncResult> {
    const data = await fetchProviderJson<OpenRouterResponse>(OPENROUTER_MODELS_URL, {}, abortSignal);
    const list = Array.isArray(data?.data) ? data.data : [];
    const models = list.map(mapOpenRouterModel);
    return {
        complete: models.filter(isModelComplete),
        flagged: models.filter(m => !isModelComplete(m)),
    };
}

export const openRouterFetcher: Fetcher = {
    id: 'openrouter',
    name: 'OpenRouter',
    isEnabled: (options: SyncOptions) => options.dataSources?.openrouter === true,
    async fetch(_options: SyncOptions, callbacks?: SyncCallbacks): Promise<SyncResult> {
        try {
            return await fetchOpenRouterModels(callbacks?.abortSignal);
        } catch (err: any) {
            if (err?.name === 'AbortError') throw err;
            console.error('[OpenRouter] Fetch error:', err?.message || err);
            return { complete: [], flagged: [] };
        }
    },
};
