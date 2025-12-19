import React, { useContext, useState } from 'react';
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
  const { theme } = useContext(ThemeContext);
  const { settings, saveSettings } = useSettings();
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');

  const bgCard = 'border-zinc-800 bg-black';
  const bgInput = 'border-zinc-700 bg-zinc-900/60';

  const dataSources = [
    { key: 'huggingface', label: 'HuggingFace', description: 'Popular open-source models' },
    { key: 'artificialanalysis', label: 'Artificial Analysis', description: 'Model performance benchmarks' },
    { key: 'civitai', label: 'Civitai', description: 'Community AI models' },
    { key: 'openmodeldb', label: 'OpenModelDB', description: 'Open model database' },
    { key: 'civitasbay', label: 'CivitasBay', description: 'AI model marketplace' },
    { key: 'llmDiscovery', label: 'LLM Discovery', description: 'AI-powered model discovery' },
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
          Data Sources
        </h3>
        <p className="text-sm text-zinc-700 dark:text-zinc-400">
          Configure which data sources to sync models from.
        </p>
      </div>

      {/* Sync Button */}
      <div className={`rounded-xl border p-4 ${bgCard}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-medium">Sync Models</h4>
            <p className="text-sm text-zinc-700 dark:text-zinc-400">
              Fetch latest models from enabled sources
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncStatus === 'syncing'}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${syncStatus === 'syncing'
              ? 'opacity-60 cursor-not-allowed'
              : 'bg-accent hover:bg-accent-dark text-white'
              }`}
          >
            {syncStatus === 'syncing' ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Syncing...
              </>
            ) : syncStatus === 'done' ? (
              <>
                <Check size={16} />
                Done
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                Sync Now
              </>
            )}
          </button>
        </div>
      </div>

      {/* Data Sources Grid */}
      <div className={`rounded-xl border p-4 ${bgCard}`}>
        <h4 className="font-medium mb-4">Available Sources</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {dataSources.map((source) => {
            const isEnabled = settings.dataSources?.[source.key as keyof typeof settings.dataSources] ?? false;
            return (
              <button
                key={source.key}
                onClick={() => saveSettings({
                  dataSources: {
                    ...settings.dataSources,
                    [source.key]: !isEnabled
                  }
                })}
                className={`p-4 rounded-lg border-2 text-left transition-all duration-200 ${isEnabled
                  ? 'border-accent bg-violet-50 dark:bg-violet-950/20'
                  : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium text-sm ${isEnabled ? 'text-accent' : ''}`}>
                      {source.label}
                    </div>
                    <div className="text-xs text-zinc-700 dark:text-zinc-400 mt-1">
                      {source.description}
                    </div>
                  </div>
                  <div className={`ml-3 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isEnabled
                    ? 'border-accent bg-accent'
                    : 'border-zinc-400 dark:border-zinc-600'
                    }`}>
                    {isEnabled && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Artificial Analysis API Key */}
      {settings.dataSources?.artificialanalysis && (
        <div className={`rounded-xl border p-4 ${bgCard}`}>
          <h4 className="font-medium mb-2">Artificial Analysis API Key</h4>
          <p className="text-sm text-zinc-700 dark:text-zinc-400 mb-3">
            Required for accessing model benchmarks and pricing data.
          </p>
          <input
            type="password"
            value={settings.artificialAnalysisApiKey || ""}
            onChange={(e) => saveSettings({ artificialAnalysisApiKey: e.target.value })}
            placeholder="aa_..."
            className={`w-full rounded-lg border ${bgInput} px-3 py-2 text-sm font-mono`}
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-2">
            Get your free API key from{' '}
            <a
              href="https://artificialanalysis.ai/documentation"
              onClick={(e) => handleExternalLink(e, 'https://artificialanalysis.ai/documentation')}
              className="text-accent hover:underline cursor-pointer"
            >
              Artificial Analysis
            </a>
          </p>
        </div>
      )}

      {/* GitHub Token (Optional) */}
      <div className={`rounded-xl border p-4 ${bgCard}`}>
        <h4 className="font-medium mb-2">GitHub Token (Optional)</h4>
        <p className="text-sm text-zinc-700 dark:text-zinc-400 mb-3">
          Increases API rate limits for syncing GitHub repositories. Without a token, you're limited to 60 requests/hour.
        </p>
        <input
          type="password"
          value={settings.gitHubToken || ""}
          onChange={(e) => saveSettings({ gitHubToken: e.target.value })}
          placeholder="ghp_..."
          className={`w-full rounded-lg border ${bgInput} px-3 py-2 text-sm font-mono`}
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-2">
          Create a personal access token at{' '}
          <a
            href="https://github.com/settings/tokens"
            onClick={(e) => handleExternalLink(e, 'https://github.com/settings/tokens')}
            className="text-accent hover:underline cursor-pointer"
          >
            GitHub Settings → Developer Settings → Personal Access Tokens
          </a>
          . No special permissions needed.
        </p>
      </div>

      {/* Sync Settings */}
      <div className={`rounded-xl border p-4 ${bgCard}`}>
        <h4 className="font-medium mb-4">Sync Settings</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Default Page Size</label>
            <ThemedSelect
              value={String(settings.defaultPageSize || 50)}
              onChange={(value) => {
                const num = parseInt(value);
                saveSettings({ defaultPageSize: num });
              }}
              options={[
                { value: '50', label: '50' },
                { value: '100', label: '100' },
                { value: '0', label: 'All' }
              ]}
              ariaLabel="Default page size"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Validation Batch Size</label>
            <input
              type="number"
              value={settings.validationBatchSize || 50}
              onChange={(e) => saveSettings({ validationBatchSize: parseInt(e.target.value) || 50 })}
              className={`w-full rounded-lg border ${bgInput} px-3 py-2 text-sm`}
              min="1"
              max="200"
            />
          </div>
        </div>
      </div>
    </div>
  );
}