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
import { Model } from "../../types";

/**
 * Props for the Toolbar component
 */
export interface ToolbarProps {
    isSyncing: boolean;
    syncProgress: { current: number; total: number; source?: string; found?: number; statusMessage?: string } | null;
    lastSync: string | null;
    pageItems: Model[];
    total: number;
    minDownloads: number;
    onSkipFilter?: () => void;
    pageSize: number | null;
    onPageSizeChange: (size: number | null) => void;
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalModels?: number;
    onExport: () => void;
    onDeleteDatabase: () => void;
    onValidateModels: () => void;
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
    lastSync,
    pageItems,
    total,
    minDownloads,
    onSkipFilter,
    pageSize,
    onPageSizeChange,
    page,
    totalPages,
    onPageChange,
    totalModels,
    onExport,
    onDeleteDatabase,
    onValidateModels,
    theme,
    hasDetailOpen = false,
}: ToolbarProps) {
    const { t } = useTranslation();
    const textSubtle = "text-text-secondary";
    const pageSafe = Math.max(1, Math.min(page, totalPages));

    return (
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
            {/* Left Zone - Status info (matches Filters sidebar width) */}
            <div className="w-full lg:w-48 flex-shrink-0">
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
                            {totalModels !== undefined && (
                                <span className="opacity-70">• {totalModels.toLocaleString()} models</span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Middle Zone - Spacer (above table) */}
            <div className={`flex-1 transition-all duration-300 ${hasDetailOpen ? 'lg:w-3/5' : 'w-full'}`}>
                {/* Empty spacer - maintains grid alignment */}
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
                <div className="h-4 w-px bg-border mx-1"></div>

                {/* Action buttons */}
                <button
                    onClick={onExport}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-colors border bg-bg-card border-border text-text hover:bg-bg/10"
                >
                    <DownloadIcon className="size-3" />
                    {t('toolbar.export')}
                </button>
                <button
                    onClick={onDeleteDatabase}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-colors border bg-bg-card border-border text-text hover:bg-bg/10"
                    title={t('toolbar.deleteDatabase')}
                >
                    <Trash2 className="size-3" />
                    {t('common.delete')} DB
                </button>
                <button
                    onClick={onValidateModels}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-colors border bg-bg-card border-border text-text hover:bg-bg/10"
                    title={t('toolbar.validate')}
                >
                    <ShieldCheck className="size-3" />
                    {t('toolbar.validate')}
                </button>
            </div>
        </div>
    );
}
