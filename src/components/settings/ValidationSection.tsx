import React, { useContext, useMemo } from 'react';
import { Shield, CheckCircle, Check } from 'lucide-react';
import ThemeContext from '../../context/ThemeContext';
import { useSettings } from '../../context/SettingsContext';
import { ThemedSelect } from '../ThemedSelect';

export function ValidationSection() {
  const { theme } = useContext(ThemeContext);
  const { settings, saveSettings } = useSettings();

  const bgCard = 'border-border bg-card text-text';

  const providerOptions = useMemo(() => {
    const opts = [{ value: '', label: 'Auto-detect (First Available)' }];
    if (settings.apiConfig) {
      Object.entries(settings.apiConfig).forEach(([key, cfg]) => {
        if ((cfg as any).enabled) {
          opts.push({
            value: key,
            label: (cfg as any).name || key.charAt(0).toUpperCase() + key.slice(1)
          });
        }
      });
    }
    return opts;
  }, [settings.apiConfig]);

  const validationOptions = [
    {
      key: 'showCostValidation',
      label: 'Show Cost Validation',
      description: 'Display cost estimates during validation processes'
    },
    {
      key: 'autoMergeDuplicates',
      label: 'Auto-merge Duplicates',
      description: 'Automatically merge duplicate models during import'
    },
    {
      key: 'showImportToast',
      label: 'Show Import Notifications',
      description: 'Display toast notifications for import operations'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Shield size={20} className="text-zinc-500" />
          Validation Settings
          <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-400 rounded-full uppercase">Alpha</span>
        </h3>
        <p className="text-sm text-zinc-700 dark:text-zinc-400">
          Configure AI-powered model validation and data processing. These features are experimental.
        </p>
      </div>

      <div className={`rounded-xl border p-4 ${bgCard}`}>
        <h4 className="font-medium mb-4">Preferred Validation Provider</h4>
        <p className="text-xs text-zinc-500 mb-3">
          Select which AI provider should be used for validation and enrichment tasks.
        </p>
        <ThemedSelect
          value={settings.preferredModelProvider || ''}
          onChange={(val: string) => saveSettings({ preferredModelProvider: val })}
          options={providerOptions}
          ariaLabel="Preferred Provider"
        />
      </div>

      <div className={`rounded-xl border p-4 ${bgCard}`}>
        <h4 className="font-medium mb-4">Validation Options</h4>
        <div className="space-y-4">
          {validationOptions.map((option) => (
            <label key={option.key} htmlFor={option.key} className="flex items-start gap-3 cursor-pointer group select-none">
              <div className="relative mt-1">
                <input
                  type="checkbox"
                  id={option.key}
                  checked={Boolean(settings[option.key as keyof typeof settings]) ?? true}
                  onChange={(e) => saveSettings({ [option.key]: e.target.checked })}
                  className="sr-only"
                />
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${(Boolean(settings[option.key as keyof typeof settings]) ?? true)
                  ? 'bg-accent border-accent'
                  : 'border-zinc-600 group-hover:border-zinc-500'
                  }`}>
                  {(Boolean(settings[option.key as keyof typeof settings]) ?? true) && <Check size={14} strokeWidth={3} className="text-white" />}
                </div>
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">
                  {option.label}
                </div>
                <p className="text-xs text-zinc-700 dark:text-zinc-400 mt-1">
                  {option.description}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className={`rounded-xl border p-4 ${bgCard}`}>
        <h4 className="font-medium mb-4">Batch Processing</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Validation Batch Size</label>
            <input
              type="number"
              value={settings.validationBatchSize || 50}
              onChange={(e) => saveSettings({ validationBatchSize: parseInt(e.target.value) || 50 })}
              className="w-full rounded-lg border px-3 py-2 text-sm border-border bg-input text-text"
              min="1"
              max="200"
            />
            <p className="text-xs text-zinc-700 dark:text-zinc-400 mt-1">
              Number of models to validate in each batch (1-200)
            </p>
          </div>
        </div>
      </div>

      <div className={`rounded-xl border p-4 ${bgCard}`}>
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle size={16} className="text-accent" />
          <h4 className="font-medium">Validation Status</h4>
        </div>
        <p className="text-sm text-zinc-700 dark:text-zinc-400">
          Validation services are configured and ready to use. Models will be automatically
          validated when imported or when running manual validation processes.
        </p>
      </div>
    </div>
  );
}