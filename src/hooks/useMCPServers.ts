import { useCallback, useEffect, useRef, useState } from 'react';
import { MCPServer } from '../types';
import { fetchOfficialMCPRegistry } from '../services/api/fetchers/mcp/official-registry';

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
    const [servers, setServersState] = useState<MCPServer[]>(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return JSON.parse(raw) as MCPServer[];
        } catch { /* corrupt blob — fall through to empty */ }
        return [];
    });

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

    // Persist on every change. Debouncing isn't critical here — MCP lists are
    // smaller than the models store and changes are infrequent (sync-driven).
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(servers));
        } catch { /* quota or disabled — non-fatal */ }
    }, [servers]);

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
    const mergeServers = useCallback((incoming: MCPServer[]) => {
        setServersState(prev => {
            const byId = new Map<string, MCPServer>();
            prev.forEach(s => byId.set(s.id, s));

            for (const inc of incoming) {
                const existing = byId.get(inc.id);
                if (!existing) {
                    byId.set(inc.id, inc);
                    continue;
                }
                // Protect user edits and favorites; everything else takes incoming.
                const edited = new Set(existing.editedFields || []);
                const merged: MCPServer = {
                    ...inc,
                    isFavorite: existing.isFavorite ?? inc.isFavorite,
                    editedFields: existing.editedFields,
                };
                // Restore protected fields back from existing
                for (const field of edited) {
                    // Type narrowing for arbitrary string indexing — kept loose since
                    // editedFields is a freeform string set populated by the editor.
                    (merged as unknown as Record<string, unknown>)[field] =
                        (existing as unknown as Record<string, unknown>)[field];
                }
                // Sources accumulate
                const sources = new Set<string>();
                existing.source.split(',').forEach(s => sources.add(s.trim()));
                inc.source.split(',').forEach(s => sources.add(s.trim()));
                merged.source = Array.from(sources).sort().join(', ');
                byId.set(inc.id, merged);
            }
            return Array.from(byId.values());
        });
    }, []);

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
            await fetchOfficialMCPRegistry({
                pageSize: 100,
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
            setMetaState({ lastSync: new Date().toISOString(), lastError: null });
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            console.error('[MCP] Sync error:', message);
            setMetaState(prev => ({ ...prev, lastError: message }));
        } finally {
            setIsSyncing(false);
            setSyncProgress(null);
            abortRef.current = null;
        }
    }, [isSyncing, mergeServers]);

    const cancelSync = useCallback(() => {
        if (abortRef.current) abortRef.current.abort();
    }, []);

    const toggleFavorite = useCallback((id: string) => {
        setServersState(prev =>
            prev.map(s => (s.id === id ? { ...s, isFavorite: !s.isFavorite } : s))
        );
    }, []);

    const deleteServer = useCallback((id: string) => {
        setServersState(prev => prev.filter(s => s.id !== id));
    }, []);

    const clearAll = useCallback(() => {
        setServersState([]);
        setMetaState({ lastSync: null });
    }, []);

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
        meta,
        isSyncing,
        syncProgress,
        syncOfficialRegistry,
        cancelSync,
        toggleFavorite,
        deleteServer,
        clearAll,
        exportServers,
        mergeServers,
    };
}
