/**
 * Logging Utility
 * 
 * Provides a centralized logging system with different log levels.
 * In production, debug logs are suppressed to reduce console noise.
 * 
 * Features:
 * - Level-based logging (debug, info, warn, error)
 * - Automatic timestamp prefixing
 * - Production-aware (debug logs suppressed when not in dev)
 * - Namespace support for tracing log sources
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
    /** Minimum log level to display */
    minLevel: LogLevel;
    /** Whether to include timestamps */
    timestamps: boolean;
    /** Whether to include log level prefix */
    showLevel: boolean;
}

// Log level priority for filtering
const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
};

// Default configuration based on environment
const isDev = import.meta.env?.DEV ?? (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production');

const defaultConfig: LoggerConfig = {
    minLevel: isDev ? 'debug' : 'info',
    timestamps: false,
    showLevel: true
};

// Track logged messages to prevent spam (only log each unique message once per session in production)
const loggedOnce = new Set<string>();

/**
 * Creates a logger instance with an optional namespace
 */
export function createLogger(namespace?: string) {
    const prefix = namespace ? `[${namespace}]` : '';

    const shouldLog = (level: LogLevel): boolean => {
        return LOG_LEVELS[level] >= LOG_LEVELS[defaultConfig.minLevel];
    };

    const formatMessage = (level: LogLevel, ...args: unknown[]): string => {
        const parts: string[] = [];

        if (defaultConfig.timestamps) {
            parts.push(`[${new Date().toISOString()}]`);
        }

        if (defaultConfig.showLevel) {
            parts.push(`[${level.toUpperCase()}]`);
        }

        if (prefix) {
            parts.push(prefix);
        }

        const message = args.map(arg => {
            if (typeof arg === 'string') return arg;
            if (arg instanceof Error) return arg.stack || arg.message;
            try {
                return JSON.stringify(arg);
            } catch {
                return String(arg);
            }
        }).join(' ');

        return parts.length > 0 ? `${parts.join(' ')} ${message}` : message;
    };

    return {
        /**
         * Debug log - only shown in development
         */
        debug: (...args: unknown[]): void => {
            if (shouldLog('debug')) {
                console.log(formatMessage('debug', ...args));
            }
        },

        /**
         * Info log - general information, shown in production
         */
        info: (...args: unknown[]): void => {
            if (shouldLog('info')) {
                console.log(formatMessage('info', ...args));
            }
        },

        /**
         * Warning log - potential issues, shown in production
         */
        warn: (...args: unknown[]): void => {
            if (shouldLog('warn')) {
                console.warn(formatMessage('warn', ...args));
            }
        },

        /**
         * Error log - always shown
         */
        error: (...args: unknown[]): void => {
            if (shouldLog('error')) {
                console.error(formatMessage('error', ...args));
            }
        },

        /**
         * Log once - only logs the first occurrence of each unique message
         * Useful for preventing spam from recurring issues
         */
        once: (level: LogLevel, ...args: unknown[]): void => {
            const message = formatMessage(level, ...args);
            if (loggedOnce.has(message)) {
                return;
            }
            loggedOnce.add(message);

            switch (level) {
                case 'debug':
                    if (shouldLog('debug')) console.log(message);
                    break;
                case 'info':
                    if (shouldLog('info')) console.log(message);
                    break;
                case 'warn':
                    if (shouldLog('warn')) console.warn(message);
                    break;
                case 'error':
                    if (shouldLog('error')) console.error(message);
                    break;
            }
        },

        /**
         * Group related logs together
         */
        group: (label: string, fn: () => void): void => {
            if (!isDev) {
                fn();
                return;
            }
            console.group(`${prefix} ${label}`);
            try {
                fn();
            } finally {
                console.groupEnd();
            }
        },

        /**
         * Measure and log execution time
         */
        time: async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
            if (!isDev) {
                return fn();
            }
            const start = performance.now();
            try {
                const result = await fn();
                const duration = (performance.now() - start).toFixed(2);
                console.log(`${prefix} ${label}: ${duration}ms`);
                return result;
            } catch (error) {
                const duration = (performance.now() - start).toFixed(2);
                console.error(`${prefix} ${label}: FAILED after ${duration}ms`);
                throw error;
            }
        }
    };
}

// Default logger instance
export const logger = createLogger();

// Pre-created namespaced loggers for common modules
export const loggers = {
    sync: createLogger('Sync'),
    api: createLogger('API'),
    storage: createLogger('Storage'),
    validation: createLogger('Validation'),
    nsfw: createLogger('NSFW'),
    ui: createLogger('UI'),
};

/**
 * Configure logging behavior
 */
export function configureLogging(config: Partial<LoggerConfig>): void {
    Object.assign(defaultConfig, config);
}

/**
 * Clear the "logged once" cache - useful for testing
 */
export function resetLoggedOnce(): void {
    loggedOnce.clear();
}
