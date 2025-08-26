@echo off
echo Creating shortcut to TMapX Builder on desktop...

set "DESKTOP=%USERPROFILE%\Desktop"
set "SCRIPT_PATH=%CD%\build_tmapx.bat"
set "SHORTCUT_PATH=%DESKTOP%\TMapX Builder.lnk"

echo Creating shortcut at: %SHORTCUT_PATH%
echo Pointing to: %SCRIPT_PATH%

powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%SHORTCUT_PATH%'); $Shortcut.TargetPath = '%SCRIPT_PATH%'; $Shortcut.WorkingDirectory = '%CD%'; $Shortcut.Description = 'Build TMapX Tauri Application'; $Shortcut.IconLocation = '%SCRIPT_PATH%,0'; $Shortcut.Save()"

echo.
echo Shortcut created successfully!
echo You can now double-click "TMapX Builder" on your desktop to build the app.
pause
