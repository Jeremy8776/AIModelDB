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
import { Trash2, Download, X } from 'lucide-react';
import { ComparisonView } from '../ComparisonView';
import { ErrorBoundary } from '../ErrorBoundary';
import { EmptyState } from '../EmptyState';


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
    favoritesOnly: boolean;
    onFavoritesOnlyChange: (enabled: boolean) => void;
    hideFlagged: boolean;
    onHideFlaggedChange: (enabled: boolean) => void;
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

    // Bulk Actions
    selectedIds?: Set<string>;
    onSelect?: (model: Model, selected: boolean) => void;
    onSelectAll?: (selected: boolean) => void;
    onBulkDelete?: () => void;
    onBulkExport?: () => void;
    onToggleFavorite?: (model: Model) => void;
    onToggleNSFWFlag?: (model: Model) => void;
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
 * - Bulk actions toolbar
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
    favoritesOnly,
    onFavoritesOnlyChange,
    hideFlagged,
    onHideFlaggedChange,
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
    theme,
    selectedIds,
    onSelect,
    onSelectAll,
    onBulkDelete,
    onBulkExport,
    onToggleFavorite,
    onToggleNSFWFlag
}: MainLayoutProps) {
    // Styling based on theme
    const bgCard = theme === 'dark' ? 'border-zinc-800 bg-black' : 'border-gray-400 bg-white shadow-sm';
    const bgInput = theme === 'dark'
        ? 'border-zinc-700 bg-zinc-900/70 text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500'
        : 'border-gray-500 bg-white text-black placeholder:text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500';

    // Bulk Actions Toolbar
    const hasSelection = selectedIds && selectedIds.size > 0;
    const floatingBarBg = theme === 'dark' ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-gray-200 text-gray-800 shadow-lg';

    // Comparison State
    const [isComparing, setIsComparing] = React.useState(false);

    // Get full model objects for selection
    const selectedModels = React.useMemo(() => {
        if (!selectedIds) return [];
        return models.filter(m => selectedIds.has(m.id));
    }, [models, selectedIds]);

    const canCompare = selectedModels.length >= 2 && selectedModels.length <= 4;

    return (
        <main className="w-full px-4 pb-4">
            <div className="flex flex-col lg:flex-row gap-5">
                {/* Left Filters Panel */}
                <ErrorBoundary name="Filters">
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
                        favoritesOnly={favoritesOnly}
                        onFavoritesOnlyChange={onFavoritesOnlyChange}
                        hideFlagged={hideFlagged}
                        onHideFlaggedChange={onHideFlaggedChange}
                        onClearFilters={onClearFilters}
                        theme={theme}
                    />
                </ErrorBoundary>

                {/* Main Table */}
                <div className={`flex-1 transition-all duration-500 ease-out pl-0 relative ${openModel ? 'lg:w-3/5' : 'w-full'}`}>
                    <ErrorBoundary name="Model Table">
                        {isSyncing && filteredCount === 0 ? (
                            <div className="space-y-2">
                                {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
                            </div>
                        ) : filteredCount === 0 ? (
                            <EmptyState
                                onSetupSources={onShowOnboarding}
                                onImport={onShowImport}
                            />
                        ) : (
                            <>

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
                                    selectedIds={selectedIds}
                                    onSelect={onSelect}
                                    onSelectAll={onSelectAll}
                                    onToggleFavorite={onToggleFavorite}
                                    onToggleNSFWFlag={onToggleNSFWFlag}
                                    activeModelId={openModel?.id}
                                />

                                {/* Floating Bulk Actions Toolbar */}
                                <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${hasSelection ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
                                    <div className={`flex items-center gap-4 px-6 py-3 rounded-full border ${floatingBarBg}`}>
                                        <span className="font-medium text-sm whitespace-nowrap px-2">
                                            {selectedIds?.size} selected
                                        </span>

                                        {canCompare && (
                                            <>
                                                <div className="h-4 w-px bg-current opacity-20"></div>
                                                <button
                                                    onClick={() => setIsComparing(true)}
                                                    className="px-3 py-1.5 rounded-full bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-colors shadow-lg shadow-violet-500/20"
                                                >
                                                    Compare ({selectedModels.length})
                                                </button>
                                            </>
                                        )}

                                        <div className="h-4 w-px bg-current opacity-20"></div>
                                        <button
                                            onClick={onBulkExport}
                                            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                            title="Export selected"
                                        >
                                            <Download size={18} />
                                        </button>
                                        <button
                                            onClick={onBulkDelete}
                                            className="p-2 rounded-full hover:bg-red-500/10 text-red-500 transition-colors"
                                            title="Delete selected"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                        <div className="h-4 w-px bg-current opacity-20"></div>
                                        <button
                                            onClick={() => onSelectAll && onSelectAll(false)}
                                            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                                            title="Clear selection"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </ErrorBoundary>
                </div>

                {/* Detail Panel */}
                {openModel && (
                    <div className="lg:w-2/5 relative transition-all duration-500 ease-out">
                        <ErrorBoundary name="Detail Panel" onReset={onCloseDetail}>
                            <DetailPanel
                                model={openModel}
                                onClose={onCloseDetail}
                                onDelete={onDeleteModel}
                                triggerElement={triggerElement}
                                onToggleFavorite={onToggleFavorite}
                                onToggleNSFWFlag={onToggleNSFWFlag}
                            />
                        </ErrorBoundary>
                    </div>
                )}
            </div>

            {/* Comparison View Modal */}
            {isComparing && (
                <ComparisonView
                    models={selectedModels}
                    onClose={() => setIsComparing(false)}
                    theme={theme}
                />
            )}
        </main>
    );
}
