# WC Arena Core

**Unified Warcraft Management Center**

A comprehensive desktop application built with Tauri and Svelte for managing Warcraft I, II, and III installations and gameplay features.

## 🎮 Features

### Multi-Game Support
- **Warcraft I**: Campaign management and game launching
- **Warcraft II**: Multiplayer support and game management
- **Warcraft III**: Custom maps and game management

### Core Functionality ✅
- **Game Detection**: Automatic scanning for installed Warcraft games across all drives
- **Process Monitoring**: Real-time tracking of running game instances
- **Game Management**: Launch and manage Warcraft games
- **Performance Monitoring**: System resource tracking and optimization

### Advanced Features 🚧
- **Replay Analysis**: Advanced replay viewing and analysis tools
- **Multiplayer Support**: LAN and online multiplayer management
- **Cross-Game Integration**: Unified interface for all Warcraft versions

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Rust toolchain (latest stable)
- Windows 10/11 (primary target platform)

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd wartest

# Install dependencies
npm install

# Build and run
npm run tauri dev
```

### Development
```bash
# Start development server
npm run dev

# Build for production
npm run tauri build
```

## 🏗️ Architecture

### Frontend (Svelte) ✅
- **Components**: Modular UI components for each game type
- **Stores**: Centralized state management with Svelte stores
- **Routing**: Tab-based navigation between game types
- **Styling**: Modern, responsive design with CSS animations

### Backend (Rust/Tauri) ✅
- **Game Detection**: Process monitoring and file system scanning
- **Game Management**: Game launching and process management
- **Performance Monitoring**: System resource tracking
- **Cross-Platform Support**: Windows-focused with extensibility

### Game-Specific Modules 🚧
- **WC1**: Game management and launching
- **WC2**: Replay system, multiplayer support
- **WC3**: Custom map management

## 📁 Project Structure

```
wartest/
├── src/                    # Svelte frontend ✅
│   ├── components/        # UI components
│   ├── stores/           # State management
│   └── App.svelte        # Main application
├── src-tauri/            # Rust backend ✅
│   ├── src/main.rs       # Main backend logic
│   └── Cargo.toml        # Rust dependencies
├── games/                # Game-specific modules 🚧
│   ├── WC1/             # Warcraft I tools
│   ├── WC2/             # Warcraft II tools
│   └── WC3/             # Warcraft III tools
├── shared/               # Shared utilities 🚧
│   ├── core/            # Core game engine functionality
│   ├── utils/           # Common utilities
│   ├── database/        # Database layer
│   └── ai/              # AI and machine learning
├── tools/                # Local development tools (personal use)
│   ├── asset-extractors/ # Asset extraction tools (local only)
│   └── analysis-tools/   # Game analysis tools (local only)
└── ExtractedAssets/      # Local extracted assets (personal use)
```

## 🔧 Configuration

### Game Detection ✅
The application automatically scans for:
- Warcraft I installations (Original, Remastered)
- Warcraft II installations (Remastered, Combat, Battle.net, DOS)
- Warcraft III installations (Reforged, Frozen Throne, Reign of Chaos)

### Game Management ✅
- **Game Launching**: Direct game execution with proper working directory
- **Process Monitoring**: Real-time game status tracking
- **Installation Management**: Multiple installation type support
- **Maps Folder Detection**: Automatic discovery of game maps

## 🎯 Roadmap

### Phase 1: Core Infrastructure ✅
- [x] Unified application structure
- [x] Multi-game support framework
- [x] Basic game detection
- [x] Process monitoring
- [x] Game scanning and launching
- [x] Enhanced UI with scan controls

### Phase 2: Game Management 🚧
- [x] Advanced game scanning across drives
- [x] Game installation type detection
- [x] Maps folder detection
- [x] Game launching functionality
- [ ] Performance monitoring
- [ ] Game configuration management

### Phase 3: Advanced Features 📋
- [ ] Replay analysis system
- [ ] Multiplayer management
- [ ] Cross-game integration
- [ ] Game statistics and metrics

### Phase 4: Integration & Polish 📋
- [ ] Battle.net integration
- [ ] Community features
- [ ] Performance optimization
- [ ] User experience improvements

## 🔄 Recent Updates

### Latest Release (v0.1.0)
- **Enhanced Game Scanner**: Improved scanning controls and game detection
- **Better Game Management**: Enhanced game store functionality and data structures
- **Improved UI**: Better game installation sections and status indicators
- **Backend Improvements**: Enhanced game detection patterns and recursive scanning
- **Process Monitoring**: Better running game detection and management

### Technical Improvements
- **Recursive Game Detection**: Scans subdirectories for game installations
- **Enhanced Pattern Matching**: More comprehensive executable detection
- **Better Error Handling**: Improved error handling and user feedback
- **Performance Optimization**: Faster scanning and better resource management

## 🛠️ Local Development Tools

**Note**: The following tools are for local development and personal use only, not integrated into the main application:

- **Asset Extractors**: Tools for extracting game assets (sprites, sounds, maps)
- **Analysis Tools**: Game data analysis and research tools
- **Extracted Assets**: Local collection of game assets for development

These tools are separate from the main WC Arena Core application and are intended for developers and researchers only.

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines for:
- Code style and standards
- Testing requirements
- Pull request process
- Issue reporting

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Blizzard Entertainment for the Warcraft series
- Tauri team for the excellent desktop framework
- Svelte team for the reactive frontend framework
- Warcraft community for inspiration and feedback

---

**WC Arena Core** - Bringing all Warcraft games together in one unified experience.
