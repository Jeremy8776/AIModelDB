import React from 'react';
import { X, ExternalLink, Star, ShieldCheck, Box, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MCPServer } from '../../types';
import { openExternalUrl } from '../../utils/electron';

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
 * endpoints, environment requirements, verification badges.
 */
export function MCPDetailPanel({
    server,
    onClose,
    onToggleFavorite,
    className = '',
}: MCPDetailPanelProps) {
    const { t } = useTranslation();

    if (!server) return null;

    return (
        <div className={`rounded-2xl border border-border bg-bg-card flex flex-col ${className}`}>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 p-4 border-b border-border">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h2 className="text-lg font-semibold truncate">{server.name}</h2>
                        {server.namespaceVerified && (
                            <span title={t('mcpDetail.namespaceVerified', { defaultValue: 'Namespace verified by official registry' })} className="text-emerald-600">
                                <ShieldCheck size={16} />
                            </span>
                        )}
                        {server.version && (
                            <span className="text-xs text-text-secondary">v{server.version}</span>
                        )}
                    </div>
                    <div className="text-xs text-text-secondary font-mono break-all">{server.id}</div>
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
                                <div key={i} className="rounded-lg border border-border bg-bg p-2.5">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <span className="text-xs font-semibold text-accent uppercase">{p.registryType}</span>
                                        {p.runtimeHint && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-input text-text-secondary">
                                                {p.runtimeHint}
                                            </span>
                                        )}
                                    </div>
                                    <div className="font-mono text-xs break-all">{p.identifier}</div>
                                    {p.version && (
                                        <div className="text-[10px] text-text-secondary mt-0.5">v{p.version}</div>
                                    )}
                                </div>
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

                {/* Verification */}
                <Section title={t('mcpDetail.verification', { defaultValue: 'Verification' })}>
                    <div className="space-y-1 text-xs">
                        <VerificationRow
                            label={t('mcpFilters.namespaceVerified', { defaultValue: 'Namespace verified' })}
                            value={!!server.namespaceVerified}
                        />
                        <VerificationRow
                            label={t('mcpFilters.imageVerified', { defaultValue: 'Docker-signed' })}
                            value={!!server.imageVerified}
                        />
                        <VerificationRow
                            label={t('mcpFilters.directoryVerified', { defaultValue: 'Directory-listed' })}
                            value={!!server.directoryVerified}
                        />
                    </div>
                </Section>

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
                {value ? '✓' : '—'}
            </span>
        </div>
    );
}
