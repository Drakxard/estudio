@echo off
echo Building Mathematics Study Platform .exe
echo.

echo Step 1: Installing dependencies...
call npm install

echo.
echo Step 2: Building web application...
call npm run build

echo.
echo Step 3: Creating Windows executable...
call npx electron-builder --win --config package-electron-simple.json

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