import { describe, expect, it } from 'vitest';
import {
    DEFAULT_MCP_SOURCES,
    DEFAULT_MODEL_SOURCES,
    DEFAULT_SKILL_SOURCES,
    getSourcesForSurface,
    getSourceCategorySummary,
    getSourceDedupeStrategy,
    MCP_SOURCES,
    MODEL_SOURCES,
    SKILL_SOURCES,
} from './entitySources';

function expectUniqueKeys(sources: Array<{ key: string }>) {
    const keys = sources.map(source => source.key);
    expect(new Set(keys).size).toBe(keys.length);
}

function expectDefaultsOnlyAvailable(
    sources: Array<{ key: string; status: 'available' | 'planned' }>,
    defaults: Record<string, boolean>
) {
    const availableKeys = sources.filter(source => source.status === 'available').map(source => source.key).sort();
    expect(Object.keys(defaults).sort()).toEqual(availableKeys);
    expect(Object.values(defaults).every(Boolean)).toBe(true);
}

describe('entity source catalogs', () => {
    it('keeps a broad researched model source backlog while only defaulting wired sources on', () => {
        expect(MODEL_SOURCES.length).toBeGreaterThanOrEqual(40);
        expect(MODEL_SOURCES.filter(source => source.status === 'planned').length).toBeGreaterThanOrEqual(30);
        expect(MODEL_SOURCES.some(source => source.key === 'openrouter')).toBe(true);
        expect(MODEL_SOURCES.some(source => source.key === 'modelscope')).toBe(true);
        expect(MODEL_SOURCES.some(source => source.key === 'codesota')).toBe(true);
        expectUniqueKeys(MODEL_SOURCES);
        expectDefaultsOnlyAvailable(MODEL_SOURCES, DEFAULT_MODEL_SOURCES);
    });

    it('keeps a broad researched MCP source backlog while only defaulting wired sources on', () => {
        expect(MCP_SOURCES.length).toBeGreaterThanOrEqual(20);
        expect(MCP_SOURCES.filter(source => source.status === 'planned').length).toBeGreaterThanOrEqual(15);
        expect(MCP_SOURCES.some(source => source.key === 'pulsemcp')).toBe(true);
        expect(MCP_SOURCES.some(source => source.key === 'mcp-so')).toBe(true);
        expect(MCP_SOURCES.some(source => source.key === 'pypi')).toBe(true);
        expectUniqueKeys(MCP_SOURCES);
        expectDefaultsOnlyAvailable(MCP_SOURCES, DEFAULT_MCP_SOURCES);
    });

    it('keeps a broad researched skills source backlog while only defaulting wired sources on', () => {
        expect(SKILL_SOURCES.length).toBeGreaterThanOrEqual(20);
        expect(SKILL_SOURCES.filter(source => source.status === 'planned').length).toBeGreaterThanOrEqual(18);
        expect(SKILL_SOURCES.some(source => source.key === 'skills-directory')).toBe(true);
        expect(SKILL_SOURCES.some(source => source.key === 'claudskills')).toBe(true);
        expect(SKILL_SOURCES.some(source => source.key === 'cursor-directory')).toBe(true);
        expectUniqueKeys(SKILL_SOURCES);
        expectDefaultsOnlyAvailable(SKILL_SOURCES, DEFAULT_SKILL_SOURCES);
    });

    it('uses the full catalog for settings and onboarding display surfaces', () => {
        for (const category of ['models', 'mcp', 'skills'] as const) {
            const settingsSources = getSourcesForSurface('settings', category);
            const onboardingSources = getSourcesForSurface('onboarding', category);

            expect(settingsSources.map(source => source.key)).toEqual(onboardingSources.map(source => source.key));
            expect(onboardingSources.some(source => source.status === 'planned')).toBe(true);
            expect(onboardingSources.every(source => source.isSelectable === (source.status === 'available'))).toBe(true);
        }
    });

    it('summarizes category counts and dedupe strategy for source tabs', () => {
        const modelSummary = getSourceCategorySummary('models');

        expect(modelSummary.total).toBe(MODEL_SOURCES.length);
        expect(modelSummary.available).toBe(DEFAULT_MODEL_SOURCES && Object.keys(DEFAULT_MODEL_SOURCES).length);
        expect(modelSummary.planned).toBe(MODEL_SOURCES.length - modelSummary.available);
        expect(getSourceDedupeStrategy('models')).toContain('id/repo/url');
        expect(getSourceDedupeStrategy('mcp')).toContain('server id');
        expect(getSourceDedupeStrategy('skills')).toContain('skill id');
    });
});
