import { useState, useCallback, useEffect } from 'react';
import {
    createFetchInterceptor,
    createConsoleInterceptor,
    createWebhookStream
} from '../services/consoleService';

export interface ConsoleLogging {
    showConsole: boolean;
    setShowConsole: (show: boolean) => void;
    consoleLogs: string[];
    addConsoleLog: (message: string) => void;
    clearConsoleLogs: () => void;
}

/**
 * Custom hook for managing console logging state and interceptors
 * 
 * This hook manages the terminal console state and integrates with the console service
 * to capture fetch requests, console logs, and webhook events for debugging.
 * 
 * @returns ConsoleLogging state and methods
 */
export function useConsoleLogging(): ConsoleLogging {
    // Terminal console state
    const [showConsole, setShowConsole] = useState(false);
    const [consoleLogs, setConsoleLogs] = useState<string[]>([]);

    // Callback to add a console log message
    const addConsoleLog = useCallback((msg: string) => {
        setConsoleLogs(prev => [...prev, msg]);
    }, []);

    // Callback to clear all console logs
    const clearConsoleLogs = useCallback(() => {
        setConsoleLogs([]);
    }, []);

    // Global fetch logger to capture requests/responses/errors (only if console is open)
    useEffect(() => {
        const fetchInterceptor = createFetchInterceptor(addConsoleLog, showConsole);
        fetchInterceptor.install();
        return () => fetchInterceptor.uninstall();
    }, [addConsoleLog, showConsole]);

    // Capture console logs into in-app console (info/warn/error/log) - only when console is open
    useEffect(() => {
        const consoleInterceptor = createConsoleInterceptor(addConsoleLog, showConsole);
        consoleInterceptor.install();
        return () => consoleInterceptor.uninstall();
    }, [addConsoleLog, showConsole]);

    // Live stream (SSE) webhook logs into the in-app console with a polling fallback
    useEffect(() => {
        const webhookStream = createWebhookStream(addConsoleLog);
        webhookStream.start();
        return () => webhookStream.stop();
    }, [addConsoleLog]);

    return {
        showConsole,
        setShowConsole,
        consoleLogs,
        addConsoleLog,
        clearConsoleLogs,
    };
}
