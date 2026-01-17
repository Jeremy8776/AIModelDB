/**
 * Application Constants
 * 
 * Centralized configuration values to avoid magic numbers throughout the codebase.
 * All values should have explanatory comments.
 */

// Re-export API providers
export { API_PROVIDERS, type ApiProviderDefinition } from './apiProviders';

export const LIMITS = {
    /** Maximum models to fetch from HuggingFace API in a single request */
    MAX_HUGGINGFACE_MODELS: 10000,

    /** Default page size for model list virtualization */
    DEFAULT_PAGE_SIZE: 50,

    /** Maximum models before recommending pagination */
    PAGINATION_THRESHOLD: 1000,

    /** Chunk size for processing large model arrays */
    PROCESSING_CHUNK_SIZE: 1000,

    /** Batch size for validation operations */
    VALIDATION_BATCH_SIZE: 50,

    /** Maximum batches for validation to prevent runaway operations */
    MAX_VALIDATION_BATCHES: 100,
} as const;

/**
 * Timing Constants (in milliseconds)
 */
export const TIMING = {
    /** Debounce delay for model persistence saves */
    PERSISTENCE_DEBOUNCE_MS: 500,

    /** Animation delay after sync completion */
    SYNC_ANIMATION_DELAY_MS: 1500,

    /** Timeout for API requests */
    API_TIMEOUT_MS: 30000,

    /** Validation operation timeout */
    VALIDATION_TIMEOUT_MS: 60000,

    /** Rate limiter minimum interval for free tier */
    RATE_LIMIT_FREE_INTERVAL_MS: 20000,

    /** Rate limiter minimum interval for Tier 1 */
    RATE_LIMIT_TIER1_INTERVAL_MS: 3000,

    /** Rate limiter minimum interval for Tier 4 (bulk operations) */
    RATE_LIMIT_TIER4_INTERVAL_MS: 200,

    /** Polling interval for webhook stream fallback */
    WEBHOOK_POLL_INTERVAL_MS: 5000,

    /** Delay before checking for updates after app start (ms) */
    UPDATE_CHECK_DELAY_MS: 3000,

    /** Splash screen display duration in production (ms) */
    SPLASH_SCREEN_DURATION_MS: 1500,

    /** Splash screen display duration in development (ms) */
    SPLASH_SCREEN_DEV_DURATION_MS: 500,

    /** Undo toast display duration (ms) */
    UNDO_TOAST_DURATION_MS: 5000,
} as const;

/**
 * Storage Constants
 */
export const STORAGE = {
    /** Threshold for switching from localStorage to IndexedDB */
    INDEXEDDB_THRESHOLD: 500,

    /** IndexedDB database name */
    DB_NAME: 'aiModelDB',

    /** IndexedDB version */
    DB_VERSION: 1,

    /** localStorage key prefix */
    STORAGE_PREFIX: 'aiModelDB_',

    /** Settings key name */
    SETTINGS_KEY: 'aiModelDB_settings',

    /** Models key name (localStorage fallback) */
    MODELS_KEY: 'aiModelDB_models',

    /** Last sync timestamp key */
    LAST_SYNC_KEY: 'aiModelDB_lastSync',
} as const;

/**
 * UI Constants
 */
export const UI = {
    /** Number of models to show in virtualized list */
    VIRTUAL_LIST_OVERSCAN: 5,

    /** Height of each row in the model table (pixels) */
    TABLE_ROW_HEIGHT: 52,

    /** Compact mode row height (pixels) */
    COMPACT_ROW_HEIGHT: 40,

    /** Maximum characters before truncating description */
    MAX_DESCRIPTION_LENGTH: 500,

    /** Maximum tags to display before "show more" */
    MAX_VISIBLE_TAGS: 5,

    /** Sidebar width (pixels) */
    SIDEBAR_WIDTH: 280,

    /** Detail panel width (pixels) */
    DETAIL_PANEL_WIDTH: 400,
} as const;

/**
 * Rate Limiter Tiers
 */
export const RATE_LIMIT_TIERS = {
    free: { maxRequests: 3, timeWindowMinutes: 1, minIntervalMs: 20000 },
    tier1: { maxRequests: 20, timeWindowMinutes: 1, minIntervalMs: 3000 },
    tier2: { maxRequests: 50, timeWindowMinutes: 1, minIntervalMs: 1200 },
    tier3: { maxRequests: 100, timeWindowMinutes: 1, minIntervalMs: 600 },
    tier4: { maxRequests: 300, timeWindowMinutes: 1, minIntervalMs: 200 },
} as const;

/**
 * Validation Constants
 */
export const VALIDATION = {
    /** Default retry count for failed operations */
    DEFAULT_RETRIES: 3,

    /** Exponential backoff base delay (ms) */
    BACKOFF_BASE_MS: 1000,

    /** Maximum backoff delay (ms) */
    MAX_BACKOFF_MS: 10000,
} as const;

/**
 * Application Metadata
 */
export const APP = {
    /** Application name */
    NAME: 'AI Model DB',

    /** Application ID for Electron */
    APP_ID: 'com.aimodeldb',

    /** GitHub repository */
    REPO_URL: 'https://github.com/Jeremy8776/AIModelDB',

    /** Current config version for migration */
    CONFIG_VERSION: 2,
} as const;
