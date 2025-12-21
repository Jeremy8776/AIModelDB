/**
 * Console Service
 * 
 * Provides console logging interception and webhook streaming functionality.
 * This service captures fetch requests, console logs, and webhook events for debugging.
 */

export interface ConsoleInterceptor {
    install: () => void;
    uninstall: () => void;
}

export interface WebhookStream {
    start: () => void;
    stop: () => void;
}

/**
 * Create a fetch interceptor that logs all HTTP requests and responses
 * 
 * @param onLog - Callback function to handle log messages
 * @param enabled - Whether the interceptor should be active
 * @returns ConsoleInterceptor with install/uninstall methods
 */
export function createFetchInterceptor(
    onLog: (message: string) => void,
    enabled: boolean
): ConsoleInterceptor {
    let originalFetch: typeof window.fetch | null = null;

    const install = () => {
        if (!enabled || originalFetch) return;

        originalFetch = window.fetch;
        window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
            const id = Math.random().toString(36).slice(2, 8);
            const url = typeof input === 'string' ? input : (input as URL).toString();
            const method = init?.method || 'GET';

            try {
                // Log request
                const headers = JSON.stringify(init?.headers || {});
                const body = init?.body
                    ? (typeof init.body === 'string' ? init.body : '[binary]')
                    : '';

                onLog(
                    `[REQ ${id}] ${url} ${method}\n` +
                    `Headers: ${headers}` +
                    (body ? `\nBody: ${body}` : '')
                );

                // Execute request
                const resp = await originalFetch!(input as any, init);

                // Log response
                const cloned = resp.clone();
                const text = await cloned.text().catch(() => '[non-text body]');
                onLog(
                    `[RES ${id}] ${resp.status} ${resp.statusText} ${url}\n` +
                    `${text?.slice(0, 2000)}`
                );

                return resp;
            } catch (err: any) {
                // Log error
                onLog(`[ERR ${id}] ${url}\n${err?.message || err}`);
                throw err;
            }
        };
    };

    const uninstall = () => {
        if (originalFetch) {
            window.fetch = originalFetch;
            originalFetch = null;
        }
    };

    return { install, uninstall };
}

/**
 * Create a console interceptor that captures console.log/info/warn/error calls
 * 
 * @param onLog - Callback function to handle log messages
 * @param enabled - Whether the interceptor should be active
 * @returns ConsoleInterceptor with install/uninstall methods
 */
export function createConsoleInterceptor(
    onLog: (message: string) => void,
    enabled: boolean
): ConsoleInterceptor {
    let originalConsole: {
        log: typeof console.log;
        info: typeof console.info;
        warn: typeof console.warn;
        error: typeof console.error;
    } | null = null;

    const toLine = (level: 'LOG' | 'INFO' | 'WARN' | 'ERROR', args: any[]): string => {
        const ts = new Date().toISOString();
        const msg = args.map(a => {
            try {
                if (typeof a === 'string') return a;
                if (a instanceof Error) return a.stack || a.message;
                return JSON.stringify(a);
            } catch {
                return String(a);
            }
        }).join(' ');
        return `[${level} ${ts}] ${msg}`;
    };

    const install = () => {
        if (!enabled || originalConsole) return;

        originalConsole = {
            log: console.log,
            info: console.info,
            warn: console.warn,
            error: console.error
        };

        console.log = (...args: any[]) => {
            try {
                onLog(toLine('LOG', args));
            } catch { }
            originalConsole!.log(...args);
        };

        console.info = (...args: any[]) => {
            try {
                onLog(toLine('INFO', args));
            } catch { }
            originalConsole!.info(...args);
        };

        console.warn = (...args: any[]) => {
            try {
                onLog(toLine('WARN', args));
            } catch { }
            originalConsole!.warn(...args);
        };

        console.error = (...args: any[]) => {
            try {
                onLog(toLine('ERROR', args));
            } catch { }
            originalConsole!.error(...args);
        };
    };

    const uninstall = () => {
        if (originalConsole) {
            console.log = originalConsole.log;
            console.info = originalConsole.info;
            console.warn = originalConsole.warn;
            console.error = originalConsole.error;
            originalConsole = null;
        }
    };

    return { install, uninstall };
}

/**
 * Create a webhook stream that listens for webhook events via SSE or polling
 * 
 * @param onLog - Callback function to handle log messages
 * @returns WebhookStream with start/stop methods
 */
export function createWebhookStream(
    onLog: (message: string) => void
): WebhookStream {
    let isMounted = true;
    let eventSource: EventSource | null = null;
    let pollIntervalId: number | null = null;
    let lastWebhookId: string | null = null;

    const canUseWebhooks = (import.meta.env.PROD || import.meta.env.VITE_USE_PROXY === 'true') &&
        (window.location.protocol === 'http:' || window.location.protocol === 'https:');

    /**
     * Poll for webhook logs via HTTP endpoint
     */
    const poll = async () => {
        if (!canUseWebhooks) return;

        try {
            const resp = await fetch('/webhooks/openai/logs', {
                signal: AbortSignal.timeout(1000)
            });

            if (!resp.ok) return;

            const logs = await resp.json();
            if (!Array.isArray(logs) || logs.length === 0) return;

            const newestId = logs[0]?.id || null;
            if (!newestId) return;

            // Determine new events since last seen
            let newEvents = logs;
            if (lastWebhookId) {
                const idx = logs.findIndex((e: any) => e.id === lastWebhookId);
                newEvents = idx > 0 ? logs.slice(0, idx) : idx === 0 ? [] : logs;
            }

            // Append oldest-first for readable order
            newEvents.slice().reverse().forEach((evt: any) => {
                const header = `[WEBHOOK] ${evt.ts || ''} verified=${evt.verified ? 'yes' : 'no'}`;
                const body = typeof evt.body === 'string'
                    ? evt.body
                    : JSON.stringify(evt.body || {}, null, 2);
                onLog(`${header}\n${body}`);
            });

            lastWebhookId = newestId;
        } catch {
            // Silently fail - polling errors are expected
        }
    };

    /**
     * Initialize SSE connection with fallback to polling
     */
    const init = async () => {
        if (!canUseWebhooks) {
            return; // dev without proxy/server: skip to avoid 404 noise
        }

        // Probe availability before wiring SSE
        try {
            const head = await fetch('/webhooks/openai/logs', {
                signal: AbortSignal.timeout(1000)
            });
            if (!head.ok) return; // not available; skip
        } catch {
            return;
        }

        try {
            // Try to establish SSE connection
            eventSource = new EventSource('/webhooks/openai/stream');

            eventSource.onmessage = (e) => {
                if (!isMounted) return;

                try {
                    const evt = JSON.parse(e.data);
                    const header = `[WEBHOOK] ${evt.ts || ''} verified=${evt.verified ? 'yes' : 'no'}`;
                    const body = typeof evt.body === 'string'
                        ? evt.body
                        : JSON.stringify(evt.body || {}, null, 2);
                    onLog(`${header}\n${body}`);
                    lastWebhookId = evt.id || lastWebhookId;
                } catch {
                    // Silently fail on parse errors
                }
            };

            eventSource.onerror = () => {
                // SSE failed, fall back to polling
                if (eventSource) {
                    eventSource.close();
                    eventSource = null;
                }
                pollIntervalId = window.setInterval(() => {
                    if (isMounted) void poll();
                }, 5000);
            };

            // Initial backfill via one poll
            await poll();
        } catch {
            // SSE not available, use polling
            pollIntervalId = window.setInterval(() => {
                if (isMounted) void poll();
            }, 5000);
        }
    };

    const start = () => {
        isMounted = true;
        void init();
    };

    const stop = () => {
        isMounted = false;

        if (eventSource) {
            eventSource.close();
            eventSource = null;
        }

        if (pollIntervalId !== null) {
            window.clearInterval(pollIntervalId);
            pollIntervalId = null;
        }
    };

    return { start, stop };
}
