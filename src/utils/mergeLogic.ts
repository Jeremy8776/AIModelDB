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
    // MERGE STRATEGY (V2):
    // 1. IDENTITY & SOURCES: Accumulate sources and all valid links
    // 2. DISCREPANCY RULE: Use data from the source with the EARLIEST release date
    // 3. STATS: Sum downloads across all sources
    // ═══════════════════════════════════════════════════════════════════════════

    // -- Identify chronological winner --
    const exDate = existing.release_date ? new Date(existing.release_date) : null;
    const inDate = incoming.release_date ? new Date(incoming.release_date) : null;

    let older: Model = existing;
    let fresher: Model = incoming;

    // determine older record
    if (inDate && (!exDate || inDate < exDate)) {
        older = incoming;
        fresher = existing;
    }

    const merged: Model = { ...older } as Model;

    // 1. Sources & Links (Accumulate All)
    const sources = new Set<string>();
    existing.source.split(',').forEach(s => sources.add(s.trim()));
    incoming.source.split(',').forEach(s => sources.add(s.trim()));
    merged.source = Array.from(sources).sort().join(', ');

    // Accumulate unique links
    const linkMap = new Map<string, string>(); // url -> label
    const addLink = (url: string | null | undefined, label: string) => {
        if (!url) return;
        // Basic normalization for deduping
        const normalized = url.trim().toLowerCase().replace(/\/$/, '');
        if (!linkMap.has(normalized)) {
            linkMap.set(normalized, label);
        }
    };

    // Add current model links
    (existing.links || []).forEach(l => addLink(l.url, l.label));
    (incoming.links || []).forEach(l => addLink(l.url, l.label));
    // Add primary url/repo
    addLink(existing.url, existing.source.split(',')[0].trim());
    addLink(existing.repo, 'Repository');
    addLink(incoming.url, incoming.source.split(',')[0].trim());
    addLink(incoming.repo, 'Repository');

    merged.links = Array.from(linkMap.entries()).map(([url, label]) => ({ url, label }));

    // Maintain primary url/repo from the older record
    merged.url = older.url || fresher.url;
    merged.repo = older.repo || fresher.repo;

    // 2. Data Discrepancy (Prefer data from the older/first-seen version)
    // Identity fields already taken from 'older' via {...older}
    // We explicitly overwrite fields if 'older' was missing them but 'fresher' has them
    merged.description = older.description || fresher.description;
    merged.parameters = older.parameters || fresher.parameters;
    merged.context_window = older.context_window || fresher.context_window;
    merged.provider = older.provider || fresher.provider;
    merged.domain = (older.domain || fresher.domain) as any;

    // 3. Stats & Downloads (Summation Rule with Source Tracking)
    const stats: Record<string, { downloads?: number; updated_at?: string }> = {
        ...(fresher.source_stats || {}),
        ...(older.source_stats || {})
    };

    // If source_stats missing, initialize from current source/downloads
    const addStat = (m: Model) => {
        const primarySource = m.source.split(',')[0].trim();
        if (primarySource && m.downloads != null) {
            // Only add if it's the primary source for this model record
            if (!stats[primarySource] || (m.updated_at && (!stats[primarySource].updated_at || new Date(m.updated_at) > new Date(stats[primarySource].updated_at!)))) {
                stats[primarySource] = { downloads: m.downloads, updated_at: m.updated_at || undefined };
            }
        }
    };
    addStat(existing);
    addStat(incoming);

    merged.source_stats = stats;
    merged.downloads = Object.values(stats).reduce((acc, curr) => acc + (curr.downloads || 0), 0) || null;

    // 4. Time (Earliest Winning Date)
    merged.release_date = (exDate && inDate)
        ? (exDate < inDate ? existing.release_date : incoming.release_date)
        : (existing.release_date || incoming.release_date);

    // updated_at should be the MOST RECENT known update
    const exUp = existing.updated_at ? new Date(existing.updated_at) : null;
    const inUp = incoming.updated_at ? new Date(incoming.updated_at) : null;
    merged.updated_at = (exUp && inUp)
        ? (exUp > inUp ? existing.updated_at : incoming.updated_at)
        : (existing.updated_at || incoming.updated_at);

    // 5. Accumulating Fields (Union)
    merged.tags = Array.from(new Set([...(existing.tags || []), ...(incoming.tags || [])]));
    merged.usage_restrictions = Array.from(new Set([...(existing.usage_restrictions || []), ...(incoming.usage_restrictions || [])]));
    merged.images = Array.from(new Set([...(existing.images || []), ...(incoming.images || [])]));

    // 6. License - preference for older record's terms if present
    merged.license = {
        name: older.license?.name || fresher.license?.name || 'Unknown',
        type: older.license?.type || fresher.license?.type || 'Custom',
        commercial_use: older.license?.commercial_use ?? fresher.license?.commercial_use ?? true,
        attribution_required: older.license?.attribution_required ?? fresher.license?.attribution_required ?? false,
        share_alike: older.license?.share_alike ?? fresher.license?.share_alike ?? false,
        copyleft: older.license?.copyleft ?? fresher.license?.copyleft ?? false,
        url: older.license?.url || fresher.license?.url || undefined,
        notes: older.license?.notes || fresher.license?.notes || undefined
    } as any;

    // 7. Hosting - accumulate providers, prefer true for boolean flags
    merged.hosting = {
        weights_available: Boolean(existing.hosting?.weights_available || incoming.hosting?.weights_available),
        api_available: Boolean(existing.hosting?.api_available || incoming.hosting?.api_available),
        on_premise_friendly: Boolean(existing.hosting?.on_premise_friendly || incoming.hosting?.on_premise_friendly),
        providers: Array.from(new Set([...(existing.hosting?.providers || []), ...(incoming.hosting?.providers || [])]))
    };

    // 8. Benchmarks & Analytics (Merge)
    // For analytics, fresher data usually overwrites if same key, but we'll follow the older-priority for consistency if keys match
    merged.analytics = {
        ...(fresher.analytics || {}),
        ...(older.analytics || {})
    };

    // For benchmarks, combine unique ones by name
    const benchmarkMap = new Map<string, any>();
    (fresher.benchmarks || []).forEach(b => benchmarkMap.set(b.name, b));
    (older.benchmarks || []).forEach(b => benchmarkMap.set(b.name, b)); // Older overwrites if name matches
    merged.benchmarks = Array.from(benchmarkMap.values());

    // User-set fields (Always from existing if user has interacted)
    if (existing.isFavorite !== undefined) merged.isFavorite = existing.isFavorite;
    if (existing.isNSFWFlagged !== undefined) merged.isNSFWFlagged = existing.isNSFWFlagged;
    if (existing.flaggedImageUrls) merged.flaggedImageUrls = [...new Set([...existing.flaggedImageUrls, ...(incoming.flaggedImageUrls || [])])];

    return merged;
};

export const performMergeBatch = (currentModels: Model[], newModels: Model[], autoMergeDuplicates: boolean) => {
    const base = [...currentModels];
    let added = 0;
    let updated = 0;
    let duplicates = 0;

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
            // Brand new model
            base.push(applyFutureDateTags(inc));
            added++;
        } else {
            // Already exists in DB - count as duplicate/update
            const original = base[idx];

            // Check if anything actually changed (simple heuristic)
            const wasIncomplete = !original.description || !original.parameters || !original.tags?.length;

            base[idx] = mergeRecords(original, inc);

            // If it was incomplete and now it has more data, count as updated
            const isNowComplete = base[idx].description && base[idx].parameters;

            if (wasIncomplete && isNowComplete) {
                updated++;
            } else {
                duplicates++;
            }
        }
    });

    const finalModels = dedupe(base);

    // Safety check: if dedupe removed more items that weren't caught by matchExistingIndex
    const unaccounted = (base.length - finalModels.length);
    if (unaccounted > 0) {
        duplicates += unaccounted;
    }

    return {
        models: finalModels,
        added,
        updated,
        duplicates
    };
};
