@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
call "%ROOT%scripts\adb-env.bat"
if errorlevel 1 (
  pause
  exit /b 1
)

echo Logcat en direct — Ctrl+C pour stopper
if "%~1"=="" (
  "%ADB%" logcat -v time 2>nul | findstr /i "Console tutorial tuto offline download video error Error FATAL supabase auth warning DeepLink"
) else (
  "%ADB%" logcat -v time --pid=%~1 2>nul | findstr /i "Console tutorial tuto offline download video error Error FATAL supabase auth warning DeepLink"
)
