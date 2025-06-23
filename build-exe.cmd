@echo off
echo Building Mathematics Study Platform .exe
echo.

echo Step 1: Installing dependencies...
call npm install

echo.
echo Step 2: Quick build check...
if not exist dist (
    echo Building web application...
    call npm run build
) else (
    echo Using existing build
)

echo.
echo Step 3: Creating Windows executable...
call npx electron-packager . "Mathematics Study Platform" --platform=win32 --arch=x64 --out=electron-dist --overwrite --ignore="client|\.git|\.cache|\.replit|\.upm"

echo.
echo Build complete! Check the 'electron-dist' folder for your .exe files.
echo.
echo Files created:
echo - Mathematics Study Platform Setup.exe (installer)
echo - win-unpacked\Mathematics Study Platform.exe (portable)
echo.
echo You can now run the portable version or install using the setup file.
echo.
pause