import { useCallback, useEffect, useRef, useState } from 'react';
import { MCPServer } from '../types';
import { fetchOfficialMCPRegistry } from '../services/api/fetchers/mcp/official-registry';
import { fetchMCPServersFromGitHubTopics } from '../services/api/fetchers/mcp/github-topics';
import { fetchMCPServersFromNpm } from '../services/api/fetchers/mcp/npm-registry';
import { fetchMCPServersFromGlama, GlamaAuthError } from '../services/api/fetchers/mcp/glama';
import { fetchMCPServersFromPyPI } from '../services/api/fetchers/mcp/pypi';
import { MCP_SOURCES } from '../services/sources/entitySources';
import { commitSourceSync, planSourceSync } from '../services/sync/syncCursor';
import { useSettings } from '../context/SettingsContext';
import { appendMCPServers, restoreMCPServers } from '../utils/entityMerge';
import { useBatchedMerge, useEntityList } from './useEntityStore';

/**
 * Source keys the catalog marks `available`. A fetcher/runner may exist for a
 * source that's still on the "Soon" roadmap (status: 'planned') — those must
 * not run until promoted. The catalog status is the single source of truth.
 */
const AVAILABLE_MCP_KEYS = new Set(
    MCP_SOURCES.filter(s => s.status === 'available').map(s => s.key)
);

const STORAGE_KEY = 'aiModelDB_mcpServers';
const META_KEY = 'aiModelDB_mcpMeta';

interface MCPMeta {
    lastSync: string | null;
    lastError?: string | null;
}

interface SyncProgress {
    fetched: number;
    page: number;
    source: string;
}

/**
 * Per-tab controller for the MCP Servers entity. Mirrors the Models stack's
 * separation of concerns (state + persistence + sync + user-edit protection)
 * but with much less surface area for the Phase 2 MVP. Will grow as more
 * fetchers and filter primitives land.
 *
 * Persistence: localStorage under `aiModelDB_mcpServers` (separate from
 * the models store) plus a small meta blob for sync timestamps.
 */
export function useMCPServers() {
    const { settings } = useSettings();
    const { items: servers, setItems: setServersState, isLoading, persistError } = useEntityList<MCPServer>(STORAGE_KEY, restoreMCPServers);

    const [meta, setMetaState] = useState<MCPMeta>(() => {
        try {
            const raw = localStorage.getItem(META_KEY);
            if (raw) return JSON.parse(raw) as MCPMeta;
        } catch { /* fall through */ }
        return { lastSync: null };
    });

    const [isSyncing, setIsSyncing] = useState(false);
    const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        try {
            localStorage.setItem(META_KEY, JSON.stringify(meta));
        } catch { /* non-fatal */ }
    }, [meta]);

    /**
     * Merge incoming servers with existing list. Identity = MCPServer.id.
     * User flags (isFavorite, editedFields) on the existing record always
     * win — mirrors the V3 strategy from the Models merge.
     */
    const { enqueue: mergeServers, flush: flushServers } = useBatchedMerge(setServersState, appendMCPServers);

    /**
     * Pull from the official MCP registry. Streams pages into state so the
     * UI shows progress instead of waiting for the whole crawl to finish.
     */
    const syncOfficialRegistry = useCallback(async () => {
        if (isSyncing) return;
        setIsSyncing(true);
        setSyncProgress({ fetched: 0, page: 0, source: 'mcp-registry' });

        const controller = new AbortController();
        abortRef.current = controller;

        try {
            let fetchedTotal = 0;
            const plan = planSourceSync('mcp-registry', { fullRefresh: settings.incrementalSync === false });
            const startedAt = Date.now();
            await fetchOfficialMCPRegistry({
                pageSize: 100,
                updatedSince: plan.cutoffIso ?? undefined,
                abortSignal: controller.signal,
                onPage: (pageServers, pageIndex) => {
                    fetchedTotal += pageServers.length;
                    mergeServers(pageServers);
                    setSyncProgress({
                        fetched: fetchedTotal,
                        page: pageIndex + 1,
                        source: 'mcp-registry',
                    });
                },
            });
            commitSourceSync('mcp-registry', plan, startedAt);
            flushServers();
            setMetaState(prev => ({ ...prev, lastSync: new Date().toISOString(), lastError: null }));
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            console.error('[MCP] Sync error:', message);
            setMetaState(prev => ({ ...prev, lastError: message }));
        } finally {
            setIsSyncing(false);
            setSyncProgress(null);
            abortRef.current = null;
        }
    }, [isSyncing, mergeServers, flushServers, settings.incrementalSync]);

    /**
     * Run every MCP source the user has toggled on. Sources are executed in
     * priority order (official registry first since it's canonical) and merged
     * into state as each completes. Progress is reported per source.
     */
    const syncAll = useCallback(async () => {
        if (isSyncing) return;
        setIsSyncing(true);

        const controller = new AbortController();
        abortRef.current = controller;
        const mcpSources = settings.mcpSources || {};
        const gitHubToken = settings.gitHubToken || undefined;
        const glamaApiKey = settings.glamaApiKey || undefined;

        let totalFetched = 0;

        const setSourceProgress = (source: string, page: number) => {
            setSyncProgress({ fetched: totalFetched, page, source });
        };

        const runOfficialRegistry = async () => {
            setSourceProgress('mcp-registry', 0);
            // Only what changed since the last successful pull, unless incremental sync is off
            // or a full refresh is due (see services/sync/syncCursor.ts).
            const plan = planSourceSync('mcp-registry', { fullRefresh: settings.incrementalSync === false });
            const startedAt = Date.now();
            await fetchOfficialMCPRegistry({
                pageSize: 100,
                updatedSince: plan.cutoffIso ?? undefined,
                abortSignal: controller.signal,
                onPage: (pageServers, pageIndex) => {
                    totalFetched += pageServers.length;
                    mergeServers(pageServers);
                    setSourceProgress('mcp-registry', pageIndex + 1);
                },
            });
            commitSourceSync('mcp-registry', plan, startedAt);
        };

        const runGitHubTopics = async () => {
            setSourceProgress('github-topics', 0);
            const found = await fetchMCPServersFromGitHubTopics({
                gitHubToken,
                abortSignal: controller.signal,
            });
            if (found.length > 0) {
                totalFetched += found.length;
                mergeServers(found);
            }
            setSourceProgress('github-topics', 1);
        };

        const runNpm = async () => {
            setSourceProgress('npm', 0);
            const found = await fetchMCPServersFromNpm({
                abortSignal: controller.signal,
            });
            if (found.length > 0) {
                totalFetched += found.length;
                mergeServers(found);
            }
            setSourceProgress('npm', 1);
        };

        const runGlama = async () => {
            // Glama needs a key. Without one the source is skipped quietly (it is on by default),
            // rather than reporting a 401 on every sync.
            if (!glamaApiKey) {
                console.info('[MCP] Skipping Glama: no API key set in Settings > Data Sources');
                return;
            }
            setSourceProgress('glama', 0);
            await fetchMCPServersFromGlama({
                apiKey: glamaApiKey,
                maxServers: 1000,
                abortSignal: controller.signal,
                onPage: (pageServers, pageIndex) => {
                    totalFetched += pageServers.length;
                    mergeServers(pageServers);
                    setSourceProgress('glama', pageIndex + 1);
                },
            });
        };

        const runPyPI = async () => {
            setSourceProgress('pypi', 0);
            await fetchMCPServersFromPyPI({
                maxPackages: 120,
                abortSignal: controller.signal,
                onPage: (pageServers) => {
                    totalFetched += pageServers.length;
                    mergeServers(pageServers);
                },
            });
            setSourceProgress('pypi', 1);
        };

        // Source keys (from entitySources.ts) → runner, in execution priority.
        // Iteration order is meaningful (official registry first since it's
        // canonical), so this is an array of tuples rather than a plain object
        // — Object iteration order is spec-compliant for string keys but the
        // dependence isn't obvious to readers.
        const runners: Array<[string, () => Promise<void>]> = [
            ['mcp-registry', runOfficialRegistry],
            ['github', runGitHubTopics],
            ['packages', runNpm],
            ['glama', runGlama],
            ['pypi', runPyPI],
        ];

        const errors: string[] = [];

        try {
            for (const [key, run] of runners) {
                if (controller.signal.aborted) break;
                // Skip sources still on the "Soon" roadmap — their fetcher is
                // wired but the catalog hasn't promoted them to `available` yet.
                if (!AVAILABLE_MCP_KEYS.has(key)) continue;
                // Default-on for any "available" source whose toggle hasn't been
                // written yet — matches DEFAULT_MCP_SOURCES and the Header
                // Sync gating in AIModelDB (`!== false`). Users opt out
                // explicitly via Settings; they don't opt in by re-running
                // onboarding.
                if (mcpSources[key] === false) continue;
                try {
                    await run();
                } catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    console.error(`[MCP] Source "${key}" failed:`, message);
                    errors.push(err instanceof GlamaAuthError ? message : `${key}: ${message}`);
                } finally {
                    flushServers();
                }
            }
            setMetaState(prev => ({
                ...prev,
                lastSync: new Date().toISOString(),
                lastError: errors.length > 0 ? errors.join(' · ') : null,
            }));
        } finally {
            setIsSyncing(false);
            setSyncProgress(null);
            abortRef.current = null;
        }
    }, [isSyncing, mergeServers, flushServers, settings.mcpSources, settings.gitHubToken, settings.glamaApiKey, settings.incrementalSync]);

    const cancelSync = useCallback(() => {
        if (abortRef.current) abortRef.current.abort();
    }, []);

    const toggleFavorite = useCallback((id: string) => {
        setServersState(prev =>
            prev.map(s => (s.id === id ? { ...s, isFavorite: !s.isFavorite } : s))
        );
    }, [setServersState]);

    const deleteServer = useCallback((id: string) => {
        setServersState(prev => prev.filter(s => s.id !== id));
    }, [setServersState]);

    const clearAll = useCallback(() => {
        setServersState([]);
        setMetaState({ lastSync: null });
    }, [setServersState]);

    /**
     * Export the current MCP server cache as a JSON download. Mirrors the
     * Models export affordance so the shared Toolbar's Export button works
     * on the MCP tab too.
     */
    const exportServers = useCallback(() => {
        try {
            const blob = new Blob([JSON.stringify(servers, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mcp-servers-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('[MCP] Export failed:', e);
        }
    }, [servers]);

    return {
        servers,
        isLoading,
        persistError,
        meta,
        isSyncing,
        syncProgress,
        syncOfficialRegistry,
        syncAll,
        cancelSync,
        toggleFavorite,
        deleteServer,
        clearAll,
        exportServers,
        mergeServers,
    };
}
