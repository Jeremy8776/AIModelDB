import { Model, Pricing, BenchmarkEntry } from '../types';
import { normalizeNameForMatch } from './format';

// Detects CJK characters (Han, Hiragana, Katakana, Hangul). Used to prefer
// English (non-CJK) descriptions when merging records from mixed-locale sources.
const CJK_REGEX = /[一-鿿぀-ヿ가-힯]/;
const isCJK = (s?: string | null): boolean => !!s && CJK_REGEX.test(s);

export const matchExistingIndex = (arr: Model[], inc: Model, autoMergeDuplicates: boolean): number => {
    // 1) Match by exact id
    let idx = arr.findIndex(e => e.id && inc.id && e.id === inc.id);
    if (idx !== -1) return idx;
    // 2) Match by repo
    if (inc.repo) {
        idx = arr.findIndex(e => e.repo && e.repo === inc.repo);
        if (idx !== -1) return idx;
    }
    // 3) Match by url
    if (inc.url) {
        idx = arr.findIndex(e => e.url && e.url === inc.url);
        if (idx !== -1) return idx;
    }
    // 4) Optional fuzzy name matching
    if (autoMergeDuplicates) {
        const incBase = normalizeNameForMatch(inc.name);
        if (incBase) {
            // Require a minimum name length to avoid merging generic names like "chat"
            if (incBase.length < 3) return -1;

            const incProv = (inc.provider || '').toString().toLowerCase();

            idx = arr.findIndex(e => {
                // Must be same domain (e.g. don't merge ImageGen 'Llama' with LLM 'Llama')
                const sameDomain = !inc.domain || !e.domain ? true : inc.domain === e.domain;
                if (!sameDomain) return false;

                const exBase = normalizeNameForMatch(e.name);
                if (exBase !== incBase) return false;

                // Name matches! Now consider provider.
                const exProv = (e.provider || '').toString().toLowerCase();

                // If providers match reasonably, it's a definite hit
                const provOk = incProv === exProv || !incProv || !exProv || incProv.includes(exProv) || exProv.includes(incProv);
                if (provOk) return true;

                // If name is long enough (very specific), merge even if providers differ (e.g. "llama-3-70b-instruct")
                if (incBase.length > 8) return true;

                return false;
            });
            if (idx !== -1) return idx;
        }
    }
    return -1;
};

export const mergeRecords = (existing: Model, incoming: Model): Model => {
    // ═══════════════════════════════════════════════════════════════════════════
    // MERGE STRATEGY (V3):
    // 1. USER EDITS WIN: any field in existing.editedFields is preserved as-is.
    //    Protects manual edits from being clobbered by subsequent syncs.
    // 2. IDENTITY: name, provider, id stay with existing — the record's anchor.
    // 3. DYNAMIC FIELDS: incoming wins (parameters, context_window, description,
    //    license, etc.) — sync brings fresh data.
    // 4. ENGLISH PREFERRED: descriptions prefer non-CJK over CJK regardless of
    //    direction, since the app surfaces English to users.
    // 5. ACCUMULATING FIELDS: tags, pricing, links, hosting.providers, images,
    //    usage_restrictions, benchmarks unioned across both records.
    // ═══════════════════════════════════════════════════════════════════════════

    const existingEditedFields = new Set(existing.editedFields || []);
    const incomingEditedFields = new Set(incoming.editedFields || []);
    const editedFields = new Set([...existingEditedFields, ...incomingEditedFields]);
    const isExistingProtected = (field: string) => existingEditedFields.has(field);
    const isIncomingProtected = (field: string) => incomingEditedFields.has(field);
    const hasValue = <T>(value: T): boolean => value !== null && value !== undefined && value !== '';

    // pick: protected → existing; else incoming if truthy, else existing
    const pick = <T>(field: string, existingVal: T, incomingVal: T): T => {
        if (isExistingProtected(field)) return existingVal;
        if (isIncomingProtected(field) && hasValue(incomingVal)) return incomingVal;
        return hasValue(incomingVal) ? incomingVal : existingVal;
    };

    const merged: Model = { ...existing } as Model;

    // 1. Sources — accumulate
    const sources = new Set<string>();
    existing.source.split(',').forEach(s => sources.add(s.trim()));
    incoming.source.split(',').forEach(s => sources.add(s.trim()));
    merged.source = Array.from(sources).sort().join(', ');

    // Links — accumulate, dedupe by normalized URL
    const linkMap = new Map<string, string>();
    const addLink = (url: string | null | undefined, label: string) => {
        if (!url) return;
        const normalized = url.trim().toLowerCase().replace(/\/$/, '');
        if (!linkMap.has(normalized)) linkMap.set(normalized, label);
    };
    (existing.links || []).forEach(l => addLink(l.url, l.label));
    (incoming.links || []).forEach(l => addLink(l.url, l.label));
    addLink(existing.url, existing.source.split(',')[0].trim());
    addLink(existing.repo, 'Repository');
    addLink(incoming.url, incoming.source.split(',')[0].trim());
    addLink(incoming.repo, 'Repository');
    merged.links = Array.from(linkMap.entries()).map(([url, label]) => ({ url, label }));

    // 2. Identity — existing wins (these anchor the record)
    merged.id = existing.id;
    merged.name = existing.name;
    merged.provider = existing.provider;
    merged.url = existing.url || incoming.url;
    merged.repo = existing.repo || incoming.repo;
    merged.domain = (existing.domain || incoming.domain);

    // 3. Dynamic single-value fields — incoming wins unless protected
    merged.parameters = pick('parameters', existing.parameters, incoming.parameters);
    merged.context_window = pick('context_window', existing.context_window, incoming.context_window);
    merged.indemnity = pick('indemnity', existing.indemnity, incoming.indemnity);
    merged.data_provenance = pick('data_provenance', existing.data_provenance, incoming.data_provenance);

    // 3a. Description — prefer non-CJK; else incoming-wins; unless protected
    if (isExistingProtected('description')) {
        merged.description = existing.description;
    } else if (isIncomingProtected('description') && hasValue(incoming.description)) {
        merged.description = incoming.description;
    } else {
        const ex = existing.description;
        const inc = incoming.description;
        if (!inc) merged.description = ex;
        else if (!ex) merged.description = inc;
        else if (isCJK(ex) && !isCJK(inc)) merged.description = inc;
        else if (!isCJK(ex) && isCJK(inc)) merged.description = ex;
        else merged.description = inc; // both same locale: incoming wins (fresher)
    }

    // 4. Release date — earliest wins (true first appearance); updated_at — latest wins
    const exDate = existing.release_date ? new Date(existing.release_date) : null;
    const inDate = incoming.release_date ? new Date(incoming.release_date) : null;
    if (isExistingProtected('release_date')) {
        merged.release_date = existing.release_date;
    } else if (isIncomingProtected('release_date') && hasValue(incoming.release_date)) {
        merged.release_date = incoming.release_date;
    } else {
        merged.release_date = (exDate && inDate)
            ? (exDate < inDate ? existing.release_date : incoming.release_date)
            : (existing.release_date || incoming.release_date);
    }
    const exUp = existing.updated_at ? new Date(existing.updated_at) : null;
    const inUp = incoming.updated_at ? new Date(incoming.updated_at) : null;
    merged.updated_at = (exUp && inUp)
        ? (exUp > inUp ? existing.updated_at : incoming.updated_at)
        : (existing.updated_at || incoming.updated_at);

    // 5. Downloads — sum across sources via source_stats
    const stats: Record<string, { downloads?: number; updated_at?: string }> = {
        ...(existing.source_stats || {}),
        ...(incoming.source_stats || {})
    };
    const addStat = (m: Model) => {
        const primarySource = m.source.split(',')[0].trim();
        if (primarySource && m.downloads != null) {
            if (!stats[primarySource] || (m.updated_at && (!stats[primarySource].updated_at || new Date(m.updated_at) > new Date(stats[primarySource].updated_at!)))) {
                stats[primarySource] = { downloads: m.downloads, updated_at: m.updated_at || undefined };
            }
        }
    };
    addStat(existing);
    addStat(incoming);
    merged.source_stats = stats;
    merged.downloads = Object.values(stats).reduce((acc, curr) => acc + (curr.downloads || 0), 0) || null;

    // 6. Accumulating fields — union across both (unless protected)
    merged.tags = isExistingProtected('tags')
        ? existing.tags
        : Array.from(new Set([...(existing.tags || []), ...(incoming.tags || [])]));
    merged.usage_restrictions = isExistingProtected('usage_restrictions')
        ? existing.usage_restrictions
        : Array.from(new Set([...(existing.usage_restrictions || []), ...(incoming.usage_restrictions || [])]));
    merged.images = isExistingProtected('images')
        ? existing.images
        : Array.from(new Set([...(existing.images || []), ...(incoming.images || [])]));

    // 7. Pricing — accumulate with dedupe on composite key
    if (isExistingProtected('pricing')) {
        merged.pricing = existing.pricing;
    } else {
        const pricingKey = (p: Pricing) =>
            `${p.unit ?? ''}|${p.input ?? ''}|${p.output ?? ''}|${p.flat ?? ''}|${p.currency ?? ''}|${p.model ?? ''}`;
        const pricingMap = new Map<string, Pricing>();
        (existing.pricing || []).forEach(p => pricingMap.set(pricingKey(p), p));
        (incoming.pricing || []).forEach(p => pricingMap.set(pricingKey(p), p));
        merged.pricing = Array.from(pricingMap.values());
    }

    // 8. License — incoming wins per-field unless protected
    if (isExistingProtected('license')) {
        merged.license = existing.license;
    } else {
        merged.license = {
            name: incoming.license?.name || existing.license?.name || 'Unknown',
            type: incoming.license?.type || existing.license?.type || 'Custom',
            commercial_use: incoming.license?.commercial_use ?? existing.license?.commercial_use ?? true,
            attribution_required: incoming.license?.attribution_required ?? existing.license?.attribution_required ?? false,
            share_alike: incoming.license?.share_alike ?? existing.license?.share_alike ?? false,
            copyleft: incoming.license?.copyleft ?? existing.license?.copyleft ?? false,
            url: incoming.license?.url || existing.license?.url || undefined,
            notes: incoming.license?.notes || existing.license?.notes || undefined
        };
    }

    // 9. Hosting — OR booleans, union providers (unless protected)
    if (isExistingProtected('hosting')) {
        merged.hosting = existing.hosting;
    } else {
        merged.hosting = {
            weights_available: Boolean(existing.hosting?.weights_available || incoming.hosting?.weights_available),
            api_available: Boolean(existing.hosting?.api_available || incoming.hosting?.api_available),
            on_premise_friendly: Boolean(existing.hosting?.on_premise_friendly || incoming.hosting?.on_premise_friendly),
            providers: Array.from(new Set([...(existing.hosting?.providers || []), ...(incoming.hosting?.providers || [])]))
        };
    }

    // 10. Benchmarks & analytics — incoming wins (fresher)
    merged.analytics = {
        ...(existing.analytics || {}),
        ...(incoming.analytics || {})
    };
    const benchmarkMap = new Map<string, BenchmarkEntry>();
    (existing.benchmarks || []).forEach(b => benchmarkMap.set(b.name, b));
    (incoming.benchmarks || []).forEach(b => benchmarkMap.set(b.name, b));
    merged.benchmarks = Array.from(benchmarkMap.values());

    // 11. User-set flags — always preserved from existing
    if (existing.isFavorite !== undefined) merged.isFavorite = existing.isFavorite;
    if (existing.isNSFWFlagged !== undefined) merged.isNSFWFlagged = existing.isNSFWFlagged;
    if (existing.flaggedImageUrls) {
        merged.flaggedImageUrls = Array.from(new Set([...existing.flaggedImageUrls, ...(incoming.flaggedImageUrls || [])]));
    }

    // 12. editedFields — preserve both existing edits and imported custom locks.
    if (editedFields.size > 0) {
        merged.editedFields = Array.from(editedFields);
    }

    return merged;
};

export const performMergeBatch = (currentModels: Model[], newModels: Model[], autoMergeDuplicates: boolean) => {
    const base = [...currentModels];
    let added = 0;
    let updated = 0;
    let duplicates = 0;

    // Apply future-date tags ('unreleased', 'future-release') based on release_date
    const applyFutureDateTags = (model: Model): Model => {
        if (model.release_date) {
            const releaseDate = new Date(model.release_date);
            const now = new Date();
            if (releaseDate > now) {
                const tags = [...(model.tags || [])];
                if (!tags.includes('unreleased')) tags.push('unreleased');
                if (!tags.includes('future-release')) tags.push('future-release');
                return { ...model, tags };
            }
        }
        return model;
    };

    newModels.forEach(inc => {
        const idx = matchExistingIndex(base, inc, autoMergeDuplicates);
        if (idx === -1) {
            base.push(applyFutureDateTags(inc));
            added++;
        } else {
            // Match found — merge and count as updated. The match itself proves
            // the incoming record was a duplicate that needed reconciling.
            base[idx] = mergeRecords(base[idx], inc);
            updated++;
            duplicates++;
        }
    });

    return {
        models: base,
        added,
        updated,
        duplicates
    };
};
