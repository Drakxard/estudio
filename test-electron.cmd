@echo off
echo Testing Electron integration...
echo.

echo Step 1: Installing dependencies...
call npm install

echo.
echo Step 2: Building application...
call npm run build

echo.
echo Step 3: Testing Electron app...
call npx electron electron-main.js

echo.
echo Test complete!
pause