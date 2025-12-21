import React, { createContext, useState, ReactNode, useContext, useEffect } from 'react';

export type ThemeType = 'dark' | 'light';

// Define the structure for custom colors
export interface CustomColors {
  primary: string;
  accent: string;
  background: string;
  card: string;
  text: string;
  border: string; // Added border
}

export const DEFAULT_COLORS: CustomColors = {
  primary: '#8b5cf6', // violet-500
  accent: '#8b5cf6',  // violet-500
  background: '#000000', // pure black
  card: '#000000', // pure black
  text: '#fafafa', // white
  border: '#27272a' // zinc-800
};

const adjustColor = (color: string, amount: number) => {
  const clamp = (val: number) => Math.min(Math.max(val, 0), 255);
  const removeHash = color.replace('#', '');
  const num = parseInt(removeHash, 16);
  let r = (num >> 16) + amount;
  let g = ((num >> 8) & 0x00FF) + amount;
  let b = (num & 0x0000FF) + amount;
  return `#${(1 << 24 | clamp(r) << 16 | clamp(g) << 8 | clamp(b)).toString(16).slice(1)}`;
};

const hexToRgba = (hex: string, alpha: number) => {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt('0x' + hex[1] + hex[1]);
    g = parseInt('0x' + hex[2] + hex[2]);
    b = parseInt('0x' + hex[3] + hex[3]);
  } else if (hex.length === 7) {
    r = parseInt('0x' + hex[1] + hex[2]);
    g = parseInt('0x' + hex[3] + hex[4]);
    b = parseInt('0x' + hex[5] + hex[6]);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export interface ThemePreset {
  id: string;
  name: string;
  css: string;
  colors?: CustomColors;
  isSystem?: boolean;
  mode?: ThemeType;
}

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  toggleTheme: () => void;

  customCss: string;
  setCustomCss: (css: string) => void;

  customColors: CustomColors;
  setCustomColors: (colors: CustomColors) => void;
  resetColors: () => void; // Resets to default colors (but keeps current CSS? or reset all?)

  savedPresets: ThemePreset[];
  addPreset: (preset: ThemePreset) => void;
  updatePreset: (id: string, updates: Partial<ThemePreset>) => void;
  deletePreset: (id: string) => void;
  activePresetId: string | null;
  applyPreset: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  setTheme: () => { },
  toggleTheme: () => { },
  customCss: '',
  setCustomCss: () => { },
  customColors: DEFAULT_COLORS,
  setCustomColors: () => { },
  resetColors: () => { },
  savedPresets: [],
  addPreset: () => { },
  updatePreset: () => { },
  deletePreset: () => { },
  activePresetId: null,
  applyPreset: () => { }
});

const THEME_STORAGE_KEY = 'aiModelDBPro_theme';
const CSS_STORAGE_KEY = 'aiModelDBPro_customCss';
const COLORS_STORAGE_KEY = 'aiModelDBPro_customColors';
const PRESETS_STORAGE_KEY = 'aiModelDBPro_savedPresets';
const ACTIVE_PRESET_KEY = 'aiModelDBPro_activePresetId';

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Theme State
  const [theme, setThemeState] = useState<ThemeType>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      return (saved === 'light' || saved === 'dark') ? saved : 'dark';
    } catch { return 'dark'; }
  });

  // Custom CSS State
  const [customCss, setCustomCssState] = useState<string>(() => {
    return localStorage.getItem(CSS_STORAGE_KEY) || '';
  });

  // Custom Colors State
  const [customColors, setCustomColorsState] = useState<CustomColors>(() => {
    try {
      const saved = localStorage.getItem(COLORS_STORAGE_KEY);
      return saved ? { ...DEFAULT_COLORS, ...JSON.parse(saved) } : DEFAULT_COLORS;
    } catch { return DEFAULT_COLORS; }
  });

  // Saved Presets
  const [savedPresets, setSavedPresets] = useState<ThemePreset[]>(() => {
    try {
      const saved = localStorage.getItem(PRESETS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [activePresetId, setActivePresetId] = useState<string | null>(() => {
    return localStorage.getItem(ACTIVE_PRESET_KEY) || null;
  });

  // Apply basic theme class
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Apply Custom CSS
  useEffect(() => {
    let styleTag = document.getElementById('custom-user-css');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'custom-user-css';
      document.head.appendChild(styleTag);
    }
    styleTag.textContent = customCss;
  }, [customCss]);

  // Apply Custom Colors as CSS Variables
  useEffect(() => {
    const root = document.documentElement;
    const { accent, background, card, text, border } = customColors;

    // Main Variables
    root.style.setProperty('--accent', accent);
    root.style.setProperty('--bg', background);
    root.style.setProperty('--bgCard', card);
    root.style.setProperty('--text', text);
    // Explicit Border Variable from user selection
    root.style.setProperty('--border', border);
    root.style.setProperty('--borderInput', border); // Make inputs match generic border

    // Derived Accent Variations
    try {
      root.style.setProperty('--accentHover', adjustColor(accent, 20));
      root.style.setProperty('--accentLight', adjustColor(accent, 40));
      root.style.setProperty('--accentDark', adjustColor(accent, -20));
      root.style.setProperty('--accentGlow', hexToRgba(accent, 0.3));

      // Semi-transparent accent variations for subtle effects
      root.style.setProperty('--accentFaint', hexToRgba(accent, 0.15));
      root.style.setProperty('--accentMuted', hexToRgba(accent, 0.25));
      root.style.setProperty('--accentSoft', hexToRgba(accent, 0.4));

      // Derived UI Colors
      root.style.setProperty('--bgInput', adjustColor(background, 10));
      root.style.setProperty('--bgElevated', adjustColor(background, 15));

      // Secondary text derived from main text
      root.style.setProperty('--textSecondary', hexToRgba(text, 0.7));
      root.style.setProperty('--textSubtle', hexToRgba(text, 0.45));
      root.style.setProperty('--textMuted', hexToRgba(text, 0.5));

      // Semi-transparent border variations
      root.style.setProperty('--borderSubtle', hexToRgba(border, 0.5));
      root.style.setProperty('--borderFaint', hexToRgba(border, 0.25));
    } catch (e) {
      console.warn('Invalid color string in theme context');
    }
  }, [customColors]);

  // Sync to LocalStorage
  const setCustomCss = (css: string) => {
    setCustomCssState(css);
    localStorage.setItem(CSS_STORAGE_KEY, css);
    // If we manually change CSS, we might be diverging from preset, 
    // but for now we keep activePresetId unless explicitly cleared.
  };

  const setCustomColors = (colors: CustomColors) => {
    setCustomColorsState(colors);
    localStorage.setItem(COLORS_STORAGE_KEY, JSON.stringify(colors));
  };

  const addPreset = (preset: ThemePreset) => {
    const newPresets = [...savedPresets, preset];
    setSavedPresets(newPresets);
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(newPresets));
  };

  const updatePreset = (id: string, updates: Partial<ThemePreset>) => {
    const newPresets = savedPresets.map(p => p.id === id ? { ...p, ...updates } : p);
    setSavedPresets(newPresets);
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(newPresets));
  };

  const deletePreset = (id: string) => {
    const newPresets = savedPresets.filter(p => p.id !== id);
    setSavedPresets(newPresets);
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(newPresets));
    if (activePresetId === id) setActivePresetId(null);
  };

  const applyPreset = (id: string) => {
    // Check saved presets first
    const preset = savedPresets.find(p => p.id === id);
    // Can also check system presets passed from outside? 
    // Ideally component handles finding the preset object, but context applies it.
    // For now, let's assume the component will pass the DATA to setCustom* if it's a system preset,
    // and use this for user presets. 
    // WAIT: `applyPreset` needs to know about system presets to work by ID alone.
    // I'll make `applyPreset` accept the full object or ID? 
    // Let's keep ID for state tracking, but maybe we need a registry.

    // Actually, to support "system presets" that aren't in `savedPresets`, 
    // we should probably just rely on the component to set CSS/Colors directly 
    // and `setActivePresetId(id)`.
    setActivePresetId(id);
    localStorage.setItem(ACTIVE_PRESET_KEY, id);

    if (preset) {
      setCustomCss(preset.css);
      if (preset.colors) setCustomColors(preset.colors);
    }
  };

  // applyPreset just tracks the ID - the component handles applying CSS/Colors
  // because the component has access to both system and saved presets
  const setActivePreset = (id: string) => {
    setActivePresetId(id);
    localStorage.setItem(ACTIVE_PRESET_KEY, id);
  };

  const resetColors = () => {
    setCustomColors(DEFAULT_COLORS);
  };

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  };

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{
      theme, setTheme, toggleTheme,
      customCss, setCustomCss,
      customColors, setCustomColors, resetColors,
      savedPresets, addPreset, updatePreset, deletePreset,
      activePresetId, applyPreset: setActivePreset
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

export default ThemeContext;
