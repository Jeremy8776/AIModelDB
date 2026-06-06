/**
 * Toolbar Component
 * 
 * Status bar and controls for pagination, export, and database operations.
 * Three-column layout matching Filters | Table | Details structure.
 * 
 * @module Toolbar
 */

import React, { useEffect, useState } from "react";
import { RefreshCw, ChevronLeft, ChevronRight, Download as DownloadIcon, Trash2, ShieldCheck } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { ThemedSelect } from "../ThemedSelect";

/**
 * Props for the Toolbar component.
 *
 * Entity-agnostic: the same toolbar serves Models, MCP servers, and (later)
 * Skills. Action buttons that don't apply to a given entity are simply
 * omitted by not passing their handler (e.g. MCP has no "Validate").
 */
export interface ToolbarProps {
    isSyncing: boolean;
    syncProgress: { current: number; total: number; source?: string; found?: number; statusMessage?: string } | null;
    lastSync?: string | null;
    pageSize: number | null;
    onPageSizeChange: (size: number | null) => void;
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    /** Total item count shown in the left status zone. */
    totalItems?: number;
    /** Noun for the count, e.g. "models" or "servers". Defaults to "models". */
    itemLabel?: string;
    /** Action handlers — buttons render only when their handler is provided. */
    onExport?: () => void;
    onDeleteDatabase?: () => void;
    onValidateModels?: () => void;
    theme: "light" | "dark";
    hasDetailOpen?: boolean;
}

/**
 * Compact relative time for the "Synced …" status line.
 * Returns null when the ISO string isn't a valid date so the caller can omit
 * the trailing label rather than render "Synced " with a dangling space.
 */
function formatRelativeTime(iso: string, now: number): string | null {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return null;
    const diffMs = now - then;
    const m = Math.floor(diffMs / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    return new Date(iso).toLocaleDateString();
}

/**
 * Re-render the toolbar every 30s while idle so "Synced 5m ago" actually
 * advances. We tick `Date.now()` into local state and pass it explicitly into
 * formatRelativeTime — keeps the function pure for tests.
 */
function useTickEvery(intervalMs: number, enabled: boolean): number {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!enabled) return;
        const id = setInterval(() => setNow(Date.now()), intervalMs);
        return () => clearInterval(id);
    }, [intervalMs, enabled]);
    return now;
}

/**
 * Toolbar component with 3-column layout matching main content areas.
 * Left: Status info (above filters)
 * Middle: Spacer (above table)
 * Right: Pagination + Action buttons (above detail panel / end of table)
 */
export function Toolbar({
    isSyncing,
    syncProgress,
    lastSync,
    pageSize,
    onPageSizeChange,
    page,
    totalPages,
    onPageChange,
    totalItems,
    itemLabel = 'models',
    onExport,
    onDeleteDatabase,
    onValidateModels,
    hasDetailOpen = false,
}: ToolbarProps) {
    const { t } = useTranslation();
    const textSubtle = "text-text-secondary";
    const pageSafe = Math.max(1, Math.min(page, totalPages));

    // Tick once a minute while idle so the "Synced 5m ago" label advances
    // without an unrelated re-render. Disabled while syncing (the sync row
    // doesn't show relative time) and when there's no lastSync to format.
    const now = useTickEvery(60_000, !isSyncing && !!lastSync);
    const relSynced = lastSync ? formatRelativeTime(lastSync, now) : null;

    // Progress fraction across sources (when the entity reports a total).
    const sourceProgress = syncProgress && syncProgress.total > 0
        ? `${syncProgress.current}/${syncProgress.total}`
        : null;

    return (
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
            {/* Left Zone - Status info (slightly narrower than Filters sidebar) */}
            <div className="w-full lg:w-64 flex-shrink-0 min-w-0">
                <div className={`text-xs ${textSubtle} leading-tight space-y-0.5`}>
                    {isSyncing ? (
                        <div
                            className="flex items-center gap-1.5 min-w-0"
                            title={[
                                t('toolbar.syncing', { defaultValue: 'Syncing' }),
                                syncProgress?.source,
                                syncProgress?.statusMessage,
                                sourceProgress,
                            ].filter(Boolean).join(' · ')}
                        >
                            <RefreshCw className="size-3 animate-spin text-accent flex-shrink-0" />
                            <span className="font-medium text-text truncate">
                                {syncProgress?.source || t('toolbar.syncing', { defaultValue: 'Syncing' })}
                            </span>
                            {syncProgress?.statusMessage && (
                                <>
                                    <span className="opacity-40 flex-shrink-0">·</span>
                                    <span className="opacity-70 truncate">{syncProgress.statusMessage}</span>
                                </>
                            )}
                            {sourceProgress && (
                                <span className="opacity-70 tabular-nums flex-shrink-0">{sourceProgress}</span>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                <span>{t('toolbar.idle', { defaultValue: 'Idle' })}</span>
                                {totalItems !== undefined && (
                                    <span className="opacity-70">• {totalItems.toLocaleString()} {itemLabel}</span>
                                )}
                            </div>
                            <div
                                className="pl-3 opacity-60 truncate"
                                title={lastSync && relSynced ? new Date(lastSync).toLocaleString() : undefined}
                            >
                                {relSynced
                                    ? `${t('toolbar.synced', { defaultValue: 'Synced' })} ${relSynced}`
                                    : t('toolbar.neverSynced', { defaultValue: 'Not synced yet' })}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Middle Zone - Spacer (above table); entity tabs render inside MainLayout content */}
            <div className={`flex-1 transition-all duration-300 ${hasDetailOpen ? 'lg:w-3/5' : 'w-full'}`}>
                {/* Intentionally empty - tabs sit flush atop the content card below */}
            </div>

            {/* Right Zone - Pagination + Action buttons */}
            <div className={`flex items-center justify-end gap-2 ml-auto ${hasDetailOpen ? 'lg:w-2/5' : ''}`}>
                {/* Pagination */}
                <label className="text-xs text-text">{t('toolbar.pageSize')}</label>
                <div className="min-w-[80px]">
                    <ThemedSelect
                        value={(pageSize ?? 0).toString()}
                        onChange={(v) => {
                            if (v === '0') {
                                onPageSizeChange(null);
                            } else {
                                onPageSizeChange(Number(v));
                            }
                        }}
                        options={[
                            { value: '50', label: '50' },
                            { value: '100', label: '100' },
                            { value: '500', label: '500' },
                            { value: '0', label: t('common.all') }
                        ]}
                        ariaLabel={t('toolbar.pageSize')}
                    />
                </div>
                <button
                    disabled={pageSafe <= 1}
                    onClick={() => onPageChange(Math.max(1, page - 1))}
                    className="rounded-lg px-1.5 py-1 disabled:opacity-40 border bg-bg-card border-border text-text"
                >
                    <ChevronLeft className="size-4" />
                </button>
                <span className={`text-xs ${textSubtle} tabular-nums`}>{pageSafe} / {totalPages}</span>
                <button
                    disabled={pageSafe >= totalPages}
                    onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                    className="rounded-lg px-1.5 py-1 disabled:opacity-40 border bg-bg-card border-border text-text"
                >
                    <ChevronRight className="size-4" />
                </button>

                {/* Separator */}
                {(onExport || onDeleteDatabase || onValidateModels) && (
                    <div className="h-4 w-px bg-border mx-1"></div>
                )}

                {/* Action buttons — each renders only if its handler is provided */}
                {onExport && (
                    <button
                        onClick={onExport}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-colors border bg-bg-card border-border text-text hover:bg-bg/10"
                    >
                        <DownloadIcon className="size-3" />
                        Export All
                    </button>
                )}
                {onDeleteDatabase && (
                    <button
                        onClick={onDeleteDatabase}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-colors border bg-bg-card border-border text-text hover:bg-bg/10"
                        title={t('toolbar.deleteDatabase', { defaultValue: 'Delete all local database data' })}
                    >
                        <Trash2 className="size-3" />
                        Delete All
                    </button>
                )}
                {onValidateModels && (
                    <button
                        onClick={onValidateModels}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-colors border bg-bg-card border-border text-text hover:bg-bg/10"
                        title={t('toolbar.validate', { defaultValue: 'Validate the database' })}
                    >
                        <ShieldCheck className="size-3" />
                        Validate All
                    </button>
                )}
            </div>
        </div>
    );
}
