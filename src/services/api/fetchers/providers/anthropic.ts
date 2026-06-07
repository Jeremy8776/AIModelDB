/**
 * Anthropic models fetcher.
 *
 * Source: https://api.anthropic.com/v1/models
 * Auth: `x-api-key: <key>` + `anthropic-version: 2023-06-01` (both must be in
 * electron/security.js ALLOWED_HEADERS to survive the proxy).
 * Shape: { data: [{ id, display_name, created_at (RFC3339), max_input_tokens,
 *         type:"model", capabilities }], has_more, first_id, last_id }.
 */

import { Model } from '../../../../types';
import { Fetcher, SyncOptions, SyncCallbacks, SyncResult } from '../../../sync/SyncTypes';
import { isModelComplete } from '../../filtering';
import { normalizeDate } from '../../utils';
import {
    fetchProviderJson,
    namespacedId,
    COMMERCIAL_API_LICENSE,
    COMMERCIAL_API_HOSTING,
} from './_shared';

export const ANTHROPIC_MODELS_URL = 'https://api.anthropic.com/v1/models?limit=1000';
const ANTHROPIC_VERSION = '2023-06-01';
const SOURCE = 'Anthropic';

interface RawAnthropicModel {
    id: string;
    type?: string;
    display_name?: string;
    created_at?: string;             // RFC 3339
    max_input_tokens?: number;
    max_tokens?: number;
    capabilities?: {
        image_input?: { supported?: boolean };
        pdf_input?: { supported?: boolean };
        [k: string]: unknown;
    };
}

interface AnthropicResponse {
    data: RawAnthropicModel[];
    has_more?: boolean;
    first_id?: string;
    last_id?: string;
}

/**
 * Map a raw Anthropic model into the canonical Model record. Pure.
 */
export function mapAnthropicModel(raw: RawAnthropicModel): Model {
    const supportsImage = !!raw.capabilities?.image_input?.supported;
    const tags = ['api', 'commercial', 'anthropic', 'claude'];
    if (raw.capabilities?.pdf_input?.supported) tags.push('pdf-input');
    if (supportsImage) tags.push('vision');

    return {
        id: namespacedId('anthropic', raw.id),
        name: raw.display_name || raw.id,
        description: null,
        provider: 'Anthropic',
        domain: supportsImage ? 'VLM' : 'LLM',
        source: SOURCE,
        url: 'https://docs.anthropic.com/en/docs/about-claude/models',
        repo: null,
        license: COMMERCIAL_API_LICENSE,
        pricing: [],
        updated_at: null,
        release_date: normalizeDate(raw.created_at),
        tags,
        parameters: null,
        context_window: raw.max_input_tokens ? String(raw.max_input_tokens) : null,
        indemnity: 'VendorProgram',
        data_provenance: 'Commercial',
        usage_restrictions: [],
        hosting: { ...COMMERCIAL_API_HOSTING, providers: ['Anthropic'] },
        downloads: null,
        analytics: {},
    };
}

export async function fetchAnthropicModels(apiKey: string, abortSignal?: AbortSignal): Promise<SyncResult> {
    const headers = { 'x-api-key': apiKey, 'anthropic-version': ANTHROPIC_VERSION };
    const data = await fetchProviderJson<AnthropicResponse>(ANTHROPIC_MODELS_URL, headers, abortSignal);
    const list = Array.isArray(data?.data) ? data.data : [];
    const models = list.map(mapAnthropicModel);
    return {
        complete: models.filter(isModelComplete),
        flagged: models.filter(m => !isModelComplete(m)),
    };
}

export const anthropicFetcher: Fetcher = {
    id: 'anthropic',
    name: 'Anthropic',
    isEnabled: (options: SyncOptions) =>
        options.dataSources?.anthropic === true &&
        (options.apiConfig?.anthropic?.apiKey || '').trim().length > 0,
    async fetch(options: SyncOptions, callbacks?: SyncCallbacks): Promise<SyncResult> {
        const key = (options.apiConfig?.anthropic?.apiKey || '').trim();
        if (!key) {
            console.log('[Anthropic] Skipping fetch: no API key provided');
            return { complete: [], flagged: [] };
        }
        try {
            return await fetchAnthropicModels(key, callbacks?.abortSignal);
        } catch (err: any) {
            if (err?.name === 'AbortError') throw err;
            console.error('[Anthropic] Fetch error:', err?.message || err);
            return { complete: [], flagged: [] };
        }
    },
};
