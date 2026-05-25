@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
set "MAIN_ACTIVITY=com.esamba.flotte/.MainActivity"

call "%ROOT%scripts\adb-env.bat" check-device
if errorlevel 1 (
  pause
  exit /b 1
)

echo === [1] Ouvrir tuto-03 ===
"%ADB%" shell am start -a android.intent.action.VIEW -d "esamba://tutorials/tuto-03" -n %MAIN_ACTIVITY%
timeout /t 3 >nul

echo.
echo === [2] Mode avion ON ===
"%ADB%" shell settings put global airplane_mode_on 1
"%ADB%" shell am broadcast -a android.intent.action.AIRPLANE_MODE --ez state true
timeout /t 3 >nul

echo.
echo === [3] Logcat console JS — mode avion ===
"%ADB%" logcat -d -s "Capacitor/Console"
echo --- fin logcat avion ---

echo.
echo === [4] Mode avion OFF ===
"%ADB%" shell settings put global airplane_mode_on 0
"%ADB%" shell am broadcast -a android.intent.action.AIRPLANE_MODE --ez state false
timeout /t 2 >nul

echo.
echo === [5] Re-ouvrir tuto-03 ===
"%ADB%" shell am start -a android.intent.action.VIEW -d "esamba://tutorials/tuto-03" -n %MAIN_ACTIVITY%
timeout /t 3 >nul

echo.
echo === [6] KEYCODE_BACK — doit rester dans l app ===
"%ADB%" shell input keyevent KEYCODE_BACK
timeout /t 2 >nul

echo.
echo === [7] Logcat post-back ===
"%ADB%" logcat -d -s "Capacitor/Console"
echo --- fin logcat back ---

echo.
echo EXIT=%ERRORLEVEL%
pause
