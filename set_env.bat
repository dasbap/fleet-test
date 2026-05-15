@echo off
cd /d C:\Users\cnoah\Documents\GitHub\smart-fleet-africa
vercel env rm VITE_AUTH_PROVIDER production --scope atipik --yes
set /p DUMMY=clerk<nul | vercel env add VITE_AUTH_PROVIDER production --scope atipik
echo DONE
del set_env.bat
