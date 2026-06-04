/**
 * Official MCP Registry fetcher (registry.modelcontextprotocol.io).
 *
 * Canonical source — REST API, no auth required, cursor-paginated.
 * Schema: https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json
 *
 * In Electron we proxy through the main process to avoid CORS issues; in
 * dev/web we hit the API directly.
 */

import { MCPServer, MCPPackage, MCPRemote, LicenseInfo } from '../../../../types';
import { isElectron } from '../../../../utils/electron';

const REGISTRY_BASE = 'https://registry.modelcontextprotocol.io';
const PAGE_SIZE = 100;

/**
 * Raw shape of an entry returned by the registry. Kept loose because the
 * registry evolves; we map to our canonical MCPServer at the seam.
 */
interface RawRegistryEntry {
    server: {
        $schema?: string;
        name: string;                          // canonical id, e.g. 'io.github.user/repo'
        title?: string;
        description?: string;
        version?: string;
        websiteUrl?: string;
        repository?: {
            url: string;
            source?: string;
            subfolder?: string;
        };
        packages?: Array<{
            registryType: string;
            registryBaseUrl?: string;
            identifier: string;
            version?: string;
            runtimeHint?: string;
            transport?: { type: string };
            runtimeArguments?: unknown[];
            environmentVariables?: Array<{
                name: string;
                description?: string;
                isRequired?: boolean;
                isSecret?: boolean;
                default?: string;
            }>;
        }>;
        remotes?: Array<{
            type: string;
            url?: string;
            headers?: Array<{
                name: string;
                isRequired?: boolean;
                isSecret?: boolean;
            }>;
        }>;
    };
    _meta?: {
        'io.modelcontextprotocol.registry/official'?: {
            status?: 'active' | 'deprecated' | 'deleted';
            statusChangedAt?: string;
            publishedAt?: string;
            updatedAt?: string;
            isLatest?: boolean;
        };
        [key: string]: unknown;
    };
}

interface RegistryResponse {
    servers: RawRegistryEntry[];
    metadata?: {
        nextCursor?: string;
        count?: number;
    };
}

// Sensible defaults for records missing license info — the registry doesn't
// guarantee a license field, so we mark as Custom/unknown until enriched.
const DEFAULT_LICENSE: LicenseInfo = {
    name: 'Unknown',
    type: 'Custom',
    commercial_use: true,
    attribution_required: false,
    share_alike: false,
    copyleft: false,
};

/**
 * Normalize a registryType string to our canonical union.
 */
function normalizeRegistryType(raw: string): MCPPackage['registryType'] {
    const r = raw.toLowerCase();
    if (r === 'npm' || r === 'pypi' || r === 'oci' || r === 'nuget') return r;
    return 'other';
}

/**
 * Normalize a remote/transport type string. The registry uses
 * 'streamable-http' as the modern canonical; older entries may say 'http'.
 */
function normalizeTransportType(raw: string): MCPRemote['type'] {
    const r = raw.toLowerCase();
    if (r === 'stdio' || r === 'sse' || r === 'streamable-http' || r === 'websocket') return r;
    if (r === 'http' || r === 'https') return 'streamable-http';
    return 'streamable-http';
}

/**
 * Normalize runtimeHint — registry uses values like 'npx', 'uvx', 'docker', etc.
 * Map common ones to our canonical runtime values; pass through the rest.
 */
function normalizeRuntimeHint(raw?: string): MCPPackage['runtimeHint'] {
    if (!raw) return null;
    const r = raw.toLowerCase();
    if (r === 'npx' || r === 'node') return 'node';
    if (r === 'uvx' || r === 'pip' || r === 'python' || r === 'python3') return 'python';
    if (r === 'docker' || r === 'docker-compose') return 'docker';
    return 'binary';
}

/**
 * Map a raw registry entry to our canonical MCPServer record.
 * Pulls the official _meta into both top-level verification flags and
 * a per-source _meta bag for forward-compat with non-official fields.
 */
export function mapRegistryEntryToMCPServer(raw: RawRegistryEntry): MCPServer {
    const s = raw.server;
    const official = raw._meta?.['io.modelcontextprotocol.registry/official'];

    const packages: MCPPackage[] | undefined = s.packages?.map(p => ({
        registryType: normalizeRegistryType(p.registryType),
        identifier: p.identifier,
        version: p.version ?? null,
        runtimeHint: normalizeRuntimeHint(p.runtimeHint),
        runtimeArguments: p.runtimeArguments,
    }));

    const remotes: MCPRemote[] | undefined = s.remotes?.map(r => ({
        type: normalizeTransportType(r.type),
        url: r.url ?? null,
        headers: r.headers,
    }));

    // The registry only confirms namespace verification (DNS or GitHub OAuth)
    // for active entries; deleted/deprecated still count as published-and-
    // verified at some point, so we flag any record reaching us as verified.
    const namespaceVerified = !!official && official.status !== 'deleted';

    return {
        id: s.name,
        name: s.title || s.name,
        description: s.description ?? null,
        version: s.version ?? null,
        repository: s.repository
            ? { url: s.repository.url, source: s.repository.source ?? 'github' }
            : null,
        websiteUrl: s.websiteUrl ?? null,
        packages,
        remotes,
        // The registry doesn't enumerate capabilities (those come from the
        // server at runtime); leave undefined unless enriched.
        capabilities: undefined,
        source: 'mcp-registry',
        publishedAt: official?.publishedAt ?? null,
        updatedAt: official?.updatedAt ?? null,
        namespaceVerified,
        imageVerified: false,
        directoryVerified: false,
        license: DEFAULT_LICENSE,
        tags: [],
        downloads: null,
        isFavorite: false,
        editedFields: [],
        _meta: raw._meta,
    };
}

/**
 * Cross-environment fetch helper. In packaged Electron we proxy via the
 * main process so cross-origin requests work; in dev/web we hit the API
 * directly (the registry has permissive CORS for browser dev).
 */
async function fetchJson<T>(url: string): Promise<T> {
    if (isElectron() && window.electronAPI?.proxyRequest) {
        const res = await window.electronAPI.proxyRequest({ method: 'GET', url });
        if (!res.success) {
            throw new Error(res.error || 'MCP registry proxy request failed');
        }
        return (typeof res.data === 'string' ? JSON.parse(res.data) : res.data) as T;
    }
    const r = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!r.ok) {
        throw new Error(`MCP registry request failed: ${r.status} ${r.statusText}`);
    }
    return (await r.json()) as T;
}

export interface FetchOptions {
    /** Soft cap on total servers fetched (across pages). Default: no cap. */
    maxServers?: number;
    /** Per-page size hint (capped at 100 by the registry). */
    pageSize?: number;
    /** Optional callback after each page; useful for streaming UI updates. */
    onPage?: (servers: MCPServer[], pageIndex: number) => void;
    /** Optional abort signal for cancellation mid-pagination. */
    abortSignal?: AbortSignal;
}

/**
 * Fetch all MCP servers from the official registry. Paginates via the
 * `nextCursor` returned in the metadata envelope.
 */
export async function fetchOfficialMCPRegistry(
    options: FetchOptions = {}
): Promise<MCPServer[]> {
    const pageSize = Math.min(options.pageSize ?? PAGE_SIZE, 100);
    const maxServers = options.maxServers ?? Number.POSITIVE_INFINITY;

    const all: MCPServer[] = [];
    let cursor: string | undefined = undefined;
    let pageIndex = 0;

    while (all.length < maxServers) {
        if (options.abortSignal?.aborted) {
            throw new DOMException('MCP registry fetch aborted', 'AbortError');
        }

        const params = new URLSearchParams({ limit: String(pageSize) });
        if (cursor) params.set('cursor', cursor);
        const url = `${REGISTRY_BASE}/v0/servers?${params.toString()}`;

        const data: RegistryResponse = await fetchJson(url);
        const mapped = data.servers.map(mapRegistryEntryToMCPServer);
        all.push(...mapped);
        if (options.onPage) options.onPage(mapped, pageIndex);

        cursor = data.metadata?.nextCursor;
        pageIndex++;

        if (!cursor) break;
    }

    return all.slice(0, maxServers);
}
