@echo off
chcp 65001 >nul
cd /d "%~dp0.."

if "%~1"=="" goto MENU
set "arg1=%~1"
if "%arg1:~0,1%"=="-" (
    node "%~dp0..\core\theme_engine.js" %*
) else (
    node "%~dp0..\core\theme_engine.js" --swap-we %*
)
exit /b %ERRORLEVEL%

:MENU
cls
echo ====================================================================
echo    🎮 Steam Wallpaper Engine 创意工坊壁纸一键选择器
echo ====================================================================
echo.
echo   [1] 浏览已安装壁纸列表 (全部)
echo   [2] 搜索已安装壁纸 (按名称 / ID)
echo   [3] 直接根据序号或创意工坊ID应用壁纸
echo   [4] 查看当前各个槽位状态
echo   [5] 退出
echo.
set "choice="
set /p "choice=请选择操作 (1-5) [默认 1]: "
if not defined choice set "choice=1"
if "%choice%"=="1" goto LIST_ALL
if "%choice%"=="2" goto SEARCH
if "%choice%"=="3" goto DIRECT_APPLY
if "%choice%"=="4" goto VIEW_STATUS
if "%choice%"=="5" goto EXIT
goto MENU

:LIST_ALL
echo.
echo 正在扫描 Steam Wallpaper Engine 壁纸库...
echo.
node "%~dp0..\core\theme_engine.js" --list-we
echo.
goto APPLY_PROMPT

:SEARCH
echo.
set "kw="
set /p "kw=请输入搜索关键词 (直接回车返回): "
if not defined kw goto MENU
set "kw=%kw:"=%"
echo.
node "%~dp0..\core\theme_engine.js" --list-we "%kw%"
echo.
goto APPLY_PROMPT

:DIRECT_APPLY
echo.

:APPLY_PROMPT
set "we_id="
set /p "we_id=请输入壁纸序号或创意工坊ID (输入 0 返回菜单): "
if not defined we_id goto MENU
set "we_id=%we_id:"=%"
if "%we_id%"=="0" goto MENU
set "slot="
set /p "slot=请输入要应用的槽位 (左/中/右/下/设置) [默认 左]: "
if not defined slot set "slot=左"
set "slot=%slot:"=%"
echo.
node "%~dp0..\core\theme_engine.js" --swap-we "%we_id%" "%slot%"
echo.
pause
goto MENU

:VIEW_STATUS
echo.
node "%~dp0..\core\theme_engine.js" --status
echo.
pause
goto MENU

:EXIT
exit /b 0
