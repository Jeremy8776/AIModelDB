import { describe, expect, it } from 'vitest';
import { diffModels, shouldRewriteAll } from './modelDiff';
import type { Model } from '../../types';

const model = (id: string, extra: Partial<Model> = {}): Model => ({ id, name: id, ...extra } as Model);

describe('diffModels', () => {
    it('finds nothing to write when the same references come back', () => {
        const a = model('a');
        const b = model('b');
        expect(diffModels([a, b], [a, b])).toEqual({ puts: [], deletes: [] });
    });

    it('puts only changed or new records and lists removed ids', () => {
        const a = model('a');
        const b = model('b');
        const bEdited = { ...b, name: 'edited' };
        const c = model('c');
        const { puts, deletes } = diffModels([a, b], [bEdited, c]);
        expect(puts).toEqual([bEdited, c]);
        expect(deletes).toEqual(['a']);
    });

    it('treats a structurally equal copy as changed (reference compare is the contract)', () => {
        const a = model('a');
        expect(diffModels([a], [{ ...a }]).puts).toHaveLength(1);
    });
});

describe('shouldRewriteAll', () => {
    const changes = (puts: number, deletes = 0) => ({ puts: Array.from({ length: puts }, (_, i) => model(`p${i}`)), deletes: Array.from({ length: deletes }, (_, i) => `d${i}`) });

    it('rewrites on the first save and when most of the store changed', () => {
        expect(shouldRewriteAll(0, 100, changes(100))).toBe(true);
        expect(shouldRewriteAll(100, 100, changes(60))).toBe(true);
    });

    it('writes increments for small changes', () => {
        expect(shouldRewriteAll(1000, 1000, changes(3))).toBe(false);
        expect(shouldRewriteAll(1000, 998, changes(0, 2))).toBe(false);
    });
});
