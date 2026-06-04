import React from 'react';
import { useTranslation } from 'react-i18next';
import { EntityType } from '../../types';
import { useEntityType } from '../../context/EntityTypeContext';

/**
 * Top-level entity tab switcher: Models | MCP Servers | Skills.
 *
 * Renders as a Chrome-style tab strip — text-only labels, rounded-top tabs
 * that visually connect to the content card below. The active tab shares
 * the content card's background (no bottom border) so it appears merged
 * with the workspace beneath. Inactive tabs sit on the divider line.
 *
 * Designed to be rendered at the very top of MainLayout's content slot,
 * flush against the card it adjoins.
 */
export function EntityTabs() {
    const { activeEntity, setActiveEntity } = useEntityType();
    const { t } = useTranslation();

    const tabs: Array<{ id: EntityType; label: string; description: string }> = [
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
        <div
            className="flex items-end gap-0.5 -mb-px relative z-10"
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
                            relative px-5 py-2 text-sm font-medium
                            rounded-t-lg border-t border-l border-r
                            transition-colors
                            ${isActive
                                ? 'bg-bg border-border text-text'
                                : 'bg-bg-card border-border text-text-secondary hover:text-text -mb-px'
                            }
                        `}
                        style={{ marginBottom: isActive ? '-1px' : undefined }}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}
