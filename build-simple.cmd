@echo off
echo Building Mathematics Study Platform .exe (Simple Method)
echo.

echo Step 1: Installing dependencies...
call npm install

echo.
echo Step 2: Building web application (quick)...
call npm run build

echo.
echo Step 3: Creating basic Electron package...
mkdir electron-output 2>nul
copy electron-main.js electron-output\
copy electron-preload.js electron-output\
copy package.json electron-output\
xcopy /E /I dist electron-output\dist\
xcopy /E /I server electron-output\server\
xcopy /E /I shared electron-output\shared\
xcopy /E /I sube-seccion electron-output\sube-seccion\
xcopy /E /I attached_assets electron-output\attached_assets\
xcopy /E /I /Q node_modules electron-output\node_modules\

echo.
echo Step 4: Creating executable with electron-packager...
call npx electron-packager electron-output "Mathematics Study Platform" --platform=win32 --arch=x64 --out=electron-dist --overwrite

echo.
echo Build complete! Check the 'electron-dist' folder.
echo.
pause