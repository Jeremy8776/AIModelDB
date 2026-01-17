/**
 * Schema Validation Tests
 * 
 * Tests for the Zod validation schemas to ensure they properly validate
 * and sanitize API responses.
 */

import { describe, it, expect } from 'vitest';
import {
    ModelSchema,
    HuggingFaceModelSchema,
    OllamaModelSchema,
    validateModels,
    coerceToModel,
    safeParse
} from './schemas';

describe('ModelSchema', () => {
    it('should validate a complete model', () => {
        const validModel = {
            id: 'test-model-1',
            name: 'Test Model',
            provider: 'TestProvider',
            domain: 'LLM',
            source: 'test',
            license: {
                name: 'MIT',
                type: 'OSI',
                commercial_use: true,
            },
            hosting: {
                weights_available: true,
                api_available: false,
            },
            tags: ['test', 'llm'],
        };

        const result = ModelSchema.safeParse(validModel);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.id).toBe('test-model-1');
            expect(result.data.name).toBe('Test Model');
        }
    });

    it('should apply defaults for missing optional fields', () => {
        const minimalModel = {
            id: 'minimal',
            name: 'Minimal Model',
        };

        const result = ModelSchema.safeParse(minimalModel);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.tags).toEqual([]);
            expect(result.data.domain).toBe('Other');
        }
    });

    it('should reject models without ID', () => {
        const invalidModel = {
            name: 'No ID Model',
        };

        const result = ModelSchema.safeParse(invalidModel);
        expect(result.success).toBe(false);
    });

    it('should reject models without name', () => {
        const invalidModel = {
            id: 'has-id',
        };

        const result = ModelSchema.safeParse(invalidModel);
        expect(result.success).toBe(false);
    });
});

describe('HuggingFaceModelSchema', () => {
    it('should validate a HuggingFace API response item', () => {
        const hfModel = {
            id: 'meta-llama/Llama-2-7b-chat-hf',
            modelId: 'Llama-2-7b-chat-hf',
            author: 'meta-llama',
            downloads: 1234567,
            lastModified: '2024-01-15T10:00:00Z',
            tags: ['text-generation', 'pytorch'],
            license: 'llama2',
        };

        const result = HuggingFaceModelSchema.safeParse(hfModel);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.id).toBe('meta-llama/Llama-2-7b-chat-hf');
            expect(result.data.downloads).toBe(1234567);
        }
    });

    it('should apply defaults for missing fields', () => {
        const minimalHfModel = {
            id: 'simple-model',
        };

        const result = HuggingFaceModelSchema.safeParse(minimalHfModel);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.downloads).toBe(0);
            expect(result.data.tags).toEqual([]);
        }
    });
});

describe('OllamaModelSchema', () => {
    it('should validate an Ollama API response item', () => {
        const ollamaModel = {
            name: 'llama2:7b',
            model: 'llama2:7b',
            modified_at: '2024-01-15T10:00:00Z',
            size: 3826793472,
            digest: 'abc123',
            details: {
                parameter_size: '7B',
                quantization_level: 'Q4_K_M',
                format: 'gguf',
                family: 'llama',
            },
        };

        const result = OllamaModelSchema.safeParse(ollamaModel);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.name).toBe('llama2:7b');
            expect(result.data.details?.parameter_size).toBe('7B');
        }
    });
});

describe('validateModels', () => {
    it('should filter out invalid models and return valid ones', () => {
        const models = [
            { id: 'valid-1', name: 'Valid Model 1' },
            { name: 'Missing ID' }, // Invalid
            { id: 'valid-2', name: 'Valid Model 2' },
            { id: 'missing-name' }, // Invalid
        ];

        const validated = validateModels(models);
        expect(validated).toHaveLength(2);
        expect(validated[0].id).toBe('valid-1');
        expect(validated[1].id).toBe('valid-2');
    });
});

describe('coerceToModel', () => {
    it('should coerce a partial model by generating required fields', () => {
        const partial = {
            name: 'Just a name',
            provider: 'SomeProvider',
        };

        const result = coerceToModel(partial);
        expect(result).not.toBeNull();
        if (result) {
            expect(result.name).toBe('Just a name');
            expect(result.provider).toBe('SomeProvider');
            expect(result.id).toMatch(/^generated-/);
        }
    });

    it('should return null for completely invalid data', () => {
        const result = coerceToModel(null);
        expect(result).toBeNull();

        const result2 = coerceToModel('not an object');
        expect(result2).toBeNull();
    });
});

describe('safeParse', () => {
    it('should return parsed data on success', () => {
        const data = { id: 'test', name: 'Test' };
        const result = safeParse(ModelSchema, data, { id: 'default', name: 'Default' } as any);
        expect(result.id).toBe('test');
    });

    it('should return default value on failure', () => {
        const invalidData = { notAnId: 'test' };
        const defaultModel = { id: 'default', name: 'Default' };
        const result = safeParse(ModelSchema, invalidData, defaultModel as any);
        expect(result.id).toBe('default');
    });
});
