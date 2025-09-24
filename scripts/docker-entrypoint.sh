#!/bin/bash
# =============================================
# 缅甸快递系统 Docker 启动脚本
# Myanmar Express Docker Entrypoint
# =============================================

set -e

# 颜色输出
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

# 设置缅甸时区
setup_timezone() {
    log_info "设置时区为缅甸时间 (Asia/Yangon)"
    export TZ=Asia/Yangon
    echo "Asia/Yangon" > /etc/timezone
    if [ -f /usr/share/zoneinfo/Asia/Yangon ]; then
        ln -sf /usr/share/zoneinfo/Asia/Yangon /etc/localtime
        log_success "时区设置完成"
    else
        log_warning "时区文件不存在，使用系统默认时区"
    fi
}

# 创建必要目录
create_directories() {
    log_info "创建必要目录"
    
    directories=(
        "/var/log/nginx"
        "/var/cache/nginx"
        "/etc/nginx/ssl"
        "/usr/share/nginx/html/uploads"
        "/var/www/certbot"
    )
    
    for dir in "${directories[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            log_info "创建目录: $dir"
        fi
    done
    
    # 设置权限
    chown -R nginx:nginx /var/log/nginx /var/cache/nginx /usr/share/nginx/html
    chmod -R 755 /usr/share/nginx/html
    
    log_success "目录创建完成"
}

# 生成自签名 SSL 证书（如果不存在）
generate_ssl_cert() {
    local ssl_dir="/etc/nginx/ssl"
    local cert_file="$ssl_dir/fullchain.pem"
    local key_file="$ssl_dir/privkey.pem"
    
    if [ ! -f "$cert_file" ] || [ ! -f "$key_file" ]; then
        log_info "生成自签名 SSL 证书"
        
        # 创建 SSL 目录
        mkdir -p "$ssl_dir"
        
        # 生成私钥
        openssl genrsa -out "$key_file" 2048
        
        # 生成证书
        openssl req -new -x509 -key "$key_file" -out "$cert_file" -days 365 -subj \
            "/C=MM/ST=Yangon/L=Yangon/O=Myanmar Express/OU=IT Department/CN=${NGINX_HOST:-localhost}"
        
        # 设置权限
        chmod 600 "$key_file"
        chmod 644 "$cert_file"
        
        log_warning "使用自签名证书，生产环境请使用 Let's Encrypt"
    else
        log_info "SSL 证书已存在"
    fi
}

# 配置 Nginx
configure_nginx() {
    log_info "配置 Nginx"
    
    # 替换环境变量
    if [ -n "$NGINX_HOST" ]; then
        log_info "设置域名: $NGINX_HOST"
        envsubst '${NGINX_HOST}' < /etc/nginx/conf.d/default.conf > /tmp/default.conf
        mv /tmp/default.conf /etc/nginx/conf.d/default.conf
    fi
    
    # 测试 Nginx 配置
    if nginx -t; then
        log_success "Nginx 配置测试通过"
    else
        log_error "Nginx 配置测试失败"
        exit 1
    fi
}

# 设置健康检查页面
setup_health_check() {
    log_info "设置健康检查页面"
    
    cat > /usr/share/nginx/html/health << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Myanmar Express - Health Check</title>
    <meta charset="utf-8">
</head>
<body>
    <h1>Myanmar Express Delivery System</h1>
    <p>Status: <span style="color: green;">Healthy</span></p>
    <p>Time: <span id="time"></span></p>
    <p>Timezone: Asia/Yangon</p>
    <script>
        document.getElementById('time').textContent = new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Yangon',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    </script>
</body>
</html>
EOF
    
    log_success "健康检查页面创建完成"
}

# 设置错误页面
setup_error_pages() {
    log_info "设置错误页面"
    
    # 404 页面
    cat > /usr/share/nginx/html/404.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>页面未找到 - Myanmar Express</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; text-align: center; margin-top: 100px; }
        h1 { color: #1976d2; }
        p { color: #666; }
        a { color: #1976d2; text-decoration: none; }
    </style>
</head>
<body>
    <h1>404 - 页面未找到</h1>
    <p>抱歉，您访问的页面不存在。</p>
    <p>Sorry, the page you are looking for does not exist.</p>
    <p><a href="/">返回首页 / Back to Home</a></p>
</body>
</html>
EOF

    # 50x 页面
    cat > /usr/share/nginx/html/50x.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>服务器错误 - Myanmar Express</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; text-align: center; margin-top: 100px; }
        h1 { color: #f5222d; }
        p { color: #666; }
        a { color: #1976d2; text-decoration: none; }
    </style>
</head>
<body>
    <h1>服务器暂时不可用</h1>
    <p>我们正在努力修复问题，请稍后再试。</p>
    <p>We are working to fix the issue. Please try again later.</p>
    <p><a href="/">返回首页 / Back to Home</a></p>
</body>
</html>
EOF
    
    log_success "错误页面创建完成"
}

# 启动前检查
pre_start_checks() {
    log_info "执行启动前检查"
    
    # 检查磁盘空间
    available_space=$(df / | tail -1 | awk '{print $4}')
    if [ "$available_space" -lt 1048576 ]; then # 1GB in KB
        log_warning "磁盘空间不足 1GB，可能影响系统运行"
    fi
    
    # 检查内存
    available_memory=$(free -m | awk 'NR==2{printf "%.1f", $7/1024}')
    log_info "可用内存: ${available_memory}GB"
    
    # 检查必要文件
    required_files=(
        "/usr/share/nginx/html/index.html"
        "/etc/nginx/nginx.conf"
        "/etc/nginx/conf.d/default.conf"
    )
    
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            log_error "必要文件不存在: $file"
            exit 1
        fi
    done
    
    log_success "启动前检查通过"
}

# 清理函数
cleanup() {
    log_info "执行清理操作"
    
    # 清理临时文件
    rm -rf /tmp/nginx-*
    rm -rf /var/cache/nginx/client_temp/*
    
    # 清理旧日志（保留最近7天）
    find /var/log/nginx -name "*.log" -type f -mtime +7 -delete
    
    log_success "清理完成"
}

# 信号处理
handle_signal() {
    log_info "收到停止信号，正在优雅关闭..."
    cleanup
    nginx -s quit
    exit 0
}

# 设置信号处理
trap handle_signal SIGTERM SIGINT

# 主函数
main() {
    log_info "启动 Myanmar Express Delivery System"
    log_info "版本: ${REACT_APP_VERSION:-2.1.0}"
    log_info "构建时间: ${REACT_APP_BUILD_TIME:-unknown}"
    
    # 执行初始化步骤
    setup_timezone
    create_directories
    generate_ssl_cert
    configure_nginx
    setup_health_check
    setup_error_pages
    pre_start_checks
    
    log_success "初始化完成，启动 Nginx"
    
    # 启动 Nginx
    if [ "$1" = "nginx" ]; then
        exec nginx -g "daemon off;"
    else
        exec "$@"
    fi
}

# 如果直接运行此脚本
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi
