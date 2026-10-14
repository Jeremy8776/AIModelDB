// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchCivitasBay } from './civitas-bay';
import { commitSourceSync, planSourceSync } from '../../../sync/syncCursor';

const DAY = 24 * 60 * 60 * 1000;

function item(title: string, publishedMs: number) {
    return `<item><title>${title}</title><link>https://civitasbay.org/t/${encodeURIComponent(title)}</link>` +
        `<guid>${title}</guid><description>A model called ${title}</description>` +
        `<pubDate>${new Date(publishedMs).toUTCString()}</pubDate></item>`;
}
const feed = (...items: string[]) => `<?xml version="1.0"?><rss><channel>${items.join('')}</channel></rss>`;

let requestedPages: number[];

function installFeed(pages: Record<number, string>) {
    requestedPages = [];
    (window as unknown as { electronAPI: unknown }).electronAPI = {
        proxyRequest: vi.fn(async ({ url }: { url: string }) => {
            const page = Number(new URL(url).searchParams.get('page'));
            requestedPages.push(page);
            return { success: true, data: pages[page] ?? feed() };
        }),
    };
}

async function run(sync: { fullRefresh?: boolean }) {
    const pending = fetchCivitasBay(undefined, undefined, undefined, sync);
    await vi.runAllTimersAsync(); // the crawl waits 1 s between batches
    const result = await pending;
    return [...result.complete, ...result.flagged];
}

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-14T12:00:00Z'));
    const data = new Map<string, string>();
    vi.stubGlobal('localStorage', {
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => { data.set(key, String(value)); },
        removeItem: (key: string) => { data.delete(key); },
    });
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('CivitasBay incremental sync', () => {
    const now = Date.parse('2026-10-14T12:00:00Z');
    const pages = () => ({
        1: feed(item('fresh_a', now - 1 * DAY), item('fresh_b', now - 2 * DAY)),
        2: feed(item('old_a', now - 40 * DAY), item('old_b', now - 41 * DAY)),
        3: feed(item('older_a', now - 80 * DAY)),
    });

    it('does a full crawl the first time and records a cursor', async () => {
        installFeed(pages());
        const models = await run({});
        expect(models.map(m => m.name).sort()).toEqual(['fresh_a', 'fresh_b', 'old_a', 'old_b', 'older_a']);
        expect(planSourceSync('civitasbay').mode).toBe('incremental');
    });

    it('stops at the first page that is entirely older than the last sync and skips it', async () => {
        installFeed(pages());
        commitSourceSync('civitasbay', planSourceSync('civitasbay'), now - 3 * DAY); // synced 3 days ago

        const models = await run({});
        expect(models.map(m => m.name).sort()).toEqual(['fresh_a', 'fresh_b']);
        // One concurrent batch of 5 pages was requested, and nothing after it.
        expect(Math.max(...requestedPages)).toBe(5);
        expect(requestedPages).toHaveLength(5);
    });

    it('keeps items on a page that is only partly older (the cutoff has a safety margin)', async () => {
        installFeed({
            1: feed(item('new', now - 1 * DAY), item('borderline', now - 3.5 * DAY), item('old', now - 30 * DAY)),
        });
        commitSourceSync('civitasbay', planSourceSync('civitasbay'), now - 3 * DAY);
        const models = await run({});
        expect(models.map(m => m.name).sort()).toEqual(['borderline', 'new', 'old']);
    });

    it('ignores the cursor when a full refresh is requested', async () => {
        installFeed(pages());
        commitSourceSync('civitasbay', planSourceSync('civitasbay'), now - 3 * DAY);
        const models = await run({ fullRefresh: true });
        expect(models).toHaveLength(5);
    });

    it('does not move the cursor forward when a page failed', async () => {
        installFeed(pages());
        const proxy = (window as unknown as { electronAPI: { proxyRequest: ReturnType<typeof vi.fn> } }).electronAPI.proxyRequest;
        proxy.mockImplementation(async ({ url }: { url: string }) => {
            const page = Number(new URL(url).searchParams.get('page'));
            return page === 2 ? { success: false, error: 'HTTP 503' } : { success: true, data: pages()[page as 1 | 3] ?? feed() };
        });
        await run({});
        expect(planSourceSync('civitasbay').mode).toBe('full'); // still no cursor: the next sync retries everything
    });
});
