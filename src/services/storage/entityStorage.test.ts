// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { clearEntityList, loadEntityList, saveEntityList } from './entityStorage';

describe('entityStorage', () => {
    it('returns null before anything is saved', async () => {
        expect(await loadEntityList('nothing-here')).toBeNull();
    });

    it('round-trips a list larger than localStorage could hold', async () => {
        // ~12 MB of JSON: well past the ~5 MB localStorage limit that used to lose the list.
        const list = Array.from({ length: 6000 }, (_, i) => ({ id: `srv-${i}`, name: `server ${i}`, description: 'x'.repeat(2000) }));
        await saveEntityList('big', list);
        const loaded = await loadEntityList('big');
        expect(loaded).toHaveLength(6000);
        expect((loaded![5999] as { id: string }).id).toBe('srv-5999');
    });

    it('overwrites on save and keeps lists under different keys apart', async () => {
        await saveEntityList('a', [{ id: 1 }]);
        await saveEntityList('b', [{ id: 2 }, { id: 3 }]);
        await saveEntityList('a', [{ id: 9 }]);
        expect(await loadEntityList('a')).toEqual([{ id: 9 }]);
        expect(await loadEntityList('b')).toHaveLength(2);
    });

    it('clears one list without touching the other', async () => {
        await saveEntityList('keep', [{ id: 1 }]);
        await saveEntityList('drop', [{ id: 2 }]);
        await clearEntityList('drop');
        expect(await loadEntityList('drop')).toBeNull();
        expect(await loadEntityList('keep')).toEqual([{ id: 1 }]);
    });
});
