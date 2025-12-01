# Vultr 服务器手动连接指南

## 服务器信息
- **IP地址**: 139.180.146.26
- **用户名**: root
- **密码**: Yv,6CPwRFKtkkK8?
- **位置**: 新加坡
- **配置**: 2 vCPU, 2GB RAM, 60GB NVMe

## 第一步：连接到服务器

### ⚠️ 重要提示

**推荐使用 SSH Key 认证**（更安全，无需每次输入密码）

- 📖 详细配置指南请查看：[SSH Key 配置指南](./SSH_KEY_SETUP_GUIDE.md)
- 🔐 配置完成后，可以直接使用 `ssh root@139.180.146.26` 登录，无需密码

---

### 方法一：使用 SSH Key 认证（推荐）

如果已配置 SSH Key：
```bash
ssh root@139.180.146.26
# 无需输入密码，直接登录
```

如果未配置 SSH Key，请先查看 [SSH Key 配置指南](./SSH_KEY_SETUP_GUIDE.md)

---

### 方法二：使用密码登录

```bash
ssh root@139.180.146.26
# 输入密码: Yv,6CPwRFKtkkK8?
```

### 方法三：使用 PuTTY (Windows)
1. 打开 PuTTY
2. 输入 IP: 139.180.146.26
3. 端口: 22
4. 连接类型: SSH
5. 点击 "Open"
6. 输入用户名: root
7. 输入密码: Yv,6CPwRFKtkkK8?

## 第二步：检查服务器状态

连接成功后，运行以下命令检查服务器状态：

```bash
# 检查系统信息
uname -a

# 检查磁盘空间
df -h

# 检查内存使用
free -h

# 检查网络连接
ping -c 3 8.8.8.8

# 检查系统负载
uptime
```

## 第三步：手动安装必要软件

```bash
# 更新系统包
apt update && apt upgrade -y

# 安装必要软件
apt install -y curl wget unzip git nginx postgresql-client

# 检查安装结果
which curl wget git nginx psql
```

## 第四步：创建备份目录

```bash
# 创建备份目录
mkdir -p /opt/market-link-express-backup/{database,static,code,logs}
mkdir -p /opt/market-link-express-backup/database/daily
mkdir -p /opt/market-link-express-backup/static/daily
mkdir -p /opt/market-link-express-backup/code/daily

# 设置权限
chmod 755 /opt/market-link-express-backup
chmod 755 /opt/market-link-express-backup/*

# 验证目录创建
ls -la /opt/market-link-express-backup/
```

## 第五步：创建备份脚本

### 数据库备份脚本
```bash
cat > /opt/market-link-express-backup/backup-database.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/opt/market-link-express-backup/database/daily"
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/opt/market-link-express-backup/logs/database-backup-$(date +%Y%m%d).log"

echo "$(date): 开始数据库备份..." >> $LOG_FILE

# 检查 Supabase 连接
if ! curl -f -s https://uopkyuluxnrewvlmutam.supabase.co > /dev/null; then
    echo "$(date): Supabase 连接失败，跳过备份" >> $LOG_FILE
    exit 1
fi

# 备份 packages 表
echo "$(date): 备份 packages 表..." >> $LOG_FILE
curl -s "https://uopkyuluxnrewvlmutam.supabase.co/rest/v1/packages?select=*" \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  > $BACKUP_DIR/packages_$DATE.json

# 备份 users 表
echo "$(date): 备份 users 表..." >> $LOG_FILE
curl -s "https://uopkyuluxnrewvlmutam.supabase.co/rest/v1/users?select=*" \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  > $BACKUP_DIR/users_$DATE.json

# 备份 couriers 表
echo "$(date): 备份 couriers 表..." >> $LOG_FILE
curl -s "https://uopkyuluxnrewvlmutam.supabase.co/rest/v1/couriers?select=*" \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  > $BACKUP_DIR/couriers_$DATE.json

# 压缩备份文件
echo "$(date): 压缩备份文件..." >> $LOG_FILE
gzip $BACKUP_DIR/*_$DATE.json

# 删除7天前的备份
echo "$(date): 清理旧备份..." >> $LOG_FILE
find $BACKUP_DIR -name "*.json.gz" -mtime +7 -delete

echo "$(date): 数据库备份完成" >> $LOG_FILE
EOF
```

### 静态文件备份脚本
```bash
cat > /opt/market-link-express-backup/backup-static.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/opt/market-link-express-backup/static/daily"
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/opt/market-link-express-backup/logs/static-backup-$(date +%Y%m%d).log"

echo "$(date): 开始静态文件备份..." >> $LOG_FILE

# 检查 Netlify 连接
if ! curl -f -s https://www.market-link-express.com > /dev/null; then
    echo "$(date): Netlify 连接失败，跳过备份" >> $LOG_FILE
    exit 1
fi

# 下载网站首页
echo "$(date): 下载网站文件..." >> $LOG_FILE
wget -q -O $BACKUP_DIR/index_$DATE.html "https://www.market-link-express.com"

# 压缩备份
echo "$(date): 压缩备份..." >> $LOG_FILE
tar -czf $BACKUP_DIR/static_$DATE.tar.gz -C $BACKUP_DIR index_$DATE.html

# 清理临时文件
rm -f $BACKUP_DIR/index_$DATE.html

# 删除7天前的备份
echo "$(date): 清理旧备份..." >> $LOG_FILE
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "$(date): 静态文件备份完成" >> $LOG_FILE
EOF
```

### 代码备份脚本
```bash
cat > /opt/market-link-express-backup/backup-code.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/opt/market-link-express-backup/code/daily"
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="/opt/market-link-express-backup/logs/code-backup-$(date +%Y%m%d).log"

echo "$(date): 开始代码备份..." >> $LOG_FILE

# 检查 GitHub 连接
if ! curl -f -s https://github.com > /dev/null; then
    echo "$(date): GitHub 连接失败，跳过备份" >> $LOG_FILE
    exit 1
fi

# 克隆代码仓库
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
```

### 状态检查脚本
```bash
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
```

## 第六步：设置脚本权限

```bash
# 设置脚本执行权限
chmod +x /opt/market-link-express-backup/*.sh

# 验证权限
ls -la /opt/market-link-express-backup/*.sh
```

## 第七步：测试备份功能

```bash
# 测试数据库备份
/opt/market-link-express-backup/backup-database.sh

# 测试静态文件备份
/opt/market-link-express-backup/backup-static.sh

# 测试代码备份
/opt/market-link-express-backup/backup-code.sh

# 检查状态
/opt/market-link-express-backup/status.sh
```

## 第八步：配置定时任务

```bash
# 创建定时任务
cat > /etc/cron.d/market-link-express-backup << 'EOF'
# MARKET LINK EXPRESS 备份任务
0 2 * * * root /opt/market-link-express-backup/backup-database.sh
0 3 * * * root /opt/market-link-express-backup/backup-static.sh
0 4 * * * root /opt/market-link-express-backup/backup-code.sh
EOF

# 验证定时任务
crontab -l
```

## 故障排除

### 常见错误及解决方案

1. **连接被拒绝**
   ```bash
   # 检查 SSH 服务状态
   systemctl status ssh
   
   # 重启 SSH 服务
   systemctl restart ssh
   ```

2. **权限被拒绝**
   ```bash
   # 检查文件权限
   ls -la /opt/market-link-express-backup/
   
   # 修复权限
   chmod +x /opt/market-link-express-backup/*.sh
   ```

3. **网络连接失败**
   ```bash
   # 检查网络连接
   ping -c 3 8.8.8.8
   
   # 检查 DNS 解析
   nslookup github.com
   ```

4. **磁盘空间不足**
   ```bash
   # 检查磁盘空间
   df -h
   
   # 清理临时文件
   rm -rf /tmp/*
   ```

## 验证连接成功

连接成功后，您应该看到：

1. **备份目录创建成功**
   ```bash
   ls -la /opt/market-link-express-backup/
   ```

2. **脚本文件存在且可执行**
   ```bash
   ls -la /opt/market-link-express-backup/*.sh
   ```

3. **测试备份成功**
   ```bash
   /opt/market-link-express-backup/status.sh
   ```

4. **定时任务配置成功**
   ```bash
   crontab -l
   ```

## 联系支持

如果遇到问题，请提供：
1. 错误信息截图
2. 执行的命令
3. 服务器状态信息
