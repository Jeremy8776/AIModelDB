// Type declarations for Electron API exposed via preload script

export interface UpdateStatus {
    status: 'checking-for-update' | 'update-available' | 'update-not-available' | 'download-progress' | 'update-downloaded' | 'update-error';
    version?: string;
    percent?: number;
    bytesPerSecond?: number;
    transferred?: number;
    total?: number;
    message?: string;
}

export interface ElectronAPI {
    // App info
    getAppVersion: () => Promise<string>;
    getPlatform: () => Promise<string>;
    // Open external URLs  
    openExternal: (url: string) => void;
    // Auto-updater
    checkForUpdates: () => void;
    installUpdate: () => void;
    onUpdateStatus: (callback: (status: UpdateStatus) => void) => void;
    removeUpdateListener: () => void;
    // Check if running in Electron
    isElectron: boolean;
}

// Window.electronAPI type is declared in src/types/electron.d.ts

/**
 * Check if running inside Electron
 */
export function isElectron(): boolean {
    return typeof window !== 'undefined' &&
        window.electronAPI !== undefined &&
        (window.electronAPI as any).isElectron === true;
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

/**
 * Check for app updates (Electron only)
 */
export function checkForUpdates(): void {
    if (isElectron() && window.electronAPI?.checkForUpdates) {
        window.electronAPI.checkForUpdates();
    }
}

/**
 * Install downloaded update and restart (Electron only)
 */
export function installUpdate(): void {
    if (isElectron() && window.electronAPI?.installUpdate) {
        window.electronAPI.installUpdate();
    }
}

/**
 * Subscribe to update status changes (Electron only)
 */
export function onUpdateStatus(callback: (status: UpdateStatus) => void): void {
    if (isElectron() && window.electronAPI?.onUpdateStatus) {
        window.electronAPI.onUpdateStatus(callback);
    }
}

/**
 * Remove update status listener (Electron only)
 */
export function removeUpdateListener(): void {
    if (isElectron() && window.electronAPI?.removeUpdateListener) {
        window.electronAPI.removeUpdateListener();
    }
}
