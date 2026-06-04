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
            className="flex items-center gap-1 border-b border-border bg-bg/60 px-4 backdrop-blur-md"
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
                            flex items-center gap-2 px-4 py-2.5 text-sm font-medium
                            border-b-2 transition-colors
                            ${isActive
                                ? 'border-accent text-text'
                                : 'border-transparent text-text-secondary hover:text-text hover:border-border'
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
