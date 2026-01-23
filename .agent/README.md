# Agent Context - AI Model DB

This folder contains context and reference materials for AI agents working on this codebase.

**Read this first**, then consult specific documents as needed.

---

## 📚 Available Resources

### Core Documentation

| File | Description | When to Read |
|------|-------------|--------------|
| [`REFERENCE.md`](./REFERENCE.md) | Complete technical reference | First time working on project |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Deep dive into architecture, data flow, patterns | Understanding how things work |
| [`CONVENTIONS.md`](./CONVENTIONS.md) | Code style, patterns, gotchas | Before writing code |

### Status & Tracking

| File | Description |
|------|-------------|
| [`i18n_status.md`](./i18n_status.md) | Translation status and pending work |

### Workflows

| File | Description |
|------|-------------|
| [`workflows/common-tasks.md`](./workflows/common-tasks.md) | Step-by-step guides for adding data sources, components, settings, etc. |

---

## 🚀 Quick Start for Agents

### First Time on This Project?

1. **Read [`REFERENCE.md`](./REFERENCE.md)** - Get the big picture
2. **Skim [`ARCHITECTURE.md`](./ARCHITECTURE.md)** - Understand data flow
3. **Bookmark [`CONVENTIONS.md`](./CONVENTIONS.md)** - Reference while coding

### Key Directories

```
src/
├── components/     # React UI components
├── hooks/          # Custom React hooks (state logic)
├── services/       # Business logic (sync, validation, API)
├── context/        # React Context providers (global state)
├── utils/          # Pure utility functions
├── types/          # TypeScript type definitions
└── i18n/           # Internationalization
```

### Core Data Flow

```
User Action
    │
    ▼
Custom Hook (useDashboardController, useSyncOperations)
    │
    ▼
Service Layer (syncService, validationService)
    │
    ▼
API/Fetchers ─────► External APIs
    │
    ▼
localStorage ◄───── Persistence
    │
    ▼
React State ─────► UI Update
```

---

## ⚠️ Critical Knowledge

### localStorage Keys
All keys use `aiModelDB_` prefix:
- `aiModelDB_models` - Model database
- `aiModelDB_settings` - User settings
- `aiModelDB_theme` - Theme config
- `aiModelDB_syncHistory` - Sync snapshots

### Electron Context
```typescript
import { isElectron } from '../utils/electron';

if (isElectron()) {
  // Use window.electronAPI for proxied requests
  window.electronAPI.proxyRequest(config);
} else {
  // Direct fetch (dev mode)
  fetch(url);
}
```

### User Flags Preservation
These fields must NEVER be overwritten during sync:
- `isFavorite`
- `isNSFWFlagged`
- `flaggedImageUrls`

### NSFW Filtering
Enabled by default (`enableNSFWFiltering: true`). Always respect this setting.

---

## 🔧 Common Tasks Quick Reference

| Task | See |
|------|-----|
| Add data source | [`workflows/common-tasks.md#adding-a-new-data-source`](./workflows/common-tasks.md) |
| Add component | [`workflows/common-tasks.md#adding-a-new-component`](./workflows/common-tasks.md) |
| Add setting | [`workflows/common-tasks.md#adding-a-new-setting`](./workflows/common-tasks.md) |
| Add modal | [`workflows/common-tasks.md#adding-a-new-modal`](./workflows/common-tasks.md) |
| Add hook | [`workflows/common-tasks.md#adding-a-new-custom-hook`](./workflows/common-tasks.md) |
| Add translations | [`workflows/common-tasks.md#adding-translation-keys`](./workflows/common-tasks.md) |
| Write tests | [`workflows/common-tasks.md#writing-tests`](./workflows/common-tasks.md) |

---

## ✅ Before Committing

1. `npm test` - All tests pass
2. `npm run lint` - No lint errors
3. `npm run build` - TypeScript compiles
4. Update `CHANGELOG.md` if user-facing changes
