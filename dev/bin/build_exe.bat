@echo off
chcp 65001 >nul
cd /d "%~dp0..\.."

echo [INFO] Checking WebView2 SDK dependencies...
if not exist "studio\lib\Microsoft.Web.WebView2.Core.dll" (
    echo [INFO] Fetching WebView2 assemblies...
    powershell -NoProfile -ExecutionPolicy Bypass -File "dev\bin\get_webview2.ps1"
)

echo [INFO] Compiling AntigravityThemeStudio.exe - Single-File Native WebView2 Container...
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe /target:winexe /platform:x64 /win32icon:studio\app.ico /win32manifest:studio\app.manifest /r:System.dll /r:System.Drawing.dll /r:System.Windows.Forms.dll /r:studio\lib\Microsoft.Web.WebView2.Core.dll /r:studio\lib\Microsoft.Web.WebView2.WinForms.dll /resource:studio\lib\Microsoft.Web.WebView2.Core.dll,Microsoft.Web.WebView2.Core.dll /resource:studio\lib\Microsoft.Web.WebView2.WinForms.dll,Microsoft.Web.WebView2.WinForms.dll /resource:studio\lib\WebView2Loader.dll,WebView2Loader.dll /out:AntigravityThemeStudio.exe studio\src\Program.cs

if %ERRORLEVEL% equ 0 (
    echo [SUCCESS] AntigravityThemeStudio.exe single-file executable built successfully!
) else (
    echo [ERROR] Build failed with error code %ERRORLEVEL%
)

if "%1" neq "--no-pause" (
    pause
)
exit /b %ERRORLEVEL%
