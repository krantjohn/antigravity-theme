@echo off
chcp 65001 >nul
cd /d "%~dp0\.."
node core/theme_engine.js --baseline
pause
