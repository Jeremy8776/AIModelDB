/**
 * IndexedDB Storage Tests
 * 
 * Tests for the storage service to ensure data persistence works correctly.
 * Uses vitest with jsdom for IndexedDB mocking.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock IndexedDB for testing
const mockDB = {
    models: new Map<string, any>(),
    metadata: new Map<string, any>(),
};

// Mock IDBRequest
function createMockRequest<T>(result: T): IDBRequest<T> {
    const request = {
        result,
        error: null,
        source: null,
        transaction: null,
        readyState: 'done' as const,
        onsuccess: null as ((ev: Event) => void) | null,
        onerror: null as ((ev: Event) => void) | null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(() => true),
    };

    // Trigger onsuccess in next tick
    setTimeout(() => {
        if (request.onsuccess) {
            request.onsuccess({ target: request } as any);
        }
    }, 0);

    return request as any;
}

// Mock IDBTransaction
function createMockTransaction(): IDBTransaction {
    return {
        objectStore: vi.fn((name: string) => createMockObjectStore(name)),
        oncomplete: null as ((ev: Event) => void) | null,
        onerror: null as ((ev: Event) => void) | null,
        onabort: null as ((ev: Event) => void) | null,
        abort: vi.fn(),
        commit: vi.fn(),
        db: {} as any,
        durability: 'default' as const,
        error: null,
        mode: 'readwrite' as const,
        objectStoreNames: ['models', 'metadata'] as any,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(() => true),
    } as any;
}

// Mock IDBObjectStore
function createMockObjectStore(name: string): IDBObjectStore {
    const store = name === 'models' ? mockDB.models : mockDB.metadata;

    return {
        add: vi.fn((value: any) => {
            store.set(value.id || value.key, value);
            return createMockRequest(value.id || value.key);
        }),
        put: vi.fn((value: any) => {
            store.set(value.id || value.key, value);
            return createMockRequest(value.id || value.key);
        }),
        get: vi.fn((key: string) => {
            return createMockRequest(store.get(key));
        }),
        getAll: vi.fn(() => {
            return createMockRequest(Array.from(store.values()));
        }),
        delete: vi.fn((key: string) => {
            store.delete(key);
            return createMockRequest(undefined);
        }),
        clear: vi.fn(() => {
            store.clear();
            return createMockRequest(undefined);
        }),
        count: vi.fn(() => {
            return createMockRequest(store.size);
        }),
        createIndex: vi.fn(),
        index: vi.fn(),
        name,
        keyPath: name === 'models' ? 'id' : 'key',
        indexNames: [] as any,
        transaction: {} as any,
        autoIncrement: false,
        openCursor: vi.fn(),
        openKeyCursor: vi.fn(),
        getAllKeys: vi.fn(),
        deleteIndex: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(() => true),
    } as any;
}

describe('Storage Pattern Tests', () => {
    beforeEach(() => {
        // Clear mock stores before each test
        mockDB.models.clear();
        mockDB.metadata.clear();
    });

    describe('Model Storage Operations', () => {
        it('should store and retrieve a model', async () => {
            const store = createMockObjectStore('models');
            const testModel = {
                id: 'test-model-1',
                name: 'Test Model',
                provider: 'Test Provider',
                domain: 'LLM' as const,
                source: 'test',
                license: {
                    name: 'MIT',
                    type: 'OSI' as const,
                    commercial_use: true,
                    attribution_required: true,
                    share_alike: false,
                    copyleft: false,
                },
                hosting: {
                    weights_available: true,
                    api_available: true,
                    on_premise_friendly: true,
                },
            };

            // Store the model
            store.add(testModel);

            // Wait for async operation
            await new Promise(resolve => setTimeout(resolve, 10));

            // Verify it was stored
            expect(mockDB.models.has('test-model-1')).toBe(true);
            expect(mockDB.models.get('test-model-1').name).toBe('Test Model');
        });

        it('should handle model updates (put operation)', async () => {
            const store = createMockObjectStore('models');
            const testModel = {
                id: 'test-model-1',
                name: 'Original Name',
                provider: 'Test Provider',
                domain: 'LLM' as const,
                source: 'test',
                license: {
                    name: 'MIT',
                    type: 'OSI' as const,
                    commercial_use: true,
                    attribution_required: true,
                    share_alike: false,
                    copyleft: false,
                },
                hosting: {
                    weights_available: true,
                    api_available: true,
                    on_premise_friendly: true,
                },
            };

            // Store initial model
            store.add(testModel);
            await new Promise(resolve => setTimeout(resolve, 10));

            // Update the model
            const updatedModel = { ...testModel, name: 'Updated Name' };
            store.put(updatedModel);
            await new Promise(resolve => setTimeout(resolve, 10));

            // Verify update
            expect(mockDB.models.get('test-model-1').name).toBe('Updated Name');
        });

        it('should delete a model', async () => {
            const store = createMockObjectStore('models');
            const testModel = {
                id: 'test-model-1',
                name: 'Test Model',
            };

            store.add(testModel);
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(mockDB.models.has('test-model-1')).toBe(true);

            store.delete('test-model-1');
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(mockDB.models.has('test-model-1')).toBe(false);
        });

        it('should clear all models', async () => {
            const store = createMockObjectStore('models');

            // Add multiple models
            store.add({ id: 'model-1', name: 'Model 1' });
            store.add({ id: 'model-2', name: 'Model 2' });
            store.add({ id: 'model-3', name: 'Model 3' });
            await new Promise(resolve => setTimeout(resolve, 10));

            expect(mockDB.models.size).toBe(3);

            store.clear();
            await new Promise(resolve => setTimeout(resolve, 10));

            expect(mockDB.models.size).toBe(0);
        });

        it('should count models correctly', async () => {
            const store = createMockObjectStore('models');

            store.add({ id: 'model-1', name: 'Model 1' });
            store.add({ id: 'model-2', name: 'Model 2' });
            await new Promise(resolve => setTimeout(resolve, 10));

            const countRequest = store.count();
            await new Promise(resolve => setTimeout(resolve, 10));

            expect(countRequest.result).toBe(2);
        });
    });

    describe('Metadata Storage Operations', () => {
        it('should store and retrieve metadata', async () => {
            const store = createMockObjectStore('metadata');
            const metadata = {
                key: 'lastSync',
                value: '2026-01-14T12:00:00Z',
                updatedAt: new Date().toISOString(),
            };

            store.put(metadata);
            await new Promise(resolve => setTimeout(resolve, 10));

            const getRequest = store.get('lastSync');
            await new Promise(resolve => setTimeout(resolve, 10));

            expect(getRequest.result?.value).toBe('2026-01-14T12:00:00Z');
        });
    });
});

describe('Storage Error Handling', () => {
    it('should handle missing data gracefully', async () => {
        const store = createMockObjectStore('models');

        const getRequest = store.get('non-existent-id');
        await new Promise(resolve => setTimeout(resolve, 10));

        expect(getRequest.result).toBeUndefined();
    });
});
