//! Custom Game Builder Module
//! 
//! This module handles the creation and management of custom headless versions
//! of Warcraft II Remastered for direct AI Agent integration.

use anyhow::Result;
use log::{info, warn, error};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::fs;

/// Custom Game Builder for creating headless WC2 Remastered
pub struct CustomGameBuilder {
    /// Path to original WC2 Remastered installation
    original_game_path: PathBuf,
    /// Path to custom build output
    custom_build_path: PathBuf,
    /// Build configuration
    config: BuildConfig,
}

/// Configuration for custom game build
#[derive(Debug, Clone)]
pub struct BuildConfig {
    /// Enable headless mode (no display)
    pub headless_mode: bool,
    /// Disable Battle.net integration
    pub disable_networking: bool,
    /// Enable custom data export
    pub enable_data_export: bool,
    /// Enable AI Agent integration
    pub enable_ai_integration: bool,
    /// Build type (debug/release)
    pub build_type: BuildType,
}

/// Build type enumeration
#[derive(Debug, Clone, PartialEq)]
pub enum BuildType {
    Debug,
    Release,
}

impl Default for BuildConfig {
    fn default() -> Self {
        Self {
            headless_mode: true,
            disable_networking: true,
            enable_data_export: true,
            enable_ai_integration: true,
            build_type: BuildType::Debug,
        }
    }
}

impl CustomGameBuilder {
    /// Create a new Custom Game Builder
    /// 
    /// SAFETY: This will NEVER modify the original game files.
    /// All work is done on isolated copies in the AI laboratory folder.
    pub fn new(original_game_path: PathBuf, custom_build_path: PathBuf) -> Self {
        // Validate that we're not trying to work in the original game directory
        if custom_build_path.starts_with(&original_game_path) {
            panic!("🚨 SAFETY VIOLATION: Custom build path cannot be inside original game directory!");
        }
        
        // Ensure custom build path is within our AI laboratory workspace
        let current_dir = std::env::current_dir().unwrap_or_default();
        if !custom_build_path.starts_with(&current_dir) {
            warn!("⚠️ Custom build path is outside current workspace - ensure this is intentional");
        }
        
        Self {
            original_game_path,
            custom_build_path,
            config: BuildConfig::default(),
        }
    }

    /// Set build configuration
    pub fn with_config(mut self, config: BuildConfig) -> Self {
        self.config = config;
        self
    }

    /// Initialize the custom game build environment
    /// 
    /// SAFETY: This function ONLY READS from the original game directory
    /// and creates COPIES in our isolated AI laboratory folder.
    /// Original game files are NEVER modified.
    pub async fn initialize(&self) -> Result<()> {
        info!("🚀 Initializing Custom Game Builder...");
        info!("🔒 SAFETY: Original game files will NEVER be modified");
        info!("📁 Working with isolated copies in AI laboratory folder");
        
        // Double-check safety: ensure we're not in the original game directory
        self.validate_safety()?;
        
        // Create output directory
        fs::create_dir_all(&self.custom_build_path)?;
        info!("✅ Created isolated output directory: {:?}", self.custom_build_path);
        
        // Copy original game files for analysis (READ-ONLY operation)
        self.copy_original_files()?;
        info!("✅ Copied original game files for analysis (originals untouched)");
        
        // Set up reverse engineering environment
        self.setup_reverse_engineering_env()?;
        info!("✅ Set up reverse engineering environment");
        
        info!("🔒 SAFETY CONFIRMED: All operations completed on isolated copies only");
        Ok(())
    }

    /// Validate that we're working safely with isolated copies
    fn validate_safety(&self) -> Result<()> {
        // Ensure custom build path is not inside original game directory
        if self.custom_build_path.starts_with(&self.original_game_path) {
            return Err(anyhow::anyhow!(
                "🚨 SAFETY VIOLATION: Custom build path '{}' is inside original game directory '{}'! \
                This would risk modifying original files. Please use a different output location.",
                self.custom_build_path.display(),
                self.original_game_path.display()
            ));
        }
        
        // Ensure we're working within our AI laboratory workspace
        let current_dir = std::env::current_dir()?;
        if !self.custom_build_path.starts_with(&current_dir) {
            warn!("⚠️ Custom build path is outside current workspace - ensure this is intentional");
        }
        
        info!("🔒 Safety validation passed - working with isolated copies only");
        Ok(())
    }

    /// Copy original game files for analysis
    /// 
    /// SAFETY: This function ONLY READS from the original directory
    /// and creates COPIES in our isolated folder. Original files are untouched.
    fn copy_original_files(&self) -> Result<()> {
        let source_dir = &self.original_game_path;
        let target_dir = self.custom_build_path.join("original_files");
        
        info!("📋 Copying files from: {:?}", source_dir);
        info!("📋 Copying files to: {:?}", target_dir);
        info!("🔒 SAFETY: Original files will remain completely untouched");
        
        if target_dir.exists() {
            fs::remove_dir_all(&target_dir)?;
        }
        fs::create_dir_all(&target_dir)?;
        
        // Copy main executable
        if let Some(exe_path) = self.find_main_executable(source_dir)? {
            let target_exe = target_dir.join(exe_path.file_name().unwrap());
            fs::copy(&exe_path, &target_exe)?;
            info!("📁 Copied main executable: {:?} -> {:?}", exe_path, target_exe);
        }
        
        // Copy supporting files
        self.copy_directory_contents(source_dir, &target_dir)?;
        
        info!("✅ File copying completed - all originals remain untouched");
        Ok(())
    }

    /// Find the main executable in the game directory
    fn find_main_executable(&self, game_dir: &Path) -> Result<Option<PathBuf>> {
        let possible_names = [
            "Warcraft II Remastered.exe",
            "WarcraftII.exe",
            "WC2.exe",
            "game.exe",
        ];
        
        for name in &possible_names {
            let exe_path = game_dir.join(name);
            if exe_path.exists() {
                return Ok(Some(exe_path));
            }
        }
        
        warn!("⚠️ No main executable found in game directory");
        Ok(None)
    }

    /// Copy directory contents recursively
    fn copy_directory_contents(&self, source: &Path, target: &Path) -> Result<()> {
        if !source.is_dir() {
            return Ok(());
        }
        
        for entry in fs::read_dir(source)? {
            let entry = entry?;
            let source_path = entry.path();
            let target_path = target.join(entry.file_name());
            
            if source_path.is_dir() {
                fs::create_dir_all(&target_path)?;
                self.copy_directory_contents(&source_path, &target_path)?;
            } else {
                fs::copy(&source_path, &target_path)?;
            }
        }
        
        Ok(())
    }

    /// Set up reverse engineering environment
    fn setup_reverse_engineering_env(&self) -> Result<()> {
        let tools_dir = self.custom_build_path.join("tools");
        fs::create_dir_all(&tools_dir)?;
        
        // Create analysis scripts
        self.create_analysis_scripts(&tools_dir)?;
        
        // Create build configuration
        self.create_build_config(&tools_dir)?;
        
        Ok(())
    }

    /// Create analysis scripts for reverse engineering
    fn create_analysis_scripts(&self, tools_dir: &Path) -> Result<()> {
        // Create IDA Pro analysis script
        let ida_script = tools_dir.join("analyze_wc2.idc");
        let ida_content = self.generate_ida_script();
        fs::write(&ida_script, ida_content)?;
        
        // Create Ghidra analysis script
        let ghidra_script = tools_dir.join("analyze_wc2.py");
        let ghidra_content = self.generate_ghidra_script();
        fs::write(&ghidra_script, ghidra_content)?;
        
        // Create analysis batch file
        let batch_file = tools_dir.join("start_analysis.bat");
        let batch_content = self.generate_analysis_batch();
        fs::write(&batch_file, batch_content)?;
        
        info!("📝 Created analysis scripts in {:?}", tools_dir);
        Ok(())
    }

    /// Generate IDA Pro analysis script
    fn generate_ida_script(&self) -> String {
        r#"// IDA Pro Analysis Script for WC2 Remastered
// This script helps identify key functions and structures

#include <idc.idc>

static main() {
    auto ea;
    
    // Set processor type
    SetProcessorType("metapc", SETPROC_ALL);
    
    // Analyze the entire file
    Message("Starting analysis of WC2 Remastered...\n");
    
    // Find main entry point
    ea = GetEntryPoint(GetEntryOrdinal(0));
    if (ea != BADADDR) {
        Message("Main entry point found at: %08X\n", ea);
        MakeCode(ea);
        AutoMark(ea, AU_CODE);
    }
    
    // Look for common game functions
    find_game_functions();
    
    // Look for rendering functions
    find_rendering_functions();
    
    // Look for networking functions
    find_networking_functions();
    
    Message("Analysis complete!\n");
}

static find_game_functions() {
    auto ea, name;
    
    // Common game function patterns
    auto patterns = {
        "WinMain",
        "main",
        "GameLoop",
        "UpdateGame",
        "ProcessInput"
    };
    
    for (auto pattern : patterns) {
        ea = FindBinary(0, SEARCH_DOWN, pattern);
        if (ea != BADADDR) {
            name = Name(ea);
            Message("Found function %s at %08X\n", pattern, ea);
        }
    }
}

static find_rendering_functions() {
    auto ea;
    
    // OpenGL/DirectX function patterns
    auto render_patterns = {
        "glBegin",
        "glEnd",
        "glVertex",
        "CreateWindow",
        "ShowWindow"
    };
    
    for (auto pattern : render_patterns) {
        ea = FindBinary(0, SEARCH_DOWN, pattern);
        if (ea != BADADDR) {
            Message("Found rendering function %s at %08X\n", pattern, ea);
        }
    }
}

static find_networking_functions() {
    auto ea;
    
    // Network function patterns
    auto network_patterns = {
        "connect",
        "send",
        "recv",
        "WSAStartup",
        "socket"
    };
    
    for (auto pattern : network_patterns) {
        ea = FindBinary(0, SEARCH_DOWN, pattern);
        if (ea != BADADDR) {
            Message("Found network function %s at %08X\n", pattern, ea);
        }
    }
}
"#.to_string()
    }

    /// Generate Ghidra analysis script
    fn generate_ghidra_script(&self) -> String {
        r#"# Ghidra Analysis Script for WC2 Remastered
# This script helps identify key functions and structures

from ghidra.app.decompiler import DecompInterface
from ghidra.program.model.symbol import SymbolType

def main():
    print("Starting analysis of WC2 Remastered...")
    
    # Get current program
    program = getCurrentProgram()
    if program is None:
        print("No program loaded!")
        return
    
    # Find main entry point
    main_symbol = find_symbol_by_name(program, "main")
    if main_symbol:
        print(f"Main entry point found at: {main_symbol.address}")
    
    # Find WinMain
    winmain_symbol = find_symbol_by_name(program, "WinMain")
    if winmain_symbol:
        print(f"WinMain found at: {winmain_symbol.address}")
    
    # Look for common game functions
    find_game_functions(program)
    
    # Look for rendering functions
    find_rendering_functions(program)
    
    # Look for networking functions
    find_networking_functions(program)
    
    print("Analysis complete!")

def find_symbol_by_name(program, name):
    symbol_table = program.getSymbolTable()
    symbols = symbol_table.getSymbols(name)
    if symbols.hasNext():
        return symbols.next()
    return None

def find_game_functions(program):
    game_patterns = [
        "GameLoop",
        "UpdateGame", 
        "ProcessInput",
        "RenderFrame"
    ]
    
    for pattern in game_patterns:
        symbol = find_symbol_by_name(program, pattern)
        if symbol:
            print(f"Found game function {pattern} at {symbol.address}")

def find_rendering_functions(program):
    render_patterns = [
        "glBegin",
        "glEnd",
        "glVertex",
        "CreateWindow",
        "ShowWindow"
    ]
    
    for pattern in render_patterns:
        symbol = find_symbol_by_name(program, pattern)
        if symbol:
            print(f"Found rendering function {pattern} at {symbol.address}")

def find_networking_functions(program):
    network_patterns = [
        "connect",
        "send",
        "recv",
        "WSAStartup",
        "socket"
    ]
    
    for pattern in network_patterns:
        symbol = find_symbol_by_name(program, pattern)
        if symbol:
            print(f"Found network function {pattern} at {symbol.address}")

if __name__ == "__main__":
    main()
"#.to_string()
    }

    /// Generate analysis batch file
    fn generate_analysis_batch(&self) -> String {
        r#"@echo off
echo Starting WC2 Remastered Analysis...
echo.

echo Available Analysis Tools:
echo 1. IDA Pro - Professional disassembler
echo 2. Ghidra - Free NSA-developed tool
echo 3. x64dbg - Open-source debugger
echo.

echo Instructions:
echo 1. Load the executable from original_files/ in your chosen tool
echo 2. Run the appropriate analysis script
echo 3. Document findings in analysis_report.md
echo.

echo Analysis files created:
echo - analyze_wc2.idc (IDA Pro script)
echo - analyze_wc2.py (Ghidra script)
echo - start_analysis.bat (this file)
echo.

pause
"#.to_string()
    }

    /// Create build configuration files
    fn create_build_config(&self, tools_dir: &Path) -> Result<()> {
        // Create CMakeLists.txt
        let cmake_file = tools_dir.join("CMakeLists.txt");
        let cmake_content = self.generate_cmake_config();
        fs::write(&cmake_file, cmake_content)?;
        
        // Create build script
        let build_script = tools_dir.join("build.bat");
        let build_content = self.generate_build_script();
        fs::write(&build_script, build_content)?;
        
        // Create modification plan
        let mod_plan = tools_dir.join("modification_plan.md");
        let mod_content = self.generate_modification_plan();
        fs::write(&mod_plan, mod_content)?;
        
        Ok(())
    }

    /// Generate CMake configuration
    fn generate_cmake_config(&self) -> String {
        r#"# CMake Configuration for Custom WC2 Remastered Build

cmake_minimum_required(VERSION 3.16)
project(WC2RemasteredHeadless VERSION 1.0.0)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Build type
if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Debug)
endif()

# Output directories
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)

# Compiler flags
if(MSVC)
    set(CMAKE_CXX_FLAGS_DEBUG "/Zi /Od /RTC1")
    set(CMAKE_CXX_FLAGS_RELEASE "/O2 /DNDEBUG")
    add_definitions(-D_CRT_SECURE_NO_WARNINGS)
else()
    set(CMAKE_CXX_FLAGS_DEBUG "-g -O0")
    set(CMAKE_CXX_FLAGS_RELEASE "-O3 -DNDEBUG")
endif()

# Find required packages
find_package(OpenGL REQUIRED)
find_package(glfw3 REQUIRED)

# Include directories
include_directories(${CMAKE_SOURCE_DIR}/include)
include_directories(${CMAKE_SOURCE_DIR}/src)

# Source files (to be added as we develop)
file(GLOB_RECURSE SOURCES "src/*.cpp" "src/*.c")

# Create executable
add_executable(${PROJECT_NAME} ${SOURCES})

# Link libraries
target_link_libraries(${PROJECT_NAME} 
    OpenGL::GL
    glfw
)

# Compiler definitions
target_compile_definitions(${PROJECT_NAME} PRIVATE
    HEADLESS_MODE=1
    DISABLE_NETWORKING=1
    ENABLE_DATA_EXPORT=1
    ENABLE_AI_INTEGRATION=1
)

# Install rules
install(TARGETS ${PROJECT_NAME}
    RUNTIME DESTINATION bin
)
"#.to_string()
    }

    /// Generate build script
    fn generate_build_script(&self) -> String {
        r#"@echo off
echo Building Custom WC2 Remastered Headless Version...
echo.

REM Check if CMake is available
where cmake >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: CMake not found in PATH
    echo Please install CMake and add it to your PATH
    pause
    exit /b 1
)

REM Check if Visual Studio is available
where cl >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Visual Studio compiler not found
    echo Please run this from a Visual Studio Developer Command Prompt
    pause
    exit /b 1
)

echo Creating build directory...
if not exist "build" mkdir build
cd build

echo Configuring with CMake...
cmake .. -G "Visual Studio 16 2019" -A x64
if %errorlevel% neq 0 (
    echo ERROR: CMake configuration failed
    pause
    exit /b 1
)

echo Building project...
cmake --build . --config Release
if %errorlevel% neq 0 (
    echo ERROR: Build failed
    pause
    exit /b 1
)

echo.
echo Build completed successfully!
echo Executable location: build\bin\Release\WC2RemasteredHeadless.exe
echo.

pause
"#.to_string()
    }

    /// Generate modification plan
    fn generate_modification_plan(&self) -> String {
        r#"# WC2 Remastered Modification Plan

## Overview
This document outlines the modifications needed to create a headless version of WC2 Remastered.

## Phase 1: Analysis (Week 1)
- [ ] Load executable in disassembler
- [ ] Identify main entry points
- [ ] Map critical functions
- [ ] Document rendering system
- [ ] Document networking system
- [ ] Document input handling

## Phase 2: Rendering Modifications (Week 2)
- [ ] Replace OpenGL/DirectX calls with null operations
- [ ] Remove window creation and management
- [ ] Implement headless rendering pipeline
- [ ] Test rendering modifications

## Phase 3: Networking Modifications (Week 2)
- [ ] Remove Battle.net authentication
- [ ] Disable network communication
- [ ] Implement offline mode
- [ ] Test network modifications

## Phase 4: Input System Modifications (Week 2)
- [ ] Replace mouse/keyboard input with programmatic input
- [ ] Implement direct game state modification
- [ ] Add AI Agent control interface
- [ ] Test input modifications

## Phase 5: Data Export (Week 2)
- [ ] Implement custom logging system
- [ ] Add game state export functions
- [ ] Create replay data generation
- [ ] Test data export functionality

## Phase 6: Integration (Week 3)
- [ ] Integrate with AI Agent
- [ ] Test end-to-end functionality
- [ ] Performance optimization
- [ ] Final testing

## Key Functions to Modify

### Rendering Functions
- `RenderFrame()` - Replace with null operations
- `CreateWindow()` - Disable window creation
- `ShowWindow()` - Disable window display
- `SwapBuffers()` - Disable buffer swapping

### Networking Functions
- `WSAStartup()` - Disable network initialization
- `socket()` - Disable socket creation
- `connect()` - Disable connection attempts
- `send()`/`recv()` - Disable data transmission

### Input Functions
- `GetAsyncKeyState()` - Replace with AI input
- `GetCursorPos()` - Replace with AI coordinates
- `SetCursorPos()` - Replace with AI positioning

## Success Criteria
- Game runs without visible window
- No network communication
- AI Agent can control game directly
- Data export works correctly
- Performance impact < 5%
"#.to_string()
    }

    /// Start the reverse engineering analysis
    pub async fn start_analysis(&self) -> Result<()> {
        info!("🔍 Starting WC2 Remastered Analysis...");
        
        // Create analysis report
        let report_path = self.custom_build_path.join("analysis_report.md");
        let report_content = self.generate_analysis_report();
        fs::write(&report_path, report_content)?;
        
        info!("📋 Created analysis report: {:?}", report_path);
        info!("🚀 Ready to begin reverse engineering analysis!");
        info!("💡 Use the tools in the 'tools' directory to analyze the executable");
        
        Ok(())
    }

    /// Generate initial analysis report
    fn generate_analysis_report(&self) -> String {
        let timestamp = chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC");
        
        format!(r#"# WC2 Remastered Analysis Report

**Generated**: {timestamp}
**Status**: Ready for Analysis
**Next Action**: Begin reverse engineering with provided tools

## Analysis Setup

### Files Available
- **Original Game Files**: Copied to `original_files/` directory
- **Analysis Tools**: Available in `tools/` directory
- **Build Configuration**: CMake and build scripts ready

### Tools Provided
1. **IDA Pro Script** (`analyze_wc2.idc`) - Professional disassembler analysis
2. **Ghidra Script** (`analyze_wc2.py`) - Free reverse engineering tool
3. **Build Scripts** (`build.bat`, `CMakeLists.txt`) - Build system setup
4. **Modification Plan** (`modification_plan.md`) - Development roadmap

## Analysis Steps

### Step 1: Choose Analysis Tool
- **IDA Pro**: Professional tool, best for detailed analysis
- **Ghidra**: Free tool, good for initial exploration
- **x64dbg**: Free debugger, good for runtime analysis

### Step 2: Load Executable
1. Open your chosen analysis tool
2. Load the main executable from `original_files/`
3. Run the appropriate analysis script
4. Document findings in this report

### Step 3: Document Findings
- **Entry Points**: Main function locations
- **Critical Functions**: Game loop, rendering, networking
- **Dependencies**: External libraries and functions
- **Data Structures**: Game state and entity structures

## Expected Findings

### Rendering System
- OpenGL or DirectX function calls
- Window creation and management functions
- Frame rendering and buffer management

### Networking System
- Battle.net authentication functions
- Network communication functions
- Multiplayer game logic

### Game Logic
- Main game loop function
- Input processing functions
- Game state management
- Unit and building systems

## Next Steps

1. **Complete Analysis**: Use provided tools to analyze executable
2. **Document Functions**: Record all critical function locations
3. **Plan Modifications**: Identify which functions to modify
4. **Begin Development**: Start implementing headless modifications

## Notes

- Keep detailed records of all findings
- Document function addresses and relationships
- Note any anti-debugging or protection mechanisms
- Identify potential modification challenges

---

**Status**: 🔍 **ANALYSIS READY TO BEGIN**
**Next Action**: Load executable in analysis tool and run analysis script
**Timeline**: 1 week for complete analysis
"#, timestamp = timestamp)
    }

    /// Get the current build status
    pub fn get_build_status(&self) -> BuildStatus {
        BuildStatus {
            phase: "Analysis Ready".to_string(),
            progress: 0.0,
            next_step: "Begin reverse engineering analysis".to_string(),
            estimated_completion: "4 weeks".to_string(),
        }
    }
}

/// Build status information
#[derive(Debug, Clone)]
pub struct BuildStatus {
    pub phase: String,
    pub progress: f32,
    pub next_step: String,
    pub estimated_completion: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_custom_game_builder_creation() {
        let temp_dir = tempdir().unwrap();
        let original_path = temp_dir.path().join("original");
        let custom_path = temp_dir.path().join("custom");
        
        fs::create_dir_all(&original_path).unwrap();
        fs::create_dir_all(&custom_path).unwrap();
        
        let builder = CustomGameBuilder::new(original_path, custom_path);
        assert_eq!(builder.config.headless_mode, true);
        assert_eq!(builder.config.disable_networking, true);
    }

    #[test]
    fn test_build_config_default() {
        let config = BuildConfig::default();
        assert_eq!(config.headless_mode, true);
        assert_eq!(config.disable_networking, true);
        assert_eq!(config.enable_data_export, true);
        assert_eq!(config.enable_ai_integration, true);
        assert_eq!(config.build_type, BuildType::Debug);
    }
}
