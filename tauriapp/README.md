# WCArena Monitor

A Tauri-based desktop application for detecting and managing Warcraft game installations, with support for game monitoring and WCArena integration.

## Features

- **Automatic Game Detection**: Scans for Warcraft I, II, and III installations across multiple launchers
- **Multi-Launcher Support**: Battle.net, Steam, GOG Galaxy, Epic Games, and manual installations
- **Game Management**: Locate, add, and manage game installations
- **Map Folder Access**: Quick access to game map folders
- **WCArena Integration**: Direct access to WCArena platform
- **Cross-Platform**: Windows, macOS, and Linux support

## Recent Changes

### Removed Hardcoded Data
- ✅ Removed hardcoded user paths (`C:\\Users\\garet\\...`)
- ✅ Removed mock data from frontend JavaScript
- ✅ Implemented dynamic content generation
- ✅ Added proper fallback paths for common installations

### Implemented Missing Features
- ✅ Added proper folder dialog functionality
- ✅ Implemented external URL opening
- ✅ Added folder scanning for manual game additions
- ✅ Enhanced error handling and user notifications

### Configuration Improvements
- ✅ Added proper Tauri features (`fs-all`, `shell-open`, `dialog-open`)
- ✅ Configured file system permissions
- ✅ Added proper plugin configuration

## Installation

### Prerequisites
- [Rust](https://rustup.rs/) (1.77.2 or later)
- [Node.js](https://nodejs.org/) (18 or later)
- [Tauri CLI](https://tauri.app/v2/guides/getting-started/setup/)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd tauriapp
   ```

2. **Install Tauri CLI** (if not already installed)
   ```bash
   cargo install tauri-cli
   ```

3. **Run in development mode**
   ```bash
   # Windows
   dev.bat
   
   # Or manually
   cargo tauri dev
   ```

4. **Build for production**
   ```bash
   # Windows
   build.bat
   
   # Or manually
   cargo tauri build
   ```

## Usage

### Automatic Game Detection
1. Launch the application
2. The app will automatically scan for installed Warcraft games
3. Found games will be displayed with their installation paths
4. Use the "Locate" button to re-scan for specific game types

### Manual Game Addition
1. Click "Add Manually" for any game type
2. Use the folder picker to select your game installation directory
3. The app will scan the selected folder for Warcraft executables
4. Found games will be added to the detection list

### Accessing Map Folders
1. For detected games, click the "Maps" button
2. The app will search for map folders in the game installation
3. Map folder paths will be displayed in notifications

### WCArena Integration
1. Switch to the "WCArena" tab
2. Toggle between "App Mode" and "Browser Mode"
3. Click "Launch WCArena" to open the platform

## Architecture

### Backend (Rust)
- **`main.rs`**: Tauri commands and application entry point
- **`platform.rs`**: Game detection and platform-specific logic
- **`types.rs`**: Data structures and type definitions
- **`game_monitor.rs`**: Game process monitoring (future feature)
- **`server_client.rs`**: Server communication (future feature)

### Frontend (HTML/JavaScript)
- **`index.html`**: Main application interface
- **Dynamic Content**: All game data is generated from backend detection
- **Responsive Design**: Works on different screen sizes

## Game Detection Logic

The app detects games through multiple methods:

1. **Registry Scanning** (Windows)
   - Battle.net installations
   - Steam installations
   - GOG Galaxy installations

2. **Common Path Scanning**
   - Program Files directories
   - User directories
   - Common game installation paths

3. **Executable Search**
   - Recursive search across all drives
   - Looks for Warcraft executables

4. **Manual Folder Selection**
   - User-selected directories
   - Deep scanning of selected folders

## Supported Game Versions

### Warcraft I
- Warcraft I: Orcs & Humans (DOS)
- Warcraft I: Remastered

### Warcraft II
- Warcraft II: Tides of Darkness (DOS)
- Warcraft II: Beyond the Dark Portal (DOS)
- Warcraft II: Battle.net Edition
- Warcraft II: Combat Edition
- Warcraft II: Remastered

### Warcraft III
- Warcraft III: Reign of Chaos
- Warcraft III: The Frozen Throne
- Warcraft III: Reforged
- W3Arena (W3Champions)

## Troubleshooting

### Common Issues

1. **No games detected**
   - Ensure games are properly installed
   - Try manual folder selection
   - Check if games are in common installation paths

2. **Permission errors**
   - Run as administrator (Windows)
   - Check file system permissions
   - Ensure Tauri has proper access rights

3. **Build errors**
   - Update Rust: `rustup update`
   - Update Tauri CLI: `cargo install tauri-cli --force`
   - Clear build cache: `cargo clean`

### Debug Mode
Run with debug logging:
```bash
RUST_LOG=debug cargo tauri dev
```

## Development

### Project Structure
```
tauriapp/
├── src-tauri/          # Rust backend
│   ├── src/
│   │   ├── main.rs     # Tauri commands
│   │   ├── platform.rs # Game detection
│   │   ├── types.rs    # Data structures
│   │   └── ...
│   ├── Cargo.toml      # Rust dependencies
│   └── tauri.conf.json # Tauri configuration
├── index.html          # Frontend interface
├── build.bat          # Build script
├── dev.bat            # Development script
└── README.md          # This file
```

### Adding New Features
1. Add Rust functions in `src-tauri/src/`
2. Register commands in `main.rs`
3. Update frontend JavaScript in `index.html`
4. Test thoroughly before committing

## License

[Add your license information here]

## Contributing

[Add contribution guidelines here]
