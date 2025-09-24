# 🚀 缅甸快递系统部署指南

## 📋 部署概览

本项目提供了完整的 Docker 化部署方案，特别针对缅甸的网络环境和业务需求进行了优化。

### 🏗️ 架构组件

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx Proxy   │    │  React Frontend │    │   MySQL DB      │
│   (Port 80/443) │────│   (Static)      │────│   (Port 3306)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └──────────────│   Redis Cache   │──────────────┘
                        │   (Port 6379)   │
                        └─────────────────┘
```

---

## 🚀 快速部署

### 方法一：一键部署脚本

```bash
# 下载项目
git clone https://github.com/your-repo/ml-express.git
cd ml-express

# 执行一键部署
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### 方法二：手动部署

```bash
# 1. 安装 Docker 和 Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 2. 克隆项目
git clone https://github.com/your-repo/ml-express.git
cd ml-express

# 3. 配置环境变量
cp env.example .env
# 编辑 .env 文件

# 4. 启动服务
docker-compose up -d

# 5. 检查服务状态
docker-compose ps
```

---

## ⚙️ 配置说明

### 环境变量配置

编辑 `.env` 文件，配置以下关键参数：

```bash
# 域名配置
DOMAIN_NAME=your-domain.com
NGINX_HOST=your-domain.com

# 数据库配置
MYSQL_ROOT_PASSWORD=your-secure-password
MYSQL_DATABASE=myanmar_express
MYSQL_USER=express_user
MYSQL_PASSWORD=your-db-password

# Supabase 配置
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-supabase-key

# 支付配置（缅甸本地）
KBZ_PAY_MERCHANT_ID=your-kbz-id
WAVE_MONEY_API_KEY=your-wave-key
AYA_PAY_API_KEY=your-aya-key
```

### SSL 证书配置

#### 自动获取 Let's Encrypt 证书

```bash
# 使用 Certbot 获取免费 SSL 证书
docker-compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email admin@your-domain.com \
  --agree-tos \
  --no-eff-email \
  -d your-domain.com \
  -d www.your-domain.com
```

#### 手动上传证书

```bash
# 将证书文件放置到以下位置
mkdir -p ssl-certs
cp your-cert.pem ssl-certs/fullchain.pem
cp your-key.pem ssl-certs/privkey.pem
```

---

## 🐳 Docker 服务详解

### 核心服务

#### 1. Frontend (Nginx + React)
- **端口**: 80, 443
- **功能**: 静态文件服务、反向代理、SSL 终端
- **配置**: `nginx/default.conf`

#### 2. MySQL 数据库
- **端口**: 3306
- **功能**: 主数据存储
- **配置**: `mysql/my.cnf`
- **数据卷**: `mysql-data`

#### 3. Redis 缓存
- **端口**: 6379
- **功能**: 缓存、会话存储
- **配置**: `redis/redis.conf`
- **数据卷**: `redis-data`

### 可选服务

#### 监控服务 (Profile: monitoring)

```bash
# 启动监控服务
docker-compose --profile monitoring up -d

# 访问监控面板
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3001
```

#### 管理工具 (Profile: admin)

```bash
# 启动管理工具
docker-compose --profile admin up -d

# 访问管理工具
# phpMyAdmin: http://localhost:8080
# Redis Commander: http://localhost:8081
```

---

## 🔧 运维操作

### 常用命令

```bash
# 查看服务状态
docker-compose ps

# 查看实时日志
docker-compose logs -f

# 重启特定服务
docker-compose restart frontend

# 更新服务
docker-compose pull
docker-compose up -d

# 停止所有服务
docker-compose down

# 完全清理（包括数据卷）
docker-compose down -v
```

### 数据库操作

```bash
# 进入 MySQL 容器
docker-compose exec mysql mysql -u root -p

# 备份数据库
docker-compose exec mysql mysqldump -u root -p myanmar_express > backup.sql

# 恢复数据库
docker-compose exec -T mysql mysql -u root -p myanmar_express < backup.sql

# 查看数据库日志
docker-compose logs mysql
```

### 文件管理

```bash
# 查看上传文件
ls -la uploads/

# 清理临时文件
docker-compose exec frontend find /tmp -type f -mtime +7 -delete

# 查看 Nginx 配置
docker-compose exec frontend nginx -t
```

---

## 📊 监控和日志

### 日志位置

```
logs/
├── nginx/
│   ├── access.log      # 访问日志
│   ├── error.log       # 错误日志
│   └── ssl_error.log   # SSL 错误日志
├── mysql/
│   └── error.log       # MySQL 错误日志
└── redis/
    └── redis.log       # Redis 日志
```

### 监控指标

#### 系统监控
- CPU 使用率
- 内存使用率
- 磁盘空间
- 网络流量

#### 应用监控
- 响应时间
- 错误率
- 并发用户数
- 数据库连接数

#### 业务监控
- 订单数量
- 支付成功率
- 配送完成率
- 用户活跃度

---

## 🛡️ 安全配置

### 防火墙设置

```bash
# 安装并配置 UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### 安全加固

1. **更改默认密码**
   ```bash
   # 更改数据库密码
   docker-compose exec mysql mysql -u root -p
   ALTER USER 'root'@'localhost' IDENTIFIED BY 'new-password';
   ```

2. **限制访问权限**
   ```bash
   # 限制管理工具访问
   # 编辑 nginx/default.conf
   location /admin {
       allow 192.168.1.0/24;
       deny all;
   }
   ```

3. **启用访问日志分析**
   ```bash
   # 安装 fail2ban
   sudo apt install fail2ban
   
   # 配置 Nginx 保护
   sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
   ```

---

## 🔄 备份策略

### 自动备份脚本

```bash
#!/bin/bash
# scripts/backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"

# 数据库备份
docker-compose exec -T mysql mysqldump \
  -u root -p$MYSQL_ROOT_PASSWORD \
  --all-databases > $BACKUP_DIR/mysql_$DATE.sql

# 压缩备份文件
gzip $BACKUP_DIR/mysql_$DATE.sql

# 上传文件备份
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz uploads/

# 清理旧备份（保留30天）
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "备份完成: $DATE"
```

### 定时备份

```bash
# 添加到 crontab
crontab -e

# 每天凌晨 2 点备份
0 2 * * * /path/to/ml-express/scripts/backup.sh
```

---

## 🚨 故障排除

### 常见问题

#### 1. 服务无法启动

```bash
# 查看详细错误信息
docker-compose logs service-name

# 检查端口占用
netstat -tulpn | grep :80
netstat -tulpn | grep :3306

# 检查磁盘空间
df -h
```

#### 2. 数据库连接失败

```bash
# 检查 MySQL 服务状态
docker-compose exec mysql mysqladmin ping

# 检查用户权限
docker-compose exec mysql mysql -u root -p
SELECT User, Host FROM mysql.user;
```

#### 3. SSL 证书问题

```bash
# 检查证书有效性
openssl x509 -in ssl-certs/fullchain.pem -text -noout

# 重新获取证书
docker-compose run --rm certbot renew
```

#### 4. 性能问题

```bash
# 检查资源使用情况
docker stats

# 查看慢查询日志
docker-compose exec mysql mysql -u root -p
SET GLOBAL slow_query_log = 'ON';
SHOW VARIABLES LIKE 'slow_query_log%';
```

### 紧急恢复

```bash
# 快速重启所有服务
docker-compose down && docker-compose up -d

# 恢复数据库备份
docker-compose exec -T mysql mysql -u root -p < backups/mysql_latest.sql

# 检查服务健康状态
curl http://localhost/health
```

---

## 📈 性能优化

### 缅甸网络优化

1. **CDN 配置**
   - 使用新加坡或香港 CDN 节点
   - 启用静态资源缓存
   - 配置图片压缩

2. **数据库优化**
   ```sql
   # MySQL 优化配置
   SET GLOBAL innodb_buffer_pool_size = 2147483648;  # 2GB
   SET GLOBAL query_cache_size = 268435456;          # 256MB
   SET GLOBAL max_connections = 1000;
   ```

3. **缓存策略**
   ```redis
   # Redis 优化配置
   maxmemory 1gb
   maxmemory-policy allkeys-lru
   tcp-keepalive 300
   ```

### 扩容方案

```bash
# 水平扩容 (多实例)
docker-compose up --scale frontend=3 -d

# 负载均衡配置
# 编辑 nginx/default.conf
upstream frontend_cluster {
    server frontend_1:80;
    server frontend_2:80;
    server frontend_3:80;
}
```

---

## 📞 技术支持

### 获取帮助

1. **查看文档**
   - [API 文档](./docs/API.md)
   - [数据库设计](./docs/DATABASE_DESIGN.md)
   - [缅甸优化指南](./docs/MYANMAR_SERVER_OPTIMIZATION.md)

2. **社区支持**
   - GitHub Issues
   - 技术论坛
   - 微信群

3. **商业支持**
   - 邮箱: support@market-link-express.com
   - 电话: +95-xxx-xxx-xxxx
   - 在线客服: 24/7

### 版本更新

```bash
# 检查更新
git fetch origin
git log HEAD..origin/main --oneline

# 更新到最新版本
git pull origin main
docker-compose build --no-cache
docker-compose up -d
```

---

## 📝 更新日志

### v2.1.0 (2024-12-19)
- ✅ 完整的 Docker 化部署方案
- ✅ 缅甸网络环境优化
- ✅ SSL/TLS 安全配置
- ✅ 监控和日志系统
- ✅ 自动备份策略
- ✅ 一键部署脚本

### v2.0.0 (2024-12-18)
- ✅ 订单管理系统
- ✅ 快递员管理
- ✅ 支付系统集成
- ✅ 实时位置跟踪

---

**部署成功！祝您使用愉快！** 🎉🚀
