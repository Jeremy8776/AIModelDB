import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Skill } from '../../types';
import { SkillsTable } from './SkillsTable';
import { SkillSortKey } from './SkillsTableHeader';
import { SectionEmptyState } from '../SectionEmptyState';

/**
 * Skills tab content. Slots into MainLayout's content area exactly where
 * ModelTable / MCPView go — same outer dimensions and table chrome via
 * SkillsTable. Empty/error states sit above the table.
 */

export interface SkillsViewProps {
    skills: Skill[];
    totalCount: number;
    isSyncing: boolean;
    lastError?: string | null;
    sortKey: SkillSortKey;
    sortDirection: 'asc' | 'desc';
    onSortChange: (key: SkillSortKey, direction: 'asc' | 'desc') => void;
    activeSkillId: string | null;
    onOpen: (skill: Skill) => void;
    onToggleFavorite: (id: string) => void;
    selectedIds?: Set<string>;
    onSelect?: (skill: Skill, selected: boolean) => void;
    onSelectAll?: (selected: boolean) => void;
    onSyncAll: () => void;
    onImportCustom: () => void;
    theme: 'light' | 'dark';
}

export function SkillsView({
    skills,
    totalCount,
    isSyncing,
    lastError,
    sortKey,
    sortDirection,
    onSortChange,
    activeSkillId,
    onOpen,
    onToggleFavorite,
    selectedIds,
    onSelect,
    onSelectAll,
    onSyncAll,
    onImportCustom,
    theme,
}: SkillsViewProps) {
    const { t } = useTranslation();

    const table = (
        <SkillsTable
            skills={skills}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSortChange={onSortChange}
            onOpen={(s) => onOpen(s)}
            theme={theme}
            selectedIds={selectedIds}
            onSelect={onSelect}
            onSelectAll={onSelectAll}
            activeSkillId={activeSkillId}
            onToggleFavorite={onToggleFavorite}
        />
    );

    if (lastError) {
        return (
            <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-700 text-sm">
                    <AlertTriangle size={16} />
                    <span>{lastError}</span>
                </div>
                {skills.length > 0 && table}
            </div>
        );
    }

    if (totalCount === 0 && !isSyncing) {
        return (
            <SectionEmptyState
                title={t('skills.empty.title', { defaultValue: 'No skills in the local database' })}
                description={t('skills.empty.desc', { defaultValue: 'Use Sync All to refresh every enabled source, or import custom data when you want to manage this section manually.' })}
                onSyncAll={onSyncAll}
                onImportCustom={onImportCustom}
            />
        );
    }

    if (skills.length === 0 && totalCount > 0 && !isSyncing) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[30vh] p-8 text-center">
                <p className="text-sm text-text-secondary">
                    {t('skills.empty.noMatches', { defaultValue: 'No skills match the current filters.' })}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {table}
        </div>
    );
}
