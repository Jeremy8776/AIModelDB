
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
            error
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
            error: null
        };
    }
    return context;
};
