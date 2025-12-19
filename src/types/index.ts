// Model and related types
export type Domain = "LLM"|"VLM"|"Vision"|"ImageGen"|"VideoGen"|"Audio"|"ASR"|"TTS"|"3D"|"World/Sim"|"LoRA"|"FineTune"|"BackgroundRemoval"|"Upscaler"|"Other";
export type Pricing = { model?: string|null; unit?: string|null; input?: number|null; output?: number|null; flat?: number|null; currency?: string|null; notes?: string|null; url?: string|null };
export type LicenseInfo = { name: string; url?: string|null; type: "OSI"|"Copyleft"|"Non-Commercial"|"Custom"|"Proprietary"; commercial_use: boolean; attribution_required: boolean; share_alike: boolean; copyleft: boolean; notes?: string|null };
export type Hosting = { weights_available: boolean; api_available: boolean; on_premise_friendly: boolean; providers?: string[] };
export type BenchmarkEntry = { name: string; score?: number|string; unit?: string; source?: string };
export type Analytics = Record<string, number|string>;
export type Model = { id: string; name: string; description?: string|null; provider?: string|null; domain: Domain; source: string; url?: string|null; repo?: string|null; license: LicenseInfo; pricing?: Pricing[]; updated_at?: string|null; release_date?: string|null; tags?: string[]; parameters?: string|null; context_window?: string|null; indemnity?: "None"|"VendorProgram"|"EnterpriseOnly"|"Unknown"; data_provenance?: string|null; usage_restrictions?: string[]; hosting: Hosting; downloads?: number|null; benchmarks?: BenchmarkEntry[]; analytics?: Analytics };

// API Directory Types
export type ProviderKey = "openai"|"anthropic"|"deepseek"|"perplexity"|"openrouter"|"cohere"|"google"|"artificialanalysis";
export type ProviderCfg = { enabled: boolean; apiKey?: string; baseUrl?: string; model?: string; webSearch?: boolean; endpoints?: string[] };
export type ApiDir = Record<ProviderKey, ProviderCfg>;

// Risk analysis result type
export type RiskScore = {
  level: "Green" | "Amber" | "Red";
  reason: string;
};
