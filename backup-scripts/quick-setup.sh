#!/bin/bash

# 快速设置 Vultr 服务器备份
# 适用于 139.180.146.26

echo "🚀 开始快速设置 Vultr 服务器备份..."

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then
    echo "❌ 请使用 root 用户运行此脚本"
    exit 1
fi

# 第一步：更新系统
echo "📦 更新系统..."
apt update -y

# 第二步：安装必要软件
echo "🔧 安装必要软件..."
apt install -y curl wget unzip git nginx postgresql-client

# 第三步：创建备份目录
echo "📁 创建备份目录..."
mkdir -p /opt/market-link-express-backup/{database,static,code,logs}
mkdir -p /opt/market-link-express-backup/database/daily
mkdir -p /opt/market-link-express-backup/static/daily
mkdir -p /opt/market-link-express-backup/code/daily

# 第四步：创建数据库备份脚本
echo "📝 创建数据库备份脚本..."
cat > /opt/market-link-express-backup/backup-database.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/market-link-express-backup/database/daily"
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/opt/market-link-express-backup/logs/database-backup-$(date +%Y%m%d).log"

echo "$(date): 开始数据库备份..." >> $LOG_FILE

# 备份 packages 表
curl -s "https://uopkyuluxnrewvlmutam.supabase.co/rest/v1/packages?select=*" \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  > $BACKUP_DIR/packages_$DATE.json

# 备份 users 表
curl -s "https://uopkyuluxnrewvlmutam.supabase.co/rest/v1/users?select=*" \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  > $BACKUP_DIR/users_$DATE.json

# 备份 couriers 表
curl -s "https://uopkyuluxnrewvlmutam.supabase.co/rest/v1/couriers?select=*" \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  > $BACKUP_DIR/couriers_$DATE.json

# 压缩备份文件
gzip $BACKUP_DIR/*_$DATE.json

# 删除7天前的备份
find $BACKUP_DIR -name "*.json.gz" -mtime +7 -delete

echo "$(date): 数据库备份完成" >> $LOG_FILE
EOF

# 第五步：创建静态文件备份脚本
echo "📝 创建静态文件备份脚本..."
cat > /opt/market-link-express-backup/backup-static.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/market-link-express-backup/static/daily"
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/opt/market-link-express-backup/logs/static-backup-$(date +%Y%m%d).log"

echo "$(date): 开始静态文件备份..." >> $LOG_FILE

# 下载网站首页
wget -q -O $BACKUP_DIR/index_$DATE.html "https://www.market-link-express.com"

# 压缩备份
tar -czf $BACKUP_DIR/static_$DATE.tar.gz -C $BACKUP_DIR index_$DATE.html

# 清理临时文件
rm -f $BACKUP_DIR/index_$DATE.html

# 删除7天前的备份
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "$(date): 静态文件备份完成" >> $LOG_FILE
EOF

# 第六步：创建代码备份脚本
echo "📝 创建代码备份脚本..."
cat > /opt/market-link-express-backup/backup-code.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/market-link-express-backup/code/daily"
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/opt/market-link-express-backup/logs/code-backup-$(date +%Y%m%d).log"

echo "$(date): 开始代码备份..." >> $LOG_FILE

# 克隆代码仓库
cd /tmp
rm -rf ml-express-temp
git clone https://github.com/huangdelun16-lgtm/ml-express.git ml-express-temp

# 压缩备份
tar -czf $BACKUP_DIR/code_$DATE.tar.gz ml-express-temp/

# 清理临时文件
rm -rf /tmp/ml-express-temp

# 删除7天前的备份
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "$(date): 代码备份完成" >> $LOG_FILE
EOF

# 第七步：创建状态检查脚本
echo "📝 创建状态检查脚本..."
cat > /opt/market-link-express-backup/status.sh << 'EOF'
#!/bin/bash
echo "=== MARKET LINK EXPRESS 备份状态 ==="
echo "服务器时间: $(date)"
echo ""
echo "=== 备份目录大小 ==="
du -sh /opt/market-link-express-backup/*
echo ""
echo "=== 最新备份文件 ==="
find /opt/market-link-express-backup -name "*.json.gz" -o -name "*.tar.gz" | head -10
echo ""
echo "=== 磁盘使用情况 ==="
df -h
echo ""
echo "=== 网络连接测试 ==="
ping -c 1 8.8.8.8 > /dev/null && echo "网络连接正常" || echo "网络连接异常"
EOF

# 第八步：设置脚本权限
echo "🔐 设置脚本权限..."
chmod +x /opt/market-link-express-backup/*.sh

# 第九步：测试备份功能
echo "🧪 测试备份功能..."
echo "测试数据库备份..."
/opt/market-link-express-backup/backup-database.sh

echo "测试静态文件备份..."
/opt/market-link-express-backup/backup-static.sh

echo "测试代码备份..."
/opt/market-link-express-backup/backup-code.sh

# 第十步：配置定时任务
echo "⏰ 配置定时任务..."
cat > /etc/cron.d/market-link-express-backup << 'EOF'
# MARKET LINK EXPRESS 备份任务
0 2 * * * root /opt/market-link-express-backup/backup-database.sh
0 3 * * * root /opt/market-link-express-backup/backup-static.sh
0 4 * * * root /opt/market-link-express-backup/backup-code.sh
EOF

# 第十一步：显示状态
echo "📊 显示备份状态..."
/opt/market-link-express-backup/status.sh

echo ""
echo "🎉 Vultr 服务器备份设置完成！"
echo ""
echo "📋 设置摘要:"
echo "- 备份目录: /opt/market-link-express-backup"
echo "- 定时任务: 已配置"
echo "- 主服务: 不受影响"
echo ""
echo "🔍 检查状态:"
echo "运行: /opt/market-link-express-backup/status.sh"
echo ""
echo "📊 查看日志:"
echo "tail -f /opt/market-link-express-backup/logs/database-backup-$(date +%Y%m%d).log"
