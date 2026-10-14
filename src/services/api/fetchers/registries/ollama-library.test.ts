// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ollamaLibraryFetcher } from './ollama-library';
import { commitSourceSync, planSourceSync } from '../../../sync/syncCursor';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-10-14T12:00:00Z');

const listing = `<ul>
  <li><a href="/library/fresh"><h2>fresh</h2><p>A new chat model</p></a><span>1.2M Pulls</span><span>Updated 2 days ago</span></li>
  <li><a href="/library/stale"><h2>stale</h2><p>An old chat model</p></a><span>3M Pulls</span><span>Updated 3 months ago</span></li>
</ul>`;
const detail = '<main><table><thead><tr><th>Name</th><th>Size</th><th>Context</th></tr></thead><tbody><tr><td>latest</td><td>7B</td><td>128K</td></tr></tbody></table></main>';

let requested: string[];

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const data = new Map<string, string>();
    vi.stubGlobal('localStorage', {
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => { data.set(key, String(value)); },
        removeItem: (key: string) => { data.delete(key); },
    });
    requested = [];
    (window as unknown as { electronAPI: unknown }).electronAPI = {
        proxyRequest: vi.fn(async ({ url }: { url: string }) => {
            requested.push(url);
            return { success: true, data: url.endsWith('/library') ? listing : detail };
        }),
    };
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

const options = (fullRefresh = false) => ({ dataSources: { ollamaLibrary: true }, fullRefresh });

describe('Ollama Library incremental sync', () => {
    it('fetches every detail page the first time and records a cursor', async () => {
        const result = await ollamaLibraryFetcher.fetch(options());
        expect(result.complete.map(m => m.name).sort()).toEqual(['fresh', 'stale']);
        expect(requested.filter(url => url.includes('/library/'))).toHaveLength(2);
        expect(planSourceSync('ollama-library').mode).toBe('incremental');
    });

    it('then only fetches models updated since the last sync (the listing is one cheap request)', async () => {
        commitSourceSync('ollama-library', planSourceSync('ollama-library'), NOW - 10 * DAY);
        const result = await ollamaLibraryFetcher.fetch(options());
        expect(result.complete.map(m => m.name)).toEqual(['fresh']);
        expect(requested).toEqual(['https://ollama.com/library', 'https://ollama.com/library/fresh']);
        expect(result.complete[0].parameters).toBe('7B'); // details still enriched
    });

    it('fetches everything again on a full refresh', async () => {
        commitSourceSync('ollama-library', planSourceSync('ollama-library'), NOW - 10 * DAY);
        const result = await ollamaLibraryFetcher.fetch(options(true));
        expect(result.complete).toHaveLength(2);
    });

    it('keeps the old cursor when a detail page fails, so the next sync retries', async () => {
        const proxy = (window as unknown as { electronAPI: { proxyRequest: ReturnType<typeof vi.fn> } }).electronAPI.proxyRequest;
        proxy.mockImplementation(async ({ url }: { url: string }) =>
            url.endsWith('/library') ? { success: true, data: listing } : { success: false, error: 'HTTP 500' });
        await ollamaLibraryFetcher.fetch(options());
        expect(planSourceSync('ollama-library').mode).toBe('full');
    });
});
