import { describe, it, expect } from 'vitest';
import { toNormalizedModel } from './importNormalization';

describe('toNormalizedModel', () => {
    it('should normalize basic model fields', () => {
        const input = {
            id: 'test-1',
            name: 'Test Model',
            description: 'A test model',
        };
        const result = toNormalizedModel(input, 0);
        expect(result.id).toBe('test-1');
        expect(result.name).toBe('Test Model');
        expect(result.description).toBe('A test model');
    });

    it('should handle domain mapping correctly', () => {
        const input = { Type: 'text-to-image', name: 'Stable Diffusion' };
        const result = toNormalizedModel(input, 1);
        expect(result.domain).toBe('ImageGen');
    });

    it('should parse Excel dates correctly', () => {
        // Excel date 44197 -> 2021-01-01
        const input = { 'Release Date': 44197, name: 'Date Test' };
        const result = toNormalizedModel(input, 2);
        expect(result.release_date).toBe('2021-01-01');
    });

    it('should normalize boolean fields like commercial use', () => {
        const cases = [
            { val: 'yes', expected: true },
            { val: 'Allowed', expected: true },
            { val: 'No', expected: false },
            { val: 'Non-Commercial', expected: false },
        ];

        cases.forEach(({ val, expected }, i) => {
            const result = toNormalizedModel({ commercial: val, name: `Test ${i}` }, i);
            expect(result.license?.commercial_use).toBe(expected);
        });
    });

    it('should parse pricing correctly', () => {
        const input = { pricing: '$0.002 per 1k tokens', name: 'GPT-4' };
        const result = toNormalizedModel(input, 3);
        expect(result.pricing).toBeDefined();
        if (result.pricing && result.pricing[0]) {
            expect(result.pricing[0].input).toBe(0.002);
        }
    });

    it('should clean descriptions', () => {
        const input = { description: 'Here is a [link](http://example.com)', name: 'Desc Test' };
        const result = toNormalizedModel(input, 4);
        expect(result.description).toBe('Here is a link');
    });

    it('should preserve common spreadsheet column aliases', () => {
        const result = toNormalizedModel({
            'Model Name': 'Alias Model',
            Provider: 'Alias Labs',
            URL: 'https://example.com/model',
            Repository: 'https://github.com/alias/model',
            'Commercial Use': 'No',
        }, 5);

        expect(result.provider).toBe('Alias Labs');
        expect(result.url).toBe('https://example.com/model');
        expect(result.repo).toBe('https://github.com/alias/model');
        expect(result.license?.commercial_use).toBe(false);
    });

    it('marks uploaded custom fields as edited so later syncs cannot overwrite them', () => {
        const result = toNormalizedModel({
            id: 'hf-custom/llama',
            name: 'Custom Llama',
            provider: 'Custom Lab',
            description: 'User curated description',
            parameters: '13B',
            'Context Window': '32768',
            license: 'MIT',
            tags: 'local, approved',
            pricing: 'Free',
            URL: 'https://example.com/custom-llama',
            Repository: 'https://github.com/example/custom-llama',
        }, 6);

        expect(result.editedFields).toEqual(expect.arrayContaining([
            'description',
            'parameters',
            'context_window',
            'license',
            'tags',
            'pricing',
            'url',
            'repo',
            'provider',
        ]));
    });
});
