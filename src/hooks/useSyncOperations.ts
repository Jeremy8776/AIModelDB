import React, { useCallback } from 'react';
import { Model, ApiDir } from '../types';
import { syncAllSources, syncWithLiveOptions } from '../services/syncService';
import { dedupe } from '../utils/format';
import { Settings } from '../context/SettingsContext';

interface SyncCallbacks {
    setIsSyncing: (syncing: boolean) => void;
    setSyncProgress: (progress: any) => void;
    setSyncSummary: (summary: any) => void;
    addConsoleLog: (msg: string) => void;
    setModels: React.Dispatch<React.SetStateAction<Model[]>>;
    mergeInModels: (models: Model[]) => void;
    setLastMergeStats: (stats: any) => void;
    setLastSync: (date: string) => void;
    setPage: (page: number) => void;
    setFlaggedModels: (models: Model[]) => void;
    setShowFlaggedModal: (show: boolean) => void;
    saveSnapshot: (models: Model[], description: string) => void;
    setShowSync?: (show: boolean) => void;
}

interface UseSyncOperationsOptions {
    models: Model[];
    settings: Settings;
    callbacks: SyncCallbacks;
}

/**
 * Hook for handling all sync-related operations
 * Extracts sync logic from AIModelDB for better modularity
 */
export function useSyncOperations({ models, settings, callbacks }: UseSyncOperationsOptions) {
    const {
        setIsSyncing,
        setSyncProgress,
        setSyncSummary,
        addConsoleLog,
        setModels,
        mergeInModels,
        setLastMergeStats,
        setLastSync,
        setPage,
        setFlaggedModels,
        setShowFlaggedModal,
        saveSnapshot,
        setShowSync
    } = callbacks;

    /**
     * Syncs model data from all configured sources
     */
    const syncAll = useCallback(async (showSpinner = true) => {
        try {
            if (showSpinner) setIsSyncing(true);
            setLastMergeStats(null);

            // Save a snapshot before sync (for rollback)
            if (models.length > 0) {
                saveSnapshot(models, `Pre-sync backup (${models.length} models)`);
                addConsoleLog("Created pre-sync snapshot for rollback");
            }

            const result = await syncAllSources(
                {
                    dataSources: settings.dataSources || {},
                    artificialAnalysisApiKey: settings.artificialAnalysisApiKey,
                    enableNSFWFiltering: settings.enableNSFWFiltering,
                    logNSFWAttempts: settings.logNSFWAttempts,
                    apiConfig: settings.apiConfig,
                    preferredModelProvider: settings.preferredModelProvider,
                    systemPrompt: settings.systemPrompt
                },
                {
                    onProgress: setSyncProgress,
                    onLog: addConsoleLog,
                    onModelsUpdate: (newModels) => {
                        setModels(prev => dedupe([...(prev || []), ...newModels]));
                    }
                }
            );

            const uniqueCount = dedupe(result.complete).length;
            const dups = Math.max(0, result.complete.length - uniqueCount);
            setSyncSummary({ found: result.complete.length, flagged: result.flagged.length, duplicates: dups });
            mergeInModels(result.complete);
            setLastSync(new Date().toISOString());
            setPage(1);

            if (result.flagged.length > 0) {
                setFlaggedModels(result.flagged);
                setShowFlaggedModal(true);
            }

            setTimeout(() => {
                if (showSpinner) {
                    setSyncProgress(null);
                    setIsSyncing(false);
                }
            }, 1500);
        } catch (error) {
            console.error("Error syncing models:", error);
            addConsoleLog(`Error syncing models: ${error instanceof Error ? error.message : String(error)}`);
            if (showSpinner) {
                setSyncProgress(null);
                setIsSyncing(false);
            }
        }
    }, [
        models, settings, setIsSyncing, setLastMergeStats, saveSnapshot, addConsoleLog,
        setSyncProgress, setModels, mergeInModels, setSyncSummary, setLastSync, setPage,
        setFlaggedModels, setShowFlaggedModal
    ]);

    /**
     * Handles live sync with AI services and custom options
     */
    const handleLiveSync = useCallback(async (options?: {
        autoRefresh?: { enabled: boolean, interval: number, unit: string },
        minDownloadsBypass?: number,
        systemPrompt?: string,
        apiConfig?: ApiDir
    }) => {
        if (options?.systemPrompt && options?.apiConfig) {
            setIsSyncing(true);
            setLastMergeStats(null);
            try {
                const result = await syncWithLiveOptions(
                    {
                        dataSources: settings.dataSources || {},
                        artificialAnalysisApiKey: settings.artificialAnalysisApiKey,
                        enableNSFWFiltering: settings.enableNSFWFiltering,
                        logNSFWAttempts: settings.logNSFWAttempts,
                        apiConfig: options.apiConfig,
                        preferredModelProvider: settings.preferredModelProvider,
                        systemPrompt: options.systemPrompt,
                        autoRefresh: options.autoRefresh,
                        minDownloadsBypass: options.minDownloadsBypass
                    },
                    {
                        onProgress: setSyncProgress,
                        onLog: addConsoleLog
                    }
                );

                const uniqueCount = dedupe(result.complete).length;
                const dups = Math.max(0, result.complete.length - uniqueCount);
                setSyncSummary({ found: result.complete.length, flagged: result.flagged.length, duplicates: dups });
                mergeInModels(result.complete);
                setLastSync(new Date().toISOString());
                setPage(1);

                if (result.flagged.length > 0) {
                    setFlaggedModels(result.flagged);
                    setShowFlaggedModal(true);
                }
            } catch (err) {
                console.error("Error syncing models:", err);
                addConsoleLog(`Error syncing models: ${err instanceof Error ? err.message : String(err)}`);
            } finally {
                setTimeout(() => {
                    setSyncProgress(null);
                    setIsSyncing(false);
                    setShowSync?.(false);
                }, 1500);
            }
        } else {
            await syncAll(true);
            setShowSync?.(false);
        }
    }, [
        settings, setIsSyncing, setLastMergeStats, setSyncProgress, addConsoleLog,
        mergeInModels, setSyncSummary, setLastSync, setPage, setFlaggedModels,
        setShowFlaggedModal, setShowSync, syncAll
    ]);

    return {
        syncAll,
        handleLiveSync
    };
}
