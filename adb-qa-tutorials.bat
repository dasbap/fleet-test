@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
set "MAIN_ACTIVITY=com.esamba.flotte/.MainActivity"

call "%ROOT%scripts\adb-env.bat" check-device
if errorlevel 1 (
  pause
  exit /b 1
)

echo === QA Tutoriels — Deep links ADB ===

echo.
echo [1] esamba://tutorials - liste tutoriels
"%ADB%" shell am start -a android.intent.action.VIEW -d "esamba://tutorials" -n %MAIN_ACTIVITY%
timeout /t 2 >nul

echo.
echo [2] esamba://tutorials/tuto-03 - lecteur
"%ADB%" shell am start -a android.intent.action.VIEW -d "esamba://tutorials/tuto-03" -n %MAIN_ACTIVITY%
timeout /t 2 >nul

echo.
echo [3] esamba://alerts - non-regression
"%ADB%" shell am start -a android.intent.action.VIEW -d "esamba://alerts" -n %MAIN_ACTIVITY%
timeout /t 2 >nul

echo.
echo [4] esamba://fleet - non-regression
"%ADB%" shell am start -a android.intent.action.VIEW -d "esamba://fleet" -n %MAIN_ACTIVITY%
timeout /t 2 >nul

echo.
echo [5] Retour dashboard ^(launcher^)
"%ADB%" shell am start -n com.esamba.flotte/com.esamba.flotte.MainActivity
timeout /t 2 >nul

echo.
echo [6] Logcat 5s — WebConsole + erreurs
"%ADB%" logcat -d -s "Capacitor/Console" 2>&1 | findstr /i "tutor guide video error Error warn deep"

echo.
echo EXIT_CODE=%ERRORLEVEL%
pause
