/**
 * Toolbar Component
 * 
 * Status bar and controls for pagination, export, and database operations.
 * Three-column layout matching Filters | Table | Details structure.
 * 
 * @module Toolbar
 */

import React from "react";
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
 * Toolbar component with 3-column layout matching main content areas.
 * Left: Status info (above filters)
 * Middle: Spacer (above table)
 * Right: Pagination + Action buttons (above detail panel / end of table)
 */
export function Toolbar({
    isSyncing,
    syncProgress,
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

    return (
        // Zones mirror the MainLayout columns below (sidebar | table | detail) so the
        // toolbar is balanced: status aligns over the filters sidebar (w-72), and the
        // pagination/actions sit at the TABLE's right edge — not the page edge / over
        // the detail panel. gap-5 matches MainLayout's column gap.
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 w-full">
            {/* Left Zone - Status, aligned to the filters sidebar width (w-72) */}
            <div className="w-full lg:w-72 flex-shrink-0 flex items-center">
                <div className={`text-xs ${textSubtle} space-y-0.5`}>
                    {isSyncing ? (
                        <div className="flex items-center gap-2">
                            <RefreshCw className="size-3 animate-spin text-violet-500" />
                            <span className="truncate">
                                {syncProgress?.statusMessage || 'Syncing...'}
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                            <span>Idle</span>
                            {totalItems !== undefined && (
                                <span className="opacity-70">• {totalItems.toLocaleString()} {itemLabel}</span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Middle Zone - Pagination + actions, right-aligned to the table's right edge */}
            <div className={`flex-1 flex items-center min-w-0 transition-all duration-300 ${hasDetailOpen ? 'lg:w-3/5' : 'w-full'}`}>
                <div className="flex items-center justify-end gap-2 w-full ml-auto flex-wrap">
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
                        {t('toolbar.export')}
                    </button>
                )}
                {onDeleteDatabase && (
                    <button
                        onClick={onDeleteDatabase}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-colors border bg-bg-card border-border text-text hover:bg-bg/10"
                        title={t('toolbar.deleteDatabase')}
                    >
                        <Trash2 className="size-3" />
                        {t('common.delete')} DB
                    </button>
                )}
                {onValidateModels && (
                    <button
                        onClick={onValidateModels}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-colors border bg-bg-card border-border text-text hover:bg-bg/10"
                        title={t('toolbar.validate')}
                    >
                        <ShieldCheck className="size-3" />
                        {t('toolbar.validate')}
                    </button>
                )}
                </div>
            </div>

            {/* Right Zone - empty spacer over the detail panel so the pagination/actions
                stay anchored to the table's right edge instead of drifting over the panel. */}
            {hasDetailOpen && <div className="hidden lg:block lg:w-2/5 flex-shrink-0" />}
        </div>
    );
}
