import { Image } from 'react-native';

// 图片压缩配置
interface CompressionConfig {
  quality: number; // 0-1
  maxWidth: number;
  maxHeight: number;
  format: 'jpeg' | 'png' | 'webp';
}

// 默认压缩配置
const DEFAULT_CONFIG: CompressionConfig = {
  quality: 0.8,
  maxWidth: 1200,
  maxHeight: 1200,
  format: 'jpeg',
};

// 图片优化工具类
export class ImageOptimizer {
  private static instance: ImageOptimizer;
  private cache = new Map<string, string>();

  static getInstance(): ImageOptimizer {
    if (!ImageOptimizer.instance) {
      ImageOptimizer.instance = new ImageOptimizer();
    }
    return ImageOptimizer.instance;
  }

  // 压缩图片
  async compressImage(
    imageUri: string,
    config: Partial<CompressionConfig> = {}
  ): Promise<string> {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    
    // 检查缓存
    const cacheKey = this.generateCacheKey(imageUri, finalConfig);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      // 这里应该使用实际的图片压缩库
      // 由于React Native的限制，这里返回原始URI
      // 在实际项目中，可以使用 react-native-image-resizer 或类似库
      const compressedUri = await this.performCompression(imageUri, finalConfig);
      
      // 缓存结果
      this.cache.set(cacheKey, compressedUri);
      
      return compressedUri;
    } catch (error) {
      console.error('图片压缩失败:', error);
      return imageUri; // 压缩失败时返回原始URI
    }
  }

  // 生成不同尺寸的图片
  async generateSizes(
    imageUri: string,
    sizes: Array<{ width: number; height: number; name: string }>
  ): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    
    for (const size of sizes) {
      try {
        const compressedUri = await this.compressImage(imageUri, {
          maxWidth: size.width,
          maxHeight: size.height,
          quality: 0.8,
        });
        results[size.name] = compressedUri;
      } catch (error) {
        console.error(`生成${size.name}尺寸失败:`, error);
        results[size.name] = imageUri;
      }
    }
    
    return results;
  }

  // 预加载图片
  async preloadImage(imageUri: string): Promise<void> {
    return new Promise((resolve, reject) => {
      Image.prefetch(imageUri)
        .then(() => resolve())
        .catch(reject);
    });
  }

  // 批量预加载图片
  async preloadImages(imageUris: string[]): Promise<void> {
    const promises = imageUris.map(uri => this.preloadImage(uri));
    await Promise.all(promises);
  }

  // 获取图片信息
  async getImageInfo(imageUri: string): Promise<{ width: number; height: number } | null> {
    return new Promise((resolve) => {
      Image.getSize(
        imageUri,
        (width, height) => resolve({ width, height }),
        (error) => {
          console.error('获取图片信息失败:', error);
          resolve(null);
        }
      );
    });
  }

  // 清理缓存
  clearCache(): void {
    this.cache.clear();
  }

  // 获取缓存统计
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  // 生成缓存键
  private generateCacheKey(imageUri: string, config: CompressionConfig): string {
    return `${imageUri}_${config.quality}_${config.maxWidth}_${config.maxHeight}_${config.format}`;
  }

  // 执行压缩（模拟实现）
  private async performCompression(
    imageUri: string,
    config: CompressionConfig
  ): Promise<string> {
    // 在实际项目中，这里应该使用图片压缩库
    // 例如：react-native-image-resizer
    return new Promise((resolve) => {
      setTimeout(() => {
        // 模拟压缩过程
        resolve(imageUri);
      }, 100);
    });
  }
}

// 图片尺寸预设
export const ImageSizes = {
  thumbnail: { width: 100, height: 100, name: 'thumbnail' },
  small: { width: 300, height: 300, name: 'small' },
  medium: { width: 600, height: 600, name: 'medium' },
  large: { width: 1200, height: 1200, name: 'large' },
  avatar: { width: 150, height: 150, name: 'avatar' },
  card: { width: 400, height: 300, name: 'card' },
};

// 图片质量预设
export const ImageQuality = {
  low: 0.6,
  medium: 0.8,
  high: 0.9,
  max: 1.0,
};

// 响应式图片URL生成器
export class ResponsiveImageUrlGenerator {
  // 生成响应式图片URL
  static generateResponsiveUrls(baseUrl: string): Record<string, string> {
    if (!baseUrl.startsWith('http')) {
      return {
        thumbnail: baseUrl,
        small: baseUrl,
        medium: baseUrl,
        large: baseUrl,
      };
    }

    try {
      const url = new URL(baseUrl);
      const basePath = url.origin + url.pathname;
      
      return {
        thumbnail: `${basePath}?w=100&h=100&q=60&format=webp`,
        small: `${basePath}?w=300&h=300&q=70&format=webp`,
        medium: `${basePath}?w=600&h=600&q=80&format=webp`,
        large: `${basePath}?w=1200&h=1200&q=90&format=webp`,
      };
    } catch {
      return {
        thumbnail: baseUrl,
        small: baseUrl,
        medium: baseUrl,
        large: baseUrl,
      };
    }
  }

  // 根据屏幕尺寸选择合适的图片
  static selectOptimalSize(
    responsiveUrls: Record<string, string>,
    screenWidth: number
  ): string {
    if (screenWidth <= 300) {
      return responsiveUrls.thumbnail;
    } else if (screenWidth <= 600) {
      return responsiveUrls.small;
    } else if (screenWidth <= 900) {
      return responsiveUrls.medium;
    } else {
      return responsiveUrls.large;
    }
  }
}

// 图片懒加载管理器
export class LazyLoadManager {
  private static instance: LazyLoadManager;
  private loadedImages = new Set<string>();
  private loadingImages = new Set<string>();

  static getInstance(): LazyLoadManager {
    if (!LazyLoadManager.instance) {
      LazyLoadManager.instance = new LazyLoadManager();
    }
    return LazyLoadManager.instance;
  }

  // 检查图片是否已加载
  isImageLoaded(imageUri: string): boolean {
    return this.loadedImages.has(imageUri);
  }

  // 检查图片是否正在加载
  isImageLoading(imageUri: string): boolean {
    return this.loadingImages.has(imageUri);
  }

  // 标记图片为已加载
  markImageAsLoaded(imageUri: string): void {
    this.loadedImages.add(imageUri);
    this.loadingImages.delete(imageUri);
  }

  // 标记图片为加载中
  markImageAsLoading(imageUri: string): void {
    this.loadingImages.add(imageUri);
  }

  // 预加载图片
  async preloadImage(imageUri: string): Promise<void> {
    if (this.isImageLoaded(imageUri) || this.isImageLoading(imageUri)) {
      return;
    }

    this.markImageAsLoading(imageUri);
    
    try {
      await Image.prefetch(imageUri);
      this.markImageAsLoaded(imageUri);
    } catch (error) {
      console.error('预加载图片失败:', error);
      this.loadingImages.delete(imageUri);
    }
  }

  // 批量预加载图片
  async preloadImages(imageUris: string[]): Promise<void> {
    const promises = imageUris.map(uri => this.preloadImage(uri));
    await Promise.all(promises);
  }

  // 清理管理器
  clear(): void {
    this.loadedImages.clear();
    this.loadingImages.clear();
  }

  // 获取统计信息
  getStats() {
    return {
      loaded: this.loadedImages.size,
      loading: this.loadingImages.size,
    };
  }
}

// 图片缓存管理器
export class ImageCacheManager {
  private static instance: ImageCacheManager;
  private cache = new Map<string, { uri: string; timestamp: number; ttl: number }>();
  private maxSize = 100; // 最大缓存条目数
  private defaultTtl = 30 * 60 * 1000; // 默认30分钟

  static getInstance(): ImageCacheManager {
    if (!ImageCacheManager.instance) {
      ImageCacheManager.instance = new ImageCacheManager();
    }
    return ImageCacheManager.instance;
  }

  // 设置缓存
  set(key: string, uri: string, ttl?: number): void {
    const now = Date.now();
    this.cache.set(key, {
      uri,
      timestamp: now,
      ttl: ttl || this.defaultTtl,
    });

    // 清理过期缓存
    this.cleanup();
  }

  // 获取缓存
  get(key: string): string | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.uri;
  }

  // 检查缓存是否存在
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  // 删除缓存
  delete(key: string): void {
    this.cache.delete(key);
  }

  // 清空缓存
  clear(): void {
    this.cache.clear();
  }

  // 清理过期缓存
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > value.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));

    // 如果缓存大小超过限制，删除最旧的条目
    if (this.cache.size > this.maxSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toDelete = entries.slice(0, this.cache.size - this.maxSize);
      toDelete.forEach(([key]) => this.cache.delete(key));
    }
  }

  // 获取缓存统计
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// 导出单例实例
export const imageOptimizer = ImageOptimizer.getInstance();
export const lazyLoadManager = LazyLoadManager.getInstance();
export const imageCacheManager = ImageCacheManager.getInstance();
