@echo off
chcp 65001 >nul
cd /d "%~dp0.."
echo =======================================================
echo    🌸 Antigravity Theme Customizer —— 恢复初版黄金基线 
echo =======================================================
echo.
node "%~dp0..\core\theme_engine.js" --baseline
echo.
if /i not "%~1"=="/q" if /i not "%~1"=="-q" pause
