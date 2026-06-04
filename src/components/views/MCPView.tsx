import React, { useMemo } from 'react';
import { Plug, Star, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MCPServer } from '../../types';

/**
 * MCP table — renders inside MainLayout's content slot, same visual
 * treatment as ModelTable. Filters live in the sidebar; detail panel
 * lives in the right column. This component is just the list.
 */

export interface MCPViewProps {
    servers: MCPServer[];
    isSyncing: boolean;
    syncProgress: { fetched: number; page: number; source: string } | null;
    lastError?: string | null;
    activeId: string | null;
    onOpen: (server: MCPServer) => void;
    onToggleFavorite: (id: string) => void;
}

export function MCPView({
    servers,
    isSyncing,
    syncProgress,
    lastError,
    activeId,
    onOpen,
    onToggleFavorite,
}: MCPViewProps) {
    const { t } = useTranslation();

    const sorted = useMemo(() => {
        return [...servers].sort((a, b) => {
            // Favorites first, then by updatedAt desc
            const favDelta = (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0);
            if (favDelta !== 0) return favDelta;
            const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
            const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
            return bTime - aTime;
        });
    }, [servers]);

    return (
        <div id="entity-panel-mcp" role="tabpanel" className="space-y-2">
            {lastError && (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-700 text-sm">
                    <AlertTriangle size={16} />
                    <span>{lastError}</span>
                </div>
            )}

            {syncProgress && (
                <div className="text-xs text-text-secondary px-1">
                    {syncProgress.source} — page {syncProgress.page}, {syncProgress.fetched} fetched
                </div>
            )}

            {servers.length === 0 && !isSyncing ? (
                <EmptyState />
            ) : (
                <div className="space-y-2">
                    {sorted.map(server => (
                        <MCPRow
                            key={server.id}
                            server={server}
                            isActive={activeId === server.id}
                            onClick={() => onOpen(server)}
                            onToggleFavorite={() => onToggleFavorite(server.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function EmptyState() {
    const { t } = useTranslation();
    return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] p-8 text-center">
            <div className="rounded-2xl border border-border bg-bg-card p-10 max-w-xl">
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-accent/10 text-accent">
                    <Plug size={32} />
                </div>
                <h2 className="text-xl font-semibold mb-2">
                    {t('mcp.empty.title', { defaultValue: 'No MCP servers loaded yet' })}
                </h2>
                <p className="text-text-secondary">
                    {t('mcp.empty.desc', {
                        defaultValue: 'Hit Sync in the toolbar above to pull ~9,650 servers from the official Model Context Protocol registry. No API key required.',
                    })}
                </p>
            </div>
        </div>
    );
}

interface MCPRowProps {
    server: MCPServer;
    isActive: boolean;
    onClick: () => void;
    onToggleFavorite: () => void;
}

function MCPRow({ server, isActive, onClick, onToggleFavorite }: MCPRowProps) {
    const transports = useMemo(
        () => Array.from(new Set((server.remotes || []).map(r => r.type))),
        [server.remotes]
    );
    const primaryPackage = server.packages?.[0];

    return (
        <div
            className={`rounded-xl border bg-bg-card cursor-pointer transition-colors ${
                isActive ? 'border-accent' : 'border-border hover:border-accent/40'
            }`}
            onClick={onClick}
        >
            <div className="flex items-start gap-3 p-3">
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
                            <span title="Namespace verified" className="text-emerald-600">
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
            </div>
        </div>
    );
}
