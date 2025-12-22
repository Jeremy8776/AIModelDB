
import React, { createContext, useState, useEffect, useContext } from 'react';

interface UpdateInfo {
    version: string;
    releaseDate: string;
    releaseNotes?: string;
    path: string;
}

interface UpdateContextType {
    updateAvailable: boolean;
    updateVersion: string;
    updateDownloaded: boolean;
    updateInfo: UpdateInfo | null;
    downloadProgress: number | null;
    checkForUpdates: () => void;
    downloadUpdate: () => void;
    installUpdate: () => void;
    checking: boolean;
    error: string | null;
    // Dev simulation
    simulateUpdate: () => void;
}

const UpdateContext = createContext<UpdateContextType | undefined>(undefined);

export function UpdateProvider({ children }: { children: React.ReactNode }) {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [updateVersion, setUpdateVersion] = useState('');
    const [updateDownloaded, setUpdateDownloaded] = useState(false);
    const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
    const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
    const [checking, setChecking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!window.electronAPI) return;

        window.electronAPI.onUpdateStatus((data: any) => {
            console.log("Update status event:", data);
            switch (data.status) {
                case 'checking-for-update':
                    setChecking(true);
                    setError(null);
                    break;
                case 'update-available':
                    setChecking(false);
                    setUpdateAvailable(true);
                    setUpdateVersion(data.version);
                    setUpdateInfo(data);
                    setError(null);
                    break;
                case 'update-not-available':
                    setChecking(false);
                    // Optionally set state to explicitly show "Up to date"
                    setError(null);
                    break;
                case 'download-progress':
                    setDownloadProgress(data.percent);
                    break;
                case 'update-downloaded':
                    setUpdateDownloaded(true);
                    setDownloadProgress(null);
                    setChecking(false);
                    break;
                case 'update-error':
                    setChecking(false);
                    setError(data.message);
                    break;
            }
        });

        // Auto-check for updates on app launch (with a small delay to let app initialize)
        const autoCheckTimer = setTimeout(() => {
            console.log('[UpdateContext] Auto-checking for updates on launch...');
            window.electronAPI?.checkForUpdates();
        }, 2000);

        return () => {
            clearTimeout(autoCheckTimer);
        };
    }, []);

    const checkForUpdates = () => {
        if (window.electronAPI) {
            setChecking(true);
            setError(null);
            window.electronAPI.checkForUpdates();
        }
    };

    const downloadUpdate = () => {
        if (window.electronAPI) {
            window.electronAPI.downloadUpdate();
        }
    };

    const installUpdate = () => {
        if (window.electronAPI) {
            window.electronAPI.installUpdate();
        }
    };

    // Dev simulation function - cycles through all update states
    const simulateUpdate = () => {
        console.log('[UpdateContext] Starting update simulation...');

        // Reset state
        setUpdateAvailable(false);
        setUpdateDownloaded(false);
        setDownloadProgress(null);
        setError(null);

        // Step 1: Checking
        setChecking(true);

        setTimeout(() => {
            // Step 2: Update available
            setChecking(false);
            setUpdateAvailable(true);
            setUpdateVersion('99.0.0-demo');

            setTimeout(() => {
                // Step 3: Downloading with progress
                let progress = 0;
                const progressInterval = setInterval(() => {
                    progress += Math.random() * 15 + 5;
                    if (progress >= 100) {
                        progress = 100;
                        clearInterval(progressInterval);
                        setDownloadProgress(null);

                        // Step 4: Downloaded
                        setUpdateDownloaded(true);
                        console.log('[UpdateContext] Simulation complete - update ready to install');
                    } else {
                        setDownloadProgress(progress);
                    }
                }, 500);
            }, 2000);
        }, 1500);
    };

    return (
        <UpdateContext.Provider value={{
            updateAvailable,
            updateVersion,
            updateDownloaded,
            updateInfo,
            downloadProgress,
            checkForUpdates,
            downloadUpdate,
            installUpdate,
            checking,
            error,
            simulateUpdate,
        }}>
            {children}
        </UpdateContext.Provider>
    );
}

export const useUpdate = () => {
    const context = useContext(UpdateContext);
    if (!context) {
        // Return dummy context if not wrapper (e.g. dev without provider)
        // or just throw
        // For fail-safety in non-electron environments:
        return {
            updateAvailable: false,
            updateVersion: '',
            updateDownloaded: false,
            updateInfo: null,
            downloadProgress: null,
            checkForUpdates: () => { },
            downloadUpdate: () => { },
            installUpdate: () => { },
            checking: false,
            error: null,
            simulateUpdate: () => { console.log('[UpdateContext] Simulate not available - no context provider'); },
        };
    }
    return context;
};
