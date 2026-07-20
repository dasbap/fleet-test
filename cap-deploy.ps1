$ErrorActionPreference = "Stop"
$repo = "C:\Users\cnoah\Documents\GitHub\smart-fleet-africa"
$adb  = "C:\Users\cnoah\AppData\Local\Android\Sdk\platform-tools\adb.exe"
$log  = "$repo\cap-deploy.log"

"=== CAP SYNC ===" | Out-File $log -Encoding utf8
Set-Location $repo
& npx cap sync android 2>&1 | Tee-Object -FilePath $log -Append

"=== GRADLE BUILD ===" | Out-File $log -Encoding utf8 -Append
$gradlew = "$repo\android\gradlew.bat"
& $gradlew -p "$repo\android" assembleDebug 2>&1 | Tee-Object -FilePath $log -Append

"=== ADB INSTALL ===" | Out-File $log -Encoding utf8 -Append
$apk = "$repo\android\app\build\outputs\apk\debug\app-debug.apk"
& $adb install -r $apk 2>&1 | Tee-Object -FilePath $log -Append

"=== LAUNCH ===" | Out-File $log -Encoding utf8 -Append
& $adb shell am start -n "com.esamba.flotte/com.esamba.flotte.MainActivity" 2>&1 | Tee-Object -FilePath $log -Append

"=== DONE ===" | Out-File $log -Encoding utf8 -Append
Write-Host "Terminé. Log: $log"
