# Wartest - Warcraft I & II Game Analysis Tool

A powerful Rust-based system for analyzing Warcraft I and II game files, extracting assets, and parsing game data. This tool can handle both the original legacy formats and modern remastered versions.

## Features

### ✅ **Working Features**
- **File Scanning**: Scan game directories and identify supported file types
- **Sprite Extraction**: Extract Warcraft sprites from `.grp` files and convert to PNG
- **JSON Parsing**: Parse modern configuration files (strings, settings, etc.)
- **Binary Analysis**: Parse `.idx` and `.bin` files for game data
- **Progress Tracking**: Real-time progress bars for long operations
- **Error Handling**: Robust error handling with detailed logging

### 🚧 **Planned Features**
- **Audio Extraction**: Extract and convert game audio files
- **Memory Analysis**: Real-time game state monitoring
- **Web Integration**: Browser automation for modern remastered versions
- **Data Visualization**: GUI for browsing extracted assets
- **Game Replay Analysis**: Parse and analyze game replays

## Supported File Formats

| Format | Description | Status |
|--------|-------------|--------|
| `.grp` | Warcraft sprite files | ✅ Working |
| `.json` | Modern configuration files | ✅ Working |
| `.idx` | Index files | ✅ Working |
| `.bin` | Binary data files | ✅ Working |
| `.png` | Modern image files | ✅ Working |
| `.wav` | Audio files | 🚧 Planned |
| `.ogg` | Audio files | 🚧 Planned |

## Installation

### Prerequisites
- Rust 1.70+ (install from [rustup.rs](https://rustup.rs/))
- Windows (tested on Windows 10/11)

### Build
```bash
git clone https://github.com/guffzilla/wartest.git
cd wartest
cargo build --release
```

## Usage

### Command Line Interface

The tool provides a comprehensive CLI with multiple commands:

#### 1. Scan Directory
Scan a game directory to identify supported file types:
```bash
cargo run -- scan --path "games/Warcraft I Remastered/x86/data"
```

**Output:**
```
INFO  wartest: Directory scan results for: games/Warcraft I Remastered/x86/data
INFO  wartest: Total files: 716
INFO  wartest:   Grp: 91 files
INFO  wartest:   Bin: 87 files
INFO  wartest:   Json: 48 files
INFO  wartest:   Png: 63 files
INFO  wartest:   Ogg: 31 files
INFO  wartest:   Wav: 111 files
```

#### 2. Extract Sprites
Extract Warcraft sprites from `.grp` files and convert to PNG:
```bash
cargo run -- extract-sprites --path "games/Warcraft I Remastered/x86/data/art/unit/human" --output "extracted_sprites"
```

**Output:**
```
INFO  wartest: Extracting sprites from: games/Warcraft I Remastered/x86/data/art/unit/human
INFO  wartest: Extracted: extracted_sprites\catapult_sprite.png
INFO  wartest: Extracted: extracted_sprites\grunt_sprite.png
INFO  wartest: Extracted: extracted_sprites\knight_sprite.png
INFO  wartest: Extracted 8 sprites to extracted_sprites
```

#### 3. Parse Configuration
Parse JSON configuration files:
```bash
cargo run -- parse-config --path "games/Warcraft I Remastered/x86/data/strings/enUS.json" --output "config_analysis.json"
```

#### 4. Full Analysis
Analyze all supported files in a directory:
```bash
cargo run -- analyze --path "games/Warcraft I Remastered/x86/data" --output "analysis_output" --types "all"
```

## Project Structure

```
wartest/
├── src/
│   ├── main.rs                 # CLI application entry point
│   ├── file_parsers/           # File format parsers
│   │   ├── mod.rs             # Parser module definitions
│   │   ├── grp_parser.rs      # Warcraft sprite parser
│   │   ├── json_parser.rs     # JSON configuration parser
│   │   ├── idx_parser.rs      # Index file parser
│   │   └── bin_parser.rs      # Binary data parser
│   ├── asset_extractors/      # Asset extraction modules
│   │   ├── mod.rs
│   │   ├── image_extractor.rs
│   │   ├── sound_extractor.rs
│   │   └── data_extractor.rs
│   ├── game_analysis/         # Game analysis modules
│   │   ├── mod.rs
│   │   ├── unit_analyzer.rs
│   │   ├── map_analyzer.rs
│   │   └── campaign_analyzer.rs
│   └── utils/                 # Utility functions
│       ├── mod.rs
│       └── file_utils.rs
├── Cargo.toml                 # Rust dependencies
├── README.md                  # This file
└── .gitignore                # Git ignore rules
```

## Technical Details

### Architecture
- **Language**: Rust (for memory safety and performance)
- **Error Handling**: `anyhow` for robust error propagation
- **CLI**: `clap` for command-line argument parsing
- **Logging**: `tracing` for structured logging
- **Progress**: `indicatif` for progress bars
- **File I/O**: `memmap2` for efficient file reading

### File Format Support

#### GRP Files (Warcraft Sprites)
- **Format**: Legacy Warcraft sprite format
- **Features**: 
  - Header parsing (width, height, frame count)
  - Palette extraction (256 colors)
  - PNG conversion
  - Frame offset support

#### JSON Files (Modern Config)
- **Format**: Modern JSON configuration
- **Features**:
  - String localization parsing
  - Game configuration extraction
  - Flexible schema support

#### IDX Files (Index Files)
- **Format**: Binary index files
- **Features**:
  - Header validation
  - Entry parsing
  - Size-based filtering

#### BIN Files (Binary Data)
- **Format**: Binary data containers
- **Features**:
  - Section parsing
  - Pattern matching
  - Data extraction

## Development Status

### ✅ **Completed**
- [x] Project structure and CLI framework
- [x] GRP sprite extraction and PNG conversion
- [x] JSON configuration parsing
- [x] IDX and BIN file parsing
- [x] Directory scanning and file type detection
- [x] Progress tracking and error handling
- [x] Comprehensive logging

### 🚧 **In Progress**
- [ ] Audio file extraction (WAV/OGG)
- [ ] Memory analysis for running games
- [ ] Web integration for modern remasters

### 📋 **Planned**
- [ ] Real-time game state monitoring
- [ ] Web-based asset browser
- [ ] Game replay analysis
- [ ] Machine learning for strategy analysis
- [ ] Community features and sharing

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- **Blizzard Entertainment** for creating the Warcraft series
- **Rust Community** for excellent tooling and libraries
- **Open Source Community** for inspiration and collaboration

## Support

If you encounter any issues or have questions:
1. Check the existing issues on GitHub
2. Create a new issue with detailed information
3. Include game version, file paths, and error messages

---

**Note**: This tool is for educational and research purposes. Please respect Blizzard's intellectual property rights and terms of service.
