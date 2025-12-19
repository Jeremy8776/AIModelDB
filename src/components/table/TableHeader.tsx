/**
 * Table Header Component
 * 
 * Sortable header row for the model table.
 * Displays column names with sort indicators and handles sort interactions.
 * 
 * @module TableHeader
 */

import React from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { SortKey } from '../../hooks/useUIState';

/**
 * Props for the TableHeader component
 */
export interface TableHeaderProps {
    sortKey: SortKey;
    sortDirection: 'asc' | 'desc';
    onSortChange: (key: SortKey, direction: 'asc' | 'desc') => void;
    theme: 'light' | 'dark';
}

/**
 * Table header component with sortable columns.
 * 
 * Features:
 * - Clickable column headers
 * - Sort direction indicators (up/down arrows)
 * - Active column highlighting
 * - Theme-aware styling
 * 
 * Columns:
 * - Model (name)
 * - Released (release_date)
 * - Domain
 * - Costs (parameters)
 * - License
 * 
 * @param props - TableHeader component props
 * @returns JSX.Element
 */
export function TableHeader({
    sortKey,
    sortDirection,
    onSortChange,
    theme
}: TableHeaderProps) {
    const textSubtle = theme === 'dark' ? 'text-zinc-400' : 'text-gray-800';

    // Helper function to handle sort button clicks
    const handleSortClick = (key: SortKey) => {
        if (sortKey === key) {
            onSortChange(key, sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            onSortChange(key, 'desc');
        }
    };

    // Helper function to render sort button
    const renderSortButton = (key: SortKey, label: string, colSpan: string) => {
        const isActive = sortKey === key;
        return (
            <button
                onClick={() => handleSortClick(key)}
                className={`${colSpan} flex items-center gap-1 hover:text-violet-500 transition-colors cursor-pointer ${isActive ? 'text-violet-500' : ''
                    }`}
            >
                {label}
                {isActive ? (
                    sortDirection === 'asc' ? (
                        <ArrowUp className="h-3 w-3" />
                    ) : (
                        <ArrowDown className="h-3 w-3" />
                    )
                ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-50" />
                )}
            </button>
        );
    };

    return (
        <div className={`grid grid-cols-12 gap-3 px-3 py-2 text-xs ${textSubtle} border-b`}>
            {renderSortButton('name', 'Model', 'col-span-3')}
            {renderSortButton('release_date', 'Released', 'col-span-2')}
            {renderSortButton('domain', 'Domain', 'col-span-2')}
            {renderSortButton('parameters', 'Costs/1M Tokens', 'col-span-2')}
            {renderSortButton('license', 'License', 'col-span-3')}
        </div>
    );
}
