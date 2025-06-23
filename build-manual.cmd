@echo off
echo Manual Build Process for Mathematics Study Platform
echo.

echo Step 1: Installing dependencies...
call npm install

echo.
echo Step 2: Building frontend only...
call npx vite build --mode production

echo.
echo Step 3: Building server...
call npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

echo.
echo Step 4: Creating Electron package...
call npx electron-packager . "Mathematics Study Platform" --platform=win32 --arch=x64 --out=electron-dist --overwrite

echo.
echo Build process complete!
if exist "electron-dist\Mathematics Study Platform-win32-x64\Mathematics Study Platform.exe" (
    echo SUCCESS! Your .exe is ready at:
    echo electron-dist\Mathematics Study Platform-win32-x64\Mathematics Study Platform.exe
    echo.
    echo To run it, navigate to that folder and double-click the .exe file
) else (
    echo Build may have failed. Check the output above for errors.
)

pause