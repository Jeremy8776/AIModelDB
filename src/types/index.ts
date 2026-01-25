// Model and related types

/**
 * Available AI model domains
 */
export const DOMAINS = [
  "LLM",
  "VLM",
  "Vision",
  "ImageGen",
  "VideoGen",
  "Audio",
  "ASR",
  "TTS",
  "3D",
  "World/Sim",
  "LoRA",
  "FineTune",
  "BackgroundRemoval",
  "Upscaler",
  "Other"
] as const;

export type Domain = typeof DOMAINS[number];

/**
 * Pricing information for a model
 */
export type Pricing = {
  model?: string | null;
  unit?: string | null;
  input?: number | null;
  output?: number | null;
  flat?: number | null;
  currency?: string | null;
  notes?: string | null;
  url?: string | null;
};

/**
 * License information for a model
 */
export type LicenseInfo = {
  name: string;
  url?: string | null;
  type: "OSI" | "Copyleft" | "Non-Commercial" | "Custom" | "Proprietary";
  commercial_use: boolean;
  attribution_required: boolean;
  share_alike: boolean;
  copyleft: boolean;
  notes?: string | null;
};

/**
 * Hosting and availability information
 */
export type Hosting = {
  weights_available: boolean;
  api_available: boolean;
  on_premise_friendly: boolean;
  providers?: string[];
};

/**
 * Benchmark result entry
 */
export type BenchmarkEntry = {
  name: string;
  score?: number | string;
  unit?: string;
  source?: string;
};

/**
 * Analytics data (flexible key-value pairs)
 */
export type Analytics = Record<string, number | string>;

/**
 * Complete AI Model definition
 */
export type Model = {
  id: string;
  name: string;
  description?: string | null;
  provider?: string | null;
  domain: Domain;
  source: string;
  url?: string | null;
  repo?: string | null;
  license: LicenseInfo;
  pricing?: Pricing[];
  updated_at?: string | null;
  release_date?: string | null;
  tags?: string[];
  parameters?: string | null;
  context_window?: string | null;
  indemnity?: "None" | "VendorProgram" | "EnterpriseOnly" | "Unknown";
  data_provenance?: string | null;
  usage_restrictions?: string[];
  hosting: Hosting;
  downloads?: number | null;
  benchmarks?: BenchmarkEntry[];
  analytics?: Analytics;
  // User-managed flags
  isFavorite?: boolean;
  isNSFWFlagged?: boolean;
  flaggedImageUrls?: string[];
  images?: string[];
  links?: { label: string; url: string }[];
  source_stats?: Record<string, { downloads?: number; updated_at?: string }>;
};

// API Directory Types

/**
 * Supported API provider keys
 */
export type ProviderKey =
  | "openai"
  | "anthropic"
  | "deepseek"
  | "perplexity"
  | "openrouter"
  | "cohere"
  | "google"
  | "artificialanalysis"
  | "ollama";

/**
 * Configuration for a single API provider
 */
export type ProviderCfg = {
  name?: string;
  isCustom?: boolean;
  enabled: boolean;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  webSearch?: boolean;
  endpoints?: string[];
  cachedModels?: { value: string; label: string }[];
  protocol?: 'openai' | 'anthropic' | 'google' | 'ollama';
  headers?: Record<string, string>;
};

/**
 * API directory mapping provider keys to their configurations
 */
export type ApiDir = Record<string, ProviderCfg>;

// Risk analysis result type

/**
 * Risk assessment score for a model
 */
export type RiskScore = {
  level: "Green" | "Amber" | "Red";
  reason: string;
};
