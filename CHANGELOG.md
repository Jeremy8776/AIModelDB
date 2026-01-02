# Changelog

All notable changes to this project will be documented in this file.

## [0.3.16] - 2026-01-02

### Fixed
- **Translation Console Spam**: Reduced translation fallback warnings from per-batch logging to a single summary at the end (e.g., "Used ASCII/context fallback for 12/12 batches").

---

## [0.3.15] - 2026-01-02

### Fixed
- **Wizard Phantom Checkmark**: Fixed the "LLM Discovery" toggle appearing as an unlabeled checkmark in the wizard confirmation step.

### Changed
- **Installer Auto-Launch**: App now automatically launches after install/update, removing the manual "Finish" step.

---

## [0.3.14] - 2026-01-02

### Changed
- **Installer**: Updates now silently uninstall previous versions without prompting. This provides a smoother, more seamless update experience.

---

## [0.3.13] - 2026-01-02

### Fixed
- **Splash Screen Logo**: Fixed SVG logo not being centered on the loading splash screen.

---

## [0.3.12] - 2026-01-02

### Removed
- **Sync ETA Display**: Removed the inaccurate ETA timer from the sync progress indicator. The ETA calculation couldn't account for variable-time operations like CivitBay scraping which take different amounts of time in dev vs production.

---

## [0.3.11] - 2026-01-02

### Fixed
- **Ollama Provider Config**: Added missing `ollama` configuration to `DEFAULT_API_DIR`, resolving TypeScript errors when using local Ollama models.
- **Gitignore Cleanup**: Removed duplicate `release/` entry and added `errors.txt` to ignored files.

### Changed
- **Production Readiness**: Verified all TypeScript compilation, unit tests (74 passing), and build integrity for GitHub release.

---

## [0.3.10] - 2025-12-23

### Fixed
- **API BaseUrl Consistency**: Fixed all API configuration files to use consistent baseUrls with proper `/v1` or `/v1beta` paths:
    - Anthropic: `https://api.anthropic.com/v1`
    - DeepSeek: `https://api.deepseek.com/v1`
    - Cohere: `https://api.cohere.com/v1`
    - Google: `https://generativelanguage.googleapis.com/v1beta`
- **Model Dropdown Styling**: Replaced native HTML `<datalist>` with ThemedSelect component for dark theme compliance.
- **Dropdown Hover Legibility**: Fixed hover state text color to white for better legibility on accent background.
- **EmptyState Card Gradients**: Removed gradients from welcome cards for Default theme consistency (pure black).

### Added
- **Debug Logging**: Added detailed logging to proxy-request handler for API troubleshooting.

---

## [0.3.9] - 2025-12-23

### Fixed
- **API Endpoints Verified**: Thoroughly verified all LLM provider API endpoints against official documentation:
    - **Anthropic**: Now uses actual `/v1/models` endpoint with proper `x-api-key` and `anthropic-version` headers.
    - **Cohere**: Fixed domain from `api.cohere.ai` to `api.cohere.com`; Updated chat endpoint to V2 API (`/v2/chat`).
    - **Google Gemini**: Fixed auth header from `Authorization: Bearer` to `x-goog-api-key`.
    - **Perplexity**: Updated to current Sonar models (sonar-pro, sonar, sonar-reasoning-pro, sonar-deep-research); Returns hardcoded list as no `/models` API exists.
    - **OpenAI, DeepSeek, OpenRouter**: Confirmed correct - no changes needed.

### Added
- **Manual NSFW Flagging**: New feature to manually flag models as NSFW content:
    - Added `isNSFWFlagged` field to Model type.
    - Flag button appears on model row hover (red flag icon).
    - "Hide Flagged" filter in FiltersSidebar (enabled by default).
    - Flagged models persist and are hidden from view unless filter is disabled.

---

## [0.3.8] - 2025-12-22

### Fixed
- **GitHub Actions Build**: Removed `electron-icon-builder` dependency that was causing build failures due to deprecated `phantomjs-prebuilt` package.

---

## [0.3.7] - 2025-12-21

### Fixed
- **System Tab Crash**: Resolved a critical error causing the app to crash when clicking the "System" tab.
    - Added safety checks for `electronAPI` availability to prevent runtime errors.
    - Disabled webhook polling on non-network protocols (e.g., `file://`) to prevent `net::ERR_FILE_NOT_FOUND` on production builds.
- **Stability**: Hardened `isElectron` detection utility.

## [0.3.6] - 2025-12-21

### Fixed
- **Build**: Fixed syntax error in `package.json` that caused v0.3.5 build to fail.

## [0.3.5] - 2025-12-21

### Fixed
- **App Update Check**: Fixed application not checking for updates on launch.
- **Build Configuration**: Configured static artifact names for better persistent download links.
- **Documentation**: Updated README with permanent latest download links and fixed license badge.

## [0.3.4] - 2025-12-21

### Fixed
- **Toolbar Button Legibility**: Fixed Export, Delete DB, and Validate buttons to be legible across all themes (Sketch, Retro Terminal, Default).
- **Header Button Heights**: Normalized header action button heights to be consistent across all themes.
- **Console Button Styling**: Added proper padding and hover effects to Console toggle button.
- **SVG Icon Transitions**: Fixed SVG icons transitioning slower than other elements on un-hover.
- **Model Row Click**: Made entire model row clickable to open detail panel, not just the name column.
- **Export Modal Panel**: Removed grey background from Custom Filters panel for consistency.

### Changed
- **Import Modal**: Removed ODS from supported formats list.

---

## [0.3.3] - 2025-12-21

### Fixed
- **Model Row Hover Styling**: Fixed hover effects on table rows that were being overridden by CSS. Rows now properly show elevated background and accent border on hover for both dark and light themes.
- **Cursor Pointer**: Ensured table rows always show pointer cursor to indicate clickability.

---

## [0.3.1] - 2025-12-21

### Added
- **Sync History & Rollback**: Keep last 5 sync snapshots in localStorage with one-click restore. Access via Settings > History & Rollback tab.
- **GitHub Actions CI/CD**: Automated pipeline with TypeScript checking, unit tests on PRs, and multi-platform Electron releases (Windows, macOS, Linux) on tags.
- **Unit Tests**: 74 unit tests for core utilities using Vitest (`format.ts`, `currency.ts`, `mergeLogic.ts`).
- **E2E Tests**: Playwright test suite covering app loading, settings navigation, export modal, and bulk actions.

### Changed
- **Type Safety**: Replaced `any` types with proper TypeScript interfaces in utility functions.
- **CI Pipeline**: Tests now run automatically before builds.

### Fixed
- **Test Setup**: Fixed `vi` import in test setup file.

---

## [0.3.0] - 2025-12-21

### Added
- **Theme System Overhaul**: Complete rewrite of the theming engine for better performance and customization.
- **CSS Upload Validation**: Added validation and toast notifications when uploading custom CSS themes.
- **Web Worker**: Offloaded heavy operations (merging, import processing) to a background thread to prevent UI freezing.
- **Bulk Actions**: Added support for selecting multiple models, bulk delete, and bulk export.
- **Undo Functionality**: Added "Undo" toast for destructive actions like model deletion.
- **UI Refinement**: Standardized checkbox styling (round) across the app and enhanced Favorites visuals.
- **Enhanced Export**: Added a modal wizard to select export scope (Visible, All, or Custom Filters) and format.
- **Favorites System**: Star models to mark them as favorites and filter the list to show only favorites (moved to top of filters).
- **Error Boundaries**: Wrapped key UI sections (Filters, Table, Details) to prevent cascading application crashes.
- **Offline Mode**: Visible indicator when the application is offline.
- **Keyboard Navigation**: Navigate the model list with `j`/`k` or arrows, open with `Enter`, and select with `x`/`Space`.
- **Comparison View**: Compare 2-4 selected models side-by-side to see specs, pricing, and license differences.
- **Quick Filters**: Removed logic-aware filter chips to reduce visual clutter (functionality exists in sidebar).
- **API Key Validation**: Added buffer-based "Verify & Save" functionality for API keys to prevent saving invalid credentials.
- **Rate Limiting**: Implemented consistent rate limiting (50 req/min) for external API calls.
- **TitleBar Adaptation**: TitleBar icon now dynamically adapts to the active theme's colors.
- **Sync History & Rollback**: Keep last 5 sync snapshots in localStorage; restore previous state if sync brings bad data. Settings > History & Rollback tab.
- **GitHub Actions CI/CD**: Automated TypeScript checking on PRs, build on push to main, and multi-platform releases (Windows, macOS, Linux) on version tags.
- **Unit Tests**: Added 74 unit tests for core utilities (`format.ts`, `currency.ts`, `mergeLogic.ts`) using Vitest.
- **E2E Tests**: Added Playwright E2E tests for core flows (app loading, settings, export, bulk actions).

### Changed
- **Default Theme**: Updated to use pure black backgrounds for inputs and cards for a cleaner look.
- **Performance**: Replaced loading spinners with skeleton rows matching the new 12-column grid layout.
- **Table Layout**: Added checkbox column for bulk selection.
- **UI Consistency**: Standardized focus rings and standardized "Delete DB" language across the app.
- **Type Safety**: Replaced many `any` types with proper TypeScript interfaces in utility functions (`currency.ts`, `format.ts`).
- **Removed**: Deprecated "Glass" and "Cyberpunk" themes in favor of the new customizable engine.
- **Removed**: "Optikka" branding replaced with "AI Model DB Pro".

### Fixed
- **Color Persistence**: Fixed issues where custom color selections would not persist after reload.
- **Focus Rings**: Resolved "double focus ring" visual glitches on input fields.

