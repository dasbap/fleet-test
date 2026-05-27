@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
set "APK=%ROOT%android\app\build\outputs\apk\debug\app-debug.apk"

call "%ROOT%scripts\adb-env.bat" check-device
if errorlevel 1 (
  pause
  exit /b 1
)

echo === INSTALL ===
"%ADB%" install -r "%APK%"

echo === LAUNCH ===
"%ADB%" shell am start -n com.esamba.flotte/com.esamba.flotte.MainActivity

echo EXIT_CODE=%ERRORLEVEL%
pause
