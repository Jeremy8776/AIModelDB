import { Model } from "../types";

/**
 * System Prompts
 */

export const SYSTEM_PROMPT_DISCOVERY = `You are an AI research assistant. Find newly released or significantly updated AI models and summarize key metadata.

Domain catalog (grouped):
LLM: LLM
Multimodal Language: VLM
Vision (CV): Vision
Image Generation: ImageGen, LoRA (image), FineTune (image)
Video Generation: VideoGen, LoRA (video), FineTune (video)
Audio: Audio, ASR, TTS
3D: 3D
Simulation/World: World/Sim
Background Removal: BackgroundRemoval
Upscaling/Super-Resolution: Upscaler
Other: Other

Cover multiple groups above. Prioritize license terms, parameters (e.g., 7B), context window (e.g., 128K), release/update dates, and availability (weights/API).

Return ONLY a JSON array of model objects with fields: id(optional), name, provider, domain, source, url, repo(optional), description(optional), license{name,type,commercial_use}, updated_at(optional), release_date(optional), tags(optional), parameters(optional), context_window(optional), hosting{weights_available,api_available,on_premise_friendly}.`;

export const SYSTEM_PROMPT_ENRICHMENT = "You are an AI expert that provides accurate metadata about AI models.";

export const SYSTEM_PROMPT_VALIDATION = `You are an expert AI model database curator and fact-checker with access to web search.

CRITICAL INSTRUCTIONS:
- Use web search to find accurate, verifiable information for missing fields
- Search official sources: company blogs, research papers, GitHub repos, model cards
- Cross-reference multiple sources before adding data
- For release dates, search: "[model name] release date", "[model name] announcement"
- For parameters, search: "[model name] parameters", "[model name] size"
- For licenses, search: "[model name] license", check official documentation
- NEVER remove or drop models from the database
- ONLY fill in empty fields, preserve existing data
- Return ALL models in the CSV output`;

export const SYSTEM_PROMPT_VALIDATION_SHORT = "You are an expert AI model database curator and fact-checker.";

/**
 * User Prompts
 */

export const USER_PROMPT_DISCOVERY = `Find newly released or significantly updated AI models from the past 30 days. Focus on models that might not be captured by standard API sources (HuggingFace, ArtificialAnalysis). 

Look for:
- New model releases from major AI companies (OpenAI, Anthropic, Google, Meta, etc.)
- Open source models on GitHub, GitLab, or other platforms
- Research paper implementations that have become available
- Updated versions of existing models with significant improvements
- Models from new or smaller providers/researchers

Return a JSON array of discovered models. Each model should include complete metadata.`;

/**
 * Helper to create a generic validation/enrichment prompt with web search instructions
 */
export function createEnrichmentPrompt(model: Model): string {
    return `
I have an AI model with incomplete metadata. USE WEB SEARCH to find accurate, up-to-date information for this model:
${JSON.stringify(model, null, 2)}

IMPORTANT: Search the web for current information about this model. Do NOT rely on training data alone.
Search official sources: GitHub, Hugging Face, company blogs, research papers, model cards.

Return ONLY the updated model JSON with all fields filled. Don't include any explanation.
Focus especially on these fields if they're missing:
- parameters (size of the model, e.g. "7B" or "1.5B")
- context_window (for LLMs, e.g. "8K" or "32K")
- license details (search for the actual license)
- release_date (in ISO format - search for official release date)
- pricing (input/output per million tokens in USD)
- tags
- hosting information
`;
}
