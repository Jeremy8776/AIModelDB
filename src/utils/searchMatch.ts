import { Model, MCPServer, Skill } from '../types';

/**
 * Lightweight text match. Returns true on empty query so callers can use
 * the same function for "is this in scope" checks regardless of whether
 * the user has typed anything yet.
 */
export function matchesText(haystack: string, query: string): boolean {
    if (!query) return true;
    return haystack.toLowerCase().includes(query.toLowerCase());
}

/**
 * Per-entity match predicates. Each one matches the same fields the in-tab
 * filter uses, so the cross-tab count never diverges from what the user
 * sees once they switch.
 */
export function matchesModel(model: Model, query: string): boolean {
    if (!query) return true;
    const q = query.toLowerCase();
    return `${model.name ?? ''} ${model.provider ?? ''} ${model.description ?? ''} ${(model.tags || []).join(' ')}`
        .toLowerCase()
        .includes(q);
}

export function matchesMCP(server: MCPServer, query: string): boolean {
    if (!query) return true;
    const q = query.toLowerCase();
    return `${server.name} ${server.description ?? ''} ${server.id}`
        .toLowerCase()
        .includes(q);
}

export function matchesSkill(skill: Skill, query: string): boolean {
    if (!query) return true;
    const q = query.toLowerCase();
    return `${skill.name} ${skill.description ?? ''} ${skill.id} ${(skill.tags || []).join(' ')}`
        .toLowerCase()
        .includes(q);
}

export interface CrossEntityCounts {
    models: number;
    mcp: number;
    skills: number;
}

export function countQueryMatches(
    models: Model[],
    mcp: MCPServer[],
    skills: Skill[],
    query: string
): CrossEntityCounts {
    if (!query.trim()) {
        return { models: models.length, mcp: mcp.length, skills: skills.length };
    }
    return {
        models: models.reduce((acc, m) => acc + (matchesModel(m, query) ? 1 : 0), 0),
        mcp: mcp.reduce((acc, s) => acc + (matchesMCP(s, query) ? 1 : 0), 0),
        skills: skills.reduce((acc, s) => acc + (matchesSkill(s, query) ? 1 : 0), 0),
    };
}
