@echo off
cls
echo ================================================
echo MATHEMATICS STUDY PLATFORM - EXE CREATOR
echo ================================================
echo.

echo [1/4] Preparing environment...
if exist electron-dist rmdir /s /q electron-dist
mkdir logs 2>nul

echo [2/4] Installing Electron as dev dependency...
call npm install electron --save-dev > logs\install.log 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Failed to install Electron
    type logs\install.log
    pause
    exit /b 1
)

echo [3/4] Building application...
if not exist dist (
    echo Building frontend and backend...
    call npm run build > logs\build.log 2>&1
    if %errorlevel% neq 0 (
        echo ERROR: Build failed
        type logs\build.log
        pause
        exit /b 1
    )
) else (
    echo Using existing build
)

echo [4/4] Creating Electron package...
echo Running: npx electron-packager . "Mathematics Study Platform" --platform=win32 --arch=x64 --out=electron-dist --overwrite --executable-name="MathStudyPlatform"
call npx electron-packager . "Mathematics Study Platform" --platform=win32 --arch=x64 --out=electron-dist --overwrite --executable-name="MathStudyPlatform" --app-version=1.0.0 --ignore="client|\.git|\.cache|\.replit|\.upm|logs|package-temp\.json|package-original\.json" > logs\package.log 2>&1

echo.
echo ================================================
echo VERIFICATION
echo ================================================

if exist "electron-dist\Mathematics Study Platform-win32-x64" (
    echo ✓ Package folder created successfully
    if exist "electron-dist\Mathematics Study Platform-win32-x64\MathStudyPlatform.exe" (
        echo ✓ SUCCESS! Your .exe file is ready:
        echo.
        echo   Location: electron-dist\Mathematics Study Platform-win32-x64\MathStudyPlatform.exe
        echo   Size: 
        for %%A in ("electron-dist\Mathematics Study Platform-win32-x64\MathStudyPlatform.exe") do echo     %%~zA bytes
        echo.
        echo To run your app, navigate to the folder above and double-click MathStudyPlatform.exe
    ) else (
        echo ✗ Package folder exists but .exe not found
        echo Contents of package folder:
        dir "electron-dist\Mathematics Study Platform-win32-x64" /b
    )
) else (
    echo ✗ ERROR: Package creation failed
    echo Packaging log:
    type logs\package.log
)

echo.
echo Cleaning up temporary files...
if exist logs rmdir /s /q logs

pause