// 图片压缩配置
interface CompressionConfig {
  maxWidth: number;
  maxHeight: number;
  quality: number; // 0-1
  outputFormat: 'image/jpeg' | 'image/png' | 'image/webp';
}

// 默认压缩配置
const DEFAULT_CONFIG: CompressionConfig = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.8,
  outputFormat: 'image/jpeg'
};

// 压缩结果接口
interface CompressionResult {
  success: boolean;
  compressedFile?: File;
  originalSize?: number;
  compressedSize?: number;
  compressionRatio?: number;
  error?: string;
}

// 图片压缩服务类
export class ImageCompressionService {
  private config: CompressionConfig;

  constructor(config: Partial<CompressionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // 压缩图片
  async compressImage(file: File): Promise<CompressionResult> {
    try {
      // 检查是否为图片文件
      if (!file.type.startsWith('image/')) {
        return {
          success: false,
          error: '文件不是图片格式'
        };
      }

      // 如果文件已经很小，直接返回
      if (file.size < 100 * 1024) { // 小于100KB
        return {
          success: true,
          compressedFile: file,
          originalSize: file.size,
          compressedSize: file.size,
          compressionRatio: 1
        };
      }

      // 创建图片对象
      const image = await this.createImageFromFile(file);
      
      // 计算压缩后的尺寸
      const { width, height } = this.calculateDimensions(
        image.width,
        image.height,
        this.config.maxWidth,
        this.config.maxHeight
      );

      // 创建画布
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        return {
          success: false,
          error: '无法创建画布上下文'
        };
      }

      // 设置画布尺寸
      canvas.width = width;
      canvas.height = height;

      // 绘制压缩后的图片
      ctx.drawImage(image, 0, 0, width, height);

      // 转换为Blob
      const compressedBlob = await this.canvasToBlob(canvas, this.config.outputFormat, this.config.quality);
      
      // 创建新的File对象
      const compressedFile = new File([compressedBlob], file.name, {
        type: this.config.outputFormat,
        lastModified: Date.now()
      });

      const compressionRatio = compressedFile.size / file.size;

      return {
        success: true,
        compressedFile,
        originalSize: file.size,
        compressedSize: compressedFile.size,
        compressionRatio
      };

    } catch (error: any) {
      console.error('图片压缩失败:', error);
      return {
        success: false,
        error: `压缩失败: ${error.message}`
      };
    }
  }

  // 批量压缩图片
  async compressImages(files: File[]): Promise<CompressionResult[]> {
    const results: CompressionResult[] = [];
    
    // 并发压缩（限制并发数）
    const concurrency = 3;
    const chunks = this.chunkArray(files, concurrency);

    for (const chunk of chunks) {
      const promises = chunk.map(file => this.compressImage(file));
      const chunkResults = await Promise.all(promises);
      results.push(...chunkResults);
    }

    return results;
  }

  // 从File创建Image对象
  private createImageFromFile(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('无法加载图片'));
      image.src = URL.createObjectURL(file);
    });
  }

  // 计算压缩后的尺寸
  private calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    let width = originalWidth;
    let height = originalHeight;

    // 如果图片尺寸在限制范围内，不进行缩放
    if (width <= maxWidth && height <= maxHeight) {
      return { width, height };
    }

    // 计算缩放比例
    const widthRatio = maxWidth / width;
    const heightRatio = maxHeight / height;
    const ratio = Math.min(widthRatio, heightRatio);

    width = Math.floor(width * ratio);
    height = Math.floor(height * ratio);

    return { width, height };
  }

  // 画布转换为Blob
  private canvasToBlob(
    canvas: HTMLCanvasElement,
    type: string,
    quality: number
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('无法转换画布为Blob'));
          }
        },
        type,
        quality
      );
    });
  }

  // 数组分块工具函数
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // 更新配置
  updateConfig(newConfig: Partial<CompressionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // 获取当前配置
  getConfig(): CompressionConfig {
    return { ...this.config };
  }

  // 获取文件大小的人类可读格式
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // 计算压缩节省的空间
  static calculateSavings(originalSize: number, compressedSize: number): {
    savedBytes: number;
    savedPercentage: number;
  } {
    const savedBytes = originalSize - compressedSize;
    const savedPercentage = (savedBytes / originalSize) * 100;
    
    return {
      savedBytes,
      savedPercentage: Math.round(savedPercentage * 100) / 100
    };
  }
}

// 创建默认实例
export const imageCompressionService = new ImageCompressionService();

// 导出类型
export type { CompressionConfig, CompressionResult };
