import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MCPServer } from '../../types';
import { MCPTable } from './MCPTable';
import { MCPSortKey } from './MCPTableHeader';
import { SectionEmptyState } from '../SectionEmptyState';

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
    onSyncAll: () => void;
    onImportCustom: () => void;
    theme: 'light' | 'dark';
}

export function MCPView({
    servers,
    totalCount,
    isSyncing,
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
    onSyncAll,
    onImportCustom,
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
        return (
            <SectionEmptyState
                title={t('mcp.empty.title', { defaultValue: 'No MCP servers in the local database' })}
                description={t('mcp.empty.desc', { defaultValue: 'Use Sync All to refresh every enabled source, or import custom data when you want to manage this section manually.' })}
                onSyncAll={onSyncAll}
                onImportCustom={onImportCustom}
            />
        );
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
