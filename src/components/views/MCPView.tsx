import React from 'react';
import { Plug, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MCPServer } from '../../types';
import { MCPTable } from './MCPTable';
import { MCPSortKey } from './MCPTableHeader';

/**
 * MCP tab content. Slots into MainLayout's content area exactly where
 * ModelTable goes for the Models tab — same outer dimensions, same border
 * treatment via MCPTable (which mirrors ModelTable). Empty/error states
 * sit above the table just like Models' EmptyState pattern.
 */

export interface MCPViewProps {
    servers: MCPServer[];
    totalCount: number;
    isSyncing: boolean;
    syncProgress: { fetched: number; page: number; source: string } | null;
    lastError?: string | null;
    sortKey: MCPSortKey;
    sortDirection: 'asc' | 'desc';
    onSortChange: (key: MCPSortKey, direction: 'asc' | 'desc') => void;
    activeServerId: string | null;
    onOpen: (server: MCPServer) => void;
    onToggleFavorite: (id: string) => void;
    selectedIds?: Set<string>;
    onSelect?: (server: MCPServer, selected: boolean) => void;
    onSelectAll?: (selected: boolean) => void;
    theme: 'light' | 'dark';
}

export function MCPView({
    servers,
    totalCount,
    isSyncing,
    syncProgress,
    lastError,
    sortKey,
    sortDirection,
    onSortChange,
    activeServerId,
    onOpen,
    onToggleFavorite,
    selectedIds,
    onSelect,
    onSelectAll,
    theme,
}: MCPViewProps) {
    const { t } = useTranslation();

    if (lastError) {
        return (
            <div className="space-y-2">
                <ErrorBanner message={lastError} />
                {servers.length > 0 && (
                    <MCPTable
                        servers={servers}
                        sortKey={sortKey}
                        sortDirection={sortDirection}
                        onSortChange={onSortChange}
                        onOpen={(s) => onOpen(s)}
                        theme={theme}
                        selectedIds={selectedIds}
                        onSelect={onSelect}
                        onSelectAll={onSelectAll}
                        activeServerId={activeServerId}
                        onToggleFavorite={onToggleFavorite}
                    />
                )}
            </div>
        );
    }

    if (totalCount === 0 && !isSyncing) {
        return <EmptyState />;
    }

    if (servers.length === 0 && totalCount > 0 && !isSyncing) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[30vh] p-8 text-center">
                <p className="text-sm text-text-secondary">
                    {t('mcp.empty.noMatches', { defaultValue: 'No MCP servers match the current filters.' })}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {syncProgress && (
                <div className="text-xs text-text-secondary px-1">
                    {syncProgress.source} — page {syncProgress.page}, {syncProgress.fetched.toLocaleString()} fetched
                </div>
            )}
            <MCPTable
                servers={servers}
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSortChange={onSortChange}
                onOpen={(s) => onOpen(s)}
                theme={theme}
                selectedIds={selectedIds}
                onSelect={onSelect}
                onSelectAll={onSelectAll}
                activeServerId={activeServerId}
                onToggleFavorite={onToggleFavorite}
            />
        </div>
    );
}

function ErrorBanner({ message }: { message: string }) {
    return (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-700 text-sm">
            <AlertTriangle size={16} />
            <span>{message}</span>
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
