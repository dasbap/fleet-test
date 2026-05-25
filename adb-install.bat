@echo off
set ADB=C:\Users\cnoah\AppData\Local\Android\Sdk\platform-tools\adb.exe
set APK=C:\Users\cnoah\Documents\GitHub\smart-fleet-africa\android\app\build\outputs\apk\debug\app-debug.apk

echo === ADB DEVICES ===
%ADB% devices

echo === INSTALL ===
%ADB% install -r "%APK%"

echo === LAUNCH ===
%ADB% shell am start -n com.esamba.flotte/com.esamba.flotte.MainActivity

echo EXIT_CODE=%ERRORLEVEL%
