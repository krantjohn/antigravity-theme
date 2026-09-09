@echo off
chcp 65001 >nul
cd /d "%~dp0\.."
echo =======================================================
echo    🌸 Antigravity Theme Customizer —— 一键更换壁纸
echo =======================================================
echo.
echo 可用槽位列表：
echo   [左] - 全局主对话底图 / 全景底座
echo   [中] - 活跃终端面板壁纸
echo   [右] - 右侧独立抽屉壁纸
echo   [下] - 底部提问输入框插画
echo   [设置] - 设置面板壁纸
echo.
set /p slot="请输入要更换的槽位 (左/中/右/下/设置): "
set /p imgpath="请输入图片绝对路径 (或将图片直接拖入此窗口): "
echo.
set imgpath=%imgpath:"=%
node core/theme_engine.js --swap "%slot%" "%imgpath%"
echo.
pause
