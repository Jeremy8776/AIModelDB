import React, { useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Database, RefreshCw, Check } from 'lucide-react';
import ThemeContext from '../../context/ThemeContext';
import { useSettings } from '../../context/SettingsContext';
import { ThemedSelect } from '../ThemedSelect';
import { handleExternalLink } from '../../utils/external-links';

interface DataSourcesSectionProps {
  onSync: (options?: any) => void;
  addConsoleLog: (msg: string) => void;
}

export function DataSourcesSection({ onSync, addConsoleLog }: DataSourcesSectionProps) {
  const { t } = useTranslation();
  const { theme } = useContext(ThemeContext);
  const { settings, saveSettings } = useSettings();
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');
  const [savedKeys, setSavedKeys] = useState<Record<string, boolean>>({});
  const [pendingKeys, setPendingKeys] = useState<Record<string, string>>({});

  const bgCard = 'border-border bg-card text-text';
  const bgInput = 'border-border bg-input text-text';

  const dataSources = [
    { key: 'huggingface', label: t('settings.dataSources.huggingface'), description: t('settings.dataSources.descriptions.huggingface') },
    { key: 'github', label: 'GitHub', description: t('settings.dataSources.descriptions.github') },
    { key: 'artificialanalysis', label: t('settings.dataSources.artificialanalysis'), description: t('settings.dataSources.descriptions.artificialanalysis') },
    { key: 'civitai', label: t('settings.dataSources.civitai'), description: t('settings.dataSources.descriptions.civitai') },
    { key: 'openmodeldb', label: t('settings.dataSources.openmodeldb'), description: t('settings.dataSources.descriptions.openmodeldb') },
    { key: 'civitasbay', label: t('settings.dataSources.civitasbay'), description: t('settings.dataSources.descriptions.civitasbay') },
    { key: 'ollamaLibrary', label: t('settings.dataSources.ollama'), description: t('settings.dataSources.descriptions.ollamaLibrary') },
  ];

  const handleSync = async () => {
    setSyncStatus('syncing');
    addConsoleLog('Starting data source sync...');

    try {
      await onSync();
      setSyncStatus('done');
      addConsoleLog('Data source sync completed');
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (error) {
      setSyncStatus('error');
      addConsoleLog(`Sync error: ${error}`);
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Database size={20} className="text-zinc-500" />
          {t('settings.dataSources.title')}
        </h3>
        <p className="text-sm text-zinc-700 dark:text-zinc-400">
          {t('settings.dataSources.description')}
        </p>
      </div>

      {/* Sync Button */}
      <div className={`rounded-xl border p-4 ${bgCard}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-medium">{t('settings.dataSources.syncModels')}</h4>
            <p className="text-sm text-zinc-700 dark:text-zinc-400">
              {t('settings.dataSources.syncModelsDesc')}
            </p>
          </div>
          <button
            id="sync-now-btn"
            onClick={handleSync}
            disabled={syncStatus === 'syncing'}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${syncStatus === 'syncing'
              ? 'opacity-60 cursor-not-allowed'
              : 'bg-accent hover:bg-accent-dark hover:text-white'
              }`}
          >
            {syncStatus === 'syncing' ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                {t('settings.dataSources.syncing')}
              </>
            ) : syncStatus === 'done' ? (
              <>
                <Check size={16} />
                {t('settings.dataSources.done')}
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                {t('settings.dataSources.syncNow')}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Data Sources Grid */}
      <div className={`rounded-xl border p-4 ${bgCard}`}>
        <h4 className="font-medium mb-4">{t('settings.dataSources.availableSources')}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {dataSources.map((source) => {
            const isEnabled = settings.dataSources?.[source.key as keyof typeof settings.dataSources] ?? false;
            const needsApiKey = source.key === 'artificialanalysis' || source.key === 'github';
            const apiKeyValue = source.key === 'artificialanalysis'
              ? settings.artificialAnalysisApiKey
              : source.key === 'github'
                ? settings.gitHubToken
                : '';
            const apiKeyPlaceholder = source.key === 'artificialanalysis' ? 'aa_...' : 'ghp_...';
            const apiKeyLabel = source.key === 'artificialanalysis' ? 'API Key' : 'Token (optional)';

            return (
              <div
                key={source.key}
                className={`p-4 rounded-lg border-2 text-left transition-all duration-200 ${isEnabled
                  ? 'border-accent bg-accent/10'
                  : 'border-zinc-700 hover:border-zinc-500 bg-zinc-900/50'
                  }`}
              >
                <button
                  onClick={() => saveSettings({
                    dataSources: {
                      ...settings.dataSources,
                      [source.key]: !isEnabled
                    }
                  })}
                  className="w-full text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className={`font-semibold text-sm ${isEnabled ? 'text-white' : 'text-zinc-200'} transition-colors`}>
                        {source.label}
                      </div>
                      <div className={`text-xs mt-1 ${isEnabled ? 'text-zinc-300' : 'text-zinc-500'} transition-colors`}>
                        {source.description}
                      </div>
                    </div>
                    <div className={`ml-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isEnabled
                      ? 'bg-accent border-accent'
                      : 'border-zinc-600 group-hover:border-zinc-500'
                      }`}>
                      {isEnabled && <Check size={14} strokeWidth={3} className="text-white" />}
                    </div>
                  </div>
                </button>

                {/* Inline API Key Input - shown when enabled and needs API key */}
                {isEnabled && needsApiKey && (
                  <div className="mt-3 pt-3 border-t border-zinc-700">
                    <label className="text-xs text-zinc-400 block mb-1">{apiKeyLabel}</label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={pendingKeys[source.key] ?? apiKeyValue ?? ''}
                        onChange={(e) => {
                          e.stopPropagation();
                          setPendingKeys(prev => ({ ...prev, [source.key]: e.target.value }));
                          setSavedKeys(prev => ({ ...prev, [source.key]: false }));
                        }}
                        onClick={(e) => e.stopPropagation()}
                        placeholder={apiKeyPlaceholder}
                        className={`flex-1 rounded border ${bgInput} px-2 py-1.5 text-xs font-mono`}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const value = pendingKeys[source.key] ?? apiKeyValue ?? '';
                          if (source.key === 'artificialanalysis') {
                            saveSettings({ artificialAnalysisApiKey: value });
                          } else if (source.key === 'github') {
                            saveSettings({ gitHubToken: value });
                          }
                          setSavedKeys(prev => ({ ...prev, [source.key]: true }));
                          setTimeout(() => {
                            setSavedKeys(prev => ({ ...prev, [source.key]: false }));
                          }, 2000);
                        }}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${savedKeys[source.key]
                          ? 'bg-green-600 text-white'
                          : 'bg-accent hover:bg-accent-dark text-white'
                          }`}
                      >
                        {savedKeys[source.key] ? (
                          <span className="flex items-center gap-1">
                            <Check size={12} />
                            Saved
                          </span>
                        ) : (
                          'Save'
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sync Settings */}
      <div className={`rounded-xl border p-4 ${bgCard}`}>
        <h4 className="font-medium mb-4">{t('settings.dataSources.syncSettings')}</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">{t('settings.display.defaultPageSize')}</label>
            <ThemedSelect
              value={String(settings.defaultPageSize || 50)}
              onChange={(value) => {
                const num = parseInt(value);
                saveSettings({ defaultPageSize: num });
              }}
              options={[
                { value: '50', label: t('settings.display.defaultPageSize') + ': 50' },
                { value: '100', label: '100' },
                { value: '0', label: t('common.all') || 'All' }
              ]}
              ariaLabel="Default page size"
            />
          </div>


        </div>
      </div>
    </div>
  );
}