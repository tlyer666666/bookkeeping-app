@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist "node_modules\electron\dist\electron.exe" (
  echo 首次使用请先在项目目录执行: npm install
  pause
  exit /b 1
)
start "" "node_modules\electron\dist\electron.exe" .
