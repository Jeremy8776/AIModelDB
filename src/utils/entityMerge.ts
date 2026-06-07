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

export function mergeMCPServerLists(existing: MCPServer[], incoming: MCPServer[]): MCPServer[] {
    const validExisting = validateMCPServers(existing);
    const validIncoming = validateMCPServers(incoming);
    const base: MCPServer[] = validExisting.map(server => ({ ...server, _meta: sanitizeMeta(server._meta) }));
    for (const server of validIncoming) {
        const cleanServer: MCPServer = { ...server, editedFields: safeEditedFields(server.editedFields, MCP_EDITABLE_FIELDS), _meta: sanitizeMeta(server._meta) };
        const idx = matchMCPIndex(base, cleanServer);
        if (idx === -1) base.push(cleanServer);
        else base[idx] = mergeMCPRecords(base[idx], cleanServer);
    }
    return base;
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

export function mergeSkillLists(existing: Skill[], incoming: Skill[]): Skill[] {
    const validExisting = validateSkills(existing);
    const validIncoming = validateSkills(incoming);
    const base: Skill[] = validExisting.map(skill => ({ ...skill, _meta: sanitizeMeta(skill._meta) }));
    for (const skill of validIncoming) {
        const cleanSkill: Skill = { ...skill, editedFields: safeEditedFields(skill.editedFields, SKILL_EDITABLE_FIELDS), _meta: sanitizeMeta(skill._meta) };
        const idx = matchSkillIndex(base, cleanSkill);
        if (idx === -1) base.push(cleanSkill);
        else base[idx] = mergeSkillRecords(base[idx], cleanSkill);
    }
    return base;
}
