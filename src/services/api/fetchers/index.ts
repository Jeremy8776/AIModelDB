/**
 * Fetchers Module
 * 
 * This module exports all data source fetchers organized by platform type.
 * Each fetcher retrieves model data from external sources and returns
 * complete and flagged models.
 */

// Core platform fetchers
export { fetchHuggingFaceRecent } from './huggingface';
export { fetchPopularGenerativeRepos } from './github';
export { fetchArtificialAnalysisIndex } from './artificial-analysis';

// Image generation platform fetchers
export { fetchCivitai, fetchCivitasBay } from './image-platforms';

// Registry fetchers
export { fetchModelScopeRecent, fetchOpenModelDB } from './registries';
