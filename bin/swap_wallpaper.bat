@echo off
chcp 65001 >nul
cd /d "%~dp0.."

if "%~1"=="" goto MENU
set "arg1=%~1"
if /i "%arg1%"=="font" (
    if "%~2"=="" (
        goto FONT_MENU
    ) else (
        node "%~dp0..\core\theme_engine.js" --set-font-color %2 %3 %4
        exit /b %ERRORLEVEL%
    )
)
if /i "%arg1%"=="fonts" (
    node "%~dp0..\core\theme_engine.js" --list-font-colors
    exit /b %ERRORLEVEL%
)
if /i "%arg1%"=="set-font" (
    node "%~dp0..\core\theme_engine.js" --set-font-color %2 %3 %4
    exit /b %ERRORLEVEL%
)
if /i "%arg1%"=="pos" (
    if "%~2"=="" (
        goto POS_MENU
    ) else (
        node "%~dp0..\core\theme_engine.js" --set-pos %2 %3 %4
        exit /b %ERRORLEVEL%
    )
)
if /i "%arg1%"=="position" (
    if "%~2"=="" (
        goto POS_MENU
    ) else (
        node "%~dp0..\core\theme_engine.js" --set-pos %2 %3 %4
        exit /b %ERRORLEVEL%
    )
)
if /i "%arg1%"=="set-pos" (
    node "%~dp0..\core\theme_engine.js" --set-pos %2 %3 %4
    exit /b %ERRORLEVEL%
)
if /i "%arg1%"=="set-position" (
    node "%~dp0..\core\theme_engine.js" --set-pos %2 %3 %4
    exit /b %ERRORLEVEL%
)
if /i "%arg1%"=="adj-pos" (
    node "%~dp0..\core\theme_engine.js" --adj-pos %2 %3 %4
    exit /b %ERRORLEVEL%
)
if /i "%arg1%"=="adjust-pos" (
    node "%~dp0..\core\theme_engine.js" --adj-pos %2 %3 %4
    exit /b %ERRORLEVEL%
)
if /i "%arg1%"=="adjust-position" (
    node "%~dp0..\core\theme_engine.js" --adj-pos %2 %3 %4
    exit /b %ERRORLEVEL%
)
if /i "%arg1%"=="adj" (
    node "%~dp0..\core\theme_engine.js" --adj-pos %2 %3 %4
    exit /b %ERRORLEVEL%
)
if /i "%arg1%"=="reset-pos" (
    node "%~dp0..\core\theme_engine.js" --reset-pos %2
    exit /b %ERRORLEVEL%
)
if /i "%arg1%"=="reset-position" (
    node "%~dp0..\core\theme_engine.js" --reset-pos %2
    exit /b %ERRORLEVEL%
)
if /i "%arg1%"=="reset" (
    node "%~dp0..\core\theme_engine.js" --reset-pos %2
    exit /b %ERRORLEVEL%
)
if /i "%arg1%"=="status" (
    node "%~dp0..\core\theme_engine.js" --status
    exit /b %ERRORLEVEL%
)
if /i "%arg1%"=="slots" (
    node "%~dp0..\core\theme_engine.js" --status
    exit /b %ERRORLEVEL%
)
if /i "%arg1%"=="list-slots" (
    node "%~dp0..\core\theme_engine.js" --status
    exit /b %ERRORLEVEL%
)
if /i "%arg1%"=="preset" (
    if "%~2"=="" (
        goto PRESET_MENU
    ) else (
        node "%~dp0..\core\theme_engine.js" %*
        exit /b %ERRORLEVEL%
    )
)
if /i "%arg1%"=="presets" (
    node "%~dp0..\core\theme_engine.js" --list-presets
    exit /b %ERRORLEVEL%
)
if /i "%arg1%"=="save-preset" (
    node "%~dp0..\core\theme_engine.js" %*
    exit /b %ERRORLEVEL%
)
if /i "%arg1%"=="apply-preset" (
    node "%~dp0..\core\theme_engine.js" %*
    exit /b %ERRORLEVEL%
)
if /i "%arg1%"=="restore-original" (
    node "%~dp0..\core\theme_engine.js" --restore-original
    exit /b %ERRORLEVEL%
)
if /i "%arg1%"=="vanilla" (
    node "%~dp0..\core\theme_engine.js" --restore-original
    exit /b %ERRORLEVEL%
)
if /i "%arg1%"=="original" (
    node "%~dp0..\core\theme_engine.js" --restore-original
    exit /b %ERRORLEVEL%
)
if "%arg1:~0,1%"=="-" (
    node "%~dp0..\core\theme_engine.js" %*
) else (
    node "%~dp0..\core\theme_engine.js" --swap %*
)
exit /b %ERRORLEVEL%

:MENU
cls
echo =======================================================
echo    🌸 Antigravity Theme Customizer —— 壁纸与样式主菜单 
echo =======================================================
echo.
echo   [1] 更换本地壁纸 (输入路径或直接拖入视频/图片)
echo   [2] 浏览 Steam Wallpaper Engine 创意工坊壁纸并选择 
echo   [3] 搜索 Steam Wallpaper Engine 创意工坊壁纸 
echo   [4] 调节各个位置壁纸的位置 (上下/左右微调与居中复位)
echo   [5] 自定义字体颜色与预设 (解决亮/暗壁纸字体不清问题)
echo   [6] 预设管理中心 (保存当前壁纸全套配置 / 一键切换预设)
echo   [7] 查看当前各个槽位与字体状态 
echo   [8] 一键恢复官方原版 (纯净无壁纸，极致流畅，自动备份当前配置)
echo   [9] 退出 
echo.
set "choice="
set /p "choice=请选择操作 (1-9) [默认 1]: "
if not defined choice set "choice=1"
if "%choice%"=="1" goto LOCAL_SWAP
if "%choice%"=="2" goto WE_LIST
if "%choice%"=="3" goto WE_SEARCH
if "%choice%"=="4" goto POS_MENU
if "%choice%"=="5" goto FONT_MENU
if "%choice%"=="6" goto PRESET_MENU
if "%choice%"=="7" goto VIEW_STATUS
if "%choice%"=="8" goto RESTORE_ORIGINAL_PROMPT
if "%choice%"=="9" goto EXIT
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

:POS_MENU
cls
echo =======================================================
echo    🎯 [4] 调节各个位置壁纸的位置 (上下/左右微调与居中复位)
echo =======================================================
echo.
echo 可用槽位：左 (主对话底图) / 中 (活跃终端) / 右 (独立抽屉) / 下 (底部输入框) / 设置
echo.
node "%~dp0..\core\theme_engine.js" --status
echo.
set "pslot="
set /p "pslot=请输入要调节位置的槽位 (左/中/右/下/设置，输入 0 返回菜单) [默认 左]: "
if not defined pslot set "pslot=左"
set "pslot=%pslot:"=%"
if "%pslot%"=="0" goto MENU

:POS_LOOP
echo.
echo -------------------------------------------------------
echo   正在调节槽位: 【%pslot%】
echo   操作选项:
echo     [1] 或 [W] 向上微调 (y - 5%%)    [2] 或 [S] 向下微调 (y + 5%%)
echo     [3] 或 [A] 向左微调 (x - 5%%)    [4] 或 [D] 向右微调 (x + 5%%)
echo     [5] 或 [C] 设为正中心 (50%% 50%%) [6] 或 [R] 恢复默认位置
echo     或直接输入精确坐标 (例如: 50%% 30%% 或 center 20%% 或 居中 上)
echo     [0] 返回上级菜单
echo -------------------------------------------------------
set "paction="
set /p "paction=请输入操作 (1-6/W/S/A/D/C/R/坐标/0) [默认 W]: "
if not defined paction set "paction=W"
set "paction=%paction:"=%"
if "%paction%"=="0" goto MENU
if /i "%paction%"=="W" goto POS_UP
if "%paction%"=="1" goto POS_UP
if "%paction%"=="上" goto POS_UP
if /i "%paction%"=="S" goto POS_DOWN
if "%paction%"=="2" goto POS_DOWN
if "%paction%"=="下" goto POS_DOWN
if /i "%paction%"=="A" goto POS_LEFT
if "%paction%"=="3" goto POS_LEFT
if "%paction%"=="左" goto POS_LEFT
if /i "%paction%"=="D" goto POS_RIGHT
if "%paction%"=="4" goto POS_RIGHT
if "%paction%"=="右" goto POS_RIGHT
if /i "%paction%"=="C" goto POS_CENTER
if "%paction%"=="5" goto POS_CENTER
if "%paction%"=="中" goto POS_CENTER
if "%paction%"=="居中" goto POS_CENTER
if /i "%paction%"=="R" goto POS_RESET
if "%paction%"=="6" goto POS_RESET
if "%paction%"=="复位" goto POS_RESET
if "%paction%"=="恢复" goto POS_RESET

node "%~dp0..\core\theme_engine.js" --set-pos "%pslot%" "%paction%"
goto POS_LOOP

:POS_UP
node "%~dp0..\core\theme_engine.js" --adj-pos "%pslot%" up 5
goto POS_LOOP

:POS_DOWN
node "%~dp0..\core\theme_engine.js" --adj-pos "%pslot%" down 5
goto POS_LOOP

:POS_LEFT
node "%~dp0..\core\theme_engine.js" --adj-pos "%pslot%" left 5
goto POS_LOOP

:POS_RIGHT
node "%~dp0..\core\theme_engine.js" --adj-pos "%pslot%" right 5
goto POS_LOOP

:POS_CENTER
node "%~dp0..\core\theme_engine.js" --set-pos "%pslot%" 50% 50%
goto POS_LOOP

:POS_RESET
node "%~dp0..\core\theme_engine.js" --reset-pos "%pslot%"
goto POS_LOOP

:FONT_MENU
echo.
echo -------------------------------------------------------
echo   [5] 自定义字体颜色 (适配亮/暗/二次元壁纸，字迹极清)
echo -------------------------------------------------------
echo.
node "%~dp0..\core\theme_engine.js" --list-font-colors
echo.
set "fchoice="
set /p "fchoice=请输入预设序号(1-6)、预设名或自定义Hex代码 (例如 #ffffff / #1a1a2e，输入 0 返回): "
if not defined fchoice goto MENU
set "fchoice=%fchoice:"=%"
if "%fchoice%"=="0" goto MENU
echo.
node "%~dp0..\core\theme_engine.js" --set-font-color "%fchoice%"
echo.
pause
goto MENU

:PRESET_MENU
call "%~dp0preset_manager.bat"
goto MENU

:VIEW_STATUS
echo.
node "%~dp0..\core\theme_engine.js" --status
echo.
pause
goto MENU

:RESTORE_ORIGINAL_PROMPT
echo.
echo -------------------------------------------------------
echo   [8] 一键恢复官方原版纯净模式 
echo -------------------------------------------------------
echo 恢复官方原生深色外观，彻底关闭壁纸与视频硬件解码，恢复极致性能。
echo 系统将自动把当前个性化壁纸与位置备份为预设【恢复原版前的个性化配置】。
echo.
set "confirm_orig="
set /p "confirm_orig=确定要恢复官方原版纯净模式吗？(Y/n): "
if /i "%confirm_orig%"=="n" (
    echo 已取消恢复。
    pause
    goto MENU
)
echo.
node "%~dp0..\core\theme_engine.js" --restore-original
echo.
pause
goto MENU

:EXIT
exit /b 0
