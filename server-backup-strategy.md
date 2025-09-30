# Vultr 云服务器连接和数据备份策略

## 当前架构分析

### 现有架构
```
前端 (React) → Netlify CDN → Supabase 数据库
     ↓
  静态文件托管    →   云数据库服务
```

### 数据存储现状
- **前端代码**: GitHub + Netlify 自动部署
- **数据库**: Supabase PostgreSQL
- **静态资源**: Netlify CDN

## Vultr 服务器连接方案

### 方案一：数据备份服务器
```
前端 (React) → Netlify CDN → Supabase 数据库
     ↓              ↓
  静态文件托管    →   云数据库服务
     ↓              ↓
  Vultr 服务器 ← 定期数据备份
```

### 方案二：完整迁移
```
前端 (React) → Vultr 服务器 → 自建数据库
     ↓
  完整应用托管
```

## 推荐方案：混合架构

### 1. 保持现有架构
- 继续使用 Netlify + Supabase
- 确保服务稳定性

### 2. 添加 Vultr 备份
- 定期备份 Supabase 数据到 Vultr
- 存储静态文件备份
- 代码仓库镜像

### 3. 灾难恢复
- 主服务故障时切换到 Vultr
- 数据完整性保障

## 实施步骤

### 第一步：数据备份脚本
```bash
# 创建备份脚本
#!/bin/bash
# backup-to-vultr.sh

# 1. 备份 Supabase 数据
pg_dump $SUPABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. 备份静态文件
rsync -av /path/to/build/ user@vultr-server:/backup/static/

# 3. 备份代码
git clone https://github.com/your-repo.git /backup/code/
```

### 第二步：Vultr 服务器配置
```bash
# 安装必要软件
sudo apt update
sudo apt install nginx postgresql-client git

# 配置 Nginx
sudo nano /etc/nginx/sites-available/backup-site

# 设置定时备份
crontab -e
# 每天凌晨2点备份
0 2 * * * /path/to/backup-script.sh
```

### 第三步：监控和告警
```bash
# 监控脚本
#!/bin/bash
# monitor.sh

# 检查主服务状态
if ! curl -f https://www.market-link-express.com > /dev/null; then
    # 发送告警
    echo "主服务故障，启动备用服务" | mail -s "服务告警" admin@example.com
    # 启动备用服务
    systemctl start nginx
fi
```

## 数据安全策略

### 1. 多重备份
- **实时备份**: Supabase 自动备份
- **定期备份**: Vultr 服务器备份
- **本地备份**: 开发环境备份

### 4. 系统配置备份
- **Supabase `system_settings` 表**：存放后台配置、计费规则、通知模板等动态参数。
- 建议在数据库备份脚本中追加：
  ```bash
  pg_dump "$SUPABASE_DB_URL" --table=public.system_settings --data-only --column-inserts \
    > /backups/db/system_settings-data.sql
  ```
- 恢复时先导入基础表结构 `supabase-system-settings-setup.sql`，再执行数据文件。

### 2. 备份频率
- **数据库**: 每日备份
- **静态文件**: 每周备份
- **代码**: 每次部署备份

### 3. 备份验证
- 定期测试备份恢复
- 验证数据完整性
- 检查备份文件大小

## 成本分析

### 当前成本
- Netlify: 免费
- Supabase: 免费额度
- 总计: $0/月

### 添加 Vultr 后
- Vultr 服务器: $5-20/月
- 存储空间: $1-5/月
- 总计: $6-25/月

## 风险评估

### 不连接 Vultr 的风险
- 数据丢失风险
- 服务中断风险
- 单点故障风险

### 连接 Vultr 的优势
- 数据安全保障
- 服务冗余
- 灾难恢复能力

## 建议

### 立即实施
1. 设置 Supabase 数据导出
2. 配置 Vultr 服务器
3. 创建备份脚本
4. 测试恢复流程

### 长期规划
1. 监控服务状态
2. 优化备份策略
3. 考虑完整迁移
4. 扩展服务功能

## 结论

**建议连接 Vultr 服务器作为备份和灾难恢复方案**，确保数据安全和服务连续性。
