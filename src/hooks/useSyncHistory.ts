
import { useState, useEffect, useCallback } from 'react';
import { Model } from '../types';
import {
    saveSnapshot as saveToIDB,
    getSnapshots as getFromIDB,
    deleteSnapshot as deleteFromIDB,
    clearSnapshots as clearFromIDB,
    HistoryEntry
} from '../services/storage/indexedDBStorage';

// Re-export for components
export type { HistoryEntry as HistoryItem };

const MAX_SNAPSHOTS = 5;

export function useSyncHistory() {
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadHistory = useCallback(async () => {
        try {
            const items = await getFromIDB();
            // We map to ensure we have the right shape, though currently they are the same
            setHistory(items);
        } catch (e) {
            console.error("Failed to load history", e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    const saveSnapshot = useCallback(async (models: Model[], description: string) => {
        try {
            const timestamp = Date.now();
            const id = crypto.randomUUID();
            const item: HistoryEntry = {
                id,
                timestamp,
                dateStr: new Date(timestamp).toLocaleString(),
                modelCount: models.length,
                description,
                sizeBytes: new Blob([JSON.stringify(models)]).size,
                models: models
            };

            await saveToIDB(item);

            // Maintain max limit
            const current = await getFromIDB();
            if (current.length > MAX_SNAPSHOTS) {
                // Remove oldest (last in list because getFromIDB sorts desc)
                const toRemove = current.slice(MAX_SNAPSHOTS);
                for (const old of toRemove) {
                    await deleteFromIDB(old.id);
                }
            }

            await loadHistory();
        } catch (e) {
            console.error("Failed to save snapshot", e);
        }
    }, [loadHistory]);

    const restoreSnapshot = useCallback(async (id: string): Promise<Model[] | null> => {
        try {
            // Since we loaded everything into state/IDB, we might already have it in history state
            // But to be safe/consistent with async nature, we can grab it from state or DB.
            // Since getAll returns full objects including models, 'history' state has them.
            const found = history.find(h => h.id === id);
            if (found) return found.models;

            // Fallback reload
            const all = await getFromIDB();
            const fresh = all.find(h => h.id === id);
            return fresh ? fresh.models : null;
        } catch (e) {
            console.error("Failed to restore", e);
            return null;
        }
    }, [history]);

    const clearHistory = useCallback(async () => {
        try {
            await clearFromIDB();
            setHistory([]);
        } catch (e) {
            console.error("Failed to clear history", e);
        }
    }, []);

    const deleteSnapshot = useCallback(async (id: string) => {
        try {
            await deleteFromIDB(id);
            await loadHistory();
        } catch (e) {
            console.error("Failed to delete snapshot", e);
        }
    }, [loadHistory]);

    return { history, isLoading, saveSnapshot, restoreSnapshot, clearHistory, deleteSnapshot };
}
