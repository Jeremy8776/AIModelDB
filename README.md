# AI Model Live Database – Pro

A comprehensive, standalone desktop application for tracking, managing, and validating AI models across multiple providers including Hugging Face, OpenAI, Anthropic, Google, and more.

Built with **Electron** + **React** + **TypeScript** + **Vite**.

## Features

- **Multi-Source Model Database**: Aggregate AI models from Hugging Face, Artificial Analysis, Roboflow, Kaggle, TensorArt, Civitai, and more
- **LLM-Powered Validation**: Use AI to validate and enrich model metadata using OpenAI, Anthropic, Google, or DeepSeek
- **Real-Time Synchronization**: Keep your database up-to-date with background sync from multiple sources
- **Advanced Filtering**: Filter models by domain, provider, license type, and custom tags
- **Dark/Light Theme**: Full theme support with a sleek dark mode by default
- **Export Capabilities**: Export your model database to CSV or XLSX formats
- **Secure API Key Management**: Encrypted local storage for all API keys
- **Cross-Platform**: Available for Windows, macOS, and Linux

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd model-db
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running the App

#### Development Mode (Electron)
Run the app in development mode with hot-reload:
```bash
npm run electron:dev
```

#### Development Mode (Web Only)
Run as a web app for faster development:
```bash
npm run dev
```
Then open `http://localhost:5173`

#### Production Mode (Electron)
Build and run the production version:
```bash
npm run build
npm run electron:start
```

### Building Installers

#### Windows
```bash
npm run electron:build:win
```
Creates NSIS installer and portable executable in `release/` folder.

#### macOS
```bash
npm run electron:build:mac
```
Creates DMG and ZIP in `release/` folder.

#### Linux
```bash
npm run electron:build:linux
```
Creates AppImage and DEB package in `release/` folder.

#### All Platforms
```bash
npm run electron:build
```

## Environment Variables (Optional)

Create a `.env` file in the root directory for optional configuration:

```env
# GitHub token for higher API rate limits (optional)
VITE_GITHUB_TOKEN=your_github_token_here
```

## Usage

### First-Time Setup

1. On first launch, you'll be guided through an onboarding wizard
2. Select your preferred data sources (Hugging Face, Artificial Analysis, etc.)
3. Configure API keys for LLM providers (optional, for validation features)
4. Start your first sync to populate the database

### Syncing Models

- Click the **Sync** button in the header to sync from all enabled sources
- Configure sync settings by clicking the settings icon
- Enable auto-refresh for periodic background syncing

### Validating Models

- Select models and click **Validate** to use AI to enrich metadata
- Validation can fill in missing fields like release dates, parameters, and descriptions
- Requires at least one LLM provider API key configured

### API Configuration

Navigate to **Settings > API Configuration** to set up:

- **Anthropic**: Claude models for validation
- **OpenAI**: GPT models for validation
- **Google**: Gemini models for validation
- **DeepSeek**: DeepSeek models for validation

API keys are encrypted before being stored locally.

## Development

### Available Scripts

```bash
# Start Electron app in development mode
npm run electron:dev

# Start web dev server only
npm run dev

# Build for production
npm run build

# Build Electron installers
npm run electron:build

# Preview production build (web)
npm run preview

# Run linting
npm run lint

# Type checking
npm run tsc
```

### Project Structure

```
├── electron/               # Electron main process
│   ├── main.js             # Main process entry point
│   └── preload.js          # Preload script for IPC
├── public/                 # Static assets
│   ├── favicon.svg         # App favicon
│   └── icon.svg            # App icon
├── src/
│   ├── components/         # React components
│   │   ├── settings/       # Settings panel components
│   │   └── ...
│   ├── context/            # React context providers
│   │   ├── ThemeContext.tsx     # Theme management
│   │   └── SettingsContext.tsx  # App settings
│   ├── hooks/              # Custom React hooks
│   ├── services/           # API and data services
│   │   ├── api/            # Provider-specific API calls
│   │   │   ├── fetchers/   # Data source fetchers
│   │   │   ├── providers/  # LLM provider integrations
│   │   │   └── enrichment/ # Data enrichment services
│   │   ├── syncService.ts  # Model synchronization
│   │   └── validationService.ts
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Utility functions
│       └── electron.ts     # Electron API utilities
├── release/                # Built installers (generated)
└── dist/                   # Production build (generated)
```

## Tech Stack

- **Electron** - Desktop application framework
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **Lucide React** - Icons
- **XLSX** - Excel import/export
- **electron-builder** - Installer creation

## License

MIT License - See LICENSE file for details.

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

---

Built with ❤️ for the AI community
