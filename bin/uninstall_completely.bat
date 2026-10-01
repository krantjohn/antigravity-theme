@echo off
chcp 65001 >nul
cd /d "%~dp0.."
echo =======================================================
echo    🗑️ Antigravity Theme —— 完全卸载与官方物理核心还原 
echo =======================================================
echo.
echo 正在执行：物理还原官方原版 app.asar 并彻底移除补丁...
echo.
node "%~dp0..\core\theme_engine.js" --uninstall-completely
echo.
if /i not "%~1"=="/q" if /i not "%~1"=="-q" pause
