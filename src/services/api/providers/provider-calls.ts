/**
 * Provider Calls Module
 * Handles API calls to various LLM providers (OpenAI, Anthropic, Google, etc.)
 */

import { Model, ProviderCfg, ProviderKey } from "../../../types";
import { safeJsonFromText } from "../../../utils/format";
import { globalRateLimiter } from '../../rateLimiter';
import { getEffectiveApiKey } from './api-key-manager';
import { proxyUrl, useProxy, bypassOpenAIProxy } from '../config';

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
    const status = globalRateLimiter.getStatus();
    console.log(`Rate limiter status: ${status.remaining} requests remaining, reset in ${Math.round(status.resetIn / 1000)}s`);

    let url = '';
    let headers: Record<string, string> = {};

    // Define provider-specific endpoints and headers
    switch (key) {
        case "openai":
            // OpenAI API: GET /v1/models with Bearer auth
            url = proxyUrl("/openai-api/models", "https://api.openai.com/v1/models");
            headers = { "Authorization": `Bearer ${effectiveKey}` };
            break;
        case "anthropic":
            // Anthropic API: GET /v1/models with x-api-key and anthropic-version headers
            url = proxyUrl("/anthropic-api/v1/models", "https://api.anthropic.com/v1/models");
            headers = {
                "x-api-key": effectiveKey!,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json"
            };
            break;
        case "cohere":
            // Cohere API: GET /v1/models with Bearer auth (note: api.cohere.com, not .ai)
            url = proxyUrl("/cohere-api/v1/models", "https://api.cohere.com/v1/models");
            headers = { "Authorization": `Bearer ${effectiveKey}` };
            break;
        case "google":
            // Google Gemini API: GET /v1beta/models with x-goog-api-key header
            url = proxyUrl("/google-api/v1beta/models", "https://generativelanguage.googleapis.com/v1beta/models");
            headers = { "x-goog-api-key": effectiveKey! };
            break;
        case "deepseek":
            // DeepSeek API: GET /v1/models with Bearer auth (OpenAI-compatible)
            url = proxyUrl("/deepseek-api/v1/models", "https://api.deepseek.com/v1/models");
            headers = { "Authorization": `Bearer ${effectiveKey}` };
            break;
        case "perplexity":
            // Perplexity has no /models endpoint - return known models
            console.log('[perplexity] Returning known Perplexity models (no /models API available)');
            return getPerplexityModels();
        case "openrouter":
            // OpenRouter API: GET /api/v1/models with Bearer auth
            url = proxyUrl("/openrouter-api/v1/models", "https://openrouter.ai/api/v1/models");
            headers = { "Authorization": `Bearer ${effectiveKey}`, "HTTP-Referer": window.location.origin };
            break;
        default:
            throw new Error(`Unknown provider: ${key}`);
    }
    try {
        console.log(`[${key}] Fetching models from ${url}...`);
        const resp = await fetch(url, { headers });
        if (!resp.ok) {
            const text = await resp.text();
            console.error(`[${key}] ERROR: Status ${resp.status} ${resp.statusText}. Response: ${text}`);

            // Parse error response if possible
            let errorMessage = `${key} API error: ${resp.status} ${resp.statusText}`;
            let errorJson;

            try {
                // Try to parse the error response as JSON
                errorJson = safeJsonFromText(text);
                if (errorJson && (errorJson.error || errorJson.message)) {
                    // Add the specific error message from the API if available
                    errorMessage += ` - ${errorJson.error?.message || errorJson.message || ''}`;
                }
            } catch (e) {
                // If parsing fails, use the status code to provide more context
                if (resp.status === 401) {
                    errorMessage = `${key} API unauthorized (401): API key may be invalid or expired`;
                } else if (resp.status === 403) {
                    errorMessage = `${key} API forbidden (403): Your account may not have access to this resource`;
                } else if (resp.status === 404) {
                    errorMessage = `${key} API endpoint not found (404): The API endpoint may have changed`;
                } else if (resp.status === 429) {
                    errorMessage = `${key} API rate limited (429): Too many requests, please try again later`;
                } else if (resp.status >= 500) {
                    errorMessage = `${key} API server error (${resp.status}): The provider's service may be experiencing issues`;
                }
            }

            throw new Error(errorMessage);
        }

        const data = await resp.json();

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
    const status = globalRateLimiter.getStatus();
    console.log(`Rate limiter status: ${status.remaining} requests remaining, reset in ${Math.round(status.resetIn / 1000)}s`);

    // For OpenAI, try direct connection if proxy fails or if bypass is enabled
    const useDirectForOpenAI = key === 'openai' && (!useProxy || bypassOpenAIProxy);

    // Retry logic for connection issues
    let lastError: Error | null = null;
    const maxRetries = useDirectForOpenAI ? 1 : 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            let body: any = {};
            let url = '';
            let headers: Record<string, string> = { 'Accept': 'application/json' };

            if (cfg.isCustom || (cfg.baseUrl && cfg.baseUrl.trim() !== '')) {
                const baseUrl = cfg.baseUrl?.replace(/\/$/, '') || '';
                const protocol = cfg.protocol || (['anthropic', 'google'].includes(key) ? key : 'openai');

                headers = { ...headers, 'Content-Type': 'application/json', ...(cfg.headers || {}) };
                if (effectiveKey && protocol !== 'anthropic') headers['Authorization'] = `Bearer ${effectiveKey}`;

                if (protocol === 'anthropic') {
                    url = `${baseUrl}/messages`;
                    if (effectiveKey) headers['x-api-key'] = effectiveKey;
                    headers['anthropic-version'] = '2023-06-01';
                    body = {
                        model: cfg.model,
                        max_tokens: 4000,
                        messages: [{ role: 'user', content: `${systemPrompt}\n\n${userPrompt}` }]
                    };
                } else if (protocol === 'ollama') {
                    url = `${baseUrl}/api/chat`;
                    body = {
                        model: cfg.model,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userPrompt }
                        ],
                        stream: false
                    };
                } else {
                    // OpenAI Compatible (default)
                    url = `${baseUrl}/chat/completions`;
                    body = {
                        model: cfg.model,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userPrompt }
                        ]
                    };
                }
            } else if (key === 'openai' || key === 'openrouter' || key === 'deepseek' || key === 'perplexity') {
                // OpenAI-compatible chat
                if (key === 'openai' && useDirectForOpenAI) {
                    // Direct connection for OpenAI to bypass proxy issues
                    url = 'https://api.openai.com/v1/chat/completions';
                } else {
                    const basePath = key === 'openrouter' ? '/openrouter-api' : key === 'openai' ? '/openai-api' : key === 'deepseek' ? '/deepseek-api' : '/perplexity-api';
                    url = proxyUrl(`${basePath}/chat/completions`, (key === 'openrouter' ? 'https://openrouter.ai/api' : key === 'openai' ? 'https://api.openai.com' : key === 'deepseek' ? 'https://api.deepseek.com' : 'https://api.perplexity.ai') + '/v1/chat/completions');
                }
                headers = {
                    ...headers,
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${effectiveKey}`,
                    ...(key === 'openrouter' ? { 'HTTP-Referer': window.location.origin } : {})
                };
                body = {
                    model: cfg.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ]
                    // Note: omit temperature to avoid provider-specific constraints (defaults to 1 on OpenAI)
                    // Note: No response_format for text responses
                };
            } else if (key === 'anthropic') {
                url = proxyUrl('/anthropic-api/v1/messages', 'https://api.anthropic.com/v1/messages');
                headers = {
                    ...headers,
                    'Content-Type': 'application/json',
                    'x-api-key': effectiveKey!,
                    'anthropic-version': '2023-06-01'
                };
                body = {
                    model: cfg.model || 'claude-3-sonnet-20240229',
                    max_tokens: 4000,
                    messages: [{ role: 'user', content: `${systemPrompt}\n\n${userPrompt}` }]
                };
            } else {
                throw new Error(`Text response not supported for provider: ${key}`);
            }

            // Add retry logic for rate limiting and quota
            let attempts = 0;
            const maxAttempts = 3;
            let response: Response = new Response();

            while (attempts < maxAttempts) {
                if (options?.signal?.aborted) {
                    throw new DOMException('Aborted', 'AbortError');
                }
                attempts++;

                response = await fetch(url, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(body),
                    signal: options?.signal
                });

                if (response.ok) {
                    break; // Success, exit retry loop
                }

                if (response.status === 429 || response.status === 402 || response.status === 403) {
                    // Rate limited - wait and retry
                    const retryAfter = response.headers.get('retry-after');
                    const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempts) * 1000; // Exponential backoff

                    console.warn(`Limited (${response.status}). Waiting ${waitTime}ms before retry ${attempts}/${maxAttempts}`);

                    if (attempts < maxAttempts) {
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                        continue;
                    }
                } else if (response.status >= 500 && response.status < 600) {
                    // Server error - retry with exponential backoff
                    const waitTime = Math.pow(2, attempts) * 1000;
                    console.warn(`Server error (${response.status}). Waiting ${waitTime}ms before retry ${attempts}/${maxAttempts}`);

                    if (attempts < maxAttempts) {
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                        continue;
                    }
                }

                // Other errors or max attempts reached
                break;
            }

            if (!response!.ok) {
                const errorText = await response!.text().catch(() => 'Unknown error');
                if (response!.status === 429) {
                    throw new Error(`Rate limit exceeded. Please wait before trying again. Your API plan may have reached its limit.`);
                } else if (response!.status === 401) {
                    throw new Error(`API authentication failed. Please check your API key.`);
                } else if (response!.status === 403) {
                    throw new Error(`API access forbidden. Your API key may not have the required permissions.`);
                } else if (response!.status === 402) {
                    throw new Error(`Payment required. Please check your API billing and usage limits.`);
                } else {
                    throw new Error(`HTTP ${response!.status}: ${response!.statusText}${errorText ? ` - ${errorText}` : ''}`);
                }
            }
            const data = await response.json();

            // Extract text content from response
            if (key === 'anthropic') {
                return data.content?.[0]?.text || '';
            } else {
                // OpenAI-compatible
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
    // Get effective API key (local or global)
    const effectiveKey = await getEffectiveApiKey(key, cfg.apiKey);
    const isOllama = cfg.protocol === 'ollama' || key === 'ollama';
    if (!effectiveKey && !isOllama) throw new Error('no key');
    try {
        let body: any = {};
        let url = '';
        let headers: Record<string, string> = { 'Accept': 'application/json' };

        if (cfg.isCustom || (cfg.baseUrl && cfg.baseUrl.trim() !== '')) {
            const baseUrl = cfg.baseUrl?.replace(/\/$/, '') || '';
            const protocol = cfg.protocol || (['anthropic', 'google'].includes(key) ? key : 'openai');

            headers = { ...headers, 'Content-Type': 'application/json', ...(cfg.headers || {}) };
            if (effectiveKey && protocol !== 'anthropic') headers['Authorization'] = `Bearer ${effectiveKey}`;

            if (protocol === 'anthropic') {
                url = `${baseUrl}/messages`;
                if (effectiveKey) headers['x-api-key'] = effectiveKey;
                headers['anthropic-version'] = '2023-06-01';
                body = {
                    model: cfg.model,
                    max_tokens: 4000,
                    system: systemPrompt,
                    messages: [{ role: 'user', content: userPrompt }],
                    temperature: 0
                };
            } else if (protocol === 'ollama') {
                url = `${baseUrl}/api/chat`;
                body = {
                    model: cfg.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    stream: false,
                    format: "json"
                };
            } else {
                // OpenAI Compatible (default)
                url = `${baseUrl}/chat/completions`;
                body = {
                    model: cfg.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    response_format: { type: 'json_object' }
                };
            }
        } else if (key === 'openai' || key === 'openrouter' || key === 'deepseek' || key === 'perplexity') {
            // OpenAI-compatible chat
            const basePath = key === 'openrouter' ? '/openrouter-api' : key === 'openai' ? '/openai-api' : key === 'deepseek' ? '/deepseek-api' : '/perplexity-api';
            url = proxyUrl(`${basePath}/chat/completions`, (key === 'openrouter' ? 'https://openrouter.ai/api' : key === 'openai' ? 'https://api.openai.com' : key === 'deepseek' ? 'https://api.deepseek.com' : 'https://api.perplexity.ai') + '/v1/chat/completions');
            headers = {
                ...headers,
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${effectiveKey}`,
                ...(key === 'openrouter' ? { 'HTTP-Referer': window.location.origin } : {})
            };
            body = {
                model: cfg.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                // omit temperature to satisfy models that only support default=1
                response_format: { type: 'json_object' }
            };
        } else if (key === 'anthropic') {
            url = proxyUrl('/anthropic-api/v1/messages', 'https://api.anthropic.com/v1/messages');
            headers = {
                ...headers,
                'Content-Type': 'application/json',
                'x-api-key': effectiveKey!,
                'anthropic-version': '2023-06-01'
            };
            body = {
                model: cfg.model,
                system: systemPrompt,
                messages: [{ role: 'user', content: userPrompt }],
                max_tokens: 2000,
                temperature: 0
            };
        } else if (key === 'cohere') {
            // Cohere V2 API: /v2/chat with messages array format
            url = proxyUrl('/cohere-api/v2/chat', 'https://api.cohere.com/v2/chat');
            headers = { ...headers, 'Content-Type': 'application/json', 'Authorization': `Bearer ${effectiveKey}` };
            body = {
                model: cfg.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ]
            } as any;
        } else if (key === 'google') {
            // Gemini via REST
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:generateContent`;
            url = useProxy ? proxyUrl('/google-api', endpoint) : `${endpoint}?key=${effectiveKey}`;
            headers = { ...headers, 'Content-Type': 'application/json', ...(useProxy ? { 'Authorization': `Bearer ${effectiveKey}` } : {}) };
            body = { contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }], generationConfig: { temperature: 0 } };
        } else {
            throw new Error(`LLM validation not implemented for provider: ${key}`);
        }

        const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
        if (!resp.ok) {
            const text = await resp.text();
            throw new Error(`LLM call failed: ${resp.status} ${resp.statusText} - ${text}`);
        }

        // Parse provider-specific responses
        if (key === 'anthropic') {
            const data = await resp.json();
            const text = data?.content?.[0]?.text || '';
            const json = safeJsonFromText(text) || {};
            return Array.isArray(json) ? json : [json];
        } else if (key === 'google') {
            const data = await resp.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const json = safeJsonFromText(text) || {};
            return Array.isArray(json) ? json : [json];
        } else if (key === 'cohere') {
            const data = await resp.json();
            const text = data?.text || data?.response || '';
            const json = safeJsonFromText(text) || {};
            return Array.isArray(json) ? json : [json];
        } else {
            const data = await resp.json();
            const content = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.message || data?.choices?.[0]?.text || '';
            const json = safeJsonFromText(typeof content === 'string' ? content : String(content)) || {};
            return Array.isArray(json) ? json : [json];
        }
    } catch (err: any) {
        console.error('[LLM Validation] Error:', err?.message || err);
        throw err;
    }
}
