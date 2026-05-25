@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
set "PROJECT=%ROOT:~0,-1%"
set "APK=%PROJECT%\android\app\build\outputs\apk\debug\app-debug.apk"
set "MAIN_ACTIVITY=com.esamba.flotte/.MainActivity"

set DO_PUSH=0
set DO_QA=0
set DO_QA_FULL=0

if /i "%ESAMBA_PUSH%"=="1" set DO_PUSH=1

:parse_args
if "%~1"=="" goto args_done
if /i "%~1"=="push" set DO_PUSH=1
if /i "%~1"=="--qa" set DO_QA=1
if /i "%~1"=="--qa-full" (
  set DO_QA=1
  set DO_QA_FULL=1
)
shift
goto parse_args

:args_done

echo ============================================================
echo  REBUILD + INSTALL E-Samba ^(Capacitor + deep links^)
echo ============================================================
echo Options: push=%DO_PUSH% qa=%DO_QA% qa-full=%DO_QA_FULL%
echo.

cd /d "%PROJECT%"

if %DO_PUSH%==1 (
  echo [opt] git push origin main
  git push origin main
  if errorlevel 1 (
    echo WARN: git push echoue — continuer quand meme
  )
  echo.
)

echo [1/4] npm run build:capacitor
call npm run build:capacitor
if errorlevel 1 (
  echo ERREUR: build:capacitor a echoue
  pause
  exit /b 1
)

echo.
echo [2/4] npx cap sync android
call npx cap sync android
if errorlevel 1 (
  echo ERREUR: cap sync a echoue
  pause
  exit /b 1
)

echo.
echo [3/4] Gradle assembleDebug
REM Capacitor Android exige Java 21 — repli sur le JBR d'Android Studio si JAVA_HOME est en 17
if not defined JAVA_HOME goto :try_jbr21
"%JAVA_HOME%\bin\java.exe" -version 2>&1 | findstr /i "version \"21" >nul
if errorlevel 1 goto :try_jbr21
goto :gradle_run
:try_jbr21
if exist "C:\Program Files\Android\Android Studio\jbr\bin\java.exe" (
  set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
  echo INFO: JAVA_HOME=%JAVA_HOME% ^(Java 21 requis par Capacitor^)
)
:gradle_run
cd /d "%PROJECT%\android"
call gradlew.bat assembleDebug
if errorlevel 1 (
  echo ERREUR: Gradle build a echoue
  pause
  exit /b 1
)

echo.
echo [4/4] ADB install APK
cd /d "%PROJECT%"
call "%ROOT%scripts\adb-env.bat" check-device
if errorlevel 1 (
  pause
  exit /b 1
)

"%ADB%" install -r "%APK%"
if errorlevel 1 (
  echo ERREUR: adb install a echoue
  pause
  exit /b 1
)

echo.
echo ============================================================
echo  BUILD + INSTALL OK
echo ============================================================

if %DO_QA%==1 goto run_qa

echo.
echo Deep links tutoriels ^(session connectee recommandee^) :
echo   rebuild-and-install.bat --qa
echo   adb-qa-tutorials.bat
echo.
pause
exit /b 0

:run_qa
if %DO_QA_FULL%==1 (
  echo.
  echo [QA] Suite complete adb-qa-tutorials.bat
  call "%ROOT%adb-qa-tutorials.bat"
  pause
  exit /b %ERRORLEVEL%
)

echo.
echo [QA] esamba://tutorials
"%ADB%" shell am start -a android.intent.action.VIEW -d "esamba://tutorials" -n %MAIN_ACTIVITY%
timeout /t 2 >nul

echo [QA] esamba://tutorials/tuto-03
"%ADB%" shell am start -a android.intent.action.VIEW -d "esamba://tutorials/tuto-03" -n %MAIN_ACTIVITY%
timeout /t 2 >nul

echo.
echo QA rapide terminee. Suite complete: adb-qa-tutorials.bat
pause
exit /b 0
