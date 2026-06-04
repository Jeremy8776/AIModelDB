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
  // Top-level field names the user has manually edited.
  // Listed fields are preserved across sync/merge — see mergeRecords (V3 strategy).
  editedFields?: string[];
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

// ─────────────────────────────────────────────────────────────────────────────
// MCP Servers — schema mirrors the official MCP Registry server.json
// (registry.modelcontextprotocol.io). Source-specific enrichment lives in
// _meta.{source} to keep canonical fields stable across providers.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Package install metadata for an MCP server (one per package registry).
 */
export type MCPPackage = {
  registryType: "npm" | "pypi" | "oci" | "nuget" | "other";
  identifier: string;             // e.g. "@modelcontextprotocol/server-filesystem"
  version?: string | null;
  runtimeHint?: "node" | "python" | "docker" | "binary" | null;
  runtimeArguments?: unknown[];   // canonical schema-defined args
};

/**
 * Remote transport descriptor for an MCP server.
 */
export type MCPRemote = {
  type: "stdio" | "sse" | "streamable-http" | "websocket";
  url?: string | null;
  headers?: Array<{
    name: string;
    isRequired?: boolean;
    isSecret?: boolean;
  }>;
};

/**
 * Canonical MCP server record. Aggregated from many sources; identity
 * dedupe by normalized repository URL (preferred) then qualified name.
 */
export type MCPServer = {
  id: string;                     // reverse-DNS namespace, e.g. "io.github.user/repo"
  name: string;                   // qualifiedName / display name
  description?: string | null;
  version?: string | null;
  repository?: { url: string; source: string } | null;
  websiteUrl?: string | null;

  packages?: MCPPackage[];
  remotes?: MCPRemote[];
  capabilities?: string[];        // typically ["tools", "resources", "prompts"]

  source: string;                 // comma-separated: "mcp-registry, smithery, docker"
  publishedAt?: string | null;
  updatedAt?: string | null;

  // Verification flags — kept SEPARATE since each means a different thing
  namespaceVerified?: boolean;    // official registry GitHub OAuth / DNS check
  imageVerified?: boolean;        // Docker-signed
  directoryVerified?: boolean;    // Smithery / PulseMCP / similar curation

  license?: LicenseInfo;
  tags?: string[];
  downloads?: number | null;

  // User-managed (consistent with Model)
  isFavorite?: boolean;
  editedFields?: string[];

  // Source-specific enrichment, namespaced
  _meta?: Record<string, unknown>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Skills — schema based on the AgentSkills spec (agentskills.io, Dec 2025)
// and Anthropic's claude-plugins-official marketplace.json. Same _meta
// pattern as MCPServer for source-specific extras.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Skill type classification — different ecosystems use different terms.
 */
export type SkillType = "skill" | "plugin" | "rule" | "prompt" | "recipe" | "app";

/**
 * Origin classification for trust / quality signals.
 */
export type SkillOrigin =
  | "anthropic-official"
  | "cowork-official"
  | "agentskills-spec"
  | "community-curated"
  | "open-submission"
  | "third-party";

/**
 * Redistribution status — critical for Anthropic source-available skills
 * (docx, pdf, pptx, xlsx) where we can index metadata but not rehost bodies.
 */
export type SkillRedistribution = "yes" | "metadata-only" | "no";

/**
 * Runtimes a skill is compatible with.
 */
export type SkillRuntime =
  | "claude-code"
  | "claude-ai"
  | "codex"
  | "cursor"
  | "windsurf"
  | "roo"
  | "cline"
  | "goose"
  | "generic";

/**
 * Canonical Skill record covering the LCD across Anthropic skills,
 * Cowork plugins, Cursor rules, prompts, recipes, etc.
 */
export type Skill = {
  id: string;                     // e.g. "anthropic/skills/canvas-design"
  name: string;
  description?: string | null;

  type: SkillType;
  origin: SkillOrigin;

  family?: string | null;         // e.g. "anthropic-skills", "brand-voice", "productivity"
  triggers?: string[];            // example phrases that activate the skill
  capabilities?: string[];

  requires?: {
    mcps?: string[];              // MCPServer ids this skill depends on
    plugins?: string[];
    api_keys?: string[];
    runtimes?: SkillRuntime[];
  };

  install_command?: string | null;
  source: string;                 // e.g. "anthropic-skills, agentskills.io"
  source_repo?: {
    owner: string;
    repo: string;
    path: string;
    sha?: string;
  } | null;

  redistributable: SkillRedistribution;

  license?: LicenseInfo;
  tags?: string[];
  updated_at?: string | null;

  isFavorite?: boolean;
  editedFields?: string[];

  _meta?: Record<string, unknown>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Entity type discriminator — used by the top-level tab switcher.
// ─────────────────────────────────────────────────────────────────────────────

export type EntityType = "models" | "mcp" | "skills";

export const ENTITY_TYPES: readonly EntityType[] = ["models", "mcp", "skills"] as const;
