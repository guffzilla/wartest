@echo off
echo ========================================
echo TMapX Tauri App Builder
echo ========================================
echo.

cd /d "C:\Users\garet\OneDrive\Desktop\wartest\TMapX"

echo Current directory: %CD%
echo.

echo Building TMapX Tauri application...
echo.

npm run tauri dev

echo.
echo Build completed. Press any key to close this window.
pause >nul
