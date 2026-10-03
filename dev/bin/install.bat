@echo off
chcp 65001 >nul
cd /d "%~dp0..\.."
echo =======================================================
echo    ⚡ Antigravity 美化核心 —— 一键安全注入 / 更新重补
echo =======================================================
echo.
echo 正在检测运行环境与官方核心状态...
node -e "const te = require('./core/theme_engine'); te.installPatch().then(r => { console.log('\n✨ 核心注入成功！8314 CDP 与 8315 流媒体双引擎已就绪！'); process.exit(0); }).catch(e => { console.error('\n❌ 注入失败:', e); process.exit(1); });"
if %ERRORLEVEL% equ 0 (
    echo.
    echo =======================================================
    echo   [完成] 底层美化环境已就绪！可随时启动主题工坊更换壁纸。
    echo =======================================================
) else (
    echo.
    echo =======================================================
    echo   [错误] 注入遇到问题，请检查 Antigravity 是否正确安装。
    echo =======================================================
)
echo.
pause
