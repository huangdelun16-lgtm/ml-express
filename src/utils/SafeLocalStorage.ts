// 安全的 localStorage 操作工具类
export class SafeLocalStorage {
  private static readonly MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly ERROR_LOG_KEY = 'storage_errors';
  
  /**
   * 安全获取数据
   */
  static get<T = any>(key: string, defaultValue: T | null = null): T | null {
    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        return defaultValue;
      }
      
      return JSON.parse(item) as T;
    } catch (error) {
      console.error(`SafeLocalStorage.get failed for key "${key}":`, error);
      this.logError('get', key, error);
      return defaultValue;
    }
  }

  /**
   * 安全设置数据
   */
  static set<T = any>(key: string, value: T): boolean {
    try {
      const serializedValue = JSON.stringify(value);
      
      // 检查存储大小
      if (serializedValue.length > this.MAX_STORAGE_SIZE) {
        console.warn(`Data too large for key "${key}": ${serializedValue.length} bytes`);
        this.logError('set', key, new Error('Data too large'));
        return false;
      }
      
      // 检查可用存储空间
      if (!this.checkStorageSpace(serializedValue.length)) {
        console.warn('Insufficient storage space');
        this.cleanupOldData();
        
        // 再次检查
        if (!this.checkStorageSpace(serializedValue.length)) {
          this.logError('set', key, new Error('Insufficient storage space'));
          return false;
        }
      }
      
      localStorage.setItem(key, serializedValue);
      return true;
    } catch (error) {
      console.error(`SafeLocalStorage.set failed for key "${key}":`, error);
      this.logError('set', key, error);
      
      // 尝试清理存储空间后重试
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        this.cleanupOldData();
        try {
          localStorage.setItem(key, JSON.stringify(value));
          return true;
        } catch (retryError) {
          console.error('Retry after cleanup also failed:', retryError);
          return false;
        }
      }
      
      return false;
    }
  }

  /**
   * 安全删除数据
   */
  static remove(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`SafeLocalStorage.remove failed for key "${key}":`, error);
      this.logError('remove', key, error);
      return false;
    }
  }

  /**
   * 检查键是否存在
   */
  static has(key: string): boolean {
    try {
      return localStorage.getItem(key) !== null;
    } catch (error) {
      console.error(`SafeLocalStorage.has failed for key "${key}":`, error);
      return false;
    }
  }

  /**
   * 获取所有键
   */
  static keys(): string[] {
    try {
      return Object.keys(localStorage);
    } catch (error) {
      console.error('SafeLocalStorage.keys failed:', error);
      return [];
    }
  }

  /**
   * 清空所有数据
   */
  static clear(): boolean {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('SafeLocalStorage.clear failed:', error);
      return false;
    }
  }

  /**
   * 获取存储使用情况
   */
  static getStorageInfo(): {
    used: number;
    available: number;
    total: number;
    percentage: number;
  } {
    try {
      let used = 0;
      
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          used += localStorage[key].length + key.length;
        }
      }
      
      const total = this.MAX_STORAGE_SIZE;
      const available = total - used;
      const percentage = (used / total) * 100;
      
      return {
        used,
        available,
        total,
        percentage,
      };
    } catch (error) {
      console.error('获取存储信息失败:', error);
      return {
        used: 0,
        available: this.MAX_STORAGE_SIZE,
        total: this.MAX_STORAGE_SIZE,
        percentage: 0,
      };
    }
  }

  /**
   * 检查存储空间是否足够
   */
  private static checkStorageSpace(requiredSize: number): boolean {
    const info = this.getStorageInfo();
    return info.available >= requiredSize;
  }

  /**
   * 清理旧数据
   */
  private static cleanupOldData(): void {
    try {
      console.log('开始清理localStorage旧数据');
      
      // 清理策略：删除最旧的非关键数据
      const criticalKeys = [
        'adminUser',
        'company_employees',
        'finance_records',
      ];
      
      const allKeys = this.keys();
      const nonCriticalKeys = allKeys.filter(key => !criticalKeys.includes(key));
      
      // 按时间戳排序（如果有的话）
      const keysWithTimestamp = nonCriticalKeys
        .map(key => {
          try {
            const data = this.get(key);
            const timestamp = data?.timestamp || data?.createdAt || data?.updatedAt || 0;
            return { key, timestamp: new Date(timestamp).getTime() || 0 };
          } catch {
            return { key, timestamp: 0 };
          }
        })
        .sort((a, b) => a.timestamp - b.timestamp);
      
      // 删除最旧的数据直到有足够空间
      let cleanedCount = 0;
      for (const { key } of keysWithTimestamp) {
        if (this.getStorageInfo().percentage < 80) break;
        
        this.remove(key);
        cleanedCount++;
        
        if (cleanedCount >= 10) break; // 最多清理10项
      }
      
      console.log(`清理完成，删除了 ${cleanedCount} 项数据`);
    } catch (error) {
      console.error('清理localStorage失败:', error);
    }
  }

  /**
   * 记录错误日志
   */
  private static logError(operation: string, key: string, error: any): void {
    try {
      const errorLog = {
        operation,
        key,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : error,
        timestamp: new Date().toISOString(),
        storageInfo: this.getStorageInfo(),
      };
      
      const errorLogs = this.get(this.ERROR_LOG_KEY, []) as any[];
      errorLogs.push(errorLog);
      
      // 只保留最近20条错误日志
      if (errorLogs.length > 20) {
        errorLogs.splice(0, errorLogs.length - 20);
      }
      
      // 直接使用原生localStorage避免递归
      localStorage.setItem(this.ERROR_LOG_KEY, JSON.stringify(errorLogs));
    } catch (logError) {
      console.error('记录localStorage错误日志失败:', logError);
    }
  }

  /**
   * 获取错误日志
   */
  static getErrorLogs(): any[] {
    return this.get(this.ERROR_LOG_KEY, []) || [];
  }

  /**
   * 清理错误日志
   */
  static clearErrorLogs(): boolean {
    return this.remove(this.ERROR_LOG_KEY);
  }

  /**
   * 批量操作
   */
  static batch(operations: Array<{
    operation: 'set' | 'remove';
    key: string;
    value?: any;
  }>): { success: number; failed: number; errors: any[] } {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[],
    };
    
    for (const op of operations) {
      try {
        let success = false;
        
        if (op.operation === 'set') {
          success = this.set(op.key, op.value);
        } else if (op.operation === 'remove') {
          success = this.remove(op.key);
        }
        
        if (success) {
          results.success++;
        } else {
          results.failed++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          operation: op.operation,
          key: op.key,
          error: error instanceof Error ? error.message : error,
        });
      }
    }
    
    return results;
  }

  /**
   * 数据迁移工具
   */
  static migrate(migrations: Array<{
    fromKey: string;
    toKey: string;
    transform?: (data: any) => any;
  }>): boolean {
    try {
      for (const migration of migrations) {
        const oldData = this.get(migration.fromKey);
        if (oldData !== null) {
          const newData = migration.transform ? migration.transform(oldData) : oldData;
          
          if (this.set(migration.toKey, newData)) {
            this.remove(migration.fromKey);
            console.log(`数据迁移成功: ${migration.fromKey} -> ${migration.toKey}`);
          } else {
            console.error(`数据迁移失败: ${migration.fromKey} -> ${migration.toKey}`);
            return false;
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('数据迁移失败:', error);
      return false;
    }
  }

  /**
   * 数据验证
   */
  static validate(key: string, validator: (data: any) => boolean): boolean {
    try {
      const data = this.get(key);
      return data !== null && validator(data);
    } catch (error) {
      console.error(`数据验证失败 [${key}]:`, error);
      return false;
    }
  }

  /**
   * 数据备份
   */
  static backup(keys?: string[]): string | null {
    try {
      const keysToBackup = keys || this.keys();
      const backup: Record<string, any> = {};
      
      for (const key of keysToBackup) {
        const data = this.get(key);
        if (data !== null) {
          backup[key] = data;
        }
      }
      
      return JSON.stringify({
        timestamp: new Date().toISOString(),
        data: backup,
      });
    } catch (error) {
      console.error('数据备份失败:', error);
      return null;
    }
  }

  /**
   * 数据恢复
   */
  static restore(backupData: string): boolean {
    try {
      const backup = JSON.parse(backupData);
      
      if (!backup.data || typeof backup.data !== 'object') {
        throw new Error('无效的备份数据格式');
      }
      
      let restoredCount = 0;
      
      for (const [key, value] of Object.entries(backup.data)) {
        if (this.set(key, value)) {
          restoredCount++;
        }
      }
      
      console.log(`数据恢复完成，恢复了 ${restoredCount} 项数据`);
      return restoredCount > 0;
    } catch (error) {
      console.error('数据恢复失败:', error);
      return false;
    }
  }
}

export default SafeLocalStorage;
