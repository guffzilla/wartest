# 🧪 WC2 Remastered Headless Laboratory

A sophisticated laboratory environment for analyzing Warcraft II Remastered's internal structures, memory layouts, and game mechanics without requiring the game to be running.

## 🎯 Purpose

This laboratory is designed to:

1. **Extract Game Data Structures** - Understand how WC2 Remastered stores game state in memory
2. **Analyze Memory Patterns** - Identify recurring data structures and memory layouts
3. **Monitor Game Processes** - Track running WC2 Remastered instances and their memory usage
4. **Generate Replay Data** - Create replay files from captured game events
5. **Research Game Mechanics** - Understand unit behavior, resource management, and game flow

## 🏗️ Architecture

### Core Components

- **`Laboratory`** - Main coordinator that manages analysis sessions
- **`ProcessMonitor`** - Detects and monitors WC2 Remastered processes
- **`MemoryAnalyzer`** - Analyzes memory structures and patterns
- **`GameStateTracker`** - Tracks changes in game state over time
- **`EventRecorder`** - Records game events for replay generation
- **`Analysis`** - Performs data analysis and pattern recognition

### Data Flow

```
Process Detection → Memory Analysis → Game State Tracking → Event Recording → Analysis → Results
```

## 🚀 Getting Started

### Prerequisites

- Rust 1.70+ with Cargo
- Windows 10/11 (for Windows API access)
- WC2 Remastered installed (optional, for live analysis)

### Installation

1. **Clone the repository**
   ```bash
   cd headlessgames/wc2-remastered-lab
   ```

2. **Build the project**
   ```bash
   cargo build --release
   ```

3. **Run the laboratory**
   ```bash
   cargo run --release
   ```

### Configuration

The laboratory can be configured through environment variables:

```bash
# Enable debug logging
set RUST_LOG=debug

# Set output directory
set WC2_LAB_OUTPUT_DIR=C:\wc2_lab_output

# Enable specific analysis types
set WC2_LAB_ANALYSIS_TYPES=memory,patterns,events
```

## 📊 Laboratory Sessions

### Session Types

1. **Live Analysis** - Monitor running WC2 Remastered processes
2. **Memory Dump Analysis** - Analyze saved memory dumps
3. **Pattern Recognition** - Identify recurring data patterns
4. **Performance Profiling** - Monitor memory and CPU usage

### Output Structure

```
output/
├── wc2-lab-{timestamp}/
│   ├── laboratory_config.json      # Session configuration
│   ├── game_states.json           # Captured game states
│   ├── game_events.json           # Recorded game events
│   ├── analysis_results.json      # Analysis results
│   ├── session_summary.json       # Session summary
│   └── memory_dumps/              # Memory snapshots
```

## 🔬 Analysis Capabilities

### Memory Structure Analysis

- **Data Structure Identification** - Automatically identify game data structures
- **Memory Layout Mapping** - Map memory regions and their purposes
- **Pointer Relationship Analysis** - Understand data structure relationships
- **Type Inference** - Infer data types from memory patterns

### Game State Analysis

- **State Change Detection** - Track changes in game state
- **Resource Usage Patterns** - Analyze resource gathering and spending
- **Unit Behavior Patterns** - Understand unit movement and combat
- **Building Patterns** - Analyze construction and production

### Event Sequence Analysis

- **Event Correlation** - Find relationships between game events
- **Timing Patterns** - Analyze event timing and intervals
- **Player Behavior** - Understand player strategies and patterns
- **Replay Generation** - Create replay files from events

### Pattern Recognition

- **Memory Pattern Detection** - Identify recurring memory patterns
- **Behavior Pattern Recognition** - Recognize unit and player behaviors
- **Performance Pattern Analysis** - Identify performance bottlenecks
- **Anomaly Detection** - Find unusual game states or behaviors

## 🛠️ Development

### Adding New Analysis Types

1. **Define Analysis Structure**
   ```rust
   #[derive(Debug, Clone, Serialize, Deserialize)]
   pub struct CustomAnalysis {
       pub field1: String,
       pub field2: u32,
   }
   ```

2. **Implement Analysis Logic**
   ```rust
   pub async fn analyze_custom_data(data: &[GameState]) -> Result<CustomAnalysis> {
       // Analysis implementation
   }
   ```

3. **Register with Laboratory**
   ```rust
   laboratory.add_analysis_result(AnalysisResult {
       analysis_type: AnalysisType::Custom("Custom".to_string()),
       results: AnalysisData::Custom(/* ... */),
       // ... other fields
   });
   ```

### Extending Memory Signatures

Add new memory patterns to `MemoryAnalyzer::initialize_memory_signatures()`:

```rust
MemorySignature {
    name: "new_pattern".to_string(),
    pattern: vec![0x48, 0x45, 0x4C, 0x4C, 0x4F], // "HELLO"
    mask: vec![0xFF, 0xFF, 0xFF, 0xFF, 0xFF],
    offset: 0,
    description: "New pattern description".to_string(),
}
```

## 📈 Performance Considerations

### Memory Usage

- **Sampling Rate** - Adjust memory scan intervals to balance accuracy vs. performance
- **Cache Management** - Clear analysis caches periodically to prevent memory bloat
- **Data Compression** - Compress historical data to reduce storage requirements

### CPU Usage

- **Asynchronous Processing** - Use async/await for I/O operations
- **Batch Processing** - Process multiple data points together
- **Background Analysis** - Run heavy analysis in background threads

## 🔒 Security & Safety

### Process Access

- **Minimal Permissions** - Only request necessary process access rights
- **Error Handling** - Gracefully handle access denied scenarios
- **Process Validation** - Verify target processes are legitimate WC2 instances

### Data Handling

- **No Game Modification** - Laboratory is read-only, never modifies game memory
- **Data Sanitization** - Validate all extracted data before processing
- **Secure Storage** - Store sensitive data securely

## 🧪 Testing

### Unit Tests

```bash
cargo test
```

### Integration Tests

```bash
cargo test --test integration_tests
```

### Performance Tests

```bash
cargo bench
```

## 📚 API Reference

### Core Functions

- `Laboratory::new()` - Create new laboratory instance
- `ProcessMonitor::find_wc2_processes()` - Detect WC2 processes
- `MemoryAnalyzer::analyze_process()` - Analyze process memory
- `GameStateTracker::track_state()` - Track game state changes
- `EventRecorder::record_events()` - Record game events

### Data Structures

- `GameState` - Complete game state snapshot
- `GameEvent` - Individual game event
- `AnalysisResult` - Analysis output
- `MemoryRegion` - Memory region information

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch** - `git checkout -b feature/new-analysis`
3. **Implement changes** - Follow Rust coding standards
4. **Add tests** - Ensure new functionality is tested
5. **Submit pull request** - Include detailed description of changes

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Troubleshooting

### Common Issues

1. **Process Access Denied**
   - Run as Administrator
   - Check Windows Defender settings
   - Verify process is actually WC2 Remastered

2. **Memory Analysis Fails**
   - Check process is still running
   - Verify memory regions are accessible
   - Check for anti-cheat interference

3. **Performance Issues**
   - Reduce scan intervals
   - Clear analysis caches
   - Use release builds

### Debug Mode

Enable detailed logging:

```bash
set RUST_LOG=debug
cargo run
```

## 🔮 Future Enhancements

- **Network Protocol Analysis** - Analyze multiplayer communication
- **AI Behavior Analysis** - Understand computer player strategies
- **Real-time Visualization** - Live display of game state
- **Machine Learning Integration** - Advanced pattern recognition
- **Cross-platform Support** - Linux and macOS compatibility

## 📞 Support

For questions, issues, or contributions:

- **Issues** - Use GitHub Issues
- **Discussions** - Use GitHub Discussions
- **Wiki** - Check project wiki for detailed guides

---

**Note**: This laboratory is for research and educational purposes only. It does not modify game files or enable cheating. Always respect game terms of service and community guidelines.
