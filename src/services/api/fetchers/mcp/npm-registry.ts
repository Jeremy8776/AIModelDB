/**
 * npm Registry MCP fetcher.
 *
 * Searches the public npm registry for packages matching MCP keywords. Most
 * MCP servers are published under `@modelcontextprotocol/*` or use the
 * `mcp-server` keyword — both surface via the search endpoint without auth.
 *
 * Returns each package as an MCPServer with a pre-filled `packages[]` entry
 * so the user gets `npx -y <id>` for free in the Quick Start panel.
 */

import { MCPServer, MCPPackage, LicenseInfo } from '../../../../types';
import { isElectron } from '../../../../utils/electron';

const NPM_SEARCH_URL = 'https://registry.npmjs.org/-/v1/search';
const QUERIES = [
    'keywords:mcp-server',
    'keywords:modelcontextprotocol',
    '@modelcontextprotocol',
];

const DEFAULT_LICENSE: LicenseInfo = {
    name: 'Unknown',
    type: 'Custom',
    commercial_use: true,
    attribution_required: false,
    share_alike: false,
    copyleft: false,
};

interface NpmSearchObject {
    package: {
        name: string;
        version?: string;
        description?: string;
        keywords?: string[];
        date?: string;
        links?: {
            npm?: string;
            homepage?: string;
            repository?: string;
        };
        author?: { name?: string };
        publisher?: { username?: string };
        maintainers?: Array<{ username?: string }>;
        license?: string;
    };
    score?: { final?: number };
}

interface NpmSearchResponse {
    objects: NpmSearchObject[];
    total?: number;
    time?: string;
}

async function fetchPage(query: string, from: number, size: number): Promise<NpmSearchObject[]> {
    const url = `${NPM_SEARCH_URL}?text=${encodeURIComponent(query)}&size=${size}&from=${from}`;
    if (isElectron() && window.electronAPI?.proxyRequest) {
        const res = await window.electronAPI.proxyRequest({
            method: 'GET',
            url,
            headers: { Accept: 'application/json' },
        });
        if (!res.success) throw new Error(res.error || 'npm search proxy failed');
        const data = (typeof res.data === 'string' ? JSON.parse(res.data) : res.data) as NpmSearchResponse;
        return data.objects || [];
    }
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`npm search failed: ${res.status} ${res.statusText}`);
    const data = (await res.json()) as NpmSearchResponse;
    return data.objects || [];
}

function npmObjectToMCPServer(obj: NpmSearchObject): MCPServer {
    const p = obj.package;
    const owner = (p.publisher?.username || p.maintainers?.[0]?.username || 'npm').toLowerCase();
    const cleanName = p.name.replace(/^@/, '').replace(/\//g, '-');
    const id = `io.npm.${owner}/${cleanName}`.toLowerCase();

    const pkg: MCPPackage = {
        registryType: 'npm',
        identifier: p.name,
        version: p.version ?? null,
        runtimeHint: 'node',
        transport: { type: 'stdio' },
    };

    const licenseName = p.license || 'Unknown';

    return {
        id,
        name: p.name,
        description: p.description ?? null,
        version: p.version ?? null,
        repository: p.links?.repository
            ? { url: p.links.repository, source: 'github' }
            : null,
        websiteUrl: p.links?.homepage ?? null,
        packages: [pkg],
        remotes: undefined,
        capabilities: undefined,
        source: 'npm',
        publishedAt: null,
        updatedAt: p.date ?? null,
        namespaceVerified: false,
        imageVerified: false,
        directoryVerified: false,
        license: licenseName === 'Unknown'
            ? DEFAULT_LICENSE
            : { ...DEFAULT_LICENSE, name: licenseName },
        tags: p.keywords ?? [],
        downloads: null,
        isFavorite: false,
        editedFields: [],
        _meta: {
            'io.npm': {
                npmUrl: p.links?.npm,
                score: obj.score?.final,
            },
        },
    };
}

export interface NpmFetchOptions {
    /** Cap on total packages returned across queries. Default 500. */
    maxPackages?: number;
    abortSignal?: AbortSignal;
}

/**
 * Run the npm searches in parallel, dedupe by package name, and map each hit
 * to an MCPServer record.
 */
export async function fetchMCPServersFromNpm(
    options: NpmFetchOptions = {}
): Promise<MCPServer[]> {
    const maxPackages = options.maxPackages ?? 500;
    const seen = new Map<string, MCPServer>();

    const fetchAll = QUERIES.map(async (query) => {
        try {
            // npm caps each page at 250; one page is plenty for most queries.
            const objects = await fetchPage(query, 0, 250);
            return objects;
        } catch (err) {
            console.warn(`[MCP/npm] Query "${query}" failed:`, err);
            return [];
        }
    });

    const results = await Promise.all(fetchAll);
    for (const objects of results) {
        if (options.abortSignal?.aborted) {
            throw new DOMException('npm fetch aborted', 'AbortError');
        }
        for (const obj of objects) {
            if (seen.size >= maxPackages) break;
            const server = npmObjectToMCPServer(obj);
            if (!seen.has(server.id)) {
                seen.set(server.id, server);
            }
        }
    }

    return Array.from(seen.values());
}
