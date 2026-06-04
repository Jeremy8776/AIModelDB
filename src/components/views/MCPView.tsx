import React, { useMemo, useState } from 'react';
import { Plug, RefreshCw, Star, ExternalLink, Trash2, AlertTriangle, ShieldCheck, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMCPServers } from '../../hooks/useMCPServers';
import { openExternalUrl } from '../../utils/electron';
import { MCPServer } from '../../types';

/**
 * MCP Servers tab — Phase 2.
 *
 * Pulls from the official MCP Registry (registry.modelcontextprotocol.io)
 * via useMCPServers. Renders a simple list/table with search + transport
 * filters. Detail rendering is inline-expanded for now — a separate
 * detail panel can come once we mirror the Models layout pattern.
 */
export function MCPView() {
    const { t } = useTranslation();
    const {
        servers,
        meta,
        isSyncing,
        syncProgress,
        syncOfficialRegistry,
        cancelSync,
        toggleFavorite,
        deleteServer,
    } = useMCPServers();

    const [query, setQuery] = useState('');
    const [transportFilter, setTransportFilter] = useState<'all' | 'stdio' | 'streamable-http' | 'sse'>('all');
    const [favoritesOnly, setFavoritesOnly] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return servers.filter(s => {
            if (favoritesOnly && !s.isFavorite) return false;
            if (transportFilter !== 'all') {
                const types = (s.remotes || []).map(r => r.type);
                if (!types.includes(transportFilter)) return false;
            }
            if (q && !`${s.name} ${s.description ?? ''} ${s.id}`.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [servers, query, transportFilter, favoritesOnly]);

    const sorted = useMemo(() => {
        return [...filtered].sort((a, b) => {
            // Favorites first, then by updatedAt desc
            if ((b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0) !== 0) {
                return (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0);
            }
            const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
            const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
            return bTime - aTime;
        });
    }, [filtered]);

    const isEmpty = servers.length === 0;
    const hasResults = sorted.length > 0;

    return (
        <div id="entity-panel-mcp" role="tabpanel" className="p-4 max-w-7xl mx-auto">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 mb-4 p-3 rounded-2xl border border-border bg-bg-card">
                <button
                    onClick={isSyncing ? cancelSync : syncOfficialRegistry}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                        isSyncing
                            ? 'bg-amber-500/20 text-amber-700 hover:bg-amber-500/30'
                            : 'bg-accent text-white hover:opacity-90'
                    }`}
                >
                    <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                    {isSyncing
                        ? t('mcp.toolbar.cancel', { defaultValue: 'Cancel sync' })
                        : t('mcp.toolbar.sync', { defaultValue: 'Sync MCP Registry' })}
                </button>

                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <Search size={14} className="text-text-secondary" />
                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder={t('mcp.toolbar.search', { defaultValue: 'Search MCP servers...' })}
                        className="w-full bg-transparent border-none outline-none text-sm placeholder:text-text-secondary"
                    />
                </div>

                <select
                    value={transportFilter}
                    onChange={e => setTransportFilter(e.target.value as typeof transportFilter)}
                    className="px-3 py-1.5 rounded-lg border border-border bg-bg-input text-sm"
                >
                    <option value="all">{t('mcp.toolbar.allTransports', { defaultValue: 'All transports' })}</option>
                    <option value="stdio">stdio</option>
                    <option value="streamable-http">streamable-http</option>
                    <option value="sse">sse</option>
                </select>

                <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                        type="checkbox"
                        checked={favoritesOnly}
                        onChange={e => setFavoritesOnly(e.target.checked)}
                        className="accent-accent"
                    />
                    <Star size={14} className={favoritesOnly ? 'fill-amber-500 text-amber-500' : ''} />
                    {t('mcp.toolbar.favoritesOnly', { defaultValue: 'Favorites only' })}
                </label>
            </div>

            {/* Status bar */}
            <div className="flex items-center justify-between mb-3 text-xs text-text-secondary px-1">
                <span>
                    {hasResults
                        ? t('mcp.status.showing', {
                            defaultValue: 'Showing {{count}} of {{total}}',
                            count: sorted.length,
                            total: servers.length,
                          })
                        : isEmpty
                            ? t('mcp.status.noServers', { defaultValue: 'No servers yet — click Sync to pull from the official registry' })
                            : t('mcp.status.noMatches', { defaultValue: 'No matches for current filters' })}
                </span>
                <span>
                    {syncProgress
                        ? `${syncProgress.source} — page ${syncProgress.page}, ${syncProgress.fetched} fetched`
                        : meta.lastSync
                            ? `Last sync ${new Date(meta.lastSync).toLocaleString()}`
                            : ''}
                </span>
            </div>

            {meta.lastError && (
                <div className="flex items-center gap-2 mb-3 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-700 text-sm">
                    <AlertTriangle size={16} />
                    <span>{meta.lastError}</span>
                </div>
            )}

            {/* Empty state */}
            {isEmpty && !isSyncing && (
                <div className="flex flex-col items-center justify-center min-h-[40vh] p-8 text-center">
                    <div className="rounded-2xl border border-border bg-bg-card p-10 max-w-xl">
                        <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-accent/10 text-accent">
                            <Plug size={32} />
                        </div>
                        <h2 className="text-xl font-semibold mb-2">
                            {t('mcp.empty.title', { defaultValue: 'No MCP servers loaded yet' })}
                        </h2>
                        <p className="text-text-secondary mb-4">
                            {t('mcp.empty.desc', {
                                defaultValue: 'Click "Sync MCP Registry" above to pull ~9,650 servers from the official Model Context Protocol registry. The data is cached locally — no API key required.',
                            })}
                        </p>
                    </div>
                </div>
            )}

            {/* List */}
            {hasResults && (
                <div className="space-y-2">
                    {sorted.map(server => (
                        <MCPRow
                            key={server.id}
                            server={server}
                            expanded={expandedId === server.id}
                            onToggleExpand={() => setExpandedId(prev => (prev === server.id ? null : server.id))}
                            onToggleFavorite={() => toggleFavorite(server.id)}
                            onDelete={() => deleteServer(server.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

interface MCPRowProps {
    server: MCPServer;
    expanded: boolean;
    onToggleExpand: () => void;
    onToggleFavorite: () => void;
    onDelete: () => void;
}

function MCPRow({ server, expanded, onToggleExpand, onToggleFavorite, onDelete }: MCPRowProps) {
    const transports = useMemo(
        () => Array.from(new Set((server.remotes || []).map(r => r.type))),
        [server.remotes]
    );
    const primaryPackage = server.packages?.[0];

    return (
        <div className="rounded-xl border border-border bg-bg-card hover:border-accent/40 transition-colors">
            <div className="flex items-start gap-3 p-3 cursor-pointer" onClick={onToggleExpand}>
                <button
                    onClick={e => { e.stopPropagation(); onToggleFavorite(); }}
                    className="mt-0.5 text-text-secondary hover:text-amber-500 transition-colors"
                    title="Toggle favorite"
                >
                    <Star size={16} className={server.isFavorite ? 'fill-amber-500 text-amber-500' : ''} />
                </button>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{server.name}</span>
                        {server.namespaceVerified && (
                            <span title="Namespace verified by official registry" className="text-emerald-600">
                                <ShieldCheck size={14} />
                            </span>
                        )}
                        {server.version && (
                            <span className="text-xs text-text-secondary">v{server.version}</span>
                        )}
                        {transports.map(t => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-bg-input text-text-secondary font-mono">
                                {t}
                            </span>
                        ))}
                        {primaryPackage && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-input text-text-secondary font-mono">
                                {primaryPackage.registryType}:{primaryPackage.identifier}
                            </span>
                        )}
                    </div>
                    <div className="text-xs text-text-secondary mt-0.5 line-clamp-1">
                        {server.id}
                    </div>
                    {server.description && (
                        <div className="text-sm text-text mt-1 line-clamp-2">
                            {server.description}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    {server.repository?.url && (
                        <button
                            onClick={e => { e.stopPropagation(); openExternalUrl(server.repository!.url); }}
                            className="p-1.5 rounded hover:bg-bg-input text-text-secondary hover:text-text"
                            title="Open repository"
                        >
                            <ExternalLink size={14} />
                        </button>
                    )}
                    <button
                        onClick={e => { e.stopPropagation(); onDelete(); }}
                        className="p-1.5 rounded hover:bg-red-500/10 text-text-secondary hover:text-red-600"
                        title="Remove from local cache"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            {expanded && (
                <div className="border-t border-border p-3 text-sm bg-bg/40 space-y-3">
                    {server.packages && server.packages.length > 0 && (
                        <div>
                            <div className="text-xs font-semibold text-text-secondary mb-1">Packages</div>
                            <div className="space-y-1">
                                {server.packages.map((p, i) => (
                                    <div key={i} className="font-mono text-xs">
                                        <span className="text-accent">{p.registryType}</span>: {p.identifier}
                                        {p.version && <span className="text-text-secondary"> @ {p.version}</span>}
                                        {p.runtimeHint && <span className="text-text-secondary"> ({p.runtimeHint})</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {server.remotes && server.remotes.length > 0 && (
                        <div>
                            <div className="text-xs font-semibold text-text-secondary mb-1">Remotes</div>
                            <div className="space-y-1">
                                {server.remotes.map((r, i) => (
                                    <div key={i} className="font-mono text-xs">
                                        <span className="text-accent">{r.type}</span>
                                        {r.url && <span className="text-text-secondary"> — {r.url}</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {server.publishedAt && (
                        <div className="text-xs text-text-secondary">
                            Published {new Date(server.publishedAt).toLocaleDateString()}
                            {server.updatedAt && server.updatedAt !== server.publishedAt &&
                                ` · Updated ${new Date(server.updatedAt).toLocaleDateString()}`}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
