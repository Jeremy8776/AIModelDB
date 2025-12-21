# AI Model DB Pro - Improvement Roadmap

> Generated: 2025-12-21
> Last Session: Implemented Comparison View, Keyboard Nav, Offline Mode, Error Boundaries, Favorites

---

## 🔴 High Priority

### [x] Update package.json version to 0.3.0
**File:** `package.json` line 5
**Effort:** 5 min
**Notes:** Currently shows 0.2.1, should match the release we just pushed.

---

### [x] Add CHANGELOG.md
**Effort:** 15 min
**Notes:** Document all releases with dates and changes. Start with v0.3.0 changes from today.

---

### [x] Implement Virtual Scrolling for Model List
**Files:** `src/components/layout/MainLayout.tsx`, `src/components/ModelRow.tsx`
**Effort:** 2-3 hours
**Notes:**
- Install `@tanstack/react-virtual`
- Only render visible rows (huge perf gain for 1000+ models)
- Estimate row height ~48px

```bash
npm install @tanstack/react-virtual
```

---

### [x] Split useModels.ts (1,137 lines)
**File:** `src/hooks/useModels.ts`
**Effort:** 3-4 hours
**Notes:** Break into smaller, focused hooks:
- `useModelCRUD.ts` - add, update, delete
- `useModelMerge.ts` - matching, merging logic
- `useModelPersistence.ts` - localStorage, loading, saving
- `useModelValidation.ts` - validation queue logic

---

## 🟡 Medium Priority

### [x] Add Web Worker for Heavy Operations
**Effort:** 3-4 hours
**Notes:**
- Offload JSON parsing, model merging, validation to worker
- Prevents UI freeze during large imports/syncs
- Created `src/workers/modelProcessor.worker.ts`

---

### [x] Implement Bulk Actions
**Files:** `src/components/layout/MainLayout.tsx`, `src/components/ModelRow.tsx`
**Effort:** 2-3 hours
**Features:**
- [x] Checkbox column for multi-select
- [x] Bulk delete
- [x] Bulk export selected
- [ ] Bulk tag/untag (Deferred)

---

### [x] Add Undo Toast for Destructive Actions
**Files:** `src/components/toasts/UndoToast.tsx`
**Effort:** 1-2 hours
**Notes:**
- [x] Create generic Toast component with Undo button
- [x] Display on single or bulk delete
- [x] Restore models on Undo

---

### [x] Loading Skeletons
**Files:** `src/components/layout/MainLayout.tsx`, `src/components/ModelRow.tsx`
**Effort:** 1 hour
**Notes:**
- [x] Replace table spinner with row skeletons
- [x] Match skeletons to new 12-column grid layout

---

### [x] Quick Filter Chips
**File:** `src/components/QuickFilterChips.tsx`
**Effort:** 1-2 hours
**Notes:** REMOVED per user request (redundant with sidebar filters).
- [x] ~~Clickable chips above table: "Free" (Open Source), "Commercial Use", "LLMs", "Image Gen"~~
- [x] ~~Integrated with existing filter state handles~~
- [x] Removed by design - functionality exists in sidebar

---

### [x] API Key Validation on Save
**File:** `src/components/settings/APIConfigSection.tsx`
**Effort:** 1-2 hours
**Notes:**
- [x] Test API key with minimal request before saving
- [x] Prevent saving invalid keys via manual Save button
- [x] Buffered input for safer editing

---

### [x] Apply Rate Limiter Consistently
**File:** `src/services/rateLimiter.ts`, `src/utils/fetch-wrapper.ts`
**Effort:** 1 hour
**Notes:**
- [x] Create centralized `rateLimitedFetch` wrapper
- [x] Apply to `fetchWrapper` (used by external API fetchers)
- [x] Upgraded globally to Tier 2 (50 req/min)

---

## 🟢 Nice-to-Have

### [x] Model Comparison View
**Files:** `src/components/ComparisonView.tsx`, `src/components/layout/MainLayout.tsx`
**Effort:** 3 hours
**Notes:**
- [x] Select 2-4 models via checkbox
- [x] Click "Compare" in floating toolbar
- [x] Side-by-side modal view of attributes (Pricing, License, Params, etc.)

---

### [x] Sync History & Rollback
**Effort:** 4-5 hours
**Notes:**
- [x] Keep last 5 sync snapshots in localStorage
- [x] Allow rollback if sync brings bad data
- [x] Show "Last synced: X models from Y sources" history
- [x] Added History & Rollback tab to Settings modal
- [x] Auto-snapshot before each sync

---

### [x] Favorites/Collections
**Files:** `src/types/index.ts`, `src/hooks/useUIState.ts`, `src/components/ModelRow.tsx`
**Effort:** 3 hours
**Notes:**
- [x] Added `isFavorite` to database schema
- [x] Added Star toggle to model rows
- [x] Added "Favorites Only" filter to sidebar

---

### [x] Export with Filters Applied
**File:** `src/services/exportService.ts`, `src/components/ExportModal.tsx`
**Effort:** 1 hour
**Notes:** Implemented Export Wizard with Custom Filters and Format selection. Replaces simple dropdown.

---

### [x] Keyboard Navigation
**File:** `src/components/table/ModelTable.tsx`
**Effort:** 2 hours
**Notes:**
- [x] `j/k` or Arrows - navigate list (with virtual scroll support)
- [x] `Enter` - open detail panel
- [x] `x` or `Space` - toggle selection
- [x] Visual focus ring on navigation

---

### [x] Offline Mode Indicator
**Effort:** 1 hour
**Notes:**
- [x] Show banner when navigator.onLine is false
- [x] Created `useOnlineStatus` hook

---

### [x] Feature-Level Error Boundaries
**Files:** `src/components/ErrorBoundary.tsx`, `src/components/layout/MainLayout.tsx`
**Effort:** 1 hour
**Notes:**
- [x] Created generic `ErrorBoundary` component
- [x] Wrapped Filters, Table, and DetailPanel to preventing full app crash

---

## 🧪 Testing

### [x] Unit Tests for Core Logic
**Effort:** 4-6 hours
**Priority files:**
- [x] `src/utils/format.ts` - dedupe, CSV parsing, domain mapping (30 tests)
- [x] `src/utils/currency.ts` - conversion, formatting, validation (26 tests)
- [x] `src/utils/mergeLogic.ts` - matching, merging, batch operations (18 tests)

```bash
npm test        # Run all tests
npm test:watch  # Watch mode
npm test:coverage  # With coverage report
```

---

### [x] E2E Tests (Playwright)
**Effort:** 4-6 hours
**Critical paths:**
- [x] App loading and navigation
- [x] Settings modal and tab navigation
- [x] Export modal opens and shows options
- [x] Settings persist after reload
- [x] Offline indicator appears
- [x] Keyboard navigation support
- [x] Search/filter functionality
- [x] Bulk selection

### [x] Test Export Modal Wizard
**Effort:** 30 min
**Scenarios:**
- [x] Export All (JSON/CSV)
- [x] Export Custom: Domain Filter
- [x] Modal close/cancel functionality

```bash
npm run e2e        # Run E2E tests
npm run e2e:ui     # Interactive UI mode
npm run e2e:headed # Run with visible browser
```


---

## 🔧 Infrastructure

### [x] GitHub Actions CI/CD
**Effort:** 2-3 hours
**Automate:**
- [x] TypeScript check on PR
- [x] Build on push to main
- [x] Auto-release on tag (multi-platform: Windows, macOS, Linux)

---

### [x] Type Safety Audit
**Effort:** 2-3 hours
**Notes:** Search for `any` types and replace with proper interfaces, especially in API fetchers.
- [x] Replaced `any` in currency.ts with `Pricing` type
- [x] Replaced `any` in format.ts with `Record<string, unknown>` and `Record<string, string>`
- [x] Fixed dedupe() to use proper Model types instead of any casts

---

## ✅ Completed (This Session)

- [x] Theme system overhaul (v0.3.0)
- [x] Removed Glass/Cyberpunk themes
- [x] Fixed color picker persistence
- [x] Fixed double focus ring
- [x] Removed Optikka branding
- [x] CSS upload validation with toast
- [x] Default theme pure black inputs
- [x] "Delete DB" language consistency
- [x] TitleBar icon theme adaptation
- [x] Sync History & Rollback (Settings > History tab)
- [x] GitHub Actions CI/CD (.github/workflows/ci.yml, release.yml)
- [x] Type Safety Audit (currency.ts, format.ts)
- [x] Unit Tests: 74 tests for format, currency, mergeLogic utilities
- [x] E2E Tests: Playwright setup with app, export modal test suites

---

## 📝 Notes

- **Main file too large:** `AIModelDBPro.tsx` (642 lines) - consider splitting
- **Version sync:** Always update package.json, electron-builder, and in-app version together

---

*Last updated: 2025-12-21 14:14 UTC*
