import React, { createContext, useState, ReactNode, useContext, useEffect } from 'react';
import { ApiDir } from '../types';
import { DEFAULT_API_DIR } from '../services/api';
import { CurrencyCode } from '../utils/currency';

interface Settings {
  apiConfig: ApiDir;
  minDownloadsBypass: number;
  autoRefresh: {
    enabled: boolean;
    interval: number;
    unit: 'minutes' | 'hours' | 'days';
  };
  systemPrompt: string;
  currency: CurrencyCode;
  showCostValidation: boolean;
  autoMergeDuplicates: boolean;
  defaultPageSize: number | null;
  showImportToast: boolean;
  showConsoleButton: boolean;
  // Validation settings
  validationBatchSize: number;
  validationTimeout: number;
  validationRetries: number;
  validationAutoSave: boolean;
  // Preferred model provider for validation
  preferredModelProvider: string | null;
  // Data source preferences
  dataSources: {
    huggingface: boolean;
    github: boolean;
    artificialanalysis: boolean;
    llmDiscovery: boolean;
    roboflow: boolean;
    kaggle: boolean;
    tensorart: boolean;
    civitai: boolean;
    runcomfy: boolean;
    prompthero: boolean;
    liblib: boolean;
    shakker: boolean;
    openmodeldb: boolean;
    civitasbay: boolean;
  };
  // External API keys (user-provided)
  artificialAnalysisApiKey: string;
  gitHubToken: string;  // Optional: For higher GitHub API rate limits
  // UI preferences
  theme: 'auto' | 'light' | 'dark';
  compactMode: boolean;
  showAdvancedFilters: boolean;
  autoExpandSections: boolean;
  // Import/Export preferences
  importAutoMerge: boolean;
  exportFormat: 'json' | 'csv' | 'xlsx';
  backupBeforeSync: boolean;
  // Corporate safety settings
  enableNSFWFiltering: boolean;
  nsfwFilteringStrict: boolean;
  logNSFWAttempts: boolean; // Log NSFW attempts for compliance
  // System state
  configVersion: number;
}

interface SettingsContextType {
  settings: Settings;
  saveSettings: (settings: Partial<Settings>) => void;
  resetSettings: () => void;
  // Current latest version constant
  LATEST_CONFIG_VERSION: number;
}

export const LATEST_CONFIG_VERSION = 2;

const defaultSettings: Settings = {
  apiConfig: DEFAULT_API_DIR,
  minDownloadsBypass: 500,
  autoRefresh: {
    enabled: false,
    interval: 24,
    unit: 'hours'
  },
  systemPrompt: "",
  currency: 'USD',
  showCostValidation: true,
  autoMergeDuplicates: true,
  defaultPageSize: 50,
  showImportToast: true,
  showConsoleButton: true,
  // Validation settings
  validationBatchSize: 50,
  validationTimeout: 60000, // 60 seconds
  validationRetries: 3,
  validationAutoSave: true,
  // Preferred model provider for validation
  preferredModelProvider: null,
  // Data source preferences  
  dataSources: {
    huggingface: true,
    github: true,
    artificialanalysis: true,
    llmDiscovery: true,
    roboflow: true,
    kaggle: true,
    tensorart: true,
    civitai: true,
    runcomfy: false, // explicitly disabled per request
    prompthero: true,
    liblib: true,
    shakker: true,
    openmodeldb: true,
    civitasbay: true, // Enabled - good for model preservation
  },
  // External API keys (user-provided)
  artificialAnalysisApiKey: "",
  gitHubToken: "",  // Optional: For higher GitHub API rate limits
  // UI preferences
  theme: 'auto',
  compactMode: false,
  showAdvancedFilters: false,
  autoExpandSections: true,
  // Import/Export preferences
  importAutoMerge: true,
  exportFormat: 'json',
  backupBeforeSync: false,
  // Corporate safety settings
  enableNSFWFiltering: true, // Enabled by default for corporate use
  nsfwFilteringStrict: true, // Strict filtering for corporate environment
  logNSFWAttempts: true, // Log NSFW attempts for compliance
  // System state
  configVersion: 1, // Default to 1 (pre-Ollama update)
};

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  saveSettings: () => { },
  resetSettings: () => { },
  LATEST_CONFIG_VERSION
});

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  // Load settings from localStorage on initial mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = localStorage.getItem('aiModelDBPro_settings');
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);

          // Deep copy to avoid mutating the parsed object directly
          const decryptedSettings = { ...parsedSettings };

          // Decrypt API keys in apiConfig
          if (decryptedSettings.apiConfig) {
            const apiConfig = { ...decryptedSettings.apiConfig };
            for (const [key, config] of Object.entries(apiConfig) as [keyof ApiDir, any][]) {
              if (config.apiKey && window.electronAPI?.decryptString) {
                const decryptedKey = await window.electronAPI.decryptString(config.apiKey);
                apiConfig[key] = {
                  ...config,
                  apiKey: decryptedKey || "" // specific fallback if decryption fails (e.g. machine change)
                };
              }
            }
            decryptedSettings.apiConfig = apiConfig;
          }

          // Decrypt standalone keys
          if (decryptedSettings.artificialAnalysisApiKey && window.electronAPI?.decryptString) {
            decryptedSettings.artificialAnalysisApiKey = await window.electronAPI.decryptString(decryptedSettings.artificialAnalysisApiKey) || "";
          }
          if (decryptedSettings.gitHubToken && window.electronAPI?.decryptString) {
            decryptedSettings.gitHubToken = await window.electronAPI.decryptString(decryptedSettings.gitHubToken) || "";
          }

          setSettings(decryptedSettings);
        }
      } catch (error) {
        console.error('Error loading settings from localStorage:', error);
      }
    };

    loadSettings();
  }, []);

  // Save settings to localStorage whenever they change
  const saveSettings = async (newSettings: Partial<Settings>) => {
    try {
      // 1. Update state immediately for UI responsiveness
      const nextSettings = { ...settings, ...newSettings };
      setSettings(nextSettings);

      // 2. Prepare for storage (encryption)
      const storageSettings = { ...nextSettings };

      // Encrypt API keys in apiConfig
      if (storageSettings.apiConfig) {
        const apiConfig = { ...storageSettings.apiConfig };
        for (const [key, config] of Object.entries(apiConfig) as [keyof ApiDir, any][]) {
          if (config.apiKey && window.electronAPI?.encryptString) {
            const encryptedKey = await window.electronAPI.encryptString(config.apiKey);
            apiConfig[key] = {
              ...config,
              apiKey: encryptedKey || ""
            };
          }
        }
        storageSettings.apiConfig = apiConfig;
      }

      // Encrypt standalone keys
      if (storageSettings.artificialAnalysisApiKey && window.electronAPI?.encryptString) {
        storageSettings.artificialAnalysisApiKey = await window.electronAPI.encryptString(storageSettings.artificialAnalysisApiKey) || "";
      }
      if (storageSettings.gitHubToken && window.electronAPI?.encryptString) {
        storageSettings.gitHubToken = await window.electronAPI.encryptString(storageSettings.gitHubToken) || "";
      }

      localStorage.setItem('aiModelDBPro_settings', JSON.stringify(storageSettings));
    } catch (error) {
      console.error('Error saving settings to localStorage:', error);
    }
  };

  const resetSettings = () => {
    localStorage.removeItem('aiModelDBPro_settings');
    setSettings(defaultSettings);
  };

  return (
    <SettingsContext.Provider value={{ settings, saveSettings, resetSettings, LATEST_CONFIG_VERSION }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);

export default SettingsContext;
