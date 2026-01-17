/**
 * Sync Service (Facade)
 * 
 * Orchestrates the synchronization process by delegating to specific micro-services.
 * 
 * @module syncService
 */

import { SyncOptions, SyncCallbacks, SyncResult } from "./sync/SyncTypes";
import { orchestrateSync } from "./sync/SyncOrchestrator";

export type { SyncOptions, SyncCallbacks, SyncResult, SyncProgress } from "./sync/SyncTypes";

/**
 * Synchronize all enabled data sources and return combined results.
 */
export async function syncAllSources(
    options: SyncOptions,
    callbacks?: SyncCallbacks
): Promise<SyncResult> {
    return orchestrateSync(options, callbacks);
}

/**
 * Synchronize with live options including auto-refresh and custom prompts.
 */
export async function syncWithLiveOptions(
    options: SyncOptions & {
        autoRefresh?: { enabled: boolean; interval: number; unit: string };
        minDownloadsBypass?: number;
    },
    callbacks?: SyncCallbacks
): Promise<SyncResult> {
    const { onLog } = callbacks || {};

    if (options.autoRefresh?.enabled) {
        const intervalValue = options.autoRefresh.interval;
        const unit = options.autoRefresh.unit;
        console.log(`Auto-refresh set for every ${intervalValue} ${unit}`);
        if (onLog) {
            onLog(`Auto-refresh set for every ${intervalValue} ${unit}`);
        }
    }

    // Use the main orchestrator
    return orchestrateSync(options, callbacks);
}
