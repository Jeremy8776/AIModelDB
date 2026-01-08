// NSFW Detection and Filtering Utilities for Corporate Environment

export interface NSFWCheckResult {
  isNSFW: boolean;
  confidence: number;
  reasons: string[];
  flaggedTerms: string[];
}

// Minimal explicit terms applied to model names only (per product policy)
const EXPLICIT_NAME_TERMS = ['porn', 'hentai', 'xxx', 'rule34', 'yiff', 'fetish', 'bdsm', 'kink', 'nsfw', '18+'];

// Only treat explicitly sexual tags as NSFW; ignore generic NSFW/suggestive tags
const EXPLICIT_TAGS = ['porn', 'hentai', 'xxx', 'rule34', 'yiff', 'fetish', 'bdsm', 'kink', 'nsfw', '18+'];

// Safe model categories that are definitely work-appropriate
const SAFE_CATEGORIES = [
  'text-generation', 'language-model', 'nlp', 'llm',
  'computer-vision', 'object-detection', 'classification',
  'segmentation', 'medical', 'scientific', 'research',
  'business', 'education', 'academic', 'productivity',
  'code-generation', 'programming', 'development',
  'data-analysis', 'machine-learning', 'ai-assistant'
];

// Trusted providers - models from these sources are always considered safe
const TRUSTED_PROVIDERS = [
  'google', 'google-bert', 'google-t5', 'facebook', 'facebookai', 'meta-llama',
  'microsoft', 'openai', 'anthropic', 'huggingface', 'sentence-transformers',
  'distilbert', 'bert-base', 'transformers', 'pytorch', 'tensorflow'
];

// Known safe model patterns - models matching these patterns are always safe
const SAFE_MODEL_PATTERNS = [
  /^(bert|distilbert|roberta|albert|electra)-/i,
  /^(gpt|llama|t5|gemma)-/i,
  /^sentence-transformers\//i,
  /^google-(bert|t5)\//i,
  /^facebook(ai)?\/(roberta|bart|contriever)/i,
  /^meta-llama\//i,
  /\/bert-/i,
  /\/roberta-/i,
  /\/t5-/i,
  /detection$/i, // NSFW detection models are safe
  /classification$/i,
  /embedding/i
];

// Suspicious model names/providers that often host NSFW content
const NSFW_PROVIDERS = [
  'civitai', 'civitaiarchive', 'civitasbay'
];

/**
 * Analyzes text content for NSFW indicators
 */
function analyzeTextForExplicitName(text: string): { score: number; flaggedTerms: string[] } {
  if (!text) return { score: 0, flaggedTerms: [] };
  const t = text.toLowerCase();
  const hits = EXPLICIT_NAME_TERMS.filter(k => t.includes(k));
  return { score: hits.length > 0 ? 100 : 0, flaggedTerms: hits };
}

/**
 * Checks tags array for NSFW content
 */
function checkTagsForNSFW(tags: string[]): { score: number; flaggedTags: string[] } {
  if (!tags || !Array.isArray(tags)) return { score: 0, flaggedTags: [] };

  const flaggedTags: string[] = [];
  let score = 0;

  for (const tag of tags) {
    const normalizedTag = tag.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Skip common safe tags that might be misinterpreted
    const safeTags = ['text2text', 'textgeneration', 'textclassification', 'language', 'multilingual', 'code'];
    if (safeTags.some(safe => normalizedTag.includes(safe))) {
      continue;
    }

    for (const nsfwTag of EXPLICIT_TAGS) {
      const normalizedNsfwTag = nsfwTag.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normalizedTag === normalizedNsfwTag) {
        flaggedTags.push(tag);
        score += 100;
        break;
      }
    }
  }

  return { score: score, flaggedTags };
}

/**
 * Checks if provider/source is known to host NSFW content
 */
function checkProviderRisk(provider: string, source: string): number {
  const p = (provider || '').toLowerCase();
  const s = (source || '').toLowerCase();

  if (NSFW_PROVIDERS.some(risk => p.includes(risk) || s.includes(risk))) {
    // Return high score for known NSFW providers
    // This effectively blocks Civitai/CivitasBay content when filtering is ON, 
    // unless the model matches a Known Safe Pattern (bert, gpt, etc) which is checked earlier.
    return 100;
  }
  return 0;
}

/**
 * Main NSFW detection function
 */
export function detectNSFW(model: any): NSFWCheckResult {
  const reasons: string[] = [];
  const flaggedTerms: string[] = [];
  let totalScore = 0;

  // Early exit for trusted providers and safe model patterns
  const modelName = model.name || '';
  const provider = (model.provider || '').toLowerCase();

  // Check if provider is trusted
  if (TRUSTED_PROVIDERS.some(trusted => provider.includes(trusted.toLowerCase()))) {
    return {
      isNSFW: false,
      confidence: 0,
      reasons: ['Trusted provider'],
      flaggedTerms: []
    };
  }

  // Check if model name matches safe patterns
  if (SAFE_MODEL_PATTERNS.some(pattern => pattern.test(modelName))) {
    return {
      isNSFW: false,
      confidence: 0,
      reasons: ['Known safe model pattern'],
      flaggedTerms: []
    };
  }

  // Special case: NSFW detection models are safety tools, not NSFW content
  if (modelName.toLowerCase().includes('nsfw') &&
    (modelName.toLowerCase().includes('detection') ||
      modelName.toLowerCase().includes('classifier') ||
      modelName.toLowerCase().includes('filter'))) {
    return {
      isNSFW: false,
      confidence: 0,
      reasons: ['NSFW detection/safety model'],
      flaggedTerms: []
    };
  }

  // Check name (explicit terms only)
  const nameCheck = analyzeTextForExplicitName(model.name || '');
  totalScore += nameCheck.score;
  flaggedTerms.push(...nameCheck.flaggedTerms);
  if (nameCheck.score > 0) {
    reasons.push('Flagged terms in model name');
  }

  // Ignore description to avoid false positives on general-purpose models

  // Check tags
  const tagsCheck = checkTagsForNSFW(model.tags || []);
  totalScore += tagsCheck.score;
  flaggedTerms.push(...tagsCheck.flaggedTags);
  if (tagsCheck.score > 0) {
    reasons.push('NSFW tags detected');
  }

  // Check provider risk
  const providerRisk = checkProviderRisk(model.provider || '', model.source || '');
  totalScore += providerRisk;
  if (providerRisk > 0) {
    reasons.push('High-risk content provider');
  }

  // Ignore URL patterns

  // Determine if content is NSFW based on total score
  // Much higher threshold to avoid false positives on legitimate AI models
  const isNSFW = totalScore >= 100; // require explicit term
  const confidence = isNSFW ? 1 : 0;

  return {
    isNSFW,
    confidence,
    reasons: [...new Set(reasons)], // Remove duplicates
    flaggedTerms: [...new Set(flaggedTerms)] // Remove duplicates
  };
}

/**
 * Filters out NSFW models from a list
 */
export function filterNSFWModels(models: any[], enableFiltering: boolean = true): {
  safeModels: any[];
  flaggedModels: any[];
  filteredCount: number;
} {
  if (!enableFiltering) {
    return {
      safeModels: models,
      flaggedModels: [],
      filteredCount: 0
    };
  }

  const safeModels: any[] = [];
  const flaggedModels: any[] = [];

  for (const model of models) {
    const nsfwCheck = detectNSFW(model);

    if (nsfwCheck.isNSFW) {
      // Add NSFW metadata for logging/debugging
      const flaggedModel = {
        ...model,
        _nsfwCheck: nsfwCheck,
        _filteredReason: 'NSFW content detected'
      };
      flaggedModels.push(flaggedModel);
    } else {
      safeModels.push(model);
    }
  }

  return {
    safeModels,
    flaggedModels,
    filteredCount: flaggedModels.length
  };
}

/**
 * Validates that a model is safe for corporate use
 */
export function isCorporateSafe(model: any): boolean {
  const nsfwCheck = detectNSFW(model);
  return !nsfwCheck.isNSFW;
}

/**
 * Gets a human-readable safety report for a model
 */
export function getSafetyReport(model: any): string {
  const nsfwCheck = detectNSFW(model);

  if (!nsfwCheck.isNSFW) {
    return 'Model appears safe for corporate use';
  }

  const reasons = nsfwCheck.reasons.join(', ');
  const confidence = Math.round(nsfwCheck.confidence * 100);

  return `NSFW detected (${confidence}% confidence): ${reasons}`;
}
