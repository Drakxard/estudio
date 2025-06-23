@echo off
echo COMPREHENSIVE ELECTRON PACKAGING DEBUG
echo =======================================

echo Current directory:
cd

echo.
echo Package.json main field:
findstr "main" package.json

echo.
echo Electron version:
npx electron --version

echo.
echo electron-main.js first 5 lines:
head -5 electron-main.js

echo.
echo Running electron-packager with maximum verbosity:
npx electron-packager . "MathStudy" --platform=win32 --arch=x64 --out=dist-test --overwrite --verbose

echo.
echo Checking what was created:
if exist dist-test (
    echo Contents of dist-test:
    dir dist-test /b
    if exist "dist-test\MathStudy-win32-x64" (
        echo Contents of MathStudy-win32-x64:
        dir "dist-test\MathStudy-win32-x64" /b
    )
) else (
    echo No dist-test folder created
)

pause