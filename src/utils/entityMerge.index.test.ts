import { describe, expect, it } from 'vitest';
import type { MCPServer, Skill } from '../types';
import { validateMCPServers } from '../services/api/schemas';
import {
    appendMCPServers,
    appendSkills,
    matchMCPIndex,
    matchSkillIndex,
    mergeMCPRecords,
    mergeMCPServerLists,
    mergeSkillRecords,
    restoreMCPServers,
    restoreSkills,
} from './entityMerge';

function rng(seed: number) {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

const LICENSE = { name: 'MIT', type: 'OSI', commercial_use: true, attribution_required: false, share_alike: false, copyleft: false };

function makeServer(rand: () => number, i: number): MCPServer {
    const group = Math.floor(rand() * 30);
    const hasRepo = rand() < 0.6;
    const hasPackage = rand() < 0.6;
    return {
        id: rand() < 0.25 ? `io.github.Shared${group}/srv` : `io.github.org${i}/srv-${i}`,
        name: `srv-${i}`,
        description: 'd',
        version: '1.0.0',
        source: rand() < 0.5 ? 'official' : 'npm',
        repository: hasRepo ? { url: `https://github.com/org/repo-${group}`, source: 'github' } : null,
        packages: hasPackage ? [{ registryType: 'npm', identifier: `@org/pkg-${Math.floor(rand() * 30)}` }] : [],
        remotes: [],
        tags: ['mcp'],
        license: LICENSE,
        isFavorite: false,
        editedFields: [],
        downloads: null,
        _meta: {},
    } as unknown as MCPServer;
}

function referenceMCP(existing: MCPServer[], incoming: MCPServer[]) {
    const base = [...existing];
    for (const server of incoming) {
        const idx = matchMCPIndex(base, server);
        if (idx === -1) base.push(server);
        else base[idx] = mergeMCPRecords(base[idx], server);
    }
    return base;
}

describe('indexed MCP merge matches the linear reference', () => {
    for (const seed of [11, 12, 13, 14, 15]) {
        it(`seed ${seed}`, () => {
            const rand = rng(seed);
            const first = Array.from({ length: 80 }, (_, i) => makeServer(rand, i));
            const second = Array.from({ length: 150 }, (_, i) => makeServer(rand, 1000 + i));
            const trusted = mergeMCPServerLists([], first);
            const expected = referenceMCP(trusted, validateMCPServers(second));
            const actual = appendMCPServers(trusted, second);
            expect(actual.map(s => s.id)).toEqual(expected.map(s => s.id));
            expect(actual.map(s => s.source)).toEqual(expected.map(s => s.source));
            expect(actual.map(s => (s.packages || []).length)).toEqual(expected.map(s => (s.packages || []).length));
        });
    }

    it('does not mutate the list it was given', () => {
        const rand = rng(3);
        const trusted = mergeMCPServerLists([], Array.from({ length: 20 }, (_, i) => makeServer(rand, i)));
        const snapshot = JSON.stringify(trusted);
        appendMCPServers(trusted, Array.from({ length: 20 }, (_, i) => makeServer(rand, 500 + i)));
        expect(JSON.stringify(trusted)).toBe(snapshot);
    });
});

describe('restore (startup load)', () => {
    it('round-trips a persisted list and drops garbage', () => {
        const rand = rng(5);
        const list = mergeMCPServerLists([], Array.from({ length: 40 }, (_, i) => makeServer(rand, i)));
        const stored = JSON.parse(JSON.stringify(list));
        const restored = restoreMCPServers([...stored, null, 'x', { id: 5 }, { name: 'no id' }]);
        // Same result the old startup path (full validation + merge) produced.
        expect(restored.map(s => s.id)).toEqual(mergeMCPServerLists([], stored).map(s => s.id));
        expect(restored.length).toBeGreaterThan(0);
        expect(restoreMCPServers('not an array')).toEqual([]);
    });

    it('re-sanitises tampered _meta and editedFields-style keys', () => {
        const restored = restoreMCPServers(JSON.parse('[{"id":"a","name":"a","source":"x","_meta":{"__proto__":{"polluted":true},"ok":{"v":1}},"tags":"nope"}]'));
        expect(({} as Record<string, unknown>).polluted).toBeUndefined();
        expect(Array.isArray(restored[0].tags)).toBe(true);
    });

    it('restores skills and requires the type and origin the UI relies on', () => {
        const skill = { id: 's1', name: 'S', type: 'skill', origin: 'third-party', source: 'x', redistributable: 'yes', tags: [] };
        expect(restoreSkills([skill, { id: 's2', name: 'no type' }]).map(s => s.id)).toEqual(['s1']);
    });
});

describe('indexed skills merge', () => {
    it('merges by id and by source repo like the linear version', () => {
        const mk = (id: string, repo?: string): Skill => ({
            id, name: id, type: 'skill', origin: 'third-party', source: 'x', redistributable: 'yes', tags: [],
            source_repo: repo ? { owner: 'o', repo, path: 'p' } : null,
        } as unknown as Skill);
        const existing = appendSkills([], [mk('a', 'r1'), mk('b')]);
        const merged = appendSkills(existing, [mk('A'), mk('c', 'r1'), mk('d', 'r2')]);
        expect(merged.map(s => s.id)).toEqual(['a', 'b', 'd']);
        const base = [mk('a', 'r1'), mk('b')];
        expect(matchSkillIndex(base, mk('c', 'r1'))).toBe(0);
        expect(mergeSkillRecords(base[0], mk('c', 'r1')).id).toBe('a');
    });
});
