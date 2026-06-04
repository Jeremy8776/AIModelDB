import React, { memo } from 'react';
import { Plug, ShieldCheck, Star } from 'lucide-react';
import { MCPServer } from '../../types';
import { RoundCheckbox } from '../RoundCheckbox';

interface MCPRowProps {
    server: MCPServer;
    onOpen: (server: MCPServer, element?: HTMLElement) => void;
    isActive?: boolean;
    isSelected?: boolean;
    onSelect?: (server: MCPServer, selected: boolean) => void;
    isFocused?: boolean;
    onToggleFavorite?: (id: string) => void;
}

/**
 * MCP server row. Visually identical to ModelRow:
 *   - 12-col grid (checkbox / name+id / updated / transport / packages / verified)
 *   - same hover, active, focus, selected states
 *   - same border + bg-card treatment
 *   - same row height (px-3 py-2 with two stacked lines in the name column)
 */
export const MCPRow = memo(function MCPRow({
    server,
    onOpen,
    isActive,
    isSelected,
    onSelect,
    isFocused,
    onToggleFavorite,
}: MCPRowProps) {
    const rowBg = isActive
        ? 'border-accent/50 bg-accent/10 shadow-[0_0_15px_rgba(var(--accent-rgb,139,92,246),0.1)]'
        : 'border-border bg-bg-card';

    const textMain = 'text-text';
    const textSecondary = 'text-text-secondary';
    const subtleText = 'text-text-subtle';

    const transports = Array.from(new Set((server.remotes || []).map(r => r.type)));
    const primaryPkg = server.packages?.[0];
    const updatedLabel = server.updatedAt
        ? new Date(server.updatedAt).toLocaleDateString()
        : (server.publishedAt ? new Date(server.publishedAt).toLocaleDateString() : '—');

    return (
        <div
            onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest('button') || target.closest('input') || target.closest('[role="checkbox"]')) return;
                onOpen(server, e.currentTarget);
            }}
            className={`group/row relative grid w-full grid-cols-12 items-center gap-3 rounded-xl border ${rowBg} px-3 py-2 text-left transition cursor-pointer hover:border-accent ${isFocused ? 'ring-2 ring-accent z-10' : ''}`}
        >
            <div className="col-span-1 flex justify-center items-center h-full">
                <RoundCheckbox
                    checked={!!isSelected}
                    onChange={(checked) => onSelect && onSelect(server, checked)}
                    size="sm"
                    ariaLabel={`Select ${server.name}`}
                />
            </div>

            <div className="col-span-3 flex min-w-0 items-center gap-2 overflow-hidden text-left">
                <Plug className={`h-4 w-4 flex-shrink-0 align-middle ${textSecondary}`} />
                <div className="flex min-w-0 flex-col">
                    <span className={`truncate text-sm ${textMain} flex items-center gap-1.5`} title={server.name}>
                        {server.name}
                        {server.isFavorite && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(server.id); }}
                                className="shrink-0"
                                title="Unfavorite"
                            >
                                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                            </button>
                        )}
                    </span>
                    <span className={`truncate text-xs ${subtleText}`} title={server.id}>
                        {server.id}
                    </span>
                </div>
            </div>

            <div className={`col-span-2 truncate text-sm ${textSecondary}`}>
                {updatedLabel}
                {server.version && (
                    <span className="ml-1 text-xs opacity-70">v{server.version}</span>
                )}
            </div>

            <div className={`col-span-2 flex items-center gap-1 text-sm ${textSecondary} overflow-hidden flex-wrap`}>
                {transports.length === 0 ? (
                    <span>—</span>
                ) : (
                    transports.map(tr => (
                        <span
                            key={tr}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-bg-input text-text-secondary font-mono whitespace-nowrap"
                        >
                            {tr}
                        </span>
                    ))
                )}
            </div>

            <div className={`col-span-2 text-sm ${textSecondary} truncate`}>
                {primaryPkg ? (
                    <span className="inline-flex items-center gap-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-input font-mono uppercase">
                            {primaryPkg.registryType}
                        </span>
                        <span className="truncate text-xs" title={primaryPkg.identifier}>
                            {primaryPkg.identifier}
                        </span>
                    </span>
                ) : (
                    <span>—</span>
                )}
            </div>

            <div className={`col-span-2 flex items-center gap-1 text-sm ${textSecondary}`}>
                {server.namespaceVerified && (
                    <span title="Namespace verified by official registry" className="text-emerald-600">
                        <ShieldCheck className="h-4 w-4" />
                    </span>
                )}
                {server.imageVerified && (
                    <span title="Docker-signed image" className="text-blue-600 text-xs px-1.5 py-0.5 rounded bg-blue-500/10">
                        Docker
                    </span>
                )}
                {server.directoryVerified && (
                    <span title="Listed in curated directory" className="text-text-secondary text-xs px-1.5 py-0.5 rounded bg-bg-input">
                        Dir
                    </span>
                )}
                {!server.namespaceVerified && !server.imageVerified && !server.directoryVerified && (
                    <span className="text-xs opacity-50">—</span>
                )}
            </div>
        </div>
    );
});
