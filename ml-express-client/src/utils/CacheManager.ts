import AsyncStorage from '@react-native-async-storage/async-storage';

// 缓存配置
interface CacheConfig {
  ttl: number; // 生存时间（毫秒）
  maxSize: number; // 最大缓存条目数
}

// 默认缓存配置
const DEFAULT_CONFIG: CacheConfig = {
  ttl: 5 * 60 * 1000, // 5分钟
  maxSize: 100, // 最多100个条目
};

// 缓存条目
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// 内存缓存类
class MemoryCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // 设置缓存
  set(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl: ttl || this.config.ttl,
    };

    this.cache.set(key, entry);

    // 清理过期缓存
    this.cleanup();
  }

  // 获取缓存
  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  // 删除缓存
  delete(key: string): void {
    this.cache.delete(key);
  }

  // 清空缓存
  clear(): void {
    this.cache.clear();
  }

  // 检查缓存是否存在
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  // 清理过期缓存
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));

    // 如果缓存大小超过限制，删除最旧的条目
    if (this.cache.size > this.config.maxSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toDelete = entries.slice(0, this.cache.size - this.config.maxSize);
      toDelete.forEach(([key]) => this.cache.delete(key));
    }
  }

  // 获取缓存统计
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      ttl: this.config.ttl,
    };
  }
}

// 持久化缓存类（使用AsyncStorage）
class PersistentCache<T> {
  private config: CacheConfig;
  private prefix: string;

  constructor(prefix: string = 'cache_', config: Partial<CacheConfig> = {}) {
    this.prefix = prefix;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // 生成缓存键
  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  // 设置缓存
  async set(key: string, data: T, ttl?: number): Promise<void> {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl: ttl || this.config.ttl,
    };

    try {
      await AsyncStorage.setItem(this.getKey(key), JSON.stringify(entry));
    } catch (error) {
      console.error('Failed to set cache:', error);
    }
  }

  // 获取缓存
  async get(key: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(this.getKey(key));
      if (!cached) return null;

      const entry: CacheEntry<T> = JSON.parse(cached);
      const now = Date.now();

      if (now - entry.timestamp > entry.ttl) {
        await this.delete(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error('Failed to get cache:', error);
      return null;
    }
  }

  // 删除缓存
  async delete(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.getKey(key));
    } catch (error) {
      console.error('Failed to delete cache:', error);
    }
  }

  // 清空所有缓存
  async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.prefix));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  // 检查缓存是否存在
  async has(key: string): Promise<boolean> {
    const data = await this.get(key);
    return data !== null;
  }
}

// 分页配置
interface PaginationConfig {
  pageSize: number;
  maxPages: number;
}

// 分页数据
interface PaginatedData<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

// 分页缓存管理器
class PaginationCache<T> {
  private memoryCache: MemoryCache<PaginatedData<T>>;
  private persistentCache: PersistentCache<PaginatedData<T>>;
  private config: PaginationConfig;

  constructor(config: PaginationConfig = { pageSize: 20, maxPages: 10 }) {
    this.config = config;
    this.memoryCache = new MemoryCache<PaginatedData<T>>({
      ttl: 2 * 60 * 1000, // 2分钟
      maxSize: 50,
    });
    this.persistentCache = new PersistentCache<PaginatedData<T>>('pagination_', {
      ttl: 10 * 60 * 1000, // 10分钟
    });
  }

  // 生成分页缓存键
  private getCacheKey(baseKey: string, page: number): string {
    return `${baseKey}_page_${page}`;
  }

  // 设置分页数据
  async setPage(baseKey: string, page: number, data: PaginatedData<T>): Promise<void> {
    const cacheKey = this.getCacheKey(baseKey, page);
    
    // 同时设置内存缓存和持久化缓存
    this.memoryCache.set(cacheKey, data);
    await this.persistentCache.set(cacheKey, data);
  }

  // 获取分页数据
  async getPage(baseKey: string, page: number): Promise<PaginatedData<T> | null> {
    const cacheKey = this.getCacheKey(baseKey, page);
    
    // 先尝试内存缓存
    let data = this.memoryCache.get(cacheKey);
    if (data) return data;

    // 再尝试持久化缓存
    data = await this.persistentCache.get(cacheKey);
    if (data) {
      // 重新设置到内存缓存
      this.memoryCache.set(cacheKey, data);
      return data;
    }

    return null;
  }

  // 获取所有缓存的分页数据
  async getAllPages(baseKey: string): Promise<T[]> {
    const allData: T[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= this.config.maxPages) {
      const pageData = await this.getPage(baseKey, page);
      if (pageData) {
        allData.push(...pageData.data);
        hasMore = pageData.hasMore;
        page++;
      } else {
        break;
      }
    }

    return allData;
  }

  // 清除分页缓存
  async clearPages(baseKey: string): Promise<void> {
    for (let page = 1; page <= this.config.maxPages; page++) {
      const cacheKey = this.getCacheKey(baseKey, page);
      this.memoryCache.delete(cacheKey);
      await this.persistentCache.delete(cacheKey);
    }
  }

  // 更新单页数据
  async updatePage(baseKey: string, page: number, updater: (data: T[]) => T[]): Promise<void> {
    const pageData = await this.getPage(baseKey, page);
    if (pageData) {
      pageData.data = updater(pageData.data);
      await this.setPage(baseKey, page, pageData);
    }
  }
}

// 预加载管理器
class PreloadManager {
  private preloadQueue: Array<() => Promise<any>> = [];
  private isProcessing = false;

  // 添加预加载任务
  addPreloadTask(task: () => Promise<any>): void {
    this.preloadQueue.push(task);
    this.processQueue();
  }

  // 处理预加载队列
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.preloadQueue.length === 0) return;

    this.isProcessing = true;

    while (this.preloadQueue.length > 0) {
      const task = this.preloadQueue.shift();
      if (task) {
        try {
          await task();
        } catch (error) {
          console.error('Preload task failed:', error);
        }
      }
    }

    this.isProcessing = false;
  }

  // 清空预加载队列
  clear(): void {
    this.preloadQueue = [];
  }
}

// 创建全局缓存实例
export const orderCache = new PaginationCache<any>(); // 订单缓存
export const userCache = new MemoryCache<any>({ ttl: 10 * 60 * 1000 }); // 用户缓存
export const settingsCache = new PersistentCache<any>('settings_', { ttl: 30 * 60 * 1000 }); // 设置缓存
export const preloadManager = new PreloadManager(); // 预加载管理器

// 缓存工具函数
export const CacheUtils = {
  // 生成缓存键
  generateKey: (prefix: string, ...params: any[]): string => {
    return `${prefix}_${params.join('_')}`;
  },

  // 批量设置缓存
  setMultiple: async <T>(cache: PersistentCache<T>, items: Array<{ key: string; data: T }>): Promise<void> => {
    const promises = items.map(item => cache.set(item.key, item.data));
    await Promise.all(promises);
  },

  // 批量获取缓存
  getMultiple: async <T>(cache: PersistentCache<T>, keys: string[]): Promise<Array<T | null>> => {
    const promises = keys.map(key => cache.get(key));
    return Promise.all(promises);
  },

  // 清理过期缓存
  cleanup: async (): Promise<void> => {
    // 这里可以添加清理逻辑
    console.log('Cache cleanup completed');
  },
};

// 导出类型
export type { CacheConfig, CacheEntry, PaginationConfig, PaginatedData };
export { MemoryCache, PersistentCache, PaginationCache, PreloadManager };
