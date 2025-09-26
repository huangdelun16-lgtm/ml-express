#!/bin/bash

# Myanmar Express Android Build Script
# 用于构建客户版和骑手版APK

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目信息
PROJECT_NAME="Myanmar Express"
BUILD_DIR="build/outputs/apk"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  $PROJECT_NAME Build Script${NC}"
echo -e "${BLUE}========================================${NC}"

# 检查环境
check_environment() {
    echo -e "${YELLOW}检查构建环境...${NC}"
    
    # 检查Java版本
    if ! command -v java &> /dev/null; then
        echo -e "${RED}错误: 未找到Java，请安装JDK 8或更高版本${NC}"
        exit 1
    fi
    
    # 检查Android SDK
    if [ -z "$ANDROID_HOME" ]; then
        echo -e "${RED}错误: 未设置ANDROID_HOME环境变量${NC}"
        exit 1
    fi
    
    # 检查keystore配置
    if [ ! -f "keystore/keystore.properties" ]; then
        echo -e "${YELLOW}警告: 未找到keystore.properties，将使用debug签名${NC}"
    fi
    
    echo -e "${GREEN}环境检查完成${NC}"
}

# 清理项目
clean_project() {
    echo -e "${YELLOW}清理项目...${NC}"
    ./gradlew clean
    echo -e "${GREEN}项目清理完成${NC}"
}

# 构建客户版
build_customer() {
    echo -e "${YELLOW}构建客户版APK...${NC}"
    
    # Debug版本
    echo -e "${BLUE}构建客户版Debug...${NC}"
    ./gradlew assembleCustomerDebug
    
    # Release版本
    echo -e "${BLUE}构建客户版Release...${NC}"
    ./gradlew assembleCustomerRelease
    
    echo -e "${GREEN}客户版构建完成${NC}"
}

# 构建骑手版
build_courier() {
    echo -e "${YELLOW}构建骑手版APK...${NC}"
    
    # Debug版本
    echo -e "${BLUE}构建骑手版Debug...${NC}"
    ./gradlew assembleCourierDebug
    
    # Release版本
    echo -e "${BLUE}构建骑手版Release...${NC}"
    ./gradlew assembleCourierRelease
    
    echo -e "${GREEN}骑手版构建完成${NC}"
}

# 运行测试
run_tests() {
    echo -e "${YELLOW}运行单元测试...${NC}"
    ./gradlew testCustomerDebugUnitTest
    ./gradlew testCourierDebugUnitTest
    
    echo -e "${YELLOW}运行集成测试...${NC}"
    ./gradlew connectedCustomerDebugAndroidTest
    ./gradlew connectedCourierDebugAndroidTest
    
    echo -e "${GREEN}测试完成${NC}"
}

# 生成构建报告
generate_report() {
    echo -e "${YELLOW}生成构建报告...${NC}"
    
    # APK分析
    ./gradlew analyzeCustomerReleaseBundle
    ./gradlew analyzeCourierReleaseBundle
    
    # 依赖报告
    ./gradlew dependencyInsight --dependency androidx.compose.ui:ui
    
    echo -e "${GREEN}构建报告生成完成${NC}"
}

# 复制APK到输出目录
copy_apks() {
    echo -e "${YELLOW}整理APK文件...${NC}"
    
    OUTPUT_DIR="releases/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$OUTPUT_DIR"
    
    # 复制客户版APK
    if [ -f "app/build/outputs/apk/customer/release/MyanmarExpress-customer-release-v1.0.0.apk" ]; then
        cp "app/build/outputs/apk/customer/release/MyanmarExpress-customer-release-v1.0.0.apk" "$OUTPUT_DIR/"
        echo -e "${GREEN}客户版Release APK已复制到 $OUTPUT_DIR${NC}"
    fi
    
    if [ -f "app/build/outputs/apk/customer/debug/MyanmarExpress-customer-debug-v1.0.0.apk" ]; then
        cp "app/build/outputs/apk/customer/debug/MyanmarExpress-customer-debug-v1.0.0.apk" "$OUTPUT_DIR/"
        echo -e "${GREEN}客户版Debug APK已复制到 $OUTPUT_DIR${NC}"
    fi
    
    # 复制骑手版APK
    if [ -f "app/build/outputs/apk/courier/release/MyanmarExpress-courier-release-v1.0.0.apk" ]; then
        cp "app/build/outputs/apk/courier/release/MyanmarExpress-courier-release-v1.0.0.apk" "$OUTPUT_DIR/"
        echo -e "${GREEN}骑手版Release APK已复制到 $OUTPUT_DIR${NC}"
    fi
    
    if [ -f "app/build/outputs/apk/courier/debug/MyanmarExpress-courier-debug-v1.0.0.apk" ]; then
        cp "app/build/outputs/apk/courier/debug/MyanmarExpress-courier-debug-v1.0.0.apk" "$OUTPUT_DIR/"
        echo -e "${GREEN}骑手版Debug APK已复制到 $OUTPUT_DIR${NC}"
    fi
    
    # 生成构建信息
    cat > "$OUTPUT_DIR/build_info.txt" << EOF
Myanmar Express Build Information
================================
Build Date: $(date)
Git Commit: $(git rev-parse --short HEAD)
Git Branch: $(git rev-parse --abbrev-ref HEAD)
Builder: $(whoami)
Build Host: $(hostname)

APK Files:
$(ls -la "$OUTPUT_DIR"/*.apk 2>/dev/null || echo "No APK files found")
EOF
    
    echo -e "${GREEN}构建信息已保存到 $OUTPUT_DIR/build_info.txt${NC}"
}

# 主函数
main() {
    case "$1" in
        "customer")
            check_environment
            clean_project
            build_customer
            copy_apks
            ;;
        "courier")
            check_environment
            clean_project
            build_courier
            copy_apks
            ;;
        "all")
            check_environment
            clean_project
            build_customer
            build_courier
            copy_apks
            ;;
        "test")
            check_environment
            run_tests
            ;;
        "report")
            check_environment
            generate_report
            ;;
        "clean")
            clean_project
            ;;
        *)
            echo -e "${BLUE}Myanmar Express 构建脚本${NC}"
            echo ""
            echo -e "${YELLOW}使用方法:${NC}"
            echo "  $0 customer    - 构建客户版APK"
            echo "  $0 courier     - 构建骑手版APK"
            echo "  $0 all         - 构建所有版本APK"
            echo "  $0 test        - 运行测试"
            echo "  $0 report      - 生成构建报告"
            echo "  $0 clean       - 清理项目"
            echo ""
            echo -e "${YELLOW}示例:${NC}"
            echo "  $0 all         # 构建客户版和骑手版"
            echo "  $0 customer    # 仅构建客户版"
            echo "  $0 courier     # 仅构建骑手版"
            ;;
    esac
}

# 执行主函数
main "$@"
