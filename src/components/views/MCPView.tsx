import React from 'react';
import { Plug, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * MCP Servers tab — empty-state stub for Phase 1.
 *
 * Phase 2 will add: per-tab filter sidebar, MCP-specific table columns
 * (transport, runtime, package registry), detail panel, and a sync flow
 * that pulls from registry.modelcontextprotocol.io + GitHub topic search
 * + docker/mcp-registry + curated awesome lists.
 */
export function MCPView() {
    const { t } = useTranslation();

    return (
        <div
            id="entity-panel-mcp"
            role="tabpanel"
            aria-labelledby="tab-mcp"
            className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center"
        >
            <div className="rounded-2xl border border-border bg-bg-card p-10 max-w-xl">
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-accent/10 text-accent">
                    <Plug size={32} />
                </div>
                <h2 className="text-2xl font-semibold mb-2">
                    {t('mcp.empty.title', { defaultValue: 'MCP Servers — Coming Soon' })}
                </h2>
                <p className="text-text-secondary mb-6">
                    {t('mcp.empty.desc', {
                        defaultValue: 'This tab will aggregate Model Context Protocol servers from the official registry, Docker, GitHub, npm/PyPI, and community directories. Sync support arrives in v0.7.0.',
                    })}
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-text-secondary">
                    <RefreshCw size={14} />
                    <span>{t('mcp.empty.cta', { defaultValue: 'Tracking 40+ sources across the MCP ecosystem' })}</span>
                </div>
            </div>
        </div>
    );
}
