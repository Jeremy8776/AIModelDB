import { MCPServer, Model, Skill } from '../types';
import { matchesMCP, matchesModel, matchesSkill } from './searchMatch';

export type SearchSuggestionEntity = 'models' | 'mcp' | 'skills';
export type SearchSuggestionKind = 'result' | 'hint';

export interface SearchSuggestion {
    kind: SearchSuggestionKind;
    label: string;
    value: string;
    entity?: SearchSuggestionEntity;
    detail?: string;
}

export interface SearchSuggestionInput {
    query: string;
    models: Model[];
    mcp: MCPServer[];
    skills: Skill[];
    limit?: number;
}

const BASE_HINTS: SearchSuggestion[] = [
    { kind: 'hint', label: 'Provider', value: 'provider:', detail: 'Filter models by provider' },
    { kind: 'hint', label: 'Source', value: 'source:', detail: 'Filter by source catalog' },
    { kind: 'hint', label: 'Domain', value: 'domain:', detail: 'Filter models by domain' },
    { kind: 'hint', label: 'Tag', value: 'tag:', detail: 'Filter by tag' },
    { kind: 'hint', label: 'License', value: 'license:', detail: 'Filter by license' },
];

const unique = (values: Array<string | null | undefined>): string[] =>
    Array.from(new Set(values.map(value => value?.trim()).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b));

function valueHints(query: string, models: Model[], mcp: MCPServer[], skills: Skill[]): SearchSuggestion[] {
    const [operator, typedValue = ''] = query.toLowerCase().split(':');
    const matchesValue = (value: string) => value.toLowerCase().includes(typedValue);
    const toHint = (label: string, value: string): SearchSuggestion => ({
        kind: 'hint',
        label,
        value: `${operator}:${value}`,
        detail: 'Search hint',
    });

    if (operator === 'provider') {
        return unique(models.map(model => model.provider)).filter(matchesValue).map(value => toHint('Provider', value));
    }
    if (operator === 'source') {
        return unique([
            ...models.map(model => model.source),
            ...mcp.map(server => server.source),
            ...skills.map(skill => skill.source),
        ]).filter(matchesValue).map(value => toHint('Source', value));
    }
    if (operator === 'domain') {
        return unique(models.map(model => model.domain)).filter(matchesValue).map(value => toHint('Domain', value));
    }
    if (operator === 'license') {
        return unique(models.map(model => model.license?.name)).filter(matchesValue).map(value => toHint('License', value));
    }
    if (operator === 'tag') {
        return unique([
            ...models.flatMap(model => model.tags || []),
            ...skills.flatMap(skill => skill.tags || []),
        ]).filter(matchesValue).map(value => toHint('Tag', value));
    }
    return [];
}

export function buildSearchSuggestions({ query, models, mcp, skills, limit = 8 }: SearchSuggestionInput): SearchSuggestion[] {
    const trimmed = query.trim();
    if (!trimmed) return BASE_HINTS.slice(0, limit);

    const suggestions: SearchSuggestion[] = [
        ...models
            .filter(model => matchesModel(model, trimmed))
            .slice(0, 3)
            .map(model => ({
                kind: 'result' as const,
                entity: 'models' as const,
                label: model.name,
                value: model.name,
                detail: [model.provider, model.domain].filter(Boolean).join(' - '),
            })),
        ...mcp
            .filter(server => matchesMCP(server, trimmed))
            .slice(0, 3)
            .map(server => ({
                kind: 'result' as const,
                entity: 'mcp' as const,
                label: server.name,
                value: server.name,
                detail: server.id,
            })),
        ...skills
            .filter(skill => matchesSkill(skill, trimmed))
            .slice(0, 3)
            .map(skill => ({
                kind: 'result' as const,
                entity: 'skills' as const,
                label: skill.name,
                value: skill.name,
                detail: skill.family || skill.source,
            })),
    ];

    const hintedValues = trimmed.includes(':') ? valueHints(trimmed, models, mcp, skills) : [];
    return [...suggestions, ...hintedValues, ...BASE_HINTS.filter(hint => hint.value.startsWith(trimmed.toLowerCase()))].slice(0, limit);
}
