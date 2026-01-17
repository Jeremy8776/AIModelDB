import { Model, ApiDir } from "../../types";

/**
 * Configuration options for synchronization operations
 */
export interface SyncOptions {
    dataSources: {
        huggingface?: boolean;
        artificialanalysis?: boolean;
        civitai?: boolean;
        openmodeldb?: boolean;
        civitasbay?: boolean;
        ollamaLibrary?: boolean;
        llmDiscovery?: boolean;
    };
    artificialAnalysisApiKey?: string;
    enableNSFWFiltering?: boolean;
    logNSFWAttempts?: boolean;
    customNSFWKeywords?: string[];
    apiConfig?: ApiDir;
    preferredModelProvider?: string | null;
    systemPrompt?: string;
}

/**
 * Progress information for sync operations
 */
export interface SyncProgress {
    /** Current number of sources completed */
    current: number;
    /** Total number of sources to sync */
    total: number;
    /** Name of the current source being synced */
    source?: string;
    /** Number of models found from current source */
    found?: number;
    /** Live status message from console */
    statusMessage?: string;
    /** Estimated time remaining */
    eta?: string;
}

/**
 * Result of a sync operation
 */
export interface SyncResult {
    /** Successfully synced models */
    complete: Model[];
    /** Models that were flagged during sync (e.g., NSFW content) */
    flagged: Model[];
}

/**
 * Callback functions for sync operation events
 */
export interface SyncCallbacks {
    /** Called when sync progress updates */
    onProgress?: (progress: SyncProgress) => void;
    /** Called when a log message is generated */
    onLog?: (message: string) => void;
    /** Called when new models are available for progressive display */
    onModelsUpdate?: (models: Model[]) => void;
    /** Signal to skip long operations (legacy) */
    skipSignal?: { current: boolean };
    /** AbortSignal for cancelling the entire sync operation */
    abortSignal?: AbortSignal;
    /** Called to confirm if user wants to run LLM NSFW check (returns true to proceed, false to skip) */
    onConfirmLLMCheck?: (modelCount: number, estimatedTimeMs: number) => Promise<boolean>;
}

/**
 * Standard interface for a model data source fetcher
 */
export interface Fetcher {
    /** Unique identifier for the source (e.g., 'huggingface') */
    id: string;
    /** Display name for the source */
    name: string;
    /** Check if this source is enabled in the current options */
    isEnabled: (options: SyncOptions) => boolean;
    /** Execute the fetch operation */
    fetch: (options: SyncOptions, callbacks?: SyncCallbacks) => Promise<SyncResult>;
}
