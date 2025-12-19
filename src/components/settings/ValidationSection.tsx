import React, { useContext } from 'react';
import { Shield, CheckCircle } from 'lucide-react';
import ThemeContext from '../../context/ThemeContext';
import { useSettings } from '../../context/SettingsContext';

export function ValidationSection() {
  const { theme } = useContext(ThemeContext);
  const { settings, saveSettings } = useSettings();

  const bgCard = 'border-zinc-800 bg-black';

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
        </h3>
        <p className="text-sm text-zinc-700 dark:text-zinc-400">
          Configure model validation and data processing options.
        </p>
      </div>

      <div className={`rounded-xl border p-4 ${bgCard}`}>
        <h4 className="font-medium mb-4">Validation Options</h4>
        <div className="space-y-4">
          {validationOptions.map((option) => (
            <div key={option.key} className="flex items-start gap-3">
              <input
                type="checkbox"
                id={option.key}
                checked={Boolean(settings[option.key as keyof typeof settings]) ?? true}
                onChange={(e) => saveSettings({ [option.key]: e.target.checked })}
                className="mt-1 rounded"
              />
              <div className="flex-1">
                <label htmlFor={option.key} className="font-medium text-sm cursor-pointer">
                  {option.label}
                </label>
                <p className="text-xs text-zinc-700 dark:text-zinc-400 mt-1">
                  {option.description}
                </p>
              </div>
            </div>
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
              className={`w-full rounded-lg border px-3 py-2 text-sm ${theme === 'dark' ? 'border-zinc-800 bg-zinc-900/60' : 'border-zinc-300 bg-white'
                }`}
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