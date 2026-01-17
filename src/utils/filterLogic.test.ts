/**
 * Filter Logic Unit Tests
 * 
 * Tests for the advanced filtering and query parsing in filterLogic.ts.
 */

import { describe, it, expect } from 'vitest';
import { filterModels, FilterOptions } from './filterLogic';
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
        id: 'test-' + Math.random().toString(36).substring(7),
        name: 'Test Model',
        provider: 'TestProvider',
        domain: 'LLM',
        source: 'test',
        license: defaultLicense,
        hosting: defaultHosting,
        ...overrides,
    };
}

// Default filter options
function createOptions(overrides: Partial<FilterOptions> = {}): FilterOptions {
    return {
        query: '',
        domainPick: 'All',
        sortKey: 'name',
        sortDirection: 'asc',
        minDownloads: 0,
        pageSize: null,
        ...overrides
    };
}

describe('filterModels', () => {
    describe('basic filtering', () => {
        it('should return all models when no filters applied', () => {
            const models = [
                createModel({ name: 'Model A' }),
                createModel({ name: 'Model B' }),
            ];
            const result = filterModels(models, createOptions());
            expect(result.length).toBe(2);
        });

        it('should return empty array for empty input', () => {
            const result = filterModels([], createOptions());
            expect(result).toEqual([]);
        });

        it('should filter by domain', () => {
            const models = [
                createModel({ name: 'LLM Model', domain: 'LLM' }),
                createModel({ name: 'Image Model', domain: 'ImageGen' }),
            ];
            const result = filterModels(models, createOptions({ domainPick: 'LLM' }));
            expect(result.length).toBe(1);
            expect(result[0].name).toBe('LLM Model');
        });

        it('should filter by minimum downloads', () => {
            const models = [
                createModel({ name: 'Popular', downloads: 1000 }),
                createModel({ name: 'New', downloads: 50 }),
            ];
            const result = filterModels(models, createOptions({ minDownloads: 500 }));
            expect(result.length).toBe(1);
            expect(result[0].name).toBe('Popular');
        });

        it('should bypass download filter for imports', () => {
            const models = [
                createModel({ name: 'Imported', downloads: 0, source: 'Import' }),
            ];
            const result = filterModels(models, createOptions({ minDownloads: 1000 }));
            expect(result.length).toBe(1);
        });
    });

    describe('text search', () => {
        it('should search by model name', () => {
            const models = [
                createModel({ name: 'GPT-4' }),
                createModel({ name: 'Claude' }),
            ];
            const result = filterModels(models, createOptions({ query: 'gpt' }));
            expect(result.length).toBe(1);
            expect(result[0].name).toBe('GPT-4');
        });

        it('should search by provider', () => {
            const models = [
                createModel({ name: 'Model A', provider: 'OpenAI' }),
                createModel({ name: 'Model B', provider: 'Anthropic' }),
            ];
            const result = filterModels(models, createOptions({ query: 'anthropic' }));
            expect(result.length).toBe(1);
            expect(result[0].provider).toBe('Anthropic');
        });

        it('should search by tags', () => {
            const models = [
                createModel({ name: 'Model A', tags: ['chat', 'assistant'] }),
                createModel({ name: 'Model B', tags: ['code', 'programming'] }),
            ];
            const result = filterModels(models, createOptions({ query: 'chat' }));
            expect(result.length).toBe(1);
            expect(result[0].name).toBe('Model A');
        });

        it('should support multiple search terms', () => {
            const models = [
                createModel({ name: 'GPT-4 Chat', provider: 'OpenAI' }),
                createModel({ name: 'GPT-3', provider: 'OpenAI' }),
            ];
            const result = filterModels(models, createOptions({ query: 'gpt chat' }));
            expect(result.length).toBe(1);
            expect(result[0].name).toBe('GPT-4 Chat');
        });
    });

    describe('advanced query syntax', () => {
        it('should parse domain: operator', () => {
            const models = [
                createModel({ name: 'Model A', domain: 'LLM' }),
                createModel({ name: 'Model B', domain: 'ImageGen' }),
            ];
            const result = filterModels(models, createOptions({ query: 'domain:LLM' }));
            expect(result.length).toBe(1);
            expect(result[0].domain).toBe('LLM');
        });

        it('should parse license: operator', () => {
            const models = [
                createModel({ name: 'Model A', license: { name: 'MIT', type: 'OSI', commercial_use: true, attribution_required: false, share_alike: false, copyleft: false } }),
                createModel({ name: 'Model B', license: { name: 'GPL-3.0', type: 'Copyleft', commercial_use: true, attribution_required: true, share_alike: true, copyleft: true } }),
            ];
            const result = filterModels(models, createOptions({ query: 'license:mit' }));
            expect(result.length).toBe(1);
            expect(result[0].license?.name).toBe('MIT');
        });

        it('should parse downloads:>N operator', () => {
            const models = [
                createModel({ name: 'Popular', downloads: 5000 }),
                createModel({ name: 'New', downloads: 100 }),
            ];
            const result = filterModels(models, createOptions({ query: 'downloads:>1000' }));
            expect(result.length).toBe(1);
            expect(result[0].name).toBe('Popular');
        });

        it('should parse downloads:<N operator', () => {
            const models = [
                createModel({ name: 'Popular', downloads: 5000 }),
                createModel({ name: 'New', downloads: 100 }),
            ];
            const result = filterModels(models, createOptions({ query: 'downloads:<1000' }));
            expect(result.length).toBe(1);
            expect(result[0].name).toBe('New');
        });

        it('should parse tag: operator (include)', () => {
            const models = [
                createModel({ name: 'Model A', tags: ['llm', 'chat'] }),
                createModel({ name: 'Model B', tags: ['image', 'diffusion'] }),
            ];
            const result = filterModels(models, createOptions({ query: 'tag:chat' }));
            expect(result.length).toBe(1);
            expect(result[0].name).toBe('Model A');
        });

        it('should parse -tag: operator (exclude)', () => {
            const models = [
                createModel({ name: 'Model A', tags: ['llm', 'deprecated'] }),
                createModel({ name: 'Model B', tags: ['llm', 'stable'] }),
            ];
            const result = filterModels(models, createOptions({ query: '-tag:deprecated' }));
            expect(result.length).toBe(1);
            expect(result[0].name).toBe('Model B');
        });

        it('should parse source: operator', () => {
            const models = [
                createModel({ name: 'Model A', source: 'huggingface' }),
                createModel({ name: 'Model B', source: 'civitai' }),
            ];
            const result = filterModels(models, createOptions({ query: 'source:hugging' }));
            expect(result.length).toBe(1);
            expect(result[0].source).toBe('huggingface');
        });

        it('should parse provider: operator', () => {
            const models = [
                createModel({ name: 'Model A', provider: 'OpenAI' }),
                createModel({ name: 'Model B', provider: 'Anthropic' }),
            ];
            const result = filterModels(models, createOptions({ query: 'provider:openai' }));
            expect(result.length).toBe(1);
            expect(result[0].provider).toBe('OpenAI');
        });

        it('should parse is:favorite operator', () => {
            const models = [
                createModel({ name: 'Favorite', isFavorite: true }),
                createModel({ name: 'Normal', isFavorite: false }),
            ];
            const result = filterModels(models, createOptions({ query: 'is:favorite' }));
            expect(result.length).toBe(1);
            expect(result[0].name).toBe('Favorite');
        });

        it('should parse is:commercial operator', () => {
            const models = [
                createModel({ name: 'Commercial', license: { name: 'MIT', type: 'OSI', commercial_use: true, attribution_required: false, share_alike: false, copyleft: false } }),
                createModel({ name: 'Non-Commercial', license: { name: 'NC', type: 'Non-Commercial', commercial_use: false, attribution_required: false, share_alike: false, copyleft: false } }),
            ];
            const result = filterModels(models, createOptions({ query: 'is:commercial' }));
            expect(result.length).toBe(1);
            expect(result[0].name).toBe('Commercial');
        });

        it('should combine operators with text search', () => {
            const models = [
                createModel({ name: 'GPT-4', domain: 'LLM', provider: 'OpenAI' }),
                createModel({ name: 'GPT-3', domain: 'LLM', provider: 'OpenAI' }),
                createModel({ name: 'DALL-E', domain: 'ImageGen', provider: 'OpenAI' }),
            ];
            const result = filterModels(models, createOptions({ query: 'gpt domain:LLM' }));
            expect(result.length).toBe(2);
        });
    });

    describe('license filtering', () => {
        it('should filter by license type', () => {
            const models = [
                createModel({ name: 'Open', license: { name: 'MIT', type: 'OSI', commercial_use: true, attribution_required: false, share_alike: false, copyleft: false } }),
                createModel({ name: 'Proprietary', license: { name: 'Prop', type: 'Proprietary', commercial_use: true, attribution_required: false, share_alike: false, copyleft: false } }),
            ];
            const result = filterModels(models, createOptions({ licenseTypes: ['OSI'] }));
            expect(result.length).toBe(1);
            expect(result[0].name).toBe('Open');
        });

        it('should filter by commercial use', () => {
            const models = [
                createModel({ name: 'Commercial', license: { name: 'MIT', type: 'OSI', commercial_use: true, attribution_required: false, share_alike: false, copyleft: false } }),
                createModel({ name: 'Non-Commercial', license: { name: 'NC', type: 'Non-Commercial', commercial_use: false, attribution_required: false, share_alike: false, copyleft: false } }),
            ];
            const result = filterModels(models, createOptions({ commercialAllowed: true }));
            expect(result.length).toBe(1);
            expect(result[0].name).toBe('Commercial');
        });
    });

    describe('NSFW filtering', () => {
        it('should hide NSFW flagged models when hideNSFW is true', () => {
            const models = [
                createModel({ name: 'Safe Model' }),
                createModel({ name: 'NSFW Model', isNSFWFlagged: true }),
            ];
            const result = filterModels(models, createOptions({ hideNSFW: true }));
            expect(result.length).toBe(1);
            expect(result[0].name).toBe('Safe Model');
        });

        it('should hide models with NSFW tags when hideNSFW is true', () => {
            const models = [
                createModel({ name: 'Safe Model', tags: ['llm'] }),
                createModel({ name: 'Tagged NSFW', tags: ['nsfw', 'adult'] }),
            ];
            const result = filterModels(models, createOptions({ hideNSFW: true }));
            expect(result.length).toBe(1);
            expect(result[0].name).toBe('Safe Model');
        });

        it('should show all models when hideNSFW is false', () => {
            const models = [
                createModel({ name: 'Safe Model' }),
                createModel({ name: 'NSFW Model', isNSFWFlagged: true }),
            ];
            const result = filterModels(models, createOptions({ hideNSFW: false }));
            expect(result.length).toBe(2);
        });
    });

    describe('sorting', () => {
        it('should sort by name ascending', () => {
            const models = [
                createModel({ name: 'Zebra' }),
                createModel({ name: 'Alpha' }),
            ];
            const result = filterModels(models, createOptions({ sortKey: 'name', sortDirection: 'asc' }));
            expect(result[0].name).toBe('Alpha');
            expect(result[1].name).toBe('Zebra');
        });

        it('should sort by name descending', () => {
            const models = [
                createModel({ name: 'Alpha' }),
                createModel({ name: 'Zebra' }),
            ];
            const result = filterModels(models, createOptions({ sortKey: 'name', sortDirection: 'desc' }));
            expect(result[0].name).toBe('Zebra');
            expect(result[1].name).toBe('Alpha');
        });

        it('should sort by downloads', () => {
            const models = [
                createModel({ name: 'Low', downloads: 100 }),
                createModel({ name: 'High', downloads: 5000 }),
            ];
            const result = filterModels(models, createOptions({ sortKey: 'downloads', sortDirection: 'desc' }));
            expect(result[0].name).toBe('High');
        });

        it('should sort by release date', () => {
            const models = [
                createModel({ name: 'Old', release_date: '2023-01-01' }),
                createModel({ name: 'New', release_date: '2024-01-01' }),
            ];
            const result = filterModels(models, createOptions({ sortKey: 'release_date', sortDirection: 'desc' }));
            expect(result[0].name).toBe('New');
        });

        it('should push missing dates to end', () => {
            const models = [
                createModel({ name: 'No Date' }),
                createModel({ name: 'Has Date', release_date: '2024-01-01' }),
            ];
            const result = filterModels(models, createOptions({ sortKey: 'release_date', sortDirection: 'desc' }));
            expect(result[0].name).toBe('Has Date');
            expect(result[1].name).toBe('No Date');
        });
    });

    describe('tag filtering', () => {
        it('should include models with specified tags', () => {
            const models = [
                createModel({ name: 'Model A', tags: ['chat', 'assistant'] }),
                createModel({ name: 'Model B', tags: ['code'] }),
            ];
            const result = filterModels(models, createOptions({ includeTags: ['chat'] }));
            expect(result.length).toBe(1);
            expect(result[0].name).toBe('Model A');
        });

        it('should exclude models with specified tags', () => {
            const models = [
                createModel({ name: 'Model A', tags: ['stable'] }),
                createModel({ name: 'Model B', tags: ['deprecated'] }),
            ];
            const result = filterModels(models, createOptions({ excludeTags: ['deprecated'] }));
            expect(result.length).toBe(1);
            expect(result[0].name).toBe('Model A');
        });

        it('should require ALL include tags (AND logic)', () => {
            const models = [
                createModel({ name: 'Model A', tags: ['chat', 'assistant'] }),
                createModel({ name: 'Model B', tags: ['chat'] }),
            ];
            const result = filterModels(models, createOptions({ includeTags: ['chat', 'assistant'] }));
            expect(result.length).toBe(1);
            expect(result[0].name).toBe('Model A');
        });
    });

    describe('favorites filtering', () => {
        it('should show only favorites when favoritesOnly is true', () => {
            const models = [
                createModel({ name: 'Favorite', isFavorite: true }),
                createModel({ name: 'Normal', isFavorite: false }),
            ];
            const result = filterModels(models, createOptions({ favoritesOnly: true }));
            expect(result.length).toBe(1);
            expect(result[0].name).toBe('Favorite');
        });
    });
});
