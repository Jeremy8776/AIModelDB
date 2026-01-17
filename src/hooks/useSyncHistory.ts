
import { useState, useEffect } from 'react';
import { Model } from '../types';

export interface HistoryItem {
    id: string;
    timestamp: number;
    dateStr: string;
    modelCount: number;
    description: string;
    sizeBytes: number;
}

const HISTORY_KEY_PREFIX = 'aiModelDB_history_';
const INDEX_KEY = 'aiModelDB_history_index';
const MAX_SNAPSHOTS = 5;

export function useSyncHistory() {
    const [history, setHistory] = useState<HistoryItem[]>([]);

    useEffect(() => {
        loadIndex();
    }, []);

    const loadIndex = () => {
        try {
            const raw = localStorage.getItem(INDEX_KEY);
            if (raw) {
                setHistory(JSON.parse(raw));
            }
        } catch (e) {
            console.error("Failed to load history index", e);
        }
    };

    const saveSnapshot = (models: Model[], description: string) => {
        try {
            const timestamp = Date.now();
            const id = crypto.randomUUID();
            const item: HistoryItem = {
                id,
                timestamp,
                dateStr: new Date(timestamp).toLocaleString(),
                modelCount: models.length,
                description,
                sizeBytes: new Blob([JSON.stringify(models)]).size
            };

            // Save actual data
            localStorage.setItem(`${HISTORY_KEY_PREFIX}${id}`, JSON.stringify(models));

            // Update index
            const all = [item, ...history];
            const kept = all.slice(0, MAX_SNAPSHOTS);
            const dropped = all.slice(MAX_SNAPSHOTS);

            dropped.forEach(d => localStorage.removeItem(`${HISTORY_KEY_PREFIX}${d.id}`));

            localStorage.setItem(INDEX_KEY, JSON.stringify(kept));
            setHistory(kept);

        } catch (e) {
            console.error("Failed to save snapshot. LocalStorage properly full.", e);
        }
    };

    const restoreSnapshot = (id: string): Model[] | null => {
        try {
            const raw = localStorage.getItem(`${HISTORY_KEY_PREFIX}${id}`);
            if (raw) return JSON.parse(raw);
        } catch (e) {
            console.error("Failed to restore", e);
        }
        return null;
    };

    const clearHistory = () => {
        history.forEach(h => localStorage.removeItem(`${HISTORY_KEY_PREFIX}${h.id}`));
        localStorage.removeItem(INDEX_KEY);
        setHistory([]);
    };

    const deleteSnapshot = (id: string) => {
        const target = history.find(h => h.id === id);
        if (!target) return;

        localStorage.removeItem(`${HISTORY_KEY_PREFIX}${id}`);
        const newHistory = history.filter(h => h.id !== id);
        localStorage.setItem(INDEX_KEY, JSON.stringify(newHistory));
        setHistory(newHistory);
    };

    return { history, saveSnapshot, restoreSnapshot, clearHistory, deleteSnapshot };
}
