# WC2 Unified

A modern, unified Tauri + Svelte application for managing Warcraft II games across different versions and editions.

## Features

- 🎮 **Multi-Version Support**: Manage Warcraft I, II, and III installations
- 🏆 **WCArena Integration**: Built-in support for competitive gaming platform
- 🌙 **Dark Mode**: Professional dark theme with golden accents
- 📱 **Responsive Design**: Works on desktop and mobile devices
- ⚡ **Fast & Lightweight**: Built with Tauri for native performance
- 🔍 **Game Detection**: Automatic scanning and detection of installed games

## Tech Stack

- **Frontend**: Svelte 5 + TypeScript
- **Backend**: Rust + Tauri 2.0
- **Styling**: CSS with modern animations and gradients
- **Build Tool**: Vite

## Development

### Prerequisites

- Node.js 18+ 
- Rust 1.70+
- Tauri CLI 2.0+

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run in development mode:
   ```bash
   npm run tauri dev
   ```

3. Build for production:
   ```bash
   npm run tauri build
   ```

## Project Structure

```
src/
├── components/          # Svelte components
│   ├── TabManager.svelte
│   └── GameScanner.svelte
├── stores/             # Svelte stores
│   └── gameStore.ts
├── App.svelte          # Main app component
├── main.ts             # Entry point
└── app.css             # Global styles

src-tauri/              # Rust backend
├── src/
│   └── main.rs         # Tauri commands
├── Cargo.toml          # Rust dependencies
└── tauri.conf.json     # Tauri configuration
```

## Game Support

### Warcraft II
- **Remastered**: Latest Battle.net version
- **Combat Edition**: Classic Windows version
- **Battle.net Edition**: Online multiplayer version
- **DOS Versions**: Legacy editions

### Future Support
- Warcraft I management
- Warcraft III integration
- WCArena platform features

## Contributing

This project is part of the larger WC2 ecosystem. Contributions are welcome!

## License

Private project - All rights reserved.
