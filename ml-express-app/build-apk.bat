@echo off
echo ========================================
echo     缅甸快递 APP 构建脚本
echo ========================================
echo.

REM 检查是否在正确目录
if not exist "app\build.gradle.kts" (
    echo 错误: 请在项目根目录执行此脚本
    pause
    exit /b 1
)

echo 开始构建缅甸快递APP...
echo.

REM 清理项目
echo [1/4] 清理项目...
call gradlew.bat clean
if %errorlevel% neq 0 (
    echo 清理失败，请检查环境配置
    pause
    exit /b 1
)

REM 构建客户版Debug APK
echo [2/4] 构建客户版APP...
call gradlew.bat assembleCustomerDebug
if %errorlevel% neq 0 (
    echo 客户版构建失败
    pause
    exit /b 1
)

REM 构建骑手版Debug APK
echo [3/4] 构建骑手版APP...
call gradlew.bat assembleCourierDebug
if %errorlevel% neq 0 (
    echo 骑手版构建失败
    pause
    exit /b 1
)

REM 整理APK文件
echo [4/4] 整理APK文件...
set OUTPUT_DIR=apk-output
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

REM 复制APK文件并重命名
if exist "app\build\outputs\apk\customer\debug\*.apk" (
    for %%f in (app\build\outputs\apk\customer\debug\*.apk) do (
        copy "%%f" "%OUTPUT_DIR%\缅甸快递-客户版.apk"
        echo ✓ 客户版APK: %OUTPUT_DIR%\缅甸快递-客户版.apk
    )
)

if exist "app\build\outputs\apk\courier\debug\*.apk" (
    for %%f in (app\build\outputs\apk\courier\debug\*.apk) do (
        copy "%%f" "%OUTPUT_DIR%\缅甸快递-骑手版.apk"
        echo ✓ 骑手版APK: %OUTPUT_DIR%\缅甸快递-骑手版.apk
    )
)

echo.
echo ========================================
echo           构建完成！
echo ========================================
echo.
echo APK文件位置:
dir "%OUTPUT_DIR%\*.apk" /b 2>nul
echo.
echo 安装方法:
echo 1. 将APK文件传输到Android手机
echo 2. 在手机上点击APK文件
echo 3. 允许"未知来源"安装
echo 4. 点击"安装"
echo.
echo 客户版: 普通用户下单使用
echo 骑手版: 配送员接单使用
echo.

pause

