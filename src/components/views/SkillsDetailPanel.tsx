import React from 'react';
import { X, ExternalLink, Star, Copy, Box } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Skill } from '../../types';
import { openExternalUrl } from '../../utils/electron';

interface SkillsDetailPanelProps {
    skill: Skill | null;
    onClose: () => void;
    onToggleFavorite: (id: string) => void;
    onDelete: (id: string) => void;
    className?: string;
}

/**
 * Skill detail panel — same shell as the Models / MCP detail panels.
 * Renders skill-specific fields: install command, category, origin,
 * capabilities, dependencies, source repo, redistribution status.
 */
export function SkillsDetailPanel({
    skill,
    onClose,
    onToggleFavorite,
    className = '',
}: SkillsDetailPanelProps) {
    const { t } = useTranslation();
    if (!skill) return null;

    const meta = (skill._meta || {}) as { author?: { name?: string }; version?: string; homepage?: string };

    return (
        <div className={`rounded-2xl border border-border bg-bg-card flex flex-col ${className}`}>
            <div className="flex items-start justify-between gap-3 p-4 border-b border-border">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h2 className="text-lg font-semibold truncate">{skill.name}</h2>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-input font-mono capitalize">{skill.type}</span>
                        {meta.version && <span className="text-xs text-text-secondary">v{meta.version}</span>}
                    </div>
                    <div className="text-xs text-text-secondary font-mono break-all">{skill.id}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <button
                        onClick={() => onToggleFavorite(skill.id)}
                        className="p-2 rounded-lg hover:bg-bg-input text-text-secondary"
                        title={t('common.favorite', { defaultValue: 'Favorite' })}
                    >
                        <Star size={16} className={skill.isFavorite ? 'fill-amber-500 text-amber-500' : ''} />
                    </button>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-bg-input text-text-secondary" title={t('common.close', { defaultValue: 'Close' })}>
                        <X size={16} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[calc(100vh-200px)]">
                {skill.description && (
                    <div>
                        <div className="text-xs font-semibold text-text-secondary mb-1 uppercase tracking-wide">
                            {t('skillsDetail.description', { defaultValue: 'Description' })}
                        </div>
                        <p className="text-sm text-text leading-relaxed">{skill.description}</p>
                    </div>
                )}

                {skill.install_command && (
                    <Section title={t('skillsDetail.install', { defaultValue: 'Install' })}>
                        <div className="flex items-center gap-2 rounded-lg border border-border bg-bg p-2">
                            <code className="flex-1 text-xs font-mono break-all">{skill.install_command}</code>
                            <button
                                onClick={() => navigator.clipboard?.writeText(skill.install_command || '')}
                                className="p-1 rounded hover:bg-bg-input text-text-secondary shrink-0"
                                title={t('common.copy', { defaultValue: 'Copy' })}
                            >
                                <Copy size={12} />
                            </button>
                        </div>
                    </Section>
                )}

                <Section title={t('skillsDetail.classification', { defaultValue: 'Classification' })}>
                    <div className="space-y-1 text-xs">
                        <KV label={t('skillsDetail.type', { defaultValue: 'Type' })} value={skill.type} />
                        <KV label={t('skillsDetail.origin', { defaultValue: 'Origin' })} value={skill.origin.replace(/-/g, ' ')} />
                        {skill.family && <KV label={t('skillsDetail.category', { defaultValue: 'Category' })} value={skill.family} />}
                        <KV label={t('skillsDetail.redistributable', { defaultValue: 'Redistributable' })} value={skill.redistributable} />
                    </div>
                </Section>

                {skill.capabilities && skill.capabilities.length > 0 && (
                    <Section title={t('skillsDetail.capabilities', { defaultValue: 'Capabilities' })}>
                        <div className="flex flex-wrap gap-1">
                            {skill.capabilities.map((c, i) => (
                                <span key={i} className="text-xs px-2 py-0.5 rounded bg-bg-input text-text-secondary">{c}</span>
                            ))}
                        </div>
                    </Section>
                )}

                {skill.tags && skill.tags.length > 0 && (
                    <Section title={t('skillsDetail.tags', { defaultValue: 'Tags' })}>
                        <div className="flex flex-wrap gap-1">
                            {skill.tags.map((tag, i) => (
                                <span key={i} className="text-xs px-2 py-0.5 rounded bg-bg-input text-text-secondary">{tag}</span>
                            ))}
                        </div>
                    </Section>
                )}

                {(skill.source_repo || meta.homepage) && (
                    <Section title={t('skillsDetail.links', { defaultValue: 'Links' })}>
                        <div className="space-y-1">
                            {skill.source_repo && (
                                <LinkRow
                                    icon={<Box size={14} />}
                                    label={`${skill.source_repo.owner}/${skill.source_repo.repo}`}
                                    url={`https://github.com/${skill.source_repo.owner}/${skill.source_repo.repo}`}
                                />
                            )}
                            {meta.homepage && (
                                <LinkRow icon={<ExternalLink size={14} />} label={t('skillsDetail.homepage', { defaultValue: 'Homepage' })} url={meta.homepage} />
                            )}
                        </div>
                    </Section>
                )}

                <Section title={t('skillsDetail.sources', { defaultValue: 'Sources' })}>
                    <div className="flex flex-wrap gap-1">
                        {skill.source.split(',').map(s => (
                            <span key={s} className="text-xs px-2 py-0.5 rounded bg-bg-input text-text-secondary font-mono">{s.trim()}</span>
                        ))}
                    </div>
                </Section>
            </div>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <div className="text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">{title}</div>
            {children}
        </div>
    );
}

function KV({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-text-secondary">{label}</span>
            <span className="text-text capitalize">{value}</span>
        </div>
    );
}

function LinkRow({ icon, label, url }: { icon: React.ReactNode; label: string; url: string }) {
    return (
        <button
            onClick={() => openExternalUrl(url)}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg border border-border bg-bg hover:bg-bg-input text-left text-sm"
        >
            <span className="text-text-secondary">{icon}</span>
            <span className="flex-1 min-w-0">
                <span className="font-medium truncate block">{label}</span>
                <span className="text-xs text-text-secondary block truncate">{url}</span>
            </span>
            <ExternalLink size={12} className="text-text-secondary shrink-0" />
        </button>
    );
}
