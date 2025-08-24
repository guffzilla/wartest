@echo off
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
