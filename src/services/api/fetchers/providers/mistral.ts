/**
 * Mistral AI models fetcher.
 *
 * Source: https://api.mistral.ai/v1/models
 * Auth: `Authorization: Bearer <key>`.
 * Shape: { object:"list", data: [{ id, object, created, owned_by, name,
 *         description, max_context_length, capabilities: {...}, aliases:[],
 *         deprecation }] }.
 */

import { Model } from '../../../../types';
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

export const MISTRAL_MODELS_URL = 'https://api.mistral.ai/v1/models';
const SOURCE = 'Mistral AI';

interface RawMistralModel {
    id: string;
    object?: string;
    created?: number;                // unix seconds
    owned_by?: string;
    name?: string;
    description?: string;
    max_context_length?: number | null;
    aliases?: string[];
    deprecation?: string | null;
    capabilities?: {
        completion_chat?: boolean;
        vision?: boolean;
        function_calling?: boolean;
        ocr?: boolean;
        [k: string]: unknown;
    };
}

interface MistralResponse {
    object?: string;
    data: RawMistralModel[];
}

function mistralDomain(raw: RawMistralModel): Model['domain'] {
    if (raw.capabilities?.vision) return 'VLM';
    if (raw.capabilities?.ocr) return 'VLM';
    if (/embed/i.test(raw.id)) return 'Other';
    return inferDomainFromId(raw.id, 'LLM');
}

/**
 * Map a raw Mistral model into the canonical Model record. Pure.
 */
export function mapMistralModel(raw: RawMistralModel): Model {
    const tags = ['api', 'commercial', 'mistral'];
    if (raw.capabilities?.function_calling) tags.push('function-calling');
    if (raw.capabilities?.vision) tags.push('vision');
    if (raw.deprecation) tags.push('deprecated');
    (raw.aliases || []).forEach(a => tags.push(`alias:${a}`));

    return {
        id: namespacedId('mistral', raw.id),
        name: raw.name || raw.id,
        description: raw.description ?? null,
        provider: raw.owned_by && raw.owned_by !== 'mistralai' ? raw.owned_by : 'Mistral AI',
        domain: mistralDomain(raw),
        source: SOURCE,
        url: 'https://docs.mistral.ai/getting-started/models/models_overview/',
        repo: null,
        license: COMMERCIAL_API_LICENSE,
        pricing: [],
        updated_at: null,
        release_date: unixToIsoDate(raw.created),
        tags,
        parameters: null,
        context_window: raw.max_context_length != null ? String(raw.max_context_length) : null,
        indemnity: 'Unknown',
        data_provenance: 'Commercial',
        usage_restrictions: raw.deprecation ? [`Deprecated: ${raw.deprecation}`] : [],
        hosting: { ...COMMERCIAL_API_HOSTING, providers: ['Mistral AI'] },
        downloads: null,
        analytics: {},
    };
}

export async function fetchMistralModels(apiKey: string, abortSignal?: AbortSignal): Promise<SyncResult> {
    const headers = { Authorization: `Bearer ${apiKey}` };
    const data = await fetchProviderJson<MistralResponse>(MISTRAL_MODELS_URL, headers, abortSignal);
    const list = Array.isArray(data?.data) ? data.data : [];
    const models = list.map(mapMistralModel);
    return {
        complete: models.filter(isModelComplete),
        flagged: models.filter(m => !isModelComplete(m)),
    };
}

export const mistralFetcher: Fetcher = {
    id: 'mistral',
    name: 'Mistral AI',
    isEnabled: (options: SyncOptions) =>
        options.dataSources?.mistral === true &&
        (options.apiConfig?.mistral?.apiKey || '').trim().length > 0,
    async fetch(options: SyncOptions, callbacks?: SyncCallbacks): Promise<SyncResult> {
        const key = (options.apiConfig?.mistral?.apiKey || '').trim();
        if (!key) {
            console.log('[Mistral] Skipping fetch: no API key provided');
            return { complete: [], flagged: [] };
        }
        try {
            return await fetchMistralModels(key, callbacks?.abortSignal);
        } catch (err: any) {
            if (err?.name === 'AbortError') throw err;
            console.error('[Mistral] Fetch error:', err?.message || err);
            return { complete: [], flagged: [] };
        }
    },
};
