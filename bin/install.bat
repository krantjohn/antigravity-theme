@echo off
chcp 65001 >nul
cd /d "%~dp0.."
echo =======================================================
echo    🌸 Antigravity Theme Customizer —— 一键全自动安装
echo =======================================================
echo.
echo [1/3] 编译全套主题样式表并同步壁纸素材...
node "%~dp0..\core\theme_engine.js" --rebuild
echo.
echo [2/3] 解包核心文件并注入自启加载引擎...
node "%~dp0..\core\auto_patcher.js"
echo.
echo [3/3] 正在替换核心文件并固化底层...
node "%~dp0..\core\patch_core.js"
echo.
echo ✨ 全部安装完成！已永久固化！
pause
