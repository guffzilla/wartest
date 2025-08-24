# 🏗️ Warcraft Game Analysis System - Project Architecture

## **📋 Project Overview**
This is a comprehensive, enterprise-grade system for analyzing and managing Warcraft I, II, and III games. The system is designed to be modular, scalable, and future-proof, with support for local game analysis, multiplayer monitoring, and AI-powered insights.

## **🎯 Long-Term Vision**
- **Local Game Analysis**: Analyze game data, replays, and gameplay metrics
- **Multiplayer Monitoring**: Track and analyze multiplayer games across all three Warcraft titles
- **AI Integration**: Machine learning models for pattern recognition and game analysis
- **Tauri Desktop App**: Cross-platform application integrating all functionality ✅
- **Database Integration**: PostgreSQL backend with Rust/Actix/SQLx framework
- **Cloud Deployment**: Scalable architecture for future cloud-based features

## **📁 Current Project Structure**

```
wartest/
├── **🎮 GAMES/**                    # Game-specific projects 🚧
│   ├── WC1/                        # Warcraft I projects
│   │   ├── game-analyzer/           # WC1 game analysis
│   │   ├── multiplayer-monitor/     # WC1 multiplayer monitoring
│   │   └── shared/                  # WC1 shared utilities
│   │
│   ├── WC2/                        # Warcraft II projects
│   │   ├── game-analyzer/           # WC2 game analysis
│   │   ├── multiplayer-monitor/     # WC2 multiplayer monitoring
│   │   ├── replay-system/           # WC2 replay analysis & viewer
│   │   └── shared/                  # WC2 shared utilities
│   │
│   └── WC3/                        # Warcraft III projects
│       ├── game-analyzer/           # WC3 game analysis
│       ├── multiplayer-monitor/     # WC3 multiplayer monitoring
│       ├── champions-analysis/      # W3Champions integration analysis
│       └── shared/                  # WC3 shared utilities
│
├── **🖥️ MAIN APP/**                 # Main Tauri application ✅
│   └── src-tauri/                  # Main Tauri application
│       ├── src/main.rs             # Core game detection and management
│       └── Cargo.toml              # Rust dependencies
│
├── **🔧 SHARED/**                    # Shared libraries and utilities 🚧
│   ├── core/                       # Core game engine functionality
│   │   ├── game-engine/            # Game engine abstractions
│   │   ├── process-monitor/        # Process monitoring utilities
│   │   └── memory-hooks/           # Memory hooking and injection
│   │
│   ├── utils/                      # Common utilities
│   │   ├── file-ops/               # File operations
│   │   ├── binary-parser/          # Binary file parsing
│   │   └── game-utils/             # Game-specific utilities
│   │
│   ├── database/                   # Database layer
│   │   ├── schemas/                # Database schemas
│   │   └── migrations/             # Database migrations
│   │
│   └── ai/                         # AI and machine learning
│       ├── game-analysis/          # Game analysis AI models
│       └── pattern-recognition/    # Pattern recognition utilities
│
├── **🎨 FRONTEND/**                  # Svelte frontend ✅
│   ├── src/                        # Svelte source code
│   │   ├── components/             # UI components
│   │   ├── stores/                 # State management
│   │   └── App.svelte              # Main application
│   └── package.json                # Node.js dependencies
│
├── **🛠️ LOCAL TOOLS/**               # Local development tools (personal use) 🚧
│   ├── asset-extractors/           # Asset extraction tools (local only)
│   ├── analysis-tools/             # Game analysis tools (local only)
│   └── research-tools/             # Research and development tools
│
├── **📚 DOCUMENTATION/**            # Project documentation ✅
│   ├── PROJECT_ARCHITECTURE.md     # This file
│   ├── MIGRATION_GUIDE.md          # Migration guide from old structure
│   ├── MULTIPLAYER_ANALYSIS.md     # Multiplayer analysis documentation
│   └── README.md                   # Main project documentation
│
└── **📦 EXTRACTED ASSETS/**         # Local extracted assets (personal use)
    ├── WC1/                        # Warcraft I extracted assets
    ├── WC2/                        # Warcraft II extracted assets
    └── WC3/                        # Warcraft III extracted assets
```

## **🔄 Migration Status**

### **Phase 1: Structure Creation** ✅
- [x] Create new directory structure
- [x] Set up workspace configuration
- [x] Create project documentation
- [x] Implement core Tauri application
- [x] Implement Svelte frontend
- [x] Implement game detection and scanning

### **Phase 2: WC2 Replay System Migration** 🚧
- [x] Move `WC2Replays/` → `games/WC2/replay-system/`
- [ ] Refactor to use shared libraries
- [ ] Update dependencies and imports
- [ ] Integrate with main application

### **Phase 3: WC3 Champions Analysis Migration** 🚧
- [x] Move `W3ChampAnalysis/` → `games/WC3/champions-analysis/`
- [ ] Refactor to use shared libraries
- [ ] Update dependencies and imports
- [ ] Integrate with main application

### **Phase 4: WC2 Multiplayer Monitor Migration** 🚧
- [x] Move root `src/` multiplayer code → `games/WC2/multiplayer-monitor/`
- [ ] Refactor to use shared libraries
- [ ] Update dependencies and imports
- [ ] Integrate with main application

### **Phase 5: WC1 Projects Migration** 🚧
- [x] Move WC1 code → `games/WC1/` (excluding asset extraction)
- [ ] Refactor to use shared libraries
- [ ] Update dependencies and imports
- [ ] Integrate with main application

### **Phase 6: Tauri App Integration** ✅
- [x] Main Tauri application implemented
- [x] Game detection and scanning working
- [x] Game launching functionality
- [x] Process monitoring
- [x] Enhanced UI with scan controls

### **Phase 7: Shared Libraries Development** 🚧
- [x] Basic structure created
- [ ] Implement core game engine abstractions
- [ ] Create common utilities
- [ ] Set up database layer
- [ ] Develop AI integration framework

### **Phase 8: Local Tools Organization** 🚧
- [x] Asset extraction tools moved to local tools directory
- [x] Analysis tools organized for personal use
- [ ] Research tools organized and documented
- [ ] Clear separation from main application

## **🏗️ Current Implementation Status**

### **✅ Completed Features**
- **Core Tauri Application**: Fully functional with game detection
- **Game Scanning**: Multi-drive scanning with recursive directory search
- **Process Monitoring**: Real-time game process detection
- **Game Launching**: Direct game execution with working directory support
- **Enhanced UI**: Modern Svelte interface with scan controls
- **Game Type Detection**: Automatic detection of WC1, WC2, and WC3
- **Installation Type Detection**: Remastered, Battle.net, Combat, DOS, etc.
- **Maps Folder Detection**: Automatic discovery of game maps

### **🚧 In Progress**
- **Shared Libraries**: Basic structure created, needs implementation
- **Game Analysis**: Basic structure exists, needs content implementation
- **Local Tools**: Asset extraction and analysis tools for personal use

### **📋 Planned Features**
- **Replay Analysis**: WC2 replay system integration
- **Multiplayer Monitoring**: Real-time game monitoring
- **AI Integration**: Pattern recognition and game analysis
- **Database Integration**: Game data persistence
- **Cloud Features**: Online multiplayer and community features

## **🏗️ Architecture Benefits**

### **Modularity**
- Each game type is self-contained
- Shared libraries prevent code duplication
- Local tools separate from main application
- Easy to add new games or features

### **Scalability**
- Workspace-based build system
- Conditional compilation for specific features
- Database-ready for future cloud deployment
- Local development tools don't affect main app

### **Maintainability**
- Clear separation of concerns
- Consistent project structure
- Shared testing and documentation
- Local tools for research and development

### **Future-Proofing**
- AI integration ready
- Database integration ready
- Cloud deployment ready
- Easy to add new Warcraft titles

## **🚀 Next Steps**
1. **Complete Phase 2**: Migrate WC2 Replay System
2. **Set up shared libraries**: Start with core utilities
3. **Begin Tauri integration**: Start incorporating game functionality
4. **Database preparation**: Set up schemas for future integration
5. **Organize local tools**: Complete separation of development tools

## **📝 Development Guidelines**
- Use workspace dependencies for consistency
- Implement shared traits for common functionality
- Write comprehensive tests for shared libraries
- Document all public APIs
- Use semantic versioning for releases
- Keep local tools separate from main application

## **🔧 Current Technical Stack**

### **Backend (Rust/Tauri)**
- **Tauri**: 2.0.0 for desktop application framework
- **Serde**: Serialization and deserialization
- **Sysinfo**: System monitoring and process management
- **Tokio**: Async runtime for concurrent operations
- **Glob**: File pattern matching for game detection

### **Frontend (Svelte)**
- **Svelte**: 4.2.7 for reactive UI components
- **TypeScript**: 5.0.2 for type safety
- **Vite**: 4.5.0 for build tooling
- **Tauri API**: 2.0.0 for backend communication

### **Shared Libraries**
- **Core**: Game engine abstractions and process monitoring
- **Utils**: File operations and binary parsing
- **Database**: Future database integration
- **AI**: Future machine learning integration

### **Local Development Tools**
- **Asset Extractors**: For personal research and development
- **Analysis Tools**: Game data analysis and research
- **Research Tools**: Development and testing utilities
