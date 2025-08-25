# 📁 WC Arena Project - Folder Structure Summary

## 🎯 **Main Applications**

### **📱 WC Arena Scanner** (Root Level)
- **Purpose**: Game scanning, management, headless WC2 control
- **Frontend**: `src/` (Svelte + TypeScript)
- **Backend**: `wc-arena-scanner-backend/` (Rust)
- **Config**: `package.json`, `vite.config.ts`, `tauri.conf.json`

### **🗺️ Map Extraction Tool** 
- **Location**: `map-extraction/`
- **Purpose**: Warcraft II map analysis and visualization
- **Frontend**: `src/` (Svelte + TypeScript)
- **Backend**: `map-extraction-backend/` (Rust)
- **Config**: `package.json`, `vite.config.ts`, `tauri.conf.json`

---

## 🤖 **Research & Development**

### **Headless WC2 Lab**
- **Location**: `headlessgames/wc2-remastered-lab/`
- **Components**:
  - `headless_wc2/` - Headless game control system
  - `custom_wc2_build/` - Game modification research
  - `analysis/`, `data/`, `logs/`, `output/` - Research data
  - `tools/` - Analysis utilities

### **Legacy Headless WC2**
- **Location**: `headless_wc2/`
- **Purpose**: Original headless implementation

---

## 🛠️ **Development Tools**

### **Tools Directory** (`tools/`)
- `oldTauriReference/` - Legacy Tauri examples
- `test-tools/` - Testing utilities
- `wartest-extractor/` - Asset extraction tools
- `WC1/`, `WC2/`, `WC3/` - Game-specific tool suites
- `shared/` - Common libraries (AI, Core, Database, Utils)

### **Shared Libraries** (`shared/`)
- `ai/` - AI components and pattern recognition
- `core/` - Core functionality and memory hooks
- `database/` - Database components
- `utils/` - Utility functions and file operations

---

## 🎮 **Game Data & Assets**

### **Game Installations**
- `games/` - Warcraft game installations
- `ExtractedAssets/` - Extracted game assets (images, sounds, data, maps)
- `output/` - Generated outputs and analysis results

---

## 📚 **Documentation & Planning**

### **Root Level Documentation**
- `PROJECT_APPS_OVERVIEW.md` - App overview and launch commands
- `PROJECT_STRUCTURE_SUMMARY.md` - Structure summary
- `COMPLETE_PROJECT_STRUCTURE_TREE.md` - Detailed tree view
- `MAP_EXTRACTION_IMPLEMENTATION_PLAN.md` - Map extraction planning
- `AI_GAME_ANALYTICS_PLAN.md` - AI analytics planning
- `PHASE_2_IMPLEMENTATION_PLAN.md` - Phase 2 planning
- `PROJECT_ARCHITECTURE.md` - Architecture documentation
- `CURRENT_STATUS.md` - Current project status
- `MIGRATION_GUIDE.md` - Migration instructions
- `MULTIPLAYER_ANALYSIS.md` - Multiplayer analysis

---

## 📦 **Build & Configuration**

### **Root Level Build Files**
- `target/` - Rust build outputs
- `node_modules/` - Node.js dependencies
- `dist/` - Frontend build outputs
- `Cargo.toml`, `package.json` - Root dependencies
- `vite.config.ts`, `tsconfig.json` - Build configuration
- `index.html` - HTML entry point

---

## 🎯 **Key Organizational Patterns**

### **✅ Well Organized**
- **Clear Separation**: Main apps vs research vs tools
- **Descriptive Names**: Backend folders renamed from generic `src-tauri`
- **Modular Design**: Shared libraries for common functionality
- **Comprehensive Documentation**: Multiple planning documents
- **Game-Specific Tools**: Dedicated suites for WC1, WC2, WC3

### **🤔 Potential Improvements**
- **Documentation Location**: Consider moving docs to `docs/` folder
- **Tool Consolidation**: Some tools could be consolidated
- **Asset Organization**: Consider subfolders for different asset types
- **Build Outputs**: Consider moving `target/`, `node_modules/`, `dist/` to `.gitignore`

---

## 🚀 **Quick Launch Reference**

```bash
# WC Arena Scanner
cd wartest && npm run tauri dev

# Map Extraction Tool  
cd wartest/map-extraction && npm run tauri dev

# Headless WC2 Lab
cd wartest/headlessgames/wc2-remastered-lab/headless_wc2 && cargo run
```

---

## 📊 **Structure Statistics**

- **Total Applications**: 2 Tauri apps
- **Total Research Projects**: 3+ labs
- **Total Tool Suites**: 3 (WC1, WC2, WC3)
- **Total Shared Libraries**: 4
- **Total Documentation Files**: 10+
- **Total Game Support**: All Warcraft games
