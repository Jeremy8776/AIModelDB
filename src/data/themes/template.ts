export const TEMPLATE_CSS = `/* ============================================
 * CUSTOM THEME TEMPLATE - AI Model DB Pro
 * ============================================
 * 
 * HOW TO USE:
 * 1. Download this template via the "Template" button
 * 2. Edit the CSS below to create your custom theme
 * 3. Upload via the "Upload CSS" button in Display Settings
 * 4. Adjust colors using the color pickers - they work with your CSS!
 * 
 * IMPORTANT TIPS:
 * - Use !important to override Tailwind utility classes
 * - Always use CSS variables (var(--xxx)) for colors
 * - Test your theme in both the main view and settings modal
 */

/* ============================================
 * 1. ACCESSIBILITY - Always include this!
 * ============================================ */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation: none !important;
    transition-duration: 0.01ms !important;
  }
}

/* ============================================
 * 2. AVAILABLE CSS VARIABLES
 * ============================================
 * These are automatically set by the color pickers.
 * Use them in your CSS to ensure colors are customizable.
 * 
 * PRIMARY COLORS (from color pickers):
 *   --accent       Accent color (buttons, highlights)
 *   --bg           Main background
 *   --bgCard       Card/panel background  
 *   --text         Main text color
 *   --border       Border color
 * 
 * DERIVED VARIATIONS (auto-generated):
 *   --accentHover  Lighter accent for hover
 *   --accentGlow   30% opacity (for glows/shadows)
 *   --accentFaint  15% opacity (subtle backgrounds)
 *   --accentMuted  25% opacity
 *   --bgInput      Input field background
 *   --textSecondary 70% opacity text
 *   --textMuted    50% opacity text
 *   --borderSubtle 50% opacity border
 *   --borderFaint  25% opacity border
 */

/* ============================================
 * 3. GLOBAL STYLES
 * ============================================ */
body, #root {
  background-color: var(--bg) !important;
  color: var(--text) !important;
}

/* Override common Tailwind background classes */
.bg-zinc-950, .bg-zinc-900, .bg-black {
  background-color: var(--bg) !important;
}

/* ============================================
 * 4. BUTTONS
 * ============================================ */
button {
  background-color: var(--bgCard) !important;
  border: 1px solid var(--border) !important;
  color: var(--text) !important;
}

button:hover {
  border-color: var(--accent) !important;
}

/* ============================================
 * 5. CARDS & PANELS
 * ============================================ */
.rounded-xl, .rounded-lg {
  background-color: var(--bgCard) !important;
  border: 1px solid var(--border) !important;
}

/* ============================================
 * 6. INPUTS & FORMS
 * ============================================ */
input, select, textarea {
  background-color: var(--bgInput) !important;
  border: 1px solid var(--border) !important;
  color: var(--text) !important;
}

input:focus, select:focus, textarea:focus {
  border-color: var(--accent) !important;
  outline: none !important;
}

input::placeholder {
  color: var(--textMuted) !important;
}

/* ============================================
 * 7. DROPDOWN MENUS (ThemedSelect)
 * ============================================
 * These classes style the custom dropdown component.
 * Copy this entire section to ensure dropdowns work!
 */
.themed-select-button {
  background-color: var(--bg) !important;
  border-color: var(--border) !important;
  color: var(--text) !important;
}

.themed-select-text {
  color: var(--text) !important;
}

.themed-select-menu {
  background-color: var(--bg) !important;
  border: 1px solid var(--border) !important;
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

/* ============================================
 * 8. SCROLLBARS
 * ============================================ */
::-webkit-scrollbar {
  width: 8px !important;
  height: 8px !important;
}

::-webkit-scrollbar-track {
  background: var(--bg) !important;
}

::-webkit-scrollbar-thumb {
  background: var(--border) !important;
  border-radius: 4px !important;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--accent) !important;
}

/* ============================================
 * 9. MODAL BACKDROPS
 * ============================================ */
.fixed.inset-0.bg-black\\/50,
.fixed.inset-0[class*='bg-black'],
[class*='backdrop'] {
  background-color: rgba(0, 0, 0, 0.5) !important;
  background-image: none !important;
}

/* ============================================
 * 10. HEADINGS
 * ============================================ */
h1, h2, h3, h4 {
  color: var(--text) !important;
}

/* ============================================
 * 11. TEXT COLORS
 * ============================================ */
p, span, div, label, td, th, li, a {
  color: var(--text) !important;
}

/* Secondary/muted text */
.text-zinc-400, .text-zinc-500, .text-gray-400, .text-gray-500 {
  color: var(--textSecondary) !important;
}

/* ============================================
 * CUSTOMIZATION TIPS
 * ============================================
 * 
 * Want animations? Add keyframes:
 * @keyframes myAnimation {
 *   0% { transform: scale(1); }
 *   50% { transform: scale(1.05); }
 *   100% { transform: scale(1); }
 * }
 * .my-element { animation: myAnimation 2s infinite; }
 * 
 * Want custom fonts? Use Google Fonts:
 * Add to your CSS: font-family: 'Your Font', sans-serif !important;
 * (Make sure the font is loaded in your browser)
 * 
 * Want to style specific elements? Use browser DevTools:
 * 1. Right-click an element > Inspect
 * 2. Find the class names
 * 3. Target them in your CSS
 */
`;
