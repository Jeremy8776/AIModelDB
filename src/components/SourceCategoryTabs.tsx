import React from 'react';
import { useTranslation } from 'react-i18next';
import { EntitySourceCategory, getSourceCategorySummary } from '../services/sources/entitySources';

interface SourceCategoryTabsProps {
    activeCategory: EntitySourceCategory;
    onChange: (category: EntitySourceCategory) => void;
}

export function SourceCategoryTabs({ activeCategory, onChange }: SourceCategoryTabsProps) {
    const { t } = useTranslation();
    const tabs: Array<{ id: EntitySourceCategory; label: string; description: string }> = [
        {
            id: 'models',
            label: t('entityTabs.models', { defaultValue: 'Models' }),
            description: t('entityTabs.modelsDesc', { defaultValue: 'AI models from many providers' }),
        },
        {
            id: 'mcp',
            label: t('entityTabs.mcp', { defaultValue: 'MCP Servers' }),
            description: t('entityTabs.mcpDesc', { defaultValue: 'Model Context Protocol servers' }),
        },
        {
            id: 'skills',
            label: t('entityTabs.skills', { defaultValue: 'Skills' }),
            description: t('entityTabs.skillsDesc', { defaultValue: 'Claude skills, plugins, and agent capabilities' }),
        },
    ];

    return (
        <div className="flex items-end gap-1 -mb-px relative z-30 overflow-x-auto" role="tablist" aria-label="Source category">
            {tabs.map(tab => {
                const isActive = activeCategory === tab.id;
                const summary = getSourceCategorySummary(tab.id);
                return (
                    <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        aria-controls={`source-panel-${tab.id}`}
                        title={`${tab.description} - ${summary.available} ready, ${summary.planned} planned`}
                        onClick={() => onChange(tab.id)}
                        className={`
                            relative px-5 pt-2 pb-2.5 text-sm font-medium
                            rounded-t-lg border border-b-0 transition-colors
                            inline-flex items-center gap-2 whitespace-nowrap
                            ${isActive
                                ? 'bg-bg border-border text-text'
                                : 'bg-bg-card/50 border-border/40 text-text-secondary hover:bg-bg-card hover:text-text'
                            }
                        `}
                    >
                        <span>{tab.label}</span>
                        <span
                            className={`
                                text-[10px] font-mono px-1.5 py-0.5 rounded-full leading-none tabular-nums
                                ${isActive ? 'bg-accent text-white' : 'bg-accent/15 text-accent'}
                            `}
                        >
                            {summary.total}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
