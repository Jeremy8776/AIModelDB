/**
 * Language Selector Component
 * 
 * Dropdown for selecting the app's display language.
 * Integrates with SettingsContext and i18next.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../context/SettingsContext';
import { SUPPORTED_LANGUAGES, LanguageCode } from '../../i18n';
import { ThemedSelect } from '../ThemedSelect';

export function LanguageSelector() {
    const { t } = useTranslation();
    const { settings, saveSettings } = useSettings();

    const handleLanguageChange = (value: string) => {
        saveSettings({ language: value as LanguageCode });
    };

    const languageOptions = SUPPORTED_LANGUAGES.map(lang => ({
        value: lang.code,
        label: `${lang.nativeName} (${lang.name})`
    }));

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <div className="flex-1">
                    <ThemedSelect
                        value={settings.language}
                        onChange={handleLanguageChange}
                        options={languageOptions}
                        ariaLabel={t('settings.general.language')}
                    />
                </div>
                <button
                    onClick={async () => {
                        const { clearTranslationCache } = await import('../../i18n');
                        clearTranslationCache();
                        window.location.reload();
                    }}
                    className="px-3 py-2 text-xs rounded border border-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors h-full"
                    title="Clear translation cache and reload"
                >
                    Refresh
                </button>
            </div>
            <p className="text-xs text-zinc-500">
                {t('settings.general.languageHint')}
            </p>
        </div>
    );
}
