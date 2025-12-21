import { describe, it, expect } from 'vitest';
import {
    dedupe,
    normalizeNameForMatch,
    toCSV,
    parseCSV,
    parseTSV,
    mapDomain,
    cleanModelDescription,
    riskScore
} from '../utils/format';
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
        id: 'test-id',
        name: 'Test Model',
        provider: 'TestProvider',
        domain: 'LLM',
        source: 'test',
        license: defaultLicense,
        hosting: defaultHosting,
        ...overrides,
    };
}

describe('dedupe', () => {
    it('should remove duplicate models by provider+name', () => {
        const models: Model[] = [
            createModel({ id: '1', name: 'GPT-4', provider: 'OpenAI' }),
            createModel({ id: '2', name: 'GPT-4', provider: 'OpenAI' }), // Duplicate
            createModel({ id: '3', name: 'Claude 3', provider: 'Anthropic' }),
        ];

        const result = dedupe(models);
        expect(result).toHaveLength(2);
        expect(result.map(m => m.id)).toEqual(['1', '3']);
    });

    it('should handle case-insensitive matching', () => {
        const models: Model[] = [
            createModel({ id: '1', name: 'GPT-4', provider: 'OpenAI' }),
            createModel({ id: '2', name: 'gpt-4', provider: 'openai' }), // Same, different case
        ];

        const result = dedupe(models);
        expect(result).toHaveLength(1);
    });

    it('should handle null/undefined items', () => {
        const models = [
            createModel({ id: '1', name: 'Model A' }),
            null as unknown as Model,
            undefined as unknown as Model,
            createModel({ id: '2', name: 'Model B' }),
        ];

        const result = dedupe(models);
        expect(result).toHaveLength(2);
    });

    it('should handle empty array', () => {
        expect(dedupe([])).toEqual([]);
    });
});

describe('normalizeNameForMatch', () => {
    it('should lowercase and remove special characters', () => {
        expect(normalizeNameForMatch('GPT-4')).toBe('gpt 4');
        expect(normalizeNameForMatch('Claude 3.5 Sonnet')).toBe('claude 3 5 sonnet');
    });

    it('should unwrap bracket qualifiers', () => {
        expect(normalizeNameForMatch('FLUX.1 [pro]')).toBe('flux 1 pro');
        expect(normalizeNameForMatch('Model [dev] [beta]')).toBe('model dev beta');
    });

    it('should handle null/undefined', () => {
        expect(normalizeNameForMatch(null)).toBe('');
        expect(normalizeNameForMatch(undefined)).toBe('');
        expect(normalizeNameForMatch('')).toBe('');
    });
});

describe('toCSV', () => {
    it('should convert array of objects to CSV string', () => {
        const rows = [
            { name: 'Model A', provider: 'Provider 1' },
            { name: 'Model B', provider: 'Provider 2' },
        ];

        const result = toCSV(rows);
        const lines = result.split('\n');

        expect(lines[0]).toBe('name,provider');
        expect(lines[1]).toBe('Model A,Provider 1');
        expect(lines[2]).toBe('Model B,Provider 2');
    });

    it('should escape values with commas and quotes', () => {
        const rows = [
            { name: 'Model, With Comma', description: 'Has "quotes"' },
        ];

        const result = toCSV(rows);
        expect(result).toContain('"Model, With Comma"');
        expect(result).toContain('"Has ""quotes"""');
    });

    it('should handle arrays by joining with semicolon', () => {
        const rows = [
            { name: 'Model', tags: ['tag1', 'tag2', 'tag3'] },
        ];

        const result = toCSV(rows);
        expect(result).toContain('tag1;tag2;tag3');
    });

    it('should return empty string for empty array', () => {
        expect(toCSV([])).toBe('');
    });
});

describe('parseCSV', () => {
    it('should parse CSV string to array of objects', () => {
        const csv = 'name,provider\nModel A,Provider 1\nModel B,Provider 2';

        const result = parseCSV(csv);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({ name: 'Model A', provider: 'Provider 1' });
        expect(result[1]).toEqual({ name: 'Model B', provider: 'Provider 2' });
    });

    it('should handle quoted values with commas', () => {
        const csv = 'name,description\n"Model, One","Has a comma"';

        const result = parseCSV(csv);

        expect(result[0].name).toBe('Model, One');
        expect(result[0].description).toBe('Has a comma');
    });

    it('should handle escaped quotes', () => {
        const csv = 'name,description\n"Model A","Says ""hello"""';

        const result = parseCSV(csv);

        expect(result[0].description).toBe('Says "hello"');
    });
});

describe('parseTSV', () => {
    it('should parse TSV string to array of objects', () => {
        const tsv = 'name\tprovider\nModel A\tProvider 1\nModel B\tProvider 2';

        const result = parseTSV(tsv);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({ name: 'Model A', provider: 'Provider 1' });
    });
});

describe('mapDomain', () => {
    it('should map VLM-related terms', () => {
        expect(mapDomain('vlm')).toBe('VLM');
        expect(mapDomain('vision')).toBe('VLM');
        expect(mapDomain('multimodal')).toBe('VLM');
    });

    it('should map LLM-related terms', () => {
        expect(mapDomain('llm')).toBe('LLM');
        expect(mapDomain('language model')).toBe('LLM');
        expect(mapDomain('chat')).toBe('LLM');
    });

    it('should map image generation terms', () => {
        expect(mapDomain('text-to-image')).toBe('ImageGen');
        expect(mapDomain('image generation')).toBe('ImageGen');
    });

    it('should map audio terms correctly', () => {
        expect(mapDomain('tts')).toBe('TTS');
        expect(mapDomain('speech recognition')).toBe('ASR');
        expect(mapDomain('asr')).toBe('ASR');
    });

    it('should default to Other for unknown terms', () => {
        expect(mapDomain('unknown')).toBe('Other');
        expect(mapDomain('')).toBe('Other');
        expect(mapDomain(undefined)).toBe('Other');
    });

    it('should use sheetName as fallback', () => {
        expect(mapDomain(undefined, 'LLM Models')).toBe('LLM');
    });
});

describe('cleanModelDescription', () => {
    it('should remove markdown images', () => {
        const desc = 'Some text ![alt](http://image.png) more text';
        expect(cleanModelDescription(desc)).toBe('Some text  more text');
    });

    it('should convert markdown links to text', () => {
        const desc = 'Check out [this link](http://example.com) for more';
        expect(cleanModelDescription(desc)).toBe('Check out this link for more');
    });

    it('should remove header markers', () => {
        const desc = '# Header\nSome text\n## Another header';
        expect(cleanModelDescription(desc)).toBe('Header\nSome text\nAnother header');
    });

    it('should remove bold/italic markers', () => {
        const desc = 'This is **bold** and *italic* text';
        expect(cleanModelDescription(desc)).toBe('This is bold and italic text');
    });

    it('should handle null/undefined', () => {
        expect(cleanModelDescription(null)).toBe('');
        expect(cleanModelDescription(undefined)).toBe('');
    });
});

describe('riskScore', () => {
    it('should return Amber for missing license', () => {
        const model = createModel({ license: undefined as unknown as LicenseInfo });
        const result = riskScore(model);
        expect(result.level).toBe('Amber');
    });

    it('should return Red for non-commercial license', () => {
        const model = createModel({
            license: {
                name: 'Non-Commercial',
                type: 'Non-Commercial',
                commercial_use: false,
                attribution_required: false,
                share_alike: false,
                copyleft: false,
            },
        });
        const result = riskScore(model);
        expect(result.level).toBe('Red');
    });

    it('should return Amber for copyleft license', () => {
        const model = createModel({
            license: {
                name: 'GPL',
                type: 'Copyleft',
                commercial_use: true,
                attribution_required: true,
                share_alike: true,
                copyleft: true,
            },
        });
        const result = riskScore(model);
        expect(result.level).toBe('Amber');
    });

    it('should return Green for OSI license without copyleft', () => {
        const model = createModel({
            license: {
                name: 'MIT',
                type: 'OSI',
                commercial_use: true,
                attribution_required: true,
                share_alike: false,
                copyleft: false,
            },
        });
        const result = riskScore(model);
        expect(result.level).toBe('Green');
    });
});
