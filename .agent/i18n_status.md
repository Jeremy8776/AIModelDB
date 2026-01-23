# i18n Migration Status

## Completed
- **Infrastructure**: Reverted to `i18n/index.ts` using local JSON files to avoid Google Translate API limits.
- **Fixed**: Electron main process `translate-text` handler (now accepts target language).
- **Components Translated**:
  - All main components including:
    - `src/components/layout/*`
    - `src/components/console/*`
    - `src/components/settings/*`
    - `src/components/AddModelModal.tsx`
    - `src/components/FlaggedModelsModal.tsx`
    - `src/components/SimpleValidationModal.tsx`
    - `src/components/ValidationResultsModal.tsx`
    - `src/components/KeyboardShortcutsModal.tsx`
    - `src/components/ExportModal.tsx`
    - `src/components/ImportModal.tsx`

## Pending Translation
- None identified.

## Language Files
- `en.json`: **Current Source of Truth**.
- `zh.json`: **Up to Date**. Contains all keys including new error messages.
- **Other Languages** (`ja.json`, `es.json`, etc.): **Mostly Complete**. They contain all major UI keys (Export, Import, Comparison, etc.) but may be missing some newer specific error messages found in `en.json` (e.g. `errors.emptyUrl`, `errors.parseFile`).
