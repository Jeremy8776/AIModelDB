import React from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { RoundCheckbox } from '../RoundCheckbox';

export type MCPSortKey = 'name' | 'updatedAt' | 'runtime' | 'setup' | 'verified';

export interface MCPTableHeaderProps {
    sortKey: MCPSortKey;
    sortDirection: 'asc' | 'desc';
    onSortChange: (key: MCPSortKey, direction: 'asc' | 'desc') => void;
    theme: 'light' | 'dark';
    isAllSelected?: boolean;
    onSelectAll?: (selected: boolean) => void;
}

/**
 * Sortable header row for the MCP servers table. Mirrors the Models
 * TableHeader exactly — same 12-col grid, same checkbox column, same
 * sort button visuals — with MCP-relevant column names.
 */
export function MCPTableHeader({
    sortKey,
    sortDirection,
    onSortChange,
    theme,
    isAllSelected,
    onSelectAll,
}: MCPTableHeaderProps) {
    const { t } = useTranslation();
    const textSubtle = theme === 'dark' ? 'text-zinc-400' : 'text-gray-800';

    const handleSortClick = (key: MCPSortKey) => {
        if (sortKey === key) {
            onSortChange(key, sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            onSortChange(key, 'desc');
        }
    };

    const renderSortButton = (key: MCPSortKey, label: string, colSpan: string, hint?: string) => {
        const isActive = sortKey === key;
        return (
            <button
                onClick={() => handleSortClick(key)}
                className={`${colSpan} flex items-center gap-1 transition-colors cursor-pointer`}
                style={{ color: isActive ? 'var(--accent)' : undefined }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--accent)'; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = ''; }}
                title={hint}
            >
                {label}
                {isActive ? (
                    sortDirection === 'asc'
                        ? <ArrowUp className="h-3 w-3" />
                        : <ArrowDown className="h-3 w-3" />
                ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-50" />
                )}
            </button>
        );
    };

    return (
        <div className={`grid grid-cols-12 gap-3 px-3 py-2 text-xs ${textSubtle} border-b items-center`}>
            <div className="col-span-1 flex justify-start pl-6">
                <RoundCheckbox
                    checked={!!isAllSelected}
                    onChange={(checked) => onSelectAll && onSelectAll(checked)}
                    size="sm"
                    ariaLabel={t('common.select', { defaultValue: 'Select' })}
                />
            </div>

            {renderSortButton('name', t('mcpTable.name', { defaultValue: 'Name' }), 'col-span-3')}
            {renderSortButton('updatedAt', t('mcpTable.updated', { defaultValue: 'Updated' }), 'col-span-2')}
            {renderSortButton(
                'runtime',
                t('mcpTable.runtime', { defaultValue: 'How to run' }),
                'col-span-2',
                t('mcpTable.runtimeHint', { defaultValue: 'Local install (node, python, docker, …) or remote endpoint (HTTP, SSE, WebSocket).' })
            )}
            {renderSortButton(
                'setup',
                t('mcpTable.setup', { defaultValue: 'Setup' }),
                'col-span-2',
                t('mcpTable.setupHint', { defaultValue: 'What you have to supply before it runs — API keys, env vars, or headers. None means nothing extra needed.' })
            )}
            {renderSortButton('verified', t('mcpTable.verified', { defaultValue: 'Provenance' }), 'col-span-2')}
        </div>
    );
}
