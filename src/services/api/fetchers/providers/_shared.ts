/**
 * Shared helpers for provider model-API fetchers.
 *
 * These sources expose a clean JSON `/models` endpoint (mostly OpenAI-compatible
 * `{ data: [...] }`). They host first-party / curated commercial models accessed
 * via API — no weights, no on-prem. We map each to the canonical Model type and
 * tag them `api`/`commercial` so the merge layer can dedupe the same model across
 * providers by name.
 */

import { Model, LicenseInfo, Domain } from '../../../../types';
import { isElectron } from '../../../../utils/electron';

/**
 * Cross-environment JSON fetch.
 *
 * In packaged Electron we proxy through the main process (which enforces the
 * host allowlist in electron/security.js) so cross-origin + auth-header requests
 * work. In dev/web we hit the API directly. Never log header values — they may
 * contain API keys.
 */
export async function fetchProviderJson<T>(
    url: string,
    headers: Record<string, string> = {},
    abortSignal?: AbortSignal
): Promise<T> {
    if (abortSignal?.aborted) {
        throw new DOMException('Provider fetch aborted', 'AbortError');
    }

    if (isElectron() && window.electronAPI?.proxyRequest) {
        const res = await window.electronAPI.proxyRequest({ method: 'GET', url, headers });
        if (!res.success) {
            throw new Error(res.error || 'Provider proxy request failed');
        }
        return (typeof res.data === 'string' ? JSON.parse(res.data) : res.data) as T;
    }

    const r = await fetch(url, {
        headers: { Accept: 'application/json', ...headers },
        signal: abortSignal,
    });
    if (!r.ok) {
        throw new Error(`Provider request failed: ${r.status} ${r.statusText}`);
    }
    return (await r.json()) as T;
}

/**
 * Hosted commercial models accessed via API: closed weights, attribution
 * required by ToS, not on-prem friendly. Individual fetchers override when the
 * underlying model is actually open-weights (e.g. Together/Fireworks/DeepInfra
 * host open models — but the *access* is still via a commercial API, so we keep
 * this conservative and let HuggingFace/Ollama supply the open-weights signal
 * when the same model merges in).
 */
export const COMMERCIAL_API_LICENSE: LicenseInfo = {
    name: 'Proprietary',
    type: 'Proprietary',
    commercial_use: true,
    attribution_required: true,
    share_alike: false,
    copyleft: false,
    notes: 'Commercial API access; see provider terms.',
};

export const COMMERCIAL_API_HOSTING = {
    weights_available: false,
    api_available: true,
    on_premise_friendly: false,
};

/**
 * Infer a coarse domain from a model id/name. Provider `/models` endpoints
 * rarely declare modality, so we keyword-match. Defaults to 'LLM' because these
 * are overwhelmingly text/chat catalogs — pass a different `fallback` for image/
 * audio-heavy providers.
 */
export function inferDomainFromId(id: string, fallback: Domain = 'LLM'): Domain {
    const s = (id || '').toLowerCase();
    if (/(embed|embedding|bge|gte|e5\b)/.test(s)) return 'Other';
    if (/(whisper|speech-to-text|stt|transcrib|asr)/.test(s)) return 'ASR';
    if (/(tts|text-to-speech|speech-?\d|voice|audio|sonic|playht|elevenlabs)/.test(s)) return 'TTS';
    if (/(dall-?e|image|flux|stable-?diffusion|sdxl|imagen|playground-v|kandinsky|recraft)/.test(s)) return 'ImageGen';
    if (/(video|sora|veo|ltx|mochi|wan-?\d|kling)/.test(s)) return 'VideoGen';
    if (/(vl\b|vlm|vision|llava|multimodal|-vl-|pixtral|moondream)/.test(s)) return 'VLM';
    if (/(rerank|guard|moderation|classifier)/.test(s)) return 'Other';
    return fallback;
}

/**
 * Convert a unix-seconds timestamp (OpenAI `created`) to ISO YYYY-MM-DD.
 */
export function unixToIsoDate(created?: number | null): string | null {
    if (created == null || !Number.isFinite(created) || created <= 0) return null;
    // OpenAI `created` is seconds; guard against ms by magnitude.
    const ms = created > 1e12 ? created : created * 1000;
    const d = new Date(ms);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
}

/** Build the canonical id used for cross-source dedupe by exact id is avoided —
 * we namespace by source so the *name*-based matcher does the merging. */
export function namespacedId(source: string, modelId: string): string {
    return `${source}:${modelId}`;
}
