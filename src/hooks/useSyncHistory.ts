
import { useState, useEffect, useCallback } from 'react';
import { Model } from '../types';
import {
    saveSnapshot as saveToIDB,
    getSnapshots as getFromIDB,
    getSnapshotModels,
    deleteSnapshot as deleteFromIDB,
    clearSnapshots as clearFromIDB,
    buildMeta,
    HistoryMeta
} from '../services/storage/historyStorage';

// Re-export for components. The list holds metadata only; models are read on restore.
export type { HistoryMeta as HistoryItem };

const MAX_SNAPSHOTS = 5;

export function useSyncHistory() {
    const [history, setHistory] = useState<HistoryMeta[]>([]);
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
            const item = buildMeta(models, description);

            await saveToIDB(item, models);

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
            return await getSnapshotModels(id);
        } catch (e) {
            console.error("Failed to restore", e);
            return null;
        }
    }, []);

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
