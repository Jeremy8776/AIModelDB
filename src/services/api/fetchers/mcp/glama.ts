/**
 * Glama MCP fetcher (glama.ai).
 *
 * Glama runs one of the largest community MCP indexes. Its REST API is public
 * and unauthenticated:
 *
 *   GET https://glama.ai/api/mcp/v1/servers?first=100[&after=<cursor>]
 *
 * Response is cursor-paginated:
 *   { pageInfo: { endCursor, hasNextPage, ... }, servers: [ ... ] }
 *
 * Each server carries a stable id, namespace, slug, description, repository.url,
 * an optional spdxLicense, and (on some records) attributes/tools. We map to our
 * canonical MCPServer, preferring a reverse-DNS GitHub id derived from the
 * repository URL so the same server merges with the official registry / github
 * / npm sources; we fall back to a glama-namespaced id only when no repo exists.
 */

import { MCPServer, LicenseInfo } from '../../../../types';
import { isElectron } from '../../../../utils/electron';

const GLAMA_BASE = 'https://glama.ai/api/mcp/v1/servers';
const PAGE_SIZE = 100;

const DEFAULT_LICENSE: LicenseInfo = {
    name: 'Unknown',
    type: 'Custom',
    commercial_use: true,
    attribution_required: false,
    share_alike: false,
    copyleft: false,
};

/**
 * Raw Glama server shape. Kept loose — Glama enriches detail pages with more
 * than the list endpoint returns, so most optional fields may be null/empty.
 */
interface GlamaServer {
    id: string;
    name?: string;
    slug?: string;
    namespace?: string;
    description?: string | null;
    url?: string | null;                 // glama listing page
    repository?: { url?: string | null } | null;
    spdxLicense?: { name?: string | null; url?: string | null } | string | null;
    attributes?: string[];
    tools?: Array<{ name?: string }>;
    environmentVariablesJsonSchema?: unknown;
}

interface GlamaResponse {
    pageInfo?: {
        endCursor?: string | null;
        hasNextPage?: boolean;
        startCursor?: string | null;
        hasPreviousPage?: boolean;
    };
    servers?: GlamaServer[];
}

/**
 * Extract `owner/repo` from a GitHub repository URL. Returns null for non-GitHub
 * or unparseable URLs so callers can fall back to a glama-namespaced id.
 */
function gitHubOwnerRepo(url: string | null | undefined): { owner: string; repo: string } | null {
    if (!url) return null;
    const m = url.match(/github\.com[/:]([^/]+)\/([^/#?]+)/i);
    if (!m) return null;
    const owner = m[1];
    const repo = m[2].replace(/\.git$/i, '');
    if (!owner || !repo) return null;
    return { owner, repo };
}

/** Normalize the spdxLicense union into a license name string (or null). */
function licenseName(spdx: GlamaServer['spdxLicense']): string | null {
    if (!spdx) return null;
    if (typeof spdx === 'string') return spdx || null;
    return spdx.name || null;
}

/**
 * Map a raw Glama server to our canonical MCPServer.
 *
 * Identity: prefer `io.github.<owner>/<repo>` (lowercased) from the repository
 * URL so records merge with registry/github/npm. Without a GitHub repo we fall
 * back to `ai.glama.<namespace>/<slug>` which is still stable across syncs.
 */
export function mapGlamaServerToMCPServer(raw: GlamaServer): MCPServer {
    const repoUrl = raw.repository?.url ?? null;
    const gh = gitHubOwnerRepo(repoUrl);
    const slug = raw.slug || raw.id;
    const ns = (raw.namespace || 'glama').toLowerCase();
    const id = gh
        ? `io.github.${gh.owner}/${gh.repo}`.toLowerCase()
        : `ai.glama.${ns}/${slug}`.toLowerCase();

    const name = raw.name || slug;
    const license = licenseName(raw.spdxLicense);
    const spdx = typeof raw.spdxLicense === 'object' && raw.spdxLicense ? raw.spdxLicense : null;

    // Glama exposes capabilities indirectly: a non-empty tools[] means the
    // server advertises tools. We surface that as the canonical "tools"
    // capability rather than fabricating resources/prompts.
    const capabilities = raw.tools && raw.tools.length > 0 ? ['tools'] : undefined;

    return {
        id,
        name,
        description: raw.description ?? null,
        version: null,
        repository: repoUrl ? { url: repoUrl, source: 'github' } : null,
        websiteUrl: null,
        packages: undefined,
        remotes: undefined,
        capabilities,
        source: 'glama',
        publishedAt: null,
        updatedAt: null,
        namespaceVerified: false,
        imageVerified: false,
        // Glama is a curated directory — listing here is a directory signal.
        directoryVerified: true,
        license: license
            ? { ...DEFAULT_LICENSE, name: license, url: spdx?.url ?? null }
            : DEFAULT_LICENSE,
        tags: raw.attributes ?? [],
        downloads: null,
        isFavorite: false,
        editedFields: [],
        _meta: {
            'ai.glama': {
                glamaId: raw.id,
                slug: raw.slug,
                namespace: raw.namespace,
                url: raw.url,
                toolCount: raw.tools?.length ?? 0,
            },
        },
    };
}

async function fetchJson<T>(url: string): Promise<T> {
    if (isElectron() && window.electronAPI?.proxyRequest) {
        const res = await window.electronAPI.proxyRequest({
            method: 'GET',
            url,
            headers: { Accept: 'application/json' },
        });
        if (!res.success) throw new Error(res.error || 'Glama proxy request failed');
        return (typeof res.data === 'string' ? JSON.parse(res.data) : res.data) as T;
    }
    const r = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error(`Glama request failed: ${r.status} ${r.statusText}`);
    return (await r.json()) as T;
}

export interface GlamaFetchOptions {
    /** Soft cap on total servers fetched across pages. Default 1000. */
    maxServers?: number;
    /** Per-page size hint (Glama caps internally). Default 100. */
    pageSize?: number;
    /** Optional callback after each page; useful for streaming UI updates. */
    onPage?: (servers: MCPServer[], pageIndex: number) => void;
    abortSignal?: AbortSignal;
}

/**
 * Fetch MCP servers from Glama, following the `endCursor` pagination until the
 * cap is hit, the API reports no further pages, or the page returns empty.
 * Deduped by mapped id (repo-derived ids collapse duplicates across pages).
 */
export async function fetchMCPServersFromGlama(
    options: GlamaFetchOptions = {}
): Promise<MCPServer[]> {
    const pageSize = options.pageSize ?? PAGE_SIZE;
    const maxServers = options.maxServers ?? 1000;

    const seen = new Map<string, MCPServer>();
    let cursor: string | undefined;
    let pageIndex = 0;

    while (seen.size < maxServers) {
        if (options.abortSignal?.aborted) {
            throw new DOMException('Glama fetch aborted', 'AbortError');
        }

        const params = new URLSearchParams({ first: String(pageSize) });
        if (cursor) params.set('after', cursor);
        const url = `${GLAMA_BASE}?${params.toString()}`;

        const data: GlamaResponse = await fetchJson(url);
        const servers = data.servers ?? [];
        if (servers.length === 0) break;

        const mapped: MCPServer[] = [];
        for (const raw of servers) {
            const server = mapGlamaServerToMCPServer(raw);
            if (!seen.has(server.id)) {
                seen.set(server.id, server);
                mapped.push(server);
            }
        }
        if (options.onPage && mapped.length > 0) options.onPage(mapped, pageIndex);

        pageIndex++;
        const next = data.pageInfo?.endCursor;
        if (!data.pageInfo?.hasNextPage || !next) break;
        cursor = next;
    }

    return Array.from(seen.values()).slice(0, maxServers);
}
