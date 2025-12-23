import { ApiDir, ProviderKey } from "../../types";

// Environment flags
export const forceProd = (import.meta.env.VITE_FORCE_PROD === 'true' || import.meta.env.VITE_FORCE_PROD === '1');
// Allow forcing proxy mode in prod via env
export const forceProxy = (import.meta.env.VITE_USE_PROXY === 'true' || import.meta.env.VITE_USE_PROXY === '1');
// Allow bypassing proxy for OpenAI when having connection issues
export const bypassOpenAIProxy = (import.meta.env.VITE_BYPASS_OPENAI_PROXY === 'true' || import.meta.env.VITE_BYPASS_OPENAI_PROXY === '1');
export const useProxy = (import.meta.env.DEV && !forceProd) || forceProxy;

/**
 * Helper function to determine URL based on environment
 * @param devPath - Path to use in development/proxy mode
 * @param prodUrl - URL to use in production mode
 * @returns The appropriate URL based on current environment
 */
export function proxyUrl(devPath: string, prodUrl: string): string {
    return useProxy ? devPath : prodUrl;
}

// Default API directory configuration
export const DEFAULT_API_DIR: ApiDir = {
    openai: { enabled: false, apiKey: "", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
    anthropic: { enabled: false, apiKey: "", baseUrl: "https://api.anthropic.com/v1", model: "claude-3-5-sonnet" },
    deepseek: { enabled: false, apiKey: "", baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat" },
    perplexity: { enabled: false, baseUrl: "https://api.perplexity.ai", model: "sonar-pro", webSearch: true },
    openrouter: { enabled: false, baseUrl: "https://openrouter.ai/api/v1", model: "openrouter/auto" },
    cohere: { enabled: false, baseUrl: "https://api.cohere.com/v1", model: "command-r" },
    google: { enabled: false, baseUrl: "https://generativelanguage.googleapis.com/v1beta", model: "gemini-1.5-flash" },
    artificialanalysis: { enabled: false, apiKey: "", endpoints: ["https://artificialanalysis.ai/api/models", "https://artificialanalysis.ai/api/providers"] }
};

// Model options for different providers
export const MODEL_OPTIONS: Record<ProviderKey, { label: string, value: string, web?: boolean }[]> = {
    openai: [
        { label: "gpt-4o-mini", value: "gpt-4o-mini" },
        { label: "gpt-4o", value: "gpt-4o" },
        { label: "Custom…", value: "__custom__" }
    ],
    anthropic: [
        { label: "claude-3-5-sonnet", value: "claude-3-5-sonnet" },
        { label: "claude-3-5-haiku", value: "claude-3-5-haiku" },
        { label: "Custom…", value: "__custom__" }
    ],
    deepseek: [
        { label: "deepseek-chat", value: "deepseek-chat" },
        { label: "Custom…", value: "__custom__" }
    ],
    perplexity: [
        { label: "sonar-pro (web)", value: "sonar-pro", web: true },
        { label: "sonar-large (web)", value: "sonar-large", web: true },
        { label: "sonar-small", value: "sonar-small" },
        { label: "Custom…", value: "__custom__" }
    ],
    openrouter: [
        { label: "openrouter/auto", value: "openrouter/auto" },
        { label: "Custom…", value: "__custom__" }
    ],
    cohere: [
        { label: "command-r", value: "command-r" },
        { label: "command-r-plus", value: "command-r-plus" },
        { label: "Custom…", value: "__custom__" }
    ],
    google: [
        { label: "gemini-1.5-flash", value: "gemini-1.5-flash" },
        { label: "gemini-1.5-pro", value: "gemini-1.5-pro" },
        { label: "Custom…", value: "__custom__" }
    ],
    artificialanalysis: [
        { label: "AA Endpoint", value: "endpoint" },
        { label: "Custom…", value: "__custom__" }
    ],
    ollama: [
        { label: "llama3", value: "llama3" },
        { label: "mistral", value: "mistral" },
        { label: "Custom…", value: "__custom__" }
    ]
};
