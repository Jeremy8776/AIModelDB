/**
 * Toolbar Component
 * 
 * Status bar and controls for pagination, export, and database operations.
 * Displays sync status, last update time, and provides access to export and validation.
 * 
 * @module Toolbar
 */

import React from "react";
import { RefreshCw, ChevronLeft, ChevronRight, Download as DownloadIcon, Trash2, ShieldCheck } from "lucide-react";
import { ThemedSelect } from "../ThemedSelect";
import { Model } from "../../types";
import { ExportFormat } from "../../services/exportService";

/**
 * Props for the Toolbar component
 */
export interface ToolbarProps {
    isSyncing: boolean;
    syncProgress: { current: number; total: number; source?: string; found?: number; statusMessage?: string; eta?: string } | null;
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
}

/**
 * Toolbar component with status, pagination, and action controls.
 * 
 * Features:
 * - Sync status indicator with progress bar
 * - Last update timestamp
 * - Model count display
 * - Pagination controls (per page, prev/next)
 * - Export dropdown (JSON, CSV, TSV, YAML, XML, Markdown)
 * - Delete database button
 * - Validate models button
 * - Theme-aware styling
 * 
 * @param props - Toolbar component props
 * @returns JSX.Element
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
}: ToolbarProps) {
    // Styling based on theme
    const textSubtle = theme === "dark" ? "text-zinc-400" : "text-gray-800";
    const bgInput = theme === "dark"
        ? "border-zinc-700 bg-zinc-900/70 text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
        : "border-gray-500 bg-white text-black placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500";

    // Ensure page is within valid range
    const pageSafe = Math.max(1, Math.min(page, totalPages));

    return (
        <div className={`flex flex-wrap items-center justify-between gap-2 text-sm ${textSubtle}`}>
            <div className="flex items-center gap-3">
                {isSyncing ? (
                    <div className="flex items-center gap-3">
                        <RefreshCw className="size-4 animate-spin text-violet-500" />
                        {syncProgress ? (
                            <div className="flex items-center gap-3">
                                <span className="text-xs max-w-[400px] truncate">
                                    {syncProgress.statusMessage || syncProgress.source || 'Syncing...'}
                                </span>
                                {syncProgress.found !== undefined && syncProgress.found > 0 && (
                                    <span className="text-xs text-green-500 font-medium whitespace-nowrap">
                                        +{syncProgress.found} models
                                    </span>
                                )}
                                {syncProgress.eta && (
                                    <span className="text-xs opacity-60 whitespace-nowrap">
                                        ETA: {syncProgress.eta}
                                    </span>
                                )}
                                {/* Show skip button during long operations */}
                                {onSkipFilter && syncProgress.statusMessage &&
                                    (syncProgress.statusMessage.toLowerCase().includes('nsfw') ||
                                        syncProgress.statusMessage.toLowerCase().includes('filter') ||
                                        syncProgress.statusMessage.toLowerCase().includes('llm') ||
                                        syncProgress.statusMessage.toLowerCase().includes('translation') ||
                                        syncProgress.statusMessage.toLowerCase().includes('corporate')) && (
                                        <button
                                            onClick={onSkipFilter}
                                            className="text-xs px-2 py-0.5 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 hover:text-white transition-colors whitespace-nowrap"
                                        >
                                            Skip
                                        </button>
                                    )}
                            </div>
                        ) : (
                            <span className="text-xs">Syncing…</span>
                        )}
                    </div>
                ) : (
                    <>
                        <span className="inline-flex items-center gap-1">Idle</span>
                        {lastSync && (
                            <span>
                                Updated: {new Date(lastSync).toLocaleDateString()} {new Date(lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                        <span>Showing {pageItems.length} of {total} (web ≥{minDownloads} <DownloadIcon className="inline h-3 w-3 relative" style={{ top: '-1px' }} />; imports bypass)</span>
                    </>
                )}
            </div>
            <div className="flex items-center gap-2">
                <label className="mr-1" style={{ color: 'var(--text)' }}>Per page</label>
                <div className="min-w-[120px]">
                    <ThemedSelect
                        value={(pageSize ?? 0).toString()}
                        onChange={(v) => {
                            if (v === '0') {
                                onPageSizeChange(null);
                            } else {
                                onPageSizeChange(Number(v));
                            }
                        }}
                        options={[{ value: '50', label: '50' }, { value: '100', label: '100' }, { value: '500', label: '500' }, { value: '0', label: 'All' }]}
                        ariaLabel="Per page"
                    />
                </div>
                <button
                    disabled={pageSafe <= 1}
                    onClick={() => onPageChange(Math.max(1, page - 1))}
                    className="rounded-xl px-2 py-1 disabled:opacity-50 border"
                    style={{
                        backgroundColor: 'var(--bgCard)',
                        borderColor: 'var(--border)',
                        color: 'var(--text)'
                    }}
                    title="Prev"
                >
                    <ChevronLeft className="size-4" />
                </button>
                <span>{pageSafe} / {totalPages}</span>
                <button
                    disabled={pageSafe >= totalPages}
                    onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                    className="rounded-xl px-2 py-1 disabled:opacity-50 border"
                    style={{
                        backgroundColor: 'var(--bgCard)',
                        borderColor: 'var(--border)',
                        color: 'var(--text)'
                    }}
                    title="Next"
                >
                    <ChevronRight className="size-4" />
                </button>
                <button
                    onClick={onExport}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs ml-2 transition-colors border"
                    style={{
                        backgroundColor: 'var(--bgCard)',
                        borderColor: 'var(--border)',
                        color: 'var(--text)'
                    }}
                >
                    <DownloadIcon className="size-3" />
                    Export
                </button>
                <div className="flex items-center gap-2 ml-2">
                    <button
                        onClick={onDeleteDatabase}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-colors border"
                        style={{
                            backgroundColor: 'var(--bgCard)',
                            borderColor: 'var(--border)',
                            color: 'var(--text)'
                        }}
                        title="Delete DB"
                    >
                        <Trash2 className="size-3" />Delete DB
                    </button>
                </div>
                <button
                    onClick={onValidateModels}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs ml-2 transition-colors border"
                    style={{
                        backgroundColor: 'var(--bgCard)',
                        borderColor: 'var(--border)',
                        color: 'var(--text)'
                    }}
                    title="Validate and enrich model data using LLMs"
                >
                    <ShieldCheck className="size-3" />Validate Models
                </button>
            </div>
        </div>
    );
}
