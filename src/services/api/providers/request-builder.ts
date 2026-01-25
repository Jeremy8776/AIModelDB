import { ProviderCfg, ProviderKey } from "../../../types";

export interface ProviderRequest {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: any;
}

/**
 * Centralized utility to build requests for various AI providers
 */
export function buildProviderRequest(
    key: ProviderKey,
    cfg: ProviderCfg,
    systemPrompt: string,
    userPrompt: string,
    effectiveKey: string,
    mode: 'text' | 'json'
): ProviderRequest {
    const isOllama = cfg.protocol === 'ollama' || key === 'ollama';
    const baseUrl = cfg.baseUrl?.replace(/\/$/, '') || '';

    let url = '';
    let headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };
    let body: any = {};

    // 1. Handling Custom or Protocol-based overrides
    if (cfg.isCustom || (cfg.baseUrl && cfg.baseUrl.trim() !== '')) {
        const protocol = cfg.protocol || (key === 'ollama' ? 'ollama' : (['anthropic', 'google'].includes(key) ? key : 'openai'));

        if (effectiveKey && protocol !== 'anthropic') headers['Authorization'] = `Bearer ${effectiveKey}`;
        if (cfg.headers) headers = { ...headers, ...cfg.headers };

        if (protocol === 'anthropic') {
            url = `${baseUrl}/messages`;
            if (effectiveKey) headers['x-api-key'] = effectiveKey;
            headers['anthropic-version'] = '2023-06-01';
            body = {
                model: cfg.model,
                max_tokens: mode === 'json' ? 2000 : 4000,
                system: systemPrompt,
                messages: [{ role: 'user', content: userPrompt }],
                temperature: mode === 'json' ? 0 : 0.7
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
                ...(mode === 'json' ? { format: 'json' } : {})
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
                ...(mode === 'json' ? { response_format: { type: 'json_object' }, temperature: 0 } : { temperature: 0.7 })
            };
        }

        return { url, method: 'POST', headers, body };
    }

    // 2. Handling Standard Providers by Key
    switch (key) {
        case 'openai':
        case 'openrouter':
        case 'deepseek':
        case 'perplexity': {
            if (key === 'openai') url = 'https://api.openai.com/v1/chat/completions';
            else if (key === 'openrouter') url = 'https://openrouter.ai/api/v1/chat/completions';
            else if (key === 'deepseek') url = 'https://api.deepseek.com/v1/chat/completions';
            else url = 'https://api.perplexity.ai/chat/completions';

            headers['Authorization'] = `Bearer ${effectiveKey}`;
            if (key === 'openrouter' && typeof window !== 'undefined') {
                headers['HTTP-Referer'] = window.location.origin;
            }

            body = {
                model: cfg.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                ...(mode === 'json' ? { response_format: { type: 'json_object' }, temperature: 0 } : { temperature: 0.7 })
            };
            break;
        }

        case 'anthropic': {
            url = 'https://api.anthropic.com/v1/messages';
            headers['x-api-key'] = effectiveKey;
            headers['anthropic-version'] = '2023-06-01';
            body = {
                model: cfg.model || 'claude-3-sonnet-20240229',
                max_tokens: mode === 'json' ? 2000 : 4000,
                system: systemPrompt,
                messages: [{ role: 'user', content: userPrompt }],
                temperature: mode === 'json' ? 0 : 0.7
            };
            break;
        }

        case 'google': {
            url = `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model || 'gemini-1.5-flash'}:generateContent`;
            headers['x-goog-api-key'] = effectiveKey;
            body = {
                contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
                generationConfig: {
                    temperature: mode === 'json' ? 0 : 0.7,
                    ...(mode === 'json' ? { responseMimeType: 'application/json' } : {})
                }
            };
            break;
        }

        case 'cohere': {
            url = 'https://api.cohere.com/v2/chat';
            headers['Authorization'] = `Bearer ${effectiveKey}`;
            body = {
                model: cfg.model || 'command-r',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                ...(mode === 'json' ? { response_format: { type: 'json_object' }, temperature: 0 } : { temperature: 0.7 })
            };
            break;
        }

        default:
            throw new Error(`Text response not supported for provider: ${key}`);
    }

    return { url, method: 'POST', headers, body };
}
