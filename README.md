<p align="center">
  <img src="public/icons/png/512x512.png" alt="AI Model DB Pro" width="128" height="128">
</p>

<h1 align="center">AI Model DB Pro</h1>

<p align="center">
  <strong>The ultimate desktop app for tracking, managing, and validating AI models</strong>
</p>

<p align="center">
  <a href="https://github.com/Jeremy8776/AIModelDB/releases/latest">
    <img src="https://img.shields.io/github/v/release/Jeremy8776/AIModelDB?style=for-the-badge&logo=github&color=7c3aed" alt="Latest Release">
  </a>
  <a href="https://github.com/Jeremy8776/AIModelDB/releases">
    <img src="https://img.shields.io/github/downloads/Jeremy8776/AIModelDB/total?style=for-the-badge&logo=github&color=22c55e" alt="Downloads">
  </a>
  <a href="https://github.com/Jeremy8776/AIModelDB/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/Jeremy8776/AIModelDB?style=for-the-badge&color=3b82f6" alt="License">
  </a>
</p>

---

## 📥 Download

<table>
  <tr>
    <th>Platform</th>
    <th>Download</th>
    <th>Type</th>
  </tr>
  <tr>
    <td>🪟 <strong>Windows</strong></td>
    <td><a href="https://github.com/Jeremy8776/AIModelDB/releases/latest/download/AI-Model-DB-Pro-Setup-0.3.2.exe">AI-Model-DB-Pro-Setup.exe</a></td>
    <td>Installer (Recommended)</td>
  </tr>
  <tr>
    <td>🍎 <strong>macOS</strong></td>
    <td><a href="https://github.com/Jeremy8776/AIModelDB/releases/latest/download/AI-Model-DB-Pro-0.3.2-arm64.dmg">AI-Model-DB-Pro.dmg</a></td>
    <td>Disk Image (Apple Silicon)</td>
  </tr>
  <tr>
    <td>🐧 <strong>Linux</strong></td>
    <td><a href="https://github.com/Jeremy8776/AIModelDB/releases/latest/download/AI-Model-DB-Pro-0.3.2.AppImage">AI-Model-DB-Pro.AppImage</a></td>
    <td>AppImage (Portable)</td>
  </tr>
</table>

> **Note:** Windows may show a SmartScreen warning for unsigned apps. Click "More info" → "Run anyway" to proceed.

---

## ✨ Features

<table>
  <tr>
    <td width="50%">
      <h3>🗃️ Multi-Source Database</h3>
      <p>Aggregate AI models from Hugging Face, Civitai, TensorArt, Roboflow, Kaggle, and more into one unified database.</p>
    </td>
    <td width="50%">
      <h3>🤖 LLM-Powered Validation</h3>
      <p>Use AI (OpenAI, Anthropic, Google, DeepSeek) to validate and enrich model metadata automatically.</p>
    </td>
  </tr>
  <tr>
    <td>
      <h3>🔄 Auto-Updates</h3>
      <p>Built-in update notifications with one-click download and install. Never miss a new version.</p>
    </td>
    <td>
      <h3>🔍 Advanced Filtering</h3>
      <p>Filter by domain (LLM, ImageGen, Audio, etc.), license type, commercial usage, tags, and more.</p>
    </td>
  </tr>
  <tr>
    <td>
      <h3>🎨 Beautiful UI</h3>
      <p>Sleek dark mode by default with customizable themes. Built for power users who care about aesthetics.</p>
    </td>
    <td>
      <h3>🔐 Secure Storage</h3>
      <p>All API keys are encrypted locally. Your credentials never leave your machine.</p>
    </td>
  </tr>
</table>

---

## 📸 Screenshots

<!-- Add your screenshots here -->
<p align="center">
  <img src="docs/screenshots/main-view.png" alt="Main View" width="800">
  <br>
  <em>Main database view with model cards</em>
</p>

<p align="center">
  <img src="docs/screenshots/settings.png" alt="Settings" width="800">
  <br>
  <em>Settings panel with API configuration</em>
</p>

<p align="center">
  <img src="docs/screenshots/sync.png" alt="Sync Progress" width="800">
  <br>
  <em>Real-time sync from multiple sources</em>
</p>

---

## 🚀 Quick Start

### First Launch

1. **Download** the installer for your platform above
2. **Install** and launch AI Model DB Pro
3. **Complete** the onboarding wizard to select data sources
4. **Configure** API keys (optional, for AI validation)
5. **Sync** to populate your database!

### Data Sources

Enable any of these sources in Settings:
- **Hugging Face** - 10,000+ open-source models
- **Civitai** - Image generation models & LoRAs  
- **TensorArt** - Creative AI models
- **Roboflow** - Computer vision models
- **Kaggle** - ML competition models
- **OpenModelDB** - Upscaler models
- **And more...**

---

## 🛠️ Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
# Clone the repository
git clone https://github.com/Jeremy8776/AIModelDB.git
cd AIModelDB

# Install dependencies
npm install

# Run in development mode
npm run electron:dev
```

### Build Installers

```bash
# Windows
npm run electron:build:win

# macOS  
npm run electron:build:mac

# Linux
npm run electron:build:linux

# All platforms
npm run electron:build
```

---

## 📦 Tech Stack

| Technology | Purpose |
|------------|---------|
| **Electron** | Desktop application framework |
| **React 18** | UI framework |
| **TypeScript** | Type safety |
| **Vite** | Build tool |
| **TailwindCSS** | Styling |
| **electron-updater** | Auto-updates |
| **electron-builder** | Installer creation |

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

---

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

---

<p align="center">
  Built with ❤️ for the AI community
  <br><br>
  <a href="https://github.com/Jeremy8776/AIModelDB/issues">Report Bug</a>
  ·
  <a href="https://github.com/Jeremy8776/AIModelDB/issues">Request Feature</a>
  ·
  <a href="https://github.com/Jeremy8776/AIModelDB/releases">Changelog</a>
</p>
