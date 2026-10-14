import { MCPServer, Skill } from '../types';
import {
    isUnsafeObjectKey,
    mergeSafeMeta,
    mergeSourceStrings,
    normalizePackageId,
    normalizeRepoUrl,
    sanitizeMeta,
} from './sourceHelpers';
import { validateMCPServers, validateSkills } from '../services/api/schemas';

const hasValue = <T>(value: T): boolean => value !== null && value !== undefined && value !== '';

const MCP_EDITABLE_FIELDS = new Set<keyof MCPServer>([
    'name',
    'description',
    'version',
    'repository',
    'websiteUrl',
    'packages',
    'remotes',
    'capabilities',
    'publishedAt',
    'updatedAt',
    'license',
    'tags',
    'downloads',
]);

const SKILL_EDITABLE_FIELDS = new Set<keyof Skill>([
    'name',
    'description',
    'type',
    'origin',
    'family',
    'triggers',
    'capabilities',
    'requires',
    'install_command',
    'source_repo',
    'redistributable',
    'license',
    'tags',
    'updated_at',
]);

function safeEditedFields<T extends string>(fields: string[] | undefined, allowed: Set<T>): T[] {
    const out: T[] = [];
    const seen = new Set<string>();
    for (const field of fields || []) {
        if (isUnsafeObjectKey(field)) continue;
        if (!allowed.has(field as T)) continue;
        if (seen.has(field)) continue;
        seen.add(field);
        out.push(field as T);
    }
    return out;
}

function mcpPackageKeys(server: MCPServer): string[] {
    return (server.packages || [])
        .map(pkg => {
            const id = normalizePackageId(pkg.identifier);
            if (!id) return '';
            return `${(pkg.registryType || 'other').toLowerCase()}|${id}`;
        })
        .filter(Boolean);
}

export function matchMCPIndex(arr: MCPServer[], incoming: MCPServer): number {
    if (incoming.id) {
        const incomingId = incoming.id.toLowerCase();
        const idMatch = arr.findIndex(existing => existing.id?.toLowerCase() === incomingId);
        if (idMatch !== -1) return idMatch;
    }

    const incomingRepo = normalizeRepoUrl(incoming.repository?.url);
    if (incomingRepo) {
        const repoMatch = arr.findIndex(existing => normalizeRepoUrl(existing.repository?.url) === incomingRepo);
        if (repoMatch !== -1) return repoMatch;
    }

    const incomingPackageKeys = mcpPackageKeys(incoming);
    if (incomingPackageKeys.length > 0) {
        const packageSet = new Set(incomingPackageKeys);
        const packageMatch = arr.findIndex(existing => mcpPackageKeys(existing).some(key => packageSet.has(key)));
        if (packageMatch !== -1) return packageMatch;
    }

    return -1;
}

export function mergeMCPRecords(existing: MCPServer, incoming: MCPServer): MCPServer {
    const existingEdited = safeEditedFields(existing.editedFields, MCP_EDITABLE_FIELDS);
    const incomingEdited = safeEditedFields(incoming.editedFields, MCP_EDITABLE_FIELDS);
    const editedFields = Array.from(new Set([...existingEdited, ...incomingEdited]));
    const isProtected = (field: keyof MCPServer) => existingEdited.includes(field);
    const pick = <K extends keyof MCPServer>(field: K, existingVal: MCPServer[K], incomingVal: MCPServer[K]): MCPServer[K] =>
        isProtected(field) ? existingVal : (hasValue(incomingVal) ? incomingVal : existingVal);

    const merged: MCPServer = { ...existing };
    merged.id = existing.id;
    merged.name = isProtected('name') ? existing.name : existing.name || incoming.name;
    merged.source = mergeSourceStrings(existing.source, incoming.source);
    merged.description = pick('description', existing.description, incoming.description);
    merged.version = pick('version', existing.version, incoming.version);
    merged.websiteUrl = pick('websiteUrl', existing.websiteUrl, incoming.websiteUrl);
    merged.repository = isProtected('repository') ? existing.repository : (existing.repository || incoming.repository);
    merged.publishedAt = pick('publishedAt', existing.publishedAt, incoming.publishedAt);
    merged.updatedAt = pick('updatedAt', existing.updatedAt, incoming.updatedAt);

    if (!isProtected('downloads')) {
        const maxDownloads = Math.max(existing.downloads ?? 0, incoming.downloads ?? 0);
        merged.downloads = maxDownloads > 0 ? maxDownloads : (existing.downloads ?? incoming.downloads ?? null);
    }

    if (!isProtected('license')) {
        const existingKnown = existing.license?.name && existing.license.name !== 'Unknown';
        merged.license = existingKnown ? existing.license : (incoming.license || existing.license);
    }

    if (!isProtected('tags')) {
        merged.tags = Array.from(new Set([...(existing.tags || []), ...(incoming.tags || [])]));
    }
    if (!isProtected('capabilities')) {
        const capabilities = Array.from(new Set([...(existing.capabilities || []), ...(incoming.capabilities || [])]));
        merged.capabilities = capabilities.length > 0 ? capabilities : undefined;
    }
    if (!isProtected('packages')) {
        type Package = NonNullable<MCPServer['packages']>[number];
        const packages = new Map<string, Package>();
        for (const pkg of [...(existing.packages || []), ...(incoming.packages || [])]) {
            const key = `${(pkg.registryType || 'other').toLowerCase()}|${normalizePackageId(pkg.identifier)}`;
            if (!packages.has(key)) packages.set(key, pkg);
        }
        merged.packages = packages.size > 0 ? Array.from(packages.values()) : undefined;
    }
    if (!isProtected('remotes')) {
        type Remote = NonNullable<MCPServer['remotes']>[number];
        const remotes = new Map<string, Remote>();
        for (const remote of [...(existing.remotes || []), ...(incoming.remotes || [])]) {
            const key = `${remote.type}|${normalizeRepoUrl(remote.url)}`;
            if (!remotes.has(key)) remotes.set(key, remote);
        }
        merged.remotes = remotes.size > 0 ? Array.from(remotes.values()) : undefined;
    }

    merged.namespaceVerified = Boolean(existing.namespaceVerified || incoming.namespaceVerified);
    merged.imageVerified = Boolean(existing.imageVerified || incoming.imageVerified);
    merged.directoryVerified = Boolean(existing.directoryVerified || incoming.directoryVerified);
    merged._meta = mergeSafeMeta(existing._meta, incoming._meta);
    merged.isFavorite = existing.isFavorite ?? incoming.isFavorite;
    merged.editedFields = editedFields;
    return merged;
}

/** Smallest index wins: mirrors `findIndex` returning the first match in array order. */
function setFirst(map: Map<string, number>, key: string | null | undefined, index: number) {
    if (!key) return;
    const current = map.get(key);
    if (current === undefined || index < current) map.set(key, index);
}

/**
 * Hash lookups equivalent to `matchMCPIndex` (id, then repo, then package keys),
 * so merging M servers into N is O(N + M) instead of O(N*M). Repo and package keys
 * can change when two records merge, so a hit is re-verified against the live
 * record and, on the rare mismatch, we fall back to the linear scan.
 */
class MCPMatchIndex {
    private byId = new Map<string, number>();
    private byRepo = new Map<string, number>();
    private byPackage = new Map<string, number>();

    constructor(servers: MCPServer[]) {
        servers.forEach((server, index) => this.add(server, index));
    }

    add(server: MCPServer, index: number) {
        setFirst(this.byId, server.id?.toLowerCase(), index);
        setFirst(this.byRepo, normalizeRepoUrl(server.repository?.url), index);
        mcpPackageKeys(server).forEach(key => setFirst(this.byPackage, key, index));
    }

    find(base: MCPServer[], incoming: MCPServer): number {
        if (incoming.id) {
            const hit = this.byId.get(incoming.id.toLowerCase());
            if (hit !== undefined) return hit;
        }

        const incomingRepo = normalizeRepoUrl(incoming.repository?.url);
        if (incomingRepo) {
            const hit = this.byRepo.get(incomingRepo);
            if (hit !== undefined) {
                if (normalizeRepoUrl(base[hit].repository?.url) === incomingRepo) return hit;
                return matchMCPIndex(base, incoming);
            }
        }

        const incomingKeys = mcpPackageKeys(incoming);
        let best = -1;
        for (const key of incomingKeys) {
            const hit = this.byPackage.get(key);
            if (hit === undefined) continue;
            if (!mcpPackageKeys(base[hit]).includes(key)) return matchMCPIndex(base, incoming);
            if (best === -1 || hit < best) best = hit;
        }
        return best;
    }
}

function mergeCleanMCP(base: MCPServer[], incoming: MCPServer[]): MCPServer[] {
    const index = new MCPMatchIndex(base);
    for (const server of incoming) {
        const cleanServer: MCPServer = { ...server, editedFields: safeEditedFields(server.editedFields, MCP_EDITABLE_FIELDS), _meta: sanitizeMeta(server._meta) };
        const idx = index.find(base, cleanServer);
        if (idx === -1) {
            base.push(cleanServer);
            index.add(cleanServer, base.length - 1);
        } else {
            base[idx] = mergeMCPRecords(base[idx], cleanServer);
            index.add(base[idx], idx);
        }
    }
    return base;
}

const arrayOr = <T>(value: unknown, fallback: T[] | undefined): T[] | undefined => (Array.isArray(value) ? (value as T[]) : fallback);

/** Re-assert the array fields the UI maps over, which the schema normally guarantees. */
function cleanStoredMCP(server: MCPServer): MCPServer {
    return {
        ...server,
        tags: arrayOr<string>(server.tags, []) as string[],
        packages: arrayOr(server.packages, undefined),
        remotes: arrayOr(server.remotes, undefined),
        capabilities: arrayOr(server.capabilities, undefined),
        _meta: sanitizeMeta(server._meta),
    };
}

/** Merge two untrusted lists: both sides are schema-validated. Used for imports and tests. */
export function mergeMCPServerLists(existing: MCPServer[], incoming: MCPServer[]): MCPServer[] {
    return mergeCleanMCP(validateMCPServers(existing).map(cleanStoredMCP), validateMCPServers(incoming));
}

/**
 * Merge freshly fetched servers into a list that already went through this module
 * (state is always the output of one of these functions), so only the incoming side
 * is re-validated. Validating thousands of existing records per page was the main
 * cost of an MCP sync.
 */
export function appendMCPServers(trustedExisting: MCPServer[], incoming: MCPServer[]): MCPServer[] {
    return mergeCleanMCP([...trustedExisting], validateMCPServers(incoming));
}

/**
 * Load the persisted list at startup. Each record was schema-validated before it
 * was saved, so this only applies the structural guards that matter if the blob was
 * tampered with (shape, `_meta` and `editedFields` sanitising, duplicate ids)
 * instead of running the full schema over every record on the first render.
 */
export function restoreMCPServers(stored: unknown): MCPServer[] {
    if (!Array.isArray(stored)) return [];
    const records = stored.filter((item): item is MCPServer =>
        !!item && typeof item === 'object' && typeof (item as MCPServer).id === 'string' && typeof (item as MCPServer).name === 'string');
    return mergeCleanMCP([], records.map(cleanStoredMCP));
}

function skillRepoKey(skill: Skill): string {
    const repo = skill.source_repo;
    if (!repo?.owner || !repo.repo) return '';
    const path = (repo.path || '').replace(/^\/+|\/+$/g, '');
    return `${repo.owner}/${repo.repo}/${path}`.toLowerCase();
}

export function matchSkillIndex(arr: Skill[], incoming: Skill): number {
    if (incoming.id) {
        const incomingId = incoming.id.toLowerCase();
        const idMatch = arr.findIndex(existing => existing.id?.toLowerCase() === incomingId);
        if (idMatch !== -1) return idMatch;
    }

    const incomingRepo = skillRepoKey(incoming);
    if (incomingRepo) {
        const repoMatch = arr.findIndex(existing => skillRepoKey(existing) === incomingRepo);
        if (repoMatch !== -1) return repoMatch;
    }

    return -1;
}

export function mergeSkillRecords(existing: Skill, incoming: Skill): Skill {
    const existingEdited = safeEditedFields(existing.editedFields, SKILL_EDITABLE_FIELDS);
    const incomingEdited = safeEditedFields(incoming.editedFields, SKILL_EDITABLE_FIELDS);
    const editedFields = Array.from(new Set([...existingEdited, ...incomingEdited]));
    const isProtected = (field: keyof Skill) => existingEdited.includes(field);
    const pick = <K extends keyof Skill>(field: K, existingVal: Skill[K], incomingVal: Skill[K]): Skill[K] =>
        isProtected(field) ? existingVal : (hasValue(incomingVal) ? incomingVal : existingVal);

    const merged: Skill = { ...existing };
    merged.id = existing.id;
    merged.name = isProtected('name') ? existing.name : existing.name || incoming.name;
    merged.source = mergeSourceStrings(existing.source, incoming.source);
    merged.description = pick('description', existing.description, incoming.description);
    merged.type = pick('type', existing.type, incoming.type);
    merged.origin = pick('origin', existing.origin, incoming.origin);
    merged.family = pick('family', existing.family, incoming.family);
    merged.install_command = pick('install_command', existing.install_command, incoming.install_command);
    merged.redistributable = pick('redistributable', existing.redistributable, incoming.redistributable);
    merged.updated_at = pick('updated_at', existing.updated_at, incoming.updated_at);
    merged.source_repo = isProtected('source_repo') ? existing.source_repo : (existing.source_repo || incoming.source_repo);

    if (!isProtected('license')) {
        const existingKnown = existing.license?.name && existing.license.name !== 'Unknown';
        merged.license = existingKnown ? existing.license : (incoming.license || existing.license);
    }
    if (!isProtected('tags')) {
        merged.tags = Array.from(new Set([...(existing.tags || []), ...(incoming.tags || [])]));
    }
    if (!isProtected('capabilities')) {
        const capabilities = Array.from(new Set([...(existing.capabilities || []), ...(incoming.capabilities || [])]));
        merged.capabilities = capabilities.length > 0 ? capabilities : undefined;
    }
    if (!isProtected('triggers')) {
        const triggers = Array.from(new Set([...(existing.triggers || []), ...(incoming.triggers || [])]));
        merged.triggers = triggers.length > 0 ? triggers : undefined;
    }
    if (!isProtected('requires')) {
        const existingRequires = existing.requires || {};
        const incomingRequires = incoming.requires || {};
        const union = <T>(a?: T[], b?: T[]): T[] | undefined => {
            const value = Array.from(new Set([...(a || []), ...(b || [])]));
            return value.length > 0 ? value : undefined;
        };
        const requires: NonNullable<Skill['requires']> = {
            mcps: union(existingRequires.mcps, incomingRequires.mcps),
            plugins: union(existingRequires.plugins, incomingRequires.plugins),
            api_keys: union(existingRequires.api_keys, incomingRequires.api_keys),
            runtimes: union(existingRequires.runtimes, incomingRequires.runtimes),
        };
        merged.requires = requires.mcps || requires.plugins || requires.api_keys || requires.runtimes ? requires : undefined;
    }

    merged._meta = mergeSafeMeta(existing._meta, incoming._meta);
    merged.isFavorite = existing.isFavorite ?? incoming.isFavorite;
    merged.editedFields = editedFields;
    return merged;
}

/** Hash lookups equivalent to `matchSkillIndex` (id, then repo); see MCPMatchIndex. */
class SkillMatchIndex {
    private byId = new Map<string, number>();
    private byRepo = new Map<string, number>();

    constructor(skills: Skill[]) {
        skills.forEach((skill, index) => this.add(skill, index));
    }

    add(skill: Skill, index: number) {
        setFirst(this.byId, skill.id?.toLowerCase(), index);
        setFirst(this.byRepo, skillRepoKey(skill), index);
    }

    find(base: Skill[], incoming: Skill): number {
        if (incoming.id) {
            const hit = this.byId.get(incoming.id.toLowerCase());
            if (hit !== undefined) return hit;
        }
        const incomingRepo = skillRepoKey(incoming);
        if (incomingRepo) {
            const hit = this.byRepo.get(incomingRepo);
            if (hit !== undefined) {
                if (skillRepoKey(base[hit]) === incomingRepo) return hit;
                return matchSkillIndex(base, incoming);
            }
        }
        return -1;
    }
}

function mergeCleanSkills(base: Skill[], incoming: Skill[]): Skill[] {
    const index = new SkillMatchIndex(base);
    for (const skill of incoming) {
        const cleanSkill: Skill = { ...skill, editedFields: safeEditedFields(skill.editedFields, SKILL_EDITABLE_FIELDS), _meta: sanitizeMeta(skill._meta) };
        const idx = index.find(base, cleanSkill);
        if (idx === -1) {
            base.push(cleanSkill);
            index.add(cleanSkill, base.length - 1);
        } else {
            base[idx] = mergeSkillRecords(base[idx], cleanSkill);
            index.add(base[idx], idx);
        }
    }
    return base;
}

function cleanStoredSkill(skill: Skill): Skill {
    return {
        ...skill,
        tags: arrayOr<string>(skill.tags, []) as string[],
        triggers: arrayOr(skill.triggers, undefined),
        capabilities: arrayOr(skill.capabilities, undefined),
        _meta: sanitizeMeta(skill._meta),
    };
}

/** Merge two untrusted lists: both sides are schema-validated. */
export function mergeSkillLists(existing: Skill[], incoming: Skill[]): Skill[] {
    return mergeCleanSkills(validateSkills(existing).map(cleanStoredSkill), validateSkills(incoming));
}

/** Merge fetched skills into state that already went through this module (see appendMCPServers). */
export function appendSkills(trustedExisting: Skill[], incoming: Skill[]): Skill[] {
    return mergeCleanSkills([...trustedExisting], validateSkills(incoming));
}

/** Load the persisted list at startup with structural guards only (see restoreMCPServers). */
export function restoreSkills(stored: unknown): Skill[] {
    if (!Array.isArray(stored)) return [];
    const records = stored.filter((item): item is Skill =>
        !!item && typeof item === 'object' && typeof (item as Skill).id === 'string' && typeof (item as Skill).name === 'string'
        && typeof (item as Skill).type === 'string' && typeof (item as Skill).origin === 'string');
    return mergeCleanSkills([], records.map(cleanStoredSkill));
}
