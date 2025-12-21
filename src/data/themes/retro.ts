import { ThemePreset } from '../../context/ThemeContext';

export const RETRO_THEME: ThemePreset = {
  id: 'retro',
  name: 'Retro Terminal',
  css: `/* Retro Terminal - Classic CRT monitor aesthetic */

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation: none !important;
    transition-duration: 0.01ms !important;
  }
}

/* Monospace font everywhere */
* {
  font-family: 'VT323', 'Courier New', 'Consolas', 'Monaco', monospace !important;
  border-radius: 0 !important;
  text-shadow: 0 0 2px var(--accentSoft); /* Subtle Phosphor glow */
}

/* Set base size on html to scale detailed rem units (Tailwind) */
html {
  font-size: 20px !important; /* Bump base size to 20px (125% of normal) */
}

/* CRT Scanline Overlay */
body::after {
  content: " ";
  display: block;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
  z-index: 20; /* Below modals (z-50) and dropdowns (z-30) */
  background-size: 100% 2px, 3px 100%;
  pointer-events: none;
}

/* FORCE BLACK ON CONTAINERS ONLY - not text elements or color previews */
html, body, #root,
div:not(.color-preview), section, article, aside, header, footer, main, nav,
.bg-zinc-50, .bg-zinc-100, .bg-zinc-200, .bg-zinc-300, .bg-zinc-400,
.bg-zinc-500, .bg-zinc-600, .bg-zinc-700, .bg-zinc-800, .bg-zinc-900, .bg-zinc-950,
.bg-zinc-900\\/70, [class*='bg-zinc-900\\/'], [class*='bg-zinc-800\\/'],
.bg-black, .bg-white, .bg-gray-50, .bg-gray-100, .bg-gray-800, .bg-gray-900,
.rounded-xl:not(.color-preview), .rounded-lg:not(.color-preview), .rounded-md, .rounded {
  background-color: var(--bg) !important;
  background-image: none !important;
}

/* Text elements should NOT have background */
span, p, h1, h2, h3, h4, h5, h6, label, a {
  background-color: transparent !important;
}

/* Color picker box - keep the color visible, sharp corners */
input[type='color'],
.color-preview {
  background-color: inherit !important;
  border-radius: 0 !important;
}

input[type='color']::-webkit-color-swatch {
  border-radius: 0 !important;
}

input[type='color']::-moz-color-swatch {
  border-radius: 0 !important;
}

/* Table elements */
tr, td, th, thead, tbody, table,
button.grid, button.rounded-xl,
.grid.grid-cols-12 {
  background-color: var(--bg) !important;
}

/* All text - terminal green */
h1, h2, h3, h4, h5, h6,
p, span, div, label, td, th, li, a,
.text-zinc-100, .text-zinc-200, .text-zinc-300, .text-zinc-400, .text-white {
  color: var(--text) !important;
}

/* Input fields */
input, select, textarea {
  background-color: var(--bg) !important;
  border: 1px solid var(--accent) !important;
  color: var(--text) !important;
  box-shadow: 0 0 3px var(--accent) !important;
}

input:focus, select:focus, textarea:focus {
  outline: none !important;
  box-shadow: 0 0 8px var(--accent) !important;
}

input::placeholder {
  color: var(--textMuted) !important;
}

/* Dropdown menus */
.absolute, [class*='absolute'],
.z-30, [class*='z-30'],
.shadow-lg, [class*='shadow'],
.overflow-auto, .max-h-64 {
  background-color: var(--bg) !important;
  border-color: var(--accent) !important;
}

/* ThemedSelect specific styling */
.themed-select-button {
  background-color: var(--bg) !important;
  border-color: var(--accent) !important;
  color: var(--text) !important;
}

.themed-select-text {
  color: var(--text) !important;
}

.themed-select-menu {
  background-color: var(--bg) !important;
  border-color: var(--accent) !important;
}

.themed-select-item {
  background-color: var(--bg) !important;
  color: var(--text) !important;
}

.themed-select-item:hover {
  background-color: var(--accent) !important;
  color: var(--bg) !important;
}

.themed-select-item-selected {
  background-color: var(--accent) !important;
  color: var(--bg) !important;
}

/* Dropdown menu items */
.absolute button, 
[class*='z-30'] button,
.overflow-auto button {
  background-color: var(--bg) !important;
  color: var(--text) !important;
  border: none !important;
}

/* Dropdown item hover - accent background, bg text */
.absolute button:hover, 
[class*='z-30'] button:hover,
.overflow-auto button:hover,
.hover\\:bg-zinc-800:hover {
  background-color: var(--accent) !important;
  color: var(--bg) !important;
}

/* Buttons */
button {
  background-color: transparent !important;
  border: 1px solid var(--accent) !important;
  color: var(--text) !important;
  text-transform: uppercase !important;
  letter-spacing: 1px !important;
}

/* Model row hover - grid divs (table rows) */
div.group\\/row:hover,
.group\\/row:hover,
button.grid:hover,
button[class*='grid-cols']:hover {
  background-color: var(--accent) !important;
}

div.group\\/row:hover *,
.group\\/row:hover *,
button.grid:hover *,
button[class*='grid-cols']:hover * {
  color: var(--bg) !important;
  background-color: transparent !important;
}

div.group\\/row:hover svg,
.group\\/row:hover svg,
button.grid:hover svg,
button[class*='grid-cols']:hover svg {
  stroke: var(--bg) !important;
}

/* Dropdown menu item hover */
.themed-select-item:hover,
.absolute button:hover,
.z-30 button:hover {
  background-color: var(--accent) !important;
  color: var(--bg) !important;
}

/* Nav/Menu button hover (modal sidebar, tabs, etc) */
nav button:hover,
aside button:hover,
button[class*='rounded-lg']:hover,
button[class*='hover:bg-']:hover {
  background-color: var(--accent) !important;
  color: var(--bg) !important;
}

nav button:hover *,
aside button:hover *,
button[class*='rounded-lg']:hover *,
button[class*='hover:bg-']:hover * {
  color: var(--bg) !important;
}

/* Table row hover */
tr:hover {
  background-color: var(--accent) !important;
}

tr:hover * {
  color: var(--bg) !important;
}

/* Borders - only on specific interactive elements */
input, select, textarea {
  border-color: var(--accent) !important;
}

/* Table header - no border */
.grid.grid-cols-12.border-b,
div[class*='grid-cols-12'].border-b,
.border-b {
  border-color: transparent !important;
  border-bottom-color: var(--accentFaint) !important;
}

/* Sort buttons in header - no border */
.grid.grid-cols-12 button,
div[class*='grid-cols-12'] button,
/* Fix double borders in DataSources list */
.rounded-lg button.group {
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
}

/* Remove borders from non-interactive elements */
thead, th, .border-t, .divide-y > *,
nav, [class*='border-zinc'], hr {
  border-color: var(--accentFaint) !important;
}

/* Card borders - subtle */
.rounded-xl, .rounded-lg {
  border-color: var(--accentMuted) !important;
}

/* Badges and tags - including specific colored ones */
.badge, [class*='badge'], .rounded-full,
.bg-emerald-500, .bg-emerald-600, .bg-emerald-400,
.bg-green-500, .bg-green-600, .bg-green-400,
.bg-cyan-500, .bg-cyan-600, .bg-sky-500,
[class*='bg-emerald'], [class*='bg-green'], [class*='bg-cyan'], [class*='bg-sky'] {
  background-color: transparent !important;
  border: 1px solid var(--accent) !important;
  color: var(--text) !important;
}

/* Remove any colored backgrounds - comprehensive list */
.bg-violet-500, .bg-violet-600, .bg-purple-500,
.bg-blue-500, .bg-red-500, .bg-yellow-500, .bg-orange-500,
[class*='bg-violet'], [class*='bg-purple'], [class*='bg-blue'],
[class*='bg-red'], [class*='bg-yellow'], [class*='bg-orange'] {
  background-color: transparent !important;
  border: 1px solid var(--accent) !important;
}

/* Inline colored spans (like badges with specific colors) */
span[class*='bg-'], div[class*='bg-emerald'], div[class*='bg-green'],
span[class*='bg-emerald'], span[class*='bg-green'], span[class*='bg-cyan'] {
  background-color: transparent !important;
  border: 1px solid var(--accent) !important;
  color: var(--text) !important;
}

/* Selected/active row states */
tr.bg-zinc-800, tr[class*='bg-zinc-8'], 
.selected, [class*='selected'] {
  background-color: var(--bgElevated) !important;
}

/* Modal backdrop */
.fixed.inset-0.bg-black\\/50,
.fixed.inset-0[class*='bg-black'],
[class*='backdrop'] {
  background-color: rgba(0, 0, 0, 0.85) !important;
  background-image: none !important;
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 8px !important;
  background: var(--bg) !important;
}
::-webkit-scrollbar-thumb {
  background: var(--accent) !important;
}
`,
  colors: {
    primary: '#4ade80',
    accent: '#4ade80',
    background: '#000000',
    card: '#000000',
    text: '#4ade80',
    border: '#4ade80'
  },
  isSystem: true,
  mode: 'dark'
};
