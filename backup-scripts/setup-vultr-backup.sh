#!/bin/bash

# Vultr 服务器备份设置脚本
# 用于设置 MARKET LINK EXPRESS 网站的数据备份

echo "🚀 开始设置 Vultr 服务器备份..."

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then
    echo "❌ 请使用 root 用户运行此脚本"
    exit 1
fi

# 更新系统
echo "📦 更新系统包..."
apt update && apt upgrade -y

# 安装必要软件
echo "🔧 安装必要软件..."
apt install -y nginx postgresql-client git curl wget unzip

# 创建备份目录
echo "📁 创建备份目录..."
mkdir -p /backup/{database,static,code,logs}
mkdir -p /backup/database/daily
mkdir -p /backup/database/weekly
mkdir -p /backup/static/daily
mkdir -p /backup/code/daily

# 设置目录权限
chmod 755 /backup
chmod 755 /backup/*

# 创建备份用户
echo "👤 创建备份用户..."
useradd -m -s /bin/bash backup
usermod -aG sudo backup

# 创建备份脚本
echo "📝 创建备份脚本..."
cat > /backup/backup-database.sh << 'EOF'
#!/bin/bash

# 数据库备份脚本
BACKUP_DIR="/backup/database/daily"
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/backup/logs/database-backup-$(date +%Y%m%d).log"

# Supabase 连接信息（需要替换为实际值）
SUPABASE_URL="https://uopkyuluxnrewvlmutam.supabase.co"
SUPABASE_DB_URL="postgresql://postgres:[PASSWORD]@db.uopkyuluxnrewvlmutam.supabase.co:5432/postgres"

echo "$(date): 开始数据库备份..." >> $LOG_FILE

# 备份 packages 表
echo "$(date): 备份 packages 表..." >> $LOG_FILE
pg_dump $SUPABASE_DB_URL -t packages > $BACKUP_DIR/packages_$DATE.sql

# 备份 users 表
echo "$(date): 备份 users 表..." >> $LOG_FILE
pg_dump $SUPABASE_DB_URL -t users > $BACKUP_DIR/users_$DATE.sql

# 备份 couriers 表
echo "$(date): 备份 couriers 表..." >> $LOG_FILE
pg_dump $SUPABASE_DB_URL -t couriers > $BACKUP_DIR/couriers_$DATE.sql

# 压缩备份文件
echo "$(date): 压缩备份文件..." >> $LOG_FILE
gzip $BACKUP_DIR/*_$DATE.sql

# 删除7天前的备份
echo "$(date): 清理旧备份..." >> $LOG_FILE
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "$(date): 数据库备份完成" >> $LOG_FILE
EOF

# 创建静态文件备份脚本
cat > /backup/backup-static.sh << 'EOF'
#!/bin/bash

# 静态文件备份脚本
BACKUP_DIR="/backup/static/daily"
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/backup/logs/static-backup-$(date +%Y%m%d).log"

echo "$(date): 开始静态文件备份..." >> $LOG_FILE

# 下载最新构建文件
echo "$(date): 下载构建文件..." >> $LOG_FILE
wget -q -O /tmp/build.zip "https://api.netlify.com/api/v1/sites/[SITE_ID]/deploys/[DEPLOY_ID]/zip"

# 解压到备份目录
echo "$(date): 解压文件..." >> $LOG_FILE
unzip -q /tmp/build.zip -d $BACKUP_DIR/build_$DATE/

# 压缩备份
echo "$(date): 压缩备份..." >> $LOG_FILE
tar -czf $BACKUP_DIR/build_$DATE.tar.gz -C $BACKUP_DIR build_$DATE/
rm -rf $BACKUP_DIR/build_$DATE/

# 删除7天前的备份
echo "$(date): 清理旧备份..." >> $LOG_FILE
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "$(date): 静态文件备份完成" >> $LOG_FILE
EOF

# 创建代码备份脚本
cat > /backup/backup-code.sh << 'EOF'
#!/bin/bash

# 代码备份脚本
BACKUP_DIR="/backup/code/daily"
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/backup/logs/code-backup-$(date +%Y%m%d).log"

echo "$(date): 开始代码备份..." >> $LOG_FILE

# 克隆代码仓库
echo "$(date): 克隆代码仓库..." >> $LOG_FILE
cd $BACKUP_DIR
git clone https://github.com/huangdelun16-lgtm/ml-express.git code_$DATE

# 压缩备份
echo "$(date): 压缩备份..." >> $LOG_FILE
tar -czf code_$DATE.tar.gz code_$DATE/
rm -rf code_$DATE/

# 删除7天前的备份
echo "$(date): 清理旧备份..." >> $LOG_FILE
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "$(date): 代码备份完成" >> $LOG_FILE
EOF

# 创建监控脚本
cat > /backup/monitor.sh << 'EOF'
#!/bin/bash

# 服务监控脚本
LOG_FILE="/backup/logs/monitor-$(date +%Y%m%d).log"

echo "$(date): 开始服务监控..." >> $LOG_FILE

# 检查主网站状态
if ! curl -f -s https://www.market-link-express.com > /dev/null; then
    echo "$(date): 主网站不可访问，发送告警..." >> $LOG_FILE
    # 这里可以添加邮件或短信告警
    echo "主网站故障告警" | mail -s "网站故障" admin@example.com
fi

# 检查 Supabase 状态
if ! curl -f -s https://uopkyuluxnrewvlmutam.supabase.co > /dev/null; then
    echo "$(date): Supabase 不可访问，发送告警..." >> $LOG_FILE
    echo "数据库故障告警" | mail -s "数据库故障" admin@example.com
fi

echo "$(date): 服务监控完成" >> $LOG_FILE
EOF

# 设置脚本权限
chmod +x /backup/*.sh
chown -R backup:backup /backup

# 配置定时任务
echo "⏰ 配置定时任务..."
cat > /etc/cron.d/market-link-express-backup << 'EOF'
# MARKET LINK EXPRESS 备份任务
# 每天凌晨2点备份数据库
0 2 * * * backup /backup/backup-database.sh

# 每天凌晨3点备份静态文件
0 3 * * * backup /backup/backup-static.sh

# 每天凌晨4点备份代码
0 4 * * * backup /backup/backup-code.sh

# 每5分钟检查服务状态
*/5 * * * * backup /backup/monitor.sh
EOF

# 配置 Nginx 作为备用服务
echo "🌐 配置 Nginx 备用服务..."
cat > /etc/nginx/sites-available/market-link-express-backup << 'EOF'
server {
    listen 80;
    server_name your-vultr-server-ip;

    location / {
        root /backup/static/current;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 备份文件访问
    location /backup/ {
        alias /backup/;
        autoindex on;
        autoindex_exact_size off;
        autoindex_localtime on;
    }
}
EOF

# 启用站点
ln -sf /etc/nginx/sites-available/market-link-express-backup /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 测试 Nginx 配置
nginx -t

# 启动服务
systemctl enable nginx
systemctl start nginx

# 创建状态检查脚本
cat > /backup/status.sh << 'EOF'
#!/bin/bash

echo "=== MARKET LINK EXPRESS 备份状态 ==="
echo "服务器时间: $(date)"
echo ""

echo "=== 备份目录大小 ==="
du -sh /backup/*

echo ""
echo "=== 最新备份文件 ==="
find /backup -name "*.sql.gz" -o -name "*.tar.gz" | head -10

echo ""
echo "=== 服务状态 ==="
systemctl status nginx --no-pager -l

echo ""
echo "=== 磁盘使用情况 ==="
df -h
EOF

chmod +x /backup/status.sh

echo "✅ Vultr 服务器备份设置完成！"
echo ""
echo "📋 后续配置步骤："
echo "1. 编辑 /backup/backup-database.sh 中的数据库连接信息"
echo "2. 编辑 /backup/backup-static.sh 中的 Netlify API 信息"
echo "3. 配置邮件告警（可选）"
echo "4. 运行 /backup/status.sh 检查状态"
echo ""
echo "🔗 访问备份文件: http://your-vultr-server-ip/backup/"
echo "📊 查看状态: /backup/status.sh"
