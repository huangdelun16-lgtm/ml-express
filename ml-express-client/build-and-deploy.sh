#!/bin/bash

# MARKET LINK EXPRESS - iOS Store 构建和部署脚本
# 使用方法: ./build-and-deploy.sh [environment]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查环境
check_environment() {
    log_info "检查构建环境..."
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装"
        exit 1
    fi
    
    # 检查npm
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安装"
        exit 1
    fi
    
    # 检查EAS CLI
    if ! command -v eas &> /dev/null; then
        log_warning "EAS CLI 未安装，正在安装..."
        npm install -g @expo/eas-cli
    fi
    
    # 检查是否登录
    if ! eas whoami &> /dev/null; then
        log_error "请先登录 EAS: eas login"
        exit 1
    fi
    
    log_success "环境检查完成"
}

# 安装依赖
install_dependencies() {
    log_info "安装项目依赖..."
    npm install
    log_success "依赖安装完成"
}

# 代码检查
run_linting() {
    log_info "运行代码检查..."
    
    # TypeScript检查
    if command -v tsc &> /dev/null; then
        npx tsc --noEmit
        log_success "TypeScript检查通过"
    fi
    
    # ESLint检查
    if [ -f ".eslintrc.js" ] || [ -f ".eslintrc.json" ]; then
        npx eslint . --ext .ts,.tsx,.js,.jsx || log_warning "ESLint检查发现问题"
    fi
    
    log_success "代码检查完成"
}

# 构建应用
build_app() {
    local environment=${1:-production}
    
    log_info "开始构建应用 (环境: $environment)..."
    
    case $environment in
        "development")
            eas build --platform ios --profile development --non-interactive
            ;;
        "preview")
            eas build --platform ios --profile preview --non-interactive
            ;;
        "production")
            eas build --platform ios --profile production --non-interactive
            ;;
        *)
            log_error "未知环境: $environment"
            exit 1
            ;;
    esac
    
    log_success "应用构建完成"
}

# 提交到App Store
submit_to_app_store() {
    log_info "提交应用到App Store..."
    
    eas submit --platform ios --profile production --non-interactive
    
    log_success "应用已提交到App Store"
}

# 更新版本号
update_version() {
    local version_type=${1:-patch}
    
    log_info "更新版本号 ($version_type)..."
    
    npm version $version_type
    
    # 更新app.json中的版本号
    local new_version=$(node -p "require('./package.json').version")
    node -e "
        const fs = require('fs');
        const appJson = JSON.parse(fs.readFileSync('./app.json', 'utf8'));
        appJson.expo.version = '$new_version';
        appJson.expo.ios.buildNumber = (parseInt(appJson.expo.ios.buildNumber) + 1).toString();
        fs.writeFileSync('./app.json', JSON.stringify(appJson, null, 2));
    "
    
    log_success "版本号已更新为 $new_version"
}

# 生成构建报告
generate_build_report() {
    local environment=${1:-production}
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local report_file="build_report_${environment}_${timestamp}.md"
    
    log_info "生成构建报告..."
    
    cat > $report_file << EOF
# MARKET LINK EXPRESS 构建报告

**构建时间**: $(date)
**环境**: $environment
**版本**: $(node -p "require('./package.json').version")
**构建号**: $(node -p "require('./app.json').expo.ios.buildNumber")

## 构建信息

- **平台**: iOS
- **Bundle ID**: com.mlexpress.client
- **应用名称**: MARKET LINK EXPRESS
- **Expo SDK**: $(node -p "require('./app.json').expo.expo")

## 功能特性

- ✅ 用户注册和登录
- ✅ 包裹下单功能
- ✅ 实时追踪功能
- ✅ 地图和位置服务
- ✅ 多语言支持
- ✅ 推送通知
- ✅ 价格计算
- ✅ 订单管理

## 技术栈

- **框架**: React Native + Expo
- **语言**: TypeScript
- **状态管理**: React Context
- **导航**: React Navigation
- **地图**: React Native Maps
- **通知**: Expo Notifications
- **存储**: AsyncStorage

## 构建配置

- **EAS Build**: 启用
- **代码签名**: 自动
- **测试**: TestFlight
- **发布**: App Store Connect

## 下一步

1. 等待App Store审核
2. 监控用户反馈
3. 准备下个版本更新
4. 优化性能和用户体验

---
*此报告由构建脚本自动生成*
EOF
    
    log_success "构建报告已生成: $report_file"
}

# 主函数
main() {
    local environment=${1:-production}
    
    log_info "开始 MARKET LINK EXPRESS iOS 构建和部署流程..."
    log_info "环境: $environment"
    
    # 检查环境
    check_environment
    
    # 安装依赖
    install_dependencies
    
    # 代码检查
    run_linting
    
    # 构建应用
    build_app $environment
    
    # 如果是生产环境，提交到App Store
    if [ "$environment" = "production" ]; then
        submit_to_app_store
    fi
    
    # 生成构建报告
    generate_build_report $environment
    
    log_success "构建和部署流程完成！"
    
    if [ "$environment" = "production" ]; then
        log_info "应用已提交到App Store，请等待审核"
        log_info "您可以在App Store Connect中查看审核状态"
    else
        log_info "构建完成，您可以在TestFlight中测试应用"
    fi
}

# 帮助信息
show_help() {
    echo "MARKET LINK EXPRESS - iOS 构建和部署脚本"
    echo ""
    echo "使用方法:"
    echo "  $0 [environment]"
    echo ""
    echo "环境选项:"
    echo "  development  - 开发环境构建"
    echo "  preview      - 预览环境构建"
    echo "  production   - 生产环境构建 (默认)"
    echo ""
    echo "示例:"
    echo "  $0                    # 生产环境构建"
    echo "  $0 development        # 开发环境构建"
    echo "  $0 preview           # 预览环境构建"
    echo ""
    echo "其他命令:"
    echo "  $0 version patch      # 更新补丁版本"
    echo "  $0 version minor      # 更新次要版本"
    echo "  $0 version major      # 更新主要版本"
    echo "  $0 help              # 显示此帮助信息"
}

# 处理命令行参数
case "${1:-}" in
    "help"|"-h"|"--help")
        show_help
        exit 0
        ;;
    "version")
        update_version $2
        exit 0
        ;;
    *)
        main $1
        ;;
esac

