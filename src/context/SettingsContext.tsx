import React, { createContext, useState, ReactNode, useContext, useEffect, useRef } from 'react';
import { ApiDir } from '../types';
import { DEFAULT_API_DIR } from '../services/api';
import { CurrencyCode } from '../utils/currency';
import { LanguageCode } from '../i18n';
import { DEFAULT_MCP_SOURCES, DEFAULT_MODEL_SOURCES, DEFAULT_SKILL_SOURCES } from '../services/sources/entitySources';

export interface Settings {
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
    [key: string]: boolean;
    huggingface: boolean;
    github: boolean;
    artificialanalysis: boolean;
    apiDiscovery: boolean;
    localDiscovery: boolean;
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
    ollamaLibrary: boolean;
  };
  // MCP server data-source toggles (keyed by EntitySource.key)
  mcpSources: Record<string, boolean>;
  // Skill data-source toggles (keyed by EntitySource.key)
  skillSources: Record<string, boolean>;
  // External API keys (user-provided)
  artificialAnalysisApiKey: string;
  gitHubToken: string;  // Optional: For higher GitHub API rate limits
  // UI preferences
  language: LanguageCode;
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
  customNSFWKeywords: string[]; // User-defined NSFW keywords
  // Ignored models (prevent re-sync after deletion)
  ignoredModels: string[];
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
  showConsoleButton: false,
  // Validation settings
  validationBatchSize: 50,
  validationTimeout: 60000, // 60 seconds
  validationRetries: 3,
  validationAutoSave: true,
  // Preferred model provider for validation
  preferredModelProvider: null,
  // Data source preferences  
  dataSources: {
    ...DEFAULT_MODEL_SOURCES,
    huggingface: true,
    github: true,
    artificialanalysis: true,
    civitai: true,
    openmodeldb: true,
    civitasbay: true,
    ollamaLibrary: true,
    apiDiscovery: true,
    localDiscovery: true,
    roboflow: false,
    kaggle: false,
    tensorart: false,
    runcomfy: false,
    prompthero: false,
    liblib: false,
    shakker: false,
  },
  mcpSources: { ...DEFAULT_MCP_SOURCES },
  skillSources: { ...DEFAULT_SKILL_SOURCES },
  // External API keys (user-provided)
  artificialAnalysisApiKey: "",
  gitHubToken: "",  // Optional: For higher GitHub API rate limits
  // UI preferences
  language: 'en',
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
  customNSFWKeywords: [], // Default to empty list
  ignoredModels: [],
  // System state
  configVersion: 1, // Default to 1 (pre-Ollama update)
};

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  saveSettings: () => { },
  resetSettings: () => { },
  LATEST_CONFIG_VERSION
});

function mergeSettings(base: Settings, updates: Partial<Settings>): Settings {
  return {
    ...base,
    ...updates,
    dataSources: { ...base.dataSources, ...(updates.dataSources || {}) },
    mcpSources: { ...base.mcpSources, ...(updates.mcpSources || {}) },
    skillSources: { ...base.skillSources, ...(updates.skillSources || {}) },
    autoRefresh: { ...base.autoRefresh, ...(updates.autoRefresh || {}) },
    apiConfig: { ...base.apiConfig, ...(updates.apiConfig || {}) },
  };
}

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const settingsRef = useRef(defaultSettings);
  const saveVersionRef = useRef(0);

  // Load settings from localStorage on initial mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = localStorage.getItem('aiModelDB_settings');
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);

          // Deep merge with defaults to ensure all keys exist
          const mergedSettings: Settings = {
            ...defaultSettings,
            ...parsedSettings,
            // Deep merge nested objects
            dataSources: {
              ...defaultSettings.dataSources,
              ...(parsedSettings.dataSources || {})
            },
            mcpSources: {
              ...defaultSettings.mcpSources,
              ...(parsedSettings.mcpSources || {})
            },
            skillSources: {
              ...defaultSettings.skillSources,
              ...(parsedSettings.skillSources || {})
            },
            autoRefresh: {
              ...defaultSettings.autoRefresh,
              ...(parsedSettings.autoRefresh || {})
            },
            // apiConfig needs special handling for encryption below, so we start with merged
            apiConfig: {
              ...defaultSettings.apiConfig,
              ...(parsedSettings.apiConfig || {})
            }
          };

          const decryptedSettings = { ...mergedSettings };

          settingsRef.current = decryptedSettings;
          setSettings(decryptedSettings); // Update state immediately before decryption finishes

          // Decrypt API keys in apiConfig
          if (decryptedSettings.apiConfig) {
            const apiConfig = { ...decryptedSettings.apiConfig };
            for (const [key, config] of Object.entries(apiConfig) as [keyof ApiDir, any][]) {
              if (config.apiKey && window.electronAPI?.decryptString) {
                const decryptedKey = await window.electronAPI.decryptString(config.apiKey);
                apiConfig[key] = {
                  ...config,
                  apiKey: decryptedKey || ""
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

          settingsRef.current = decryptedSettings;
          setSettings(decryptedSettings);
        }
      } catch (error) {
        console.error('Error loading settings from localStorage:', error);
      }
    };

    loadSettings();
  }, []);

  // Sync i18n language when language setting changes
  useEffect(() => {
    const updateLanguage = async () => {
      if (settings.language) {
        // Import dynamically to avoid circular dependency
        const { translateToLanguage } = await import('../i18n');
        await translateToLanguage(settings.language);
      }
    };
    updateLanguage();
  }, [settings.language]);

  // Save settings to localStorage whenever they change
  const saveSettings = async (newSettings: Partial<Settings>) => {
    try {
      // 1. Update state immediately for UI responsiveness
      const nextSettings = mergeSettings(settingsRef.current, newSettings);
      settingsRef.current = nextSettings;
      setSettings(nextSettings);
      const saveVersion = ++saveVersionRef.current;

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

      if (saveVersion === saveVersionRef.current) {
        localStorage.setItem('aiModelDB_settings', JSON.stringify(storageSettings));
      }
    } catch (error) {
      console.error('Error saving settings to localStorage:', error);
    }
  };

  const resetSettings = () => {
    localStorage.removeItem('aiModelDB_settings');
    settingsRef.current = defaultSettings;
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
