# AI Model DB - Technical Reference

> **Version**: 0.4.3  
> **Last Updated**: January 17, 2026  
> **License**: MIT

A comprehensive desktop application for tracking, managing, and validating AI models across multiple providers.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Core Concepts](#core-concepts)
   - [Model Schema](#model-schema)
   - [Data Sources](#data-sources)
   - [API Providers](#api-providers)
5. [Services](#services)
   - [Sync Service](#sync-service)
   - [Validation Service](#validation-service)
   - [Storage Service](#storage-service)
6. [Context Providers](#context-providers)
7. [Custom Hooks](#custom-hooks)
8. [Components](#components)
9. [Internationalization](#internationalization)
10. [Theming System](#theming-system)
11. [Electron Integration](#electron-integration)
12. [Utilities](#utilities)
13. [Testing](#testing)
14. [Build & Deployment](#build--deployment)
15. [Configuration](#configuration)

---

## Architecture Overview

AI Model DB follows a **layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│                         Electron Shell                          │
│  (main.js, preload.js, splash.html)                            │
├─────────────────────────────────────────────────────────────────┤
│                        React Application                        │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    Context Providers                       │ │
│  │  (Settings, Theme, Modal, Update)                         │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │                      Components                            │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────┐  │ │
│  │  │ Layout  │ │  Table  │ │ Modals  │ │ Detail/Settings │  │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────────────┘  │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │                     Custom Hooks                           │ │
│  │  (useDashboardController, useSyncOperations, etc.)        │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │                       Services                             │ │
│  │  ┌──────────┐ ┌────────────┐ ┌─────────┐ ┌─────────────┐  │ │
│  │  │ SyncSvc  │ │ Validation │ │ Storage │ │ API/Fetchers│  │ │
│  │  └──────────┘ └────────────┘ └─────────┘ └─────────────┘  │ │
│  ├───────────────────────────────────────────────────────────┤ │
│  │                      Utilities                             │ │
│  │  (format, currency, NSFW, merge, filter, etc.)            │ │
│  └───────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                      localStorage / IPC                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| **Desktop Framework** | Electron | ^28.1.0 | Cross-platform desktop app |
| **UI Framework** | React | ^18.2.0 | Component-based UI |
| **Language** | TypeScript | ^5.4.0 | Type safety |
| **Build Tool** | Vite | ^7.2.2 | Fast development & bundling |
| **Styling** | TailwindCSS | ^3.4.1 | Utility-first CSS |
| **State Management** | React Context | - | Global state |
| **Internationalization** | i18next | ^25.7.3 | Multi-language support |
| **Schema Validation** | Zod | ^4.3.5 | Runtime type validation |
| **Installer** | electron-builder | ^24.9.1 | Cross-platform packaging |
| **Auto-Update** | electron-updater | ^6.6.2 | In-app updates |
| **Unit Testing** | Vitest | ^4.0.16 | Fast test runner |
| **E2E Testing** | Playwright | ^1.57.0 | Browser automation |

---

## Project Structure

```
ai-model-db/
├── electron/                    # Electron main process
│   ├── main.js                  # Main process entry
│   ├── preload.js               # Preload scripts (IPC bridge)
│   ├── splash.html              # Loading splash screen
│   └── entitlements.mac.plist   # macOS entitlements
├── src/
│   ├── AIModelDB.tsx            # Root dashboard component
│   ├── App.tsx                  # React app wrapper
│   ├── main.tsx                 # React entry point
│   ├── index.css                # Global styles & CSS variables
│   ├── components/              # React components
│   │   ├── layout/              # Layout components (MainLayout, etc.)
│   │   ├── table/               # Table components
│   │   ├── detail/              # Detail panel components
│   │   ├── settings/            # Settings tabs
│   │   ├── toasts/              # Toast notifications
│   │   └── *.tsx                # Modal and shared components
│   ├── context/                 # React Context providers
│   ├── hooks/                   # Custom React hooks
│   ├── services/                # Business logic services
│   │   ├── api/                 # API integration layer
│   │   │   ├── fetchers/        # Data source fetchers
│   │   │   ├── providers/       # LLM provider adapters
│   │   │   ├── enrichment/      # Data enrichment
│   │   │   └── translation/     # Translation services
│   │   ├── sync/                # Sync orchestration
│   │   └── storage/             # Local storage
│   ├── types/                   # TypeScript type definitions
│   ├── utils/                   # Utility functions
│   ├── i18n/                    # Internationalization
│   │   └── locales/             # Translation files (10 languages)
│   └── data/                    # Static data (themes, etc.)
├── e2e/                         # End-to-end tests
├── build/                       # Build assets (icons, installer)
├── public/                      # Static assets
└── docs/                        # Documentation
```

---

## Core Concepts

### Model Schema

The central data type is `Model`, representing an AI model with comprehensive metadata:

```typescript
type Model = {
  // Identity
  id: string;                    // Unique identifier
  name: string;                  // Display name
  description?: string | null;   // Model description
  provider?: string | null;      // Provider/organization name
  
  // Classification
  domain: Domain;                // LLM, ImageGen, Audio, etc.
  source: string;                // Data source identifier
  tags?: string[];               // Searchable tags
  
  // Links
  url?: string | null;           // Model page URL
  repo?: string | null;          // Repository URL
  
  // Technical Specs
  parameters?: string | null;    // Parameter count (e.g., "7B")
  context_window?: string | null;// Context length
  
  // Legal & Licensing
  license: LicenseInfo;          // License details
  indemnity?: IndemnityLevel;    // Indemnity status
  usage_restrictions?: string[]; // Usage restrictions
  
  // Availability
  hosting: Hosting;              // Hosting options
  pricing?: Pricing[];           // Pricing information
  
  // Metadata
  updated_at?: string | null;    // Last update timestamp
  release_date?: string | null;  // Release date
  downloads?: number | null;     // Download count
  
  // Performance
  benchmarks?: BenchmarkEntry[]; // Benchmark results
  analytics?: Analytics;         // Analytics data
  
  // User Data
  isFavorite?: boolean;          // User favorite flag
  isNSFWFlagged?: boolean;       // Manual NSFW flag
  flaggedImageUrls?: string[];   // Flagged image URLs
  images?: string[];             // Gallery images
};
```

#### Domains

Available model domains (categories):

```typescript
const DOMAINS = [
  "LLM",              // Large Language Models
  "VLM",              // Vision-Language Models
  "Vision",           // Computer Vision
  "ImageGen",         // Image Generation
  "VideoGen",         // Video Generation
  "Audio",            // Audio Processing
  "ASR",              // Automatic Speech Recognition
  "TTS",              // Text-to-Speech
  "3D",               // 3D Generation
  "World/Sim",        // World/Simulation Models
  "LoRA",             // LoRA Adapters
  "FineTune",         // Fine-tuned Models
  "BackgroundRemoval",// Background Removal
  "Upscaler",         // Image Upscalers
  "Other"             // Uncategorized
] as const;
```

#### License Types

```typescript
type LicenseInfo = {
  name: string;                          // License name
  url?: string | null;                   // License URL
  type: "OSI" | "Copyleft" | "Non-Commercial" | "Custom" | "Proprietary";
  commercial_use: boolean;               // Commercial use allowed
  attribution_required: boolean;         // Attribution required
  share_alike: boolean;                  // Share-alike required
  copyleft: boolean;                     // Copyleft license
  notes?: string | null;                 // Additional notes
};
```

---

### Data Sources

AI Model DB aggregates data from multiple sources:

| Source | ID | Description | Data Type |
|--------|-----|-------------|-----------|
| **Hugging Face** | `huggingface` | Open-source model hub | Models, downloads, images |
| **Artificial Analysis** | `artificialanalysis` | LLM benchmarks & pricing | Benchmarks, pricing |
| **CivitasBay** | `civitasbay` | Image generation models | LoRAs, checkpoints, images |
| **OpenModelDB** | `openmodeldb` | Upscaler models | Upscalers, downloads |
| **Ollama Library** | `ollama` | Local LLM models | Models, parameters |
| **GitHub** | `github` | GitHub ML repositories | Repositories, stars |

Each source has a corresponding **Fetcher** implementing the `Fetcher` interface:

```typescript
interface Fetcher {
  id: string;                                    // Unique source ID
  name: string;                                  // Display name
  isEnabled: (options: SyncOptions) => boolean;  // Check if enabled
  fetch: (                                       // Fetch function
    options: SyncOptions, 
    callbacks?: SyncCallbacks
  ) => Promise<SyncResult>;
}
```

---

### API Providers

LLM providers for validation and enrichment:

| Provider | ID | Protocol | Features |
|----------|-----|----------|----------|
| **OpenAI** | `openai` | OpenAI | GPT-4, web search |
| **Anthropic** | `anthropic` | Anthropic | Claude models |
| **Google** | `google` | Google | Gemini models |
| **DeepSeek** | `deepseek` | OpenAI | DeepSeek models |
| **Perplexity** | `perplexity` | OpenAI | Web search |
| **OpenRouter** | `openrouter` | OpenAI | Multi-provider |
| **Cohere** | `cohere` | Cohere | Command models |
| **Ollama** | `ollama` | Ollama | Local models |

```typescript
type ProviderCfg = {
  name?: string;               // Display name
  enabled: boolean;            // Provider enabled
  apiKey?: string;             // API key (encrypted)
  baseUrl?: string;            // Custom base URL
  model?: string;              // Default model
  webSearch?: boolean;         // Web search capability
  protocol?: 'openai' | 'anthropic' | 'google' | 'ollama';
  headers?: Record<string, string>;  // Custom headers
};
```

---

## Services

### Sync Service

**Location**: `src/services/syncService.ts`, `src/services/sync/`

The sync service orchestrates data fetching from all enabled sources:

```
┌─────────────────────────────────────────────────────────────┐
│                    SyncOrchestrator                         │
├─────────────────────────────────────────────────────────────┤
│  1. Initialize FetcherRegistry                              │
│  2. Register all fetchers (HF, OpenModelDB, Ollama, etc.)  │
│  3. Execute enabled fetchers in parallel                    │
│  4. Run SafetyService (NSFW filtering)                     │
│  5. Run DiscoveryService (LLM-based discovery)             │
│  6. Run TranslationService (CJK translation)               │
│  7. Return combined results                                 │
└─────────────────────────────────────────────────────────────┘
```

**Key Functions**:

```typescript
// Main sync entry point
syncAllSources(
  options: SyncOptions,
  callbacks?: SyncCallbacks
): Promise<SyncResult>

// Sync with auto-refresh support
syncWithLiveOptions(
  options: SyncOptions & {
    autoRefresh?: { enabled: boolean; interval: number; unit: string };
  },
  callbacks?: SyncCallbacks
): Promise<SyncResult>
```

**Sync Types**:

```typescript
interface SyncOptions {
  dataSources: Record<string, boolean>;  // Enabled sources
  apiConfig: ApiDir;                     // API configuration
  artificialAnalysisApiKey?: string;     // AA API key
  // ... additional options
}

interface SyncResult {
  complete: Model[];       // Successfully fetched models
  flagged: Model[];        // Models flagged by safety checks
}

interface SyncProgress {
  current: number;         // Completed sources
  total: number;           // Total sources
  source?: string;         // Current source name
  found?: number;          // Models found
  statusMessage?: string;  // Status message
}
```

---

### Validation Service

**Location**: `src/services/validationService.ts`

Uses LLM providers to validate and enrich model metadata:

**Key Functions**:

```typescript
// Validate all incomplete models
validateAllModels(
  models: Model[],
  options: ValidationOptions,
  callbacks?: ValidationCallbacks
): Promise<ValidationResult>

// Batch validation for large databases
validateInBatches(
  models: Model[],
  options: BatchOptions,
  callbacks?: ValidationCallbacks
): Promise<ValidationResult>

// Single request for small databases
validateSingleRequest(
  models: Model[],
  options: SingleOptions,
  callbacks?: ValidationCallbacks
): Promise<ValidationResult>
```

**Validation Flow**:

1. Filter models with incomplete metadata
2. Find enabled LLM provider with valid API key
3. Generate validation prompt with model data
4. Send to LLM (batch or single request)
5. Parse response and merge with original data
6. Return updated models

---

### Storage Service

**Location**: `src/services/storage/`

Handles localStorage persistence with the following keys:

| Key | Purpose |
|-----|---------|
| `aiModelDB_models` | Model database |
| `aiModelDB_settings` | User settings |
| `aiModelDB_syncHistory` | Sync history (last 5 snapshots) |
| `aiModelDB_theme` | Theme configuration |

---

## Context Providers

### SettingsContext

**Location**: `src/context/SettingsContext.tsx`

Manages user preferences and application configuration:

```typescript
interface Settings {
  // API Configuration
  apiConfig: ApiDir;                    // LLM provider configs
  
  // Sync Settings
  minDownloadsBypass: number;           // Min downloads threshold
  autoRefresh: {
    enabled: boolean;
    interval: number;
    unit: 'minutes' | 'hours' | 'days';
  };
  systemPrompt: string;                 // Custom system prompt
  
  // Display Preferences
  currency: CurrencyCode;               // Display currency
  language: LanguageCode;               // UI language
  defaultSort: { column: string; direction: 'asc' | 'desc' };
  pageSize: number;                     // Items per page
  autoExpandSections: boolean;          // Expand details sections
  
  // Data Sources
  dataSources: Record<string, boolean>; // Enabled sources
  
  // NSFW Filtering
  enableNSFWFiltering: boolean;         // Master toggle
  nsfwFilteringStrict: boolean;         // Strict mode
  logNSFWAttempts: boolean;             // Logging
  customNSFWKeywords: string[];         // Custom keywords
  
  // Import/Export
  importAutoMerge: boolean;             // Auto-merge imports
  exportFormat: 'json' | 'csv' | 'xlsx';
  backupBeforeSync: boolean;            // Pre-sync backup
}
```

### ThemeContext

**Location**: `src/context/ThemeContext.tsx`

Manages theming with CSS variable injection:

- **Default Theme**: Pure black, modern aesthetic
- **Sketch Theme**: Hand-drawn, notebook style
- **Retro Terminal**: Green phosphor CRT effect
- **Custom Themes**: User-uploaded CSS

### UpdateContext

**Location**: `src/context/UpdateContext.tsx`

Manages auto-update functionality:

- Check for updates on launch
- Download progress tracking
- One-click install

### ModalContext

**Location**: `src/context/ModalContext.tsx`

Centralized modal state management.

---

## Custom Hooks

| Hook | Purpose |
|------|---------|
| `useDashboardController` | Main dashboard state orchestration |
| `useSyncOperations` | Sync execution and progress |
| `useModelPersistence` | localStorage model CRUD |
| `useModelValidation` | Validation UI state |
| `useModelFiltering` | Filter logic |
| `useModelSelection` | Multi-select state |
| `useModelMerge` | Model merge logic |
| `useModelCRUD` | Add/edit/delete models |
| `useSyncHistory` | Sync snapshot management |
| `useKeyboardShortcuts` | Keyboard navigation |
| `useOnlineStatus` | Network status detection |
| `useNSFWScan` | NSFW detection |
| `useUIState` | UI state (detail panel, etc.) |
| `useModalState` | Modal visibility state |
| `useConsoleLogging` | Console output |

---

## Components

### Layout Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `MainLayout` | `layout/` | Main app layout with sidebar |
| `TitleBar` | `TitleBar.tsx` | Custom window title bar |
| `FiltersSidebar` | `layout/` | Filter panel |
| `TerminalConsole` | `TerminalConsole.tsx` | Debug console |

### Modal Components

| Component | Purpose |
|-----------|---------|
| `SettingsModal` | User preferences |
| `OnboardingWizard` | First-run setup |
| `ImportModal` | Import data files |
| `ExportModal` | Export with filters |
| `AddModelModal` | Add model manually |
| `ValidationModal` | Validation progress |
| `ValidationResultsModal` | Validation results |
| `ComparisonView` | Side-by-side comparison |
| `KeyboardShortcutsModal` | Keyboard shortcuts help |
| `FlaggedModelsModal` | View flagged models |

### Table Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `ModelRow` | `ModelRow.tsx` | Table row |
| `TableHeader` | `table/` | Sortable header |
| `SkeletonRows` | `table/` | Loading placeholder |

### Detail Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `DetailPanel` | `DetailPanel.tsx` | Model details sidebar |
| `GalleryImage` | `detail/` | Image gallery |
| `MetadataSection` | `detail/` | Collapsible metadata |

---

## Internationalization

**Location**: `src/i18n/`

Supports 10 languages using i18next:

| Language | Code | File |
|----------|------|------|
| English | `en` | `locales/en.json` |
| Chinese (Simplified) | `zh` | `locales/zh.json` |
| Japanese | `ja` | `locales/ja.json` |
| Korean | `ko` | `locales/ko.json` |
| Spanish | `es` | `locales/es.json` |
| French | `fr` | `locales/fr.json` |
| German | `de` | `locales/de.json` |
| Portuguese | `pt` | `locales/pt.json` |
| Russian | `ru` | `locales/ru.json` |
| Arabic | `ar` | `locales/ar.json` |

**Usage**:

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  return <h1>{t('settings.title')}</h1>;
}
```

---

## Theming System

**Location**: `src/context/ThemeContext.tsx`, `src/data/themes/`

Theming uses CSS custom properties (variables):

```css
:root {
  --bg-primary: #000000;
  --bg-secondary: #0a0a0a;
  --text-primary: #ffffff;
  --text-secondary: #a0a0a0;
  --accent-color: #3b82f6;
  --border-color: #333333;
  /* ... */
}
```

**Custom Theme Upload**:

1. User uploads `.css` file
2. CSS is validated and sanitized
3. Custom properties are injected into `:root`
4. Theme persists in localStorage

---

## Electron Integration

### Main Process (`electron/main.js`)

Responsibilities:
- Window management (frameless, custom title bar)
- Auto-update handling
- IPC handlers for:
  - Proxy requests (CORS bypass)
  - Image fetching
  - Translation (Google Translate)
  - File system access

### Preload Script (`electron/preload.js`)

Exposes safe APIs to renderer:

```javascript
window.electronAPI = {
  // Window controls
  getVersion: () => ipcRenderer.invoke('get-version'),
  minimize: () => ipcRenderer.send('minimize'),
  maximize: () => ipcRenderer.send('maximize'),
  close: () => ipcRenderer.send('close'),
  
  // Proxied requests
  proxyRequest: (config) => ipcRenderer.invoke('proxy-request', config),
  fetchImage: (url) => ipcRenderer.invoke('fetch-image', url),
  
  // Translation
  translate: (text, to) => ipcRenderer.invoke('translate', text, to),
  
  // Updates
  onUpdateAvailable: (callback) => /* ... */,
  onDownloadProgress: (callback) => /* ... */,
  onUpdateDownloaded: (callback) => /* ... */,
  installUpdate: () => ipcRenderer.send('install-update'),
};
```

### Splash Screen (`electron/splash.html`)

Loading screen shown while app initializes:
- Animated logo
- Version display
- Loading indicator

---

## Utilities

**Location**: `src/utils/`

| Utility | Purpose |
|---------|---------|
| `format.ts` | Number/date formatting |
| `currency.ts` | Currency conversion & formatting |
| `filterLogic.ts` | Model filtering algorithms |
| `mergeLogic.ts` | Smart model merging |
| `nsfw.ts` | NSFW content detection |
| `nsfw-keywords.ts` | NSFW keyword database |
| `typeGuards.ts` | Runtime type checking |
| `validation.ts` | Model validation helpers |
| `importNormalization.ts` | Import data normalization |
| `debounce.ts` | Debounce/throttle utilities |
| `electron.ts` | Electron environment detection |
| `logger.ts` | Console logging service |
| `migration.ts` | Data migration utilities |

### NSFW Filtering

Multi-layer NSFW detection:

1. **Keyword Matching**: 400+ explicit keywords by category
2. **Regex Patterns**: Complex pattern matching
3. **Safe Patterns**: Whitelisted general-purpose models
4. **Source Blocking**: High-risk sources blocked in strict mode
5. **LLM Analysis**: Optional AI-powered content analysis

---

## Testing

### Unit Tests (Vitest)

**Location**: `src/**/*.test.ts`

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

**Covered modules**:
- `format.ts` - Number/date formatting
- `currency.ts` - Currency conversion
- `mergeLogic.ts` - Model merging
- `filterLogic.ts` - Filter logic
- `typeGuards.ts` - Type guards
- `nsfw.ts` - NSFW detection
- `rateLimiter.ts` - Rate limiting

### E2E Tests (Playwright)

**Location**: `e2e/`

```bash
# Run E2E tests
npm run e2e

# Interactive UI mode
npm run e2e:ui

# Headed mode (visible browser)
npm run e2e:headed
```

---

## Build & Deployment

### Development

```bash
# Install dependencies
npm install

# Run in development (web)
npm run dev

# Run in development (Electron)
npm run electron:dev
```

### Production Build

```bash
# Build web assets
npm run build

# Build Windows installer
npm run electron:build:win

# Build macOS DMG
npm run electron:build:mac

# Build Linux AppImage
npm run electron:build:linux

# Build all platforms
npm run electron:build
```

### CI/CD (GitHub Actions)

**Location**: `.github/workflows/release.yml`

Pipeline:
1. TypeScript check on PRs
2. Unit tests on PRs
3. Multi-platform builds on version tags
4. Auto-publish to GitHub Releases

### Artifacts

| Platform | Artifact | Name |
|----------|----------|------|
| Windows | NSIS Installer | `AI-Model-DB-Setup.exe` |
| macOS | DMG | `AI-Model-DB.dmg` |
| Linux | AppImage | `AI-Model-DB.AppImage` |

---

## Configuration

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `VITE_FORCE_PROD` | Force production mode |
| `VITE_USE_PROXY` | Enable dev proxy server |
| `NODE_ENV` | Environment (development/production) |

### Build Configuration

**electron-builder** (`package.json` > `build`):

```json
{
  "appId": "com.aimodeldb",
  "productName": "AI Model DB",
  "directories": { "output": "release" },
  "publish": {
    "provider": "github",
    "owner": "Jeremy8776",
    "repo": "AIModelDB"
  }
}
```

### ESLint Configuration

**Location**: `eslint.config.js`

ESLint v9 flat config with:
- TypeScript parser
- React Hooks plugin
- Custom rules for code style

---

## Appendix: Quick Reference

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `j` / `↓` | Next model |
| `k` / `↑` | Previous model |
| `Enter` | Open details |
| `Escape` | Close details/modal |
| `x` / `Space` | Toggle selection |
| `Ctrl+A` | Select all |
| `Ctrl+F` | Focus search |
| `?` | Show shortcuts |

### localStorage Keys

| Key | Description |
|-----|-------------|
| `aiModelDB_models` | Model database |
| `aiModelDB_settings` | User settings |
| `aiModelDB_syncHistory` | Sync snapshots |
| `aiModelDB_theme` | Theme config |
| `aiModelDB_wizardComplete` | Onboarding flag |

### API Endpoints

| Provider | Base URL |
|----------|----------|
| OpenAI | `https://api.openai.com/v1` |
| Anthropic | `https://api.anthropic.com/v1` |
| Google | `https://generativelanguage.googleapis.com/v1beta` |
| DeepSeek | `https://api.deepseek.com/v1` |
| Perplexity | `https://api.perplexity.ai` |
| OpenRouter | `https://openrouter.ai/api/v1` |
| Cohere | `https://api.cohere.com/v1` |

---

*This reference document was generated for AI Model DB v0.4.3*
