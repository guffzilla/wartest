# 🎮 Wartest Monitor

A modern desktop application for monitoring Warcraft II Remastered multiplayer games and tracking game results.

## 📋 Overview

Wartest Monitor is a Tauri-based desktop application that automatically detects and monitors Warcraft II Remastered multiplayer games. It captures detailed game information including:

- **Player statistics** (units trained, destroyed, resources gathered)
- **Game outcomes** (victory/defeat, winning teams)
- **Map information** (name, size, terrain, resources)
- **Game settings** (speed, resources, population limits)
- **Team compositions** and rankings

## ✨ Features

### 🎯 Core Monitoring
- **Automatic game detection** - Detects when Warcraft II Remastered starts/stops
- **Real-time monitoring** - Tracks game progress and player statistics
- **Cross-platform support** - Windows (native), Linux/macOS (via Wine)
- **Background operation** - Runs silently in the background

### 📊 Data Collection
- **Comprehensive statistics** - Units, buildings, resources, scores
- **Player information** - Names, factions, teams, ranks
- **Game context** - Maps, settings, victory conditions
- **Team analysis** - Aggregated team statistics and outcomes

### 🌐 Server Integration
- **Automatic uploads** - Send results to your game server
- **User authentication** - Secure API key management
- **Batch processing** - Upload multiple games at once
- **Offline support** - Store results locally when offline

### 🖥️ Modern UI
- **Real-time dashboard** - Live monitoring status and current game info
- **Game history** - Browse and analyze past games
- **Responsive design** - Works on desktop and mobile
- **Dark theme** - Easy on the eyes during long gaming sessions

## 🚀 Installation

### Prerequisites
- **Windows 10/11** (recommended for native support)
- **Warcraft II Remastered** installed
- **Internet connection** (for server uploads)

### Download
1. Download the latest release from the [Releases page](https://github.com/guffzilla/wartest/releases)
2. Extract the ZIP file
3. Run `wartest-monitor.exe`

### Development Setup
```bash
# Clone the repository
git clone https://github.com/guffzilla/wartest.git
cd wartest/wartest-monitor

# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

## 🎮 Usage

### First Time Setup
1. **Launch the app** - Double-click `wartest-monitor.exe`
2. **Check compatibility** - The app will detect your platform and game installation
3. **Configure server** (optional) - Enter your game server URL and API key
4. **Start monitoring** - Click "Start Monitoring" to begin

### Monitoring Games
1. **Start Warcraft II Remastered** - Launch the game normally
2. **Join a multiplayer game** - The app will automatically detect the game
3. **Play normally** - The app runs in the background
4. **View results** - Check the dashboard for real-time game information
5. **Upload results** - Click "Upload Results" to send data to your server

### Dashboard Features
- **Platform Status** - Shows your operating system and compatibility
- **Game Detection** - Indicates if Warcraft II is installed and running
- **Monitoring Status** - Shows if the app is actively monitoring
- **Current Game** - Displays information about the active game
- **Game History** - Lists all monitored games with outcomes

## 🔧 Configuration

### Server Settings
```json
{
  "server_url": "https://your-game-server.com",
  "api_key": "your-secret-api-key",
  "auto_upload": true
}
```

### Game Detection Paths
The app automatically searches for Warcraft II Remastered in common locations:

**Windows:**
- `C:\Program Files (x86)\Warcraft II Remastered`
- `C:\Program Files\Warcraft II Remastered`
- `C:\Games\Warcraft II Remastered`

**Linux (Wine):**
- `~/.steam/steam/steamapps/common/Warcraft II`
- `/usr/local/games/warcraft2`

**macOS (Wine):**
- `/Applications/Warcraft II Remastered.app`

## 📊 Data Format

### Game Result Structure
```json
{
  "game_id": "game_1234567890",
  "timestamp": 1234567890,
  "map_info": {
    "name": "Forest of Shadows",
    "size": "256x256",
    "terrain_type": "Forest",
    "starting_resources": {
      "starting_gold": 1000,
      "starting_lumber": 500,
      "starting_oil": 0
    }
  },
  "players": [
    {
      "name": "Player1",
      "faction": "Human",
      "team": 1,
      "rank": "Knight",
      "statistics": {
        "units_trained": 45,
        "units_destroyed": 25,
        "gold_mined": 5000
      }
    }
  ],
  "game_outcome": {
    "Victory": {
      "winning_team": 1,
      "winner_names": ["Player1", "Player2"]
    }
  }
}
```

## 🌐 Server API

### Endpoints
- `POST /api/game-results` - Upload single game result
- `POST /api/game-results/batch` - Upload multiple game results
- `GET /api/user/game-history` - Get user's game history
- `GET /api/global-stats` - Get global statistics
- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration

### Authentication
Use Bearer token authentication:
```
Authorization: Bearer your-api-key
```

## 🔒 Privacy & Security

- **Local storage** - Game results stored locally in `game_results.json`
- **Secure uploads** - HTTPS encryption for all server communication
- **No personal data** - Only game statistics are collected
- **User control** - Users can disable monitoring or server uploads

## 🛠️ Development

### Project Structure
```
wartest-monitor/
├── src-tauri/          # Rust backend
│   ├── src/
│   │   ├── lib.rs      # Main library
│   │   ├── types.rs    # Data structures
│   │   ├── platform.rs # Cross-platform detection
│   │   ├── game_monitor.rs # Game monitoring logic
│   │   └── server_client.rs # HTTP client
│   └── Cargo.toml      # Rust dependencies
├── index.html          # Frontend UI
└── README.md           # This file
```

### Building
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Tauri CLI
cargo install tauri-cli

# Build the app
cargo tauri build
```

### Testing
```bash
# Run tests
cargo test

# Run in development mode
cargo tauri dev
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Blizzard Entertainment** - For creating Warcraft II
- **Tauri** - For the excellent desktop app framework
- **Rust community** - For the amazing ecosystem

## 📞 Support

- **Issues** - [GitHub Issues](https://github.com/guffzilla/wartest/issues)
- **Discussions** - [GitHub Discussions](https://github.com/guffzilla/wartest/discussions)
- **Email** - [Contact](mailto:support@wartest.com)

---

**Happy gaming! 🎮**
