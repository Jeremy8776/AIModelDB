# Changelog

All notable changes to this project will be documented in this file.

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

