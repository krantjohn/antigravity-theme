@echo off
chcp 65001 >nul
call "%~dp0restore_original.bat" %*
