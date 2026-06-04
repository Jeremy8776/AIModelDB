import React from 'react';
import { useTranslation } from 'react-i18next';
import { ThemedSelect } from '../ThemedSelect';
import { RoundCheckbox } from '../RoundCheckbox';
import { SkillType, SkillOrigin } from '../../types';

/**
 * Skills filter sidebar — same card shell/sizing as the Models and MCP
 * sidebars, with skill-specific fields (type, origin, category, favorites).
 */

export type SkillTypeFilter = 'all' | SkillType;
export type SkillOriginFilter = 'all' | SkillOrigin;

export interface SkillsFiltersSidebarProps {
    type: SkillTypeFilter;
    onTypeChange: (v: SkillTypeFilter) => void;
    origin: SkillOriginFilter;
    onOriginChange: (v: SkillOriginFilter) => void;
    family: string;
    onFamilyChange: (v: string) => void;
    families: string[];
    favoritesOnly: boolean;
    onFavoritesOnlyChange: (v: boolean) => void;
    onClearFilters: () => void;
}

export function SkillsFiltersSidebar({
    type,
    onTypeChange,
    origin,
    onOriginChange,
    family,
    onFamilyChange,
    families,
    favoritesOnly,
    onFavoritesOnlyChange,
    onClearFilters,
}: SkillsFiltersSidebarProps) {
    const { t } = useTranslation();
    const bgCard = 'border-border bg-bg-card';
    const bgInput = 'border-border bg-bg-input';

    return (
        <aside className="w-full lg:w-72 flex-shrink-0 lg:sticky lg:top-[5.5rem] lg:max-h-[calc(100vh-100px)] lg:self-start overflow-y-auto">
            <div className={`rounded-2xl border p-4 ${bgCard}`}>
                <div className="text-lg font-semibold mb-4 text-center">
                    {t('filters.title', { defaultValue: 'Filters' })}
                </div>

                <div className="mb-4">
                    <div
                        onClick={() => onFavoritesOnlyChange(!favoritesOnly)}
                        className="flex items-center gap-3 cursor-pointer select-none group"
                    >
                        <RoundCheckbox checked={favoritesOnly} onChange={onFavoritesOnlyChange} />
                        <span className="text-sm font-medium text-text">
                            {t('filters.favoritesOnly', { defaultValue: 'Favorites only' })}
                        </span>
                    </div>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2 text-text">
                        {t('skillsFilters.type', { defaultValue: 'Type' })}
                    </label>
                    <ThemedSelect
                        value={type}
                        onChange={(v) => onTypeChange(v as SkillTypeFilter)}
                        options={[
                            { value: 'all', label: t('common.all', { defaultValue: 'All' }) },
                            { value: 'skill', label: 'Skill' },
                            { value: 'plugin', label: 'Plugin' },
                            { value: 'rule', label: 'Rule' },
                            { value: 'prompt', label: 'Prompt' },
                            { value: 'recipe', label: 'Recipe' },
                            { value: 'app', label: 'App' },
                        ]}
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2 text-text">
                        {t('skillsFilters.origin', { defaultValue: 'Origin' })}
                    </label>
                    <ThemedSelect
                        value={origin}
                        onChange={(v) => onOriginChange(v as SkillOriginFilter)}
                        options={[
                            { value: 'all', label: t('common.all', { defaultValue: 'All' }) },
                            { value: 'anthropic-official', label: 'Anthropic official' },
                            { value: 'cowork-official', label: 'Cowork official' },
                            { value: 'agentskills-spec', label: 'AgentSkills spec' },
                            { value: 'community-curated', label: 'Community curated' },
                            { value: 'open-submission', label: 'Open submission' },
                            { value: 'third-party', label: 'Third party' },
                        ]}
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2 text-text">
                        {t('skillsFilters.family', { defaultValue: 'Category' })}
                    </label>
                    <ThemedSelect
                        value={family}
                        onChange={(v) => onFamilyChange(v as string)}
                        options={[
                            { value: 'all', label: t('common.all', { defaultValue: 'All' }) },
                            ...families.map(f => ({ value: f, label: f })),
                        ]}
                    />
                </div>

                <button
                    onClick={onClearFilters}
                    className={`w-full rounded-xl px-4 py-2 text-sm font-medium transition-colors ${bgInput} hover:bg-bg/10`}
                >
                    {t('filters.clearFilters', { defaultValue: 'Clear filters' })}
                </button>
            </div>
        </aside>
    );
}
