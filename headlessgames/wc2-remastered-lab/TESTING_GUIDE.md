# 🧪 AI Agent Testing Guide

## 🎯 Overview

This guide provides step-by-step instructions for testing the AI Agent framework in the WC2 Remastered Headless Laboratory. The AI Agent is designed to interact with Warcraft II Remastered to automate gameplay testing and data collection.

## 🚀 Getting Started

### Prerequisites

1. **Rust Environment**
   - Rust 1.70+ with Cargo installed
   - All dependencies resolved (check with `cargo check`)

2. **Windows Environment**
   - Windows 10/11 (required for Windows API access)
   - Administrator privileges (for input simulation)
   - Windows Defender/security software configured to allow the application

3. **Warcraft II Remastered**
   - Game installed and accessible
   - Game can be launched and run normally
   - No anti-cheat interference

## 🧪 Testing Phases

### Phase 1: Basic Functionality Testing

#### Test 1.1: AI Agent Creation
```bash
# Navigate to laboratory directory
cd headlessgames/wc2-remastered-lab

# Test basic AI Agent functionality
cargo run --bin test_ai_agent
```

**Expected Results:**
- ✅ AI Agent creation successful
- ✅ Default screen resolution: 1920x1080
- ✅ Action sequences created successfully
- ✅ All basic tests pass

#### Test 1.2: Compilation Verification
```bash
# Verify project compiles without errors
cargo check

# Build the project
cargo build

# Run unit tests
cargo test
```

**Expected Results:**
- ✅ No compilation errors
- ✅ Project builds successfully
- ✅ All unit tests pass

### Phase 2: AI Agent Demonstration Mode

#### Test 2.1: No Game Running
```bash
# Run laboratory without WC2 Remastered running
cargo run
```

**Expected Results:**
- 🚀 Laboratory starts successfully
- 🤖 AI Agent created successfully
- ⚠️ No WC2 Remastered processes found
- 🎭 AI Agent demonstration mode activated
- 📋 Example action sequences created
- 💡 Instructions for testing with game

#### Test 2.2: Action Sequence Validation
**Verify the following sequences are created:**
- Campaign Mission Sequence: 7 actions
- Custom Scenario Sequence: 7 actions
- Menu Navigation Sequence: 6 actions

### Phase 3: Game Integration Testing

#### Test 3.1: Launch Warcraft II Remastered
1. **Start the game**
   - Launch Warcraft II Remastered
   - Navigate to the main menu
   - Ensure the game is responsive and not paused
   - Verify the game window is visible and not minimized

2. **Check game state**
   - Game should be at main menu
   - No active campaigns or games running
   - Game should respond to mouse and keyboard input

#### Test 3.2: AI Agent Integration
```bash
# With WC2 Remastered running, execute:
cargo run
```

**Expected Results:**
- 🚀 Laboratory starts successfully
- 🎮 WC2 Remastered process(es) detected
- 🔗 AI Agent integration begins
- 🪟 Game window found and connected
- 📱 Screen resolution detected
- 🎬 Basic AI actions demonstrated

#### Test 3.3: Campaign Navigation Test
**Expected AI Agent Actions:**
1. Wait 1000ms for game to stabilize
2. Navigate to Campaign menu (Tab + Enter)
3. Wait 500ms for menu response
4. Demonstrate basic navigation capabilities

#### Test 3.4: Custom Game Navigation Test
**Expected AI Agent Actions:**
1. Navigate to Custom Game menu
2. Demonstrate menu navigation
3. Show capability to start custom scenarios

### Phase 4: Advanced Functionality Testing

#### Test 4.1: Memory Analysis Integration
**Expected Results:**
- 💾 Memory analysis completed for detected processes
- 📊 Game state tracking activated
- 📝 Event recording system active
- 🔬 Data analysis performed

#### Test 4.2: Real-time Monitoring
**Verify the following systems are working:**
- Process monitoring
- Memory analysis
- Game state tracking
- Event recording
- Data analysis

## 🔍 Troubleshooting

### Common Issues

#### Issue 1: "Game window not found"
**Symptoms:**
- AI Agent cannot connect to WC2 Remastered
- Error: "Game window not found"

**Solutions:**
1. Verify WC2 Remastered is running
2. Check window title matches exactly: "Warcraft II: Remastered"
3. Ensure game is not minimized
4. Try refreshing the game window

#### Issue 2: "Input simulation fails"
**Symptoms:**
- AI Agent cannot perform mouse clicks or keyboard input
- No visible game interaction

**Solutions:**
1. Run as Administrator
2. Check Windows security settings
3. Verify game window is in foreground
4. Disable any input blocking software

#### Issue 3: "Process access denied"
**Symptoms:**
- Cannot access WC2 Remastered process
- Memory analysis fails

**Solutions:**
1. Run as Administrator
2. Check Windows Defender settings
3. Verify process is actually WC2 Remastered
4. Check for anti-cheat software interference

### Debug Mode

Enable detailed logging for troubleshooting:

```bash
# Set logging level to debug
set RUST_LOG=debug

# Run with verbose output
cargo run --verbose
```

## 📊 Success Criteria

### Phase 1 Success
- ✅ AI Agent creates successfully
- ✅ All action sequences generate correctly
- ✅ Project compiles without errors
- ✅ Unit tests pass

### Phase 2 Success
- ✅ Laboratory starts in demonstration mode
- ✅ AI Agent capabilities displayed
- ✅ Action sequences validated
- ✅ No errors in demonstration

### Phase 3 Success
- ✅ WC2 Remastered process detected
- ✅ AI Agent connects to game window
- ✅ Screen resolution detected
- ✅ Basic navigation demonstrated

### Phase 4 Success
- ✅ Memory analysis completes
- ✅ Game state tracking active
- ✅ Event recording functional
- ✅ Data analysis produces results

## 🎯 Next Steps After Testing

Once all tests pass successfully:

1. **Data Collection Pipeline**
   - Establish automated data collection workflow
   - Test replay generation from AI gameplay
   - Validate data quality and accuracy

2. **Advanced AI Features**
   - Implement screen analysis for menu recognition
   - Add intelligent mission selection
   - Develop map loading automation

3. **Performance Optimization**
   - Optimize action timing
   - Improve error handling
   - Enhance logging and monitoring

## 📞 Support

If you encounter issues during testing:

1. **Check the logs** - Look for error messages and warnings
2. **Verify prerequisites** - Ensure all requirements are met
3. **Review troubleshooting** - Check common issues section
4. **Enable debug mode** - Use detailed logging for diagnosis
5. **Check documentation** - Review README.md and API reference

---

**Note**: This testing guide is designed to validate the AI Agent framework step by step. Each phase builds upon the previous one, ensuring a solid foundation before moving to more advanced functionality.
