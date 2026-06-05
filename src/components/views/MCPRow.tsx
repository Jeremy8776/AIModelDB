import React, { memo } from 'react';
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
 * MCP server row. Shares the exact styling rules of ModelRow / SkillsRow:
 * no decorative leading icon, no inline favorite star (favoriting happens
 * in the detail panel), 12-col grid, identical hover/active/focus/selected
 * states. Content is pure text + text chips. Verified state is shown as a
 * text glyph, not an SVG icon.
 */
export const MCPRow = memo(function MCPRow({
    server,
    onOpen,
    isActive,
    isSelected,
    onSelect,
    isFocused,
}: MCPRowProps) {
    const rowBg = isActive
        ? 'border-accent/50 bg-accent/10 shadow-[0_0_15px_rgba(var(--accent-rgb,139,92,246),0.1)]'
        : 'border-border bg-bg-card';

    const textMain = 'text-text';
    const textSecondary = 'text-text-secondary';
    const subtleText = 'text-text-subtle';

    const transports = Array.from(new Set((server.remotes || []).map(r => r.type)));
    const primaryPackage = server.packages?.[0];
    const updatedLabel = server.updatedAt
        ? new Date(server.updatedAt).toLocaleDateString()
        : (server.publishedAt ? new Date(server.publishedAt).toLocaleDateString() : '—');
    const isVerified = server.namespaceVerified || server.imageVerified || server.directoryVerified;

    return (
        <div
            onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest('button') || target.closest('input') || target.closest('[role="checkbox"]')) return;
                onOpen(server, e.currentTarget);
            }}
            className={`group/row relative grid w-full grid-cols-12 items-center gap-3 rounded-xl border ${rowBg} px-3 py-2 text-left transition cursor-pointer hover:border-accent ${isFocused ? 'ring-2 ring-accent z-10' : ''}`}
        >
            <div className="col-span-1 flex justify-start items-center h-full pl-6">
                <RoundCheckbox
                    checked={!!isSelected}
                    onChange={(checked) => onSelect && onSelect(server, checked)}
                    size="sm"
                    ariaLabel={`Select ${server.name}`}
                />
            </div>

            <div className="col-span-3 flex min-w-0 items-center gap-2 overflow-hidden text-left">
                <div className="flex min-w-0 flex-col">
                    <span className={`truncate text-sm ${textMain}`} title={server.name}>{server.name}</span>
                    <span className={`truncate text-xs ${subtleText}`} title={server.id}>{server.id}</span>
                </div>
            </div>

            <div className={`col-span-2 truncate text-sm ${textSecondary}`}>
                {updatedLabel}
                {server.version && <span className="ml-1 text-xs opacity-70">v{server.version}</span>}
            </div>

            <div className={`col-span-2 flex items-center gap-1 text-sm ${textSecondary} overflow-hidden flex-wrap`}>
                {transports.length === 0 ? (
                    <span className="opacity-50">—</span>
                ) : (
                    transports.map(tr => (
                        <span key={tr} className="text-[10px] px-1.5 py-0.5 rounded bg-bg-input text-text-secondary font-mono whitespace-nowrap">
                            {tr}
                        </span>
                    ))
                )}
            </div>

            <div className={`col-span-2 text-sm ${textSecondary} truncate`}>
                {primaryPackage ? (
                    <span className="inline-flex items-center gap-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-input font-mono uppercase">{primaryPackage.registryType}</span>
                        <span className="truncate text-xs" title={primaryPackage.identifier}>{primaryPackage.identifier}</span>
                    </span>
                ) : (
                    <span className="opacity-50">—</span>
                )}
            </div>

            <div className={`col-span-2 flex items-center gap-1 text-sm ${textSecondary} flex-wrap`}>
                {server.namespaceVerified && <span className="text-emerald-600 text-xs font-medium">✓ Verified</span>}
                {server.imageVerified && <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-input font-mono">docker</span>}
                {server.directoryVerified && <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-input font-mono">dir</span>}
                {!isVerified && <span className="opacity-50">—</span>}
            </div>
        </div>
    );
});
