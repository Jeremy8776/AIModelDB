/**
 * API Response Schemas
 * 
 * Runtime validation schemas for external API responses using Zod.
 * Prevents crashes from malformed or unexpected API data.
 */

import { z } from 'zod';
import { MCPServer, Skill } from '../../types';

// ============================================================================
// Common Schemas
// ============================================================================

/**
 * License information schema
 */
export const LicenseSchema = z.object({
    name: z.string().optional().default('Unknown'),
    type: z.enum(['OSI', 'Copyleft', 'Proprietary', 'Custom', 'Research', 'Custom-Commercial', 'Unknown']).optional().default('Custom'),
    commercial_use: z.boolean().optional().default(true),
    attribution_required: z.boolean().optional().default(false),
    share_alike: z.boolean().optional().default(false),
    copyleft: z.boolean().optional().default(false),
    url: z.string().optional(),
    notes: z.string().optional(),
});

/**
 * Hosting information schema
 */
export const HostingSchema = z.object({
    weights_available: z.boolean().optional().default(false),
    api_available: z.boolean().optional().default(false),
    on_premise_friendly: z.boolean().optional().default(false),
    providers: z.array(z.string()).optional(),
});

/**
 * Pricing entry schema
 */
export const PricingSchema = z.object({
    model: z.string().optional(),
    unit: z.string().optional(),
    input: z.number().nullable().optional(),
    output: z.number().nullable().optional(),
    flat: z.number().nullable().optional(),
    currency: z.string().optional().default('USD'),
});

/**
 * Model domain enumeration
 */
export const DomainSchema = z.enum([
    'LLM', 'VLM', 'Vision', 'ImageGen', 'VideoGen', 'Audio', 'ASR', 'TTS',
    '3D', 'World/Sim', 'BackgroundRemoval', 'Upscaler', 'LoRA', 'FineTune', 'Other'
]).optional().default('Other');

// ============================================================================
// Model Schema
// ============================================================================

/**
 * Full model schema for validation
 */
export const ModelSchema = z.object({
    id: z.string(),
    name: z.string(),
    provider: z.string().optional().nullable(),
    domain: DomainSchema,
    source: z.string().optional(),
    url: z.string().optional().nullable(),
    repo: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    license: LicenseSchema.optional(),
    hosting: HostingSchema.optional(),
    pricing: z.array(PricingSchema).optional(),
    downloads: z.number().optional().nullable(),
    updated_at: z.string().optional().nullable(),
    release_date: z.string().optional().nullable(),
    tags: z.array(z.string()).optional().default([]),
    parameters: z.string().optional().nullable(),
    context_window: z.string().optional().nullable(),
    indemnity: z.string().optional().nullable(),
    data_provenance: z.string().optional().nullable(),
    usage_restrictions: z.array(z.string()).optional(),
    images: z.array(z.string()).optional(),
    isFavorite: z.boolean().optional(),
    isNSFWFlagged: z.boolean().optional(),
    flaggedImageUrls: z.array(z.string()).optional(),
});

export type ValidatedModel = z.infer<typeof ModelSchema>;

// ============================================================================
// API-Specific Schemas
// ============================================================================

/**
 * HuggingFace API response schema
 */
export const HuggingFaceModelSchema = z.object({
    id: z.string(),
    modelId: z.string().optional(),
    name: z.string().optional(),
    author: z.string().optional().nullable(),
    downloads: z.number().optional().default(0),
    lastModified: z.string().optional(),
    lastModifiedAt: z.string().optional(),
    createdAt: z.string().optional(),
    created: z.string().optional(),
    tags: z.array(z.string()).optional().default([]),
    license: z.string().optional().nullable(),
    params: z.union([z.string(), z.number()]).optional().nullable(),
    pipeline_tag: z.string().optional(),
});

export const HuggingFaceResponseSchema = z.union([
    z.array(HuggingFaceModelSchema),
    z.object({
        models: z.array(HuggingFaceModelSchema).optional(),
        results: z.array(HuggingFaceModelSchema).optional(),
    }),
]);

/**
 * Ollama API response schema
 */
export const OllamaModelSchema = z.object({
    name: z.string(),
    model: z.string().optional(),
    modified_at: z.string().optional(),
    size: z.number().optional(),
    digest: z.string().optional(),
    details: z.object({
        parameter_size: z.string().optional(),
        quantization_level: z.string().optional(),
        format: z.string().optional(),
        family: z.string().optional(),
    }).optional(),
});

export const OllamaResponseSchema = z.object({
    models: z.array(OllamaModelSchema),
});

/**
 * OpenAI API models response schema
 */
export const OpenAIModelSchema = z.object({
    id: z.string(),
    object: z.literal('model').optional(),
    created: z.number().optional(),
    owned_by: z.string().optional(),
});

export const OpenAIModelsResponseSchema = z.object({
    data: z.array(OpenAIModelSchema),
    object: z.literal('list').optional(),
});

/**
 * Anthropic API models response schema
 */
export const AnthropicModelSchema = z.object({
    id: z.string(),
    display_name: z.string().optional(),
    created_at: z.string().optional(),
});

export const AnthropicModelsResponseSchema = z.object({
    data: z.array(AnthropicModelSchema),
});

/**
 * Google Gemini API models response schema
 */
export const GeminiModelSchema = z.object({
    name: z.string(),
    displayName: z.string().optional(),
    description: z.string().optional(),
    inputTokenLimit: z.number().optional(),
    outputTokenLimit: z.number().optional(),
    supportedGenerationMethods: z.array(z.string()).optional(),
});

export const GeminiModelsResponseSchema = z.object({
    models: z.array(GeminiModelSchema),
});

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Safely parse data with a schema, returning default on failure
 */
export function safeParse<T>(
    schema: z.ZodType<T>,
    data: unknown,
    defaultValue: T
): T {
    const result = schema.safeParse(data);
    if (result.success) {
        return result.data;
    }
    console.warn('[Validation] Schema validation failed:', result.error.issues);
    return defaultValue;
}

/**
 * Parse with logging but throw on failure
 */
export function parseOrThrow<T>(
    schema: z.ZodType<T>,
    data: unknown,
    context?: string
): T {
    const result = schema.safeParse(data);
    if (result.success) {
        return result.data;
    }
    const message = context
        ? `[Validation] ${context}: ${result.error.message}`
        : `[Validation] Schema validation failed: ${result.error.message}`;
    console.error(message, result.error.issues);
    throw new Error(message);
}

/**
 * Validate an array of models, filtering out invalid entries
 */
export function validateModels(models: unknown[]): ValidatedModel[] {
    const validated: ValidatedModel[] = [];

    for (const model of models) {
        const result = ModelSchema.safeParse(model);
        if (result.success) {
            validated.push(result.data);
        } else {
            // Log but continue - don't fail entire import for one bad model
            console.warn('[Validation] Invalid model skipped:',
                (model as any)?.id || (model as any)?.name || 'unknown',
                result.error.issues[0]?.message
            );
        }
    }

    return validated;
}

/**
 * Coerce a value to a model, applying defaults for missing fields
 */
function hashString(s: string): string {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
        const char = s.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0;
    }
    return Math.abs(hash).toString(36);
}

export function coerceToModel(data: unknown): ValidatedModel | null {
    // First try direct parse
    const result = ModelSchema.safeParse(data);
    if (result.success) {
        return result.data;
    }

    // Try to salvage by providing required fields
    if (typeof data === 'object' && data !== null) {
        const obj = data as Record<string, unknown>;
        const name = String(obj.name || obj.id || 'Unknown Model').trim();
        const provider = String(obj.provider || 'unknown').trim();
        const derivedId = String(obj.id || obj.modelId || `generated-${hashString(`${provider}-${name}`)}`);

        const patched = {
            id: derivedId,
            name: name,
            provider: obj.provider !== undefined && obj.provider !== null ? String(obj.provider) : undefined,
            domain: obj.domain !== undefined && obj.domain !== null ? String(obj.domain) : undefined,
            source: obj.source !== undefined && obj.source !== null ? String(obj.source) : undefined,
            url: obj.url !== undefined && obj.url !== null ? String(obj.url) : undefined,
            repo: obj.repo !== undefined && obj.repo !== null ? String(obj.repo) : undefined,
            description: obj.description !== undefined && obj.description !== null ? String(obj.description) : undefined,
            license: obj.license,
            hosting: obj.hosting,
            pricing: obj.pricing,
            downloads: obj.downloads !== undefined && obj.downloads !== null ? Number(obj.downloads) : undefined,
            updated_at: obj.updated_at !== undefined && obj.updated_at !== null ? String(obj.updated_at) : undefined,
            release_date: obj.release_date !== undefined && obj.release_date !== null ? String(obj.release_date) : undefined,
            tags: Array.isArray(obj.tags) ? obj.tags.map(String) : undefined,
            parameters: obj.parameters !== undefined && obj.parameters !== null ? String(obj.parameters) : undefined,
            context_window: obj.context_window !== undefined && obj.context_window !== null ? String(obj.context_window) : undefined,
            indemnity: obj.indemnity !== undefined && obj.indemnity !== null ? String(obj.indemnity) : undefined,
            data_provenance: obj.data_provenance !== undefined && obj.data_provenance !== null ? String(obj.data_provenance) : undefined,
            usage_restrictions: Array.isArray(obj.usage_restrictions) ? obj.usage_restrictions.map(String) : undefined,
            images: Array.isArray(obj.images) ? obj.images.map(String) : undefined,
            isFavorite: obj.isFavorite !== undefined && obj.isFavorite !== null ? Boolean(obj.isFavorite) : undefined,
            isNSFWFlagged: obj.isNSFWFlagged !== undefined && obj.isNSFWFlagged !== null ? Boolean(obj.isNSFWFlagged) : undefined,
            flaggedImageUrls: Array.isArray(obj.flaggedImageUrls) ? obj.flaggedImageUrls.map(String) : undefined,
        };

        const retryResult = ModelSchema.safeParse(patched);
        if (retryResult.success) {
            return retryResult.data;
        }
    }

    return null;
}

// ============================================================================
// MCP Server Schemas
// ============================================================================

export const MCPPackageSchema = z.object({
    registryType: z.enum(["npm", "pypi", "oci", "nuget", "other"]),
    identifier: z.string(),
    version: z.string().nullable().optional(),
    runtimeHint: z.enum(["node", "python", "docker", "binary"]).nullable().optional(),
    transport: z.object({ type: z.string() }).optional(),
    runtimeArguments: z.array(z.unknown()).optional(),
    environmentVariables: z.array(z.object({
        name: z.string(),
        description: z.string().optional(),
        isRequired: z.boolean().optional(),
        isSecret: z.boolean().optional(),
        default: z.string().optional(),
    })).optional(),
});

export const MCPRemoteSchema = z.object({
    type: z.enum(["stdio", "sse", "streamable-http", "websocket"]),
    url: z.string().nullable().optional(),
    headers: z.array(z.object({
        name: z.string(),
        isRequired: z.boolean().optional(),
        isSecret: z.boolean().optional(),
    })).optional(),
});

export const MCPServerSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    version: z.string().nullable().optional(),
    repository: z.object({ url: z.string(), source: z.string() }).nullable().optional(),
    websiteUrl: z.string().nullable().optional(),
    packages: z.array(MCPPackageSchema).optional(),
    remotes: z.array(MCPRemoteSchema).optional(),
    capabilities: z.array(z.string()).optional(),
    source: z.string(),
    publishedAt: z.string().nullable().optional(),
    updatedAt: z.string().nullable().optional(),
    namespaceVerified: z.boolean().optional(),
    imageVerified: z.boolean().optional(),
    directoryVerified: z.boolean().optional(),
    license: LicenseSchema.optional(),
    tags: z.array(z.string()).optional().default([]),
    downloads: z.number().nullable().optional(),
    isFavorite: z.boolean().optional(),
    editedFields: z.array(z.string()).optional(),
    _meta: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Validate an array of MCP servers, filtering out invalid entries
 */
export function validateMCPServers(servers: unknown[]): MCPServer[] {
    const validated: MCPServer[] = [];
    for (const server of servers) {
        const result = MCPServerSchema.safeParse(server);
        if (result.success) {
            validated.push(result.data as MCPServer);
        } else {
            console.warn('[Validation] Invalid MCP Server skipped:',
                (server as any)?.id || (server as any)?.name || 'unknown',
                result.error.issues[0]?.message
            );
        }
    }
    return validated;
}

// ============================================================================
// Skill Schemas
// ============================================================================

export const SkillTypeSchema = z.enum(["skill", "plugin", "rule", "prompt", "recipe", "app"]);
export const SkillOriginSchema = z.enum([
    "anthropic-official",
    "cowork-official",
    "agentskills-spec",
    "community-curated",
    "open-submission",
    "third-party"
]);
export const SkillRedistributionSchema = z.enum(["yes", "metadata-only", "no"]);
export const SkillRuntimeSchema = z.enum([
    "claude-code",
    "claude-ai",
    "codex",
    "cursor",
    "windsurf",
    "roo",
    "cline",
    "goose",
    "generic"
]);

export const SkillSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable().optional(),
    type: SkillTypeSchema,
    origin: SkillOriginSchema,
    family: z.string().nullable().optional(),
    triggers: z.array(z.string()).optional(),
    capabilities: z.array(z.string()).optional(),
    requires: z.object({
        mcps: z.array(z.string()).optional(),
        plugins: z.array(z.string()).optional(),
        api_keys: z.array(z.string()).optional(),
        runtimes: z.array(SkillRuntimeSchema).optional(),
    }).optional(),
    install_command: z.string().nullable().optional(),
    source: z.string(),
    source_repo: z.object({
        owner: z.string(),
        repo: z.string(),
        path: z.string(),
        sha: z.string().optional(),
    }).nullable().optional(),
    redistributable: SkillRedistributionSchema,
    license: LicenseSchema.optional(),
    tags: z.array(z.string()).optional().default([]),
    updated_at: z.string().nullable().optional(),
    isFavorite: z.boolean().optional(),
    editedFields: z.array(z.string()).optional(),
    _meta: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Validate an array of Skills, filtering out invalid entries
 */
export function validateSkills(skills: unknown[]): Skill[] {
    const validated: Skill[] = [];
    for (const skill of skills) {
        const result = SkillSchema.safeParse(skill);
        if (result.success) {
            validated.push(result.data as Skill);
        } else {
            console.warn('[Validation] Invalid Skill skipped:',
                (skill as any)?.id || (skill as any)?.name || 'unknown',
                result.error.issues[0]?.message
            );
        }
    }
    return validated;
}
