#!/bin/bash

# 安全连接 Vultr 服务器脚本
# 确保不影响 Netlify 部署

echo "🛡️ 开始安全连接 Vultr 服务器..."

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then
    echo "❌ 请使用 root 用户运行此脚本"
    exit 1
fi

# 创建安全日志
SAFETY_LOG="/var/log/vultr-backup-safety.log"
echo "$(date): 开始安全连接流程" >> $SAFETY_LOG

# 第一步：验证当前系统状态
echo "📊 第一步：验证当前系统状态..."
echo "$(date): 验证系统状态" >> $SAFETY_LOG

# 检查系统信息
echo "系统信息:"
uname -a
echo ""

# 检查磁盘空间
echo "磁盘空间:"
df -h
echo ""

# 检查内存使用
echo "内存使用:"
free -h
echo ""

# 检查网络连接
echo "网络连接测试:"
ping -c 3 8.8.8.8
echo ""

# 第二步：创建安全备份目录
echo "📁 第二步：创建安全备份目录..."
echo "$(date): 创建备份目录" >> $SAFETY_LOG

# 创建备份目录（不影响系统目录）
mkdir -p /opt/market-link-express-backup/{database,static,code,logs}
mkdir -p /opt/market-link-express-backup/database/daily
mkdir -p /opt/market-link-express-backup/static/daily
mkdir -p /opt/market-link-express-backup/code/daily

# 设置安全权限
chmod 755 /opt/market-link-express-backup
chmod 755 /opt/market-link-express-backup/*
chown -R root:root /opt/market-link-express-backup

echo "✅ 备份目录创建完成: /opt/market-link-express-backup"

# 第三步：安装必要软件（安全版本）
echo "🔧 第三步：安装必要软件..."
echo "$(date): 安装软件" >> $SAFETY_LOG

# 更新包列表
apt update

# 安装必要软件（不覆盖现有配置）
apt install -y \
    postgresql-client \
    curl \
    wget \
    unzip \
    git \
    nginx \
    cron \
    logrotate

echo "✅ 软件安装完成"

# 第四步：创建安全备份脚本
echo "📝 第四步：创建安全备份脚本..."
echo "$(date): 创建备份脚本" >> $SAFETY_LOG

# 数据库备份脚本
cat > /opt/market-link-express-backup/backup-database.sh << 'EOF'
#!/bin/bash

# 安全数据库备份脚本
BACKUP_DIR="/opt/market-link-express-backup/database/daily"
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/opt/market-link-express-backup/logs/database-backup-$(date +%Y%m%d).log"

echo "$(date): 开始数据库备份..." >> $LOG_FILE

# 检查 Supabase 连接
if ! curl -f -s https://uopkyuluxnrewvlmutam.supabase.co > /dev/null; then
    echo "$(date): Supabase 连接失败，跳过备份" >> $LOG_FILE
    exit 1
fi

# 备份 packages 表（只读操作）
echo "$(date): 备份 packages 表..." >> $LOG_FILE
curl -s "https://uopkyuluxnrewvlmutam.supabase.co/rest/v1/packages?select=*" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcGt5dWx1eG5yZXd2bG11dGFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDMwMDAsImV4cCI6MjA3NDYxOTAwMH0._6AilDWJcevT-qo90f6wInAKw3aKn2a8jIM8BEGQ3rY" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcGt5dWx1eG5yZXd2bG11dGFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDMwMDAsImV4cCI6MjA3NDYxOTAwMH0._6AilDWJcevT-qo90f6wInAKw3aKn2a8jIM8BEGQ3rY" \
  > $BACKUP_DIR/packages_$DATE.json

# 备份 users 表（只读操作）
echo "$(date): 备份 users 表..." >> $LOG_FILE
curl -s "https://uopkyuluxnrewvlmutam.supabase.co/rest/v1/users?select=*" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcGt5dWx1eG5yZXd2bG11dGFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDMwMDAsImV4cCI6MjA3NDYxOTAwMH0._6AilDWJcevT-qo90f6wInAKw3aKn2a8jIM8BEGQ3rY" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcGt5dWx1eG5yZXd2bG11dGFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDMwMDAsImV4cCI6MjA3NDYxOTAwMH0._6AilDWJcevT-qo90f6wInAKw3aKn2a8jIM8BEGQ3rY" \
  > $BACKUP_DIR/users_$DATE.json

# 备份 couriers 表（只读操作）
echo "$(date): 备份 couriers 表..." >> $LOG_FILE
curl -s "https://uopkyuluxnrewvlmutam.supabase.co/rest/v1/couriers?select=*" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcGt5dWx1eG5yZXd2bG11dGFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDMwMDAsImV4cCI6MjA3NDYxOTAwMH0._6AilDWJcevT-qo90f6wInAKw3aKn2a8jIM8BEGQ3rY" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvcGt5dWx1eG5yZXd2bG11dGFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDMwMDAsImV4cCI6MjA3NDYxOTAwMH0._6AilDWJcevT-qo90f6wInAKw3aKn2a8jIM8BEGQ3rY" \
  > $BACKUP_DIR/couriers_$DATE.json

# 压缩备份文件
echo "$(date): 压缩备份文件..." >> $LOG_FILE
gzip $BACKUP_DIR/*_$DATE.json

# 删除7天前的备份
echo "$(date): 清理旧备份..." >> $LOG_FILE
find $BACKUP_DIR -name "*.json.gz" -mtime +7 -delete

echo "$(date): 数据库备份完成" >> $LOG_FILE
EOF

# 静态文件备份脚本
cat > /opt/market-link-express-backup/backup-static.sh << 'EOF'
#!/bin/bash

# 安全静态文件备份脚本
BACKUP_DIR="/opt/market-link-express-backup/static/daily"
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/opt/market-link-express-backup/logs/static-backup-$(date +%Y%m%d).log"

echo "$(date): 开始静态文件备份..." >> $LOG_FILE

# 检查 Netlify 连接
if ! curl -f -s https://www.market-link-express.com > /dev/null; then
    echo "$(date): Netlify 连接失败，跳过备份" >> $LOG_FILE
    exit 1
fi

# 下载网站首页作为备份
echo "$(date): 下载网站文件..." >> $LOG_FILE
wget -q -O $BACKUP_DIR/index_$DATE.html "https://www.market-link-express.com"

# 下载主要资源文件
wget -q -O $BACKUP_DIR/manifest_$DATE.json "https://www.market-link-express.com/manifest.json"

# 压缩备份
echo "$(date): 压缩备份..." >> $LOG_FILE
tar -czf $BACKUP_DIR/static_$DATE.tar.gz -C $BACKUP_DIR index_$DATE.html manifest_$DATE.json

# 清理临时文件
rm -f $BACKUP_DIR/index_$DATE.html $BACKUP_DIR/manifest_$DATE.json

# 删除7天前的备份
echo "$(date): 清理旧备份..." >> $LOG_FILE
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "$(date): 静态文件备份完成" >> $LOG_FILE
EOF

# 代码备份脚本
cat > /opt/market-link-express-backup/backup-code.sh << 'EOF'
#!/bin/bash

# 安全代码备份脚本
BACKUP_DIR="/opt/market-link-express-backup/code/daily"
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/opt/market-link-express-backup/logs/code-backup-$(date +%Y%m%d).log"

echo "$(date): 开始代码备份..." >> $LOG_FILE

# 检查 GitHub 连接
if ! curl -f -s https://github.com > /dev/null; then
    echo "$(date): GitHub 连接失败，跳过备份" >> $LOG_FILE
    exit 1
fi

# 克隆代码仓库到临时目录
echo "$(date): 克隆代码仓库..." >> $LOG_FILE
cd /tmp
rm -rf ml-express-temp
git clone https://github.com/huangdelun16-lgtm/ml-express.git ml-express-temp

# 压缩备份
echo "$(date): 压缩备份..." >> $LOG_FILE
tar -czf $BACKUP_DIR/code_$DATE.tar.gz ml-express-temp/

# 清理临时文件
rm -rf /tmp/ml-express-temp

# 删除7天前的备份
echo "$(date): 清理旧备份..." >> $LOG_FILE
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "$(date): 代码备份完成" >> $LOG_FILE
EOF

# 监控脚本
cat > /opt/market-link-express-backup/monitor.sh << 'EOF'
#!/bin/bash

# 安全监控脚本
LOG_FILE="/opt/market-link-express-backup/logs/monitor-$(date +%Y%m%d).log"

echo "$(date): 开始服务监控..." >> $LOG_FILE

# 检查主网站状态
if ! curl -f -s https://www.market-link-express.com > /dev/null; then
    echo "$(date): 主网站不可访问" >> $LOG_FILE
else
    echo "$(date): 主网站正常" >> $LOG_FILE
fi

# 检查 Supabase 状态
if ! curl -f -s https://uopkyuluxnrewvlmutam.supabase.co > /dev/null; then
    echo "$(date): Supabase 不可访问" >> $LOG_FILE
else
    echo "$(date): Supabase 正常" >> $LOG_FILE
fi

echo "$(date): 服务监控完成" >> $LOG_FILE
EOF

# 状态检查脚本
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

# 设置脚本权限
chmod +x /opt/market-link-express-backup/*.sh

echo "✅ 备份脚本创建完成"

# 第五步：配置安全定时任务
echo "⏰ 第五步：配置安全定时任务..."
echo "$(date): 配置定时任务" >> $SAFETY_LOG

# 创建定时任务（不覆盖现有任务）
cat > /etc/cron.d/market-link-express-backup-safe << 'EOF'
# MARKET LINK EXPRESS 安全备份任务
# 每天凌晨2点备份数据库
0 2 * * * root /opt/market-link-express-backup/backup-database.sh

# 每天凌晨3点备份静态文件
0 3 * * * root /opt/market-link-express-backup/backup-static.sh

# 每天凌晨4点备份代码
0 4 * * * root /opt/market-link-express-backup/backup-code.sh

# 每5分钟检查服务状态
*/5 * * * * root /opt/market-link-express-backup/monitor.sh
EOF

echo "✅ 定时任务配置完成"

# 第六步：测试备份功能
echo "🧪 第六步：测试备份功能..."
echo "$(date): 测试备份功能" >> $SAFETY_LOG

# 测试数据库备份
echo "测试数据库备份..."
/opt/market-link-express-backup/backup-database.sh

# 测试静态文件备份
echo "测试静态文件备份..."
/opt/market-link-express-backup/backup-static.sh

# 测试代码备份
echo "测试代码备份..."
/opt/market-link-express-backup/backup-code.sh

# 测试监控
echo "测试监控..."
/opt/market-link-express-backup/monitor.sh

echo "✅ 备份功能测试完成"

# 第七步：验证主服务不受影响
echo "🔍 第七步：验证主服务不受影响..."
echo "$(date): 验证主服务" >> $SAFETY_LOG

# 检查主网站
echo "检查主网站状态..."
if curl -f -s https://www.market-link-express.com > /dev/null; then
    echo "✅ 主网站正常"
else
    echo "❌ 主网站异常"
fi

# 检查 Supabase
echo "检查 Supabase 状态..."
if curl -f -s https://uopkyuluxnrewvlmutam.supabase.co > /dev/null; then
    echo "✅ Supabase 正常"
else
    echo "❌ Supabase 异常"
fi

echo "✅ 主服务验证完成"

# 第八步：创建安全回滚脚本
echo "🔄 第八步：创建安全回滚脚本..."
echo "$(date): 创建回滚脚本" >> $SAFETY_LOG

cat > /opt/market-link-express-backup/rollback.sh << 'EOF'
#!/bin/bash

echo "🔄 开始回滚操作..."

# 停止定时任务
echo "停止定时任务..."
rm -f /etc/cron.d/market-link-express-backup-safe

# 删除备份目录
echo "删除备份目录..."
rm -rf /opt/market-link-express-backup

# 清理日志
echo "清理日志..."
rm -f /var/log/vultr-backup-safety.log

echo "✅ 回滚完成"
echo "主服务不受影响，可以继续正常使用"
EOF

chmod +x /opt/market-link-express-backup/rollback.sh

echo "✅ 回滚脚本创建完成"

# 完成设置
echo ""
echo "🎉 Vultr 服务器安全连接完成！"
echo ""
echo "📋 设置摘要:"
echo "- 备份目录: /opt/market-link-express-backup"
echo "- 定时任务: 已配置"
echo "- 主服务: 不受影响"
echo "- 回滚脚本: /opt/market-link-express-backup/rollback.sh"
echo ""
echo "🔍 检查状态:"
echo "运行: /opt/market-link-express-backup/status.sh"
echo ""
echo "🔄 如需回滚:"
echo "运行: /opt/market-link-express-backup/rollback.sh"
echo ""
echo "📊 安全日志: $SAFETY_LOG"

echo "$(date): 安全连接完成" >> $SAFETY_LOG
