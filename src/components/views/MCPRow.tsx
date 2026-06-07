import React, { memo } from 'react';
import { MCPServer } from '../../types';
import { RoundCheckbox } from '../RoundCheckbox';
import { getRuntimeLabel, getSetupRequirement, getSetupTooltip } from '../../utils/mcpDisplay';
import { formatReleaseDateValue } from '../../utils/format';

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
 * states. Content is pure text + text chips. Provenance state is shown as
 * explicit badges so users do not mistake it for a security audit.
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

    const runtime = getRuntimeLabel(server);
    const setup = getSetupRequirement(server);
    const setupTooltip = getSetupTooltip(server);
    const primaryPackage = server.packages?.[0];
    // Release date — published date preferred, falling back to last update.
    // Same formatter as the Models tab so all entities read identically.
    const releaseLabel = formatReleaseDateValue(server.publishedAt ?? server.updatedAt);
    const hasProvenance = server.namespaceVerified || server.imageVerified || server.directoryVerified;

    const runtimeKindLabel = runtime.kind === 'local'
        ? 'Local'
        : runtime.kind === 'remote'
            ? 'Remote'
            : '—';
    const runtimeTooltip = runtime.kind === 'local'
        ? `Local install via ${runtime.detail}${primaryPackage ? ` · ${primaryPackage.identifier}` : ''}`
        : runtime.kind === 'remote'
            ? `Remote endpoint over ${runtime.detail}`
            : 'No install or endpoint info on record';

    const setupChipClass = setup === 'required'
        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
        : setup === 'optional'
            ? 'bg-bg-input text-text-secondary'
            : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
    const setupLabel = setup === 'required'
        ? 'Keys required'
        : setup === 'optional'
            ? 'Optional config'
            : 'No setup';

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
                {releaseLabel}
            </div>

            <div className={`col-span-2 flex items-center gap-1 text-sm ${textSecondary} overflow-hidden flex-wrap`} title={runtimeTooltip}>
                {runtime.kind === 'unknown' ? (
                    <span className="opacity-50">—</span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                        <span className="text-xs font-medium text-text">{runtimeKindLabel}</span>
                        <span className="opacity-50 text-xs">·</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-input font-mono">
                            {runtime.detail}
                        </span>
                    </span>
                )}
            </div>

            <div className={`col-span-2 text-sm ${textSecondary} truncate`} title={setupTooltip || undefined}>
                <span className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-full font-medium ${setupChipClass}`}>
                    {setupLabel}
                </span>
            </div>

            <div className={`col-span-2 flex items-center gap-1 text-sm ${textSecondary} flex-wrap`}>
                {server.namespaceVerified && (
                    <span className="text-emerald-600 text-xs font-medium" title="Publisher namespace ownership signal. Not a security audit.">
                        Publisher verified
                    </span>
                )}
                {server.imageVerified && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-input font-mono" title="Docker image signature signal. Not a security audit.">
                        Docker signed
                    </span>
                )}
                {server.directoryVerified && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-input font-mono" title="Listed by an MCP directory source. Not a security audit.">
                        Directory listed
                    </span>
                )}
                {!hasProvenance && <span className="opacity-60 text-xs">No checks</span>}
            </div>
        </div>
    );
});
