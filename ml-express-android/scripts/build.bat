@echo off
REM Myanmar Express Android Build Script for Windows
REM 用于在Windows环境下构建客户版和骑手版APK

setlocal enabledelayedexpansion

set PROJECT_NAME=Myanmar Express
set BUILD_DIR=build\outputs\apk

echo ========================================
echo   %PROJECT_NAME% Build Script (Windows)
echo ========================================

REM 检查环境
:check_environment
echo 检查构建环境...

REM 检查Java版本
java -version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: 未找到Java，请安装JDK 8或更高版本
    exit /b 1
)

REM 检查Android SDK
if "%ANDROID_HOME%"=="" (
    echo 错误: 未设置ANDROID_HOME环境变量
    exit /b 1
)

REM 检查Gradle Wrapper
if not exist "gradlew.bat" (
    echo 错误: 未找到gradlew.bat，请确保在项目根目录执行
    exit /b 1
)

echo 环境检查完成

REM 清理项目
:clean_project
echo 清理项目...
call gradlew.bat clean
if %errorlevel% neq 0 (
    echo 清理失败
    exit /b 1
)
echo 项目清理完成

REM 构建客户版
:build_customer
echo 构建客户版APK...

echo 构建客户版Debug...
call gradlew.bat assembleCustomerDebug
if %errorlevel% neq 0 (
    echo 客户版Debug构建失败
    exit /b 1
)

echo 构建客户版Release...
call gradlew.bat assembleCustomerRelease
if %errorlevel% neq 0 (
    echo 客户版Release构建失败
    exit /b 1
)

echo 客户版构建完成

REM 构建骑手版
:build_courier
echo 构建骑手版APK...

echo 构建骑手版Debug...
call gradlew.bat assembleCourierDebug
if %errorlevel% neq 0 (
    echo 骑手版Debug构建失败
    exit /b 1
)

echo 构建骑手版Release...
call gradlew.bat assembleCourierRelease
if %errorlevel% neq 0 (
    echo 骑手版Release构建失败
    exit /b 1
)

echo 骑手版构建完成

REM 复制APK文件
:copy_apks
echo 整理APK文件...

set OUTPUT_DIR=releases\%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set OUTPUT_DIR=%OUTPUT_DIR: =0%
mkdir "%OUTPUT_DIR%" 2>nul

REM 复制客户版APK
if exist "app\build\outputs\apk\customer\release\*.apk" (
    copy "app\build\outputs\apk\customer\release\*.apk" "%OUTPUT_DIR%\"
    echo 客户版Release APK已复制到 %OUTPUT_DIR%
)

if exist "app\build\outputs\apk\customer\debug\*.apk" (
    copy "app\build\outputs\apk\customer\debug\*.apk" "%OUTPUT_DIR%\"
    echo 客户版Debug APK已复制到 %OUTPUT_DIR%
)

REM 复制骑手版APK
if exist "app\build\outputs\apk\courier\release\*.apk" (
    copy "app\build\outputs\apk\courier\release\*.apk" "%OUTPUT_DIR%\"
    echo 骑手版Release APK已复制到 %OUTPUT_DIR%
)

if exist "app\build\outputs\apk\courier\debug\*.apk" (
    copy "app\build\outputs\apk\courier\debug\*.apk" "%OUTPUT_DIR%\"
    echo 骑手版Debug APK已复制到 %OUTPUT_DIR%
)

REM 生成构建信息
echo Myanmar Express Build Information > "%OUTPUT_DIR%\build_info.txt"
echo ================================ >> "%OUTPUT_DIR%\build_info.txt"
echo Build Date: %date% %time% >> "%OUTPUT_DIR%\build_info.txt"
echo Builder: %USERNAME% >> "%OUTPUT_DIR%\build_info.txt"
echo Build Host: %COMPUTERNAME% >> "%OUTPUT_DIR%\build_info.txt"
echo. >> "%OUTPUT_DIR%\build_info.txt"

dir "%OUTPUT_DIR%\*.apk" >> "%OUTPUT_DIR%\build_info.txt" 2>nul

echo 构建信息已保存到 %OUTPUT_DIR%\build_info.txt

REM 主函数
:main
if "%1"=="customer" (
    call :check_environment
    call :clean_project
    call :build_customer
    call :copy_apks
    goto :end
)

if "%1"=="courier" (
    call :check_environment
    call :clean_project
    call :build_courier
    call :copy_apks
    goto :end
)

if "%1"=="all" (
    call :check_environment
    call :clean_project
    call :build_customer
    call :build_courier
    call :copy_apks
    goto :end
)

if "%1"=="clean" (
    call :clean_project
    goto :end
)

REM 显示帮助信息
echo Myanmar Express 构建脚本 (Windows)
echo.
echo 使用方法:
echo   %0 customer    - 构建客户版APK
echo   %0 courier     - 构建骑手版APK
echo   %0 all         - 构建所有版本APK
echo   %0 clean       - 清理项目
echo.
echo 示例:
echo   %0 all         # 构建客户版和骑手版
echo   %0 customer    # 仅构建客户版
echo   %0 courier     # 仅构建骑手版

:end
echo.
echo 构建脚本执行完成！
pause

