import React from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { RoundCheckbox } from '../RoundCheckbox';

export type SkillSortKey = 'name' | 'type' | 'family' | 'origin' | 'source';

export interface SkillsTableHeaderProps {
    sortKey: SkillSortKey;
    sortDirection: 'asc' | 'desc';
    onSortChange: (key: SkillSortKey, direction: 'asc' | 'desc') => void;
    theme: 'light' | 'dark';
    isAllSelected?: boolean;
    onSelectAll?: (selected: boolean) => void;
}

/**
 * Sortable header for the Skills table. Mirrors ModelTable/MCPTable header
 * (12-col grid, checkbox column, identical sort-button visuals).
 */
export function SkillsTableHeader({
    sortKey,
    sortDirection,
    onSortChange,
    theme,
    isAllSelected,
    onSelectAll,
}: SkillsTableHeaderProps) {
    const { t } = useTranslation();
    const textSubtle = theme === 'dark' ? 'text-zinc-400' : 'text-gray-800';

    const handleSortClick = (key: SkillSortKey) => {
        if (sortKey === key) onSortChange(key, sortDirection === 'asc' ? 'desc' : 'asc');
        else onSortChange(key, 'desc');
    };

    const renderSortButton = (key: SkillSortKey, label: string, colSpan: string) => {
        const isActive = sortKey === key;
        return (
            <button
                onClick={() => handleSortClick(key)}
                className={`${colSpan} flex items-center gap-1 transition-colors cursor-pointer`}
                style={{ color: isActive ? 'var(--accent)' : undefined }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = 'var(--accent)'; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = ''; }}
            >
                {label}
                {isActive ? (
                    sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-50" />
                )}
            </button>
        );
    };

    return (
        <div className={`grid grid-cols-12 gap-3 px-3 py-2 text-xs ${textSubtle} border-b items-center`}>
            <div className="col-span-1 flex justify-center">
                <RoundCheckbox
                    checked={!!isAllSelected}
                    onChange={(checked) => onSelectAll && onSelectAll(checked)}
                    size="sm"
                    ariaLabel={t('common.select', { defaultValue: 'Select' })}
                />
            </div>
            {renderSortButton('name', t('skillsTable.name', { defaultValue: 'Name' }), 'col-span-3')}
            {renderSortButton('type', t('skillsTable.type', { defaultValue: 'Type' }), 'col-span-2')}
            {renderSortButton('family', t('skillsTable.family', { defaultValue: 'Category' }), 'col-span-2')}
            {renderSortButton('origin', t('skillsTable.origin', { defaultValue: 'Origin' }), 'col-span-2')}
            {renderSortButton('source', t('skillsTable.source', { defaultValue: 'Source' }), 'col-span-2')}
        </div>
    );
}
