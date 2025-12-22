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
import { RoundCheckbox } from '../RoundCheckbox';

/**
 * Props for the TableHeader component
 */
export interface TableHeaderProps {
    sortKey: SortKey;
    sortDirection: 'asc' | 'desc';
    onSortChange: (key: SortKey, direction: 'asc' | 'desc') => void;
    theme: 'light' | 'dark';
    isAllSelected?: boolean;
    onSelectAll?: (selected: boolean) => void;
}

export function TableHeader({
    sortKey,
    sortDirection,
    onSortChange,
    theme,
    isAllSelected,
    onSelectAll
}: TableHeaderProps) {
    const textSubtle = theme === 'dark' ? 'text-zinc-400' : 'text-gray-800';
    const checkboxBorder = theme === 'dark' ? 'border-zinc-700 bg-zinc-900' : 'border-gray-300 bg-white';
    const checkboxChecked = 'bg-accent border-accent';

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
                className={`${colSpan} flex items-center gap-1 transition-colors cursor-pointer`}
                style={{
                    color: isActive ? 'var(--accent)' : undefined,
                }}
                onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.color = 'var(--accent)';
                }}
                onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.color = '';
                }}
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
        <div className={`grid grid-cols-12 gap-3 px-3 py-2 text-xs ${textSubtle} border-b items-center`}>
            {/* Checkbox Column */}
            <div className="col-span-1 flex justify-center">
                <RoundCheckbox
                    checked={!!isAllSelected}
                    onChange={(checked) => onSelectAll && onSelectAll(checked)}
                    size="sm"
                    ariaLabel="Select all models"
                />
            </div>

            {renderSortButton('name', 'Model', 'col-span-3')}
            {renderSortButton('release_date', 'Released', 'col-span-2')}
            {renderSortButton('domain', 'Domain', 'col-span-2')}
            {renderSortButton('parameters', 'Costs/1M Tokens', 'col-span-2')}
            {renderSortButton('license', 'License', 'col-span-2')}
        </div>
    );
}
