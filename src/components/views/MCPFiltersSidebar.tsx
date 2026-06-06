import React from 'react';
import { useTranslation } from 'react-i18next';
import { ThemedSelect } from '../ThemedSelect';
import { RoundCheckbox } from '../RoundCheckbox';

/**
 * MCP Servers filter sidebar. Mirrors the visual conventions of the
 * Models FiltersSidebar (same card shell, same control sizing, same
 * spacing) but exposes filter fields that match MCP server metadata.
 */

export type MCPTransportFilter = 'all' | 'stdio' | 'streamable-http' | 'sse' | 'websocket';
export type MCPRegistryFilter = 'all' | 'npm' | 'pypi' | 'oci' | 'nuget' | 'other';
export type MCPVerifiedFilter = 'all' | 'namespace' | 'image' | 'directory';

export interface MCPFiltersSidebarProps {
    transport: MCPTransportFilter;
    onTransportChange: (v: MCPTransportFilter) => void;
    registry: MCPRegistryFilter;
    onRegistryChange: (v: MCPRegistryFilter) => void;
    verified: MCPVerifiedFilter;
    onVerifiedChange: (v: MCPVerifiedFilter) => void;
    favoritesOnly: boolean;
    onFavoritesOnlyChange: (v: boolean) => void;
    hasPackagesOnly: boolean;
    onHasPackagesOnlyChange: (v: boolean) => void;
    hasRemotesOnly: boolean;
    onHasRemotesOnlyChange: (v: boolean) => void;
    onClearFilters: () => void;
}

export function MCPFiltersSidebar({
    transport,
    onTransportChange,
    registry,
    onRegistryChange,
    verified,
    onVerifiedChange,
    favoritesOnly,
    onFavoritesOnlyChange,
    hasPackagesOnly,
    onHasPackagesOnlyChange,
    hasRemotesOnly,
    onHasRemotesOnlyChange,
    onClearFilters,
}: MCPFiltersSidebarProps) {
    const { t } = useTranslation();
    const bgCard = 'border-border bg-bg-card';
    const bgInput = 'border-border bg-bg-input';

    return (
        <aside className="w-full lg:w-72 flex-shrink-0 lg:sticky lg:top-[calc(var(--titlebar-h)_+_4rem)] lg:max-h-[calc(100vh-100px)] lg:self-start overflow-y-auto">
            <div className={`rounded-2xl border p-4 ${bgCard}`}>
                <div className="text-lg font-semibold mb-4 text-center">
                    {t('filters.title', { defaultValue: 'Filters' })}
                </div>

                {/* Favorites */}
                <div className="mb-4">
                    <div
                        onClick={() => onFavoritesOnlyChange(!favoritesOnly)}
                        className="flex items-center gap-3 cursor-pointer select-none group"
                    >
                        <RoundCheckbox checked={favoritesOnly} onChange={onFavoritesOnlyChange} />
                        <span className="text-sm font-medium text-text transition-colors">
                            {t('filters.favoritesOnly', { defaultValue: 'Favorites only' })}
                        </span>
                    </div>
                </div>

                {/* Has packages */}
                <div className="mb-4">
                    <div
                        onClick={() => onHasPackagesOnlyChange(!hasPackagesOnly)}
                        className="flex items-center gap-3 cursor-pointer select-none group"
                    >
                        <RoundCheckbox checked={hasPackagesOnly} onChange={onHasPackagesOnlyChange} />
                        <span className="text-sm font-medium text-text transition-colors">
                            {t('mcpFilters.hasPackages', { defaultValue: 'Installable packages' })}
                        </span>
                    </div>
                </div>

                {/* Has remotes */}
                <div className="mb-4">
                    <div
                        onClick={() => onHasRemotesOnlyChange(!hasRemotesOnly)}
                        className="flex items-center gap-3 cursor-pointer select-none group"
                    >
                        <RoundCheckbox checked={hasRemotesOnly} onChange={onHasRemotesOnlyChange} />
                        <span className="text-sm font-medium text-text transition-colors">
                            {t('mcpFilters.hasRemotes', { defaultValue: 'Has remote endpoints' })}
                        </span>
                    </div>
                </div>

                {/* Transport */}
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2 text-text">
                        {t('mcpFilters.transport', { defaultValue: 'Transport' })}
                    </label>
                    <ThemedSelect
                        value={transport}
                        onChange={(v) => onTransportChange(v as MCPTransportFilter)}
                        options={[
                            { value: 'all', label: t('common.all', { defaultValue: 'All' }) },
                            { value: 'stdio', label: 'stdio' },
                            { value: 'streamable-http', label: 'streamable-http' },
                            { value: 'sse', label: 'sse' },
                            { value: 'websocket', label: 'websocket' },
                        ]}
                    />
                </div>

                {/* Registry type */}
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2 text-text">
                        {t('mcpFilters.registry', { defaultValue: 'Package registry' })}
                    </label>
                    <ThemedSelect
                        value={registry}
                        onChange={(v) => onRegistryChange(v as MCPRegistryFilter)}
                        options={[
                            { value: 'all', label: t('common.all', { defaultValue: 'All' }) },
                            { value: 'npm', label: 'npm' },
                            { value: 'pypi', label: 'PyPI' },
                            { value: 'oci', label: 'OCI (Docker)' },
                            { value: 'nuget', label: 'NuGet' },
                            { value: 'other', label: t('common.other', { defaultValue: 'Other' }) },
                        ]}
                    />
                </div>

                {/* Provenance */}
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2 text-text">
                        {t('mcpFilters.verified', { defaultValue: 'Provenance' })}
                    </label>
                    <ThemedSelect
                        value={verified}
                        onChange={(v) => onVerifiedChange(v as MCPVerifiedFilter)}
                        options={[
                            { value: 'all', label: t('common.all', { defaultValue: 'All' }) },
                            { value: 'namespace', label: t('mcpFilters.namespaceVerified', { defaultValue: 'Publisher verified' }) },
                            { value: 'image', label: t('mcpFilters.imageVerified', { defaultValue: 'Docker signed' }) },
                            { value: 'directory', label: t('mcpFilters.directoryVerified', { defaultValue: 'Directory listed' }) },
                        ]}
                    />
                </div>

                <button
                    onClick={onClearFilters}
                    className={`w-full rounded-xl px-4 py-2 text-sm font-medium transition-colors ${bgInput} hover:bg-bg/10`}
                >
                    {t('filters.clearFilters', { defaultValue: 'Clear filters' })}
                </button>
            </div>
        </aside>
    );
}
