@echo off
chcp 65001 >nul
title Antigravity Theme Studio
cd /d "%~dp0.."

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] 未检测到 Node.js 运行环境，请先安装 Node.js: https://nodejs.org/
    pause
    exit /b 1
)

node "%~dp0..\studio\launcher.js"
