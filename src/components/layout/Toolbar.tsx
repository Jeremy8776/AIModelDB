/**
 * Toolbar Component
 * 
 * Status bar and controls for pagination, export, and database operations.
 * Displays sync status, last update time, and provides access to export and validation.
 * 
 * @module Toolbar
 */

import React from "react";
import { RefreshCw, ChevronLeft, ChevronRight, Download as DownloadIcon, DatabaseZap } from "lucide-react";
import { ThemedSelect } from "../ThemedSelect";
import { Model } from "../../types";
import { ExportFormat } from "../../services/exportService";

/**
 * Props for the Toolbar component
 */
export interface ToolbarProps {
    isSyncing: boolean;
    syncProgress: { current: number; total: number; source?: string; found?: number } | null;
    lastSync: string | null;
    pageItems: Model[];
    total: number;
    minDownloads: number;
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
    pageSize,
    onPageSizeChange,
    page,
    totalPages,
    onPageChange,
    totalModels,
    onExport,
    onDeleteDatabase,
    onValidateModels,
    theme
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
                    <div className="flex items-center gap-2">
                        <RefreshCw className="size-4 animate-spin" />
                        {syncProgress ? (
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <span className="whitespace-nowrap">
                                        <span className="text-violet-500 font-medium">{syncProgress.current}/{syncProgress.total}</span>
                                        {syncProgress.source && (
                                            <span className="ml-2 text-xs opacity-75">
                                                {syncProgress.source}
                                                {syncProgress.found !== undefined && syncProgress.found > 0 && (
                                                    <span className="ml-1 text-green-500">+{syncProgress.found}</span>
                                                )}
                                            </span>
                                        )}
                                    </span>
                                </div>
                                <div className="h-1.5 w-48 bg-zinc-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-violet-500 rounded-full transition-all duration-300"
                                        style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <span>Syncing…</span>
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
                    className={`rounded-xl ${bgInput} px-2 py-1 disabled:opacity-50`}
                    title="Prev"
                >
                    <ChevronLeft className="size-4" />
                </button>
                <span>{pageSafe} / {totalPages}</span>
                <button
                    disabled={pageSafe >= totalPages}
                    onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                    className={`rounded-xl ${bgInput} px-2 py-1 disabled:opacity-50`}
                    title="Next"
                >
                    <ChevronRight className="size-4" />
                </button>
                <button
                    onClick={onExport}
                    className={`inline-flex items-center gap-1 rounded-lg ${bgInput} px-2 py-1 text-xs ml-2 hover:bg-violet-600 hover:text-white hover:border-violet-600 transition-colors`}
                >
                    <DownloadIcon className="size-3" />
                    Export
                </button>
                <div className="flex items-center gap-2 ml-2">
                    <button
                        onClick={onDeleteDatabase}
                        className={`inline-flex items-center gap-1 rounded-lg ${bgInput} px-2 py-1 text-xs`}
                        title="Delete DB"
                    >
                        <DatabaseZap className="size-3" />Delete DB
                    </button>
                </div>
                <button
                    onClick={onValidateModels}
                    className={`inline-flex items-center gap-1 rounded-lg ${bgInput} px-2 py-1 text-xs ml-2`}
                    title="Validate and enrich model data using LLMs"
                >
                    <DatabaseZap className="size-3" />Validate Models
                </button>
            </div>
        </div>
    );
}
