# 🌳 Complete WC Arena Project Structure Tree

```
wartest/                                    # 🎯 Main Project Root
│
├── 📱 WC Arena Scanner (Main App)
│   ├── src/                               # Frontend (Svelte + TypeScript)
│   │   ├── App.svelte                     # Main application component
│   │   ├── main.ts                        # Application entry point
│   │   ├── app.css                        # Global styles
│   │   ├── components/                    # UI components
│   │   │   ├── Dashboard.svelte           # Main dashboard
│   │   │   ├── GameScanner.svelte         # Game scanning interface
│   │   │   └── TabManager.svelte          # Tab management
│   │   ├── stores/                        # State management
│   │   │   └── gameStore.ts               # Game state store
│   │   ├── utils/                         # Utility functions
│   │   │   ├── gameUtils.ts               # Game-related utilities
│   │   │   └── systemUtils.ts             # System utilities
│   │   ├── asset_extractors/              # Asset extraction modules
│   │   │   ├── data_extractor.rs          # Data extraction
│   │   │   ├── image_extractor.rs         # Image extraction
│   │   │   ├── sound_extractor.rs         # Sound extraction
│   │   │   └── mod.rs                     # Module definitions
│   │   ├── file_parsers/                  # File parsing modules
│   │   │   ├── bin_parser.rs              # Binary file parser
│   │   │   ├── grp_parser.rs              # GRP file parser
│   │   │   ├── idx_parser.rs              # IDX file parser
│   │   │   ├── json_parser.rs             # JSON parser
│   │   │   └── mod.rs                     # Module definitions
│   │   ├── game_analysis/                 # Game analysis modules
│   │   │   ├── campaign_analyzer.rs       # Campaign analysis
│   │   │   ├── map_analyzer.rs            # Map analysis
│   │   │   ├── unit_analyzer.rs           # Unit analysis
│   │   │   └── mod.rs                     # Module definitions
│   │   ├── game_result_monitor.rs         # Game result monitoring
│   │   ├── multiplayer_monitor.rs         # Multiplayer monitoring
│   │   ├── wc1_extractor.rs               # Warcraft I extractor
│   │   ├── wc2_extractor.rs               # Warcraft II extractor
│   │   └── web_analyzer.rs                # Web analysis
│   │
│   ├── wc-arena-scanner-backend/          # Rust Backend (renamed from src-tauri)
│   │   ├── src/                           # Rust source code
│   │   │   ├── main.rs                    # Main entry point
│   │   │   ├── lib.rs                     # Library definitions
│   │   │   └── ...                        # Other Rust modules
│   │   ├── Cargo.toml                     # Rust dependencies
│   │   ├── tauri.conf.json                # Tauri configuration
│   │   └── build.rs                       # Build script
│   │
│   ├── package.json                       # Frontend dependencies
│   ├── vite.config.ts                     # Vite configuration
│   ├── tsconfig.json                      # TypeScript configuration
│   ├── svelte.config.js                   # Svelte configuration
│   └── README.md                          # Main project documentation
│
├── 🗺️ Map Extraction Tool (Separate App)
│   ├── src/                               # Frontend (Svelte + TypeScript)
│   │   ├── App.svelte                     # Map extraction interface
│   │   ├── main.ts                        # Application entry point
│   │   └── ...                            # Map analysis components
│   │
│   ├── map-extraction-backend/            # Rust Backend (renamed from src-tauri)
│   │   ├── src/                           # Rust source code
│   │   │   ├── main.rs                    # Main entry point
│   │   │   ├── lib.rs                     # Library definitions
│   │   │   └── ...                        # Map parsing modules
│   │   ├── Cargo.toml                     # Rust dependencies
│   │   ├── tauri.conf.json                # Tauri configuration
│   │   └── build.rs                       # Build script
│   │
│   ├── package.json                       # Frontend dependencies
│   ├── vite.config.ts                     # Vite configuration
│   ├── tsconfig.json                      # TypeScript configuration
│   └── README.md                          # Map extraction documentation
│
├── 📚 Documentation & Planning
│   ├── PROJECT_APPS_OVERVIEW.md           # App overview and launch commands
│   ├── PROJECT_STRUCTURE_SUMMARY.md       # Structure summary
│   ├── COMPLETE_PROJECT_STRUCTURE_TREE.md # This file
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
│   │   ├── Warcraft I: Remastered/
│   │   ├── Warcraft II Remastered/
│   │   ├── Warcraft III/
│   │   └── Warcraft Orcs & Humans/
│   │
│   ├── ExtractedAssets/                   # Extracted game assets
│   │   ├── images/                        # Extracted images
│   │   ├── sounds/                        # Extracted sounds
│   │   ├── data/                          # Extracted data files
│   │   └── maps/                          # Extracted maps
│   │
│   └── output/                            # Generated outputs
│       └── wc2-lab-1756088251/
│           └── laboratory_config.json
│
├── 🤖 Headless WC2 Lab (Advanced Research)
│   ├── headlessgames/
│   │   └── wc2-remastered-lab/
│   │       ├── headless_wc2/              # Headless game control
│   │       │   ├── src/                   # Rust source code
│   │       │   │   ├── main.rs            # Main entry point
│   │       │   │   ├── lib.rs             # Library definitions
│   │       │   │   ├── game_engine.rs     # Game engine logic
│   │       │   │   ├── ai_controller.rs   # AI control system
│   │       │   │   ├── memory_hooks.rs    # Memory hooking
│   │       │   │   ├── function_hooks.rs  # Function hooking
│   │       │   │   ├── input_simulator.rs # Input simulation
│   │       │   │   ├── data_exporter.rs   # Data export
│   │       │   │   ├── replay_system.rs   # Replay system
│   │       │   │   └── test.rs            # Test modules
│   │       │   ├── Cargo.toml             # Rust dependencies
│   │       │   └── target/                # Build outputs
│   │       │
│   │       ├── custom_wc2_build/          # Custom game modifications
│   │       │   ├── analysis_report.md     # Analysis report
│   │       │   ├── original_files/        # Original game files
│   │       │   ├── QUICK_START_ANALYSIS.md
│   │       │   ├── tools/                 # Analysis tools
│   │       │   │   ├── analyze_wc2.idc    # IDA script
│   │       │   │   ├── analyze_wc2.py     # Python analysis
│   │       │   │   ├── build.bat          # Build script
│   │       │   │   ├── CMakeLists.txt     # CMake configuration
│   │       │   │   ├── modification_plan.md
│   │       │   │   └── start_analysis.bat
│   │       │   └── ...                    # Other build files
│   │       │
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
│       │   ├── main.rs                    # Main entry point
│       │   ├── lib.rs                     # Library definitions
│       │   ├── game_engine.rs             # Game engine
│       │   ├── ai_controller.rs           # AI controller
│       │   ├── data_exporter.rs           # Data exporter
│       │   ├── function_hooks.rs          # Function hooks
│       │   ├── memory_hooks.rs            # Memory hooks
│       │   ├── replay_system.rs           # Replay system
│       │   └── test.rs                    # Tests
│       ├── Cargo.toml                     # Dependencies
│       └── target/                        # Build outputs
│
├── 🛠️ Development Tools
│   ├── tools/                             # Various development tools
│   │   ├── oldTauriReference/            # Legacy Tauri reference
│   │   │   ├── tauri.conf.json           # Tauri configuration
│   │   │   ├── wartest-monitor/          # Monitor tool
│   │   │   │   └── src-tauri/
│   │   │   │       └── target/           # Build outputs
│   │   │   └── wcacore/                  # Core components
│   │   │       ├── README.md             # Documentation
│   │   │       ├── src/                  # Source code
│   │   │       │   ├── assets/           # Assets
│   │   │       │   │   ├── javascript.svg
│   │   │       │   │   └── tauri.svg
│   │   │       │   ├── index.html        # HTML entry
│   │   │       │   ├── main.js           # Main JavaScript
│   │   │       │   └── styles.css        # Styles
│   │   │       └── src-tauri/            # Tauri backend
│   │   │           ├── build.rs          # Build script
│   │   │           ├── Cargo.toml        # Dependencies
│   │   │           ├── gen/              # Generated files
│   │   │           ├── icons/            # App icons
│   │   │           │   ├── 128x128.png
│   │   │           │   ├── 128x128@2x.png
│   │   │           │   ├── 32x32.png
│   │   │           │   ├── icon.icns
│   │   │           │   ├── icon.ico
│   │   │           │   ├── icon.png
│   │   │           │   ├── Square107x107Logo.png
│   │   │           │   ├── Square142x142Logo.png
│   │   │           │   ├── Square150x150Logo.png
│   │   │           │   ├── Square284x284Logo.png
│   │   │           │   ├── Square30x30Logo.png
│   │   │           │   ├── Square310x310Logo.png
│   │   │           │   ├── Square44x44Logo.png
│   │   │           │   ├── Square71x71Logo.png
│   │   │           │   ├── Square89x89Logo.png
│   │   │           │   └── StoreLogo.png
│   │   │           ├── src/              # Source code
│   │   │           │   ├── game_manager.rs
│   │   │           │   ├── lib.rs
│   │   │           │   └── main.rs
│   │   │           └── tauri.conf.json   # Configuration
│   │   │
│   │   ├── README.md                      # Tools documentation
│   │   │
│   │   ├── test-tools/                    # Testing utilities
│   │   │   ├── test_detection.rs         # Detection tests
│   │   │   ├── test_game_detection.rs    # Game detection tests
│   │   │   └── test_wc1.rs               # WC1 tests
│   │   │
│   │   ├── wartest-extractor/            # Asset extraction tools
│   │   │   ├── Cargo.toml                # Dependencies
│   │   │   ├── README.md                 # Documentation
│   │   │   └── src/                      # Source code
│   │   │       ├── asset_extractors/     # Asset extractors
│   │   │       │   ├── data_extractor.rs
│   │   │       │   ├── image_extractor.rs
│   │   │       │   ├── mod.rs
│   │   │       │   └── sound_extractor.rs
│   │   │       ├── file_parsers/         # File parsers
│   │   │       │   ├── bin_parser.rs
│   │   │       │   ├── grp_parser.rs
│   │   │       │   ├── idx_parser.rs
│   │   │       │   ├── json_parser.rs
│   │   │       │   └── mod.rs
│   │   │       ├── game_analysis/        # Game analysis
│   │   │       │   ├── campaign_analyzer.rs
│   │   │       │   ├── map_analyzer.rs
│   │   │       │   ├── mod.rs
│   │   │       │   └── unit_analyzer.rs
│   │   │       ├── game_result_monitor.rs
│   │   │       ├── main.rs
│   │   │       ├── multiplayer_monitor.rs
│   │   │       ├── utils/                # Utilities
│   │   │       │   ├── file_utils.rs
│   │   │       │   └── mod.rs
│   │   │       ├── wc1_extractor.rs
│   │   │       ├── wc2_extractor.rs
│   │   │       └── web_analyzer.rs
│   │   │
│   │   ├── WC1/                          # Warcraft I tools
│   │   │   ├── asset-extractor/          # Asset extraction
│   │   │   │   ├── Cargo.toml
│   │   │   │   └── src/
│   │   │   │       ├── extractor.rs
│   │   │   │       ├── formats.rs
│   │   │   │       ├── lib.rs
│   │   │   │       ├── main.rs
│   │   │   │       ├── utils.rs
│   │   │   │       └── wc1_extractor.rs
│   │   │   ├── game-analyzer/            # Game analysis
│   │   │   │   ├── Cargo.toml
│   │   │   │   └── src/
│   │   │   │       ├── analyzer.rs
│   │   │   │       ├── game_data.rs
│   │   │   │       ├── lib.rs
│   │   │   │       └── utils.rs
│   │   │   ├── multiplayer-monitor/      # Multiplayer monitoring
│   │   │   │   └── Cargo.toml
│   │   │   └── shared/                   # Shared libraries
│   │   │       ├── Cargo.toml
│   │   │       └── src/
│   │   │           ├── asset_utils.rs
│   │   │           ├── data_utils.rs
│   │   │           ├── game_utils.rs
│   │   │           └── lib.rs
│   │   │
│   │   ├── WC2/                          # Warcraft II tools
│   │   │   ├── asset-extractor/          # Asset extraction
│   │   │   │   ├── Cargo.toml
│   │   │   │   └── src/
│   │   │   │       ├── extractor.rs
│   │   │   │       ├── formats.rs
│   │   │   │       ├── lib.rs
│   │   │   │       └── utils.rs
│   │   │   ├── game-analyzer/            # Game analysis
│   │   │   │   ├── Cargo.toml
│   │   │   │   └── src/
│   │   │   │       ├── analyzer.rs
│   │   │   │       ├── game_data.rs
│   │   │   │       ├── lib.rs
│   │   │   │       └── utils.rs
│   │   │   ├── multiplayer-monitor/      # Multiplayer monitoring
│   │   │   │   ├── Cargo.toml
│   │   │   │   └── src/
│   │   │   │       ├── game_result_monitor.rs
│   │   │   │       ├── lib.rs
│   │   │   │       ├── main.rs
│   │   │   │       └── multiplayer_monitor.rs
│   │   │   ├── replay-system/            # Replay system
│   │   │   │   ├── Cargo.toml
│   │   │   │   ├── sample_replays/       # Sample replays
│   │   │   │   │   └── README.md
│   │   │   │   ├── src/                  # Source code
│   │   │   │   │   ├── analyzer.rs       # Replay analyzer
│   │   │   │   │   ├── bin/              # Binary tools
│   │   │   │   │   │   ├── generate_samples.rs
│   │   │   │   │   │   └── viewer.rs
│   │   │   │   │   ├── decoder/          # Replay decoder
│   │   │   │   │   │   ├── events.rs
│   │   │   │   │   │   ├── game_state.rs
│   │   │   │   │   │   ├── mod.rs
│   │   │   │   │   │   └── parser.rs
│   │   │   │   │   ├── emulator/         # Game emulator
│   │   │   │   │   │   ├── assets.rs
│   │   │   │   │   │   ├── game_engine.rs
│   │   │   │   │   │   ├── mod.rs
│   │   │   │   │   │   ├── playback.rs
│   │   │   │   │   │   └── renderer.rs
│   │   │   │   │   ├── lib.rs
│   │   │   │   │   ├── main.rs
│   │   │   │   │   ├── structures.rs
│   │   │   │   │   └── viewer/           # Replay viewer
│   │   │   │   │       ├── mod.rs
│   │   │   │   │       ├── replay_player.rs
│   │   │   │   │       ├── ui_components.rs
│   │   │   │   │       └── viewer_app.rs
│   │   │   │   └── WC2Replays/           # WC2 replay analysis
│   │   │   │       ├── analysis/         # Analysis results
│   │   │   │       │   └── real_game_analysis.md
│   │   │   │       ├── Cargo.toml
│   │   │   │       └── src/              # Source code
│   │   │   │           ├── analyzer.rs
│   │   │   │           ├── bin/          # Binary tools
│   │   │   │           │   └── viewer.rs
│   │   │   │           ├── decoder/      # Decoder modules
│   │   │   │           │   ├── events.rs
│   │   │   │           │   ├── game_state.rs
│   │   │   │           │   ├── mod.rs
│   │   │   │           │   └── parser.rs
│   │   │   │           ├── lib.rs
│   │   │   │           ├── main.rs
│   │   │   │           ├── structures.rs
│   │   │   │           └── viewer/       # Viewer components
│   │   │   │               ├── mod.rs
│   │   │   │               ├── replay_player.rs
│   │   │   │               ├── ui_components.rs
│   │   │   │               └── viewer_app.rs
│   │   │   └── shared/                   # Shared libraries
│   │   │       ├── Cargo.toml
│   │   │       └── src/
│   │   │           ├── asset_utils.rs
│   │   │           ├── data_utils.rs
│   │   │           ├── game_utils.rs
│   │   │           └── lib.rs
│   │   │
│   │   ├── WC2WebAnalysis/               # WC2 web analysis
│   │   │   └── web_analysis/             # Web analysis tools
│   │   │       ├── reports/              # Analysis reports
│   │   │       │   ├── summary.txt
│   │   │       │   └── web_pages.json
│   │   │       └── ...                   # Other analysis files
│   │   │
│   │   └── WC3/                          # Warcraft III tools
│   │       ├── asset-extractor/          # Asset extraction
│   │       │   ├── Cargo.toml
│   │       │   └── src/
│   │       │       ├── extractor.rs
│   │       │       ├── formats.rs
│   │       │       ├── lib.rs
│   │       │       └── utils.rs
│   │       ├── champions-analysis/        # Champions analysis
│   │       │   ├── analysis/             # Analysis results
│   │       │   │   ├── executable/       # Executable analysis
│   │       │   │   │   └── technology_analysis.md
│   │       │   │   └── integration/      # Integration analysis
│   │       │   │       └── detailed_analysis.md
│   │       │   ├── Cargo.toml
│   │       │   ├── FINAL_SUMMARY.md
│   │       │   ├── README.md
│   │       │   ├── reports/              # Reports
│   │       │   │   └── initial_analysis_report.md
│   │       │   ├── SUMMARY.md
│   │       │   └── tools/                # Analysis tools
│   │       │       ├── network_analyzer.py
│   │       │       ├── pe_analyzer.py
│   │       │       ├── requirements.txt
│   │       │       └── rust_integration/ # Rust integration
│   │       │           ├── Cargo.toml
│   │       │           ├── README.md
│   │       │           └── src/
│   │       │               ├── communication.rs
│   │       │               ├── data_structures.rs
│   │       │               ├── hooking.rs
│   │       │               ├── injection.rs
│   │       │               ├── lib.rs
│   │       │               ├── memory.rs
│   │       │               ├── stealth.rs
│   │       │               └── utils.rs
│   │       ├── game-analyzer/            # Game analysis
│   │       │   ├── Cargo.toml
│   │       │   └── src/
│   │       │       ├── analyzer.rs
│   │       │       ├── game_data.rs
│   │       │       ├── lib.rs
│   │       │       └── utils.rs
│   │       ├── multiplayer-monitor/      # Multiplayer monitoring
│   │       │   └── Cargo.toml
│   │       └── shared/                   # Shared libraries
│   │           ├── Cargo.toml
│   │           └── src/
│   │               ├── asset_utils.rs
│   │               ├── data_utils.rs
│   │               ├── game_utils.rs
│   │               └── lib.rs
│   │
│   └── shared/                           # Shared libraries
│       ├── ai/                           # AI components
│       │   ├── Cargo.toml
│       │   └── src/
│       │       ├── game_analysis.rs
│       │       ├── lib.rs
│       │       └── pattern_recognition.rs
│       ├── core/                         # Core functionality
│       │   ├── Cargo.toml
│       │   └── src/
│       │       ├── game_engine.rs
│       │       ├── lib.rs
│       │       ├── memory_hooks.rs
│       │       └── process_monitor.rs
│       ├── database/                     # Database components
│       │   └── Cargo.toml
│       └── utils/                        # Utility functions
│           ├── Cargo.toml
│           └── src/
│               ├── asset_extraction.rs
│               ├── binary_parser.rs
│               ├── file_ops.rs
│               └── lib.rs
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

## 🎯 **Key Project Components**

### **📱 Main Applications**
1. **WC Arena Scanner** - Game management and headless control
2. **Map Extraction Tool** - Map analysis and visualization

### **🤖 Research & Development**
1. **Headless WC2 Lab** - Advanced headless game research
2. **Custom WC2 Build** - Game modification research
3. **Multiple Tool Suites** - WC1, WC2, WC3 specialized tools

### **🛠️ Development Infrastructure**
1. **Shared Libraries** - Common functionality across projects
2. **Build Systems** - Rust, Node.js, and Tauri configurations
3. **Documentation** - Comprehensive planning and status docs

### **🎮 Game Support**
- **Warcraft I** - Original and Remastered versions
- **Warcraft II** - Original, BNE, and Remastered versions  
- **Warcraft III** - Original and Champions versions

---

## 📊 **Project Statistics**

- **Total Applications**: 2 main Tauri apps
- **Total Research Projects**: 3+ specialized labs
- **Total Tool Suites**: 3 (WC1, WC2, WC3)
- **Total Shared Libraries**: 4 (AI, Core, Database, Utils)
- **Total Documentation Files**: 10+ planning documents
- **Total Game Support**: All Warcraft games (WC1, WC2, WC3)
- **Total Build Systems**: Rust, Node.js, Tauri, Vite, Svelte

---

## 🚀 **Launch Commands**

### **WC Arena Scanner**
```bash
cd wartest
npm run tauri dev
```

### **Map Extraction Tool**
```bash
cd wartest/map-extraction
npm run tauri dev
```

### **Headless WC2 Lab**
```bash
cd wartest/headlessgames/wc2-remastered-lab/headless_wc2
cargo run
```

---

## 🎯 **Project Goals**

1. **Comprehensive Warcraft Support** - All games and versions
2. **Advanced Research Tools** - Headless control and analysis
3. **User-Friendly Applications** - Desktop apps for game management
4. **Extensible Architecture** - Modular design for future expansion
5. **Professional Documentation** - Complete planning and implementation guides
