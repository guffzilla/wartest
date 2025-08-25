# 📁 Directory Tree with Summaries

```
wartest/                                    # 🎯 Main Project Root
│
├── 📱 WC Arena Scanner (Main App)
│   ├── src/                               # Frontend (Svelte + TypeScript)
│   ├── wc-arena-scanner-backend/          # Rust backend (renamed from src-tauri)
│   ├── package.json                       # Frontend dependencies
│   ├── vite.config.ts                     # Vite configuration
│   ├── tsconfig.json                      # TypeScript configuration
│   ├── svelte.config.js                   # Svelte configuration
│   └── README.md                          # Main project documentation
│
├── 🗺️ Map Extraction Tool (Separate App)
│   ├── src/                               # Frontend (Svelte + TypeScript)
│   ├── map-extraction-backend/            # Rust backend (renamed from src-tauri)
│   ├── package.json                       # Frontend dependencies
│   ├── vite.config.ts                     # Vite configuration
│   ├── tsconfig.json                      # TypeScript configuration
│   └── README.md                          # Map extraction documentation
│
├── 📚 Documentation & Planning
│   ├── PROJECT_APPS_OVERVIEW.md           # App overview and launch commands
│   ├── PROJECT_STRUCTURE_SUMMARY.md       # Structure summary
│   ├── COMPLETE_PROJECT_STRUCTURE_TREE.md # Detailed tree view
│   ├── MAP_EXTRACTION_IMPLEMENTATION_PLAN.md
│   ├── AI_GAME_ANALYTICS_PLAN.md
│   ├── PHASE_2_IMPLEMENTATION_PLAN.md
│   ├── PROJECT_ARCHITECTURE.md
│   ├── CURRENT_STATUS.md
│   ├── MIGRATION_GUIDE.md
│   └── MULTIPLAYER_ANALYSIS.md
│
├── 🎮 Game Data & Assets
│   ├── games/                             # Warcraft game installations
│   ├── ExtractedAssets/                   # Extracted game assets
│   │   ├── images/                        # Extracted images
│   │   ├── sounds/                        # Extracted sounds
│   │   ├── data/                          # Extracted data files
│   │   └── maps/                          # Extracted maps
│   └── output/                            # Generated outputs
│
├── 🤖 Headless WC2 Lab (Advanced Research)
│   ├── headlessgames/
│   │   └── wc2-remastered-lab/
│   │       ├── headless_wc2/              # Headless game control
│   │       ├── custom_wc2_build/          # Game modification research
│   │       ├── analysis/                  # Game analysis tools
│   │       ├── data/                      # Analysis data
│   │       ├── logs/                      # Log files
│   │       ├── output/                    # Analysis outputs
│   │       ├── tools/                     # Research utilities
│   │       ├── Cargo.toml                 # Dependencies
│   │       ├── CURRENT_STATUS.md          # Current status
│   │       ├── HEADLESS_VERSION_PLAN.md   # Headless version plan
│   │       ├── PHASE_2_IMPLEMENTATION_PLAN.md
│   │       ├── README.md                  # Documentation
│   │       ├── TESTING_GUIDE.md           # Testing guide
│   │       ├── TESTING_STATUS.md          # Testing status
│   │       └── test_ai_agent.rs           # AI agent tests
│   │
│   └── headless_wc2/                      # Legacy headless WC2
│       ├── src/                           # Source code
│       ├── Cargo.toml                     # Dependencies
│       └── target/                        # Build outputs
│
├── 🛠️ Development Tools
│   ├── tools/                             # Various development tools
│   │   ├── oldTauriReference/            # Legacy Tauri reference
│   │   ├── README.md                      # Tools documentation
│   │   ├── test-tools/                    # Testing utilities
│   │   ├── wartest-extractor/            # Asset extraction tools
│   │   ├── WC1/                          # Warcraft I tools
│   │   │   ├── asset-extractor/          # Asset extraction
│   │   │   ├── game-analyzer/            # Game analysis
│   │   │   ├── multiplayer-monitor/      # Multiplayer monitoring
│   │   │   └── shared/                   # Shared libraries
│   │   ├── WC2/                          # Warcraft II tools
│   │   │   ├── asset-extractor/          # Asset extraction
│   │   │   ├── game-analyzer/            # Game analysis
│   │   │   ├── multiplayer-monitor/      # Multiplayer monitoring
│   │   │   ├── replay-system/            # Replay system
│   │   │   ├── WC2WebAnalysis/           # WC2 web analysis
│   │   │   └── shared/                   # Shared libraries
│   │   ├── WC3/                          # Warcraft III tools
│   │   │   ├── asset-extractor/          # Asset extraction
│   │   │   ├── champions-analysis/        # Champions analysis
│   │   │   ├── game-analyzer/            # Game analysis
│   │   │   ├── multiplayer-monitor/      # Multiplayer monitoring
│   │   │   └── shared/                   # Shared libraries
│   │   └── shared/                       # Common libraries
│   │       ├── ai/                       # AI components
│   │       ├── core/                     # Core functionality
│   │       ├── database/                 # Database components
│   │       └── utils/                    # Utility functions
│
├── 📦 Build & Configuration
│   ├── target/                           # Rust build outputs
│   ├── node_modules/                     # Node.js dependencies
│   ├── dist/                             # Frontend build outputs
│   ├── .gitignore                        # Git ignore rules
│   ├── Cargo.lock                        # Rust dependency lock
│   ├── Cargo.toml                        # Root Rust dependencies
│   ├── package-lock.json                 # Node.js dependency lock
│   ├── package.json                      # Root package configuration
│   ├── vite.config.ts                    # Vite configuration
│   ├── tsconfig.json                     # TypeScript configuration
│   ├── tsconfig.node.json                # Node TypeScript config
│   ├── svelte.config.js                  # Svelte configuration
│   └── index.html                        # HTML entry point
│
└── 📄 Configuration & Data Files
    ├── config_analysis.json              # Configuration analysis
    ├── game_results_test.json            # Test game results
    ├── multiplayer_data_test.json        # Test multiplayer data
    └── ...                               # Other configuration files
```

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

## 🚀 **Launch Commands**

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
