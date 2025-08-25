# 🎯 WC Arena Project - Apps Overview

## 📱 **Available Tauri Applications**

### 1. **WC Arena Scanner** (Main App)
**Location**: `wartest/WCArenaGameScanner/`  
**Purpose**: Game scanning, management, and headless WC2 control  
**Window Title**: "WC Arena Scanner - Warcraft Game Management"  
**Launch Command**: 
```bash
cd wartest/WCArenaGameScanner
npm run tauri dev
```

**Features**:
- 🎮 Warcraft game detection and scanning
- 📁 Game folder management
- 🤖 Headless WC2 control
- 📊 Game analytics and monitoring
- 🔧 Process management

---

### 2. **WC Arena Map Extractor** (Separate App)
**Location**: `wartest/WCArenaMapExtractor/`  
**Purpose**: Warcraft II map analysis and visualization  
**Window Title**: "🗺️ WC Arena Map Extractor - Warcraft II"  
**Launch Command**: 
```bash
cd wartest/WCArenaMapExtractor
npm run tauri dev
```

**Features**:
- 🗺️ Map file parsing (.w2m, .w2x)
- 📊 Resource analysis (goldmines, wood, oil)
- 🎨 Interactive map visualization
- 📈 Strategic analysis
- 💾 Export capabilities

---

## 🚀 **Quick Launch Reference**

### **WC Arena Scanner**
```bash
cd wartest/WCArenaGameScanner
npm run tauri dev
```

### **WC Arena Map Extractor**
```bash
cd wartest/WCArenaMapExtractor
npm run tauri dev
```

### **WC2 AI Lab (AI Research)**
```bash
cd wartest/WC2Lab/WC2AI
cargo run
```

---

## 📁 **Project Structure**

```
wartest/                                    # 🎯 Main Project Root
├── WCArenaGameScanner/                     # 📱 WC Arena Scanner (Main App)
│   ├── src/                               # Frontend (Svelte + TypeScript)
│   ├── wc-arena-scanner-backend/          # Rust Backend
│   ├── package.json                       # Frontend dependencies
│   ├── vite.config.ts                     # Vite configuration
│   ├── tsconfig.json                      # TypeScript configuration
│   ├── svelte.config.js                   # Svelte configuration
│   └── index.html                         # HTML entry point
│
├── WCArenaMapExtractor/                   # 🗺️ WC Arena Map Extractor
│   ├── src/                               # Frontend (Svelte + TypeScript)
│   ├── map-extraction-backend/            # Rust Backend
│   ├── package.json                       # Frontend dependencies
│   └── ...                                # Build configuration
│
├── WC2Lab/                                # 🤖 WC2 Research & Development Lab
│   ├── WC2AI/                             # Advanced AI implementation
│   ├── custom_wc2_build/                  # Game modification research
│   ├── analysis/                          # Analysis tools
│   ├── data/                              # Research data
│   ├── logs/                              # Log files
│   ├── output/                            # Analysis outputs
│   ├── tools/                             # Research utilities
│   └── [Documentation & Planning]         # Lab documentation
│
├── tools/                                 # 🛠️ Development Tools
├── shared/                                # 📚 Shared Libraries
├── games/                                 # 🎮 Game Data
├── ExtractedAssets/                       # 📦 Extracted Assets
└── [Documentation Files]                  # 📄 Planning & Docs
```

---

## 🎯 **Key Changes**

- **WC Arena Scanner** moved to `WCArenaGameScanner/` folder
- **Legacy headless project** completely removed
- **Advanced WC2 Lab** moved to `WC2Lab/` (cleaner structure)
- **Clear separation** between applications, research, and tools
- **Updated launch commands** reflect new folder structure
- **Maintained functionality** - all features remain the same
