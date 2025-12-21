import { ThemePreset } from '../../context/ThemeContext';

export const DEFAULT_THEME: ThemePreset = {
    id: 'none',
    name: 'Default',
    css: '',
    colors: {
        primary: '#8b5cf6',
        accent: '#8b5cf6',
        background: '#000000',
        card: '#000000',
        text: '#fafafa',
        border: '#27272a'
    },
    isSystem: true,
    mode: 'dark'
};
