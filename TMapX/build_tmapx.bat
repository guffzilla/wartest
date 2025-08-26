@echo off
setlocal enabledelayedexpansion

echo ========================================
echo TMapX Tauri App Builder
echo ========================================
echo.

cd /d "C:\Users\garet\OneDrive\Desktop\wartest\TMapX"

echo Current directory: %CD%
echo.

echo Building TMapX Tauri application...
echo.

echo Starting Tauri build...
echo.

REM Run the npm command and capture the exit code
call npm run tauri dev
set BUILD_EXIT_CODE=%ERRORLEVEL%

echo.
echo ========================================
echo BUILD PROCESS COMPLETED
echo ========================================
echo.

REM Check if the build was successful
if %BUILD_EXIT_CODE% EQU 0 (
    echo SUCCESS: Tauri development server has finished successfully.
    echo The application should now be running.
) else (
    echo ERROR: Build process encountered an error (Exit code: %BUILD_EXIT_CODE%)
    echo Please check the error messages above for details.
)

echo.
echo ========================================
echo SCRIPT COMPLETED
echo ========================================
echo.
echo This window will stay open so you can review any output.
echo.
echo Press any key to close this window...
pause >nul

REM Additional safety - if somehow we get here, keep the window open
echo.
echo If you can see this message, the window is still open.
echo Press any key again to close...
pause >nul
