/**
 * PyPI MCP fetcher (pypi.org).
 *
 * PyPI removed its XML-RPC keyword search and never shipped a JSON search API,
 * so we can't mirror npm's `?text=keyword` query directly. Instead we use two
 * supported, unauthenticated public APIs:
 *
 *   1. Simple Index (PEP 691):  GET https://pypi.org/simple/
 *      → { projects: [{ name }, ...] } for every project on PyPI (one request).
 *      We filter names to the `mcp-server` / `mcp_server` token pattern.
 *
 *   2. Per-package JSON:        GET https://pypi.org/pypi/<name>/json
 *      → full metadata (version, summary, license, project_urls, releases).
 *      We enrich a bounded number of the filtered candidates so the sync stays
 *      fast and polite — a name-only record has no repo/license and would just
 *      be noise.
 *
 * Each enriched package maps to an MCPServer with a pre-filled `packages[]`
 * entry so the user gets `uvx <name>` for free in the Quick Start panel. When a
 * GitHub repository URL is present we derive a reverse-DNS `io.github.*` id so
 * the record merges with the official registry / github / npm sources.
 */

import { MCPServer, MCPPackage, LicenseInfo } from '../../../../types';
import { isElectron } from '../../../../utils/electron';

const SIMPLE_INDEX_URL = 'https://pypi.org/simple/';
const PACKAGE_JSON_BASE = 'https://pypi.org/pypi';
const SIMPLE_ACCEPT = 'application/vnd.pypi.simple.v1+json';

// Token pattern that signals "this is an MCP server" rather than an unrelated
// package that merely contains "mcp" (e.g. a company acronym). Requires the
// explicit `mcp-server` / `mcp_server` token in the project name.
const MCP_NAME_PATTERN = /(?:^mcp[-_]server)|(?:[-_]mcp[-_]server)/i;

const DEFAULT_LICENSE: LicenseInfo = {
    name: 'Unknown',
    type: 'Custom',
    commercial_use: true,
    attribution_required: false,
    share_alike: false,
    copyleft: false,
};

interface SimpleIndexResponse {
    projects?: Array<{ name: string }>;
}

interface PyPIInfo {
    name: string;
    version?: string;
    summary?: string | null;
    description?: string | null;
    home_page?: string | null;
    license?: string | null;
    license_expression?: string | null;
    classifiers?: string[];
    keywords?: string | string[] | null;
    project_urls?: Record<string, string> | null;
    author?: string | null;
}

interface PyPIReleaseFile {
    upload_time_iso_8601?: string;
}

interface PyPIPackageResponse {
    info: PyPIInfo;
    releases?: Record<string, PyPIReleaseFile[]>;
}

/**
 * Resolve a human license name from the messy PyPI license fields, in priority
 * order: explicit `license_expression` (SPDX), then a `License :: OSI Approved`
 * classifier, then the freeform `license` field (truncated if it's a full
 * license body rather than a short name).
 */
function resolveLicense(info: PyPIInfo): string | null {
    if (info.license_expression) return info.license_expression;

    const osi = (info.classifiers || []).find(c => c.startsWith('License :: OSI Approved :: '));
    if (osi) {
        const name = osi.replace('License :: OSI Approved :: ', '').replace(/ License$/, '');
        if (name) return name;
    }
    const other = (info.classifiers || []).find(c => c.startsWith('License :: ') && c !== 'License :: OSI Approved');
    if (other) {
        const name = other.replace('License :: ', '');
        if (name && !name.startsWith('OSI Approved')) return name;
    }

    const raw = (info.license || '').trim();
    if (raw && raw.length <= 60 && !raw.includes('\n')) return raw;
    return null;
}

/** Pick a repository URL from project_urls (Repository/Source/Homepage) or home_page. */
function resolveRepository(info: PyPIInfo): string | null {
    const urls = info.project_urls || {};
    // Prefer keys that explicitly mean "source code".
    for (const [key, value] of Object.entries(urls)) {
        const k = key.toLowerCase();
        if ((k === 'repository' || k === 'source' || k === 'source code' || k === 'github') && value) {
            return value;
        }
    }
    // Then any github.com homepage.
    for (const value of Object.values(urls)) {
        if (typeof value === 'string' && /github\.com/i.test(value)) return value;
    }
    if (info.home_page && /github\.com/i.test(info.home_page)) return info.home_page;
    return null;
}

/** Extract `owner/repo` from a GitHub URL, else null. */
function gitHubOwnerRepo(url: string | null): { owner: string; repo: string } | null {
    if (!url) return null;
    const m = url.match(/github\.com[/:]([^/]+)\/([^/#?]+)/i);
    if (!m) return null;
    const repo = m[2].replace(/\.git$/i, '');
    if (!m[1] || !repo) return null;
    return { owner: m[1], repo };
}

function normalizeKeywords(keywords: PyPIInfo['keywords']): string[] {
    if (!keywords) return [];
    if (Array.isArray(keywords)) return keywords.filter(Boolean);
    // PyPI keywords are usually a comma- or space-separated string.
    return keywords.split(/[,\s]+/).map(k => k.trim()).filter(Boolean);
}

/** Latest release upload timestamp for the current version (or null). */
function latestUploadTime(data: PyPIPackageResponse): string | null {
    const version = data.info.version;
    if (!version) return null;
    const files = data.releases?.[version];
    if (!files || files.length === 0) return null;
    return files[0].upload_time_iso_8601 ?? null;
}

/**
 * Map a per-package PyPI JSON response to our canonical MCPServer.
 *
 * Identity: prefer `io.github.<owner>/<repo>` from a GitHub project URL so the
 * record merges with registry/github/npm; otherwise `io.pypi.<name>` (PyPI
 * names are globally unique, so this is stable).
 */
export function mapPyPIPackageToMCPServer(data: PyPIPackageResponse): MCPServer {
    const info = data.info;
    const repoUrl = resolveRepository(info);
    const gh = gitHubOwnerRepo(repoUrl);
    const id = gh
        ? `io.github.${gh.owner}/${gh.repo}`.toLowerCase()
        : `io.pypi.${info.name}`.toLowerCase();

    const pkg: MCPPackage = {
        registryType: 'pypi',
        identifier: info.name,
        version: info.version ?? null,
        runtimeHint: 'python',
        transport: { type: 'stdio' },
    };

    const license = resolveLicense(info);
    const uploaded = latestUploadTime(data);
    const homepage = info.project_urls?.Homepage || info.home_page || null;

    return {
        id,
        name: info.name,
        description: info.summary ?? null,
        version: info.version ?? null,
        repository: repoUrl ? { url: repoUrl, source: 'github' } : null,
        websiteUrl: homepage,
        packages: [pkg],
        remotes: undefined,
        capabilities: undefined,
        source: 'pypi',
        publishedAt: uploaded,
        updatedAt: uploaded,
        namespaceVerified: false,
        imageVerified: false,
        directoryVerified: false,
        license: license
            ? { ...DEFAULT_LICENSE, name: license }
            : DEFAULT_LICENSE,
        tags: normalizeKeywords(info.keywords),
        downloads: null,
        isFavorite: false,
        editedFields: [],
        _meta: {
            'io.pypi': {
                pypiName: info.name,
                pypiUrl: `https://pypi.org/project/${info.name}/`,
                author: info.author ?? null,
            },
        },
    };
}

async function fetchJson<T>(url: string, accept: string): Promise<T> {
    if (isElectron() && window.electronAPI?.proxyRequest) {
        const res = await window.electronAPI.proxyRequest({
            method: 'GET',
            url,
            headers: { Accept: accept },
        });
        if (!res.success) throw new Error(res.error || 'PyPI proxy request failed');
        return (typeof res.data === 'string' ? JSON.parse(res.data) : res.data) as T;
    }
    const r = await fetch(url, { headers: { Accept: accept } });
    if (!r.ok) throw new Error(`PyPI request failed: ${r.status} ${r.statusText}`);
    return (await r.json()) as T;
}

/** Fetch all project names from the Simple Index, filtered to MCP-server names. */
async function fetchCandidateNames(abortSignal?: AbortSignal): Promise<string[]> {
    if (abortSignal?.aborted) throw new DOMException('PyPI fetch aborted', 'AbortError');
    const data = await fetchJson<SimpleIndexResponse>(SIMPLE_INDEX_URL, SIMPLE_ACCEPT);
    const names = (data.projects || [])
        .map(p => p.name)
        .filter(name => MCP_NAME_PATTERN.test(name));
    // Deterministic order so a capped run is reproducible across syncs.
    names.sort((a, b) => a.localeCompare(b));
    return names;
}

export interface PyPIFetchOptions {
    /**
     * Max packages to enrich via per-package JSON. The Simple Index returns
     * thousands of `mcp-server` name matches; we enrich a bounded slice to keep
     * the sync fast and avoid hammering PyPI. Default 120.
     */
    maxPackages?: number;
    /** Concurrency for per-package JSON fetches. Default 6. */
    concurrency?: number;
    /** Optional callback after each enriched batch; useful for streaming UI. */
    onPage?: (servers: MCPServer[]) => void;
    abortSignal?: AbortSignal;
}

/**
 * Enumerate MCP-server packages on PyPI via the Simple Index, then enrich a
 * bounded number through the per-package JSON API. Deduped by mapped id so a
 * package whose GitHub repo is also surfaced by another source merges cleanly.
 */
export async function fetchMCPServersFromPyPI(
    options: PyPIFetchOptions = {}
): Promise<MCPServer[]> {
    const maxPackages = options.maxPackages ?? 120;
    const concurrency = Math.max(1, options.concurrency ?? 6);

    const candidates = (await fetchCandidateNames(options.abortSignal)).slice(0, maxPackages);
    const seen = new Map<string, MCPServer>();

    // Bounded worker pool over the candidate names — keeps PyPI happy and lets
    // us bail promptly on abort.
    let cursor = 0;
    const worker = async () => {
        while (cursor < candidates.length) {
            if (options.abortSignal?.aborted) {
                throw new DOMException('PyPI fetch aborted', 'AbortError');
            }
            const name = candidates[cursor++];
            try {
                const data = await fetchJson<PyPIPackageResponse>(
                    `${PACKAGE_JSON_BASE}/${encodeURIComponent(name)}/json`,
                    'application/json'
                );
                if (!data?.info?.name) continue;
                const server = mapPyPIPackageToMCPServer(data);
                if (!seen.has(server.id)) {
                    seen.set(server.id, server);
                    if (options.onPage) options.onPage([server]);
                }
            } catch (err) {
                // A single 404/yanked package shouldn't abort the whole run.
                if (err instanceof DOMException && err.name === 'AbortError') throw err;
                console.warn(`[MCP/PyPI] Package "${name}" failed:`, err);
            }
        }
    };

    await Promise.all(Array.from({ length: Math.min(concurrency, candidates.length) }, worker));

    return Array.from(seen.values());
}
