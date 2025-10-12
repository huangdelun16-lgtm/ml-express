@echo off
chcp 65001 >nul
echo ========================================
echo   ML Express - 完全清理并启动
echo ========================================
echo.

cd /d "%~dp0"
echo [1/5] 当前目录: %CD%
echo.

echo [2/5] 停止所有 Node.js 进程...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul
echo       完成！
echo.

echo [3/5] 清理缓存...
if exist ".expo" (
    rmdir /s /q ".expo"
    echo       已删除 .expo 文件夹
)
if exist "node_modules\.cache" (
    rmdir /s /q "node_modules\.cache"
    echo       已删除 node_modules 缓存
)
echo       完成！
echo.

echo [4/5] 清理 Metro Bundler 缓存...
call npx expo start --clear --no-dev --minify 2>nul
timeout /t 1 /nobreak >nul
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul
echo       完成！
echo.

echo [5/5] 启动应用...
echo.
echo ========================================
echo   正在启动... 请等待二维码出现
echo ========================================
echo.

call npm start

pause


