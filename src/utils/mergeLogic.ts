import { Model } from '../types';
import { dedupe, normalizeNameForMatch, cleanModelDescription } from './format';

// Helper to determine if an update is permitted based on "completeness" or specific rules
// (For now, we just follow the implementation we had in the hook)

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
    // 4) Optional fuzzy name + tolerant provider
    if (autoMergeDuplicates) {
        const incProv = (inc.provider || '').toString().toLowerCase();
        const incBase = normalizeNameForMatch(inc.name);
        if (incBase) {
            idx = arr.findIndex(e => {
                // Require same domain to reduce false merges
                const sameDomain = !inc.domain || !e.domain ? true : inc.domain === e.domain;
                const exProv = (e.provider || '').toString().toLowerCase();
                const provOk = incProv === exProv || !incProv || !exProv || incProv.includes(exProv) || exProv.includes(incProv);
                return sameDomain && normalizeNameForMatch(e.name) === incBase && provOk;
            });
            if (idx !== -1) return idx;
        }
    }
    return -1;
};

export const mergeRecords = (existing: Model, incoming: Model): Model => {
    const containsCJK = (text?: string | null): boolean => {
        if (!text) return false;
        return /[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u30ff\uac00-\ud7af]/.test(text);
    };
    const preferIncomingText = (
        existingText?: string | null,
        incomingText?: string | null,
        incomingTags?: string[]
    ): string | null | undefined => {
        if (incomingTags && incomingTags.includes('translated')) {
            return incomingText || existingText;
        }
        if (incomingText && !containsCJK(incomingText) && containsCJK(existingText || '')) {
            return incomingText;
        }
        return existingText || incomingText;
    };

    const merged: Model = { ...existing } as Model;

    // ═══════════════════════════════════════════════════════════════════════════
    // MERGE STRATEGY:
    // - IDENTITY fields (stable): Prefer existing to avoid overwriting user edits
    // - DYNAMIC fields (change over time): Prefer INCOMING to get fresh data from sources
    // - ACCUMULATING fields: Merge both to collect all values
    // ═══════════════════════════════════════════════════════════════════════════

    // IDENTITY FIELDS - Prefer existing (stable, don't change)
    merged.name = preferIncomingText(existing.name, incoming.name, incoming.tags) || existing.name || incoming.name || '';
    merged.provider = existing.provider || incoming.provider;
    merged.domain = (existing.domain || incoming.domain) as any;
    merged.source = existing.source || incoming.source;
    merged.url = existing.url || incoming.url || null;
    merged.repo = existing.repo || incoming.repo || null;

    // DYNAMIC FIELDS - Prefer INCOMING to get updated data from sources
    // These fields can change over time and should be updated on re-sync
    merged.release_date = incoming.release_date || existing.release_date || null;
    merged.updated_at = incoming.updated_at || existing.updated_at || null;
    merged.downloads = incoming.downloads ?? existing.downloads ?? null;
    merged.parameters = incoming.parameters || existing.parameters || null;
    merged.context_window = incoming.context_window || existing.context_window || null;
    merged.indemnity = incoming.indemnity || existing.indemnity || 'None';
    merged.data_provenance = incoming.data_provenance || existing.data_provenance || null;

    // Check if release date is in the future
    let isFutureRelease = false;
    if (merged.release_date) {
        const releaseDate = new Date(merged.release_date);
        const now = new Date();
        if (releaseDate > now) {
            isFutureRelease = true;
        }
    }

    // ACCUMULATING FIELDS - Merge both to collect all values
    merged.usage_restrictions = Array.from(new Set([...(existing.usage_restrictions || []), ...(incoming.usage_restrictions || [])]));
    merged.tags = Array.from(new Set([...(existing.tags || []), ...(incoming.tags || [])]));

    // License - prefer incoming for dynamic fields, existing for stable ones
    merged.license = {
        name: incoming.license?.name || existing.license?.name || 'Unknown',
        type: incoming.license?.type || existing.license?.type || 'Custom',
        commercial_use: incoming.license?.commercial_use ?? existing.license?.commercial_use ?? true,
        attribution_required: incoming.license?.attribution_required ?? existing.license?.attribution_required ?? false,
        share_alike: incoming.license?.share_alike ?? existing.license?.share_alike ?? false,
        copyleft: incoming.license?.copyleft ?? existing.license?.copyleft ?? false,
        url: incoming.license?.url || existing.license?.url || undefined,
        notes: incoming.license?.notes || existing.license?.notes || undefined
    } as any;

    // Hosting - accumulate providers, prefer true for boolean flags
    merged.hosting = {
        weights_available: Boolean(incoming.hosting?.weights_available || existing.hosting?.weights_available),
        api_available: Boolean(incoming.hosting?.api_available || existing.hosting?.api_available),
        on_premise_friendly: Boolean(incoming.hosting?.on_premise_friendly || existing.hosting?.on_premise_friendly),
        providers: Array.from(new Set([...(existing.hosting?.providers || []), ...(incoming.hosting?.providers || [])]))
    };

    // Add unreleased/future-release tags if release date is in the future
    if (isFutureRelease) {
        if (!merged.tags.includes('unreleased')) {
            merged.tags.push('unreleased');
        }
        if (!merged.tags.includes('future-release')) {
            merged.tags.push('future-release');
        }
    }

    // Remove unreleased tags if release date is now in the past (model was released!)
    if (!isFutureRelease && merged.release_date) {
        merged.tags = merged.tags.filter(t => t !== 'unreleased' && t !== 'future-release');
    }

    // Description - prefer incoming if it has new/translated content
    const preferredDescription = preferIncomingText(existing.description as any, incoming.description as any, incoming.tags);
    if (preferredDescription != null) {
        (merged as any).description = cleanModelDescription(preferredDescription as any);
    }

    // Pricing - prefer incoming pricing, merge unique entries
    // Put incoming first so it takes precedence for duplicates
    const priceSig = (p: any) => `${(p.model || '').toLowerCase()}|${(p.unit || '').toLowerCase()}|${p.input ?? ''}|${p.output ?? ''}|${p.flat ?? ''}|${(p.currency || '').toUpperCase()}`;
    const normalizePricing = (p: any): any => ({
        ...p,
        model: p.model || 'Usage',
        unit: p.unit || (p.flat != null ? 'month' : 'token'),
        currency: p.currency || 'USD'
    });
    const incomingPricing = (incoming.pricing || []).map(normalizePricing);
    const existingPricing = (existing.pricing || []).map(normalizePricing);
    const mergedPricing: any[] = [];
    const seen = new Set<string>();
    // Process incoming first so it takes precedence
    [...incomingPricing, ...existingPricing].forEach(p => {
        const sig = priceSig(p);
        if (!seen.has(sig)) { seen.add(sig); mergedPricing.push(p); }
    });
    if (mergedPricing.length > 0) merged.pricing = mergedPricing as any;

    // Benchmarks - prefer incoming (fresher data from sources)
    if (incoming.benchmarks && incoming.benchmarks.length > 0) {
        merged.benchmarks = incoming.benchmarks;
    } else if (existing.benchmarks) {
        merged.benchmarks = existing.benchmarks;
    }

    // Images - merge unique images, incoming first
    const allImages = [...(incoming.images || []), ...(existing.images || [])];
    if (allImages.length > 0) {
        merged.images = [...new Set(allImages)];
    }

    // Analytics - prefer incoming (fresher data)
    if (incoming.analytics) {
        merged.analytics = incoming.analytics;
    } else if (existing.analytics) {
        merged.analytics = existing.analytics;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // USER-SET FIELDS - ALWAYS preserve existing (these are manual user actions)
    // These should NEVER be overwritten by incoming sync data
    // ═══════════════════════════════════════════════════════════════════════════

    // Favorite status - preserve user's manual favorite setting
    if (existing.isFavorite !== undefined) {
        merged.isFavorite = existing.isFavorite;
    }

    // NSFW flag on entire model - preserve user's manual NSFW flag
    if (existing.isNSFWFlagged !== undefined) {
        merged.isNSFWFlagged = existing.isNSFWFlagged;
    }

    // Flagged image URLs - preserve user's manual per-image NSFW flags
    // Merge existing flags with any new flags, but never remove existing ones
    if (existing.flaggedImageUrls && existing.flaggedImageUrls.length > 0) {
        const incomingFlags = incoming.flaggedImageUrls || [];
        merged.flaggedImageUrls = [...new Set([...existing.flaggedImageUrls, ...incomingFlags])];
    } else if (incoming.flaggedImageUrls) {
        merged.flaggedImageUrls = incoming.flaggedImageUrls;
    }

    return merged;
};

export const performMergeBatch = (currentModels: Model[], newModels: Model[], autoMergeDuplicates: boolean) => {
    // Clone to avoid mutation of state passed in (though worker communication is copy-by-value/structured clone anyway)
    const base = [...currentModels];
    let added = 0;
    let updated = 0;

    // Helper to apply future date tags to a model
    const applyFutureDateTags = (model: Model): Model => {
        if (model.release_date) {
            const releaseDate = new Date(model.release_date);
            const now = new Date();
            if (releaseDate > now) {
                const tags = [...(model.tags || [])];
                if (!tags.includes('unreleased')) {
                    tags.push('unreleased');
                }
                if (!tags.includes('future-release')) {
                    tags.push('future-release');
                }
                return { ...model, tags };
            }
        }
        return model;
    };

    newModels.forEach(inc => {
        const idx = matchExistingIndex(base, inc, autoMergeDuplicates);
        if (idx === -1) {
            // Apply future date tags to new models before adding
            base.push(applyFutureDateTags(inc));
            added++;
        } else {
            base[idx] = mergeRecords(base[idx], inc);
            updated++;
        }
    });

    const finalModels = dedupe(base);
    return { models: finalModels, added, updated };
};
