@echo off
echo Starting WCArena Monitor in development mode...

REM Check if Rust is installed
rustc --version >nul 2>&1
if errorlevel 1 (
    echo Error: Rust is not installed. Please install Rust from https://rustup.rs/
    pause
    exit /b 1
)

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js is not installed. Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if Tauri CLI is installed
cargo tauri --version >nul 2>&1
if errorlevel 1 (
    echo Installing Tauri CLI...
    cargo install tauri-cli
)

echo Starting development server...
cargo tauri dev

if errorlevel 1 (
    echo Development server failed to start!
    pause
    exit /b 1
)

pause
