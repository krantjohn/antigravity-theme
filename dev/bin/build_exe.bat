@echo off
chcp 65001 >nul
cd /d "%~dp0..\.."

echo [INFO] Building studio\crt_animator.exe...
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe /target:winexe /out:studio\crt_animator.exe studio\src\CrtAnimator.cs

echo [INFO] Building AntigravityThemeStudio.exe...
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe /target:winexe /win32icon:studio\app.ico /out:AntigravityThemeStudio.exe studio\src\Program.cs

if %ERRORLEVEL% equ 0 (
    echo [SUCCESS] All executables built successfully!
) else (
    echo [ERROR] Build failed with error code %ERRORLEVEL%
)

if "%1" neq "--no-pause" (
    pause
)
exit /b %ERRORLEVEL%
