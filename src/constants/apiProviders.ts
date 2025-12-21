/**
 * API provider definitions with their default configurations
 * Centralized for reuse across the application
 */
export interface ApiProviderDefinition {
    key: string;
    name: string;
    models: { value: string; label: string }[];
    showBaseUrl: boolean;
    defaultBaseUrl: string;
}

export const API_PROVIDERS: ApiProviderDefinition[] = [
    {
        key: 'anthropic',
        name: 'Anthropic',
        models: [
            { value: 'claude-3-5-sonnet-20240620', label: 'Claude 3.5 Sonnet' },
            { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
            { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
            { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
        ],
        showBaseUrl: false,
        defaultBaseUrl: 'https://api.anthropic.com/v1'
    },
    {
        key: 'openai',
        name: 'OpenAI',
        models: [
            { value: 'gpt-4o', label: 'GPT-4o (Multimodal)' },
            { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
            { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
            { value: 'gpt-4', label: 'GPT-4' },
        ],
        showBaseUrl: true,
        defaultBaseUrl: 'https://api.openai.com/v1'
    },
    {
        key: 'google',
        name: 'Google',
        models: [
            { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
            { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
            { value: 'gemini-1.0-pro', label: 'Gemini 1.0 Pro' },
        ],
        showBaseUrl: false,
        defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta'
    },
    {
        key: 'deepseek',
        name: 'DeepSeek',
        models: [
            { value: 'deepseek-chat', label: 'DeepSeek Chat' },
            { value: 'deepseek-coder', label: 'DeepSeek Coder' },
        ],
        showBaseUrl: true,
        defaultBaseUrl: 'https://api.deepseek.com/v1'
    },
    {
        key: 'perplexity',
        name: 'Perplexity',
        models: [
            { value: 'llama-3-sonar-large-32k-online', label: 'Llama 3 Sonar Large 32k' },
            { value: 'llama-3-sonar-small-32k-online', label: 'Llama 3 Sonar Small 32k' },
            { value: 'mixtral-8x7b-instruct', label: 'Mixtral 8x7b Instruct' },
        ],
        showBaseUrl: true,
        defaultBaseUrl: 'https://api.perplexity.ai'
    },
    {
        key: 'openrouter',
        name: 'OpenRouter',
        models: [
            { value: 'openai/gpt-4o', label: 'OpenAI GPT-4o' },
            { value: 'anthropic/claude-3.5-sonnet', label: 'Anthropic Claude 3.5 Sonnet' },
            { value: 'meta-llama/llama-3-70b-instruct', label: 'Meta Llama 3 70B' },
        ],
        showBaseUrl: true,
        defaultBaseUrl: 'https://openrouter.ai/api/v1'
    },
    {
        key: 'cohere',
        name: 'Cohere',
        models: [
            { value: 'command-r-plus', label: 'Command R+' },
            { value: 'command-r', label: 'Command R' },
            { value: 'command', label: 'Command' },
        ],
        showBaseUrl: false,
        defaultBaseUrl: 'https://api.cohere.ai/v1'
    }
];
