# i18n Migration Status

## Completed
- **Infrastructure**: Reverted to `i18n/index.ts` using local JSON files to avoid Google Translate API limits.
- **Fixed**: Electron main process `translate-text` handler (now accepts target language), though currently unused due to local file strategy.
- **Components Translated**:
  - `src/components/layout/Header.tsx`
  - `src/components/layout/FiltersSidebar.tsx`
  - `src/components/layout/Toolbar.tsx`
  - `src/components/table/TableHeader.tsx`
  - `src/components/console/ConsoleButton.tsx`
  - `src/components/SettingsModal.tsx`
  - `src/components/settings/DisplaySection.tsx`
  - `src/components/ExportModal.tsx`
  - `src/components/ImportModal.tsx`

## Pending Translation
- **Modals**:
  - `src/components/AddModelModal.tsx`
  - `src/components/FlaggedModelsModal.tsx`
  - `src/components/SimpleValidationModal.tsx`
  - `src/components/ValidationResultsModal.tsx`
  - `src/components/KeyboardShortcutsModal.tsx`
- **Settings Sections**:
  - `src/components/settings/DataSourcesSection.tsx`
  - `src/components/settings/APIConfigSection.tsx`
  - `src/components/settings/SecuritySection.tsx`
  - `src/components/settings/SystemSection.tsx`
  - `src/components/settings/HistorySection.tsx`

## Language Files
- `en.json`: **Current Source of Truth**. Contains many new keys for Export, Import, etc.
- `zh.json`: **Manually Updated**. Contains the latest keys.
- **Other Languages** (`ja.json`, `es.json`, etc.): **Stale**. They are valid JSON but missing the newest keys (e.g. `export.*`, `import.*`). They need to be updated to match `en.json`.
