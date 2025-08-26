@echo off
echo ========================================
echo TMapX Tauri App Builder (Robust Version)
echo ========================================
echo.

cd /d "C:\Users\garet\OneDrive\Desktop\wartest\TMapX"

echo Current directory: %CD%
echo.

echo Building TMapX Tauri application...
echo.

echo Starting Tauri build in a separate window...
echo This window will stay open for you to review the results.
echo.

REM Run the build in a separate window and wait for it to complete
start /wait cmd /c "npm run tauri dev"

echo.
echo ========================================
echo BUILD PROCESS COMPLETED
echo ========================================
echo.

echo The build process has finished.
echo Check the other window for any error messages.
echo.

echo ========================================
echo THIS WINDOW WILL STAY OPEN
echo ========================================
echo.
echo Press any key to close this window...
pause >nul

REM Multiple safety pauses to ensure window stays open
echo.
echo Still here! Press any key again...
pause >nul

echo.
echo Final confirmation - press any key to close...
pause >nul
