import React, { useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Database, RefreshCw, Check } from 'lucide-react';
import ThemeContext from '../../context/ThemeContext';
import { useSettings } from '../../context/SettingsContext';
import { ThemedSelect } from '../ThemedSelect';
import { SourceCategoryTabs } from '../SourceCategoryTabs';
import {
  DisplayEntitySource,
  EntitySourceCategory,
  getSourceCategorySummary,
  getSourcesForSurface,
} from '../../services/sources/entitySources';

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
  const [activeSourceCategory, setActiveSourceCategory] = useState<EntitySourceCategory>('models');

  const bgCard = 'border-border bg-bg-card text-text';
  const bgInput = 'border-border bg-bg-input text-text';

  const getEnabledMap = (category: EntitySourceCategory): Record<string, boolean> => {
    if (category === 'models') return settings.dataSources || {};
    if (category === 'mcp') return settings.mcpSources || {};
    return settings.skillSources || {};
  };

  const getCategoryTitle = (category: EntitySourceCategory): string => {
    if (category === 'models') return t('settings.dataSources.availableSources');
    if (category === 'mcp') return t('settings.dataSources.mcpSources', { defaultValue: 'MCP Server Sources' });
    return t('settings.dataSources.skillSources', { defaultValue: 'Skill Sources' });
  };

  const toggleSource = (category: EntitySourceCategory, source: DisplayEntitySource, isEnabled: boolean) => {
    if (!source.isSelectable) return;
    if (category === 'models') {
      saveSettings({ dataSources: { ...settings.dataSources, [source.key]: !isEnabled } });
    } else if (category === 'mcp') {
      saveSettings({ mcpSources: { ...(settings.mcpSources || {}), [source.key]: !isEnabled } });
    } else {
      saveSettings({ skillSources: { ...(settings.skillSources || {}), [source.key]: !isEnabled } });
    }
  };

  /**
   * Flip every *available* source in the current category to `value`.
   * Planned (`isSelectable === false`) sources are left untouched so the
   * "Soon" cards never claim to be enabled. One `saveSettings` call per
   * click — cheaper than per-source flips.
   */
  const setAllInCategory = (category: EntitySourceCategory, value: boolean) => {
    const selectableKeys = getSourcesForSurface('settings', category)
      .filter(source => source.isSelectable)
      .map(source => source.key);
    if (selectableKeys.length === 0) return;

    if (category === 'models') {
      const next = { ...(settings.dataSources || {}) };
      selectableKeys.forEach(k => { next[k] = value; });
      saveSettings({ dataSources: next });
    } else if (category === 'mcp') {
      const next = { ...(settings.mcpSources || {}) };
      selectableKeys.forEach(k => { next[k] = value; });
      saveSettings({ mcpSources: next });
    } else {
      const next = { ...(settings.skillSources || {}) };
      selectableKeys.forEach(k => { next[k] = value; });
      saveSettings({ skillSources: next });
    }
  };

  /** "All selectable sources are currently in `value` state?" — drives button disabled. */
  const allInCategoryAre = (category: EntitySourceCategory, value: boolean): boolean => {
    const enabledMap = getEnabledMap(category);
    const selectable = getSourcesForSurface('settings', category).filter(s => s.isSelectable);
    if (selectable.length === 0) return true;
    return selectable.every(s => Boolean(enabledMap?.[s.key]) === value);
  };

  const renderModelApiKeyControls = (source: DisplayEntitySource, isEnabled: boolean) => {
    const needsApiKey = activeSourceCategory === 'models' && (source.key === 'artificialanalysis' || source.key === 'github');
    if (!isEnabled || !needsApiKey) return null;
    const apiKeyValue = source.key === 'artificialanalysis'
      ? settings.artificialAnalysisApiKey
      : settings.gitHubToken;
    const apiKeyPlaceholder = source.key === 'artificialanalysis' ? 'aa_...' : 'ghp_...';
    const apiKeyLabel = source.key === 'artificialanalysis' ? 'API Key' : 'Token (optional)';

    return (
      <div className="mt-3 pt-3 border-t border-border">
        <label className="text-xs text-text-subtle block mb-1">{apiKeyLabel}</label>
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
    );
  };

  const renderSourceCard = (source: DisplayEntitySource) => {
    const enabledMap = getEnabledMap(activeSourceCategory);
    const isEnabled = source.isSelectable && (enabledMap?.[source.key] ?? false);
    return (
      <div
        key={source.key}
        className={`p-4 rounded-lg border-2 text-left transition-all duration-200 ${!source.isSelectable
          ? 'border-border bg-bg-input/30 opacity-60'
          : isEnabled
            ? 'border-accent bg-accent/10'
            : 'border-border bg-bg-input/50'
          }`}
      >
        <button
          disabled={!source.isSelectable}
          onClick={() => toggleSource(activeSourceCategory, source, isEnabled)}
          className={`w-full text-left group ${!source.isSelectable ? 'cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className={`font-semibold text-sm flex items-center gap-2 ${isEnabled ? 'text-accent' : 'text-text'} transition-colors`}>
                {source.label}
                {!source.isSelectable && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-input text-text-subtle uppercase tracking-wide">
                    {t('settings.dataSources.soon', { defaultValue: 'Soon' })}
                  </span>
                )}
              </div>
              <div className={`text-xs mt-1 ${isEnabled ? 'text-text-secondary' : 'text-text-subtle'} transition-colors`}>
                {source.description}
              </div>
            </div>
            <div className={`ml-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isEnabled
              ? 'bg-accent border-accent text-white'
              : 'border-border-input group-hover:border-accent'
              }`}>
              {isEnabled && <Check size={14} strokeWidth={3} className="text-white" />}
            </div>
          </div>
        </button>
        {renderModelApiKeyControls(source, isEnabled)}
      </div>
    );
  };

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
          <Database size={20} className="text-text-secondary" />
          {t('settings.dataSources.title')}
        </h3>
        <p className="text-sm text-text-secondary">
          {t('settings.dataSources.description')}
        </p>
      </div>

      {/* Sync Button */}
      <div className={`rounded-xl border p-4 ${bgCard}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-medium">{t('settings.dataSources.syncModels')}</h4>
            <p className="text-sm text-text-secondary">
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

      <div>
        <SourceCategoryTabs activeCategory={activeSourceCategory} onChange={setActiveSourceCategory} />
        <div
          id={`source-panel-${activeSourceCategory}`}
          role="tabpanel"
          className={`rounded-b-xl rounded-tr-xl border p-4 ${bgCard}`}
        >
          {(() => {
            const summary = getSourceCategorySummary(activeSourceCategory);
            const enabledMap = getEnabledMap(activeSourceCategory);
            return (
              <>
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <h4 className="font-medium">{getCategoryTitle(activeSourceCategory)}</h4>
                    <p className="mt-1 text-xs text-text-subtle">
                      Dedupe: {summary.dedupeStrategy}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 flex-col items-start gap-2 md:items-end">
                    {/* Bulk-toggle the available sources in this category. Planned
                        ("Soon") sources are untouched. Disabled when already in
                        the target state so the buttons feel honest. Aligned with
                        the title; count chips sit below, aligned with the dedupe line. */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setAllInCategory(activeSourceCategory, true)}
                        disabled={allInCategoryAre(activeSourceCategory, true)}
                        className="rounded-md px-2.5 py-1 text-[11px] font-medium text-text-secondary transition-colors hover:bg-accent/10 hover:text-accent disabled:pointer-events-none disabled:opacity-40"
                      >
                        {t('settings.dataSources.selectAll', { defaultValue: 'Select all' })}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllInCategory(activeSourceCategory, false)}
                        disabled={allInCategoryAre(activeSourceCategory, false)}
                        className="rounded-md px-2.5 py-1 text-[11px] font-medium text-text-secondary transition-colors hover:bg-accent/10 hover:text-accent disabled:pointer-events-none disabled:opacity-40"
                      >
                        {t('settings.dataSources.selectNone', { defaultValue: 'Select none' })}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-[11px] md:justify-end">
                      <span className="rounded bg-accent/15 px-2 py-1 text-accent">{summary.available} ready</span>
                      <span className="rounded bg-bg-input px-2 py-1 text-text-subtle">{summary.planned} planned</span>
                      <span className="rounded bg-bg-input px-2 py-1 text-text-subtle">{summary.total} total</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[...getSourcesForSurface('settings', activeSourceCategory)]
                    .sort((a, b) => {
                      if (a.isSelectable !== b.isSelectable) {
                        return a.isSelectable ? -1 : 1;
                      }
                      if (a.isSelectable && b.isSelectable) {
                        const aEnabled = enabledMap[a.key] ?? false;
                        const bEnabled = enabledMap[b.key] ?? false;
                        if (aEnabled !== bEnabled) {
                          return aEnabled ? -1 : 1;
                        }
                      }
                      return a.label.localeCompare(b.label);
                    })
                    .map(renderSourceCard)}
                </div>
              </>
            );
          })()}
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
