import React, { useContext } from 'react';
import { Palette, Sun, Moon } from 'lucide-react';
import ThemeContext from '../../context/ThemeContext';
import { useSettings } from '../../context/SettingsContext';
import { ThemedSelect } from '../ThemedSelect';
import { CURRENCY_NAMES, CurrencyCode } from '../../utils/currency';

export function DisplaySection() {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { settings, saveSettings } = useSettings();

  const bgCard = 'border-zinc-800 bg-black';

  const displayOptions = [
    {
      key: 'showConsoleButton',
      label: 'Show Console Button',
      description: 'Display the console button for debugging'
    },
    {
      key: 'autoExpandSections',
      label: 'Auto-expand Sections',
      description: 'Automatically expand collapsible sections'
    }
  ];

  const currencyOptions = Object.entries(CURRENCY_NAMES).map(([code, name]) => ({
    value: code,
    label: `${code} - ${name}`
  }));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Palette size={20} className="text-zinc-500" />
          Display & Appearance
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Customize the appearance and behavior of the interface.
        </p>
      </div>

      {/* Theme Selection */}
      <div className={`rounded-xl border p-4 ${bgCard}`}>
        <h4 className="font-medium mb-4">Theme</h4>
        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${theme === 'dark'
              ? 'border-zinc-700 bg-zinc-800 text-white'
              : 'border-zinc-300 bg-white text-zinc-900'
              }`}
          >
            {theme === 'dark' ? (
              <>
                <Moon size={16} />
                Dark Mode
              </>
            ) : (
              <>
                <Sun size={16} />
                Light Mode
              </>
            )}
          </button>
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            Current theme: {theme === 'dark' ? 'Dark' : 'Light'}
          </span>
        </div>
      </div>

      {/* Currency Settings */}
      <div className={`rounded-xl border p-4 ${bgCard}`}>
        <h4 className="font-medium mb-4">Currency & Costs</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Default Currency</label>
            <ThemedSelect
              value={settings.currency || 'USD'}
              onChange={(value) => saveSettings({ currency: value as CurrencyCode })}
              options={currencyOptions}
              ariaLabel="Default currency"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="showCostValidation"
              checked={settings.showCostValidation ?? true}
              onChange={(e) => saveSettings({ showCostValidation: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="showCostValidation" className="text-sm">
              Show cost validation and estimates
            </label>
          </div>
        </div>
      </div>

      {/* Display Options */}
      <div className={`rounded-xl border p-4 ${bgCard}`}>
        <h4 className="font-medium mb-4">Interface Options</h4>
        <div className="space-y-4">
          {displayOptions.map((option) => (
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
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  {option.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Page Size Settings */}
      <div className={`rounded-xl border p-4 ${bgCard}`}>
        <h4 className="font-medium mb-4">Pagination</h4>
        <div>
          <label className="block text-sm font-medium mb-2">Default Page Size</label>
          <ThemedSelect
            value={String(settings.defaultPageSize || 50)}
            onChange={(value) => saveSettings({ defaultPageSize: parseInt(value) })}
            options={[
              { value: '50', label: '50 items per page' },
              { value: '100', label: '100 items per page' },
              { value: '500', label: '500 items per page' },
              { value: '0', label: 'Show all items' }
            ]}
            ariaLabel="Default page size"
          />
        </div>
      </div>
    </div>
  );
}