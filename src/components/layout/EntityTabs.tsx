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
        // z-30 sits ABOVE the table's sticky header (z-20) so the active tab's
        // bottom edge paints over the table's top border, merging the two.
        // -mb-px pulls the table up by 1px so that overlap lands exactly on the border line.
        <div
            className="flex items-end gap-1 -mb-px relative z-30"
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
                            relative px-5 pt-2 pb-2.5 text-sm font-medium
                            rounded-t-lg border border-b-0
                            transition-colors
                            ${isActive
                                // Active: same bg as the table header, full top/side border;
                                // its bottom (border-b-0) overlaps the table's top border to merge.
                                ? 'bg-bg border-border text-text'
                                // Inactive: recessed — softer bg, muted border, sits just under the line.
                                : 'bg-bg-card/50 border-border/40 text-text-secondary hover:bg-bg-card hover:text-text'
                            }
                        `}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}
