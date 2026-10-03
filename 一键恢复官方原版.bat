@echo off
chcp 65001 >nul
call "%~dp0bin\restore_original.bat" %*
