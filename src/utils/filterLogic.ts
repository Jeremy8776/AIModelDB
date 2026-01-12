import { Domain, Model } from '../types';

export interface FilterOptions {
    query: string;
    domainPick: Domain | 'All';
    sortKey: 'recent' | 'name' | 'provider' | 'downloads' | 'release_date' | 'domain' | 'parameters' | 'license';
    sortDirection?: 'asc' | 'desc';
    minDownloads: number;
    pageSize: number | null;
    licenseTypes?: Array<'Proprietary' | 'OSI' | 'Copyleft' | 'Non-Commercial' | 'Custom'>;
    commercialAllowed?: boolean | null;
    includeTags?: string[];
    excludeTags?: string[];
    favoritesOnly?: boolean;
    hideNSFW?: boolean;
}

/**
 * Parse advanced search syntax from query string.
 * Supported operators:
 * - domain:ImageGen - Filter by domain
 * - license:MIT - Filter by license name
 * - downloads:>1000 - Filter by download count (>, <, >=, <=, =)
 * - tag:transformer - Include models with tag
 * - -tag:deprecated - Exclude models with tag
 * - source:huggingface - Filter by source
 * - provider:openai - Filter by provider
 * - is:favorite - Only favorites
 * - is:commercial - Only commercially usable
 */
interface ParsedQuery {
    textTerms: string[];
    domainFilter?: string;
    licenseFilter?: string;
    downloadsFilter?: { op: string; value: number };
    includeTags: string[];
    excludeTags: string[];
    sourceFilter?: string;
    providerFilter?: string;
    favoritesOnly?: boolean;
    commercialOnly?: boolean;
}

function parseAdvancedQuery(query: string): ParsedQuery {
    const result: ParsedQuery = {
        textTerms: [],
        includeTags: [],
        excludeTags: [],
    };

    if (!query.trim()) return result;

    // Split by spaces but respect quoted strings
    const tokens = query.match(/(?:[^\s"]+|"[^"]*")+/g) || [];

    for (const token of tokens) {
        const lower = token.toLowerCase();

        // domain:value
        if (lower.startsWith('domain:')) {
            result.domainFilter = token.slice(7).replace(/"/g, '');
        }
        // license:value
        else if (lower.startsWith('license:')) {
            result.licenseFilter = token.slice(8).replace(/"/g, '').toLowerCase();
        }
        // downloads:>1000 or downloads:>=1000 or downloads:<1000 or downloads:1000
        else if (lower.startsWith('downloads:')) {
            const val = token.slice(10);
            const match = val.match(/^(>=?|<=?|=)?(\d+)$/);
            if (match) {
                result.downloadsFilter = {
                    op: match[1] || '>=',
                    value: parseInt(match[2], 10)
                };
            }
        }
        // -tag:value (exclude)
        else if (lower.startsWith('-tag:')) {
            result.excludeTags.push(token.slice(5).replace(/"/g, '').toLowerCase());
        }
        // tag:value (include)
        else if (lower.startsWith('tag:')) {
            result.includeTags.push(token.slice(4).replace(/"/g, '').toLowerCase());
        }
        // source:value
        else if (lower.startsWith('source:')) {
            result.sourceFilter = token.slice(7).replace(/"/g, '').toLowerCase();
        }
        // provider:value
        else if (lower.startsWith('provider:')) {
            result.providerFilter = token.slice(9).replace(/"/g, '').toLowerCase();
        }
        // is:favorite
        else if (lower === 'is:favorite' || lower === 'is:fav') {
            result.favoritesOnly = true;
        }
        // is:commercial
        else if (lower === 'is:commercial') {
            result.commercialOnly = true;
        }
        // Regular text term
        else {
            result.textTerms.push(token.replace(/"/g, '').toLowerCase());
        }
    }

    return result;
}

export const filterModels = (models: Model[], options: FilterOptions): Model[] => {
    const { query, domainPick, sortKey, sortDirection = 'asc', minDownloads, licenseTypes = [], commercialAllowed = null, includeTags = [], excludeTags = [], favoritesOnly = false, hideNSFW = false } = options;

    // Early return if no models
    if (!models || models.length === 0) return [];

    let list = models.slice();

    // gate for web sources only; imports bypass
    if (minDownloads > 0) {
        list = list.filter(m => m.source === "Import" || (m.downloads ?? 0) >= minDownloads);
    }

    // Parse advanced search syntax
    const parsed = parseAdvancedQuery(query);

    // Apply advanced search filters
    if (parsed.domainFilter) {
        list = list.filter(m => m.domain?.toLowerCase() === parsed.domainFilter!.toLowerCase());
    }

    if (parsed.licenseFilter) {
        list = list.filter(m =>
            m.license?.name?.toLowerCase().includes(parsed.licenseFilter!) ||
            m.license?.type?.toLowerCase().includes(parsed.licenseFilter!)
        );
    }

    if (parsed.downloadsFilter) {
        const { op, value } = parsed.downloadsFilter;
        list = list.filter(m => {
            const downloads = m.downloads ?? 0;
            switch (op) {
                case '>': return downloads > value;
                case '>=': return downloads >= value;
                case '<': return downloads < value;
                case '<=': return downloads <= value;
                case '=': return downloads === value;
                default: return downloads >= value;
            }
        });
    }

    if (parsed.sourceFilter) {
        list = list.filter(m => m.source?.toLowerCase().includes(parsed.sourceFilter!));
    }

    if (parsed.providerFilter) {
        list = list.filter(m => m.provider?.toLowerCase().includes(parsed.providerFilter!));
    }

    if (parsed.favoritesOnly) {
        list = list.filter(m => m.isFavorite);
    }

    if (parsed.commercialOnly) {
        list = list.filter(m => m.license?.commercial_use === true);
    }

    // Apply tag filters from advanced syntax
    if (parsed.includeTags.length) {
        list = list.filter(m => {
            const tags = (m.tags || []).map(t => String(t).toLowerCase());
            return parsed.includeTags.every(t => tags.includes(t));
        });
    }

    if (parsed.excludeTags.length) {
        list = list.filter(m => {
            const tags = (m.tags || []).map(t => String(t).toLowerCase());
            return parsed.excludeTags.every(t => !tags.includes(t));
        });
    }

    // Apply text search for remaining terms
    if (parsed.textTerms.length) {
        list = list.filter(m => {
            const searchStr = `${m.name} ${m.provider || ''} ${m.source || ''} ${m.license?.name || ''} ${(m.tags || []).join(' ')}`.toLowerCase();
            return parsed.textTerms.every(term => searchStr.includes(term));
        });
    }

    if (domainPick !== "All") {
        list = list.filter(m => m.domain === domainPick);
    }

    if (licenseTypes.length) {
        list = list.filter(m => m.license && licenseTypes.includes(m.license.type));
    }

    if (commercialAllowed !== null) {
        list = list.filter(m => (m.license?.commercial_use ?? false) === commercialAllowed);
    }

    if (favoritesOnly) {
        list = list.filter(m => m.isFavorite);
    }

    // Hide NSFW content - checks both the flag and common NSFW tags
    if (hideNSFW) {
        list = list.filter(m => {
            // Check the explicit NSFW flag
            if (m.isNSFWFlagged) return false;
            // Also check for NSFW-related tags
            const tags = (m.tags || []).map(t => String(t).toLowerCase());
            const nsfwTags = ['nsfw', 'adult', 'explicit', 'mature', 'xxx', 'porn', 'hentai', 'nude', 'nudity', 'erotic'];
            if (nsfwTags.some(nsfwTag => tags.includes(nsfwTag))) return false;
            return true;
        });
    }

    if (includeTags.length) {
        const inc = includeTags.map(t => String(t).toLowerCase().trim()).filter(Boolean);
        list = list.filter(m => {
            const tags = (m.tags || []).map(t => String(t).toLowerCase());
            return inc.every(t => tags.includes(t));
        });
    }

    if (excludeTags.length) {
        const exc = excludeTags.map(t => String(t).toLowerCase().trim()).filter(Boolean);
        list = list.filter(m => {
            const tags = (m.tags || []).map(t => String(t).toLowerCase());
            return exc.every(t => !tags.includes(t));
        });
    }

    list.sort((a, b) => {
        // Safety check - if either model is undefined/null, push to end
        if (!a || !b) return 0;

        // Determine sort direction multiplier (1 for ascending, -1 for descending)
        const dir = sortDirection === 'asc' ? 1 : -1;

        if (sortKey === "name") {
            const aName = a.name ?? "";
            const bName = b.name ?? "";
            return dir * aName.localeCompare(bName);
        }
        if (sortKey === "provider") {
            const aProv = a.provider ?? "";
            const bProv = b.provider ?? "";
            return dir * aProv.localeCompare(bProv);
        }
        if (sortKey === "domain") {
            const aDom = a.domain ?? "";
            const bDom = b.domain ?? "";
            return dir * aDom.localeCompare(bDom);
        }
        if (sortKey === "license") {
            const aLic = a.license?.name ?? "";
            const bLic = b.license?.name ?? "";
            return dir * aLic.localeCompare(bLic);
        }
        if (sortKey === "recent") {
            const aDate = a?.updated_at ? Date.parse(a.updated_at) : 0;
            const bDate = b?.updated_at ? Date.parse(b.updated_at) : 0;
            // Push invalid/missing dates to the end regardless of sort direction
            if (isNaN(aDate) || aDate === 0) return 1;
            if (isNaN(bDate) || bDate === 0) return -1;
            if (aDate === 0 && bDate === 0) return 0;
            return dir * (aDate - bDate);
        }
        if (sortKey === "downloads") {
            const aDownloads = a?.downloads ?? 0;
            const bDownloads = b?.downloads ?? 0;
            return dir * (aDownloads - bDownloads);
        }
        if (sortKey === "release_date") {
            const aDate = a?.release_date ? Date.parse(a.release_date) : 0;
            const bDate = b?.release_date ? Date.parse(b.release_date) : 0;
            // Push invalid/missing dates to the end regardless of sort direction
            if (isNaN(aDate) || aDate === 0) return 1;
            if (isNaN(bDate) || bDate === 0) return -1;
            if (aDate === 0 && bDate === 0) return 0;
            return dir * (aDate - bDate);
        }
        if (sortKey === "parameters") {
            const extractCost = (model: Model | null | undefined) => {
                if (!model || !model.pricing || model.pricing.length === 0) return 0;
                const pricing = model.pricing[0];

                // Prioritize API costs over subscription costs for sorting
                if (pricing.input != null) return pricing.input * 1000;
                if (pricing.output != null) return pricing.output * 1000;
                if (pricing.flat != null) {
                    const unit = pricing.unit?.toLowerCase() || '';
                    const isSubscription = unit.includes('month') || unit.includes('year') ||
                        unit.includes('annual') || unit.includes('subscription') || unit.includes('plan');
                    return isSubscription ? pricing.flat / 12 : pricing.flat;
                }
                return 0;
            };
            const aVal = extractCost(a);
            const bVal = extractCost(b);
            return dir * (aVal - bVal);
        }

        // Default fallback sort by updated date
        const aFallback = a?.updated_at ? Date.parse(a.updated_at) : 0;
        const bFallback = b?.updated_at ? Date.parse(b.updated_at) : 0;
        return (isNaN(bFallback) ? 0 : bFallback) - (isNaN(aFallback) ? 0 : aFallback);
    });

    return list;
};
