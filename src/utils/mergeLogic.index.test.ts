import { describe, expect, it } from 'vitest';
import { matchExistingIndex, mergeRecords, performMergeBatch } from './mergeLogic';
import type { Model } from '../types';

/** The original linear-scan implementation, kept as the behavioural reference. */
function referenceMergeBatch(current: Model[], incoming: Model[], auto: boolean) {
    const base = [...current];
    let added = 0;
    let updated = 0;
    for (const inc of incoming) {
        const idx = matchExistingIndex(base, inc, auto);
        if (idx === -1) {
            base.push(inc);
            added++;
        } else {
            base[idx] = mergeRecords(base[idx], inc);
            updated++;
        }
    }
    return { models: base, added, updated };
}

// Small deterministic PRNG so failures are reproducible.
function rng(seed: number) {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

const NAMES = ['llama-3-70b-instruct', 'Llama 3 70B', 'mistral-7b', 'Mistral 7B v0.1', 'gpt-4o', 'GPT 4o', 'sdxl', 'chat', 'qwen2.5-coder-32b', 'Qwen2.5 Coder 32B'];
const PROVIDERS = ['Meta', 'meta-llama', 'Mistral AI', 'mistralai', 'OpenAI', '', 'Stability'];
const DOMAINS = ['LLM', 'ImageGen', undefined];
const SOURCES = ['huggingface', 'openrouter', 'ollama', 'civitai'];

function makeModel(rand: () => number, i: number): Model {
    const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)];
    const id = rand() < 0.3 ? `shared-${Math.floor(rand() * 15)}` : `m-${i}`;
    return {
        id,
        name: rand() < 0.1 ? '' : pick(NAMES),
        provider: pick(PROVIDERS),
        domain: pick(DOMAINS),
        source: pick(SOURCES),
        url: rand() < 0.4 ? `https://example.com/${Math.floor(rand() * 25)}` : null,
        repo: rand() < 0.3 ? `https://github.com/o/r${Math.floor(rand() * 20)}` : null,
        license: { name: 'MIT', type: 'OSI', commercial_use: true, attribution_required: false, share_alike: false, copyleft: false },
        hosting: { weights_available: true, api_available: false, on_premise_friendly: true, providers: [] },
        tags: [],
    } as unknown as Model;
}

describe('performMergeBatch (indexed) matches the linear reference', () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
        for (const auto of [false, true]) {
            it(`seed ${seed}, autoMerge=${auto}`, () => {
                const rand = rng(seed);
                const current = Array.from({ length: 60 }, (_, i) => makeModel(rand, i));
                const incoming = Array.from({ length: 120 }, (_, i) => makeModel(rand, 1000 + i));
                const expected = referenceMergeBatch(current, incoming, auto);
                const actual = performMergeBatch(current, incoming, auto);
                expect(actual.models).toEqual(expected.models);
                expect(actual.added).toBe(expected.added);
                expect(actual.updated).toBe(expected.updated);
            });
        }
    }

    it('dedupes within a single incoming list like the reference does', () => {
        const rand = rng(99);
        const incoming = Array.from({ length: 200 }, (_, i) => makeModel(rand, i));
        const expected = referenceMergeBatch([], incoming, true);
        expect(performMergeBatch([], incoming, true).models).toEqual(expected.models);
    });

    it('stays fast on a large merge', () => {
        const rand = rng(7);
        const current = Array.from({ length: 6000 }, (_, i) => makeModel(rand, i));
        const incoming = Array.from({ length: 3000 }, (_, i) => makeModel(rand, 100000 + i));
        const start = performance.now();
        performMergeBatch(current, incoming, true);
        // The linear version needs several seconds here; the index needs well under one.
        expect(performance.now() - start).toBeLessThan(2000);
    });
});
