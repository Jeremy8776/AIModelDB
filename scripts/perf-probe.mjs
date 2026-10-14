/**
 * Performance probe for startup and sync.
 *
 * Seeds a throwaway profile with a realistic amount of data (models in IndexedDB,
 * MCP servers), then cold-starts the app and reports how long the main thread is
 * blocked and when content first appears. Optionally mocks the MCP registry and
 * presses Sync to measure sync responsiveness.
 *
 *   npm run build && npx vite preview --port 5173 --strictPort   (in another shell)
 *   npm run perf                      # Electron, 20k models, 4k MCP servers
 *   npm run perf -- --web             # headless Chromium instead of Electron
 *   npm run perf -- --models=50000 --sync --profile
 *
 * Flags: --web, --models=N, --servers=N, --sync, --profile (CPU profile: top self-time functions),
 *        --profileOut=path/prefix (also write the raw .cpuprofile JSON), --syncSeconds=N, --sync=models
 *        --exe=path/to/AI Model DB.exe (test a packaged build; run `npx electron-builder --dir --win` first)
 *        --history=N (also seed N old-layout sync snapshots, the way a long-time user's profile looks)
 *        --url=http://127.0.0.1:5173/ (page to test; Electron loads :5173 itself in dev mode).
 *
 * It never touches your real profile: Electron runs with a temporary --user-data-dir.
 * Seed data uses names starting "ZedModel" so the probe can tell real content from the splash.
 */
import { chromium, _electron } from '@playwright/test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
}));
const MODELS = Number(args.models || 20000);
const SERVERS = Number(args.servers || 4000);
const HISTORY = Number(args.history || 0);
const PAGE_URL = args.url || 'http://127.0.0.1:5173/';
const useWeb = Boolean(args.web);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const userDataDir = mkdtempSync(path.join(tmpdir(), 'aimodeldb-perf-'));

async function launch() {
    if (useWeb) {
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
        const page = await context.newPage();
        return { page, context, close: () => browser.close() };
    }
    // --exe=<path to a packaged "AI Model DB.exe"> tests the real file:// build; otherwise `electron .` (dev URL).
    const app = args.exe
        ? await _electron.launch({ executablePath: String(args.exe), args: [`--user-data-dir=${userDataDir}`] })
        : await _electron.launch({ args: ['.', `--user-data-dir=${userDataDir}`], cwd: root, env: { ...process.env, NODE_ENV: 'production' } });
    const isAppWindow = (w) => w.url().startsWith('http') || (w.url().startsWith('file:') && !w.url().includes('splash'));
    // The first window is the splash screen; the app itself is the one served from the page URL.
    let page = await app.firstWindow();
    for (let i = 0; i < 100 && !app.windows().some(isAppWindow); i++) await new Promise((r) => setTimeout(r, 200));
    page = app.windows().find(isAppWindow) || page;
    log(`app window: ${page.url()}`);
    return { page, context: page.context(), close: () => app.close() };
}

async function seed(page) {
    // Wait for the app to create its database so the seed uses the real schema.
    await page.waitForFunction(async () => (await indexedDB.databases()).some((d) => d.name === 'aiModelDB'), null, { timeout: 60000 });
    await page.evaluate(async ({ MODELS, SERVERS, HISTORY }) => {
        const lic = { name: 'MIT', type: 'OSI', commercial_use: true, attribution_required: false, share_alike: false, copyleft: false };
        const words = ['llama', 'mistral', 'diffusion', 'portrait', 'vision', 'coder', 'instruct', 'chat', 'video', 'audio', 'stable', 'flux', 'qwen'];
        const db = await new Promise((res, rej) => { const r = indexedDB.open('aiModelDB', 2); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
        await new Promise((res, rej) => {
            const tx = db.transaction(['models'], 'readwrite');
            const st = tx.objectStore('models');
            st.clear();
            for (let i = 0; i < MODELS; i++) {
                st.put({
                    id: `seed:${i}`, name: `ZedModel-${words[i % 13]}-${i}`, provider: `org${i % 400}`, domain: i % 3 ? 'LLM' : 'ImageGen', source: 'huggingface',
                    url: `https://example.com/${i}`, license: lic, hosting: { weights_available: true, api_available: false, on_premise_friendly: true, providers: [] },
                    tags: [words[i % 13], 'a', 'b'], downloads: MODELS - i, release_date: '2025-01-01',
                    description: ('A seeded description about ' + words[(i * 3) % 13] + '. ').repeat(20),
                });
            }
            tx.oncomplete = res;
            tx.onerror = () => rej(tx.error);
        });
        // Old-layout sync snapshots: one record per snapshot with every model inside it.
        let legacyLoadMs = null;
        if (HISTORY > 0) {
            const all = await new Promise((res, rej) => { const r = db.transaction(['models'], 'readonly').objectStore('models').getAll(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
            for (let h = 0; h < HISTORY; h++) {
                await new Promise((res, rej) => {
                    const tx = db.transaction(['history'], 'readwrite');
                    tx.objectStore('history').put({ id: `legacy-${h}`, timestamp: Date.now() - h * 1000, dateStr: new Date().toLocaleString(), modelCount: all.length, description: `Pre-sync backup (${all.length} models)`, sizeBytes: 0, models: all });
                    tx.oncomplete = res; tx.onerror = () => rej(tx.error);
                });
            }
            // What the old app did on every launch: load every snapshot, models included.
            const start = performance.now();
            await new Promise((res, rej) => { const r = db.transaction(['history'], 'readonly').objectStore('history').getAll(); r.onsuccess = () => res(r.result.length); r.onerror = () => rej(r.error); });
            legacyLoadMs = Math.round(performance.now() - start);
        }
        db.close();
        window.__legacyLoadMs = legacyLoadMs;
        const servers = Array.from({ length: SERVERS }, (_, i) => ({
            id: `io.github.org${i % 2000}/server-${i}`, name: `server-${i}`, description: 'd'.repeat(200), version: '1.0.0', source: 'mcp-registry',
            repository: { url: `https://github.com/org${i % 2000}/server-${i}`, source: 'github' },
            packages: [{ registryType: 'npm', identifier: `@org${i % 2000}/server-${i}`, version: '1.0.0', transport: { type: 'stdio' } }],
            remotes: [], tags: ['mcp'], license: lic, isFavorite: false, editedFields: [], _meta: {}, downloads: null,
        }));
        // The app reads MCP servers from localStorage once and migrates them to IndexedDB.
        localStorage.setItem('aiModelDB_mcpServers', JSON.stringify(servers));
        localStorage.setItem('aiModelDB_settings', JSON.stringify({ configVersion: 2 })); // skip onboarding
    }, { MODELS, SERVERS, HISTORY });
}

const installObserver = () => {
    window.__lt = window.__lt || [];
    try {
        // buffered: true replays long tasks from before this ran (Electron has loaded the page by then).
        new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push([Math.round(e.startTime), Math.round(e.duration)]); })
            .observe({ type: 'longtask', buffered: true });
    } catch { /* longtask unsupported */ }
};
const instrument = async (session) => {
    await session.context.addInitScript(installObserver); // later navigations (web mode)
    await session.page.evaluate(installObserver); // the page that is already open (Electron)
};

function summarise(lt) {
    const total = lt.reduce((a, [, d]) => a + d, 0);
    const max = lt.reduce((a, [, d]) => Math.max(a, d), 0);
    const worst = [...lt].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([at, d]) => `${d} ms at +${Math.round(at / 1000)}s`);
    return { longTasks: lt.length, blockedTotalMs: total, longestMs: max, worst };
}

async function topFunctions(cdp) {
    const { profile } = await cdp.send('Profiler.stop');
    if (args.profileOut) writeFileSync(String(args.profileOut).replace(/\.json$/, '') + `-${Date.now()}.json`, JSON.stringify(profile));
    const byId = new Map(profile.nodes.map((n) => [n.id, n]));
    const self = new Map();
    profile.samples.forEach((id, i) => {
        const f = byId.get(id).callFrame;
        const key = `${(f.functionName || '(anon)').slice(0, 60)} ${f.url.split('/').pop()}:${f.lineNumber}`;
        self.set(key, (self.get(key) || 0) + (profile.timeDeltas[i] || 0) / 1000);
    });
    return [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `${String(Math.round(v)).padStart(6)} ms  ${k}`);
}

async function mockNetwork(page) {
    let registryPages = 0;
    await page.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, async (route) => {
        const u = new URL(route.request().url());
        if (u.hostname === 'registry.modelcontextprotocol.io') {
            const cursor = Number(u.searchParams.get('cursor') || 0);
            const servers = Array.from({ length: 100 }, (_, i) => {
                const n = cursor * 100 + i;
                return {
                    server: { name: `io.github.sync${n % 3000}/srv-${n}`, description: 'registry server '.repeat(12), version: '1.0.0', repository: { url: `https://github.com/sync${n % 3000}/srv-${n}`, source: 'github' }, packages: [{ registryType: 'npm', identifier: `@sync/pkg-${n}`, version: '1.0.0', transport: { type: 'stdio' } }] },
                    _meta: { 'io.modelcontextprotocol.registry/official': { status: 'active', publishedAt: '2025-06-01T00:00:00Z', updatedAt: '2025-07-01T00:00:00Z', isLatest: true } },
                };
            });
            registryPages++;
            return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ servers, metadata: cursor < 49 ? { nextCursor: String(cursor + 1), count: 100 } : {} }) });
        }
        return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
    return () => registryPages;
}

function log(m) { console.error(`[perf ${new Date().toISOString().slice(11, 19)}] ${m}`); }
const unusedLog = (m) => console.error(`[perf ${new Date().toISOString().slice(11, 19)}] ${m}`);
let session = null;
const report = { mode: useWeb ? 'web' : 'electron', MODELS, SERVERS };
try {
    // Run 1: seed a fresh profile.
    log('launching to seed profile');
    session = await launch();
    log('launched');
    await instrument(session);
    if (useWeb) await session.page.goto(PAGE_URL, { waitUntil: 'load' });
    await session.page.waitForLoadState('load');
    await session.page.waitForTimeout(4000); // let the empty app finish starting, or its own startup save can race the seed
    await seed(session.page);
    if (HISTORY > 0) report.oldAppHistoryLoadAtStartupMs = await session.page.evaluate(() => window.__legacyLoadMs);
    log('seeded; restarting for the cold start');
    await session.close();

    // Run 2: cold start against the seeded profile.
    const t0 = Date.now();
    session = await launch();
    await instrument(session);
    let cdp = null;
    if (args.profile) {
        cdp = await session.context.newCDPSession(session.page);
        await cdp.send('Profiler.enable');
        await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
        await cdp.send('Profiler.start');
    }
    if (useWeb) await session.page.goto(PAGE_URL, { waitUntil: 'commit' });
    try {
        await session.page.waitForFunction(() => document.body.innerText.includes('ZedModel'), null, { timeout: args.timeout ? Number(args.timeout) : 60000, polling: 50 });
    } catch (error) {
        const text = await session.page.evaluate(() => document.body.innerText.slice(0, 400).replace(/\n+/g, ' / ')).catch(() => '(page unavailable)');
        throw new Error(`seeded models never appeared. Page shows: ${text}`, { cause: error });
    }
    report.modelsVisibleMs = Date.now() - t0;
    log(`models visible after ${report.modelsVisibleMs} ms`);
    await session.page.waitForTimeout(12000); // post-load work: scans, saves, effects
    if (cdp) report.startupTopSelfTime = await topFunctions(cdp);
    Object.assign(report, { startup: summarise(await session.page.evaluate(() => window.__lt)) });

    if (HISTORY > 0 && !args.sync) {
        // Second launch: the old snapshots were migrated during the first one, so this is the steady state.
        await session.close();
        const t1 = Date.now();
        session = await launch();
        await instrument(session);
        await session.page.waitForFunction(() => document.body.innerText.includes('ZedModel'), null, { timeout: 60000, polling: 50 });
        const secondVisibleMs = Date.now() - t1;
        await session.page.waitForTimeout(8000);
        report.secondLaunch = { modelsVisibleMs: secondVisibleMs, ...summarise(await session.page.evaluate(() => window.__lt)) };
    }
    if (args.sync) {
        // --sync (MCP tab, mocked-registry URL is not reachable in Electron, so this hits the real network)
        // --sync=models (Models tab, real network). --syncRuns=N presses Sync N times in a row, which shows
        // what incremental sync saves on the second and later runs. A run ends when the header says Idle again.
        const onModels = args.sync === 'models';
        if (!onModels) {
            if (useWeb) await mockNetwork(session.page);
            await session.page.getByText('MCP Servers', { exact: true }).first().click();
            await session.page.waitForTimeout(500);
        }
        const runs = [];
        report.syncRuns = runs; // filled in as runs finish, so a failure still reports the earlier ones
        for (let run = 1; run <= Number(args.syncRuns || 1); run++) {
            const before = await session.page.evaluate(() => window.__lt.length);
            if (cdp) await cdp.send('Profiler.start');
            const start = Date.now();
            // After a sync the flagged-models dialog opens over the page; dismiss it before the next click.
            // (Not Escape: the app treats it as "close the window" when no dialog is open.)
            if (await session.page.locator('div.fixed.inset-0.z-50').count()) {
                await session.page.locator('div.fixed.inset-0.z-50 button[title="Close"]').first().click({ timeout: 3000 }).catch(() => {});
            }
            // The button stays disabled while the previous run winds down.
            await session.page.waitForFunction(() => {
                const button = [...document.querySelectorAll('button')].find((b) => /^\s*Sync\s*$/.test(b.innerText));
                return Boolean(button) && !button.disabled;
            }, null, { timeout: 120000 });
            await session.page.locator('button', { hasText: /^\s*Sync\s*$/ }).first().click();
            const limitMs = Number(args.syncSeconds || 45) * 1000;
            const statusAt = [];
            const timeline = [];
            await session.page.waitForTimeout(6000);
            while (Date.now() - start < limitMs) {
                const text = await session.page.evaluate(() => document.body.innerText.slice(0, 160).replace(/\n+/g, ' / '));
                statusAt.push(text);
                const label = text.replace('AI Model DB / Sync / ', '').split(' / Page Size')[0].slice(0, 70);
                if (label !== timeline.at(-1)?.label) timeline.push({ label, atSeconds: Math.round((Date.now() - start) / 1000) });
                // Done when the header is Idle and the Sync button is usable again. The header button syncs
                // models, MCP servers and skills together, and stays disabled until all three have finished.
                const usable = await session.page.evaluate(() => {
                    const button = [...document.querySelectorAll('button')].find((b) => /^\s*Sync\s*$/.test(b.innerText));
                    return Boolean(button) && !button.disabled;
                });
                if (/Sync \/ Idle/.test(text) && usable && Date.now() - start > 8000) break;
                await session.page.waitForTimeout(1500);
            }
            const entry = { run, wallSeconds: Math.round((Date.now() - start) / 1000), finished: /Sync \/ Idle/.test(statusAt.at(-1) || ''), ...summarise((await session.page.evaluate(() => window.__lt)).slice(before)) };
            if (cdp) entry.topSelfTime = await topFunctions(cdp);
            entry.timeline = timeline.map((step) => `+${step.atSeconds}s ${step.label}`);
            entry.cursors = await session.page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('aiModelDB_syncCursors') || '{}')));
            entry.lastStatus = (statusAt.at(-1) || '').replace('AI Model DB / Sync / ', '').slice(0, 80);
            runs.push(entry);
            await session.page.waitForTimeout(3000); // let the 1.5 s "done" state clear before the next click
        }
        report.syncRuns = runs;
    }
    await session.close();
    console.log(JSON.stringify(report, null, 2));
} catch (error) {
    console.error('perf probe failed:', error);
    console.error('partial report:', JSON.stringify(report));
    process.exitCode = 1;
} finally {
    try { await session?.close(); } catch { /* already closed */ }
    // Electron can hold the profile files for a moment after closing; a leftover temp dir is harmless.
    try { rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }); } catch { /* ignore */ }
}
