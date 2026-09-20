@echo off
chcp 65001 >nul
cd /d "%~dp0.."
echo =======================================================
echo    🛡️ Antigravity Theme —— 恢复官方原版纯净模式 
echo =======================================================
echo.
echo 正在执行：一键恢复 Google Antigravity 官方原汁原味原生外观与性能...
echo (系统将自动为当前个性化壁纸与位置建立安全快照预设，绝不丢失配置)
echo.
node "%~dp0..\core\theme_engine.js" --restore-original
echo.
if /i not "%~1"=="/q" if /i not "%~1"=="-q" pause
