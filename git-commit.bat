@echo off
cd /d C:\Users\cnoah\Documents\GitHub\smart-fleet-africa
if exist ".git\index.lock" del /f ".git\index.lock"
if exist ".git\HEAD.lock" del /f ".git\HEAD.lock"
git add -A
git commit -m "feat(search): extend UniversalSearch with static content"
git push
