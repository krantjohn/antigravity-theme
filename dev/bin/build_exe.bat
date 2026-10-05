@echo off
chcp 65001 >nul
cd /d "%~dp0..\.."

echo [INFO] Building AntigravityThemeStudio.exe...
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe /target:winexe /win32icon:studio\app.ico /out:AntigravityThemeStudio.exe studio\src\Program.cs

if %ERRORLEVEL% equ 0 (
    echo [SUCCESS] AntigravityThemeStudio.exe built successfully!
) else (
    echo [ERROR] Build failed with error code %ERRORLEVEL%
)
pause
