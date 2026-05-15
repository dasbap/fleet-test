@echo off
cd /d C:\Users\cnoah\Documents\GitHub\smart-fleet-africa
if exist .git\HEAD.lock del .git\HEAD.lock
del check_json.py 2>nul
git add vercel.json
git commit -m "fix: vercel.json valid JSON"
git push origin main
npx vercel env rm VITE_AUTH_PROVIDER production --scope atipik --yes
echo clerk | npx vercel env add VITE_AUTH_PROVIDER production --scope atipik
del deploy.bat
echo DONE
