/**
 * Main Layout Component
 * 
 * Primary layout component that composes the filters sidebar, model table,
 * and detail panel. Handles empty states and loading states.
 * 
 * @module MainLayout
 */

import React from 'react';
import { Model, Domain } from '../../types';
import { SortKey, LicenseType } from '../../hooks/useUIState';
import { FiltersSidebar } from './FiltersSidebar';
import { ModelTable } from '../table/ModelTable';
import { DetailPanel } from '../DetailPanel';
import { SkeletonRow } from '../ModelRow';
import { DatabaseZap, Plus } from 'lucide-react';

/**
 * Props for the MainLayout component
 */
export interface MainLayoutProps {
    // Filter state
    domainPick: Domain | 'All';
    onDomainChange: (domain: Domain | 'All') => void;
    minDownloads: number;
    onMinDownloadsChange: (min: number) => void;
    licenseTypes: LicenseType[];
    onLicenseTypesChange: (types: LicenseType[]) => void;
    commercialAllowed: boolean | null;
    onCommercialAllowedChange: (allowed: boolean | null) => void;
    includeTags: string[];
    onIncludeTagsChange: (tags: string[]) => void;
    excludeTags: string[];
    onExcludeTagsChange: (tags: string[]) => void;
    onClearFilters: () => void;

    // Table state
    models: Model[];
    sortKey: SortKey;
    sortDirection: 'asc' | 'desc';
    onSortChange: (key: SortKey, direction: 'asc' | 'desc') => void;
    onModelOpen: (model: Model, element: HTMLElement) => void;
    hasMore: boolean;
    sentinelRef: React.RefObject<HTMLDivElement>;
    displayCount: number;
    totalCount: number;

    // Detail panel state
    openModel: Model | null;
    onCloseDetail: () => void;
    onDeleteModel: (id: string) => void;
    triggerElement: HTMLElement | null;

    // Loading and empty states
    isSyncing: boolean;
    filteredCount: number;

    // Actions for empty state
    onShowOnboarding: () => void;
    onShowImport: () => void;

    // Theme
    theme: 'light' | 'dark';
}

/**
 * Main layout component composing filters, table, and detail panel.
 * 
 * Features:
 * - Three-column layout (filters, table, detail panel)
 * - Responsive design (stacks on mobile)
 * - Empty state with onboarding prompt
 * - Loading state with skeleton rows
 * - Smooth transitions when detail panel opens/closes
 * - Theme-aware styling
 * 
 * @param props - MainLayout component props
 * @returns JSX.Element
 */
export function MainLayout({
    domainPick,
    onDomainChange,
    minDownloads,
    onMinDownloadsChange,
    licenseTypes,
    onLicenseTypesChange,
    commercialAllowed,
    onCommercialAllowedChange,
    includeTags,
    onIncludeTagsChange,
    excludeTags,
    onExcludeTagsChange,
    onClearFilters,
    models,
    sortKey,
    sortDirection,
    onSortChange,
    onModelOpen,
    hasMore,
    sentinelRef,
    displayCount,
    totalCount,
    openModel,
    onCloseDetail,
    onDeleteModel,
    triggerElement,
    isSyncing,
    filteredCount,
    onShowOnboarding,
    onShowImport,
    theme
}: MainLayoutProps) {
    // Styling based on theme
    const bgCard = theme === 'dark' ? 'border-zinc-800 bg-black' : 'border-gray-400 bg-white shadow-sm';
    const bgInput = theme === 'dark'
        ? 'border-zinc-700 bg-zinc-900/70 text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500'
        : 'border-gray-500 bg-white text-black placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500';

    return (
        <main className="w-full px-4 pb-4">
            <div className="flex flex-col lg:flex-row gap-5">
                {/* Left Filters Panel */}
                <FiltersSidebar
                    domainPick={domainPick}
                    onDomainChange={onDomainChange}
                    minDownloads={minDownloads}
                    onMinDownloadsChange={onMinDownloadsChange}
                    licenseTypes={licenseTypes}
                    onLicenseTypesChange={onLicenseTypesChange}
                    commercialAllowed={commercialAllowed}
                    onCommercialAllowedChange={onCommercialAllowedChange}
                    includeTags={includeTags}
                    onIncludeTagsChange={onIncludeTagsChange}
                    excludeTags={excludeTags}
                    onExcludeTagsChange={onExcludeTagsChange}
                    onClearFilters={onClearFilters}
                    theme={theme}
                />

                {/* Main Table */}
                <div className={`flex-1 transition-all duration-500 ease-out ${openModel ? 'lg:w-3/5' : 'w-full'}`}>
                    {isSyncing && filteredCount === 0 ? (
                        <div className="space-y-2">
                            {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
                        </div>
                    ) : filteredCount === 0 ? (
                        <div className={`mt-16 rounded-2xl border p-10 text-center ${bgCard}`}>
                            <DatabaseZap size={64} className="mx-auto mb-4 text-zinc-600" />
                            <h3 className="text-xl font-semibold mb-2">Welcome to Model Database</h3>
                            <p className="text-zinc-500 mb-6">Get started by adding models from various data sources</p>
                            <div className="mt-4 flex justify-center gap-2">
                                <button
                                    onClick={onShowOnboarding}
                                    className="rounded-xl px-6 py-3 text-sm font-semibold bg-accent hover:bg-accent-dark text-white flex items-center gap-2"
                                    title="Set up data sources"
                                >
                                    <Plus size={16} />
                                    Add Models
                                </button>
                                <button
                                    onClick={onShowImport}
                                    className={`rounded-xl ${bgInput} px-4 py-2 text-sm`}
                                    title="Import models from file"
                                >
                                    Import from File
                                </button>
                            </div>
                        </div>
                    ) : (
                        <ModelTable
                            models={models}
                            sortKey={sortKey}
                            sortDirection={sortDirection}
                            onSortChange={onSortChange}
                            onModelOpen={onModelOpen}
                            hasMore={hasMore}
                            sentinelRef={sentinelRef}
                            displayCount={displayCount}
                            totalCount={totalCount}
                            theme={theme}
                        />
                    )}
                </div>

                {/* Detail Panel */}
                {openModel && (
                    <div className="lg:w-2/5 relative transition-all duration-500 ease-out">
                        <DetailPanel
                            model={openModel}
                            onClose={onCloseDetail}
                            onDelete={onDeleteModel}
                            triggerElement={triggerElement}
                        />
                    </div>
                )}
            </div>
        </main>
    );
}
