import { describe, it, expect } from 'vitest';
import { matchExistingIndex, mergeRecords, performMergeBatch } from '../utils/mergeLogic';
import { Model, LicenseInfo, Hosting } from '../types';

// Helper to create a minimal valid model
function createModel(overrides: Partial<Model> = {}): Model {
    const defaultLicense: LicenseInfo = {
        name: 'MIT',
        type: 'OSI',
        commercial_use: true,
        attribution_required: false,
        share_alike: false,
        copyleft: false,
    };
    const defaultHosting: Hosting = {
        weights_available: true,
        api_available: true,
        on_premise_friendly: true,
    };
    return {
        id: 'test-id-' + Math.random().toString(36).substring(7),
        name: 'Test Model',
        provider: 'TestProvider',
        domain: 'LLM',
        source: 'test',
        license: defaultLicense,
        hosting: defaultHosting,
        ...overrides,
    };
}

describe('matchExistingIndex', () => {
    it('should match by exact id', () => {
        const existing = [
            createModel({ id: 'model-1', name: 'Model A' }),
            createModel({ id: 'model-2', name: 'Model B' }),
        ];
        const incoming = createModel({ id: 'model-2', name: 'Different Name' });

        const result = matchExistingIndex(existing, incoming, false);
        expect(result).toBe(1);
    });

    it('should match by repo', () => {
        const existing = [
            createModel({ id: '1', repo: 'https://github.com/org/model-a' }),
            createModel({ id: '2', repo: 'https://github.com/org/model-b' }),
        ];
        const incoming = createModel({ id: '3', repo: 'https://github.com/org/model-b' });

        const result = matchExistingIndex(existing, incoming, false);
        expect(result).toBe(1);
    });

    it('should match by url', () => {
        const existing = [
            createModel({ id: '1', url: 'https://huggingface.co/model-a' }),
            createModel({ id: '2', url: 'https://huggingface.co/model-b' }),
        ];
        const incoming = createModel({ id: '3', url: 'https://huggingface.co/model-b' });

        const result = matchExistingIndex(existing, incoming, false);
        expect(result).toBe(1);
    });

    it('should match by normalized name when autoMergeDuplicates is true', () => {
        const existing = [
            createModel({ id: '1', name: 'GPT-4', provider: 'OpenAI' }),
        ];
        const incoming = createModel({ id: '2', name: 'gpt-4', provider: 'OpenAI' });

        const result = matchExistingIndex(existing, incoming, true);
        expect(result).toBe(0);
    });

    it('should not match by name when autoMergeDuplicates is false', () => {
        const existing = [
            createModel({ id: '1', name: 'GPT-4', provider: 'OpenAI' }),
        ];
        const incoming = createModel({ id: '2', name: 'gpt-4', provider: 'OpenAI' });

        const result = matchExistingIndex(existing, incoming, false);
        expect(result).toBe(-1);
    });

    it('should return -1 when no match found', () => {
        const existing = [
            createModel({ id: '1', name: 'Model A' }),
        ];
        const incoming = createModel({ id: '2', name: 'Model B' });

        const result = matchExistingIndex(existing, incoming, false);
        expect(result).toBe(-1);
    });

    it('should require same domain for name matching', () => {
        const existing = [
            createModel({ id: '1', name: 'FLUX', domain: 'ImageGen' }),
        ];
        const incoming = createModel({ id: '2', name: 'FLUX', domain: 'LLM' });

        // Different domains should not match even with same name
        const result = matchExistingIndex(existing, incoming, true);
        expect(result).toBe(-1);
    });
});

describe('mergeRecords', () => {
    it('should prefer incoming values for dynamic fields like parameters', () => {
        // Dynamic fields (parameters, downloads, etc.) prefer incoming to get fresh data from sources
        const existing = createModel({
            name: 'Existing Name',
            provider: 'Existing Provider',
            parameters: '7B',
        });
        const incoming = createModel({
            name: 'Incoming Name',
            provider: 'Incoming Provider',
            parameters: '13B',
        });

        const result = mergeRecords(existing, incoming);

        // Identity fields (name, provider) prefer existing
        expect(result.name).toBe('Existing Name');
        expect(result.provider).toBe('Existing Provider');
        // Dynamic fields (parameters) prefer incoming for fresh data
        expect(result.parameters).toBe('13B');
    });

    it('should fill in missing values from incoming', () => {
        const existing = createModel({
            name: 'Model',
            parameters: undefined,
            context_window: undefined,
        });
        const incoming = createModel({
            name: 'Model',
            parameters: '7B',
            context_window: '8192',
        });

        const result = mergeRecords(existing, incoming);

        expect(result.parameters).toBe('7B');
        expect(result.context_window).toBe('8192');
    });

    it('should merge tags without duplicates', () => {
        const existing = createModel({
            tags: ['llm', 'chat', 'english'],
        });
        const incoming = createModel({
            tags: ['llm', 'multilingual', 'new-tag'],
        });

        const result = mergeRecords(existing, incoming);

        expect(result.tags).toHaveLength(5);
        expect(result.tags).toContain('llm');
        expect(result.tags).toContain('chat');
        expect(result.tags).toContain('multilingual');
        expect(result.tags).toContain('new-tag');
    });

    it('should merge usage restrictions', () => {
        const existing = createModel({
            usage_restrictions: ['no-violence'],
        });
        const incoming = createModel({
            usage_restrictions: ['no-violence', 'no-nsfw'],
        });

        const result = mergeRecords(existing, incoming);

        expect(result.usage_restrictions).toContain('no-violence');
        expect(result.usage_restrictions).toContain('no-nsfw');
        expect(result.usage_restrictions?.length).toBe(2);
    });

    it('should merge hosting providers', () => {
        const existing = createModel({
            hosting: {
                weights_available: true,
                api_available: false,
                on_premise_friendly: true,
                providers: ['HuggingFace'],
            },
        });
        const incoming = createModel({
            hosting: {
                weights_available: false,
                api_available: true,
                on_premise_friendly: false,
                providers: ['Replicate', 'HuggingFace'],
            },
        });

        const result = mergeRecords(existing, incoming);

        expect(result.hosting.weights_available).toBe(true);
        expect(result.hosting.api_available).toBe(true);
        expect(result.hosting.providers).toContain('HuggingFace');
        expect(result.hosting.providers).toContain('Replicate');
        expect(result.hosting.providers?.length).toBe(2);
    });

    it('should merge pricing without duplicates', () => {
        const existing = createModel({
            pricing: [
                { unit: 'token', input: 0.01, output: 0.02, currency: 'USD' },
            ],
        });
        const incoming = createModel({
            pricing: [
                { unit: 'token', input: 0.01, output: 0.02, currency: 'USD' }, // Duplicate
                { unit: 'month', flat: 20, currency: 'USD' }, // New
            ],
        });

        const result = mergeRecords(existing, incoming);

        expect(result.pricing?.length).toBe(2);
    });

    it('should prefer English description over CJK', () => {
        const existing = createModel({
            description: '这是中文描述',
        });
        const incoming = createModel({
            description: 'This is an English description',
        });

        const result = mergeRecords(existing, incoming);

        expect(result.description).toBe('This is an English description');
    });
});

describe('performMergeBatch', () => {
    it('should add new models', () => {
        const current = [createModel({ id: '1', name: 'Model A' })];
        const newModels = [createModel({ id: '2', name: 'Model B' })];

        const result = performMergeBatch(current, newModels, false);

        expect(result.added).toBe(1);
        expect(result.updated).toBe(0);
        expect(result.models.length).toBe(2);
    });

    it('should update existing models', () => {
        const current = [createModel({ id: '1', name: 'Model A', parameters: undefined })];
        const newModels = [createModel({ id: '1', name: 'Model A', parameters: '7B' })];

        const result = performMergeBatch(current, newModels, false);

        expect(result.added).toBe(0);
        expect(result.updated).toBe(1);
        expect(result.models[0].parameters).toBe('7B');
    });

    it('should dedupe results', () => {
        const current = [
            createModel({ id: '1', name: 'GPT-4', provider: 'OpenAI' }),
        ];
        const newModels = [
            createModel({ id: '2', name: 'gpt-4', provider: 'openai' }), // Duplicate by name
        ];

        const result = performMergeBatch(current, newModels, true);

        // With autoMergeDuplicates=true, it should merge instead of add
        expect(result.updated).toBe(1);
        expect(result.added).toBe(0);
    });

    it('should not mutate input arrays', () => {
        const current = [createModel({ id: '1' })];
        const newModels = [createModel({ id: '2' })];
        const originalLength = current.length;

        performMergeBatch(current, newModels, false);

        expect(current.length).toBe(originalLength);
    });
});
