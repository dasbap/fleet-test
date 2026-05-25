@echo off
REM Résolution portable de adb.exe — à sourcer via : call scripts\adb-env.bat [check-device]
setlocal EnableExtensions

if defined ESAMBA_ADB (
  if exist "%ESAMBA_ADB%" (
    set "ADB=%ESAMBA_ADB%"
    goto :adb_found
  )
  echo ERREUR: ESAMBA_ADB pointe vers un fichier inexistant: %ESAMBA_ADB%
  exit /b 1
)

if exist "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" (
  set "ADB=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
  goto :adb_found
)

if defined ANDROID_HOME (
  if exist "%ANDROID_HOME%\platform-tools\adb.exe" (
    set "ADB=%ANDROID_HOME%\platform-tools\adb.exe"
    goto :adb_found
  )
)

if defined ANDROID_SDK_ROOT (
  if exist "%ANDROID_SDK_ROOT%\platform-tools\adb.exe" (
    set "ADB=%ANDROID_SDK_ROOT%\platform-tools\adb.exe"
    goto :adb_found
  )
)

echo ERREUR: adb.exe introuvable.
echo Definir ESAMBA_ADB ou installer Android SDK platform-tools.
exit /b 1

:adb_found
if /i "%~1"=="check-device" (
  echo === ADB: %ADB% ===
  "%ADB%" devices
  "%ADB%" devices 2>nul | findstr /r /c:"[0-9A-Za-z][0-9A-Za-z]*[ 	]*device$" >nul
  if errorlevel 1 (
    echo ERREUR: aucun appareil Android connecte ^(USB ou emulateur^).
    exit /b 1
  )
)

endlocal & set "ADB=%ADB%"
exit /b 0
