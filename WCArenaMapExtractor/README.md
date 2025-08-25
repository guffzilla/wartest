# 🗺️ WC Arena Map Extractor

**WC Arena Map Extractor - Warcraft II Map Analysis and Visualization Tool**

A Tauri-based desktop application for analyzing Warcraft II map files (.w2m, .w2x) with advanced visualization and resource analysis.

## 🎯 Features

- **Map File Parsing**: Extract data from Warcraft II map files
- **Resource Analysis**: Identify goldmines, wood, and oil deposits
- **Interactive Visualization**: View maps with resource overlays
- **Strategic Analysis**: Analyze map balance and strategic positions
- **Export Capabilities**: Generate analysis reports and images

## 🚀 Development

```bash
# Install dependencies
npm install

# Start development server
npm run tauri dev

# Build for production
npm run tauri build
```

## 📋 Supported Formats

- Warcraft II Maps (.w2m)
- Warcraft II Campaign Maps (.w2x)

## 🛠️ Technology Stack

- **Frontend**: Svelte + TypeScript
- **Backend**: Rust (Tauri)
- **Build Tool**: Vite
- **Platform**: Cross-platform desktop app

## 📁 Project Structure

```
WCArenaMapExtractor/
├── src/                    # Svelte frontend
├── map-extraction-backend/ # Rust backend
├── public/                # Static assets
└── README.md             # This file
```

---

**This is the WC Arena Map Extractor - NOT the main Warcraft II headless project!**
