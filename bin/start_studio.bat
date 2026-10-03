@echo off
chcp 65001 >nul
title Antigravity Theme Studio - Raycast / Linear 极简便携工坊
cd /d "%~dp0.."

echo =========================================================================
echo    🌸 Antigravity Theme Studio (Raycast / Linear 方案二)
echo =========================================================================
echo  正在启动极简便携工坊...
echo  • 便携零常驻设计：关闭界面窗口即彻底退出，不留任何后台进程
echo  • 0.3 秒无感热重载 · 5 槽位拖拽配置 · Rec. 601 自适应明暗调色 · 预设档案库
echo =========================================================================
echo.

:: 1. 检查 Node.js 运行环境
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ❌ 未检测到 Node.js 运行环境，请先安装 Node.js (https://nodejs.org/)
    pause
    exit /b 1
)

:: 2. 检查可用浏览器 (Edge 或 Chrome App 模式)
set "BROWSER_EXE="
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_EXE=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
) else if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_EXE=C:\Program Files\Microsoft\Edge\Application\msedge.exe"
) else if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_EXE=C:\Program Files\Google\Chrome\Application\chrome.exe"
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_EXE=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
) else if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_EXE=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
)

:: 3. 启动 Studio 本地服务器 (在子进程中运行)
set "STUDIO_PORT=8316"
start "AntigravityStudioServer" /min node "%~dp0..\studio\server.js"

:: 4. 等待服务器就绪
echo 正在建立本地服务连接 (http://127.0.0.1:%STUDIO_PORT%)...
powershell -NoProfile -Command "for ($i=0; $i -lt 15; $i++) { try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:%STUDIO_PORT%/api/status' -UseBasicParsing -TimeoutSec 1; if ($r.StatusCode -eq 200) { exit 0 } } catch {}; Start-Sleep -Milliseconds 250 }; exit 1"

:: 5. 调起独立应用窗口 (App Mode: 纯净无地址栏、无标签页的原生桌面质感)
if defined BROWSER_EXE (
    echo 正在以原生桌面窗口模式调起 Antigravity Studio...
    start "" /wait "%BROWSER_EXE%" --app=http://127.0.0.1:%STUDIO_PORT% --window-size=1280,860 --user-data-dir="%TEMP%\antigravity_studio_profile"
) else (
    echo 未检测到 Edge/Chrome 原生桌面运行器，正在调用系统默认浏览器打开...
    start http://127.0.0.1:%STUDIO_PORT%
)

:: 6. 用户关闭窗口后清理与退出
echo.
echo [Studio] 客户端窗口已关闭，系统安全退出 (零后台残留)。
exit /b 0
