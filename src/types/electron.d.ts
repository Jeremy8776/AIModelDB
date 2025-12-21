
interface ElectronAPI {
    getAppVersion: () => Promise<string>;
    getPlatform: () => Promise<string>;
    openExternal: (url: string) => void;
    checkForUpdates: () => void;
    installUpdate: () => void;
    onUpdateStatus: (callback: (data: any) => void) => void;
    removeUpdateListener: () => void;
    isElectron: boolean;
    encryptString: (text: string) => Promise<string | null>;
    decryptString: (encryptedHex: string) => Promise<string | null>;
    proxyRequest: (options: { url: string; method?: string; headers?: any; body?: any }) => Promise<{ success: boolean; data?: any; error?: string }>;
    minimize: () => void;
    maximize: () => void;
    close: () => void;
}

interface Window {
    electronAPI?: ElectronAPI;
}
