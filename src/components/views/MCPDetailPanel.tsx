import React, { useState } from 'react';
import { X, ExternalLink, Star, ShieldCheck, Box, Globe, Copy, Check, Terminal, Wrench, FileText, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MCPServer, MCPPackage } from '../../types';
import { openExternalUrl } from '../../utils/electron';
import { describeRuntimeArg, getInstallCommand } from '../../utils/mcpDisplay';

interface MCPDetailPanelProps {
    server: MCPServer | null;
    onClose: () => void;
    onToggleFavorite: (id: string) => void;
    onDelete: (id: string) => void;
    className?: string;
}

/**
 * MCP Server detail panel. Same visual shell as the Models DetailPanel —
 * sticky right column, rounded card, header row with title + actions,
 * scrollable body. Renders MCP-specific fields: install commands, transport
 * endpoints, environment requirements, provenance badges.
 */
export function MCPDetailPanel({
    server,
    onClose,
    onToggleFavorite,
    className = '',
}: MCPDetailPanelProps) {
    const { t } = useTranslation();

    if (!server) return null;

    const installablePackages = (server.packages || []).map(p => ({ pkg: p, command: getInstallCommand(p) }));
    const hasQuickStart = installablePackages.some(p => p.command) || (server.remotes && server.remotes.length > 0);
    const hasMeta = (server.tags && server.tags.length > 0)
        || (server.license && server.license.name && server.license.name !== 'Unknown')
        || (server.downloads != null && server.downloads > 0);

    return (
        <div className={`rounded-2xl border border-border bg-bg-card flex flex-col ${className}`}>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 p-4 border-b border-border">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h2 className="text-lg font-semibold truncate">{server.name}</h2>
                        {server.namespaceVerified && (
                            <span title={t('mcpDetail.namespaceVerified', { defaultValue: 'Publisher namespace ownership signal. Not a security audit.' })} className="text-emerald-600">
                                <ShieldCheck size={16} />
                            </span>
                        )}
                        {server.version && (
                            <span className="text-xs text-text-secondary">v{server.version}</span>
                        )}
                    </div>
                    <div className="text-xs text-text-secondary font-mono break-all">{server.id}</div>
                    {server.capabilities && server.capabilities.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                            {server.capabilities.map(cap => (
                                <CapabilityChip key={cap} cap={cap} />
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <button
                        onClick={() => onToggleFavorite(server.id)}
                        className="p-2 rounded-lg hover:bg-bg-input text-text-secondary"
                        title={t('common.favorite', { defaultValue: 'Favorite' })}
                    >
                        <Star size={16} className={server.isFavorite ? 'fill-amber-500 text-amber-500' : ''} />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-bg-input text-text-secondary"
                        title={t('common.close', { defaultValue: 'Close' })}
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[calc(100vh-200px)]">
                {server.description && (
                    <div>
                        <div className="text-xs font-semibold text-text-secondary mb-1">
                            {t('mcpDetail.description', { defaultValue: 'Description' })}
                        </div>
                        <p className="text-sm text-text leading-relaxed">{server.description}</p>
                    </div>
                )}

                {/* Quick start — synthesized install/run commands */}
                {hasQuickStart && (
                    <Section title={t('mcpDetail.quickStart', { defaultValue: 'Quick start' })}>
                        <p className="mb-2 text-xs text-text-secondary leading-relaxed">
                            {t('mcpDetail.quickStartHelp', { defaultValue: 'Paste into your MCP client config. Add any required env vars / headers from below before running.' })}
                        </p>
                        <div className="space-y-2">
                            {installablePackages.filter(p => p.command).map((p, i) => (
                                <CommandBlock
                                    key={`pkg-${i}`}
                                    label={`${p.pkg.registryType.toUpperCase()} · ${p.pkg.identifier}${p.pkg.version ? ` @ ${p.pkg.version}` : ''}`}
                                    command={p.command!}
                                />
                            ))}
                            {server.remotes?.map((r, i) => r.url && (
                                <CommandBlock
                                    key={`remote-${i}`}
                                    label={`${r.type.toUpperCase()} endpoint`}
                                    command={r.url}
                                />
                            ))}
                        </div>
                    </Section>
                )}

                {/* Source attribution */}
                <Section title={t('mcpDetail.sources', { defaultValue: 'Sources' })}>
                    <div className="flex flex-wrap gap-1">
                        {server.source.split(',').map(s => (
                            <span key={s} className="text-xs px-2 py-0.5 rounded bg-bg-input text-text-secondary font-mono">
                                {s.trim()}
                            </span>
                        ))}
                    </div>
                </Section>

                {/* Repository / website links */}
                {(server.repository?.url || server.websiteUrl) && (
                    <Section title={t('mcpDetail.links', { defaultValue: 'Links' })}>
                        <div className="space-y-1">
                            {server.repository?.url && (
                                <LinkRow
                                    icon={<Box size={14} />}
                                    label={t('mcpDetail.repository', { defaultValue: 'Repository' })}
                                    url={server.repository.url}
                                />
                            )}
                            {server.websiteUrl && (
                                <LinkRow
                                    icon={<Globe size={14} />}
                                    label={t('mcpDetail.website', { defaultValue: 'Website' })}
                                    url={server.websiteUrl}
                                />
                            )}
                        </div>
                    </Section>
                )}

                {/* Packages */}
                {server.packages && server.packages.length > 0 && (
                    <Section title={t('mcpDetail.packages', { defaultValue: 'Packages' })}>
                        <div className="space-y-2">
                            {server.packages.map((p, i) => (
                                <PackageCard key={i} pkg={p} />
                            ))}
                        </div>
                    </Section>
                )}

                {/* Remotes */}
                {server.remotes && server.remotes.length > 0 && (
                    <Section title={t('mcpDetail.remotes', { defaultValue: 'Remote endpoints' })}>
                        <div className="space-y-2">
                            {server.remotes.map((r, i) => (
                                <div key={i} className="rounded-lg border border-border bg-bg p-2.5">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <span className="text-xs font-semibold text-accent">{r.type}</span>
                                    </div>
                                    {r.url && (
                                        <div className="font-mono text-xs break-all">{r.url}</div>
                                    )}
                                    {r.headers && r.headers.length > 0 && (
                                        <div className="mt-1.5 space-y-0.5">
                                            {r.headers.map((h, j) => (
                                                <div key={j} className="text-[10px] text-text-secondary">
                                                    <span className="font-mono">{h.name}</span>
                                                    {h.isRequired && <span className="ml-1 text-amber-600">*required</span>}
                                                    {h.isSecret && <span className="ml-1 text-red-600">secret</span>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </Section>
                )}

                {/* Provenance */}
                <Section title={t('mcpDetail.verification', { defaultValue: 'Provenance' })}>
                    <p className="mb-2 text-xs text-text-secondary leading-relaxed">
                        {t('mcpDetail.provenanceHelp', { defaultValue: 'These checks show source or ownership signals. They do not guarantee the server is safe or audited.' })}
                    </p>
                    <div className="space-y-1 text-xs">
                        <VerificationRow
                            label={t('mcpFilters.namespaceVerified', { defaultValue: 'Publisher namespace' })}
                            value={!!server.namespaceVerified}
                        />
                        <VerificationRow
                            label={t('mcpFilters.imageVerified', { defaultValue: 'Docker image' })}
                            value={!!server.imageVerified}
                        />
                        <VerificationRow
                            label={t('mcpFilters.directoryVerified', { defaultValue: 'Directory listing' })}
                            value={!!server.directoryVerified}
                        />
                    </div>
                </Section>

                {/* Meta — license / tags / downloads (only if present and non-default) */}
                {hasMeta && (
                    <Section title={t('mcpDetail.meta', { defaultValue: 'Other' })}>
                        <div className="space-y-1.5 text-xs">
                            {server.license && server.license.name && server.license.name !== 'Unknown' && (
                                <div className="flex items-center justify-between">
                                    <span className="text-text-secondary">{t('mcpDetail.license', { defaultValue: 'License' })}</span>
                                    <span className="text-text font-mono">{server.license.name}</span>
                                </div>
                            )}
                            {server.downloads != null && server.downloads > 0 && (
                                <div className="flex items-center justify-between">
                                    <span className="text-text-secondary">{t('mcpDetail.downloads', { defaultValue: 'Downloads' })}</span>
                                    <span className="text-text">{server.downloads.toLocaleString()}</span>
                                </div>
                            )}
                            {server.tags && server.tags.length > 0 && (
                                <div>
                                    <div className="text-text-secondary mb-1">{t('mcpDetail.tags', { defaultValue: 'Tags' })}</div>
                                    <div className="flex flex-wrap gap-1">
                                        {server.tags.map(tag => (
                                            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-bg-input text-text-secondary">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </Section>
                )}

                {/* Timestamps */}
                {(server.publishedAt || server.updatedAt) && (
                    <Section title={t('mcpDetail.timestamps', { defaultValue: 'Timestamps' })}>
                        <div className="text-xs text-text-secondary space-y-0.5">
                            {server.publishedAt && (
                                <div>
                                    {t('mcpDetail.published', { defaultValue: 'Published' })}: {new Date(server.publishedAt).toLocaleString()}
                                </div>
                            )}
                            {server.updatedAt && (
                                <div>
                                    {t('mcpDetail.updated', { defaultValue: 'Updated' })}: {new Date(server.updatedAt).toLocaleString()}
                                </div>
                            )}
                        </div>
                    </Section>
                )}
            </div>
        </div>
    );
}

function CapabilityChip({ cap }: { cap: string }) {
    const c = cap.toLowerCase();
    const icon = c === 'tools' ? <Wrench size={11} />
        : c === 'resources' ? <FileText size={11} />
            : c === 'prompts' ? <MessageSquare size={11} />
                : null;
    return (
        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
            {icon}
            {cap}
        </span>
    );
}

function CommandBlock({ label, command }: { label: string; command: string }) {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(command);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // clipboard write can fail in some sandboxed contexts; user can select+copy manually
        }
    };
    return (
        <div className="rounded-lg border border-border bg-bg overflow-hidden">
            <div className="flex items-center justify-between px-2.5 py-1 text-[10px] text-text-secondary border-b border-border">
                <span className="truncate" title={label}>{label}</span>
                <button
                    onClick={copy}
                    className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-bg-input shrink-0"
                    title="Copy to clipboard"
                >
                    {copied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                    {copied ? 'Copied' : 'Copy'}
                </button>
            </div>
            <div className="flex items-start gap-1.5 px-2.5 py-2 font-mono text-xs">
                <Terminal size={12} className="mt-0.5 text-text-secondary shrink-0" />
                <span className="break-all text-text">{command}</span>
            </div>
        </div>
    );
}

function PackageCard({ pkg }: { pkg: MCPPackage }) {
    const envVars = pkg.environmentVariables || [];
    const args = (pkg.runtimeArguments || []).map(describeRuntimeArg).filter(Boolean);
    const transportLabel = pkg.transport?.type;
    return (
        <div className="rounded-lg border border-border bg-bg p-2.5">
            <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-semibold text-accent uppercase">{pkg.registryType}</span>
                <div className="flex items-center gap-1">
                    {transportLabel && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-input text-text-secondary" title="Default transport for this package">
                            {transportLabel}
                        </span>
                    )}
                    {pkg.runtimeHint && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-input text-text-secondary">
                            {pkg.runtimeHint}
                        </span>
                    )}
                </div>
            </div>
            <div className="font-mono text-xs break-all">{pkg.identifier}</div>
            {pkg.version && (
                <div className="text-[10px] text-text-secondary mt-0.5">v{pkg.version}</div>
            )}

            {args.length > 0 && (
                <div className="mt-2">
                    <div className="text-[10px] uppercase tracking-wide text-text-secondary mb-1">Default args</div>
                    <div className="rounded bg-bg-input px-2 py-1 font-mono text-[11px] break-all">
                        {args.join(' ')}
                    </div>
                </div>
            )}

            {envVars.length > 0 && (
                <div className="mt-2">
                    <div className="text-[10px] uppercase tracking-wide text-text-secondary mb-1">Environment variables</div>
                    <div className="space-y-1">
                        {envVars.map((v, i) => (
                            <div key={i} className="rounded bg-bg-input px-2 py-1 text-[11px]">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-mono font-medium text-text">{v.name}</span>
                                    {v.isRequired && (
                                        <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 font-medium">required</span>
                                    )}
                                    {v.isSecret && (
                                        <span className="text-[9px] px-1 py-0.5 rounded bg-red-500/15 text-red-700 dark:text-red-300 font-medium">secret</span>
                                    )}
                                    {!v.isRequired && !v.isSecret && (
                                        <span className="text-[9px] px-1 py-0.5 rounded bg-bg text-text-secondary font-medium">optional</span>
                                    )}
                                </div>
                                {v.description && (
                                    <div className="text-text-secondary mt-0.5">{v.description}</div>
                                )}
                                {v.default != null && v.default !== '' && (
                                    <div className="text-text-secondary mt-0.5">
                                        Default: <span className="font-mono">{v.default}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
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

function LinkRow({ icon, label, url }: { icon: React.ReactNode; label: string; url: string }) {
    return (
        <button
            onClick={() => openExternalUrl(url)}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg border border-border bg-bg hover:bg-bg-input text-left text-sm"
        >
            <span className="text-text-secondary">{icon}</span>
            <span className="flex-1 min-w-0">
                <span className="font-medium">{label}</span>
                <span className="text-xs text-text-secondary block truncate">{url}</span>
            </span>
            <ExternalLink size={12} className="text-text-secondary shrink-0" />
        </button>
    );
}

function VerificationRow({ label, value }: { label: string; value: boolean }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-text-secondary">{label}</span>
            <span className={value ? 'text-emerald-600 font-medium' : 'text-text-secondary'}>
                {value ? 'Found' : 'Not found'}
            </span>
        </div>
    );
}
