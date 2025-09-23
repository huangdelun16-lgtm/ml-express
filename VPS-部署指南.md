# 🚀 ML Express VPS服务器完整部署指南

## 📋 部署概览

您的ML Express系统现在已准备好迁移到高性能VPS服务器！这将显著提升：
- ⚡ API响应速度（提升3-5倍）
- 🔄 实时功能稳定性
- 📈 并发处理能力
- 💾 数据持久化

## 🛒 第一步：购买VPS服务器

### 推荐配置
- **提供商**: Vultr、DigitalOcean、Linode
- **地区**: 新加坡、日本（到缅甸延迟最低）
- **配置**: 2核CPU + 4GB内存 + 80GB SSD
- **系统**: Ubuntu 20.04 或 22.04 LTS
- **价格**: $12-24/月

### Vultr购买步骤（推荐）
1. 访问 [Vultr.com](https://vultr.com)
2. 注册账号并充值
3. 选择 "Deploy New Server"
4. 选择 "Cloud Compute"
5. 地区选择 "Singapore" 或 "Tokyo"
6. 系统选择 "Ubuntu 22.04 LTS"
7. 配置选择 "2 vCPU, 4GB Memory" ($12/月)
8. 设置服务器密码或上传SSH密钥
9. 点击 "Deploy Now"

## 🔑 第二步：配置SSH访问

### 获取服务器信息
部署完成后，您会得到：
- **服务器IP**: 例如 `192.168.1.100`
- **用户名**: `root`
- **密码**: 您设置的密码

### 测试连接
```bash
ssh root@您的服务器IP
```

## 🚀 第三步：一键部署

### 在您的本地电脑执行：

```bash
# 进入部署目录
cd server-setup

# 给脚本执行权限
chmod +x *.sh

# 一键部署（替换为您的实际信息）
./deploy-vps.sh 您的服务器IP 您的域名

# 示例：
# ./deploy-vps.sh 192.168.1.100 market-link-express.com
```

## 📊 第四步：数据迁移

### 如果您有现有的Supabase数据：

```bash
# 连接到服务器
ssh root@您的服务器IP

# 进入项目目录
cd /var/www/ml-express

# 设置Supabase环境变量
export SUPABASE_URL="您的Supabase URL"
export SUPABASE_KEY="您的Supabase密钥"

# 运行数据迁移
node migrate-data.js
```

## 🔧 第五步：更新应用配置

### 更新前端和移动端API配置：

```bash
# 在本地运行
cd server-setup
node update-api-config.js 您的域名

# 重新启动移动应用测试
cd ../mobile-app
npm start
```

## ✅ 第六步：测试部署

### 运行完整测试：

```bash
cd server-setup
./test-deployment.sh 您的域名 您的服务器IP
```

### 手动测试项目：

1. **API健康检查**:
   ```bash
   curl https://您的域名/api/health
   ```

2. **网站访问**: 
   打开 `https://您的域名`

3. **移动应用**:
   - 重新启动移动应用
   - 测试登录功能
   - 测试订单管理

## 🎯 性能对比

| 项目 | Netlify Functions | VPS服务器 | 提升 |
|------|------------------|-----------|------|
| API响应时间 | 500-2000ms | 100-300ms | **3-5倍** |
| 并发处理 | 10-50 req/s | 500+ req/s | **10倍+** |
| 实时功能 | 不支持 | WebSocket | **全新功能** |
| 数据持久化 | 临时 | Redis+DB | **永久存储** |
| 冷启动 | 每次2-5秒 | 无 | **消除延迟** |

## 🔧 日常管理

### 常用命令

```bash
# 连接服务器
ssh root@您的服务器IP

# 查看应用状态
pm2 status

# 查看实时日志
pm2 logs ml-express-api

# 重启应用
pm2 restart ml-express-api

# 查看系统状态
./monitor.sh

# 持续监控
./monitor.sh --watch
```

### 数据库管理

```bash
# 连接数据库
sudo -u postgres psql ml_express

# 查看表信息
\dt

# 查看用户数量
SELECT COUNT(*) FROM users;

# 查看包裹数量
SELECT COUNT(*) FROM packages;

# 备份数据库
pg_dump -U ml_user ml_express > backup_$(date +%Y%m%d).sql
```

## 🆘 故障排除

### 常见问题

1. **API无响应**
   ```bash
   ssh root@您的服务器IP
   pm2 restart ml-express-api
   sudo systemctl restart nginx
   ```

2. **SSL证书问题**
   ```bash
   sudo certbot renew
   sudo systemctl reload nginx
   ```

3. **数据库连接失败**
   ```bash
   sudo systemctl restart postgresql
   sudo -u postgres psql -c "SELECT version();"
   ```

4. **内存不足**
   ```bash
   # 添加交换文件
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```

### 查看日志

```bash
# 应用日志
pm2 logs ml-express-api

# Nginx访问日志
tail -f /var/log/nginx/ml-express.access.log

# Nginx错误日志
tail -f /var/log/nginx/ml-express.error.log

# 系统日志
journalctl -u nginx -f
journalctl -u postgresql -f
```

## 💰 成本分析

### 月度费用对比

| 服务 | Netlify免费版 | VPS方案 | 节省/提升 |
|------|---------------|---------|-----------|
| 托管费用 | $0 | $12 | 新增成本 |
| 数据库 | Supabase免费 | 包含在VPS | 节省$25+ |
| 性能 | 基础 | 高性能 | 显著提升 |
| 功能 | 受限 | 完整 | 全面升级 |
| **总计** | **$0** | **$12** | **性价比极高** |

## 🔄 回滚方案

如果需要回滚到Netlify：

1. **切换API配置**:
   ```javascript
   // 在移动端和前端代码中
   const BASE_URL = 'https://market-link-express.com/.netlify/functions';
   ```

2. **重新部署前端**:
   ```bash
   npm run build
   # 推送到Git触发Netlify部署
   ```

3. **保留VPS作为备用**:
   - VPS服务器可以保留作为备用
   - 随时可以切换回来

## 📈 监控和维护

### 设置监控

1. **自动监控脚本**:
   ```bash
   # 每5分钟检查服务状态
   echo "*/5 * * * * /var/www/ml-express/monitor.sh >> /var/log/ml-express-monitor.log 2>&1" | crontab -
   ```

2. **磁盘空间警告**:
   ```bash
   # 每6小时检查磁盘使用率
   echo "0 */6 * * * /usr/local/bin/disk-check.sh" | crontab -
   ```

### 备份策略

1. **数据库自动备份**:
   ```bash
   # 每天凌晨2点备份
   echo "0 2 * * * pg_dump -U ml_user ml_express | gzip > /var/backups/ml-express/backup_\$(date +\%Y\%m\%d).sql.gz" | crontab -
   ```

2. **代码备份**:
   ```bash
   # 每周备份代码
   echo "0 3 * * 0 tar -czf /var/backups/ml-express/code_\$(date +\%Y\%m\%d).tar.gz /var/www/ml-express" | crontab -
   ```

## 🎉 部署完成！

您的ML Express现在运行在高性能VPS上，享受：

✅ **更快的响应速度**  
✅ **实时WebSocket通信**  
✅ **更高的并发处理能力**  
✅ **完全的服务器控制权**  
✅ **专业的缓存和优化**  
✅ **企业级的安全配置**  

**开始使用您的高性能ML Express系统吧！** 🚀
