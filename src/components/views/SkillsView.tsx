import React from 'react';
import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Skills tab content placeholder. Slots into MainLayout's content area
 * just like the Models table and MCP list — no separate layout. Empty
 * state until v0.8.0 wires up fetchers for Anthropic + Cowork + GitHub.
 */
export function SkillsView() {
    const { t } = useTranslation();

    return (
        <div id="entity-panel-skills" role="tabpanel" className="flex flex-col items-center justify-center min-h-[40vh] p-8 text-center">
            <div className="rounded-2xl border border-border bg-bg-card p-10 max-w-xl">
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-accent/10 text-accent">
                    <Sparkles size={32} />
                </div>
                <h2 className="text-xl font-semibold mb-2">
                    {t('skills.empty.title', { defaultValue: 'Skills — Coming Soon' })}
                </h2>
                <p className="text-text-secondary">
                    {t('skills.empty.desc', {
                        defaultValue: 'Skills sync arrives in v0.8.0 with Anthropic, Cowork, and HuggingFace sources.',
                    })}
                </p>
            </div>
        </div>
    );
}
