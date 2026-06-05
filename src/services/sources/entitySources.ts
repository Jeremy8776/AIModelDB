/**
 * Data-source catalogs for the MCP and Skills entities.
 *
 * Mirrors how Models exposes toggleable data sources. Sources marked
 * `available` are wired to a fetcher and gate their sync on the matching
 * settings toggle; `planned` sources are surfaced in the UI (so users can
 * see what's coming) but rendered disabled until a fetcher lands.
 */

export interface EntitySource {
    key: string;
    label: string;
    description: string;
    status: 'available' | 'planned';
}

export const MCP_SOURCES: EntitySource[] = [
    {
        key: 'mcp-registry',
        label: 'Official MCP Registry',
        description: 'registry.modelcontextprotocol.io — canonical, ~9,600 servers, no key.',
        status: 'available',
    },
    {
        key: 'docker',
        label: 'Docker MCP Registry',
        description: 'Docker-signed, security-reviewed servers.',
        status: 'planned',
    },
    {
        key: 'github',
        label: 'GitHub Topics',
        description: 'Repos tagged mcp-server / modelcontextprotocol.',
        status: 'planned',
    },
    {
        key: 'packages',
        label: 'npm + PyPI',
        description: 'Authoritative install metadata from package registries.',
        status: 'planned',
    },
    {
        key: 'smithery',
        label: 'Smithery',
        description: 'Marketplace with semantic search and verified flags.',
        status: 'planned',
    },
    {
        key: 'glama',
        label: 'Glama',
        description: 'Largest community index (30k+) with quality scoring.',
        status: 'planned',
    },
];

export const SKILL_SOURCES: EntitySource[] = [
    {
        key: 'claude-plugins-official',
        label: 'Claude Plugins Marketplace',
        description: 'anthropics/claude-plugins-official — the official directory.',
        status: 'available',
    },
    {
        key: 'anthropic-skills',
        label: 'Anthropic Skills',
        description: 'Official Claude skills (canvas, pdf, docx, xlsx, …).',
        status: 'planned',
    },
    {
        key: 'cowork-plugins',
        label: 'Cowork Plugins',
        description: 'knowledge-work-plugins (brand-voice, productivity, …).',
        status: 'planned',
    },
    {
        key: 'huggingface-skills',
        label: 'Hugging Face',
        description: 'Community skills published on the Hub.',
        status: 'planned',
    },
    {
        key: 'github-skills',
        label: 'GitHub Topics',
        description: 'Repos tagged claude-code-skills / agent-skills.',
        status: 'planned',
    },
];

/** Default enabled state — only the wired ("available") sources start on. */
export const DEFAULT_MCP_SOURCES: Record<string, boolean> = Object.fromEntries(
    MCP_SOURCES.filter(s => s.status === 'available').map(s => [s.key, true])
);

export const DEFAULT_SKILL_SOURCES: Record<string, boolean> = Object.fromEntries(
    SKILL_SOURCES.filter(s => s.status === 'available').map(s => [s.key, true])
);
