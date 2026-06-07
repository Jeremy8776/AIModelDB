/**
 * Provider configs built on the OpenAI-compatible `/models` shape.
 *
 * Simple providers (openai, groq, xai, cerebras, perplexity) return the bare
 * `{ data: [{ id, created, owned_by }] }` envelope and need no enrichment.
 *
 * Together / Fireworks / DeepInfra return richer rows (type, pricing,
 * context_length) which we map via an `enrich` hook. All are key-gated.
 */

import { Model } from '../../../../types';
import { Fetcher } from '../../../sync/SyncTypes';
import { inferDomainFromId } from './_shared';
import {
    buildOpenAICompatFetcher,
    pricingFromPerMillion,
    OpenAICompatModel,
    ProviderConfig,
} from './openai-compatible';

// ── Simple OpenAI-list providers ────────────────────────────────────────────

export const openAIFetcher: Fetcher = buildOpenAICompatFetcher({
    key: 'openai',
    name: 'OpenAI',
    source: 'OpenAI',
    url: 'https://api.openai.com/v1/models',
    providerLabel: 'OpenAI',
    defaultDomain: 'LLM',
});

export const groqFetcher: Fetcher = buildOpenAICompatFetcher({
    key: 'groq',
    name: 'Groq',
    source: 'Groq',
    url: 'https://api.groq.com/openai/v1/models',
    // Groq hosts open models (Llama, Mixtral, Gemma...) — owned_by carries the
    // real creator (e.g. "Meta", "Mistral AI"), so we leave providerLabel off.
    defaultDomain: 'LLM',
    enrich: (raw: OpenAICompatModel, model: Model): Model => {
        // Groq exposes context_window directly.
        const ctx = (raw.context_window ?? raw.context_length) as number | undefined;
        if (ctx != null) model.context_window = String(ctx);
        return model;
    },
});

export const xaiFetcher: Fetcher = buildOpenAICompatFetcher({
    key: 'xai',
    name: 'xAI',
    source: 'xAI',
    url: 'https://api.x.ai/v1/models',
    providerLabel: 'xAI',
    defaultDomain: 'LLM',
});

export const cerebrasFetcher: Fetcher = buildOpenAICompatFetcher({
    key: 'cerebras',
    name: 'Cerebras',
    source: 'Cerebras',
    url: 'https://api.cerebras.ai/v1/models',
    // Cerebras serves open models (Llama, Qwen...) — owned_by carries creator.
    defaultDomain: 'LLM',
});

export const perplexityFetcher: Fetcher = buildOpenAICompatFetcher({
    key: 'perplexity',
    name: 'Perplexity',
    source: 'Perplexity',
    url: 'https://api.perplexity.ai/models',
    providerLabel: 'Perplexity',
    defaultDomain: 'LLM',
    enrich: (raw: OpenAICompatModel, model: Model): Model => {
        // Sonar models are online/search-augmented; tag for discoverability.
        if (/sonar/i.test(raw.id)) {
            model.tags = Array.from(new Set([...(model.tags || []), 'online-search', 'sonar']));
        }
        return model;
    },
});

// ── Together AI ─────────────────────────────────────────────────────────────
// Bare array of rich rows: { id, type, display_name, organization,
// context_length, license, pricing: { input, output, ... } } — pricing in
// dollars per 1M tokens.

interface TogetherModel extends OpenAICompatModel {
    type?: string;
    display_name?: string;
    organization?: string;
    context_length?: number | null;
    license?: string;
    link?: string;
    pricing?: { input?: number; output?: number; base?: number; finetune?: number; hourly?: number; cached_input?: number; [k: string]: number | string | null | undefined };
}

function togetherDomain(raw: TogetherModel): Model['domain'] {
    switch ((raw.type || '').toLowerCase()) {
        case 'chat':
        case 'language':
        case 'code': return inferDomainFromId(raw.id, 'LLM');
        case 'image': return 'ImageGen';
        case 'embedding': return 'Other';
        case 'moderation':
        case 'rerank': return 'Other';
        default: return inferDomainFromId(raw.id, 'LLM');
    }
}

export const togetherFetcher: Fetcher = buildOpenAICompatFetcher({
    key: 'together',
    name: 'Together AI',
    source: 'Together AI',
    url: 'https://api.together.xyz/v1/models',
    defaultDomain: 'LLM',
    enrich: (raw: TogetherModel, model: Model): Model => {
        model.domain = togetherDomain(raw);
        model.name = raw.display_name || raw.id;
        model.provider = raw.organization || raw.owned_by || 'Together AI';
        if (raw.context_length != null) model.context_window = String(raw.context_length);
        const p = raw.pricing;
        if (p && (p.input != null || p.output != null)) {
            model.pricing = pricingFromPerMillion(
                model.name,
                typeof p.input === 'number' ? p.input : null,
                typeof p.output === 'number' ? p.output : null
            );
        }
        if (raw.type) model.tags = Array.from(new Set([...(model.tags || []), `type:${raw.type}`]));
        return model;
    },
});

// ── Fireworks AI ────────────────────────────────────────────────────────────
// OpenAI-compatible serverless catalog: { data: [{ id, owned_by, created,
// context_length, ... }] }. id looks like "accounts/fireworks/models/llama-...".

interface FireworksModel extends OpenAICompatModel {
    context_length?: number | null;
    supports_chat?: boolean;
    supports_image_input?: boolean;
}

export const fireworksFetcher: Fetcher = buildOpenAICompatFetcher({
    key: 'fireworks',
    name: 'Fireworks AI',
    source: 'Fireworks AI',
    url: 'https://api.fireworks.ai/inference/v1/models',
    providerLabel: 'Fireworks AI',
    defaultDomain: 'LLM',
    enrich: (raw: FireworksModel, model: Model): Model => {
        // Strip the "accounts/.../models/" prefix for a readable name.
        const shortId = raw.id.includes('/') ? raw.id.split('/').pop() || raw.id : raw.id;
        model.name = raw.display_name || shortId;
        if (raw.context_length != null) model.context_window = String(raw.context_length);
        if (raw.supports_image_input) model.domain = 'VLM';
        return model;
    },
});

// ── DeepInfra ───────────────────────────────────────────────────────────────
// OpenAI-compatible: { data: [{ id, owned_by, created, ... }] }. DeepInfra hosts
// open models across LLM/image/speech/embeddings; id-inference picks the domain.

export const deepinfraFetcher: Fetcher = buildOpenAICompatFetcher({
    key: 'deepinfra',
    name: 'DeepInfra',
    source: 'DeepInfra',
    url: 'https://api.deepinfra.com/v1/openai/models',
    defaultDomain: 'LLM',
    enrich: (raw: OpenAICompatModel, model: Model): Model => {
        // DeepInfra ids look like "meta-llama/Llama-3.3-70B-Instruct" — the org
        // prefix is the real creator.
        if (raw.id.includes('/') && (!raw.owned_by || raw.owned_by === 'deepinfra')) {
            model.provider = raw.id.split('/')[0];
        }
        return model;
    },
});

// Convenience: every OpenAI-compatible provider fetcher.
export const openAICompatProviderFetchers: Fetcher[] = [
    openAIFetcher,
    groqFetcher,
    xaiFetcher,
    cerebrasFetcher,
    perplexityFetcher,
    togetherFetcher,
    fireworksFetcher,
    deepinfraFetcher,
];
