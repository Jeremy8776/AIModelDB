import { useContext, useRef, useState, useMemo, useEffect } from 'react';
import { Palette, Sun, Moon, Check, Upload, RotateCcw, Trash2, Edit2, Save, Download, AlertTriangle } from 'lucide-react';
import ThemeContext, { ThemePreset } from '../../context/ThemeContext';
import { useSettings } from '../../context/SettingsContext';
import { ThemedSelect } from '../ThemedSelect';
import { CURRENCY_NAMES, CurrencyCode } from '../../utils/currency';

import { SYSTEM_PRESETS, TEMPLATE_CSS } from '../../data/themePresets';


export function DisplaySection() {
  const {
    theme, toggleTheme, setTheme,
    customColors, setCustomColors, resetColors,
    customCss, setCustomCss,
    savedPresets, addPreset, deletePreset, updatePreset,
    activePresetId, applyPreset
  } = useContext(ThemeContext);

  const { settings, saveSettings } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [uploadFeedback, setUploadFeedback] = useState<{ type: 'success' | 'warning'; message: string } | null>(null);

  const bgCard = 'border-zinc-800 bg-black';

  const allPresets = useMemo(() => [...SYSTEM_PRESETS, ...savedPresets], [savedPresets]);

  const activePreset = allPresets.find(p => p.id === displayPresetId()) || SYSTEM_PRESETS[0];

  function displayPresetId() {
    if (activePresetId) return activePresetId;
    return 'none';
  }

  // Sync preset colors/CSS only when user explicitly changes preset, not on mount
  // Using refs to track state changes vs initial mount
  const prevPresetIdRef = useRef<string | null>(activePresetId);
  const isInitialMountRef = useRef(true);

  useEffect(() => {
    // Skip applying preset on initial mount - colors are already loaded from localStorage
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      prevPresetIdRef.current = activePresetId;
      return;
    }

    // Only run when activePresetId actually changes to a new value
    if (activePresetId && activePresetId !== prevPresetIdRef.current) {
      const preset = allPresets.find(p => p.id === activePresetId);
      if (preset) {
        // Apply the preset's CSS
        setCustomCss(preset.css);
        // Apply the preset's colors (this populates the color pickers)
        if (preset.colors) {
          setCustomColors(preset.colors);
        }
        // Apply the preset's mode (light/dark)
        if (preset.mode) {
          setTheme(preset.mode);
        }
      }
    }
    prevPresetIdRef.current = activePresetId;
  }, [activePresetId]); // Only depend on activePresetId

  const handleDownloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSS], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'theme-template.css';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePresetChange = (id: string) => {
    const preset = allPresets.find(p => p.id === id);
    if (!preset) return;
    applyPreset(id);
    setCustomCss(preset.css);
    if (preset.colors) setCustomColors(preset.colors);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (content) {
        // Check if CSS uses variable references
        const usesVariables = content.includes('var(--');
        const hasAccent = content.includes('--accent');
        const hasBg = content.includes('--bg');
        const hasText = content.includes('--text');

        const newPreset: ThemePreset = {
          id: `custom-${Date.now()}`,
          name: file.name.replace('.css', '') || 'Custom Preset',
          css: content,
          colors: customColors,
          isSystem: false
        };
        addPreset(newPreset);
        handlePresetChange(newPreset.id);

        // Show appropriate feedback
        if (usesVariables && (hasAccent || hasBg || hasText)) {
          setUploadFeedback({
            type: 'success',
            message: '✓ Theme uploaded! Use the color pickers above to customize colors.'
          });
        } else {
          setUploadFeedback({
            type: 'warning',
            message: '⚠ Theme uploaded, but no CSS variables detected. Colors may not be customizable. Download the template for guidance.'
          });
        }

        // Auto-hide feedback after 8 seconds
        setTimeout(() => setUploadFeedback(null), 8000);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };


  const handleRename = () => {
    if (activePreset.isSystem) return;
    updatePreset(activePreset.id, { name: renameValue });
    setIsRenaming(false);
  };

  const startRename = () => {
    setRenameValue(activePreset.name);
    setIsRenaming(true);
  };

  const updateColor = (key: keyof typeof customColors, value: string) => {
    setCustomColors({ ...customColors, [key]: value });
    if (activePresetId && !activePreset.isSystem) {
      updatePreset(activePresetId, {
        colors: { ...customColors, [key]: value }
      });
    }
  };

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
    label: `${code} - ${name} `
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
          {activePresetId && activePresetId !== 'none' ? (
            <>
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-700 bg-zinc-800/50 text-zinc-500 opacity-60">
                <Moon size={16} />
                Theme Override Active
              </div>
              <span className="text-sm text-zinc-500">
                Preset "{activePreset.name}" controls the theme
              </span>
            </>
          ) : (
            <>
              <button
                onClick={toggleTheme}
                className={`flex items - center gap - 2 px - 4 py - 2 rounded - lg border transition - colors ${theme === 'dark'
                  ? 'border-zinc-700 bg-zinc-800 text-white'
                  : 'border-zinc-300 bg-white text-zinc-900'
                  } `}
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
            </>
          )}
        </div>
      </div>

      {/* UI Customization */}
      <div className={`rounded-xl border p-4 ${bgCard}`}>
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium">Custom UI Colors</h4>
          <div className="flex items-center gap-2">
            {activePresetId && !activePreset.isSystem && (
              <span className="text-[10px] text-zinc-500 bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
                Auto-saving to preset
              </span>
            )}
            <button
              onClick={() => {
                // Reset to the active preset's colors, not global defaults
                if (activePreset?.colors) {
                  setCustomColors(activePreset.colors);
                } else {
                  resetColors();
                }
              }}
              className="text-xs flex items-center gap-1 px-3 py-1.5 rounded border border-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors"
              title={`Reset to ${activePreset?.name || 'default'} colors`}
            >
              <RotateCcw size={12} /> Reset
            </button>
          </div>
        </div>

        {/* Color Pickers Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {[
            { label: 'Accent Color', key: 'accent', desc: 'Buttons, borders, highlights' },
            { label: 'Background', key: 'background', desc: 'Main app background' },
            { label: 'Card Background', key: 'card', desc: 'Panels and sections' },
            { label: 'Text Color', key: 'text', desc: 'Primary text content' },
            { label: 'Border Color', key: 'border', desc: 'Dividers and input borders' }
          ].map(({ label, key, desc }) => (
            <div key={key} className="flex items-start gap-3 p-3 rounded-lg border border-zinc-800/50 bg-zinc-900/20">
              <input
                type="color"
                value={customColors[key as keyof typeof customColors] || '#000000'}
                onChange={(e) => updateColor(key as keyof typeof customColors, e.target.value)}
                className="rounded-lg border border-zinc-700 cursor-pointer shrink-0 shadow-sm transition-transform hover:scale-105"
                style={{
                  width: '48px',
                  height: '48px',
                  padding: 0,
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  border: 'none'
                }}
                title={`Choose ${label} `}
              />
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-medium mb-0.5">{label}</label>
                <p className="text-[10px] text-zinc-500 mb-2 truncate">{desc}</p>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 text-xs font-mono select-none">#</span>
                  <input
                    type="text"
                    value={(customColors[key as keyof typeof customColors] || '#000000').replace('#', '')}
                    onChange={(e) => updateColor(key as keyof typeof customColors, `#${e.target.value.replace('#', '')} `)}
                    className="flex-1 bg-transparent text-xs font-mono text-zinc-300 focus:ring-0 focus:outline-none"
                    spellCheck={false}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Style Presets & Custom CSS */}
      <div className={`rounded-xl border p-4 ${bgCard}`}>
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium">Interface Style</h4>
          {/* Custom Preset Management Actions */}
          {!activePreset.isSystem && (
            <div className="flex items-center gap-2">
              {isRenaming ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    className="bg-zinc-900 border border-zinc-700 px-2 py-1 rounded text-xs"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                  />
                  <button onClick={handleRename} className="p-1 hover:text-green-400"><Save size={14} /></button>
                </div>
              ) : (
                <button onClick={startRename} className="p-1 text-zinc-500 hover:text-zinc-300" title="Rename Preset"><Edit2 size={14} /></button>
              )}
              <button onClick={() => deletePreset(activePreset.id)} className="p-1 text-zinc-500 hover:text-red-400" title="Delete Preset"><Trash2 size={14} /></button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Style Preset</label>
            <ThemedSelect
              value={activePreset.id}
              onChange={handlePresetChange}
              options={allPresets.map(p => ({
                value: p.id,
                label: p.name + (p.isSystem ? '' : ' (Custom)')
              }))}
              ariaLabel="Style Preset"
            />
            <p className="text-xs text-zinc-500 mt-2">
              Choose a pre-defined visual style for the application.
            </p>
          </div>

          <div className="pt-2 border-t border-zinc-800/50">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="text-sm font-medium mb-1">Upload New Style</h5>
                <p className="text-xs text-zinc-500">Upload a .css file. It will be saved as a new preset.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadTemplate}
                  className="text-xs flex items-center gap-2 text-zinc-400 hover:text-zinc-200 px-3 py-2 rounded-lg transition-all hover:bg-zinc-800"
                  title="Download formatting template"
                >
                  <Download size={14} />
                  Template
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".css"
                  onChange={handleFileUpload}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 px-3 py-2 rounded-lg transition-all"
                >
                  <Upload size={14} />
                  Upload CSS
                </button>
              </div>
            </div>

            {/* Upload Feedback Message */}
            {uploadFeedback && (
              <div className={`mt-3 p-3 rounded-lg text-sm flex items-start gap-2 ${uploadFeedback.type === 'success'
                ? 'bg-green-900/30 border border-green-700/50 text-green-300'
                : 'bg-amber-900/30 border border-amber-700/50 text-amber-300'
                }`}>
                {uploadFeedback.type === 'warning' && <AlertTriangle size={16} className="shrink-0 mt-0.5" />}
                <span>{uploadFeedback.message}</span>
                <button
                  onClick={() => setUploadFeedback(null)}
                  className="ml-auto text-xs opacity-60 hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
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

          <label htmlFor="showCostValidation" className="flex items-center gap-3 cursor-pointer group select-none">
            <div className="relative flex items-center justify-center">
              <input
                type="checkbox"
                id="showCostValidation"
                checked={settings.showCostValidation ?? true}
                onChange={(e) => saveSettings({ showCostValidation: e.target.checked })}
                className="sr-only"
              />
              <div className={`w - 6 h - 6 rounded - full border - 2 flex items - center justify - center transition - all ${(settings.showCostValidation ?? true)
                ? 'bg-accent border-accent'
                : 'border-zinc-600 group-hover:border-zinc-500'
                } `}>
                {(settings.showCostValidation ?? true) && <Check size={14} strokeWidth={3} className="text-white" />}
              </div>
            </div>
            <span className="text-sm">
              Show cost validation and estimates
            </span>
          </label>
        </div>
      </div>

      {/* Display Options */}
      <div className={`rounded-xl border p-4 ${bgCard}`}>
        <h4 className="font-medium mb-4">Interface Options</h4>
        <div className="space-y-4">
          {displayOptions.map((option) => (
            <label key={option.key} htmlFor={option.key} className="flex items-start gap-3 cursor-pointer group select-none">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  id={option.key}
                  checked={Boolean(settings[option.key as keyof typeof settings]) ?? true}
                  onChange={(e) => saveSettings({ [option.key]: e.target.checked })}
                  className="sr-only"
                />
                <div className={`w - 6 h - 6 rounded - full border - 2 flex items - center justify - center transition - all ${(Boolean(settings[option.key as keyof typeof settings]) ?? true)
                  ? 'bg-accent border-accent'
                  : 'border-zinc-600 group-hover:border-zinc-500'
                  } `}>
                  {(Boolean(settings[option.key as keyof typeof settings]) ?? true) && <Check size={14} strokeWidth={3} className="text-white" />}
                </div>
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">
                  {option.label}
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  {option.description}
                </p>
              </div>
            </label>
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