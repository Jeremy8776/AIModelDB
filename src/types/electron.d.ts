
interface ElectronAPI {
    getAppVersion: () => Promise<string>;
    getPlatform: () => Promise<string>;
    openExternal: (url: string) => void;
    checkForUpdates: () => void;
    downloadUpdate: () => void;
    installUpdate: () => void;
    onUpdateStatus: (callback: (data: any) => void) => void;
    removeUpdateListener: () => void;
    isElectron: boolean;
    signalReady: () => void;
    encryptString: (text: string) => Promise<string | null>;
    decryptString: (encryptedHex: string) => Promise<string | null>;
    proxyRequest: (options: { url: string; method?: string; headers?: any; body?: any }) => Promise<{ success: boolean; data?: any; error?: string }>;
    proxyImage: (imageUrl: string) => Promise<{ success: boolean; dataUrl?: string; error?: string }>;
    proxyImportUrl: (url: string) => Promise<{ success: boolean; base64?: string; contentType?: string | null; error?: string }>;
    translateText: (text: string, targetLang?: string) => Promise<{ text: string | null; error: string | null }>;
    minimize: () => void;
    maximize: () => void;
    close: () => void;
}

interface Window {
    electronAPI?: ElectronAPI;
}
