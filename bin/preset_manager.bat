@echo off
chcp 65001 >nul
cd /d "%~dp0.."

if "%~1"=="" goto MENU
set "arg1=%~1"

if /i "%arg1%"=="list" (
    node "%~dp0..\core\theme_engine.js" --list-presets
    exit /b %ERRORLEVEL%
)
if /i "%arg1%"=="presets" (
    node "%~dp0..\core\theme_engine.js" --list-presets
    exit /b %ERRORLEVEL%
)
if /i "%arg1%"=="save" (
    if "%~2"=="" (
        goto SAVE_PROMPT
    ) else (
        node "%~dp0..\core\theme_engine.js" %*
        exit /b %ERRORLEVEL%
    )
)
if /i "%arg1%"=="save-preset" (
    node "%~dp0..\core\theme_engine.js" %*
    exit /b %ERRORLEVEL%
)
if /i "%arg1%"=="apply" (
    if "%~2"=="" (
        goto APPLY_PROMPT
    ) else (
        node "%~dp0..\core\theme_engine.js" %*
        exit /b %ERRORLEVEL%
    )
)
if /i "%arg1%"=="apply-preset" (
    node "%~dp0..\core\theme_engine.js" %*
    exit /b %ERRORLEVEL%
)
if /i "%arg1%"=="load" (
    node "%~dp0..\core\theme_engine.js" %*
    exit /b %ERRORLEVEL%
)
if /i "%arg1%"=="info" (
    if "%~2"=="" (
        goto INFO_PROMPT
    ) else (
        node "%~dp0..\core\theme_engine.js" %*
        exit /b %ERRORLEVEL%
    )
)
if /i "%arg1%"=="show" (
    if "%~2"=="" (
        goto INFO_PROMPT
    ) else (
        node "%~dp0..\core\theme_engine.js" %*
        exit /b %ERRORLEVEL%
    )
)
if /i "%arg1%"=="del" (
    if "%~2"=="" (
        goto DEL_PROMPT
    ) else (
        node "%~dp0..\core\theme_engine.js" %*
        exit /b %ERRORLEVEL%
    )
)
if /i "%arg1%"=="delete" (
    if "%~2"=="" (
        goto DEL_PROMPT
    ) else (
        node "%~dp0..\core\theme_engine.js" %*
        exit /b %ERRORLEVEL%
    )
)
if "%arg1:~0,1%"=="-" (
    node "%~dp0..\core\theme_engine.js" %*
) else (
    node "%~dp0..\core\theme_engine.js" --apply-preset "%~1"
)
exit /b %ERRORLEVEL%

:MENU
cls
echo =======================================================
echo    📦 Antigravity Theme —— 壁纸预设管理中心 
echo =======================================================
echo.
echo   [1] 查看所有已保存的预设列表 
echo   [2] 一键应用/切换指定预设 (输入预设名称或序号)
echo   [3] 保存当前壁纸与位置为新预设 
echo   [4] 查看指定预设的详细信息 
echo   [5] 删除指定预设 
echo   [6] 打开壁纸与样式主菜单 (更换壁纸/微调位置/字体)
echo   [0] 退出 
echo.
set "choice="
set /p "choice=请选择操作 (0-6) [默认 1]: "
if not defined choice set "choice=1"
if "%choice%"=="1" goto LIST_PRESETS
if "%choice%"=="2" goto APPLY_PROMPT
if "%choice%"=="3" goto SAVE_PROMPT
if "%choice%"=="4" goto INFO_PROMPT
if "%choice%"=="5" goto DEL_PROMPT
if "%choice%"=="6" goto GOTO_MAIN_MENU
if "%choice%"=="0" goto EXIT
goto MENU

:LIST_PRESETS
echo.
node "%~dp0..\core\theme_engine.js" --list-presets
echo.
pause
goto MENU

:APPLY_PROMPT
echo.
echo -------------------------------------------------------
echo   [2] 一键应用/切换壁纸预设 
echo -------------------------------------------------------
node "%~dp0..\core\theme_engine.js" --list-presets
echo.
set "target_preset="
set /p "target_preset=请输入要应用的预设名称或序号 (输入 0 返回菜单): "
if not defined target_preset goto MENU
set "target_preset=%target_preset:"=%"
if "%target_preset%"=="0" goto MENU
echo.
node "%~dp0..\core\theme_engine.js" --apply-preset "%target_preset%"
echo.
pause
goto MENU

:SAVE_PROMPT
echo.
echo -------------------------------------------------------
echo   [3] 保存当前壁纸全套配置为新预设 
echo -------------------------------------------------------
echo 将自动归档所有槽位的素材文件(视频/图片/海报)、位置坐标及字体配色。
echo.
set "pname="
set /p "pname=请输入新预设的名称 (例如: 赛博朋克 / 二次元纯白，输入 0 取消): "
if not defined pname goto MENU
set "pname=%pname:"=%"
if "%pname%"=="0" goto MENU
set "pdesc="
set /p "pdesc=请输入预设描述 (可选，直接回车使用默认描述): "
if defined pdesc set "pdesc=%pdesc:"=%"
echo.
if defined pdesc (
    node "%~dp0..\core\theme_engine.js" --save-preset "%pname%" "%pdesc%"
) else (
    node "%~dp0..\core\theme_engine.js" --save-preset "%pname%"
)
echo.
pause
goto MENU

:INFO_PROMPT
echo.
echo -------------------------------------------------------
echo   [4] 查看预设详细信息 
echo -------------------------------------------------------
node "%~dp0..\core\theme_engine.js" --list-presets
echo.
set "info_target="
set /p "info_target=请输入要查看详情的预设名称或序号 (输入 0 返回): "
if not defined info_target goto MENU
set "info_target=%info_target:"=%"
if "%info_target%"=="0" goto MENU
echo.
node "%~dp0..\core\theme_engine.js" --show-preset "%info_target%"
echo.
pause
goto MENU

:DEL_PROMPT
echo.
echo -------------------------------------------------------
echo   [5] 删除指定预设 
echo -------------------------------------------------------
node "%~dp0..\core\theme_engine.js" --list-presets
echo.
set "del_target="
set /p "del_target=请输入要删除的预设名称或序号 (输入 0 返回): "
if not defined del_target goto MENU
set "del_target=%del_target:"=%"
if "%del_target%"=="0" goto MENU
echo.
set "confirm_del="
set /p "confirm_del=⚠️ 确定要永久删除预设【%del_target%】吗？(y/N): "
if /i not "%confirm_del%"=="y" (
    echo 已取消删除。
    pause
    goto MENU
)
echo.
node "%~dp0..\core\theme_engine.js" --delete-preset "%del_target%"
echo.
pause
goto MENU

:GOTO_MAIN_MENU
call "%~dp0swap_wallpaper.bat"
goto MENU

:EXIT
exit /b 0
