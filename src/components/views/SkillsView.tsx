import React from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Skills tab — empty-state stub for Phase 1.
 *
 * Phase 3 will add: per-tab filter sidebar, skill-specific table columns
 * (family, triggers, runtimes, dependencies), detail panel, and a sync
 * flow that pulls from anthropics/skills, anthropics/claude-plugins-official,
 * anthropics/knowledge-work-plugins (Cowork), agentskills.io adopters,
 * HuggingFace Hub, and GitHub topic searches.
 */
export function SkillsView() {
    const { t } = useTranslation();

    return (
        <div
            id="entity-panel-skills"
            role="tabpanel"
            aria-labelledby="tab-skills"
            className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center"
        >
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
    );
}
