@echo off
title 🎨 TMapX Enhanced Texture Renderer - Debug Mode
color 0B

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    🎨 TMapX Enhanced Renderer                ║
echo ║              Texture-Based Warcraft II Map Viewer           ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo 🚀 Starting Enhanced Texture-Based Map Renderer...
echo.

:: Navigate to the wartest directory where TMapX is located
cd /d "C:\Users\garet\OneDrive\Desktop\wartest"

:: Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ ERROR: Python is not installed or not in PATH
    echo    Please install Python and try again
    echo.
    pause
    exit /b 1
)

:: Check if the enhanced renderer exists
if not exist "TMapX\enhanced_map_renderer.html" (
    echo ❌ ERROR: Enhanced renderer not found
    echo    Expected location: TMapX\enhanced_map_renderer.html
    echo    Current directory: %CD%
    echo.
    pause
    exit /b 1
)

echo ✅ Python found
echo ✅ Enhanced renderer found
echo.
echo 🌐 Starting web server on port 8000...
echo 📁 Serving from: %CD%
echo.

:: Open the browser to the enhanced renderer
echo 🌐 Opening browser to enhanced texture renderer...
start http://localhost:8000/TMapX/enhanced_map_renderer.html

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    🎯 SYSTEM READY                          ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo 🎨 Enhanced Texture Renderer is now running!
echo.
echo 📍 URL: http://localhost:8000/TMapX/enhanced_map_renderer.html
echo 🖥️  Server: Running on port 8000
echo 🔧 Debug: Terminal will remain open for debugging
echo.
echo 🎮 Features Available:
echo    • 🖼️ Texture-based rendering (GO BIG implementation)
echo    • 🎨 Multiple rendering modes (Texture/Color/Hybrid)
echo    • 🔍 Real-time texture extraction
echo    • 📊 Performance monitoring
echo    • 🎯 Interactive overlays and tooltips
echo    • 🔄 1x-8x zoom with texture scaling
echo.
echo 💡 Tips:
echo    • Load a PUD file to see the texture system in action
echo    • Click "🔍 Extract Textures" to test WASM integration
echo    • Use the zoom slider to see texture scaling
echo    • Toggle overlays to show resources, units, and players
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    🐛 DEBUG MODE ACTIVE                     ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo 🔍 Server logs and errors will appear below:
echo ═══════════════════════════════════════════════════════════════
echo.

:: Keep the terminal open and show server output
python -m http.server 8000

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    🛑 SERVER STOPPED                        ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Press any key to exit...
pause >nul
