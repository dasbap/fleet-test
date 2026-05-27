Set-Location "C:\Users\cnoah\Documents\GitHub\smart-fleet-africa"
$result = npm run build -- --mode capacitor 2>&1
$result | Out-File "C:\Users\cnoah\Documents\GitHub\smart-fleet-africa\build-cap.log" -Encoding utf8
Write-Host "Exit: $LASTEXITCODE"
$result | Select-Object -Last 30
