@echo off
cd /d C:\Users\cnoah\Documents\GitHub\smart-fleet-africa

echo === STATUS AVANT ===
git status --short

echo.
echo === STAGE ===
git add src/integrations/supabase/client.ts
git add android/app/capacitor.build.gradle

echo.
echo === DIFF STAGED ===
git diff --cached --stat

echo.
echo === COMMIT ===
git commit -m "fix(mobile): auth Capacitor — implicit flow + Java 17 (capacitor.build.gradle)"

echo.
echo === PUSH ===
git push

echo.
echo EXIT=%ERRORLEVEL%
