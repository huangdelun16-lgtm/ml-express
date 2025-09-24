#!/bin/bash
# =============================================
# 缅甸快递系统一键部署脚本
# Myanmar Express One-Click Deployment Script
# =============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# 配置变量
PROJECT_NAME="myanmar-express"
DOCKER_COMPOSE_VERSION="v2.21.0"
NODE_VERSION="18"
BACKUP_RETENTION_DAYS=30

# 日志函数
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

# 显示横幅
show_banner() {
    echo -e "${PURPLE}"
    cat << 'EOF'
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║    🇲🇲  Myanmar Express Delivery System Deployment  🚀       ║
║                                                              ║
║    缅甸同城快递管理系统 - 一键部署脚本                           ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
}

# 检查系统要求
check_system_requirements() {
    log "检查系统要求..."
    
    # 检查操作系统
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        info "操作系统: Linux ✓"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        info "操作系统: macOS ✓"
    else
        error "不支持的操作系统: $OSTYPE"
        exit 1
    fi
    
    # 检查内存
    if command -v free &> /dev/null; then
        total_mem=$(free -g | awk 'NR==2{printf "%d", $2}')
        if [ "$total_mem" -lt 2 ]; then
            warning "内存不足 2GB，建议至少 4GB"
        else
            info "内存: ${total_mem}GB ✓"
        fi
    fi
    
    # 检查磁盘空间
    available_space=$(df . | tail -1 | awk '{print $4}')
    if [ "$available_space" -lt 10485760 ]; then # 10GB in KB
        error "磁盘空间不足 10GB"
        exit 1
    else
        info "磁盘空间: 充足 ✓"
    fi
    
    success "系统要求检查通过"
}

# 安装 Docker
install_docker() {
    if command -v docker &> /dev/null; then
        info "Docker 已安装: $(docker --version)"
        return
    fi
    
    log "安装 Docker..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux 安装
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        
        # 添加用户到 docker 组
        sudo usermod -aG docker $USER
        
        # 启动 Docker 服务
        sudo systemctl start docker
        sudo systemctl enable docker
        
        rm get-docker.sh
        
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS 安装
        if command -v brew &> /dev/null; then
            brew install docker
        else
            error "请先安装 Homebrew 或手动安装 Docker Desktop"
            exit 1
        fi
    fi
    
    success "Docker 安装完成"
}

# 安装 Docker Compose
install_docker_compose() {
    if command -v docker-compose &> /dev/null; then
        info "Docker Compose 已安装: $(docker-compose --version)"
        return
    fi
    
    log "安装 Docker Compose..."
    
    # 下载 Docker Compose
    sudo curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" \
        -o /usr/local/bin/docker-compose
    
    # 设置执行权限
    sudo chmod +x /usr/local/bin/docker-compose
    
    # 创建软链接
    sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    
    success "Docker Compose 安装完成"
}

# 创建项目目录结构
create_project_structure() {
    log "创建项目目录结构..."
    
    directories=(
        "backups"
        "logs"
        "ssl-certs"
        "uploads"
        "mysql/data"
        "redis/data"
        "monitoring/prometheus-data"
        "monitoring/grafana-data"
        "certbot/www"
    )
    
    for dir in "${directories[@]}"; do
        mkdir -p "$dir"
        info "创建目录: $dir"
    done
    
    success "目录结构创建完成"
}

# 生成环境配置文件
generate_env_file() {
    if [ -f .env ]; then
        warning ".env 文件已存在，跳过生成"
        return
    fi
    
    log "生成环境配置文件..."
    
    # 生成随机密码
    mysql_root_password=$(openssl rand -base64 32)
    mysql_password=$(openssl rand -base64 32)
    jwt_secret=$(openssl rand -base64 64)
    
    cat > .env << EOF
# =============================================
# 缅甸快递系统环境配置
# Myanmar Express Environment Configuration
# =============================================

# 基础配置
NODE_ENV=production
REACT_APP_VERSION=2.1.0
REACT_APP_BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# 域名配置
DOMAIN_NAME=localhost
NGINX_HOST=localhost

# 数据库配置
MYSQL_ROOT_PASSWORD=${mysql_root_password}
MYSQL_DATABASE=myanmar_express
MYSQL_USER=express_user
MYSQL_PASSWORD=${mysql_password}

# JWT 配置
JWT_SECRET=${jwt_secret}

# 其他配置请参考 env.example
EOF
    
    success "环境配置文件生成完成"
    warning "请编辑 .env 文件配置您的具体参数"
}

# 配置防火墙
configure_firewall() {
    if ! command -v ufw &> /dev/null; then
        warning "UFW 未安装，跳过防火墙配置"
        return
    fi
    
    log "配置防火墙..."
    
    # 基础规则
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    
    # 开放必要端口
    sudo ufw allow 22/tcp   # SSH
    sudo ufw allow 80/tcp   # HTTP
    sudo ufw allow 443/tcp  # HTTPS
    
    # 启用防火墙
    echo 'y' | sudo ufw enable
    
    success "防火墙配置完成"
}

# 启动服务
start_services() {
    log "启动服务..."
    
    # 构建镜像
    docker-compose build --no-cache
    
    # 启动服务
    docker-compose up -d
    
    success "服务启动完成"
}

# 等待服务就绪
wait_for_services() {
    log "等待服务启动..."
    
    # 等待 MySQL
    info "等待 MySQL 启动..."
    timeout=60
    while ! docker-compose exec mysql mysqladmin ping -h"localhost" --silent; do
        sleep 2
        timeout=$((timeout - 2))
        if [ $timeout -le 0 ]; then
            error "MySQL 启动超时"
            exit 1
        fi
    done
    success "MySQL 已就绪"
    
    # 等待 Redis
    info "等待 Redis 启动..."
    timeout=30
    while ! docker-compose exec redis redis-cli ping | grep -q PONG; do
        sleep 2
        timeout=$((timeout - 2))
        if [ $timeout -le 0 ]; then
            error "Redis 启动超时"
            exit 1
        fi
    done
    success "Redis 已就绪"
    
    # 等待前端服务
    info "等待前端服务启动..."
    timeout=60
    while ! curl -f http://localhost/health > /dev/null 2>&1; do
        sleep 2
        timeout=$((timeout - 2))
        if [ $timeout -le 0 ]; then
            error "前端服务启动超时"
            exit 1
        fi
    done
    success "前端服务已就绪"
}

# 初始化数据库
initialize_database() {
    log "初始化数据库..."
    
    # 检查数据库是否已初始化
    if docker-compose exec mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "USE myanmar_express; SHOW TABLES;" 2>/dev/null | grep -q users; then
        info "数据库已初始化，跳过"
        return
    fi
    
    # 执行数据库初始化脚本
    if [ -f "database/myanmar_express_database.sql" ]; then
        docker-compose exec -T mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" < database/myanmar_express_database.sql
        success "数据库初始化完成"
    else
        warning "数据库初始化脚本不存在"
    fi
}

# 设置 SSL 证书
setup_ssl() {
    if [ "$DOMAIN_NAME" == "localhost" ]; then
        warning "使用 localhost，跳过 SSL 证书配置"
        return
    fi
    
    log "配置 SSL 证书..."
    
    # 使用 Let's Encrypt
    docker-compose run --rm certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email admin@"$DOMAIN_NAME" \
        --agree-tos \
        --no-eff-email \
        -d "$DOMAIN_NAME" \
        -d www."$DOMAIN_NAME"
    
    if [ $? -eq 0 ]; then
        success "SSL 证书配置完成"
    else
        warning "SSL 证书配置失败，将使用自签名证书"
    fi
}

# 设置定时任务
setup_cron_jobs() {
    log "设置定时任务..."
    
    # 创建 cron 作业
    cat > /tmp/myanmar-express-cron << EOF
# 缅甸快递系统定时任务
# Myanmar Express Cron Jobs

# 每天凌晨 2 点备份数据库
0 2 * * * cd $(pwd) && docker-compose exec -T mysql mysqldump -u root -p\$MYSQL_ROOT_PASSWORD --all-databases | gzip > backups/mysql_backup_\$(date +\%Y\%m\%d).sql.gz

# 每周日凌晨 3 点清理旧备份
0 3 * * 0 find $(pwd)/backups -name "mysql_backup_*.sql.gz" -mtime +$BACKUP_RETENTION_DAYS -delete

# 每月 1 号凌晨 4 点更新 SSL 证书
0 4 1 * * cd $(pwd) && docker-compose run --rm certbot renew

# 每天清理 Docker 无用镜像
0 5 * * * docker system prune -f
EOF
    
    # 安装 cron 作业
    crontab /tmp/myanmar-express-cron
    rm /tmp/myanmar-express-cron
    
    success "定时任务设置完成"
}

# 显示部署信息
show_deployment_info() {
    echo -e "\n${GREEN}🎉 部署完成！${NC}\n"
    
    echo -e "${CYAN}访问信息:${NC}"
    echo -e "  🌐 网站地址: http://$DOMAIN_NAME"
    if [ "$DOMAIN_NAME" != "localhost" ]; then
        echo -e "  🔒 HTTPS地址: https://$DOMAIN_NAME"
    fi
    echo -e "  👤 管理后台: http://$DOMAIN_NAME/admin"
    echo -e "  📊 监控面板: http://$DOMAIN_NAME:3001 (如果启用)"
    echo -e "  🗄️  数据库管理: http://$DOMAIN_NAME:8080 (如果启用)"
    
    echo -e "\n${CYAN}服务状态:${NC}"
    docker-compose ps
    
    echo -e "\n${CYAN}有用的命令:${NC}"
    echo -e "  查看日志: ${YELLOW}docker-compose logs -f${NC}"
    echo -e "  重启服务: ${YELLOW}docker-compose restart${NC}"
    echo -e "  停止服务: ${YELLOW}docker-compose down${NC}"
    echo -e "  备份数据: ${YELLOW}./scripts/backup.sh${NC}"
    
    echo -e "\n${YELLOW}注意事项:${NC}"
    echo -e "  ⚠️  请及时修改默认密码"
    echo -e "  ⚠️  定期备份重要数据"
    echo -e "  ⚠️  监控系统资源使用情况"
    
    if [ "$DOMAIN_NAME" == "localhost" ]; then
        echo -e "  ⚠️  生产环境请配置正确的域名"
    fi
    
    echo -e "\n${GREEN}部署成功！祝您使用愉快！🚀${NC}\n"
}

# 清理函数
cleanup() {
    if [ $? -ne 0 ]; then
        error "部署过程中发生错误"
        echo -e "\n${YELLOW}清理资源...${NC}"
        docker-compose down 2>/dev/null || true
        echo -e "${YELLOW}请检查错误信息并重新运行部署脚本${NC}"
    fi
}

# 主函数
main() {
    # 设置错误处理
    trap cleanup EXIT
    
    # 显示横幅
    show_banner
    
    # 检查是否为 root 用户
    if [ "$EUID" -eq 0 ]; then
        warning "不建议使用 root 用户运行此脚本"
        read -p "是否继续? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    # 执行部署步骤
    check_system_requirements
    install_docker
    install_docker_compose
    create_project_structure
    generate_env_file
    
    # 提示用户配置环境变量
    echo -e "\n${YELLOW}请编辑 .env 文件配置您的环境变量，然后按回车继续...${NC}"
    read -r
    
    configure_firewall
    start_services
    wait_for_services
    initialize_database
    setup_ssl
    setup_cron_jobs
    
    # 显示部署信息
    show_deployment_info
    
    # 移除错误处理
    trap - EXIT
}

# 脚本入口
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi
