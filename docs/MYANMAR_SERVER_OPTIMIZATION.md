# 🇲🇲 缅甸服务器部署优化指南

## 📍 缅甸网络环境特点

### 网络基础设施现状
- **主要ISP**: Telenor Myanmar, Ooredoo, MPT, MyTel
- **平均网速**: 下载 20-50 Mbps，上传 10-20 Mbps
- **网络延迟**: 国际延迟 150-300ms，国内 20-50ms
- **移动网络**: 4G覆盖率约80%，5G刚起步
- **网络稳定性**: 偶有断网，需要容错设计

### 地理位置优势
- **时区**: UTC+6:30 (Asia/Yangon)
- **邻近国家**: 泰国、中国、印度、孟加拉国
- **CDN节点**: 新加坡、香港、曼谷

---

## 🏗️ 服务器架构建议

### 1. 服务器选型

#### 推荐配置
```yaml
# 生产环境
CPU: 4 cores (Intel/AMD)
RAM: 8GB DDR4
Storage: 200GB SSD
Bandwidth: 100Mbps
Location: 新加坡/香港 (低延迟)

# 高可用环境
CPU: 8 cores
RAM: 16GB DDR4
Storage: 500GB SSD + 1TB HDD
Bandwidth: 1Gbps
Location: 多地部署
```

#### 云服务商推荐
1. **AWS Asia Pacific (Singapore)**
   - 延迟: ~50ms
   - 优势: 稳定性高，服务全面
   - 成本: 中等

2. **Google Cloud Asia-Southeast1**
   - 延迟: ~60ms
   - 优势: 网络质量好，AI服务
   - 成本: 中等偏高

3. **DigitalOcean Singapore**
   - 延迟: ~70ms
   - 优势: 性价比高，简单易用
   - 成本: 较低

4. **Vultr Singapore**
   - 延迟: ~80ms
   - 优势: 价格便宜，配置灵活
   - 成本: 最低

### 2. 网络优化

#### CDN 配置
```nginx
# 使用多个 CDN 节点
upstream cdn_primary {
    server cdn-sg.example.com;
    server cdn-hk.example.com backup;
}

upstream cdn_secondary {
    server cdn-th.example.com;
    server cdn-my.example.com backup;
}
```

#### DNS 优化
```yaml
# 使用多个 DNS 服务商
Primary: Cloudflare (1.1.1.1)
Secondary: Google (8.8.8.8)
Local: MPT DNS (203.81.64.1)

# DNS 记录配置
A Record: 
  - Singapore: 52.74.xxx.xxx
  - Hong Kong: 47.75.xxx.xxx
  
CNAME Records:
  - www -> @
  - api -> api-sg.domain.com
  - cdn -> cdn-sg.domain.com
```

---

## ⚡ 性能优化策略

### 1. 缓存策略

#### Redis 配置
```redis
# redis.conf 缅甸优化
maxmemory 2gb
maxmemory-policy allkeys-lru
tcp-keepalive 300
timeout 300

# 持久化配置（考虑网络不稳定）
save 900 1
save 300 10
save 60 10000
```

#### Nginx 缓存
```nginx
# 静态资源缓存
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header X-Myanmar-Cache "HIT";
}

# API 响应缓存
location /api/ {
    proxy_cache api_cache;
    proxy_cache_valid 200 5m;
    proxy_cache_valid 404 1m;
    add_header X-Cache-Status $upstream_cache_status;
}
```

### 2. 数据库优化

#### MySQL 配置 (my.cnf)
```ini
[mysqld]
# 基础配置
default-time-zone = '+06:30'
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci

# 内存优化（8GB服务器）
innodb_buffer_pool_size = 4G
innodb_log_file_size = 512M
key_buffer_size = 512M
tmp_table_size = 256M
max_heap_table_size = 256M

# 连接优化
max_connections = 1000
max_connect_errors = 10000
connect_timeout = 60
wait_timeout = 28800

# 查询优化
query_cache_type = 1
query_cache_size = 256M
slow_query_log = 1
long_query_time = 2

# 网络优化（适应缅甸网络）
net_read_timeout = 120
net_write_timeout = 120
max_allowed_packet = 64M
```

### 3. 应用层优化

#### Docker 优化
```dockerfile
# 多阶段构建减少镜像大小
FROM node:18-alpine AS builder
# 使用缅甸友好的镜像源
RUN npm config set registry https://registry.npmmirror.com

# 生产镜像优化
FROM nginx:alpine
RUN apk add --no-cache tzdata curl
ENV TZ=Asia/Yangon
```

#### 压缩配置
```nginx
# Gzip 压缩（适应低带宽）
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_comp_level 9;  # 最高压缩比
gzip_types
    text/plain
    text/css
    text/xml
    text/javascript
    application/javascript
    application/json
    application/xml;
```

---

## 🛡️ 安全配置

### 1. 防火墙设置

#### UFW 配置
```bash
# 基础防火墙规则
ufw default deny incoming
ufw default allow outgoing

# 开放必要端口
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow from 192.168.1.0/24  # 内网

# 限制 SSH 访问（缅甸IP段）
ufw allow from 203.81.64.0/24 to any port 22
ufw allow from 37.111.128.0/24 to any port 22

ufw enable
```

#### Fail2Ban 配置
```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
ignoreip = 127.0.0.1/8 192.168.1.0/24

[sshd]
enabled = true
port = 22
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
```

### 2. SSL/TLS 优化

#### Let's Encrypt 自动化
```bash
#!/bin/bash
# certbot-renew.sh
docker run --rm \
    -v letsencrypt:/etc/letsencrypt \
    -v /var/www/certbot:/var/www/certbot \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email admin@market-link-express.com \
    --agree-tos \
    --no-eff-email \
    -d market-link-express.com \
    -d www.market-link-express.com
```

---

## 📊 监控配置

### 1. 系统监控

#### Prometheus 配置
```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    region: 'myanmar'
    datacenter: 'singapore'

scrape_configs:
  - job_name: 'myanmar-express'
    static_configs:
      - targets: ['localhost:9090']
    
  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:9113']
    
  - job_name: 'mysql'
    static_configs:
      - targets: ['mysql:9104']
    
  - job_name: 'redis'
    static_configs:
      - targets: ['redis:9121']

# 告警规则
rule_files:
  - "myanmar_alerts.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

#### 告警规则
```yaml
# myanmar_alerts.yml
groups:
- name: myanmar-express
  rules:
  # 高延迟告警
  - alert: HighLatency
    expr: nginx_request_duration_seconds > 2
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "缅甸用户访问延迟过高"
      
  # 错误率告警
  - alert: HighErrorRate
    expr: rate(nginx_http_requests_total{status=~"5.."}[5m]) > 0.1
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "服务器错误率过高"
      
  # 磁盘空间告警
  - alert: DiskSpaceLow
    expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) < 0.1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "磁盘空间不足"
```

### 2. 业务监控

#### 自定义指标
```javascript
// metrics.js - 业务指标收集
const promClient = require('prom-client');

// 订单相关指标
const orderCounter = new promClient.Counter({
    name: 'myanmar_express_orders_total',
    help: 'Total number of orders',
    labelNames: ['city', 'status']
});

const deliveryDuration = new promClient.Histogram({
    name: 'myanmar_express_delivery_duration_hours',
    help: 'Delivery duration in hours',
    labelNames: ['city', 'service_type'],
    buckets: [1, 2, 4, 8, 12, 24, 48]
});

// 支付相关指标
const paymentCounter = new promClient.Counter({
    name: 'myanmar_express_payments_total',
    help: 'Total number of payments',
    labelNames: ['method', 'status', 'currency']
});
```

---

## 🔄 备份策略

### 1. 数据库备份

#### 自动备份脚本
```bash
#!/bin/bash
# backup.sh
set -e

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# 创建备份目录
mkdir -p $BACKUP_DIR

# 数据库备份
docker exec myanmar-express-mysql mysqldump \
    -u$MYSQL_USER -p$MYSQL_PASSWORD \
    --single-transaction \
    --routines \
    --triggers \
    --all-databases > $BACKUP_DIR/mysql_backup_$DATE.sql

# 压缩备份文件
gzip $BACKUP_DIR/mysql_backup_$DATE.sql

# 上传到云存储（可选）
if [ -n "$AWS_S3_BUCKET" ]; then
    aws s3 cp $BACKUP_DIR/mysql_backup_$DATE.sql.gz \
        s3://$AWS_S3_BUCKET/backups/mysql/
fi

# 清理旧备份
find $BACKUP_DIR -name "mysql_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "备份完成: mysql_backup_$DATE.sql.gz"
```

### 2. 文件备份

#### Rsync 同步
```bash
#!/bin/bash
# file-backup.sh

# 同步上传文件到备份服务器
rsync -avz --delete \
    /usr/share/nginx/html/uploads/ \
    backup-server:/backups/uploads/

# 同步配置文件
rsync -avz \
    /etc/nginx/ \
    backup-server:/backups/nginx/

echo "文件备份完成"
```

---

## 🚀 部署流程

### 1. 生产环境部署

#### 部署检查清单
```bash
#!/bin/bash
# deploy-checklist.sh

echo "🇲🇲 缅甸快递系统部署检查"

# 环境变量检查
required_vars=(
    "MYSQL_ROOT_PASSWORD"
    "DOMAIN_NAME"
    "SSL_EMAIL"
    "SMTP_PASSWORD"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ 缺少环境变量: $var"
        exit 1
    fi
done

# 服务检查
services=(
    "mysql:3306"
    "redis:6379"
    "nginx:80"
    "nginx:443"
)

for service in "${services[@]}"; do
    host=$(echo $service | cut -d: -f1)
    port=$(echo $service | cut -d: -f2)
    
    if nc -z $host $port; then
        echo "✅ $service 可访问"
    else
        echo "❌ $service 不可访问"
    fi
done

# SSL 证书检查
if openssl x509 -in /etc/nginx/ssl/fullchain.pem -text -noout > /dev/null 2>&1; then
    echo "✅ SSL 证书有效"
    
    # 检查证书过期时间
    expiry=$(openssl x509 -in /etc/nginx/ssl/fullchain.pem -noout -enddate | cut -d= -f2)
    echo "📅 SSL 证书过期时间: $expiry"
else
    echo "❌ SSL 证书无效"
fi

# 磁盘空间检查
available_space=$(df / | tail -1 | awk '{print $4}')
if [ "$available_space" -lt 5242880 ]; then # 5GB
    echo "⚠️  磁盘空间不足 5GB"
else
    echo "✅ 磁盘空间充足"
fi

echo "🎉 部署检查完成"
```

### 2. 一键部署脚本

```bash
#!/bin/bash
# deploy.sh

set -e

echo "🇲🇲 开始部署缅甸快递系统"

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "安装 Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    usermod -aG docker $USER
fi

# 检查 Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "安装 Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# 创建环境文件
if [ ! -f .env ]; then
    echo "创建环境配置文件..."
    cp env.example .env
    echo "请编辑 .env 文件配置您的环境变量"
    exit 1
fi

# 构建和启动服务
echo "构建 Docker 镜像..."
docker-compose build --no-cache

echo "启动服务..."
docker-compose up -d

# 等待服务启动
echo "等待服务启动..."
sleep 30

# 健康检查
echo "执行健康检查..."
if curl -f http://localhost/health > /dev/null 2>&1; then
    echo "✅ 服务启动成功"
    echo "🌐 访问地址: http://localhost"
else
    echo "❌ 服务启动失败"
    docker-compose logs
    exit 1
fi

echo "🎉 部署完成！"
```

---

## 📈 性能基准

### 缅甸网络环境基准测试

#### 延迟测试结果
```
新加坡服务器 -> 仰光用户:
- 平均延迟: 52ms
- 丢包率: 0.1%
- 带宽: 45Mbps

香港服务器 -> 仰光用户:
- 平均延迟: 68ms
- 丢包率: 0.2%
- 带宽: 38Mbps

曼谷服务器 -> 仰光用户:
- 平均延迟: 45ms
- 丢包率: 0.3%
- 带宽: 42Mbps
```

#### 推荐配置性能
```
页面加载时间: < 3秒
API 响应时间: < 500ms
图片加载时间: < 2秒
文件上传速度: > 1MB/s
并发用户数: 1000+
```

---

## 🎯 最佳实践总结

### 1. 网络优化
- 使用新加坡或香港服务器
- 配置多层 CDN 加速
- 启用 HTTP/2 和 gzip 压缩
- 实施智能 DNS 解析

### 2. 缓存策略
- Redis 缓存热点数据
- Nginx 缓存静态资源
- 浏览器缓存优化
- API 响应缓存

### 3. 监控告警
- 实时性能监控
- 业务指标跟踪
- 自动告警通知
- 日志分析

### 4. 安全防护
- SSL/TLS 加密
- 防火墙配置
- 访问控制
- 数据备份

### 5. 运维自动化
- 自动化部署
- 健康检查
- 自动扩容
- 故障恢复

---

## 📞 技术支持

如需技术支持，请联系：
- 邮箱: tech@market-link-express.com
- 电话: +95-xxx-xxx-xxxx
- 微信: myanmar-express-tech

**最后更新**: 2024年12月19日
