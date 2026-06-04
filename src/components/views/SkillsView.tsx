import React from 'react';
import { Sparkles, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Skill } from '../../types';
import { SkillsTable } from './SkillsTable';
import { SkillSortKey } from './SkillsTableHeader';

/**
 * Skills tab content. Slots into MainLayout's content area exactly where
 * ModelTable / MCPView go — same outer dimensions and table chrome via
 * SkillsTable. Empty/error states sit above the table.
 */

export interface SkillsViewProps {
    skills: Skill[];
    totalCount: number;
    isSyncing: boolean;
    syncProgress: { fetched: number; page: number; source: string } | null;
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
    theme: 'light' | 'dark';
}

export function SkillsView({
    skills,
    totalCount,
    isSyncing,
    syncProgress,
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
        return <EmptyState />;
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
            {syncProgress && (
                <div className="text-xs text-text-secondary px-1">
                    {syncProgress.source} — {syncProgress.fetched.toLocaleString()} fetched
                </div>
            )}
            {table}
        </div>
    );
}

function EmptyState() {
    const { t } = useTranslation();
    return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] p-8 text-center">
            <div className="rounded-2xl border border-border bg-bg-card p-10 max-w-xl">
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-accent/10 text-accent">
                    <Sparkles size={32} />
                </div>
                <h2 className="text-xl font-semibold mb-2">
                    {t('skills.empty.title', { defaultValue: 'No skills loaded yet' })}
                </h2>
                <p className="text-text-secondary">
                    {t('skills.empty.desc', {
                        defaultValue: 'Hit Sync in the toolbar above to pull the official Claude plugins marketplace. No API key required. More sources (Cowork, HuggingFace, GitHub) land next.',
                    })}
                </p>
            </div>
        </div>
    );
}
