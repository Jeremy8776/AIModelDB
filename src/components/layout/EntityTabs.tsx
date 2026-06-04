import React from 'react';
import { Database, Plug, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EntityType } from '../../types';
import { useEntityType } from '../../context/EntityTypeContext';

/**
 * Top-level entity tab switcher: Models | MCP Servers | Skills.
 *
 * Sits between the title bar and the search/action toolbar. Each tab swaps
 * the entire workspace below — separate filters, table, detail panel,
 * sync flow, and persistence key per tab.
 */
export function EntityTabs() {
    const { activeEntity, setActiveEntity } = useEntityType();
    const { t } = useTranslation();

    const tabs: Array<{ id: EntityType; label: string; icon: React.ReactNode; description: string }> = [
        {
            id: 'models',
            label: t('entityTabs.models', { defaultValue: 'Models' }),
            icon: <Database size={16} />,
            description: t('entityTabs.modelsDesc', { defaultValue: 'AI models from many providers' }),
        },
        {
            id: 'mcp',
            label: t('entityTabs.mcp', { defaultValue: 'MCP Servers' }),
            icon: <Plug size={16} />,
            description: t('entityTabs.mcpDesc', { defaultValue: 'Model Context Protocol servers' }),
        },
        {
            id: 'skills',
            label: t('entityTabs.skills', { defaultValue: 'Skills' }),
            icon: <Sparkles size={16} />,
            description: t('entityTabs.skillsDesc', { defaultValue: 'Claude skills, plugins, and agent capabilities' }),
        },
    ];

    return (
        <nav
            className="inline-flex items-center gap-0.5 rounded-xl border border-border bg-bg-card p-0.5"
            role="tablist"
            aria-label="Entity type"
        >
            {tabs.map(tab => {
                const isActive = activeEntity === tab.id;
                return (
                    <button
                        key={tab.id}
                        role="tab"
                        aria-selected={isActive}
                        aria-controls={`entity-panel-${tab.id}`}
                        title={tab.description}
                        onClick={() => setActiveEntity(tab.id)}
                        className={`
                            flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
                            transition-colors
                            ${isActive
                                ? 'bg-accent text-white shadow-sm'
                                : 'text-text-secondary hover:text-text hover:bg-bg-input'
                            }
                        `}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                    </button>
                );
            })}
        </nav>
    );
}
