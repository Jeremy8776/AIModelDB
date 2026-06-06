import React from 'react';
import { useTranslation } from 'react-i18next';
import { EntityType } from '../../types';
import { useEntityType } from '../../context/EntityTypeContext';

export interface EntityTabsProps {
    /**
     * Optional query-match counts per entity. When provided AND a search
     * query is active, each tab shows a badge with how many records match.
     * Inactive tabs with matches get an accent border so the user sees
     * results elsewhere without having to switch.
     */
    matchCounts?: { models: number; mcp: number; skills: number };
    /** True when there's a non-empty search query — gates badge rendering. */
    hasActiveQuery?: boolean;
}

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
export function EntityTabs({ matchCounts, hasActiveQuery }: EntityTabsProps = {}) {
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
                const count = matchCounts ? matchCounts[tab.id] : undefined;
                const hasHits = hasActiveQuery && count !== undefined && count > 0;
                const noHits = hasActiveQuery && count === 0;
                return (
                    <button
                        key={tab.id}
                        role="tab"
                        aria-selected={isActive}
                        aria-controls={`entity-panel-${tab.id}`}
                        title={
                            hasActiveQuery && count !== undefined
                                ? `${tab.description} — ${count} match${count === 1 ? '' : 'es'}`
                                : tab.description
                        }
                        onClick={() => setActiveEntity(tab.id)}
                        className={`
                            relative px-5 pt-2 pb-2.5 text-sm font-medium
                            rounded-t-lg border border-b-0
                            transition-colors
                            inline-flex items-center gap-2
                            ${isActive
                                // Active: same bg as the table header, full top/side border;
                                // its bottom (border-b-0) overlaps the table's top border to merge.
                                ? 'bg-bg border-border text-text'
                                // Inactive with hits: subtle accent ring to invite the user over.
                                : hasHits
                                    ? 'bg-bg-card/50 border-accent/40 text-text hover:bg-bg-card'
                                    // Inactive empty: recessed and dimmed.
                                    : noHits
                                        ? 'bg-bg-card/30 border-border/30 text-text-secondary/60 hover:bg-bg-card hover:text-text-secondary'
                                        : 'bg-bg-card/50 border-border/40 text-text-secondary hover:bg-bg-card hover:text-text'
                            }
                        `}
                    >
                        <span>{tab.label}</span>
                        {hasActiveQuery && count !== undefined && (
                            <span
                                className={`
                                    text-[10px] font-mono px-1.5 py-0.5 rounded-full leading-none tabular-nums
                                    ${count === 0
                                        ? 'bg-bg-input text-text-secondary/60'
                                        : isActive
                                            ? 'bg-accent text-white'
                                            : 'bg-accent/15 text-accent'
                                    }
                                `}
                            >
                                {count.toLocaleString()}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
