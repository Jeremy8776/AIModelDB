/**
 * Per-source sync cursors, for incremental sync.
 *
 * Each source remembers when it last finished a *successful* pull, so the next
 * sync only has to ask it for what changed since then (newest first, stopping at
 * the cursor) instead of re-crawling everything. The cursor is per source, not one
 * global "last sync": a source that failed or was disabled keeps its old cursor and
 * catches up next time, rather than being skipped because another source worked.
 *
 * Rules:
 *  - No cursor, `fullRefresh` set, or the last full pull older than FULL_REFRESH_DAYS
 *    gives a full pull. The periodic full pull refreshes things an incremental one
 *    cannot see (download counts, deleted or edited records).
 *  - Cutoffs are pulled back by MARGIN_MS so clock skew and timestamps with day
 *    precision never drop a record. Merging is idempotent, so a few repeats cost nothing.
 *  - The cursor is only committed after the source finished without errors.
 */

const STORAGE_KEY = 'aiModelDB_syncCursors';
export const FULL_REFRESH_DAYS = 14;
export const MARGIN_MS = 24 * 60 * 60 * 1000;

interface SyncCursor {
    /** Start time of the last successful pull (ISO). */
    since: string;
    /** Start time of the last successful *full* pull (ISO). */
    fullAt: string;
}

export interface SyncPlan {
    mode: 'full' | 'incremental';
    /** Only records newer than this (epoch ms) are needed; null for a full pull. */
    cutoffMs: number | null;
    /** The same cutoff as an ISO string, for APIs that take a date. */
    cutoffIso: string | null;
    /** Why this mode was chosen, for the console log. */
    reason: string;
}

function readAll(): Record<string, SyncCursor> {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

function writeAll(cursors: Record<string, SyncCursor>) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cursors));
    } catch { /* storage full or disabled: the next sync is simply a full one */ }
}

const FULL: Omit<SyncPlan, 'reason'> = { mode: 'full', cutoffMs: null, cutoffIso: null };

export function planSourceSync(
    sourceId: string,
    options: { fullRefresh?: boolean; now?: number } = {}
): SyncPlan {
    const now = options.now ?? Date.now();
    if (options.fullRefresh) return { ...FULL, reason: 'full refresh requested' };

    const cursor = readAll()[sourceId];
    const since = cursor ? Date.parse(cursor.since) : NaN;
    const fullAt = cursor ? Date.parse(cursor.fullAt) : NaN;
    if (!cursor || !Number.isFinite(since) || !Number.isFinite(fullAt)) {
        return { ...FULL, reason: 'first sync of this source' };
    }
    if (now - fullAt > FULL_REFRESH_DAYS * 24 * 60 * 60 * 1000) {
        return { ...FULL, reason: `last full refresh was over ${FULL_REFRESH_DAYS} days ago` };
    }
    if (since > now + MARGIN_MS) {
        return { ...FULL, reason: 'saved sync time is in the future' }; // clock was changed
    }
    const cutoffMs = since - MARGIN_MS;
    return { mode: 'incremental', cutoffMs, cutoffIso: new Date(cutoffMs).toISOString(), reason: `changes since ${new Date(since).toLocaleString()}` };
}

/** Call after the source finished without errors. `startedAtMs` is when the pull began. */
export function commitSourceSync(sourceId: string, plan: SyncPlan, startedAtMs: number) {
    const cursors = readAll();
    const startedIso = new Date(startedAtMs).toISOString();
    cursors[sourceId] = {
        since: startedIso,
        fullAt: plan.mode === 'full' ? startedIso : cursors[sourceId]?.fullAt ?? startedIso,
    };
    writeAll(cursors);
}

export function clearSyncCursors() {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* nothing to clear */ }
}
