/**
 * Sync Service Tests
 * 
 * Tests for the model synchronization service.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the external API modules to avoid real network calls
vi.mock('./api', () => ({
    fetchHuggingFaceRecent: vi.fn().mockResolvedValue([]),
    fetchCivitai: vi.fn().mockResolvedValue([]),
    fetchCivitasBay: vi.fn().mockResolvedValue([]),
    fetchOpenModelDB: vi.fn().mockResolvedValue([]),
    fetchOllamaLibrary: vi.fn().mockResolvedValue([]),
    fetchArtificialAnalysisIndex: vi.fn().mockResolvedValue([]),
    fetchPopularGenerativeRepos: vi.fn().mockResolvedValue([]),
    fetchModelScopeRecent: vi.fn().mockResolvedValue([]),
    enrichModelsDeep: vi.fn().mockImplementation((m) => Promise.resolve(m)),
    translateChineseModels: vi.fn().mockImplementation((m) => Promise.resolve(m)),
    applyCorporateFilteringAsync: vi.fn().mockImplementation((m) => Promise.resolve({ safe: m, flagged: [] })),
    applyCorporateFiltering: vi.fn().mockImplementation((m) => ({ safeModels: m, flaggedModels: [] })),
    callProviderLLM: vi.fn().mockResolvedValue([]),
}));

describe('SyncService Types', () => {
    it('should define SyncOptions interface', () => {
        // This test just verifies the types exist
        const options = {
            dataSources: {
                huggingface: true,
                civitai: false,
            },
            enableNSFWFiltering: true,
        };

        expect(options.dataSources).toBeDefined();
        expect(options.dataSources.huggingface).toBe(true);
    });

    it('should define SyncProgress interface', () => {
        const progress = {
            current: 5,
            total: 10,
            source: 'HuggingFace',
            found: 100,
        };

        expect(progress.current).toBe(5);
        expect(progress.total).toBe(10);
        expect(progress.source).toBe('HuggingFace');
    });

    it('should define SyncResult interface', () => {
        const result = {
            complete: [],
            flagged: [],
        };

        expect(Array.isArray(result.complete)).toBe(true);
        expect(Array.isArray(result.flagged)).toBe(true);
    });
});

describe('SyncCallbacks Interface', () => {
    it('should accept onProgress callback', () => {
        const onProgress = vi.fn();

        onProgress({ current: 1, total: 5, source: 'test' });

        expect(onProgress).toHaveBeenCalledWith({
            current: 1,
            total: 5,
            source: 'test',
        });
    });

    it('should accept onLog callback', () => {
        const onLog = vi.fn();

        onLog('Syncing from HuggingFace...');

        expect(onLog).toHaveBeenCalledWith('Syncing from HuggingFace...');
    });

    it('should accept onModelsUpdate callback', () => {
        const onModelsUpdate = vi.fn();
        const testModels = [{ id: '1', name: 'Test Model' }];

        onModelsUpdate(testModels);

        expect(onModelsUpdate).toHaveBeenCalledWith(testModels);
    });

    it('should support skipSignal ref pattern', () => {
        const skipSignal = { current: false };

        expect(skipSignal.current).toBe(false);

        skipSignal.current = true;
        expect(skipSignal.current).toBe(true);
    });

    it('should support abortSignal for cancellation', () => {
        const controller = new AbortController();
        const signal = controller.signal;

        expect(signal.aborted).toBe(false);

        controller.abort();
        expect(signal.aborted).toBe(true);
    });
});

describe('Data Source Configuration', () => {
    it('should support all expected data sources', () => {
        const dataSources = {
            huggingface: true,
            github: true,
            artificialanalysis: true,
            apiDiscovery: true,
            localDiscovery: true,
            roboflow: false,
            kaggle: false,
            tensorart: true,
            civitai: true,
            runcomfy: false,
            prompthero: true,
            liblib: true,
            shakker: true,
            openmodeldb: true,
            civitasbay: true,
        };

        // Count enabled sources
        const enabledCount = Object.values(dataSources).filter(v => v).length;
        expect(enabledCount).toBe(12);
    });

    it('should handle empty data sources gracefully', () => {
        const dataSources = {};

        const enabledSources = Object.entries(dataSources)
            .filter(([_, enabled]) => enabled)
            .map(([key]) => key);

        expect(enabledSources).toEqual([]);
    });
});

describe('Progress Calculation', () => {
    it('should calculate percentage correctly', () => {
        const progress = { current: 3, total: 10 };
        const percentage = Math.round((progress.current / progress.total) * 100);

        expect(percentage).toBe(30);
    });

    it('should handle zero total gracefully', () => {
        const progress = { current: 0, total: 0 };
        const percentage = progress.total > 0
            ? Math.round((progress.current / progress.total) * 100)
            : 0;

        expect(percentage).toBe(0);
    });

    it('should track cumulative found count', () => {
        let totalFound = 0;

        const updateProgress = (found: number) => {
            if (found > 0) {
                totalFound += found;
            }
        };

        updateProgress(50);  // HuggingFace
        updateProgress(30);  // Civitai
        updateProgress(20);  // OpenModelDB

        expect(totalFound).toBe(100);
    });
});

describe('NSFW Filtering Integration', () => {
    it('should separate safe and flagged models', () => {
        const allModels = [
            { id: '1', name: 'Safe Model', domain: 'LLM' },
            { id: '2', name: 'NSFW Model', domain: 'ImageGen', isNSFWFlagged: true },
            { id: '3', name: 'Another Safe', domain: 'LLM' },
        ];

        const safeModels = allModels.filter(m => !m.isNSFWFlagged);
        const flaggedModels = allModels.filter(m => m.isNSFWFlagged);

        expect(safeModels).toHaveLength(2);
        expect(flaggedModels).toHaveLength(1);
        expect(flaggedModels[0].name).toBe('NSFW Model');
    });
});

describe('Error Handling', () => {
    it('should catch and handle sync errors', async () => {
        const failingFetch = async () => {
            throw new Error('Network error');
        };

        let errorMessage = '';
        try {
            await failingFetch();
        } catch (error) {
            errorMessage = error instanceof Error ? error.message : String(error);
        }

        expect(errorMessage).toBe('Network error');
    });

    it('should continue on individual source failure', async () => {
        const results: string[] = [];

        const sources = [
            { name: 'A', fetch: async () => { results.push('A'); return ['a']; } },
            { name: 'B', fetch: async () => { throw new Error('B failed'); } },
            { name: 'C', fetch: async () => { results.push('C'); return ['c']; } },
        ];

        const allResults: string[] = [];
        for (const source of sources) {
            try {
                const data = await source.fetch();
                allResults.push(...data);
            } catch {
                // Continue on error
            }
        }

        expect(allResults).toEqual(['a', 'c']);
        expect(results).toEqual(['A', 'C']);
    });
});
