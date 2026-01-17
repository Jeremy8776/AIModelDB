/**
 * API Response Schemas
 * 
 * Runtime validation schemas for external API responses using Zod.
 * Prevents crashes from malformed or unexpected API data.
 */

import { z } from 'zod';

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
}).passthrough();

/**
 * Hosting information schema
 */
export const HostingSchema = z.object({
    weights_available: z.boolean().optional().default(false),
    api_available: z.boolean().optional().default(false),
    on_premise_friendly: z.boolean().optional().default(false),
    providers: z.array(z.string()).optional(),
}).passthrough();

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
}).passthrough();

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
}).passthrough();

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
}).passthrough();

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
}).passthrough();

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
}).passthrough();

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
}).passthrough();

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
}).passthrough();

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
export function coerceToModel(data: unknown): ValidatedModel | null {
    // First try direct parse
    const result = ModelSchema.safeParse(data);
    if (result.success) {
        return result.data;
    }

    // Try to salvage by providing required fields
    if (typeof data === 'object' && data !== null) {
        const obj = data as Record<string, unknown>;
        const patched = {
            id: obj.id || obj.modelId || `generated-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            name: obj.name || obj.id || 'Unknown Model',
            ...obj,
        };

        const retryResult = ModelSchema.safeParse(patched);
        if (retryResult.success) {
            return retryResult.data;
        }
    }

    return null;
}
