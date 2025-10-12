@echo off
echo ========================================
echo   启动 ML Express 移动应用
echo ========================================
echo.

cd /d "%~dp0"
echo 当前目录: %CD%
echo.

echo 正在启动 Expo...
echo.

npm start

pause


