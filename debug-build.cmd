@echo off
echo Debug: Mathematics Study Platform Build
echo.

echo Checking files...
echo electron-main.js exists: 
if exist electron-main.js (echo YES) else (echo NO)

echo electron-preload.js exists:
if exist electron-preload.js (echo YES) else (echo NO)

echo dist folder exists:
if exist dist (echo YES) else (echo NO)

echo package.json exists:
if exist package.json (echo YES) else (echo NO)

echo.
echo Current directory contents:
dir /b

echo.
echo Installing dependencies...
call npm install

echo.
echo Building web app...
call npm run build

echo.
echo Checking dist folder after build:
if exist dist (
    echo dist folder created successfully
    dir dist /b
) else (
    echo ERROR: dist folder not created
)

echo.
echo Running electron-builder with verbose output...
call npx electron-builder --win --config package-electron.json --verbose

echo.
pause