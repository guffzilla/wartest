# 📁 Quick Folder Overview

## 🎯 **Main Apps**
```
wartest/                    # Project root
├── WCArenaGameScanner/     # WC Arena Scanner (main app)
│   ├── src/                # Frontend code
│   ├── wc-arena-scanner-backend/  # Rust backend
│   ├── package.json        # Dependencies
│   └── [build files]

├── map-extraction/         # Map Extraction Tool
│   ├── src/                # Frontend code  
│   ├── map-extraction-backend/ # Rust backend
│   ├── package.json        # Dependencies
│   └── [build files]
```

## 🤖 **Research Labs**
```
WC2Lab/                     # WC2 Research & Development Lab
├── headless_wc2/           # Advanced headless implementation
├── custom_wc2_build/       # Game modification research
├── analysis/               # Analysis tools
├── data/                   # Research data
├── logs/                   # Log files
├── output/                 # Analysis outputs
├── tools/                  # Research utilities
└── [docs & config]         # Lab documentation
```

## 🛠️ **Development Tools**
```
tools/
├── WC1/                    # Warcraft I tools
├── WC2/                    # Warcraft II tools  
├── WC3/                    # Warcraft III tools
├── test-tools/             # Testing utilities
├── wartest-extractor/      # Asset extraction
└── oldTauriReference/      # Legacy examples
```

## 📚 **Documentation**
```
[Root level .md files]
├── PROJECT_APPS_OVERVIEW.md
├── CURRENT_STATUS.md
├── MAP_EXTRACTION_IMPLEMENTATION_PLAN.md
├── AI_GAME_ANALYTICS_PLAN.md
└── [10+ other planning docs]
```

## 🎮 **Game Data**
```
games/                      # Warcraft installations
ExtractedAssets/            # Extracted game assets
output/                     # Generated outputs
shared/                     # Shared libraries
```

## 📦 **Build Files**
```
target/                     # Rust builds
node_modules/               # Node.js deps
dist/                       # Frontend builds
[config files]
```

## 🚀 **Launch Commands**
```bash
# WC Arena Scanner
cd WCArenaGameScanner && npm run tauri dev

# Map Extraction Tool  
cd map-extraction && npm run tauri dev

# WC2 Lab (Headless Research)
cd WC2Lab/headless_wc2 && cargo run
```
