/**
 * NSFW Detection Unit Tests
 * 
 * Tests for the NSFW detection and filtering utilities.
 * Ensures corporate safety filtering works correctly.
 */

import { describe, it, expect } from 'vitest';
import { detectNSFW, filterNSFWModels, isCorporateSafe, getSafetyReport } from './nsfw';

// Helper to create a minimal model for testing
function createTestModel(overrides: Record<string, any> = {}) {
    return {
        id: 'test-' + Math.random().toString(36).substring(7),
        name: 'Test Model',
        provider: 'TestProvider',
        domain: 'LLM',
        source: 'test',
        tags: [],
        ...overrides
    };
}

describe('detectNSFW', () => {
    describe('safe model detection', () => {
        it('should NOT flag trusted providers', () => {
            const result = detectNSFW(createTestModel({
                name: 'Some Model',
                provider: 'OpenAI'
            }));
            expect(result.isNSFW).toBe(false);
            expect(result.reasons).toContain('Trusted provider');
        });

        it('should NOT flag safe model patterns like GPT-4', () => {
            const result = detectNSFW(createTestModel({
                name: 'gpt-4-turbo'
            }));
            expect(result.isNSFW).toBe(false);
        });

        it('should NOT flag Stable Diffusion (general-purpose)', () => {
            const result = detectNSFW(createTestModel({
                name: 'Stable Diffusion XL Base 1.0'
            }));
            expect(result.isNSFW).toBe(false);
        });

        it('should NOT flag NSFW detection/classifier models', () => {
            const result = detectNSFW(createTestModel({
                name: 'NSFW Content Detection Classifier'
            }));
            expect(result.isNSFW).toBe(false);
            expect(result.reasons).toContain('NSFW detection/safety model');
        });

        it('should NOT flag BERT models', () => {
            const result = detectNSFW(createTestModel({
                name: 'bert-base-uncased',
                provider: 'google-bert'
            }));
            expect(result.isNSFW).toBe(false);
        });

        it('should NOT flag LLaMA models', () => {
            const result = detectNSFW(createTestModel({
                name: 'llama-3-8b-instruct',
                provider: 'meta-llama'
            }));
            expect(result.isNSFW).toBe(false);
        });
    });

    describe('NSFW content detection', () => {
        it('should flag explicit model names', () => {
            const result = detectNSFW(createTestModel({
                name: 'Nude Portrait Generator v2'
            }));
            expect(result.isNSFW).toBe(true);
            expect(result.flaggedTerms.length).toBeGreaterThan(0);
        });

        it('should flag models with NSFW in name (not classifiers)', () => {
            const result = detectNSFW(createTestModel({
                name: 'Best NSFW Model XL'
            }));
            expect(result.isNSFW).toBe(true);
        });

        it('should flag explicit tags', () => {
            const result = detectNSFW(createTestModel({
                name: 'Generic Model',
                tags: ['nsfw', 'hentai', 'explicit']
            }));
            expect(result.isNSFW).toBe(true);
            expect(result.reasons).toContain('NSFW tags detected');
        });

        it('should flag 18+ content', () => {
            const result = detectNSFW(createTestModel({
                name: 'Adult Content 18+'
            }));
            expect(result.isNSFW).toBe(true);
        });

        it('should handle CamelCase patterns (hentai)', () => {
            // If "hentai" is in the explicit keywords, it should be caught
            const result = detectNSFW(createTestModel({
                name: 'HentaiArt Model'
            }));
            expect(result.isNSFW).toBe(true);
        });
    });

    describe('edge cases', () => {
        it('should handle empty model name', () => {
            const result = detectNSFW(createTestModel({ name: '' }));
            expect(result.isNSFW).toBe(false);
        });

        it('should handle null/undefined tags', () => {
            const result = detectNSFW(createTestModel({ tags: undefined }));
            expect(result.isNSFW).toBe(false);
        });

        it('should NOT flag "Essex" (contains "sex" substring)', () => {
            const result = detectNSFW(createTestModel({
                name: 'Essex Regional Language Model'
            }));
            expect(result.isNSFW).toBe(false);
        });

        it('should support custom keywords', () => {
            const result = detectNSFW(
                createTestModel({ name: 'CustomBlockedWord Model' }),
                ['customblockedword']
            );
            expect(result.isNSFW).toBe(true);
        });
    });
});

describe('filterNSFWModels', () => {
    it('should separate safe and flagged models', () => {
        const models = [
            createTestModel({ id: '1', name: 'GPT-4', provider: 'OpenAI' }),
            createTestModel({ id: '2', name: 'Nude Generator XL' }),
            createTestModel({ id: '3', name: 'BERT Base', provider: 'Google' }),
        ];

        const { safeModels, flaggedModels, filteredCount } = filterNSFWModels(models, true);

        expect(safeModels.length).toBe(2);
        expect(flaggedModels.length).toBe(1);
        expect(filteredCount).toBe(1);
        expect(flaggedModels[0].name).toBe('Nude Generator XL');
    });

    it('should pass all models through when filtering disabled', () => {
        const models = [
            createTestModel({ id: '1', name: 'Safe Model' }),
            createTestModel({ id: '2', name: 'NSFW Explicit Model' }),
        ];

        const { safeModels, flaggedModels, filteredCount } = filterNSFWModels(models, false);

        expect(safeModels.length).toBe(2);
        expect(flaggedModels.length).toBe(0);
        expect(filteredCount).toBe(0);
    });

    it('should handle empty array', () => {
        const { safeModels, flaggedModels, filteredCount } = filterNSFWModels([], true);

        expect(safeModels).toEqual([]);
        expect(flaggedModels).toEqual([]);
        expect(filteredCount).toBe(0);
    });

    it('should add NSFW metadata to flagged models', () => {
        const models = [
            createTestModel({ id: '1', name: 'Hentai Model XL' }),
        ];

        const { flaggedModels } = filterNSFWModels(models, true);

        expect(flaggedModels[0]._nsfwCheck).toBeDefined();
        expect(flaggedModels[0]._filteredReason).toBe('NSFW content detected');
    });
});

describe('isCorporateSafe', () => {
    it('should return true for safe models', () => {
        const model = createTestModel({
            name: 'GPT-4',
            provider: 'OpenAI'
        });
        expect(isCorporateSafe(model)).toBe(true);
    });

    it('should return false for NSFW models', () => {
        const model = createTestModel({
            name: 'Explicit Adult Content Generator'
        });
        expect(isCorporateSafe(model)).toBe(false);
    });
});

describe('getSafetyReport', () => {
    it('should return safe message for clean models', () => {
        const model = createTestModel({
            name: 'BERT',
            provider: 'Google'
        });
        const report = getSafetyReport(model);
        expect(report).toBe('Model appears safe for corporate use');
    });

    it('should return detailed report for NSFW models', () => {
        const model = createTestModel({
            name: 'Nude Portrait Model'
        });
        const report = getSafetyReport(model);
        expect(report).toContain('NSFW detected');
        expect(report).toContain('100% confidence');
    });
});
