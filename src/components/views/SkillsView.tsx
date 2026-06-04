import React from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EntityTabs } from '../layout/EntityTabs';

/**
 * Skills tab — empty-state stub for Phase 1.
 *
 * Phase 3 will add: per-tab filter sidebar, skill-specific table columns
 * (family, triggers, runtimes, dependencies), detail panel, and a sync
 * flow that pulls from anthropics/skills, anthropics/claude-plugins-official,
 * anthropics/knowledge-work-plugins (Cowork), agentskills.io adopters,
 * HuggingFace Hub, and GitHub topic searches.
 *
 * Toolbar mirrors the 3-zone layout used on the Models and MCP tabs:
 * left (sync — disabled until fetchers land) | center (entity tabs) | right (filters).
 */
export function SkillsView() {
    const { t } = useTranslation();

    return (
        <div id="entity-panel-skills" role="tabpanel" className="p-4 max-w-7xl mx-auto">
            {/* Toolbar — same 3-zone layout as the Models/MCP toolbars */}
            <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center mb-4">
                <div className="flex items-center gap-3 lg:w-72 flex-shrink-0">
                    <button
                        disabled
                        className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-bg-input text-text-secondary opacity-60 cursor-not-allowed"
                        title={t('skills.toolbar.syncDisabled', { defaultValue: 'Sync arrives in v0.8.0' })}
                    >
                        <RefreshCw size={16} />
                        {t('skills.toolbar.sync', { defaultValue: 'Sync Skills' })}
                    </button>
                </div>

                <div className="flex-1 flex items-center justify-center">
                    <EntityTabs />
                </div>

                <div className="flex items-center gap-2 lg:justify-end lg:w-72" />
            </div>

            {/* Empty state body */}
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
                <div className="rounded-2xl border border-border bg-bg-card p-10 max-w-xl">
                    <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-accent/10 text-accent">
                        <Sparkles size={32} />
                    </div>
                    <h2 className="text-2xl font-semibold mb-2">
                        {t('skills.empty.title', { defaultValue: 'Skills — Coming Soon' })}
                    </h2>
                    <p className="text-text-secondary mb-6">
                        {t('skills.empty.desc', {
                            defaultValue: 'This tab will aggregate Claude skills, Cowork plugins, Cursor rules, Windsurf workflows, prompts, and agent recipes from across the ecosystem. Sync support arrives in v0.8.0.',
                        })}
                    </p>
                    <div className="flex items-center justify-center gap-2 text-sm text-text-secondary">
                        <RefreshCw size={14} />
                        <span>{t('skills.empty.cta', { defaultValue: 'Tracking 30+ sources across the agent ecosystem' })}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
