/**
 * API Service Module
 * 
 * Main barrel export for the refactored API service.
 * This module provides a clean public API for all model fetching,
 * enrichment, translation, and provider interaction functionality.
 * 
 * Organized by category:
 * - Configuration and Constants
 * - Provider API Calls
 * - Data Source Fetchers
 * - Model Enrichment
 * - Translation
 * - Filtering and Validation
 * - Utilities
 */

// ============================================================================
// Configuration and Constants
// ============================================================================
export { DEFAULT_API_DIR, MODEL_OPTIONS } from './config';

// ============================================================================
// Provider API Calls
// ============================================================================
export {
    getEffectiveApiKey,
    callProvider,
    callProviderText,
    callProviderLLM
} from './providers';

// ============================================================================
// Data Source Fetchers
// ============================================================================

// Core platform fetchers
export {
    fetchHuggingFaceRecent,
    huggingFaceFetcher, // Export the new fetcher object
    fetchPopularGenerativeRepos,
    fetchArtificialAnalysisIndex
} from './fetchers';


// Image generation platform fetchers
export {
    fetchCivitai,
    fetchCivitasBay
} from './fetchers';

// Registry fetchers
export {
    fetchModelScopeRecent,
    fetchOpenModelDB,
    openModelDBFetcher, // Export wrapper
    fetchOllamaLibrary,
    ollamaLibraryFetcher // Export wrapper
} from './fetchers';

// ============================================================================
// Model Enrichment
// ============================================================================
export {
    enrichModelsDeep,
    enrichFromGitHub,
    enrichFromHuggingFace,
    enrichFromWebScraping
} from './enrichment';

// ============================================================================
// Translation
// ============================================================================
export {
    translateChineseModels,
    containsChinese,
    containsOtherAsianLanguages
} from './translation';

// ============================================================================
// Filtering and Validation
// ============================================================================
export {
    applyCorporateFiltering,
    applyCorporateFilteringAsync,
    isModelComplete
} from './filtering';

// ============================================================================
// Utilities
// ============================================================================
export {
    normalizeDate,
    normalizeLicenseName,
    determineType,
    determineCommercialUse,
    inferLicenseFromTags,
    determineDomain,
    determineDomainFromTopics,
    inferParametersFromNameTags,
    parseGitHubRepo,
    mapSpdxToType,
    safeFetch
} from './utils';

// ============================================================================
// Validation Schemas (Zod)
// ============================================================================
export {
    ModelSchema,
    LicenseSchema,
    HostingSchema,
    PricingSchema,
    DomainSchema,
    HuggingFaceModelSchema,
    HuggingFaceResponseSchema,
    OllamaModelSchema,
    OllamaResponseSchema,
    OpenAIModelSchema,
    OpenAIModelsResponseSchema,
    safeParse,
    parseOrThrow,
    validateModels,
    coerceToModel,
    type ValidatedModel
} from './schemas';
