# Vultr 服务器备份方案

## 概述

这个备份方案为 MARKET LINK EXPRESS 网站提供完整的数据备份和灾难恢复解决方案，利用 Vultr 云服务器确保数据安全。

## 架构

```
主服务架构:
前端 (React) → Netlify CDN → Supabase 数据库

备份架构:
Vultr 服务器 ← 定期备份 ← 主服务
     ↓
  灾难恢复服务
```

## 文件说明

### 1. `setup-vultr-backup.sh`
- 自动设置 Vultr 服务器备份环境
- 安装必要软件和配置
- 创建备份脚本和定时任务

### 2. `restore-from-backup.sh`
- 从备份恢复数据的脚本
- 支持选择性恢复（数据库/静态文件/代码）
- 灾难恢复时使用

### 3. `server-backup-strategy.md`
- 详细的备份策略文档
- 成本分析和风险评估
- 实施建议

## 快速开始

### 1. 在 Vultr 服务器上运行设置脚本

```bash
# 下载并运行设置脚本
wget https://raw.githubusercontent.com/your-repo/backup-scripts/main/setup-vultr-backup.sh
chmod +x setup-vultr-backup.sh
sudo ./setup-vultr-backup.sh
```

### 2. 配置数据库连接

编辑 `/backup/backup-database.sh`，替换以下信息：
- `SUPABASE_DB_URL`: Supabase 数据库连接字符串
- `SUPABASE_URL`: Supabase 项目 URL

### 3. 配置 Netlify API

编辑 `/backup/backup-static.sh`，替换以下信息：
- `[SITE_ID]`: Netlify 站点 ID
- `[DEPLOY_ID]`: 部署 ID

### 4. 测试备份

```bash
# 手动运行备份测试
sudo -u backup /backup/backup-database.sh
sudo -u backup /backup/backup-static.sh
sudo -u backup /backup/backup-code.sh
```

## 备份计划

### 自动备份时间表
- **数据库备份**: 每天凌晨 2:00
- **静态文件备份**: 每天凌晨 3:00
- **代码备份**: 每天凌晨 4:00
- **服务监控**: 每 5 分钟

### 备份保留策略
- **每日备份**: 保留 7 天
- **每周备份**: 保留 4 周
- **每月备份**: 保留 12 个月

## 监控和告警

### 服务状态监控
- 主网站可访问性检查
- Supabase 数据库连接检查
- 备份任务执行状态检查

### 告警机制
- 邮件告警（需要配置 SMTP）
- 日志记录
- 状态页面显示

## 灾难恢复

### 恢复步骤

1. **评估损失**
   ```bash
   /backup/status.sh
   ```

2. **选择恢复点**
   ```bash
   ls -la /backup/database/daily/
   ```

3. **执行恢复**
   ```bash
   ./restore-from-backup.sh 20241228_020000 database
   ```

4. **验证恢复**
   ```bash
   curl -f https://your-vultr-server-ip/
   ```

### 恢复类型
- `database`: 仅恢复数据库
- `static`: 仅恢复静态文件
- `code`: 仅恢复代码
- `all`: 恢复所有数据

## 访问备份

### 通过 Web 界面
```
http://your-vultr-server-ip/backup/
```

### 通过命令行
```bash
# 查看备份状态
/backup/status.sh

# 查看备份文件
ls -la /backup/database/daily/
ls -la /backup/static/daily/
ls -la /backup/code/daily/
```

## 维护任务

### 定期检查
- 每周检查备份文件完整性
- 每月测试恢复流程
- 每季度更新备份策略

### 日志管理
```bash
# 查看备份日志
tail -f /backup/logs/database-backup-$(date +%Y%m%d).log

# 清理旧日志
find /backup/logs -name "*.log" -mtime +30 -delete
```

## 安全考虑

### 访问控制
- 备份目录权限设置
- SSH 密钥认证
- 防火墙配置

### 数据加密
- 备份文件加密（可选）
- 传输加密
- 存储加密

## 故障排除

### 常见问题

1. **备份失败**
   ```bash
   # 检查日志
   tail -f /backup/logs/database-backup-$(date +%Y%m%d).log
   
   # 检查网络连接
   ping uopkyuluxnrewvlmutam.supabase.co
   ```

2. **恢复失败**
   ```bash
   # 检查备份文件
   file /backup/database/daily/packages_20241228_020000.sql.gz
   
   # 测试数据库连接
   psql $SUPABASE_DB_URL -c "SELECT 1;"
   ```

3. **服务不可访问**
   ```bash
   # 检查 Nginx 状态
   systemctl status nginx
   
   # 检查端口
   netstat -tlnp | grep :80
   ```

## 联系支持

如果遇到问题，请：
1. 检查日志文件
2. 运行状态检查脚本
3. 查看故障排除指南
4. 联系技术支持

## 更新日志

- **v1.0.0**: 初始版本，基本备份功能
- **v1.1.0**: 添加监控和告警
- **v1.2.0**: 优化恢复流程
