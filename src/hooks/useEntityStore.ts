import { useCallback, useEffect, useRef, useState } from 'react';
import { loadEntityList, saveEntityList } from '../services/storage/entityStorage';

/**
 * Shared plumbing for the MCP and Skills stores, which both stream pages of
 * records in from many sources.
 *
 * useEntityList: the list state plus its persistence. It loads from IndexedDB
 * (migrating the old localStorage copy on first run) and saves after the list has
 * been quiet for `delayMs`, and when the window is hidden. localStorage could not
 * hold a full registry crawl (about 5 MB limit), which lost the list at restart.
 *
 * useBatchedMerge: collect incoming pages and merge them into state in one go
 * every `delayMs`, instead of one merge, one re-render and one full-list save
 * per page (an MCP sync is 100+ pages).
 */

export function useEntityList<T>(storageKey: string, restore: (raw: unknown) => T[], delayMs = 800) {
    const [items, setItems] = useState<T[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [persistError, setPersistError] = useState<string | null>(null);

    const loaded = useRef(false);
    const latest = useRef<T[]>(items);
    const saved = useRef<T[] | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const write = useCallback(async () => {
        if (timer.current) {
            clearTimeout(timer.current);
            timer.current = null;
        }
        const snapshot = latest.current;
        if (!loaded.current || snapshot === saved.current) return;
        saved.current = snapshot;
        try {
            await saveEntityList(storageKey, snapshot);
            try { localStorage.removeItem(storageKey); } catch { /* the old copy is already superseded */ }
            setPersistError(null);
        } catch (error) {
            // IndexedDB unavailable (e.g. a locked-down browser profile): fall back to localStorage.
            try {
                localStorage.setItem(storageKey, JSON.stringify(snapshot));
                setPersistError(null);
            } catch (fallbackError) {
                saved.current = null; // retry on the next change
                const message = (fallbackError instanceof Error ? fallbackError : error instanceof Error ? error : new Error(String(error))).message;
                console.error(`[Persist] Could not save "${storageKey}":`, message);
                setPersistError(message);
            }
        }
    }, [storageKey]);

    // Load once: IndexedDB first, then the legacy localStorage blob (migrated on the next save).
    useEffect(() => {
        let cancelled = false;
        (async () => {
            let raw: unknown = null;
            try {
                raw = await loadEntityList(storageKey);
            } catch { /* fall through to localStorage */ }
            let fromLegacy = false;
            if (raw === null) {
                try {
                    const legacy = localStorage.getItem(storageKey);
                    if (legacy) {
                        raw = JSON.parse(legacy);
                        fromLegacy = true;
                    }
                } catch { /* corrupt blob: start empty */ }
            }
            if (cancelled) return;
            const restored = restore(raw);
            // Already on disk unless it came from the old localStorage copy.
            saved.current = fromLegacy ? null : restored;
            latest.current = restored;
            loaded.current = true;
            setItems(prev => (prev.length === 0 ? restored : prev));
            setIsLoading(false);
            if (fromLegacy && restored.length > 0) void write(); // move the old copy into IndexedDB now
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- restore is a stable module-level function
    }, [storageKey]);

    // Debounced save on change.
    useEffect(() => {
        latest.current = items;
        if (!loaded.current || items === saved.current) return;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => { void write(); }, delayMs);
    }, [items, delayMs, write]);

    // Save right away when the window is hidden or the hook unmounts.
    useEffect(() => {
        const flush = () => { void write(); };
        window.addEventListener('pagehide', flush);
        window.addEventListener('beforeunload', flush);
        return () => {
            window.removeEventListener('pagehide', flush);
            window.removeEventListener('beforeunload', flush);
            flush();
        };
    }, [write]);

    return { items, setItems, isLoading, persistError };
}

export function useBatchedMerge<T>(
    setItems: React.Dispatch<React.SetStateAction<T[]>>,
    merge: (existing: T[], incoming: T[]) => T[],
    delayMs = 400
) {
    const buffer = useRef<T[]>([]);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mergeRef = useRef(merge);
    mergeRef.current = merge;

    const flush = useCallback(() => {
        if (timer.current) {
            clearTimeout(timer.current);
            timer.current = null;
        }
        if (buffer.current.length === 0) return;
        const batch = buffer.current;
        buffer.current = [];
        setItems(prev => mergeRef.current(prev, batch));
    }, [setItems]);

    const enqueue = useCallback((incoming: T[]) => {
        if (incoming.length === 0) return;
        buffer.current.push(...incoming);
        if (!timer.current) timer.current = setTimeout(flush, delayMs);
    }, [flush, delayMs]);

    useEffect(() => flush, [flush]);

    return { enqueue, flush };
}
