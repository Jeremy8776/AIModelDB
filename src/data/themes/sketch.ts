import { ThemePreset } from '../../context/ThemeContext';

export const SKETCH_THEME: ThemePreset = {
  id: 'sketch',
  name: 'Sketch',
  css: `/* Sketch Theme - Hand-drawn aesthetic 
   * Updated with 'Patrick Hand' font and performance optimizations
   */

/* Respect reduced motion preferences */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation: none !important;
    transition-duration: 0.01ms !important;
  }
}

/* Base styling - Handwritten font */
body, #root {
  background-color: var(--bg) !important;
  font-family: 'Patrick Hand', 'Segoe Print', 'Chalkboard SE', 'Comic Sans MS', cursive !important;
  font-size: 110% !important; /* Handwriting needs to be slightly larger to be readable */
  /* Subtle notebook paper lines */
  background-image: 
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 28px,
      var(--borderFaint) 28px,
      var(--borderFaint) 29px
    ) !important;
}

/* Exclude the transition-all from everything to save performance */
* {
    transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
}

/* Wobbly borders for ALL buttons */
button {
  border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px !important;
  border: 2px solid var(--border) !important;
  box-shadow: 2px 2px 0px var(--border) !important;
  background-color: var(--bgCard) !important;
  padding: 6px 12px !important;
  font-family: 'Patrick Hand', cursive !important;
}

button:hover {
  transform: rotate(-0.5deg) translateY(-1px) !important;
  box-shadow: 3px 3px 0px var(--accent) !important;
  border-color: var(--accent) !important;
}

button:active {
  transform: translate(1px, 1px) !important;
  box-shadow: 0px 0px 0px var(--border) !important;
}

/* Input styling - subtle sketch effect */
input:not([type="color"]), select, textarea {
  border: 2px solid var(--border) !important;
  box-shadow: 2px 2px 0px var(--border) !important;
  background-color: var(--bgCard) !important;
  padding: 8px 12px !important;
  font-family: 'Patrick Hand', cursive !important;
  font-size: 1.1em !important;
  border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px !important;
}

input:not([type="color"]):focus, select:focus, textarea:focus {
  outline: none !important;
  border-color: var(--accent) !important;
  box-shadow: 3px 3px 0px var(--accent) !important;
  transform: scale(1.01);
}

/* Color input - sketch effect */
input[type="color"] {
  border: 2px solid var(--border) !important;
  box-shadow: 2px 2px 0px var(--border) !important;
  border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px !important;
}

input[type="color"]::-webkit-color-swatch {
  border-radius: 200px 10px 180px 10px / 10px 180px 10px 200px !important;
}

/* Large Containers (Modal, Sidebar, Main Table, Sections) */
.rounded-3xl, .rounded-2xl, .rounded-xl {
  box-shadow: 3px 3px 0px var(--border) !important;
  border: 2px solid var(--border) !important;
  background-color: var(--bg) !important;
  /* Gentle wobble for large surfaces 20px avg */
  border-radius: 20px 3px 18px 4px / 4px 18px 3px 20px !important;
}

/* Small Containers (Inner cards, Inputs, small widgets) */
.rounded-lg, .rounded-md, .rounded {
  box-shadow: 2px 2px 0px var(--border) !important;
  border: 2px solid var(--border) !important;
  background-color: var(--bg) !important;
  /* Tighter wobble for small items ~8-10px avg */
  border-radius: 10px 2px 8px 3px / 4px 8px 3px 10px !important;
}

/* Headings with accent color */
h1, h2, h3, h4 {
  color: var(--accent) !important;
  font-weight: 700 !important;
  font-family: 'Patrick Hand', cursive !important;
  letter-spacing: 0.5px !important;
}

/* Text colors */
p, span, div, label, td, th, li, a, button, input, select, textarea {
  color: var(--text) !important;
  font-family: 'Patrick Hand', cursive !important;
}

/* Navigation buttons - clean style */
nav button,
.settings-modal-sidebar nav button {
  background-color: transparent !important;
  box-shadow: none !important;
  border: none !important;
  border-radius: 8px !important;
}


/* Clean Header styling for Sketch - Transparent & Borderless */
.app-header, header, 
.app-header > div {
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  border-bottom: none !important;
  box-shadow: none !important;
}

/* Ensure Search container retains its card look */
.app-header > div > div:first-child {
   background-color: var(--bgCard) !important;
   border: 2px solid var(--border) !important;
   border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px !important;
}

/* Ensure header buttons match the 'paper' aesthetic */
.app-header button:not(.bg-accent) {
  background-color: var(--bgCard) !important;
  border: 2px solid var(--border) !important;
}

/* Search input specific styling for Sketch */
.app-header input {
  font-family: 'Patrick Hand', 'Segoe Print', cursive !important;
}

/* Toolbar (Pagination, Export, etc.) Styling for Sketch */
main div[class*="flex flex-wrap items-center"] button,
main div[class*="flex flex-wrap items-center"] .ThemedSelect,
.DownloadDropdown button {
  background-color: var(--bgCard) !important;
  border: 2px solid var(--border) !important;
  border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px !important; /* Wobbly border */
  box-shadow: 2px 2px 0px var(--border) !important;
  font-family: 'Patrick Hand', 'Segoe Print', cursive !important;
}

/* Active state for toolbar buttons */
main div[class*="flex flex-wrap items-center"] button:active {
  box-shadow: inset 1px 1px 0px var(--border) !important;
  transform: translate(1px, 1px);
}

/* Remove boxy style from Table Header Sort Buttons */
.grid.grid-cols-12 > button {
  background-color: transparent !important;
  border: none !important;
  box-shadow: none !important;
  border-radius: 0 !important;
  padding: 0 !important;
  font-weight: bold !important;
  transform: none !important;
}

/* Active Sort Header State - Map violet to theme accent */
.grid.grid-cols-12 > button[class*="text-violet"] {
  color: var(--accent) !important;
  text-decoration: underline !important;
  text-decoration-style: wavy !important;
}

/* Settings Modal Main Cards - High Padding */
.settings-modal-container div.rounded-xl:not(.themed-select-menu) {
  padding: 2.5rem !important;
}

/* Compact Inputs for Settings Cards (Fix overflow in color pickers) */
.settings-modal-container input[type="text"],
.settings-modal-container input[type="number"] {
  padding: 4px 8px !important;
  font-size: 0.95em !important;
  line-height: 1.2 !important;
  border-radius: 10px 2px 8px 3px / 4px 8px 3px 10px !important;
  box-shadow: 1px 1px 0px var(--border) !important;
}

/* Fix contrast on solid accent backgrounds (Checkboxes, Primary Buttons) */
.bg-accent,
.bg-accent svg,
.bg-accent span,
.bg-accent div,
.bg-accent p,
button.bg-accent {
  color: var(--bg) !important;
}

/* Sketchy Icons filter */
svg:not(.no-sketch) {
  filter: url(#sketchy-svg) !important;
  stroke-width: 2.5px !important;
  stroke-linecap: round !important;
  stroke-linejoin: round !important;
}

/* Force Header Update Button components to black (per user request) */
#header-update-db-btn,
#header-update-db-btn span,
#header-update-db-btn svg {
  color: var(--text) !important;
  stroke: var(--text) !important;
}

#header-update-db-btn:hover,
#header-update-db-btn:hover span,
#header-update-db-btn:hover svg {
  color: var(--bg) !important;
  stroke: var(--bg) !important; 
}

/* Force Sync Now Button to black (per user request) */
#sync-now-btn,
#sync-now-btn span,
#sync-now-btn svg {
  color: var(--text) !important;
  stroke: var(--text) !important;
}

#sync-now-btn:hover,
#sync-now-btn:hover span,
#sync-now-btn:hover svg {
  color: var(--bg) !important;
  stroke: var(--bg) !important; 
}

/* Detail Panel Override - Force Paper Background */
#model-detail-panel {
  background-color: var(--bgCard) !important;
  backdrop-filter: none !important;
  /* Redundant relative to rounded-2xl but explicit for safety */
  border-radius: 20px 3px 18px 4px / 4px 18px 3px 20px !important;
  border: 2px solid var(--border) !important;
  box-shadow: 3px 3px 0px var(--border) !important;
}

/* Explicitly link Settings Modal body to main background */
.settings-modal-container {
  background-color: var(--bg) !important;
}

/* Settings Modal dividers - subtle and minimal */
.settings-modal-header {
  border-bottom: 1px solid var(--borderFaint) !important;
  box-shadow: none !important;
}

.settings-modal-sidebar {
  border-right: 1px solid var(--borderFaint) !important;
  box-shadow: none !important;
}

/* ELIMINATE PURE WHITE - Force all white backgrounds to match Cream Paper */
.bg-white,
.bg-white\/95,
.bg-white\/90,
.bg-white\/80,
.bg-slate-50,
.bg-gray-50,
.bg-gray-100,
.bg-zinc-50,
.bg-zinc-100,
/* Modal containers */
.fixed.inset-0 > div[class*='max-w'],
.fixed.inset-0 > div[class*='rounded'],
/* Form elements */
input,
select,
textarea {
  background-color: var(--bgCard) !important;
}

/* Window Controls styling for Sketch */
.window-controls button {
  border: 1.5px solid var(--border) !important;
  border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px !important;
  transition: transform 0.1s ease !important;
}

.window-controls button:hover {
  transform: scale(1.1) rotate(-2deg);
  background-color: var(--bgCard) !important;
}

/* Ensure the titlebar seamlessly blends in */
.app-titlebar {
    background-color: transparent !important;
    border-bottom: none !important;
}

/* Fix Dropdown/Select Hover Contrast on Sketch (Accent bg -> contrast text) */
.themed-select-item:hover,
.themed-select-item-selected,
.absolute button:hover,
.z-30 button:hover,
[role="menuitem"]:hover {
  color: var(--bg) !important;
  background-color: var(--accent) !important;
}

/* Specific button overrides */
nav button:hover {
  background-color: var(--accentFaint) !important;
  transform: none !important;
  box-shadow: none !important;
  text-decoration: underline !important;
  text-decoration-style: wavy !important;
  text-decoration-color: var(--accent) !important;
}

/* Modal backdrop - keep dark overlay */
.fixed.inset-0.bg-black\\/50,
.fixed.inset-0[class*='bg-black'],
[class*='backdrop'] {
  background-color: rgba(0, 0, 0, 0.5) !important;
  background-image: none !important;
  box-shadow: none !important;
  border: none !important;
}

/* Custom Scrollbars */
::-webkit-scrollbar {
  width: 14px !important;
  height: 14px !important;
  background: transparent !important;
}
::-webkit-scrollbar-track {
  background: transparent !important;
}
::-webkit-scrollbar-thumb {
  background: var(--bgCard) !important;
  border: 2px solid var(--border) !important;
  border-radius: 255px 15px 225px 15px / 15px 225px 15px 255px !important;
  box-shadow: 1px 1px 0px var(--border) !important;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--accent) !important;
  transform: rotate(-1deg) !important;
}
`,
  colors: {
    primary: '#44403c',
    accent: '#292524',
    background: '#f5f3ef',
    card: '#f5f3ef',
    text: '#1c1917',
    border: '#a8a29e'
  },
  isSystem: true,
  mode: 'light'
};
