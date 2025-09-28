#!/bin/bash

# 从备份恢复数据脚本
# 用于在灾难恢复时从 Vultr 备份恢复数据

echo "🔄 开始从备份恢复数据..."

# 检查参数
if [ $# -eq 0 ]; then
    echo "用法: $0 <备份日期> [恢复类型]"
    echo "备份日期格式: YYYYMMDD_HHMMSS"
    echo "恢复类型: database|static|code|all (默认: all)"
    echo ""
    echo "可用备份:"
    ls -la /backup/database/daily/*.sql.gz 2>/dev/null | awk '{print $9}' | sed 's/.*_\([0-9_]*\)\.sql\.gz/\1/'
    exit 1
fi

BACKUP_DATE=$1
RESTORE_TYPE=${2:-all}
LOG_FILE="/backup/logs/restore-$(date +%Y%m%d_%H%M%S).log"

echo "$(date): 开始恢复备份 $BACKUP_DATE，类型: $RESTORE_TYPE" >> $LOG_FILE

# 恢复数据库
if [ "$RESTORE_TYPE" = "database" ] || [ "$RESTORE_TYPE" = "all" ]; then
    echo "📊 恢复数据库..."
    echo "$(date): 恢复数据库..." >> $LOG_FILE
    
    # 检查备份文件是否存在
    if [ -f "/backup/database/daily/packages_$BACKUP_DATE.sql.gz" ]; then
        echo "恢复 packages 表..."
        gunzip -c /backup/database/daily/packages_$BACKUP_DATE.sql.gz | psql $SUPABASE_DB_URL
    fi
    
    if [ -f "/backup/database/daily/users_$BACKUP_DATE.sql.gz" ]; then
        echo "恢复 users 表..."
        gunzip -c /backup/database/daily/users_$BACKUP_DATE.sql.gz | psql $SUPABASE_DB_URL
    fi
    
    if [ -f "/backup/database/daily/couriers_$BACKUP_DATE.sql.gz" ]; then
        echo "恢复 couriers 表..."
        gunzip -c /backup/database/daily/couriers_$BACKUP_DATE.sql.gz | psql $SUPABASE_DB_URL
    fi
    
    echo "$(date): 数据库恢复完成" >> $LOG_FILE
fi

# 恢复静态文件
if [ "$RESTORE_TYPE" = "static" ] || [ "$RESTORE_TYPE" = "all" ]; then
    echo "🌐 恢复静态文件..."
    echo "$(date): 恢复静态文件..." >> $LOG_FILE
    
    if [ -f "/backup/static/daily/build_$BACKUP_DATE.tar.gz" ]; then
        # 解压到临时目录
        mkdir -p /tmp/restore
        tar -xzf /backup/static/daily/build_$BACKUP_DATE.tar.gz -C /tmp/restore
        
        # 复制到 Nginx 目录
        rm -rf /backup/static/current
        mv /tmp/restore/build_$BACKUP_DATE /backup/static/current
        
        # 重启 Nginx
        systemctl restart nginx
        
        echo "$(date): 静态文件恢复完成" >> $LOG_FILE
    else
        echo "❌ 静态文件备份不存在: /backup/static/daily/build_$BACKUP_DATE.tar.gz"
        echo "$(date): 静态文件备份不存在" >> $LOG_FILE
    fi
fi

# 恢复代码
if [ "$RESTORE_TYPE" = "code" ] || [ "$RESTORE_TYPE" = "all" ]; then
    echo "💻 恢复代码..."
    echo "$(date): 恢复代码..." >> $LOG_FILE
    
    if [ -f "/backup/code/daily/code_$BACKUP_DATE.tar.gz" ]; then
        # 解压到临时目录
        mkdir -p /tmp/restore
        tar -xzf /backup/code/daily/code_$BACKUP_DATE.tar.gz -C /tmp/restore
        
        # 复制到代码目录
        rm -rf /backup/code/current
        mv /tmp/restore/code_$BACKUP_DATE /backup/code/current
        
        echo "$(date): 代码恢复完成" >> $LOG_FILE
    else
        echo "❌ 代码备份不存在: /backup/code/daily/code_$BACKUP_DATE.tar.gz"
        echo "$(date): 代码备份不存在" >> $LOG_FILE
    fi
fi

# 清理临时文件
rm -rf /tmp/restore

echo "✅ 恢复完成！"
echo "📋 恢复日志: $LOG_FILE"
echo "$(date): 恢复操作完成" >> $LOG_FILE
