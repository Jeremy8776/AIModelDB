// NSFW Detection and Filtering Utilities for Corporate Environment

export interface NSFWCheckResult {
  isNSFW: boolean;
  confidence: number;
  reasons: string[];
  flaggedTerms: string[];
}

import { EXPLICIT_NAME_TERMS, EXPLICIT_TAGS } from './nsfw-keywords';

// Re-export for use in other files if necessary, or just use them here.
export { EXPLICIT_NAME_TERMS, EXPLICIT_TAGS };



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
  'google', 'google-bert', 'google-t5', 'facebook', 'facebookai', 'meta-llama', 'meta',
  'microsoft', 'openai', 'anthropic', 'huggingface', 'sentence-transformers',
  'distilbert', 'bert-base', 'transformers', 'pytorch', 'tensorflow',
  'nvidia', 'amd', 'intel', 'ibm', 'amazon', 'aws', 'apple', 'alibaba', 'baidu', 'tencent',
  'deepmind', 'stability', 'stabilityai', 'mistral', 'mistralai', 'cohere', 'ai21',
  'lmstudio', 'lmstudio-community', 'thebloke', 'unsloth', 'teknium', 'nous', 'nousresearch'
];

// Known safe model patterns - models matching these patterns are always safe
// This includes general-purpose models that CAN generate NSFW but aren't inherently NSFW
const SAFE_MODEL_PATTERNS = [
  // LLM base models
  /^(bert|distilbert|roberta|albert|electra)-/i,
  /^(gpt|llama|t5|gemma|mistral|qwen|phi|deepseek)-/i,
  /^sentence-transformers\//i,
  /^google-(bert|t5)\//i,
  /^facebook(ai)?\/(roberta|bart|contriever)/i,
  /^meta-llama\//i,
  /\/bert-/i,
  /\/roberta-/i,
  /\/t5-/i,

  // General-purpose image generation models (can do NSFW but not inherently NSFW)
  /stable[-\s]?diffusion/i,
  /\bsdxl\b/i,
  /\bsd[-\s]?(1\.5|2\.0|2\.1|3\.0|3\.5)\b/i,
  /\bflux\b/i,
  /\bdalle?\b/i,
  /\bmidjourney\b/i,
  /dream[-\s]?diffusion/i,
  /kandinsky/i,
  /playground[-\s]?v/i,
  /pixart/i,
  /\bwuerstchen\b/i,
  /\bif[-\s]?model\b/i,
  /controlnet/i,
  /ip[-\s]?adapter/i,
  /lora[-\s]?training/i,  // LoRA training tools, not NSFW content

  // Video generation models
  /\bsora\b/i,
  /\bpika\b/i,
  /\brunway\b/i,
  /cogvideo/i,
  /animatediff/i,

  // Audio models
  /whisper/i,
  /musicgen/i,
  /audioldm/i,
  /bark/i,
  /tortoise[-\s]?tts/i,

  // Utility/safety models
  /detection$/i,
  /classifier$/i,
  /classification$/i,
  /embedding/i,
  /encoder/i,
  /vae/i,
  /upscaler/i,
  /super[-\s]?resolution/i
];

// Suspicious model names/providers that often host NSFW content
const NSFW_PROVIDERS = [
  'civitai', 'civitaiarchive', 'civitasbay'
];

/**
 * Normalizes text to catch various formatting patterns:
 * - CamelCase: "ProneBone" -> "prone bone"
 * - Dashes/underscores: "prone-bone" or "prone_bone" -> "prone bone"
 * - Dots: "prone.bone" -> "prone bone"
 * - Numbers mixed in: "pr0n" stays as is (handled by keyword list)
 */
function normalizeText(text: string): string {
  if (!text) return '';

  const normalized = text
    // Insert space before uppercase letters (CamelCase -> Camel Case)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Insert space between letter and number transitions
    .replace(/([a-zA-Z])(\d)/g, '$1 $2')
    .replace(/(\d)([a-zA-Z])/g, '$1 $2')
    // Replace dashes, underscores, dots with spaces
    .replace(/[-_.]+/g, ' ')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    // Trim and lowercase
    .trim()
    .toLowerCase();

  return normalized;
}

/**
 * Generates variations of a term for matching (no-space versions)
 */
function getTermVariations(term: string): string[] {
  const variations = [term];
  // Add no-space version if term has spaces
  if (term.includes(' ')) {
    variations.push(term.replace(/\s+/g, ''));
  }
  return variations;
}

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

interface CompiledTerms {
  /** Per term, the regexes to try (one per spelling variation); null marks the literal "18+" check. */
  entries: Array<{ term: string; regexes: RegExp[] | null }>;
  /** Alternation of every variation: a cheap pre-check that rules out almost all text in one pass. */
  any: RegExp | null;
}

const compiledCache = new Map<string, CompiledTerms>();

/**
 * Compile the keyword list once. Building a RegExp per term per model made scanning
 * 20,000 models take about 8 seconds on the main thread at startup.
 */
function compileTerms(customKeywords: string[]): CompiledTerms {
  const cacheKey = customKeywords.join('\u0000');
  const cached = compiledCache.get(cacheKey);
  if (cached) return cached;

  const entries: CompiledTerms['entries'] = [];
  const alternatives: string[] = [];
  for (const term of [...EXPLICIT_NAME_TERMS, ...customKeywords]) {
    if (term === '18+') {
      entries.push({ term, regexes: null });
      continue;
    }
    const patterns = getTermVariations(term).map(variant => `\\b${escapeRegex(variant)}\\b`);
    entries.push({ term, regexes: patterns.map(pattern => new RegExp(pattern, 'i')) });
    alternatives.push(...patterns);
  }
  const compiled: CompiledTerms = {
    entries,
    any: alternatives.length > 0 ? new RegExp(alternatives.join('|'), 'i') : null,
  };
  if (compiledCache.size >= 8) compiledCache.clear();
  compiledCache.set(cacheKey, compiled);
  return compiled;
}

/**
 * Analyzes text content for NSFW indicators
 */
function analyzeTextForExplicitName(text: string, customKeywords: string[] = []): { score: number; flaggedTerms: string[] } {
  if (!text) return { score: 0, flaggedTerms: [] };

  // Normalize the input text to catch CamelCase, dashes, underscores, etc.
  const normalizedText = normalizeText(text);
  // Also keep original lowercase for direct matches (e.g., "pronebone" without spaces)
  const originalLower = text.toLowerCase();

  const compiled = compileTerms(customKeywords);
  const has18Plus = text.includes('18+');

  // Almost every model name contains nothing explicit: one combined test settles it.
  const mayMatch = compiled.any !== null && (compiled.any.test(normalizedText) || compiled.any.test(originalLower));
  if (!mayMatch && !has18Plus) return { score: 0, flaggedTerms: [] };

  // Something may match: find which terms, in list order.
  const flaggedTerms: string[] = [];
  let score = 0;
  for (const { term, regexes } of compiled.entries) {
    if (!regexes) {
      if (has18Plus) {
        flaggedTerms.push(term);
        score = 100;
      }
      continue;
    }
    if (regexes.some(regex => regex.test(normalizedText) || regex.test(originalLower)) && !flaggedTerms.includes(term)) {
      flaggedTerms.push(term);
      score = 100;
    }
  }

  return { score, flaggedTerms };
}

// Common safe tags that should never be flagged
const SAFE_TAGS = [
  'text2text', 'textgeneration', 'textclassification', 'language', 'multilingual', 'code',
  'diffusers', 'transformers', 'safetensors', 'lora', 'controlnet', 'comfyui', 'stable-diffusion',
  'text-to-image', 'image-to-image', 'image-generation', 'text-generation', 'text2image',
  'base-model', 'checkpoint', 'finetune', 'fine-tune', 'distillation', 'quantized', 'gguf',
  'community-archive', 'model', 'weights', 'pretrained', 'experimental', 'research'
].map(tag => tag.replace(/[^a-z0-9]/g, ''));

const alnum = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const nsfwTagSetCache = new Map<string, Set<string>>();

/** Normalised NSFW tags long enough to compare (very short ones like 'dp' cause false positives). */
function nsfwTagSet(customKeywords: string[]): Set<string> {
  const cacheKey = customKeywords.join('\u0000');
  const cached = nsfwTagSetCache.get(cacheKey);
  if (cached) return cached;
  const set = new Set<string>();
  for (const tag of [...EXPLICIT_TAGS, ...customKeywords]) {
    const normalized = alnum(tag);
    if (normalized.length >= 4) set.add(normalized);
  }
  if (nsfwTagSetCache.size >= 8) nsfwTagSetCache.clear();
  nsfwTagSetCache.set(cacheKey, set);
  return set;
}

/**
 * Checks tags array for NSFW content
 */
function checkTagsForNSFW(tags: string[], customKeywords: string[] = []): { score: number; flaggedTags: string[] } {
  if (!tags || !Array.isArray(tags)) return { score: 0, flaggedTags: [] };

  const flaggedTags: string[] = [];
  let score = 0;
  const nsfwTags = nsfwTagSet(customKeywords);

  for (const tag of tags) {
    const normalizedTag = alnum(tag);

    // Skip known safe tags
    if (SAFE_TAGS.some(safe => normalizedTag === safe || normalizedTag.includes(safe))) {
      continue;
    }

    // Require EXACT match for tags - no substring matching. Tags are short and
    // specific, so partial matching causes too many false positives.
    if (nsfwTags.has(normalizedTag)) {
      flaggedTags.push(tag);
      score += 100;
    }
  }

  return { score, flaggedTags };
}

/**
 * Checks if provider/source is known to host NSFW content
 */
function checkProviderRisk(provider: string, source: string): number {
  return 0; // Don't auto-flag based on provider alone, let content analysis decide
}

/**
 * Main NSFW detection function
 */
export function detectNSFW(model: any, customKeywords: string[] = []): NSFWCheckResult {
  const reasons: string[] = [];
  const flaggedTerms: string[] = [];
  let totalScore = 0;

  const modelName = model.name || '';
  const provider = (model.provider || '').toLowerCase();
  const source = (model.source || '').toLowerCase();
  const nameLower = modelName.toLowerCase();

  // FIRST: Check for NSFW detection/safety models BEFORE explicit term check
  // These are safety tools, not NSFW content generators
  if (nameLower.includes('nsfw') &&
    (nameLower.includes('detection') ||
      nameLower.includes('detector') ||
      nameLower.includes('classifier') ||
      nameLower.includes('classification') ||
      nameLower.includes('filter') ||
      nameLower.includes('filtering') ||
      nameLower.includes('safety') ||
      nameLower.includes('moderation'))) {
    return {
      isNSFW: false,
      confidence: 0,
      reasons: ['NSFW detection/safety model'],
      flaggedTerms: []
    };
  }

  // SECOND: Check for explicit terms in name - this takes priority over other patterns
  const nameCheck = analyzeTextForExplicitName(modelName, customKeywords);
  if (nameCheck.score > 0) {
    // Found explicit content - flag immediately, don't apply safe patterns
    return {
      isNSFW: true,
      confidence: 1,
      reasons: ['Flagged terms in model name'],
      flaggedTerms: nameCheck.flaggedTerms
    };
  }

  // THIRD: Check trusted providers (only if no explicit terms found)
  if (TRUSTED_PROVIDERS.some(trusted => provider.includes(trusted.toLowerCase()))) {
    return {
      isNSFW: false,
      confidence: 0,
      reasons: ['Trusted provider'],
      flaggedTerms: []
    };
  }

  // FOURTH: Check safe model patterns (only if no explicit terms found)
  if (SAFE_MODEL_PATTERNS.some(pattern => pattern.test(modelName))) {
    return {
      isNSFW: false,
      confidence: 0,
      reasons: ['Known safe model pattern'],
      flaggedTerms: []
    };
  }

  // Continue checking other fields (description, tags) for high-risk sources
  // Smart Description Check: Only check description for high-risk providers
  const isHighRiskSource = NSFW_PROVIDERS.some(risk => provider.includes(risk) || source.includes(risk));

  if (isHighRiskSource) {
    // Use the same regex analysis on description
    const descCheck = analyzeTextForExplicitName(model.description || '', customKeywords);
    if (descCheck.score > 0) {
      totalScore += descCheck.score;
      flaggedTerms.push(...descCheck.flaggedTerms);
      reasons.push('Flagged terms in description (High Risk Source)');
    }
  }

  // Check tags
  const tagsCheck = checkTagsForNSFW(model.tags || [], customKeywords);
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
export function filterNSFWModels(models: any[], enableFiltering: boolean = true, customKeywords: string[] = []): {
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
    const nsfwCheck = detectNSFW(model, customKeywords);

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
