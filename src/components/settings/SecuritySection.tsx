import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, AlertTriangle, Check } from 'lucide-react';
import ThemeContext from '../../context/ThemeContext';
import { useSettings } from '../../context/SettingsContext';

export function SecuritySection() {
  const { t } = useTranslation();
  const { theme } = useContext(ThemeContext);
  const { settings, saveSettings } = useSettings();

  const bgCard = 'border-border bg-bg-card';

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Shield size={20} className="text-text-secondary" />
          {t('settings.security.title')}
        </h3>
        <p className="text-sm text-text-secondary">
          {t('settings.security.description')}
        </p>
      </div>

      {/* Content Filtering */}
      <div className={`rounded-xl border p-4 ${bgCard}`}>
        <h4 className="font-medium mb-4">{t('settings.security.contentFiltering')}</h4>
        <div className="space-y-4">
          <label htmlFor="enableNSFWFiltering" className="flex items-start gap-3 cursor-pointer group select-none">
            <div className="relative mt-1">
              <input
                type="checkbox"
                id="enableNSFWFiltering"
                checked={settings.enableNSFWFiltering ?? true}
                onChange={(e) => saveSettings({ enableNSFWFiltering: e.target.checked })}
                className="sr-only"
              />
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${(settings.enableNSFWFiltering ?? true)
                ? 'bg-accent border-accent text-white'
                : 'border-border-input group-hover:border-accent border-text-subtle'
                }`}>
                {(settings.enableNSFWFiltering ?? true) && <Check size={14} strokeWidth={3} className="text-white" />}
              </div>
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm">
                {t('settings.security.enableNSFWFiltering')}
              </div>
              <p className="text-xs text-text-secondary mt-1">
                {t('settings.security.enableNSFWFilteringHint')}
              </p>
            </div>
          </label>

          <label htmlFor="logNSFWAttempts" className="flex items-start gap-3 cursor-pointer group select-none">
            <div className="relative mt-1">
              <input
                type="checkbox"
                id="logNSFWAttempts"
                checked={settings.logNSFWAttempts ?? false}
                onChange={(e) => saveSettings({ logNSFWAttempts: e.target.checked })}
                className="sr-only"
              />
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${(settings.logNSFWAttempts ?? false)
                ? 'bg-accent border-accent text-white'
                : 'border-border-input group-hover:border-accent border-text-subtle'
                }`}>
                {(settings.logNSFWAttempts ?? false) && <Check size={14} strokeWidth={3} className="text-white" />}
              </div>
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm">
                {t('settings.security.logNSFWAttempts')}
              </div>
              <p className="text-xs text-text-secondary mt-1">
                {t('settings.security.logNSFWAttemptsHint')}
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Corporate Notice */}
      <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-yellow-500 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-600 dark:text-yellow-400 mb-2">
              {t('settings.security.corporateNotice')}
            </h4>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              {t('settings.security.corporateNoticeText')}
            </p>
          </div>
        </div>
      </div>

      {/* API Security */}
      <div className={`rounded-xl border p-4 ${bgCard}`}>
        <h4 className="font-medium mb-4">{t('settings.security.apiSecurity')}</h4>
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={16} className="text-accent" />
              <span className="font-medium text-green-500 text-sm">
                {t('settings.security.keysSecured')}
              </span>
            </div>
            <p className="text-xs text-green-500">
              {t('settings.security.keysSecuredDesc')}
            </p>
          </div>

          <div className="text-sm text-text-secondary">
            <h5 className="font-medium mb-2">{t('settings.security.bestPractices')}</h5>
            <ul className="space-y-1 text-xs text-text-subtle">
              <li>• {t('settings.security.bestPracticesList.minimalPermissions')}</li>
              <li>• {t('settings.security.bestPracticesList.rotateKeys')}</li>
              <li>• {t('settings.security.bestPracticesList.monitorUsage')}</li>
              <li>• {t('settings.security.bestPracticesList.keepUpdated')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}