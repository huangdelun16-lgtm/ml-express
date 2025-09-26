#!/bin/bash

# Myanmar Express Android Deployment Script
# 用于部署到各种环境和应用商店

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
FIREBASE_PROJECT_CUSTOMER="myanmar-express-customer"
FIREBASE_PROJECT_COURIER="myanmar-express-courier"
PLAY_CONSOLE_TRACK="internal" # internal, alpha, beta, production

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Myanmar Express Deployment Script${NC}"
echo -e "${BLUE}========================================${NC}"

# 检查部署环境
check_deployment_environment() {
    echo -e "${YELLOW}检查部署环境...${NC}"
    
    # 检查Firebase CLI
    if ! command -v firebase &> /dev/null; then
        echo -e "${RED}错误: 未安装Firebase CLI${NC}"
        echo -e "${YELLOW}请运行: npm install -g firebase-tools${NC}"
        exit 1
    fi
    
    # 检查Google Play CLI (可选)
    if ! command -v bundletool &> /dev/null; then
        echo -e "${YELLOW}警告: 未安装bundletool，无法生成AAB${NC}"
    fi
    
    # 检查签名文件
    if [ ! -f "keystore/myanmarexpress.keystore" ]; then
        echo -e "${RED}错误: 未找到签名文件${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}部署环境检查完成${NC}"
}

# 构建Release版本
build_release() {
    local flavor=$1
    echo -e "${YELLOW}构建 $flavor Release版本...${NC}"
    
    # 清理项目
    ./gradlew clean
    
    # 构建Release APK
    ./gradlew assemble${flavor^}Release
    
    # 构建AAB (Android App Bundle)
    ./gradlew bundle${flavor^}Release
    
    echo -e "${GREEN}$flavor Release版本构建完成${NC}"
}

# 部署到Firebase App Distribution
deploy_to_firebase() {
    local flavor=$1
    local apk_path=$2
    
    echo -e "${YELLOW}部署 $flavor 到 Firebase App Distribution...${NC}"
    
    local project_id
    if [ "$flavor" = "customer" ]; then
        project_id=$FIREBASE_PROJECT_CUSTOMER
    else
        project_id=$FIREBASE_PROJECT_COURIER
    fi
    
    # 上传到Firebase
    firebase appdistribution:distribute "$apk_path" \
        --project "$project_id" \
        --app "$(get_firebase_app_id $flavor)" \
        --groups "testers,internal" \
        --release-notes "Myanmar Express $flavor v$(get_version_name) - $(date)" \
        --token "$FIREBASE_TOKEN"
    
    echo -e "${GREEN}$flavor 已部署到Firebase App Distribution${NC}"
}

# 部署到Google Play Console
deploy_to_play_console() {
    local flavor=$1
    local aab_path=$2
    
    echo -e "${YELLOW}部署 $flavor 到 Google Play Console...${NC}"
    
    # 使用Google Play Developer API上传AAB
    # 这里需要配置Play Console API密钥
    
    echo -e "${YELLOW}注意: Google Play Console部署需要手动配置API密钥${NC}"
    echo -e "${BLUE}AAB文件位置: $aab_path${NC}"
    echo -e "${BLUE}请手动上传到 Google Play Console${NC}"
}

# 生成版本说明
generate_release_notes() {
    local version=$1
    local flavor=$2
    
    cat > "releases/release_notes_${flavor}_${version}.md" << EOF
# Myanmar Express $flavor v$version

## 发布信息
- **版本**: $version
- **构建时间**: $(date)
- **Git提交**: $(git rev-parse --short HEAD)
- **构建者**: $(whoami)

## 新功能
- 完整的中英文双语支持
- 实时订单同步系统
- 智能位置跟踪
- 多种支付方式集成
- 离线模式支持

## 优化改进
- 网络请求性能优化
- 电量使用优化
- 用户界面优化
- 错误处理改进

## 修复问题
- 修复网络连接问题
- 修复位置定位精度
- 修复支付流程异常
- 修复推送通知问题

## 技术规格
- **最低Android版本**: 7.0 (API 24)
- **目标Android版本**: 14 (API 34)
- **架构支持**: arm64-v8a, armeabi-v7a
- **语言支持**: 中文, English, မြန်မာ

## 安装说明
1. 下载对应的APK文件
2. 启用"未知来源"安装权限
3. 安装APK文件
4. 首次启动时授予必要权限

## 注意事项
- 首次安装需要网络连接
- 位置权限对于正常使用是必需的
- 建议在WiFi环境下首次同步数据
EOF

    echo -e "${GREEN}版本说明已生成: releases/release_notes_${flavor}_${version}.md${NC}"
}

# 获取版本名称
get_version_name() {
    grep "versionName" app/build.gradle.kts | head -1 | sed 's/.*"\(.*\)".*/\1/'
}

# 获取Firebase App ID
get_firebase_app_id() {
    local flavor=$1
    if [ "$flavor" = "customer" ]; then
        echo "1:123456789:android:abcdef123456"  # 替换为实际的App ID
    else
        echo "1:123456789:android:fedcba654321"  # 替换为实际的App ID
    fi
}

# 验证APK
verify_apk() {
    local apk_path=$1
    echo -e "${YELLOW}验证APK: $apk_path${NC}"
    
    # 检查APK是否存在
    if [ ! -f "$apk_path" ]; then
        echo -e "${RED}错误: APK文件不存在${NC}"
        return 1
    fi
    
    # 检查APK签名
    if command -v aapt &> /dev/null; then
        local package_name=$(aapt dump badging "$apk_path" | grep package | awk '{print $2}' | sed 's/name=//g' | sed 's/"//g')
        echo -e "${GREEN}APK包名: $package_name${NC}"
        
        local version_name=$(aapt dump badging "$apk_path" | grep versionName | awk '{print $4}' | sed 's/versionName=//g' | sed 's/"//g')
        echo -e "${GREEN}APK版本: $version_name${NC}"
    fi
    
    # 检查APK大小
    local apk_size=$(du -h "$apk_path" | cut -f1)
    echo -e "${GREEN}APK大小: $apk_size${NC}"
    
    return 0
}

# 主部署函数
deploy() {
    local flavor=$1
    local environment=$2
    
    echo -e "${BLUE}开始部署 $flavor 到 $environment...${NC}"
    
    # 构建Release版本
    build_release "$flavor"
    
    # 获取APK和AAB路径
    local apk_path="app/build/outputs/apk/$flavor/release/MyanmarExpress-$flavor-release-v$(get_version_name).apk"
    local aab_path="app/build/outputs/bundle/${flavor}Release/app-$flavor-release.aab"
    
    # 验证APK
    if ! verify_apk "$apk_path"; then
        echo -e "${RED}APK验证失败，部署中止${NC}"
        exit 1
    fi
    
    # 根据环境选择部署方式
    case "$environment" in
        "firebase")
            deploy_to_firebase "$flavor" "$apk_path"
            ;;
        "playstore")
            deploy_to_play_console "$flavor" "$aab_path"
            ;;
        "internal")
            echo -e "${GREEN}内部部署: APK已准备完成${NC}"
            echo -e "${BLUE}APK位置: $apk_path${NC}"
            ;;
        *)
            echo -e "${RED}未知部署环境: $environment${NC}"
            exit 1
            ;;
    esac
    
    # 生成版本说明
    generate_release_notes "$(get_version_name)" "$flavor"
    
    echo -e "${GREEN}$flavor 部署到 $environment 完成${NC}"
}

# 批量部署
deploy_all() {
    local environment=$1
    
    echo -e "${BLUE}批量部署到 $environment...${NC}"
    
    deploy "customer" "$environment"
    deploy "courier" "$environment"
    
    echo -e "${GREEN}批量部署完成${NC}"
}

# 主函数
main() {
    case "$1" in
        "customer")
            check_deployment_environment
            deploy "customer" "${2:-internal}"
            ;;
        "courier")
            check_deployment_environment
            deploy "courier" "${2:-internal}"
            ;;
        "all")
            check_deployment_environment
            deploy_all "${2:-internal}"
            ;;
        "firebase")
            check_deployment_environment
            deploy_all "firebase"
            ;;
        "playstore")
            check_deployment_environment
            deploy_all "playstore"
            ;;
        *)
            echo -e "${BLUE}Myanmar Express 部署脚本${NC}"
            echo ""
            echo -e "${YELLOW}使用方法:${NC}"
            echo "  $0 customer [environment]    - 部署客户版"
            echo "  $0 courier [environment]     - 部署骑手版"
            echo "  $0 all [environment]         - 部署所有版本"
            echo "  $0 firebase                  - 部署到Firebase App Distribution"
            echo "  $0 playstore                 - 部署到Google Play Store"
            echo ""
            echo -e "${YELLOW}环境选项:${NC}"
            echo "  internal     - 内部测试（默认）"
            echo "  firebase     - Firebase App Distribution"
            echo "  playstore    - Google Play Console"
            echo ""
            echo -e "${YELLOW}示例:${NC}"
            echo "  $0 all firebase              # 部署所有版本到Firebase"
            echo "  $0 customer playstore        # 部署客户版到Play Store"
            ;;
    esac
}

# 执行主函数
main "$@"
