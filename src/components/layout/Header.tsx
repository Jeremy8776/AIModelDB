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
}

/**
 * Header component with search bar and action buttons.
 * 
 * Features:
 * - Search input with keyboard shortcut (/)
 * - Update Database button with loading state
 * - Add Model, Import, and Settings buttons
 * - Theme-aware styling
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
    theme
}: HeaderProps) {
    // Styling based on theme
    const bgHeader = theme === "dark" ? "border-zinc-900/80 bg-black/80" : "border-gray-400 bg-white shadow-sm";
    const bgInput = theme === "dark"
        ? "border-zinc-700 bg-zinc-900/70 text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus-within:ring-2 focus-within:ring-violet-500 focus-within:border-transparent transition-all"
        : "border-gray-500 bg-white text-black placeholder:text-gray-700 focus:outline-none focus-within:ring-2 focus-within:ring-violet-500 focus-within:border-transparent transition-all";

    return (
        <header className={`app-header relative z-10 ${bgHeader} border-b`}>
            <div className="flex w-full items-center justify-between gap-3 px-4 py-3">
                <div className={`flex w-full max-w-xl items-center gap-2 rounded-2xl px-3 py-2 border transition-all ${theme === 'dark'
                    ? 'bg-zinc-900/70 border-zinc-700 text-zinc-100 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent'
                    : 'bg-white border-gray-500 text-black focus-within:border-accent focus-within:ring-1 focus-within:ring-accent'
                    }`}>
                    <Search className="size-4 opacity-50" />
                    <input
                        ref={searchRef}
                        value={query}
                        onChange={e => onQueryChange(e.target.value)}
                        placeholder="Search models, providers, licenses… (/ to focus)"
                        className="w-full h-full bg-transparent text-sm search-input-reset shadow-none appearance-none placeholder:opacity-70"
                    />
                </div>
                <div className="flex items-center gap-1 ml-auto">
                    <button
                        id="header-update-db-btn"
                        onClick={onSync}
                        disabled={isSyncing}
                        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold bg-accent hover:bg-accent-dark hover:text-white disabled:opacity-60`}
                        title="Update Database"
                    >
                        <RefreshCw className={`size-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        <span>Update Database</span>
                    </button>
                    <button
                        onClick={onAddModel}
                        className={`rounded-xl ${bgInput} p-2`}
                        title="Add Model"
                    >
                        <Plus className="size-4" />
                    </button>
                    <button
                        onClick={onImport}
                        className={`rounded-xl ${bgInput} p-2`}
                        title="Import data"
                    >
                        <Upload className="size-4" />
                    </button>
                    <button
                        onClick={onSettings}
                        className={`rounded-xl ${bgInput} p-2`}
                        title="Settings"
                    >
                        <Wrench className="size-4" />
                    </button>
                </div>
            </div>
        </header>
    );
}
