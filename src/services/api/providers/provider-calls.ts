/**
 * Provider Calls Module
 * Handles API calls to various LLM providers (OpenAI, Anthropic, Google, etc.)
 */

import { Model, ProviderCfg, ProviderKey } from "../../../types";
import { safeJsonFromText } from "../../../utils/format";
import { globalRateLimiter } from '../../rateLimiter';
import { getEffectiveApiKey } from './api-key-manager';
import { proxyUrl, useProxy, bypassOpenAIProxy } from '../config';
import { buildProviderRequest } from './request-builder';

/**
 * Helper to make API calls through Electron's proxy to bypass CORS
 * Falls back to direct fetch in browser/non-Electron environments
 */
async function electronProxyFetch(
    url: string,
    options: { method: string; headers: Record<string, string>; body?: any; signal?: AbortSignal }
): Promise<{ ok: boolean; status: number; data?: any; error?: string }> {
    // Check if running in Electron with proxy available
    if (typeof window !== 'undefined' && (window as any).electronAPI?.proxyRequest) {
        try {
            const result = await (window as any).electronAPI.proxyRequest({
                url,
                method: options.method,
                headers: options.headers,
                body: options.body
            });
            if (result?.success) {
                return { ok: true, status: 200, data: result.data };
            } else {
                return { ok: false, status: 500, error: result?.error || 'Proxy request failed' };
            }
        } catch (err: any) {
            return { ok: false, status: 500, error: err?.message || 'Proxy request error' };
        }
    }

    // Fallback to direct fetch (will hit CORS in browser, but works in Node/SSR)
    const response = await fetch(url, {
        method: options.method,
        headers: options.headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: options.signal
    });

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        return { ok: false, status: response.status, error: text || response.statusText };
    }

    const data = await response.json();
    return { ok: true, status: response.status, data };
}

/**
 * Returns known Anthropic Claude models since they don't have a public /models API
 */
function getAnthropicModels(): Model[] {
    const models = [
        { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', context: '200K', released: '2025-05-14' },
        { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', context: '200K', released: '2025-05-14' },
        { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet', context: '200K', released: '2025-02-19' },
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (Oct 2024)', context: '200K', released: '2024-10-22' },
        { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet', context: '200K', released: '2024-06-20' },
        { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', context: '200K', released: '2024-10-22' },
        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', context: '200K', released: '2024-02-29' },
        { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', context: '200K', released: '2024-02-29' },
        { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', context: '200K', released: '2024-03-07' },
    ];

    return models.map(m => ({
        id: m.id,
        name: m.name,
        provider: 'Anthropic',
        domain: 'LLM' as const,
        source: 'anthropic',
        url: 'https://www.anthropic.com/claude',
        license: {
            name: 'Proprietary',
            type: 'Proprietary' as const,
            commercial_use: true,
            attribution_required: false,
            share_alike: false,
            copyleft: false
        },
        pricing: [],
        updated_at: m.released,
        release_date: m.released,
        tags: ['claude', 'conversational', 'reasoning'],
        parameters: '',
        context_window: m.context,
        hosting: {
            weights_available: false,
            api_available: true,
            on_premise_friendly: false
        }
    }));
}

/**
 * Returns known Perplexity models since they don't have a public /models API
 */
function getPerplexityModels(): Model[] {
    const models = [
        { id: 'sonar-pro', name: 'Sonar Pro', context: '200K', released: '2024-11-01' },
        { id: 'sonar', name: 'Sonar', context: '128K', released: '2024-11-01' },
        { id: 'sonar-reasoning-pro', name: 'Sonar Reasoning Pro', context: '128K', released: '2024-12-01' },
        { id: 'sonar-reasoning', name: 'Sonar Reasoning', context: '128K', released: '2024-12-01' },
        { id: 'sonar-deep-research', name: 'Sonar Deep Research', context: '128K', released: '2024-12-01' },
    ];

    return models.map(m => ({
        id: m.id,
        name: m.name,
        provider: 'Perplexity',
        domain: 'LLM' as const,
        source: 'perplexity',
        url: 'https://www.perplexity.ai/',
        license: {
            name: 'Proprietary',
            type: 'Proprietary' as const,
            commercial_use: true,
            attribution_required: false,
            share_alike: false,
            copyleft: false
        },
        pricing: [],
        updated_at: m.released,
        release_date: m.released,
        tags: ['search', 'reasoning', 'web'],
        parameters: '',
        context_window: m.context,
        hosting: {
            weights_available: false,
            api_available: true,
            on_premise_friendly: false
        }
    }));
}

/**
 * Call a provider's models endpoint to fetch available models
 * @param key - The provider key (e.g., 'openai', 'anthropic')
 * @param cfg - Provider configuration including API key and model
 * @param systemPrompt - System prompt (unused for model listing)
 * @param userPrompt - User prompt (unused for model listing)
 * @returns Array of models from the provider
 */
export async function callProvider(key: ProviderKey, cfg: ProviderCfg, systemPrompt: string, userPrompt: string): Promise<Model[]> {
    // Get effective API key (local or global)
    const effectiveKey = await getEffectiveApiKey(key, cfg.apiKey);
    if (!effectiveKey) throw new Error('no key');

    // Apply rate limiting before making the request
    await globalRateLimiter.waitForSlot();

    let url = '';
    let headers: Record<string, string> = {};

    // Define provider-specific endpoints and headers
    switch (key) {
        case "openai":
            // OpenAI API: GET /v1/models with Bearer auth
            url = "https://api.openai.com/v1/models";
            headers = { "Authorization": `Bearer ${effectiveKey}` };
            break;
        case "anthropic":
            // Anthropic API: GET /v1/models with x-api-key and anthropic-version headers
            url = "https://api.anthropic.com/v1/models";
            headers = {
                "x-api-key": effectiveKey!,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json"
            };
            break;
        case "cohere":
            // Cohere API: GET /v1/models with Bearer auth (note: api.cohere.com, not .ai)
            url = "https://api.cohere.com/v1/models";
            headers = { "Authorization": `Bearer ${effectiveKey}` };
            break;
        case "google":
            // Google Gemini API: GET /v1beta/models with x-goog-api-key header
            url = "https://generativelanguage.googleapis.com/v1beta/models";
            headers = { "x-goog-api-key": effectiveKey! };
            break;
        case "deepseek":
            // DeepSeek API: GET /v1/models with Bearer auth (OpenAI-compatible)
            url = "https://api.deepseek.com/v1/models";
            headers = { "Authorization": `Bearer ${effectiveKey}` };
            break;
        case "perplexity":
            // Perplexity has no /models endpoint - return known models
            console.log('[perplexity] Returning known Perplexity models (no /models API available)');
            return getPerplexityModels();
        case "openrouter":
            // OpenRouter API: GET /api/v1/models with Bearer auth
            url = "https://openrouter.ai/api/v1/models";
            headers = { "Authorization": `Bearer ${effectiveKey}`, "HTTP-Referer": typeof window !== 'undefined' ? window.location.origin : '' };
            break;
        default:
            throw new Error(`Unknown provider: ${key}`);
    }
    try {
        console.log(`[${key}] Fetching models from ${url}...`);

        // Use Electron proxy to bypass CORS
        const result = await electronProxyFetch(url, { method: 'GET', headers });

        if (!result.ok) {
            const text = result.error || '';
            console.error(`[${key}] ERROR: Status ${result.status}. Response: ${text}`);

            // Parse error response if possible
            let errorMessage = `${key} API error: ${result.status}`;
            let errorJson;

            try {
                // Try to parse the error response as JSON (if text looks like JSON)
                if (text.trim().startsWith('{')) {
                    errorJson = safeJsonFromText(text);
                    if (errorJson && (errorJson.error || errorJson.message)) {
                        // Add the specific error message from the API if available
                        errorMessage += ` - ${errorJson.error?.message || errorJson.message || ''}`;
                    }
                }
            } catch (e) {
                // Ignore parse errors
            }

            // If parsing fails or no message, use the status code to provide more context
            if (result.status === 401) {
                errorMessage = `${key} API unauthorized (401): API key may be invalid or expired`;
            } else if (result.status === 403) {
                errorMessage = `${key} API forbidden (403): Your account may not have access to this resource`;
            } else if (result.status === 404) {
                errorMessage = `${key} API endpoint not found (404): The API endpoint may have changed`;
            } else if (result.status === 429) {
                errorMessage = `${key} API rate limited (429): Too many requests, please try again later`;
            } else if (result.status >= 500) {
                errorMessage = `${key} API server error (${result.status}): The provider's service may be experiencing issues`;
            }

            throw new Error(errorMessage);
        }

        const data = result.data;

        // Different providers have different response structures
        let modelsRaw: any[] = [];

        if (key === 'openai') {
            modelsRaw = data.data || [];
        } else if (key === 'anthropic') {
            modelsRaw = data.data || [];
        } else if (key === 'cohere') {
            modelsRaw = data.models || [];
        } else if (key === 'google') {
            modelsRaw = data.models || [];
        } else if (key === 'deepseek') {
            modelsRaw = data.data || [];
        } else if (key === 'openrouter') {
            modelsRaw = data.data || [];
        } else {
            modelsRaw = data.data || data.models || [];
        }

        if (!Array.isArray(modelsRaw)) {
            console.error(`[${key}] API response didn't contain models array:`, data);
            return [];
        }

        const models: Model[] = modelsRaw.map((item: any) => {
            // Extract model ID based on provider-specific structure
            const modelId = item.id || item.modelId || item.slug || item.name;

            // Format provider name with first letter capitalized
            const providerName = key.charAt(0).toUpperCase() + key.slice(1);

            // Create standardized model object
            return {
                id: modelId,
                name: item.name || modelId,
                provider: providerName,
                domain: item.capabilities?.includes("vision") ? "Vision" : "LLM",
                source: key,
                url: item.url || "",
                license: {
                    name: item.license || "Proprietary",
                    type: "Proprietary",
                    commercial_use: true,
                    attribution_required: false,
                    share_alike: false,
                    copyleft: false
                },
                pricing: item.pricing && (item.pricing.input || item.pricing.output || item.pricing.flat) ? [{
                    unit: "tokens",
                    input: item.pricing.input || null,
                    output: item.pricing.output || null,
                    flat: item.pricing.flat || null,
                    currency: "USD"
                }] : [],
                updated_at: item.updated_at || "",
                release_date: item.created_at || item.release_date || "",
                tags: item.tags || [],
                parameters: item.parameters || item.param_count || "",
                context_window: item.context_window || item.context_length || "",
                hosting: {
                    weights_available: false,
                    api_available: true,
                    on_premise_friendly: false
                }
            };
        });

        console.log(`[${key}] Imported ${models.length} models.`);
        return models;
    } catch (err: any) {
        console.error(`[${key}] Fetch error: ${err.message || err}`);
        return []; // Return empty array instead of throwing to prevent app from crashing
    }
}

/**
 * Call provider for text response (not JSON)
 * @param key - The provider key
 * @param cfg - Provider configuration
 * @param systemPrompt - System prompt for the LLM
 * @param userPrompt - User prompt for the LLM
 * @param options - Optional parameters including abort signal
 * @returns Text response from the LLM
 */
export async function callProviderText(
    key: ProviderKey,
    cfg: ProviderCfg,
    systemPrompt: string,
    userPrompt: string,
    options?: { signal?: AbortSignal }
): Promise<string> {
    // Get effective API key (local or global)
    const effectiveKey = await getEffectiveApiKey(key, cfg.apiKey);
    const isOllama = cfg.protocol === 'ollama' || key === 'ollama';
    if (!effectiveKey && !isOllama) throw new Error('no key');

    // Apply rate limiting before making the request
    await globalRateLimiter.waitForSlot();

    // For OpenAI, try direct connection if proxy fails or if bypass is enabled
    const useDirectForOpenAI = key === 'openai' && (!useProxy || bypassOpenAIProxy);

    // Retry logic for connection issues
    let lastError: Error | null = null;
    const maxRetries = useDirectForOpenAI ? 1 : 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const { url, method, headers, body } = buildProviderRequest(
                key, cfg, systemPrompt, userPrompt, effectiveKey || '', 'text'
            );

            // Use Electron proxy to bypass CORS
            const result = await electronProxyFetch(url, {
                method,
                headers,
                body,
                signal: options?.signal
            });

            if (!result.ok) {
                const errorText = result.error || 'Unknown error';
                if (result.status === 429) {
                    throw new Error(`Rate limit exceeded. Please wait before trying again. Your API plan may have reached its limit.`);
                } else if (result.status === 401) {
                    throw new Error(`API authentication failed. Please check your API key.`);
                } else if (result.status === 403) {
                    throw new Error(`API access forbidden. Your API key may not have the required permissions.`);
                } else if (result.status === 402) {
                    throw new Error(`Payment required. Please check your API billing and usage limits.`);
                } else {
                    throw new Error(`HTTP ${result.status}: ${errorText}`);
                }
            }

            const data = result.data;

            // Extract text content from response based on provider
            if (key === 'anthropic' || (cfg.isCustom && cfg.protocol === 'anthropic')) {
                return data.content?.[0]?.text || '';
            } else if (key === 'google' || (cfg.isCustom && cfg.protocol === 'google')) {
                // Google Gemini response format
                return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            } else if (key === 'cohere') {
                // Cohere V2 response format
                return data.message?.content?.[0]?.text || data.text || '';
            } else if (key === 'ollama' || (cfg.isCustom && cfg.protocol === 'ollama')) {
                return data.message?.content || '';
            } else {
                // OpenAI-compatible (OpenAI, OpenRouter, DeepSeek, Perplexity)
                return data.choices?.[0]?.message?.content || '';
            }
        }
        catch (error: any) {
            lastError = error;
            console.error(`Provider ${key} attempt ${attempt}/${maxRetries} error:`, error);
            if (error?.name === 'AbortError') {
                throw error; // do not retry on cancellation
            }

            // Check if it's a connection error that's worth retrying
            const isRetryableError = error?.code === 'ECONNRESET' ||
                error?.message?.includes('ECONNRESET') ||
                error?.message?.includes('network') ||
                error?.message?.includes('timeout') ||
                error?.message?.includes('502') ||
                error?.message?.includes('503') ||
                error?.message?.includes('504');

            if (!isRetryableError || attempt === maxRetries) {
                throw error;
            }

            // Wait before retry (exponential backoff)
            const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
            console.log(`Retrying in ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }

    throw lastError || new Error('All retry attempts failed');
}

/**
 * Call provider for JSON response (LLM validation/enrichment)
 * @param key - The provider key
 * @param cfg - Provider configuration
 * @param systemPrompt - System prompt for the LLM
 * @param userPrompt - User prompt for the LLM
 * @returns Array of models parsed from JSON response
 */
export async function callProviderLLM(key: ProviderKey, cfg: ProviderCfg, systemPrompt: string, userPrompt: string): Promise<Model[]> {
    // Get effective API key (local or global)
    const effectiveKey = await getEffectiveApiKey(key, cfg.apiKey);
    const isOllama = cfg.protocol === 'ollama' || key === 'ollama';
    if (!effectiveKey && !isOllama) throw new Error('no key');
    try {
        const { url, method, headers, body } = buildProviderRequest(
            key, cfg, systemPrompt, userPrompt, effectiveKey || '', 'json'
        );

        // Use Electron proxy to bypass CORS
        const result = await electronProxyFetch(url, {
            method,
            headers,
            body
        });

        if (!result.ok) {
            throw new Error(`LLM call failed: ${result.status} ${result.error || 'Unknown error'}`);
        }

        const data = result.data;
        // Parse provider-specific responses
        if (key === 'anthropic' || (cfg.isCustom && cfg.protocol === 'anthropic')) {
            const text = data?.content?.[0]?.text || '';
            const json = safeJsonFromText(text) || {};
            return Array.isArray(json) ? json : [json];
        } else if (key === 'google' || (cfg.isCustom && cfg.protocol === 'google')) {
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const json = safeJsonFromText(text) || {};
            return Array.isArray(json) ? json : [json];
        } else if (key === 'cohere') {
            const text = data?.message?.content?.[0]?.text || data?.text || data?.response || '';
            const json = safeJsonFromText(text) || {};
            return Array.isArray(json) ? json : [json];
        } else if (key === 'ollama' || (cfg.isCustom && cfg.protocol === 'ollama')) {
            const text = data.message?.content || '';
            const json = safeJsonFromText(text) || {};
            return Array.isArray(json) ? json : [json];
        } else {
            const content = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.message || data?.choices?.[0]?.text || '';
            const json = safeJsonFromText(typeof content === 'string' ? content : String(content)) || {};
            return Array.isArray(json) ? json : [json];
        }
    } catch (err: any) {
        console.error('[LLM Validation] Error:', err?.message || err);
        throw err;
    }
}
