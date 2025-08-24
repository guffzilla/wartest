# 🧪 WC2 Remastered Headless Laboratory

A sophisticated laboratory environment for analyzing Warcraft II Remastered's internal structures, memory layouts, and game mechanics without requiring the game to be running.

## 🎯 Purpose

This laboratory is designed to:

1. **Extract Game Data Structures** - Understand how WC2 Remastered stores game state in memory
2. **Analyze Memory Patterns** - Identify recurring data structures and memory layouts
3. **Monitor Game Processes** - Track running WC2 Remastered instances and their memory usage
4. **Generate Replay Data** - Create replay files from captured game events
5. **Research Game Mechanics** - Understand unit behavior, resource management, and game flow
6. **🤖 AI-Driven Game Interaction** - Automate game testing and data collection through AI agent
7. **🎮 Automated Gameplay Analysis** - Use AI to trigger game events and monitor responses

## 🏗️ Architecture

### Core Components

- **`Laboratory`** - Main coordinator that manages analysis sessions
- **`ProcessMonitor`** - Detects and monitors WC2 Remastered processes
- **`MemoryAnalyzer`** - Analyzes memory structures and patterns
- **`GameStateTracker`** - Tracks changes in game state over time
- **`EventRecorder`** - Records game events for replay generation
- **`Analysis`** - Performs data analysis and pattern recognition
- **`AIAgent`** - 🤖 AI-driven game interaction and automation system

### Data Flow

```
Process Detection → Memory Analysis → Game State Tracking → Event Recording → Analysis → Results
```

## 📊 Current Status

### ✅ Completed Features

- **AI Agent Framework** - Complete AI agent system for game interaction
- **Windows API Integration** - Full Windows input simulation and window management
- **Memory Analysis System** - Comprehensive memory structure analysis
- **Process Monitoring** - WC2 Remastered process detection and monitoring
- **Game State Tracking** - Real-time game state monitoring and analysis
- **Event Recording** - Game event capture and replay generation system
- **Compilation & Build** - Project compiles successfully with all dependencies

### 🔄 In Development

- **Screen Analysis** - Advanced menu recognition and UI element detection
- **Mission Selection Logic** - Intelligent campaign mission selection
- **Map Loading Automation** - Automated custom scenario loading
- **Real-time Data Extraction** - Live gameplay data collection during AI interaction

### 🎯 Next Milestones

- **AI Agent Testing** - Test AI agent with actual WC2 Remastered gameplay
- **Data Collection Pipeline** - Establish automated data collection workflow
- **Replay Generation** - Generate replay files from AI-driven gameplay
- **Advanced Analytics** - Machine learning integration for pattern recognition

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

## 🤖 AI Agent Capabilities

### Game Interaction System

- **🖱️ Mouse Control** - Precise mouse clicks and movements at specified coordinates
- **⌨️ Keyboard Input** - Simulate keyboard presses for menu navigation
- **🧭 Menu Navigation** - Automated navigation through game menus
- **🎮 Game Type Selection** - Start campaigns, custom scenarios, and tutorials
- **⏱️ Realistic Timing** - Human-like delays between actions for natural gameplay

### Action Sequences

- **Campaign Mission Starting** - Automated campaign mission selection and loading
- **Custom Scenario Loading** - Load and start custom maps automatically
- **Menu Navigation** - Return to main menu and navigate between options
- **Game State Monitoring** - Track game responses to AI actions

### Integration Features

- **Window Detection** - Automatically find and connect to WC2 Remastered windows
- **Screen Resolution Detection** - Adapt to different game window sizes
- **Process Monitoring** - Integrate with running game processes
- **Memory Analysis Integration** - Combine AI actions with memory analysis

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

### AI Agent Testing

```bash
# Test AI Agent without game running (demonstration mode)
cargo run

# Test AI Agent with WC2 Remastered running
# 1. Launch Warcraft II Remastered
# 2. Run the laboratory
cargo run

# Test specific AI Agent functionality
cargo test --test ai_agent_tests
```

### Integration Tests

```bash
cargo test --test integration_tests
```

### Performance Tests

```bash
cargo bench
```

### AI Agent Manual Testing

1. **Launch WC2 Remastered** - Start the game and navigate to main menu
2. **Run Laboratory** - Execute `cargo run` in the laboratory directory
3. **Monitor AI Actions** - Watch the AI agent interact with the game
4. **Check Logs** - Monitor console output for AI agent actions and responses
5. **Verify Integration** - Confirm AI agent successfully connects to game window

## 📚 API Reference

### Core Functions

- `Laboratory::new()` - Create new laboratory instance
- `ProcessMonitor::find_wc2_processes()` - Detect WC2 processes
- `MemoryAnalyzer::analyze_process()` - Analyze process memory
- `GameStateTracker::track_state()` - Track game state changes
- `EventRecorder::record_events()` - Record game events

### AI Agent Functions

- `AIAgent::new()` - Create new AI agent instance
- `AIAgent::initialize(game_title)` - Connect to game window
- `AIAgent::execute_actions(actions)` - Execute sequence of AI actions
- `AIAgent::mouse_click(x, y, button)` - Perform mouse click
- `AIAgent::key_press(key)` - Simulate keyboard input
- `ActionSequences::start_campaign_mission(name)` - Campaign mission sequence
- `ActionSequences::start_custom_scenario(map)` - Custom scenario sequence

### Data Structures

- `GameState` - Complete game state snapshot
- `GameEvent` - Individual game event
- `AnalysisResult` - Analysis output
- `MemoryRegion` - Memory region information

### AI Agent Data Structures

- `AIAction` - Individual AI action (click, key press, wait, etc.)
- `MouseButton` - Mouse button types (left, right, middle)
- `VirtualKey` - Keyboard key types (enter, escape, arrow keys, etc.)
- `MenuTarget` - Menu navigation targets (campaign, custom game, etc.)
- `GameType` - Game type specifications (campaign, custom scenario, etc.)

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

### AI Agent Issues

4. **Game Window Not Found**
   - Verify WC2 Remastered is running
   - Check window title matches exactly
   - Ensure game is not minimized

5. **Input Simulation Fails**
   - Run as Administrator for input privileges
   - Check Windows security settings
   - Verify game window is in foreground

6. **AI Actions Not Working**
   - Check game is responsive (not paused)
   - Verify screen coordinates are correct
   - Ensure game is in expected menu state

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

## 🧪 AI Agent Testing Workflow

### Phase 1: Basic Functionality Testing
1. **Window Detection** - Test AI agent can find WC2 Remastered windows
2. **Input Simulation** - Verify mouse clicks and keyboard input work
3. **Menu Navigation** - Test basic menu navigation sequences
4. **Action Sequences** - Execute predefined action sequences

### Phase 2: Game Integration Testing
1. **Campaign Navigation** - Test AI agent can navigate to campaign menu
2. **Mission Selection** - Verify AI can select and start missions
3. **Custom Game Loading** - Test custom scenario loading
4. **Game State Monitoring** - Monitor game responses to AI actions

### Phase 3: Data Collection Testing
1. **Event Recording** - Capture game events during AI interaction
2. **Memory Analysis** - Analyze memory changes during AI actions
3. **Replay Generation** - Generate replay data from AI gameplay
4. **Performance Monitoring** - Track AI agent performance and accuracy

## 📞 Support

For questions, issues, or contributions:

- **Issues** - Use GitHub Issues
- **Discussions** - Use GitHub Discussions
- **Wiki** - Check project wiki for detailed guides

---

**Note**: This laboratory is for research and educational purposes only. It does not modify game files or enable cheating. Always respect game terms of service and community guidelines.
