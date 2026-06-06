/**
 * Data-source catalogs for all entity tabs.
 *
 * Sources marked `available` are wired to a fetcher and gate sync on the
 * matching settings toggle. Sources marked `planned` are surfaced in the UI
 * as disabled roadmap options until a fetcher lands.
 */

export interface EntitySource {
    key: string;
    label: string;
    description: string;
    status: 'available' | 'planned';
}

export type EntitySourceCategory = 'models' | 'mcp' | 'skills';
export type EntitySourceSurface = 'settings' | 'onboarding';

export interface DisplayEntitySource extends EntitySource {
    isSelectable: boolean;
}

const SOURCE_DEDUPE_STRATEGIES: Record<EntitySourceCategory, string> = {
    models: 'Dedupe by exact id/repo/url first, then domain + normalized name + provider when auto-merge is enabled.',
    mcp: 'Dedupe by canonical server id first, with repository URL and package coordinates as secondary identity.',
    skills: 'Dedupe by stable skill id first, with source repo path and runtime family as secondary identity.',
};

export const MODEL_SOURCES: EntitySource[] = [
    { key: 'huggingface', label: 'Hugging Face', description: 'REST API for model cards, tags, downloads, licenses, and Spaces links.', status: 'available' },
    { key: 'github', label: 'GitHub Topics', description: 'Repository search for model, inference, and generative-AI projects.', status: 'available' },
    { key: 'artificialanalysis', label: 'Artificial Analysis', description: 'Benchmark and pricing metadata; API key recommended.', status: 'available' },
    { key: 'civitai', label: 'Civitai', description: 'Image-generation checkpoints, LoRAs, versions, stats, tags, and licenses.', status: 'available' },
    { key: 'openmodeldb', label: 'OpenModelDB', description: 'Upscaler and restoration model registry with technical metadata.', status: 'available' },
    { key: 'civitasbay', label: 'CivitasBay', description: 'Image model marketplace and preservation index.', status: 'available' },
    { key: 'ollamaLibrary', label: 'Ollama Library', description: 'Local-friendly LLM catalog with tags and pull names.', status: 'available' },
    { key: 'modelscope', label: 'ModelScope', description: 'Alibaba model hub and OpenAI-compatible inference catalog.', status: 'planned' },
    { key: 'kaggle', label: 'Kaggle Models', description: 'Google/Kaggle model hub with framework, license, and training-data metadata.', status: 'planned' },
    { key: 'roboflow', label: 'Roboflow Universe', description: 'Computer-vision models, datasets, tasks, and deployment metadata.', status: 'planned' },
    { key: 'openrouter', label: 'OpenRouter', description: 'Public /api/v1/models endpoint with routing, pricing, context, and parameters.', status: 'planned' },
    { key: 'openai', label: 'OpenAI', description: '/v1/models for current API-accessible model IDs and owners.', status: 'planned' },
    { key: 'anthropic', label: 'Anthropic', description: '/v1/models for Claude models, release order, pagination, and model types.', status: 'planned' },
    { key: 'google-gemini', label: 'Google Gemini API', description: 'Gemini models.list with supported methods, tokens, and modality metadata.', status: 'planned' },
    { key: 'mistral', label: 'Mistral AI', description: '/v1/models with capabilities, context length, aliases, and deprecations.', status: 'planned' },
    { key: 'cohere', label: 'Cohere', description: '/v1/models with endpoints, context length, features, and tokenizer URLs.', status: 'planned' },
    { key: 'groq', label: 'Groq', description: 'OpenAI-compatible /openai/v1/models with active models and context windows.', status: 'planned' },
    { key: 'together', label: 'Together AI', description: '/v1/models for hosted open models, modalities, pricing, and ownership.', status: 'planned' },
    { key: 'fireworks', label: 'Fireworks AI', description: 'Serverless model catalog and account model metadata for base models and LoRAs.', status: 'planned' },
    { key: 'deepinfra', label: 'DeepInfra', description: 'Hosted open model catalog across LLM, image, speech, OCR, and embeddings.', status: 'planned' },
    { key: 'replicate', label: 'Replicate', description: 'Public model pages and API metadata for community-hosted inference models.', status: 'planned' },
    { key: 'cerebras', label: 'Cerebras', description: 'Hosted fast-inference model list and OpenAI-compatible provider metadata.', status: 'planned' },
    { key: 'xai', label: 'xAI', description: 'Grok API model endpoint for current hosted model IDs.', status: 'planned' },
    { key: 'perplexity', label: 'Perplexity', description: 'Sonar model catalog, online-search capability metadata, and pricing pages.', status: 'planned' },
    { key: 'aws-bedrock', label: 'AWS Bedrock', description: 'ListFoundationModels API for provider, modality, customization, and inference types.', status: 'planned' },
    { key: 'azure-ai-foundry', label: 'Azure AI Foundry', description: 'Model catalog for OpenAI, Mistral, Meta, Cohere, Phi, and Azure-hosted models.', status: 'planned' },
    { key: 'google-vertex-model-garden', label: 'Vertex AI Model Garden', description: 'Google Cloud model catalog for first-party, partner, and open models.', status: 'planned' },
    { key: 'nvidia-ngc', label: 'NVIDIA NGC', description: 'NIM, model, container, and resource catalog for GPU deployments.', status: 'planned' },
    { key: 'codesota', label: 'CodeSOTA', description: 'Replacement SOTA registry with model and benchmark pages plus JSON/API surfaces.', status: 'planned' },
    { key: 'lmarena', label: 'LMArena / Chatbot Arena', description: 'Community preference leaderboards and model ranking snapshots.', status: 'planned' },
    { key: 'open-llm-leaderboard', label: 'Open LLM Leaderboard', description: 'Hugging Face leaderboard datasets for open model benchmark scores.', status: 'planned' },
    { key: 'mteb', label: 'MTEB Leaderboard', description: 'Embedding model benchmark metadata across tasks, languages, and scores.', status: 'planned' },
    { key: 'livebench', label: 'LiveBench', description: 'Fresh LLM benchmark rankings with dated model score updates.', status: 'planned' },
    { key: 'vellum', label: 'Vellum Leaderboards', description: 'Commercial model comparison tables, latency, pricing, and capability data.', status: 'planned' },
    { key: 'paperswithcode-archive', label: 'Papers With Code Archive', description: 'Historical GitHub JSON dumps for methods, papers, datasets, and evaluations.', status: 'planned' },
    { key: 'semantic-scholar', label: 'Semantic Scholar', description: 'Paper API for model-linked publications, code links, abstracts, and citations.', status: 'planned' },
    { key: 'tensorart', label: 'Tensor.art', description: 'Image-generation marketplace pages for checkpoints, LoRAs, creators, and stats.', status: 'planned' },
    { key: 'liblib', label: 'LiblibAI', description: 'Chinese image model marketplace with checkpoints, LoRAs, and usage signals.', status: 'planned' },
    { key: 'shakker', label: 'Shakker', description: 'Design and image model marketplace with model pages and creator metadata.', status: 'planned' },
    { key: 'runcomfy', label: 'RunComfy', description: 'ComfyUI workflow and model listings for image/video generation stacks.', status: 'planned' },
    { key: 'prompthero', label: 'PromptHero', description: 'Prompt and model pages for image-generation workflows and community stats.', status: 'planned' },
    { key: 'leonardo', label: 'Leonardo.Ai', description: 'Hosted image/video model families, presets, and generation capabilities.', status: 'planned' },
    { key: 'mage-space', label: 'Mage.space', description: 'Community image model and preset catalog for Stable Diffusion workflows.', status: 'planned' },
    { key: 'pinokio', label: 'Pinokio', description: 'Self-hostable AI app index that often references runnable models and scripts.', status: 'planned' },
    { key: 'tensorflow-hub', label: 'TensorFlow Hub', description: 'Classic model hub metadata now partially surfaced through Kaggle Models.', status: 'planned' },
    { key: 'onnx-model-zoo', label: 'ONNX Model Zoo', description: 'GitHub-hosted model manifests for ONNX-ready vision, NLP, and speech models.', status: 'planned' },
    { key: 'torch-hub', label: 'PyTorch Hub', description: 'GitHub-backed model entrypoints and repository metadata for PyTorch models.', status: 'planned' },
    { key: 'apple-coreml', label: 'Apple Core ML Models', description: 'Core ML package examples and model cards for on-device Apple deployments.', status: 'planned' },
    { key: 'qualcomm-ai-hub', label: 'Qualcomm AI Hub', description: 'Edge model catalog with devices, runtimes, and optimized deployment metadata.', status: 'planned' },
];

export const MCP_SOURCES: EntitySource[] = [
    { key: 'mcp-registry', label: 'Official MCP Registry', description: 'registry.modelcontextprotocol.io canonical server metadata.', status: 'available' },
    // Fetchers exist (github-topics.ts / npm-registry.ts) but are untested and
    // hit external APIs (GitHub search needs a token for usable rate limits).
    // Deferred to "Soon" until that's hardened — syncAll gates on this status,
    // so the code stays wired but won't run. Flip to 'available' to enable.
    { key: 'github', label: 'GitHub Topics', description: 'Repos tagged mcp-server / modelcontextprotocol.', status: 'planned' },
    { key: 'packages', label: 'npm Registry', description: 'Packages with mcp-server / modelcontextprotocol keywords.', status: 'planned' },
    { key: 'docker', label: 'Docker MCP Registry', description: 'Docker-signed, security-reviewed servers and catalog YAML/JSON.', status: 'planned' },
    { key: 'smithery', label: 'Smithery', description: 'Marketplace API with semantic search, verified flags, use counts, and remote status.', status: 'planned' },
    { key: 'glama', label: 'Glama', description: 'Large community index with connectors, tool schemas, quality scoring, and gateway metadata.', status: 'planned' },
    { key: 'pulsemcp', label: 'PulseMCP', description: 'Sub-registry API with popularity, official status, auth, and tool enrichments.', status: 'planned' },
    { key: 'mcp-so', label: 'MCP.so', description: 'Large community MCP directory with install snippets and categorization.', status: 'planned' },
    { key: 'mcp-atlas', label: 'MCP Atlas', description: 'Cross-registry index that dedupes official, Smithery, Glama, PulseMCP, and GitHub.', status: 'planned' },
    { key: 'pypi', label: 'PyPI', description: 'Python package search for mcp-server and modelcontextprotocol keywords.', status: 'planned' },
    { key: 'crates', label: 'crates.io', description: 'Rust MCP server packages and CLI servers from crate metadata.', status: 'planned' },
    { key: 'reference-servers', label: 'MCP Reference Servers', description: 'modelcontextprotocol/servers repository for canonical examples and package metadata.', status: 'planned' },
    { key: 'awesome-mcp', label: 'Awesome MCP Lists', description: 'GitHub markdown lists for curated servers not yet published to registries.', status: 'planned' },
    { key: 'apify', label: 'Apify Store', description: 'Actors and MCP-ready integrations with tool, auth, and scraping metadata.', status: 'planned' },
    { key: 'pipedream', label: 'Pipedream', description: 'App integration catalog and MCP endpoints for hosted workflow tools.', status: 'planned' },
    { key: 'zapier', label: 'Zapier', description: 'Action catalog and MCP/AI action metadata for SaaS integrations.', status: 'planned' },
    { key: 'cloudflare', label: 'Cloudflare MCP', description: 'Cloudflare Workers, docs, and account MCP servers plus gateway examples.', status: 'planned' },
    { key: 'microsoft', label: 'Microsoft MCP Catalogs', description: 'Microsoft, Azure, VS Code, and GitHub MCP server references.', status: 'planned' },
    { key: 'composio', label: 'Composio', description: 'Hosted tool/action catalog with MCP-compatible integrations.', status: 'planned' },
    { key: 'mcp-run', label: 'MCP.run', description: 'Hosted MCP server and package directory for deployable tools.', status: 'planned' },
    { key: 'aci-dev', label: 'ACI.dev', description: 'Agent tool registry and MCP-compatible integrations for external APIs.', status: 'planned' },
    { key: 'mcp-market', label: 'MCP Market', description: 'Community marketplace listed in MCP ecosystem/security research.', status: 'planned' },
    { key: 'mcp-store', label: 'MCP Store', description: 'Community MCP server marketplace and directory metadata.', status: 'planned' },
    { key: 'docker-hub-mcp', label: 'Docker Hub MCP Pages', description: 'Docker Hub MCP server pages with tools, categories, and install counts.', status: 'planned' },
];

export const SKILL_SOURCES: EntitySource[] = [
    { key: 'claude-plugins-official', label: 'Claude Plugins Marketplace', description: 'anthropics/claude-plugins-official official marketplace manifest.', status: 'available' },
    { key: 'anthropic-skills', label: 'Anthropic Skills', description: 'Official Claude skills and example SKILL.md packages.', status: 'planned' },
    { key: 'cowork-plugins', label: 'Cowork Plugins', description: 'knowledge-work-plugins marketplace for brand voice, productivity, and workflows.', status: 'planned' },
    { key: 'huggingface-skills', label: 'Hugging Face', description: 'Community skills, agents, Spaces, and prompt-like packages on the Hub.', status: 'planned' },
    { key: 'github-skills', label: 'GitHub Topics', description: 'Repos tagged claude-code-skills, claude-skills, agent-skills, and system-prompts.', status: 'planned' },
    { key: 'skills-directory', label: 'Skills Directory', description: 'Public registry API for searchable skills, GitHub metadata, votes, and compatibility.', status: 'planned' },
    { key: 'claudskills', label: 'ClaudSkills', description: 'Nightly GitHub crawler for public SKILL.md files and Claude Code skill categories.', status: 'planned' },
    { key: 'agentskills-to', label: 'AgentSkills.to', description: 'Agent skills marketplace for Claude Code, Codex, Cursor, Amp, and Gemini.', status: 'planned' },
    { key: 'agentskills-wiki', label: 'Agent Skills Wiki', description: 'Open SKILL.md registry with REST/OpenAPI and install endpoints.', status: 'planned' },
    { key: 'agent-skillhub', label: 'AgentSkillHub', description: 'Community library of SKILL.md packages with verified examples.', status: 'planned' },
    { key: 'cursor-directory', label: 'Cursor Directory', description: 'Community Cursor rules, MCP servers, plugins, and integrations.', status: 'planned' },
    { key: 'awesome-cursorrules', label: 'Awesome CursorRules', description: 'GitHub/list collections of .cursorrules and .mdc rule templates.', status: 'planned' },
    { key: 'cursor-rules-awesome', label: 'cursor-rules-awesome', description: 'npm/GitHub package of enterprise Cursor coding standards and rules.', status: 'planned' },
    { key: 'cline-rules', label: 'Cline Rules', description: 'Cline/Roo rule collections and custom instruction repositories.', status: 'planned' },
    { key: 'continue-hub', label: 'Continue Hub', description: 'Continue assistants, rules, context providers, and block catalogs.', status: 'planned' },
    { key: 'langchain-hub', label: 'LangChain Hub', description: 'Prompt, runnable, and agent hub surfaced through LangSmith APIs.', status: 'planned' },
    { key: 'promptbase', label: 'PromptBase', description: 'Prompt marketplace listings with categories, creators, and pricing.', status: 'planned' },
    { key: 'flowgpt', label: 'FlowGPT', description: 'Prompt and agent persona marketplace with public listing pages.', status: 'planned' },
    { key: 'prompthero-prompts', label: 'PromptHero Prompts', description: 'Prompt marketplace and workflow listings for image and text generation.', status: 'planned' },
    { key: 'awesome-chatgpt-prompts', label: 'Awesome ChatGPT Prompts', description: 'GitHub prompt/persona corpus for prompt-shaped skill imports.', status: 'planned' },
    { key: 'system-prompts-github', label: 'System Prompt Repos', description: 'GitHub topics and awesome lists for reusable system prompts and personas.', status: 'planned' },
    { key: 'goose-extensions', label: 'Goose Extensions', description: 'Block/Open-source Goose extension and instruction catalogs.', status: 'planned' },
    { key: 'aider-conventions', label: 'Aider Conventions', description: 'Community convention files and reusable coding-agent instruction packs.', status: 'planned' },
    { key: 'openai-gpt-store', label: 'OpenAI GPT Store', description: 'GPT/action listings where accessible through public pages or exportable metadata.', status: 'planned' },
    { key: 'devkit-market', label: 'DevKit Market', description: 'Cross-agent skill directory covering Claude, ChatGPT, Codex, and curated skills.', status: 'planned' },
];

/** Default enabled state: only wired ("available") sources start on. */
export const DEFAULT_MODEL_SOURCES: Record<string, boolean> = Object.fromEntries(
    MODEL_SOURCES.filter(source => source.status === 'available').map(source => [source.key, true])
);

export const DEFAULT_MCP_SOURCES: Record<string, boolean> = Object.fromEntries(
    MCP_SOURCES.filter(source => source.status === 'available').map(source => [source.key, true])
);

export const DEFAULT_SKILL_SOURCES: Record<string, boolean> = Object.fromEntries(
    SKILL_SOURCES.filter(source => source.status === 'available').map(source => [source.key, true])
);

export function getSourceCatalog(category: EntitySourceCategory): EntitySource[] {
    if (category === 'models') return MODEL_SOURCES;
    if (category === 'mcp') return MCP_SOURCES;
    return SKILL_SOURCES;
}

/**
 * Both the Settings and Onboarding surfaces currently render the same source
 * list — "available" sources are selectable, "planned" sources show as
 * disabled roadmap chips. The `surface` parameter is intentionally retained
 * for forward-compat (e.g. hiding the planned roadmap in Onboarding, or
 * surfacing API-key prompts only in Settings); callers should keep passing
 * the correct surface so future divergence is a single-call-site change.
 */
export function getSourcesForSurface(
    _surface: EntitySourceSurface,
    category: EntitySourceCategory
): DisplayEntitySource[] {
    return getSourceCatalog(category).map(source => ({
        ...source,
        isSelectable: source.status === 'available',
    }));
}

export function getSourceDedupeStrategy(category: EntitySourceCategory): string {
    return SOURCE_DEDUPE_STRATEGIES[category];
}

export function getSourceCategorySummary(category: EntitySourceCategory) {
    const sources = getSourceCatalog(category);
    const available = sources.filter(source => source.status === 'available').length;
    return {
        total: sources.length,
        available,
        planned: sources.length - available,
        dedupeStrategy: getSourceDedupeStrategy(category),
    };
}
