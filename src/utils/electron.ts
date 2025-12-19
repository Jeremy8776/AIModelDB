// Type declarations for Electron API exposed via preload script
// Extends the existing interface from fetch-wrapper.ts

export interface ElectronAPIExtended {
    // Fetch wrapper
    fetchExternal: (url: string, options?: RequestInit) => Promise<{
        ok: boolean;
        status: number;
        statusText: string;
        headers: Record<string, string>;
        body: string;
    }>;
    // App info
    getAppVersion: () => Promise<string>;
    getPlatform: () => Promise<string>;
    // Open external URLs  
    openExternal: (url: string) => void;
    // Check if running in Electron
    isElectron: boolean;
}

declare global {
    interface Window {
        electronAPI?: ElectronAPIExtended;
    }
}

/**
 * Check if running inside Electron
 */
export function isElectron(): boolean {
    return typeof window !== 'undefined' &&
        window.electronAPI !== undefined &&
        'isElectron' in window.electronAPI &&
        window.electronAPI.isElectron === true;
}

/**
 * Open URL in external browser (works in both Electron and web)
 */
export function openExternalUrl(url: string): void {
    if (isElectron() && window.electronAPI?.openExternal) {
        window.electronAPI.openExternal(url);
    } else {
        window.open(url, '_blank', 'noopener,noreferrer');
    }
}

/**
 * Get app version (in Electron) or return fallback
 */
export async function getAppVersion(): Promise<string> {
    if (isElectron() && window.electronAPI?.getAppVersion) {
        return window.electronAPI.getAppVersion();
    }
    return '0.2.1'; // Fallback for web
}

/**
 * Get platform (in Electron) or return 'web'
 */
export async function getPlatform(): Promise<string> {
    if (isElectron() && window.electronAPI?.getPlatform) {
        return window.electronAPI.getPlatform();
    }
    return 'web';
}
