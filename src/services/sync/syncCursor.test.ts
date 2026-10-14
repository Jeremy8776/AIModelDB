// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSyncCursors, commitSourceSync, FULL_REFRESH_DAYS, MARGIN_MS, planSourceSync } from './syncCursor';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-10-14T12:00:00Z');

// The shared test setup replaces localStorage with inert mocks, so give these tests a real in-memory one.
beforeEach(() => {
    const data = new Map<string, string>();
    vi.stubGlobal('localStorage', {
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => { data.set(key, String(value)); },
        removeItem: (key: string) => { data.delete(key); },
        clear: () => data.clear(),
    });
});

describe('planSourceSync', () => {
    it('is a full pull the first time, with no cutoff', () => {
        const plan = planSourceSync('civitasbay', { now: NOW });
        expect(plan).toMatchObject({ mode: 'full', cutoffMs: null, cutoffIso: null });
    });

    it('is incremental after a successful pull, with the cutoff pulled back by the safety margin', () => {
        const plan0 = planSourceSync('civitasbay', { now: NOW });
        commitSourceSync('civitasbay', plan0, NOW - 2 * DAY);
        const plan = planSourceSync('civitasbay', { now: NOW });
        expect(plan.mode).toBe('incremental');
        expect(plan.cutoffMs).toBe(NOW - 2 * DAY - MARGIN_MS);
        expect(plan.cutoffIso).toBe(new Date(NOW - 3 * DAY).toISOString());
    });

    it('goes back to a full pull when asked, or when the last full pull is too old', () => {
        commitSourceSync('s', planSourceSync('s', { now: NOW }), NOW - 20 * DAY); // full, 20 days ago
        commitSourceSync('s', planSourceSync('s', { now: NOW - 19 * DAY }), NOW - DAY); // incremental yesterday
        expect(planSourceSync('s', { now: NOW, fullRefresh: true }).mode).toBe('full');
        const stale = planSourceSync('s', { now: NOW });
        expect(stale.mode).toBe('full');
        expect(stale.reason).toContain(`${FULL_REFRESH_DAYS} days`);
    });

    it('keeps the old full-pull time across incremental commits', () => {
        commitSourceSync('s', planSourceSync('s', { now: NOW }), NOW - 10 * DAY); // full
        commitSourceSync('s', planSourceSync('s', { now: NOW - 5 * DAY }), NOW - 5 * DAY); // incremental
        commitSourceSync('s', planSourceSync('s', { now: NOW - DAY }), NOW - DAY); // incremental
        // 10 days since the full pull is still inside the window.
        expect(planSourceSync('s', { now: NOW }).mode).toBe('incremental');
        // ...but 15 days after it is not.
        expect(planSourceSync('s', { now: NOW + 5 * DAY }).mode).toBe('full');
    });

    it('keeps sources independent', () => {
        commitSourceSync('a', planSourceSync('a', { now: NOW }), NOW - DAY);
        expect(planSourceSync('a', { now: NOW }).mode).toBe('incremental');
        expect(planSourceSync('b', { now: NOW }).mode).toBe('full');
    });

    it('falls back to a full pull on corrupt storage or a future cursor', () => {
        localStorage.setItem('aiModelDB_syncCursors', '{not json');
        expect(planSourceSync('a', { now: NOW }).mode).toBe('full');
        localStorage.setItem('aiModelDB_syncCursors', JSON.stringify({ a: { since: 'garbage', fullAt: 'garbage' } }));
        expect(planSourceSync('a', { now: NOW }).mode).toBe('full');
        commitSourceSync('a', planSourceSync('a', { now: NOW }), NOW + 30 * DAY); // clock was wrong
        expect(planSourceSync('a', { now: NOW }).mode).toBe('full');
    });

    it('forgets everything on clear', () => {
        commitSourceSync('a', planSourceSync('a', { now: NOW }), NOW - DAY);
        clearSyncCursors();
        expect(planSourceSync('a', { now: NOW }).mode).toBe('full');
    });
});
