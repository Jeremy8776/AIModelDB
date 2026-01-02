/**
 * Sync State Hook
 * 
 * Manages synchronization state including sync status, progress tracking,
 * last sync timestamp, and sync summary for toast notifications.
 * 
 * @module useSyncState
 */

import { useState, useRef, useCallback, MutableRefObject } from 'react';

/**
 * Sync state interface containing all sync-related state and setters
 */
export interface SyncState {
    // Sync status
    isSyncing: boolean;
    setIsSyncing: (syncing: boolean) => void;

    // Sync progress
    syncProgress: { current: number; total: number; source?: string; found?: number; statusMessage?: string } | null;
    setSyncProgress: (progress: { current: number; total: number; source?: string; found?: number; statusMessage?: string } | null) => void;

    // Last sync timestamp
    lastSync: string | null;
    setLastSync: (timestamp: string | null) => void;

    // Sync summary (for toast display)
    syncSummary: { found: number; flagged: number; duplicates?: number } | null;
    setSyncSummary: (summary: { found: number; flagged: number; duplicates?: number } | null) => void;
}

/**
 * Custom hook for managing sync state.
 * 
 * Provides centralized state management for synchronization operations including:
 * - Sync status (is syncing)
 * - Progress tracking (current/total sources)
 * - Last sync timestamp
 * - Sync summary for toast display
 * 
 * @returns SyncState object with all state values and setter functions
 * 
 * @example
 * ```tsx
 * const syncState = useSyncState();
 * 
 * // Start sync
 * syncState.setIsSyncing(true);
 * syncState.setSyncProgress({ current: 1, total: 5 });
 * 
 * // Complete sync
 * syncState.setIsSyncing(false);
 * syncState.setLastSync(new Date().toISOString());
 * syncState.setSyncSummary({ found: 100, flagged: 5 });
 * ```
 */
export function useSyncState(): SyncState & { skipSignal: MutableRefObject<boolean>; triggerSkip: () => void } {
    // Sync status state
    const [isSyncing, setIsSyncing] = useState(false);

    // Sync progress state
    const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; source?: string; found?: number; statusMessage?: string } | null>(null);

    // Last sync timestamp state
    const [lastSync, setLastSync] = useState<string | null>(null);

    // Sync summary state (for displaying toast after sync)
    const [syncSummary, setSyncSummary] = useState<{ found: number; flagged: number; duplicates?: number } | null>(null);

    // Skip signal ref - can be checked by async operations to abort early
    const skipSignal = useRef(false);

    const triggerSkip = useCallback(() => {
        skipSignal.current = true;
        console.log('[Sync] Skip signal triggered');
    }, []);

    return {
        isSyncing,
        setIsSyncing,
        syncProgress,
        setSyncProgress,
        lastSync,
        setLastSync,
        syncSummary,
        setSyncSummary,
        skipSignal,
        triggerSkip,
    };
}
