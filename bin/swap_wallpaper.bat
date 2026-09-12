@echo off
chcp 65001 >nul
cd /d "%~dp0.."

if "%~1"=="" goto MENU
set "arg1=%~1"
if "%arg1:~0,1%"=="-" (
    node "%~dp0..\core\theme_engine.js" %*
) else (
    node "%~dp0..\core\theme_engine.js" --swap %*
)
exit /b %ERRORLEVEL%

:MENU
cls
echo =======================================================
echo    🌸 Antigravity Theme Customizer —— 壁纸管理中心
echo =======================================================
echo.
echo   [1] 更换本地壁纸 (输入路径或直接拖入视频/图片)
echo   [2] 浏览 Steam Wallpaper Engine 创意工坊壁纸并选择
echo   [3] 搜索 Steam Wallpaper Engine 创意工坊壁纸
echo   [4] 查看当前各个槽位壁纸状态
echo   [5] 退出
echo.
set "choice="
set /p "choice=请选择操作 (1-5) [默认 1]: "
if not defined choice set "choice=1"
if "%choice%"=="1" goto LOCAL_SWAP
if "%choice%"=="2" goto WE_LIST
if "%choice%"=="3" goto WE_SEARCH
if "%choice%"=="4" goto VIEW_STATUS
if "%choice%"=="5" goto EXIT
goto MENU

:LOCAL_SWAP
echo.
echo -------------------------------------------------------
echo   [1] 更换本地壁纸
echo -------------------------------------------------------
echo 可用槽位：左 (主对话底图) / 中 (活跃终端) / 右 (独立抽屉) / 下 (底部输入框) / 设置
echo 支持格式：.mp4, .webm, .ogg, .jpg, .png, .gif, .webp
echo.
set "slot="
set /p "slot=请输入要更换的槽位 (左/中/右/下/设置) [默认 左]: "
if not defined slot set "slot=左"
set "slot=%slot:"=%"
set "imgpath="
set /p "imgpath=请输入壁纸文件路径 (支持拖入文件到此窗口): "
if not defined imgpath (
    echo ❌ 路径不能为空！
    pause
    goto MENU
)
set "imgpath=%imgpath:"=%"
echo.
node "%~dp0..\core\theme_engine.js" --swap "%slot%" "%imgpath%"
echo.
pause
goto MENU

:WE_LIST
echo.
echo -------------------------------------------------------
echo   [2] Steam Wallpaper Engine 创意工坊壁纸
echo -------------------------------------------------------
echo 正在扫描 Steam 创意工坊壁纸，请稍候...
echo.
node "%~dp0..\core\theme_engine.js" --list-we
echo.
set "we_id="
set /p "we_id=请输入要应用的壁纸序号或创意工坊ID (输入 0 返回菜单): "
if not defined we_id goto MENU
set "we_id=%we_id:"=%"
if "%we_id%"=="0" goto MENU
set "slot="
set /p "slot=请输入要更换的槽位 (左/中/右/下/设置) [默认 左]: "
if not defined slot set "slot=左"
set "slot=%slot:"=%"
echo.
node "%~dp0..\core\theme_engine.js" --swap-we "%we_id%" "%slot%"
echo.
pause
goto MENU

:WE_SEARCH
echo.
echo -------------------------------------------------------
echo   [3] 搜索 Steam Wallpaper Engine 创意工坊壁纸
echo -------------------------------------------------------
set "keyword="
set /p "keyword=请输入搜索关键词 (例如: 碧蓝 / 原神 / 4K / 动态，直接回车返回): "
if not defined keyword goto MENU
set "keyword=%keyword:"=%"
echo.
node "%~dp0..\core\theme_engine.js" --list-we "%keyword%"
echo.
set "we_id="
set /p "we_id=请输入要应用的壁纸序号或创意工坊ID (输入 0 返回菜单): "
if not defined we_id goto MENU
set "we_id=%we_id:"=%"
if "%we_id%"=="0" goto MENU
set "slot="
set /p "slot=请输入要更换的槽位 (左/中/右/下/设置) [默认 左]: "
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
