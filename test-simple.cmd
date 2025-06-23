@echo off
echo Quick Test - Electron App
echo.

echo Testing if electron can find the main file...
npx electron --version
echo.

echo Testing electron-main.js syntax...
node -c electron-main.js
if %errorlevel% equ 0 (
    echo ✓ Syntax OK
) else (
    echo ✗ Syntax Error
    pause
    exit
)

echo.
echo Starting Electron app for 10 seconds...
timeout /t 2 >nul
start /b npx electron electron-main.js
timeout /t 10 >nul
taskkill /f /im electron.exe 2>nul

echo.
echo Test complete. If the app opened, Electron setup is working.
pause