@echo off
echo Starting Mathematics Study Platform (Desktop Version)
echo.
echo Installing dependencies...
call npm install

echo.
echo Building application...
call npm run build

echo.
echo Starting Electron app...
call npx electron electron/main.js

pause