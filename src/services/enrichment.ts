import { Model } from '../types';
import { isModelComplete } from './api';

/**
 * Cross-references models from different sources to fill in missing data points
 * @param models Array of models to enrich with data
 * @param referenceModels Reference models that may contain additional data
 * @returns Enriched models with filled-in data points
 */
export function crossReferenceModels(models: Model[], referenceModels: Model[]): Model[] {
  return models.map(model => {
    // Skip models that are already complete
    if (isModelSufficient(model)) {
      return model;
    }
    
    // Find potential matching reference models
    const matches = findPotentialMatches(model, referenceModels);
    if (matches.length === 0) {
      return model;
    }
    
    // Use best match to enrich our model
    return enrichModelFromReference(model, matches[0]);
  });
}

/**
 * Check if a model has sufficient data already
 */
function isModelSufficient(model: Model): boolean {
  // If model has these key fields, consider it sufficient
  return Boolean(
    model.parameters && 
    model.context_window && 
    model.license && 
    model.license.name && 
    model.license.type && 
    model.release_date && 
    model.tags && 
    model.tags.length > 0
  );
}

/**
 * Find potential matching models in the reference dataset
 */
function findPotentialMatches(model: Model, referenceModels: Model[]): Model[] {
  // Normalize model names for comparison
  const normalizedName = normalizeModelName(model.name);
  const nameSegments = normalizedName.split(/[\s-_]+/);
  
  // Find matches by name similarity
  const potentialMatches = referenceModels.filter(ref => {
    // Exact name match is best
    if (normalizeModelName(ref.name) === normalizedName) {
      return true;
    }
    
    // Check for strong partial matches
    const refNameNormalized = normalizeModelName(ref.name);
    
    // Match if model name is contained within reference name or vice versa
    if (refNameNormalized.includes(normalizedName) || normalizedName.includes(refNameNormalized)) {
      return true;
    }
    
    // Match if at least 2 significant segments match (for multi-part names)
    if (nameSegments.length > 1) {
      const refSegments = refNameNormalized.split(/[\s-_]+/);
      const matchingSegments = nameSegments.filter(seg => 
        // Only count significant segments (not short words like 'the', 'a', etc.)
        seg.length > 2 && refSegments.includes(seg)
      );
      if (matchingSegments.length >= 2) {
        return true;
      }
    }
    
    // Check for provider/organization match plus partial name match
    if (model.provider && 
        model.provider === ref.provider && 
        containsSignificantOverlap(normalizedName, refNameNormalized)) {
      return true;
    }
    
    return false;
  });
  
  // Sort potential matches by relevance
  return potentialMatches.sort((a, b) => {
    // Prefer exact name matches
    const aNameMatch = normalizeModelName(a.name) === normalizedName ? 1 : 0;
    const bNameMatch = normalizeModelName(b.name) === normalizedName ? 1 : 0;
    if (aNameMatch !== bNameMatch) {
      return bNameMatch - aNameMatch;
    }
    
    // Prefer provider matches
    const aProviderMatch = a.provider === model.provider ? 1 : 0;
    const bProviderMatch = b.provider === model.provider ? 1 : 0;
    if (aProviderMatch !== bProviderMatch) {
      return bProviderMatch - aProviderMatch;
    }
    
    // Prefer domain matches
    const aDomainMatch = a.domain === model.domain ? 1 : 0;
    const bDomainMatch = b.domain === model.domain ? 1 : 0;
    if (aDomainMatch !== bDomainMatch) {
      return bDomainMatch - aDomainMatch;
    }
    
    // Prefer models with more downloads
    return (b.downloads || 0) - (a.downloads || 0);
  });
}

/**
 * Normalize model name for comparison
 */
function normalizeModelName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\bv\d+\b|\bversion\s*\d+\b/g, '') // Remove version indicators
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Check if two strings have significant word overlap
 */
function containsSignificantOverlap(str1: string, str2: string): boolean {
  const words1 = str1.split(/\s+/).filter(w => w.length > 3);
  const words2 = str2.split(/\s+/).filter(w => w.length > 3);
  
  // Count matching significant words
  const matches = words1.filter(w => words2.includes(w));
  return matches.length >= 1;
}

/**
 * Enrich a model with data from a reference model
 */
function enrichModelFromReference(model: Model, reference: Model): Model {
  // Create a new model object to avoid modifying the original
  const enriched: Model = { ...model };
  
  // Fill in missing fields from reference
  if (!enriched.parameters && reference.parameters) {
    enriched.parameters = reference.parameters;
  }
  
  if (!enriched.context_window && reference.context_window) {
    enriched.context_window = reference.context_window;
  }
  
  if (!enriched.release_date && reference.release_date) {
    enriched.release_date = reference.release_date;
  }
  
  if (!enriched.license || !enriched.license.name) {
    enriched.license = enriched.license || {};
    if (reference.license) {
      enriched.license.name = enriched.license.name || reference.license.name;
      enriched.license.type = enriched.license.type || reference.license.type;
      enriched.license.url = enriched.license.url || reference.license.url;
      enriched.license.commercial_use = 
        enriched.license.commercial_use === undefined ? 
        reference.license.commercial_use : 
        enriched.license.commercial_use;
      enriched.license.attribution_required = 
        enriched.license.attribution_required === undefined ? 
        reference.license.attribution_required : 
        enriched.license.attribution_required;
      enriched.license.copyleft = 
        enriched.license.copyleft === undefined ? 
        reference.license.copyleft : 
        enriched.license.copyleft;
      enriched.license.share_alike = 
        enriched.license.share_alike === undefined ? 
        reference.license.share_alike : 
        enriched.license.share_alike;
    }
  }
  
  // Merge tags without duplicates
  if ((!enriched.tags || enriched.tags.length === 0) && reference.tags && reference.tags.length > 0) {
    enriched.tags = [...reference.tags];
  } else if (reference.tags && reference.tags.length > 0) {
    // Add new tags from reference
    const existingTags = new Set(enriched.tags || []);
    reference.tags.forEach(tag => {
      if (!existingTags.has(tag)) {
        enriched.tags = [...(enriched.tags || []), tag];
      }
    });
  }
  
  return enriched;
}
