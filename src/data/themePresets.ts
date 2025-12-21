import { ThemePreset } from '../context/ThemeContext';
import { TEMPLATE_CSS } from './themes/template';
import { DEFAULT_THEME } from './themes/default';
import { SKETCH_THEME } from './themes/sketch';
import { RETRO_THEME } from './themes/retro';

export { TEMPLATE_CSS };

export const SYSTEM_PRESETS: ThemePreset[] = [
  DEFAULT_THEME,
  SKETCH_THEME,
  RETRO_THEME
];
