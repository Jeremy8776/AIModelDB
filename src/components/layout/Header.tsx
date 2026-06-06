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
import { SearchSuggestion } from "../../utils/searchSuggestions";

/**
 * Props for the Header component
 */
export interface HeaderProps {
    query: string;
    onQueryChange: (query: string) => void;
    searchRef: React.RefObject<HTMLInputElement>;
    searchPlaceholder?: string;
    searchSuggestions?: SearchSuggestion[];
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
    searchPlaceholder,
    searchSuggestions = [],
    isSyncing,
    onSync,
    onAddModel,
    onImport,
    onSettings,
    theme,
    hasUpdate = false
}: HeaderProps) {
    const { t } = useTranslation();
    const [showSuggestions, setShowSuggestions] = React.useState(false);
    // Styling based on theme
    const bgHeader = "border-border bg-bg/80 backdrop-blur-md";
    const bgInput = "border-border bg-bg-input text-text placeholder:text-text-secondary focus-within:ring-2 focus-within:ring-accent focus-within:border-transparent transition-all";

    return (
        <header className={`app-header relative z-10 ${bgHeader} border-b`}>
            <div className="flex w-full items-center justify-between gap-3 px-4 py-2">
                <div className="relative w-full max-w-md">
                    <div className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 border transition-all ${bgInput}`}>
                    <Search className="size-4 opacity-50 flex-shrink-0" />
                    <input
                        ref={searchRef}
                        value={query}
                        onChange={e => onQueryChange(e.target.value)}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => window.setTimeout(() => setShowSuggestions(false), 120)}
                        placeholder={searchPlaceholder || t('header.searchPlaceholder')}
                        className="w-full h-full !bg-transparent text-sm search-input-reset shadow-none appearance-none placeholder:opacity-70"
                    />
                    </div>
                    {showSuggestions && searchSuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 overflow-hidden rounded-lg border border-border bg-bg-card shadow-xl">
                            <div className="max-h-80 overflow-y-auto py-1">
                                {searchSuggestions.map((suggestion, index) => (
                                    <button
                                        key={`${suggestion.kind}-${suggestion.entity || 'hint'}-${suggestion.value}-${index}`}
                                        type="button"
                                        onMouseDown={(event) => event.preventDefault()}
                                        onClick={() => {
                                            onQueryChange(suggestion.value);
                                            setShowSuggestions(false);
                                            searchRef.current?.focus();
                                        }}
                                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-text hover:bg-bg/70"
                                    >
                                        <span className="min-w-0">
                                            <span className="block truncate font-medium">{suggestion.label}</span>
                                            {suggestion.detail && (
                                                <span className="block truncate text-xs text-text-secondary">{suggestion.detail}</span>
                                            )}
                                        </span>
                                        <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-normal text-text-secondary">
                                            {suggestion.kind === 'hint' ? 'Hint' : suggestion.entity}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
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
                        className="header-action-btn rounded-xl h-10 w-10 flex items-center justify-center border relative bg-bg-card border-border text-text"
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


