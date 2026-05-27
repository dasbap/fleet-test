@echo off
cd /d C:\Users\cnoah\Documents\GitHub\smart-fleet-africa\android
call gradlew.bat assembleDebug --no-daemon 2>&1
echo EXIT_CODE=%ERRORLEVEL%
