# WC Arena Core

**Unified Warcraft Management Center**

A comprehensive desktop application built with Tauri and Svelte for managing Warcraft I, II, and III installations, assets, and gameplay features.

## 🎮 Features

### Multi-Game Support
- **Warcraft I**: Campaign management, asset extraction, sprite management
- **Warcraft II**: Multiplayer support, replay analysis, map editing
- **Warcraft III**: Custom maps, Battle.net integration, World Editor support

### Core Functionality
- **Game Detection**: Automatic scanning for installed Warcraft games
- **Process Monitoring**: Real-time tracking of running game instances
- **Asset Management**: Cross-game asset organization and management
- **Performance Monitoring**: System resource tracking and optimization

### Advanced Features
- **Replay Analysis**: Advanced replay viewing and analysis tools
- **Asset Extraction**: Extract and manage game assets (maps, sprites, sounds)
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

### Frontend (Svelte)
- **Components**: Modular UI components for each game type
- **Stores**: Centralized state management with Svelte stores
- **Routing**: Tab-based navigation between game types
- **Styling**: Modern, responsive design with CSS animations

### Backend (Rust/Tauri)
- **Game Detection**: Process monitoring and file system scanning
- **Asset Management**: File operations and asset extraction
- **Performance Monitoring**: System resource tracking
- **Cross-Platform Support**: Windows-focused with extensibility

### Game-Specific Modules
- **WC1**: Asset extraction, campaign management
- **WC2**: Replay system, multiplayer support, map editing
- **WC3**: Custom map management, Battle.net integration

## 📁 Project Structure

```
wartest/
├── src/                    # Svelte frontend
│   ├── components/        # UI components
│   ├── stores/           # State management
│   └── App.svelte        # Main application
├── src-tauri/            # Rust backend
│   ├── src/main.rs       # Main backend logic
│   └── Cargo.toml        # Rust dependencies
├── games/                # Game-specific modules
│   ├── WC1/             # Warcraft I tools
│   ├── WC2/             # Warcraft II tools
│   └── WC3/             # Warcraft III tools
└── shared/               # Shared utilities
```

## 🔧 Configuration

### Game Detection
The application automatically scans for:
- Warcraft I installations (Original, Remastered)
- Warcraft II installations (Remastered, Combat, Battle.net, DOS)
- Warcraft III installations (Reforged, Frozen Throne, Reign of Chaos)

### Asset Management
- **Maps**: Custom and campaign maps
- **Sprites**: Unit and building graphics
- **Sounds**: Music and sound effects
- **Campaigns**: Story missions and custom campaigns

## 🎯 Roadmap

### Phase 1: Core Infrastructure ✅
- [x] Unified application structure
- [x] Multi-game support framework
- [x] Basic game detection
- [x] Process monitoring

### Phase 2: Game Management 🚧
- [ ] Advanced game scanning
- [ ] Asset extraction tools
- [ ] Game launching functionality
- [ ] Performance monitoring

### Phase 3: Advanced Features 📋
- [ ] Replay analysis system
- [ ] Map editing tools
- [ ] Multiplayer management
- [ ] Cross-game asset sharing

### Phase 4: Integration & Polish 📋
- [ ] Battle.net integration
- [ ] Community features
- [ ] Performance optimization
- [ ] User experience improvements

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
