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

echo Starting Tauri build in this window...
echo All logs and output will be displayed here.
echo.

REM Run the build in the same window and capture the exit code
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
