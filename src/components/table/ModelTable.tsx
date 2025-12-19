/**
 * Model Table Component
 * 
 * Main table component displaying the list of AI models.
 * Includes sortable header, model rows, and lazy loading sentinel.
 * 
 * @module ModelTable
 */

import React from 'react';
import { Model } from '../../types';
import { SortKey } from '../../hooks/useUIState';
import { ModelRow } from '../ModelRow';
import { TableHeader } from './TableHeader';
import { LazyLoadSentinel } from './LazyLoadSentinel';

/**
 * Props for the ModelTable component
 */
export interface ModelTableProps {
    models: Model[];
    sortKey: SortKey;
    sortDirection: 'asc' | 'desc';
    onSortChange: (key: SortKey, direction: 'asc' | 'desc') => void;
    onModelOpen: (model: Model, element: HTMLElement) => void;
    hasMore: boolean;
    sentinelRef: React.RefObject<HTMLDivElement>;
    displayCount: number;
    totalCount: number;
    theme: 'light' | 'dark';
}

/**
 * Model table component with sortable header and lazy loading.
 * 
 * Features:
 * - Sortable column headers
 * - Model rows with click to open detail
 * - Lazy loading with intersection observer
 * - Theme-aware styling
 * 
 * @param props - ModelTable component props
 * @returns JSX.Element
 */
export function ModelTable({
    models,
    sortKey,
    sortDirection,
    onSortChange,
    onModelOpen,
    hasMore,
    sentinelRef,
    displayCount,
    totalCount,
    theme
}: ModelTableProps) {
    // Styling based on theme
    const bgCard = theme === 'dark' ? 'border-zinc-800 bg-black' : 'border-gray-400 bg-white shadow-sm';

    return (
        <div className={`rounded-2xl border ${bgCard}`}>
            {/* Table Header */}
            <TableHeader
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSortChange={onSortChange}
                theme={theme}
            />

            {/* Table Body */}
            <div className="p-2 space-y-2">
                {models.map((m, idx) => (
                    <div key={`${m.source}-${m.id}-${idx}`}>
                        <ModelRow
                            m={m}
                            onOpen={(model, element) => {
                                if (element) {
                                    onModelOpen(model, element);
                                }
                            }}
                        />
                    </div>
                ))}

                {/* Lazy load sentinel - triggers loading more items */}
                {hasMore && (
                    <LazyLoadSentinel
                        sentinelRef={sentinelRef}
                        displayCount={displayCount}
                        totalCount={totalCount}
                        theme={theme}
                    />
                )}
            </div>
        </div>
    );
}
