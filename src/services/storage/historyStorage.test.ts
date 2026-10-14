// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Model } from '../../types';

const model = (i: number): Model => ({ id: `m${i}`, name: `Model ${i}`, description: 'x'.repeat(100) } as unknown as Model);
const models = (n: number) => Array.from({ length: n }, (_, i) => model(i));

async function freshModule() {
    vi.resetModules();
    return import('./historyStorage');
}

beforeEach(async () => {
    // Start every test from empty databases.
    await new Promise<void>(resolve => { const r = indexedDB.deleteDatabase('aiModelDBHistory'); r.onsuccess = r.onerror = r.onblocked = () => resolve(); });
    await new Promise<void>(resolve => { const r = indexedDB.deleteDatabase('aiModelDB'); r.onsuccess = r.onerror = r.onblocked = () => resolve(); });
});

describe('historyStorage', () => {
    it('round-trips a snapshot across several chunks, in order', async () => {
        const history = await freshModule();
        const list = models(3700); // 3 chunks of 1500
        const meta = history.buildMeta(list, 'Pre-sync backup');
        await history.saveSnapshot(meta, list);

        const restored = await history.getSnapshotModels(meta.id);
        expect(restored).toHaveLength(3700);
        expect(restored![0].id).toBe('m0');
        expect(restored![1499].id).toBe('m1499');
        expect(restored![1500].id).toBe('m1500');
        expect(restored![3699].id).toBe('m3699');
    });

    it('lists snapshots newest first without any models attached', async () => {
        const history = await freshModule();
        const older = { ...history.buildMeta(models(3), 'older'), timestamp: 1000 };
        const newer = { ...history.buildMeta(models(5), 'newer'), timestamp: 2000 };
        await history.saveSnapshot(older, models(3));
        await history.saveSnapshot(newer, models(5));

        const list = await history.getSnapshots();
        expect(list.map(item => item.description)).toEqual(['newer', 'older']);
        expect(list[0].modelCount).toBe(5);
        expect('models' in list[0]).toBe(false);
    });

    it('deletes one snapshot, its chunks included, and leaves the others', async () => {
        const history = await freshModule();
        const a = history.buildMeta(models(1600), 'a');
        const b = history.buildMeta(models(10), 'b');
        await history.saveSnapshot(a, models(1600));
        await history.saveSnapshot(b, models(10));
        await history.deleteSnapshot(a.id);

        expect(await history.getSnapshotModels(a.id)).toBeNull();
        expect(await history.getSnapshotModels(b.id)).toHaveLength(10);
    });

    it('clears everything', async () => {
        const history = await freshModule();
        const a = history.buildMeta(models(5), 'a');
        await history.saveSnapshot(a, models(5));
        await history.clearSnapshots();
        expect(await history.getSnapshots()).toEqual([]);
        expect(await history.getSnapshotModels(a.id)).toBeNull();
    });

    it('does not mix up snapshot ids that share a prefix', async () => {
        const history = await freshModule();
        const a = { ...history.buildMeta(models(2), 'a'), id: 'abc' };
        const b = { ...history.buildMeta(models(7), 'b'), id: 'abcd' };
        await history.saveSnapshot(a, models(2));
        await history.saveSnapshot(b, models(7));
        expect(await history.getSnapshotModels('abc')).toHaveLength(2);
        expect(await history.getSnapshotModels('abcd')).toHaveLength(7);
    });

    it('estimates size from a sample, close to the real JSON size', async () => {
        const history = await freshModule();
        const list = models(5000);
        const real = JSON.stringify(list).length;
        const estimate = history.estimateSizeBytes(list);
        expect(estimate).toBeGreaterThan(real * 0.9);
        expect(estimate).toBeLessThan(real * 1.1);
        expect(history.estimateSizeBytes([])).toBe(0);
    });
});

describe('legacy snapshot migration', () => {
    it('moves old one-record snapshots into the new layout and empties the old store', async () => {
        // Build an old-style database: history store with the models inside each entry.
        await new Promise<void>((resolve, reject) => {
            const request = indexedDB.open('aiModelDB', 2);
            request.onupgradeneeded = () => {
                const db = request.result;
                db.createObjectStore('models', { keyPath: 'id' });
                db.createObjectStore('metadata', { keyPath: 'key' });
                const store = db.createObjectStore('history', { keyPath: 'id' });
                store.put({ id: 'old-1', timestamp: 5, dateStr: 'x', modelCount: 4, description: 'old snapshot', sizeBytes: 10, models: models(4) });
            };
            request.onsuccess = () => { request.result.close(); resolve(); };
            request.onerror = () => reject(request.error);
        });

        const history = await freshModule();
        const list = await history.getSnapshots();
        expect(list.map(item => item.id)).toEqual(['old-1']);
        expect(list[0].description).toBe('old snapshot');
        expect(await history.getSnapshotModels('old-1')).toHaveLength(4);

        // The old record is gone, so a second launch has nothing left to migrate.
        const leftover = await new Promise<number>((resolve, reject) => {
            const request = indexedDB.open('aiModelDB');
            request.onsuccess = () => {
                const count = request.result.transaction(['history'], 'readonly').objectStore('history').count();
                count.onsuccess = () => { request.result.close(); resolve(count.result); };
            };
            request.onerror = () => reject(request.error);
        });
        expect(leftover).toBe(0);
    });

    it('does nothing (and does not create the old database) when there is none', async () => {
        const history = await freshModule();
        expect(await history.getSnapshots()).toEqual([]);
        const names = (await indexedDB.databases()).map(info => info.name);
        expect(names).not.toContain('aiModelDB');
    });
});
