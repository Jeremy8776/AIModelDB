/**
 * Header Component
 * 
 * Main header bar containing search input and action buttons.
 * Provides quick access to sync, add model, import, and settings functions.
 * 
 * @module Header
 */

import React from "react";
import { Search, RefreshCw, Plus, Upload, Wrench } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Props for the Header component
 */
export interface HeaderProps {
    query: string;
    onQueryChange: (query: string) => void;
    searchRef: React.RefObject<HTMLInputElement>;
    isSyncing: boolean;
    onSync: () => void;
    onAddModel: () => void;
    onImport: () => void;
    onSettings: () => void;
    theme: "light" | "dark";
    hasUpdate?: boolean;
}

/**
 * Header component with search bar and action buttons.
 * 
 * Features:
 * - Search input with keyboard shortcut (/)
 * - Update Database button with loading state
 * - Add Model, Import, and Settings buttons
 * - Theme-aware styling
 * - Update notification dot on Settings button
 * 
 * @param props - Header component props
 * @returns JSX.Element
 */
export function Header({
    query,
    onQueryChange,
    searchRef,
    isSyncing,
    onSync,
    onAddModel,
    onImport,
    onSettings,
    theme,
    hasUpdate = false
}: HeaderProps) {
    const { t } = useTranslation();
    // Styling based on theme
    const bgHeader = theme === "dark" ? "border-zinc-900/80 bg-black/80" : "border-gray-400 bg-white shadow-sm";
    const bgInput = theme === "dark"
        ? "border-zinc-700 bg-zinc-900/70 text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus-within:ring-2 focus-within:ring-violet-500 focus-within:border-transparent transition-all"
        : "border-gray-500 bg-white text-black placeholder:text-gray-700 focus:outline-none focus-within:ring-2 focus-within:ring-violet-500 focus-within:border-transparent transition-all";

    return (
        <header className={`app-header relative z-10 ${bgHeader} border-b`}>
            <div className="flex w-full items-center justify-between gap-3 px-4 py-2">
                <div className={`flex w-full max-w-md items-center gap-2 rounded-xl px-3 py-2 border transition-all ${theme === 'dark'
                    ? 'bg-zinc-900/70 border-zinc-700 text-zinc-100 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent'
                    : 'bg-white border-gray-500 text-black focus-within:border-accent focus-within:ring-1 focus-within:ring-accent'
                    }`}>
                    <Search className="size-4 opacity-50 flex-shrink-0" />
                    <input
                        ref={searchRef}
                        value={query}
                        onChange={e => onQueryChange(e.target.value)}
                        placeholder={t('header.searchPlaceholder')}
                        className="w-full h-full !bg-transparent text-sm search-input-reset shadow-none appearance-none placeholder:opacity-70"
                    />
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                        id="header-update-db-btn"
                        onClick={onSync}
                        disabled={isSyncing}
                        className="header-action-btn inline-flex items-center gap-2 rounded-xl px-4 h-10 text-sm font-semibold bg-accent hover:bg-accent-dark hover:text-white disabled:opacity-60"
                        title={t('header.syncModels')}
                    >
                        <RefreshCw className={`size-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        <span>{t('header.syncModels')}</span>
                    </button>
                    <button
                        onClick={onAddModel}
                        className="header-action-btn rounded-xl h-10 w-10 flex items-center justify-center border"
                        style={{
                            backgroundColor: 'var(--bgCard)',
                            borderColor: 'var(--border)',
                            color: 'var(--text)'
                        }}
                        title={t('header.addModel')}
                    >
                        <Plus className="size-4" />
                    </button>
                    <button
                        onClick={onImport}
                        className="header-action-btn rounded-xl h-10 w-10 flex items-center justify-center border"
                        style={{
                            backgroundColor: 'var(--bgCard)',
                            borderColor: 'var(--border)',
                            color: 'var(--text)'
                        }}
                        title={t('header.importModels')}
                    >
                        <Upload className="size-4" />
                    </button>
                    <button
                        onClick={onSettings}
                        className="header-action-btn rounded-xl h-10 w-10 flex items-center justify-center border relative"
                        style={{
                            backgroundColor: 'var(--bgCard)',
                            borderColor: 'var(--border)',
                            color: 'var(--text)'
                        }}
                        title={t('header.openSettings')}
                    >
                        <Wrench className="size-4" />
                        {hasUpdate && (
                            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black animate-pulse" />
                        )}
                    </button>
                </div>
            </div>
        </header>
    );
}


