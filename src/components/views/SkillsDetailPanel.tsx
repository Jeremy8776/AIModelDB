import React, { useState } from 'react';
import { X, ExternalLink, Star, Copy, Check, Box, Wrench, FileText, MessageSquare, Zap, Key, Cpu, Plug } from 'lucide-react';
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
    const requires = skill.requires || {};
    const hasRequirements =
        (Array.isArray(requires.mcps) && requires.mcps.length > 0)
        || (Array.isArray(requires.plugins) && requires.plugins.length > 0)
        || (Array.isArray(requires.api_keys) && requires.api_keys.length > 0)
        || (Array.isArray(requires.runtimes) && requires.runtimes.length > 0);

    return (
        <div className={`rounded-2xl border border-border bg-bg-card flex flex-col ${className}`}>
            <div className="flex items-start justify-between gap-3 p-4 border-b border-border">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h2 className="text-lg font-semibold truncate">{skill.name}</h2>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-input font-mono capitalize">{skill.type}</span>
                        {meta.version && <span className="text-xs text-text-secondary">v{meta.version}</span>}
                        {meta.author?.name && (
                            <span className="text-xs text-text-secondary">· {meta.author.name}</span>
                        )}
                    </div>
                    <div className="text-xs text-text-secondary font-mono break-all">{skill.id}</div>
                    {skill.capabilities && skill.capabilities.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                            {skill.capabilities.map(cap => (
                                <CapabilityChip key={cap} cap={cap} />
                            ))}
                        </div>
                    )}
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
                        <CopyableCommand command={skill.install_command} />
                    </Section>
                )}

                {skill.triggers && skill.triggers.length > 0 && (
                    <Section title={t('skillsDetail.triggers', { defaultValue: 'Activates when' })}>
                        <p className="mb-2 text-xs text-text-secondary leading-relaxed">
                            {t('skillsDetail.triggersHelp', { defaultValue: 'Example phrases that trigger this skill in a conversation.' })}
                        </p>
                        <div className="space-y-1">
                            {skill.triggers.map((tr, i) => (
                                <div key={i} className="rounded bg-bg-input px-2 py-1 text-xs text-text font-medium">
                                    "{tr}"
                                </div>
                            ))}
                        </div>
                    </Section>
                )}

                 {hasRequirements && (
                    <Section title={t('skillsDetail.requirements', { defaultValue: 'Requires' })}>
                        <div className="space-y-2">
                            {Array.isArray(requires.api_keys) && requires.api_keys.length > 0 && (
                                <RequirementRow icon={<Key size={12} />} label={t('skillsDetail.apiKeys', { defaultValue: 'API keys' })} items={requires.api_keys} highlight />
                            )}
                            {Array.isArray(requires.runtimes) && requires.runtimes.length > 0 && (
                                <RequirementRow icon={<Cpu size={12} />} label={t('skillsDetail.runtimes', { defaultValue: 'Runtimes' })} items={requires.runtimes} />
                            )}
                            {Array.isArray(requires.mcps) && requires.mcps.length > 0 && (
                                <RequirementRow icon={<Zap size={12} />} label={t('skillsDetail.mcps', { defaultValue: 'MCP servers' })} items={requires.mcps} />
                            )}
                            {Array.isArray(requires.plugins) && requires.plugins.length > 0 && (
                                <RequirementRow icon={<Plug size={12} />} label={t('skillsDetail.plugins', { defaultValue: 'Plugins' })} items={requires.plugins} />
                            )}
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
                                <>
                                    <LinkRow
                                        icon={<Box size={14} />}
                                        label={`${skill.source_repo.owner}/${skill.source_repo.repo}`}
                                        url={`https://github.com/${skill.source_repo.owner}/${skill.source_repo.repo}`}
                                    />
                                    {skill.source_repo.path && (
                                        <div className="text-[11px] text-text-secondary font-mono pl-2 break-all" title={skill.source_repo.path}>
                                            {t('skillsDetail.repoPath', { defaultValue: 'Path' })}: {skill.source_repo.path}
                                        </div>
                                    )}
                                    {skill.source_repo.sha && (
                                        <div className="text-[11px] text-text-secondary font-mono pl-2 break-all" title={skill.source_repo.sha}>
                                            {t('skillsDetail.repoSha', { defaultValue: 'Commit' })}: {skill.source_repo.sha.slice(0, 12)}
                                        </div>
                                    )}
                                </>
                            )}
                            {meta.homepage && (
                                <LinkRow icon={<ExternalLink size={14} />} label={t('skillsDetail.homepage', { defaultValue: 'Homepage' })} url={meta.homepage} />
                            )}
                        </div>
                    </Section>
                )}

                {skill.license && skill.license.name && skill.license.name !== 'Unknown' && (
                    <Section title={t('skillsDetail.license', { defaultValue: 'License' })}>
                        <div className="space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                                <span className="text-text-secondary">{t('skillsDetail.licenseName', { defaultValue: 'Name' })}</span>
                                <span className="text-text font-mono">{skill.license.name}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-text-secondary">{t('skillsDetail.licenseType', { defaultValue: 'Type' })}</span>
                                <span className="text-text">{skill.license.type}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-text-secondary">{t('skillsDetail.commercialUse', { defaultValue: 'Commercial use' })}</span>
                                <span className={skill.license.commercial_use ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>
                                    {skill.license.commercial_use ? t('common.allowed', { defaultValue: 'Allowed' }) : t('common.notAllowed', { defaultValue: 'Not allowed' })}
                                </span>
                            </div>
                            {skill.license.url && (
                                <button
                                    onClick={() => openExternalUrl(skill.license!.url!)}
                                    className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-300 hover:underline mt-1"
                                >
                                    {t('skillsDetail.viewLicense', { defaultValue: 'View terms' })} <ExternalLink size={10} />
                                </button>
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

                {skill.updated_at && (
                    <Section title={t('skillsDetail.timestamps', { defaultValue: 'Updated' })}>
                        <div className="text-xs text-text-secondary">
                            {new Date(skill.updated_at).toLocaleString()}
                        </div>
                    </Section>
                )}
            </div>
        </div>
    );
}

function CapabilityChip({ cap }: { cap: string }) {
    const c = cap.toLowerCase();
    const icon = c === 'tools' || c === 'tool' ? <Wrench size={11} />
        : c === 'resources' || c === 'resource' ? <FileText size={11} />
            : c === 'prompts' || c === 'prompt' ? <MessageSquare size={11} />
                : null;
    return (
        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
            {icon}
            {cap}
        </span>
    );
}

function CopyableCommand({ command }: { command: string }) {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard?.writeText(command);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // clipboard may be blocked
        }
    };
    return (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-bg p-2">
            <code className="flex-1 text-xs font-mono break-all">{command}</code>
            <button
                onClick={copy}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-bg-input text-text-secondary shrink-0 text-[10px]"
                title="Copy to clipboard"
            >
                {copied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                {copied ? 'Copied' : 'Copy'}
            </button>
        </div>
    );
}

function RequirementRow({ icon, label, items, highlight }: { icon: React.ReactNode; label: string; items: string[]; highlight?: boolean }) {
    return (
        <div className="flex items-start gap-2">
            <span className={`mt-0.5 ${highlight ? 'text-amber-600 dark:text-amber-300' : 'text-text-secondary'}`}>{icon}</span>
            <div className="flex-1 min-w-0">
                <div className={`text-[11px] uppercase tracking-wide ${highlight ? 'text-amber-700 dark:text-amber-300 font-semibold' : 'text-text-secondary'}`}>
                    {label}
                </div>
                <div className="mt-0.5 flex flex-wrap gap-1">
                    {items.map((item, i) => (
                        <span
                            key={i}
                            className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${highlight
                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                : 'bg-bg-input text-text-secondary'
                                }`}
                        >
                            {item}
                        </span>
                    ))}
                </div>
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
