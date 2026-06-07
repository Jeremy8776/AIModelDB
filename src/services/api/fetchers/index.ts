/**
 * Fetchers Module
 * 
 * This module exports all data source fetchers organized by platform type.
 * Each fetcher retrieves model data from external sources and returns
 * complete and flagged models.
 */

// Core platform fetchers
export * from './huggingface';
export { fetchPopularGenerativeRepos } from './github';
export { fetchArtificialAnalysisIndex } from './artificial-analysis';

// Image generation platform fetchers
export { fetchCivitai, fetchCivitasBay } from './image-platforms';

// Registry fetchers
export * from './registries/openmodeldb';
export { fetchOllamaLibrary, ollamaLibraryFetcher } from './registries/ollama-library';
export { fetchModelScopeRecent } from './registries/modelscope';

// Hosted provider model catalogs
export { openRouterFetcher, fetchOpenRouterModels, mapOpenRouterModel } from './providers/openrouter';
export { anthropicFetcher, fetchAnthropicModels, mapAnthropicModel } from './providers/anthropic';
export { mistralFetcher, fetchMistralModels, mapMistralModel } from './providers/mistral';
export {
    openAICompatProviderFetchers,
    openAIFetcher,
    groqFetcher,
    xaiFetcher,
    cerebrasFetcher,
    perplexityFetcher,
    togetherFetcher,
    fireworksFetcher,
    deepinfraFetcher,
} from './providers/openai-compat-providers';
