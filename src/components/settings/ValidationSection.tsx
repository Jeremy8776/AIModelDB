import React, { useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, CheckCircle, Check } from 'lucide-react';
import ThemeContext from '../../context/ThemeContext';
import { useSettings } from '../../context/SettingsContext';
import { ThemedSelect } from '../ThemedSelect';

export function ValidationSection() {
  const { t } = useTranslation();
  const { theme } = useContext(ThemeContext);
  const { settings, saveSettings } = useSettings();

  const bgCard = 'border-border bg-bg-card text-text';

  const providerOptions = useMemo(() => {
    const opts = [{ value: '', label: t('settings.validation.autoDetect') }];
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
      label: t('settings.validation.options.showCostValidation'),
      description: t('settings.validation.options.showCostValidationDesc')
    },
    {
      key: 'autoMergeDuplicates',
      label: t('settings.validation.options.autoMergeDuplicates'),
      description: t('settings.validation.options.autoMergeDuplicatesDesc')
    },
    {
      key: 'showImportToast',
      label: t('settings.validation.options.showImportToast'),
      description: t('settings.validation.options.showImportToastDesc')
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Shield size={20} className="text-text-secondary" />
          {t('settings.validation.title')}
          <span className="px-2 py-0.5 text-[10px] font-bold bg-accent/20 text-accent rounded-full uppercase">{t('settings.apiConfig.alpha')}</span>
        </h3>
        <p className="text-sm text-zinc-700 dark:text-zinc-400">
          {t('settings.validation.description')}
        </p>
      </div>

      <div className={`rounded-xl border p-4 ${bgCard}`}>
        <h4 className="font-medium mb-4">{t('settings.validation.preferredProvider')}</h4>
        <p className="text-xs text-text-subtle mb-3">
          {t('settings.validation.preferredProviderDesc')}
        </p>
        <ThemedSelect
          value={settings.preferredModelProvider || ''}
          onChange={(val: string) => saveSettings({ preferredModelProvider: val })}
          options={providerOptions}
          ariaLabel="Preferred Provider"
        />
      </div>

      <div className={`rounded-xl border p-4 ${bgCard}`}>
        <h4 className="font-medium mb-4">{t('settings.validation.optionsTitle')}</h4>
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
                  : 'border-border-input group-hover:border-accent border-text-subtle'
                  }`}>
                  {(Boolean(settings[option.key as keyof typeof settings]) ?? true) && <Check size={14} strokeWidth={3} className="text-white" />}
                </div>
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">
                  {option.label}
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  {option.description}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className={`rounded-xl border p-4 ${bgCard}`}>
        <h4 className="font-medium mb-4">{t('settings.validation.batchProcessing')}</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">{t('settings.validation.batchSize')}</label>
            <input
              type="number"
              value={settings.validationBatchSize || 50}
              onChange={(e) => saveSettings({ validationBatchSize: parseInt(e.target.value) || 50 })}
              className="w-full rounded-lg border px-3 py-2 text-sm border-border bg-bg-input text-text"
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
          <h4 className="font-medium">{t('settings.validation.statusTitle')}</h4>
        </div>
        <p className="text-sm text-zinc-700 dark:text-zinc-400">
          {t('settings.validation.statusDesc')}
        </p>
      </div>
    </div>
  );
}