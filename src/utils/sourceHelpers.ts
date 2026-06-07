export interface HasSourceField {
    source?: string | null;
}

export function parseSources(entity: HasSourceField | string | null | undefined): string[] {
    const raw = typeof entity === 'string' ? entity : entity?.source;
    if (!raw) return [];

    const sources: string[] = [];
    const seen = new Set<string>();
    for (const part of raw.split(',')) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        const key = trimmed.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        sources.push(trimmed);
    }
    return sources;
}

export function hasSource(entity: HasSourceField | string | null | undefined, name: string): boolean {
    const target = name.trim().toLowerCase();
    if (!target) return false;
    return parseSources(entity).some(source => source.toLowerCase() === target);
}

export function mergeSourceStrings(a?: string | null, b?: string | null): string {
    const unique = new Map<string, string>();
    for (const source of [...parseSources(a), ...parseSources(b)]) {
        unique.set(source.toLowerCase(), source);
    }
    return Array.from(unique.values()).sort((x, y) => x.localeCompare(y)).join(', ');
}

export function normalizeRepoUrl(url?: string | null): string {
    if (!url) return '';
    let value = String(url).trim().toLowerCase();
    if (!value) return '';

    value = value.replace(/^git\+/, '').replace(/^[a-z]+:\/\//, '').replace(/^git@/, '');
    value = value.replace(/^([^/:]+):(?!\d)/, '$1/');
    value = value.replace(/^www\./, '');
    value = value.replace(/[?#].*$/, '');
    value = value.replace(/\.git$/, '').replace(/\/+$/, '');
    return value;
}

export function normalizePackageId(identifier?: string | null): string {
    return identifier ? String(identifier).trim().toLowerCase() : '';
}

export function isUnsafeObjectKey(key: string): boolean {
    return key === '__proto__' || key === 'constructor' || key === 'prototype';
}

const MAX_META_KEYS = 24;
const MAX_META_STRING = 1000;

function sanitizeMetaValue(value: unknown, depth: number): unknown {
    if (value == null) return value;
    if (typeof value === 'string') return value.slice(0, MAX_META_STRING);
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (Array.isArray(value)) {
        if (depth <= 0) return [];
        return value.slice(0, MAX_META_KEYS).map(item => sanitizeMetaValue(item, depth - 1));
    }
    if (typeof value === 'object') {
        if (depth <= 0) return {};
        const clean: Record<string, unknown> = Object.create(null);
        for (const [key, child] of Object.entries(value as Record<string, unknown>).slice(0, MAX_META_KEYS)) {
            if (isUnsafeObjectKey(key)) continue;
            clean[key] = sanitizeMetaValue(child, depth - 1);
        }
        return clean;
    }
    return undefined;
}

export function sanitizeMeta(meta: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
    if (!meta || typeof meta !== 'object') return undefined;
    const clean: Record<string, unknown> = Object.create(null);
    for (const [key, value] of Object.entries(meta).slice(0, MAX_META_KEYS)) {
        if (isUnsafeObjectKey(key)) continue;
        clean[key] = sanitizeMetaValue(value, 3);
    }
    return Object.keys(clean).length > 0 ? clean : undefined;
}

export function mergeSafeMeta(
    a: Record<string, unknown> | undefined,
    b: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
    const cleanA = sanitizeMeta(a) || {};
    const cleanB = sanitizeMeta(b) || {};
    const merged: Record<string, unknown> = Object.create(null);
    for (const [key, value] of Object.entries(cleanA)) merged[key] = value;
    for (const [key, value] of Object.entries(cleanB)) merged[key] = value;
    return Object.keys(merged).length > 0 ? merged : undefined;
}

