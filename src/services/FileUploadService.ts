import { supabase } from './supabase';

// 文件上传配置
interface UploadConfig {
  bucket: string;
  folder?: string;
  maxFileSize: number; // 字节
  allowedTypes: string[];
}

// 默认上传配置
const DEFAULT_CONFIG: UploadConfig = {
  bucket: 'cv-forms',
  folder: 'employee-cv',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
};

// 上传结果接口
interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  fileName?: string;
  fileSize?: number;
}

// 批量上传结果
interface BatchUploadResult {
  success: boolean;
  results: UploadResult[];
  totalFiles: number;
  successCount: number;
  errorCount: number;
}

// 文件上传服务类
export class FileUploadService {
  private config: UploadConfig;

  constructor(config: Partial<UploadConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // 验证文件
  private validateFile(file: File): { valid: boolean; error?: string } {
    // 检查文件类型
    if (!this.config.allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `不支持的文件类型: ${file.type}。支持的类型: ${this.config.allowedTypes.join(', ')}`
      };
    }

    // 检查文件大小
    if (file.size > this.config.maxFileSize) {
      return {
        valid: false,
        error: `文件过大: ${(file.size / 1024 / 1024).toFixed(2)}MB。最大允许: ${this.config.maxFileSize / 1024 / 1024}MB`
      };
    }

    return { valid: true };
  }

  // 生成唯一文件名
  private generateFileName(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop();
    return `${timestamp}_${random}.${extension}`;
  }

  // 上传单个文件
  async uploadFile(file: File, employeeId?: string): Promise<UploadResult> {
    try {
      // 验证文件
      const validation = this.validateFile(file);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // 生成文件名和路径
      const fileName = this.generateFileName(file.name);
      const filePath = employeeId 
        ? `${this.config.folder}/${employeeId}/${fileName}`
        : `${this.config.folder}/${fileName}`;

      // 上传文件到Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.config.bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('文件上传失败:', error);
        return {
          success: false,
          error: `上传失败: ${error.message}`
        };
      }

      // 获取公开URL
      const { data: urlData } = supabase.storage
        .from(this.config.bucket)
        .getPublicUrl(filePath);

      return {
        success: true,
        url: urlData.publicUrl,
        fileName: file.name,
        fileSize: file.size
      };

    } catch (error: any) {
      console.error('文件上传异常:', error);
      return {
        success: false,
        error: `上传异常: ${error.message}`
      };
    }
  }

  // 批量上传文件
  async uploadFiles(files: File[], employeeId?: string): Promise<BatchUploadResult> {
    const results: UploadResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    // 并发上传文件（限制并发数）
    const concurrency = 3;
    const chunks = this.chunkArray(files, concurrency);

    for (const chunk of chunks) {
      const promises = chunk.map(file => this.uploadFile(file, employeeId));
      const chunkResults = await Promise.all(promises);
      
      results.push(...chunkResults);
      successCount += chunkResults.filter(r => r.success).length;
      errorCount += chunkResults.filter(r => !r.success).length;
    }

    return {
      success: errorCount === 0,
      results,
      totalFiles: files.length,
      successCount,
      errorCount
    };
  }

  // 删除文件
  async deleteFile(fileUrl: string): Promise<{ success: boolean; error?: string }> {
    try {
      // 从URL中提取文件路径
      const url = new URL(fileUrl);
      const pathParts = url.pathname.split('/');
      const bucketIndex = pathParts.findIndex(part => part === this.config.bucket);
      
      if (bucketIndex === -1) {
        return {
          success: false,
          error: '无法解析文件路径'
        };
      }

      const filePath = pathParts.slice(bucketIndex + 1).join('/');

      const { error } = await supabase.storage
        .from(this.config.bucket)
        .remove([filePath]);

      if (error) {
        console.error('文件删除失败:', error);
        return {
          success: false,
          error: `删除失败: ${error.message}`
        };
      }

      return { success: true };

    } catch (error: any) {
      console.error('文件删除异常:', error);
      return {
        success: false,
        error: `删除异常: ${error.message}`
      };
    }
  }

  // 批量删除文件
  async deleteFiles(fileUrls: string[]): Promise<{ success: boolean; results: any[] }> {
    const results = await Promise.all(
      fileUrls.map(url => this.deleteFile(url))
    );

    const successCount = results.filter(r => r.success).length;
    
    return {
      success: successCount === fileUrls.length,
      results
    };
  }

  // 获取文件信息
  async getFileInfo(fileUrl: string): Promise<{ success: boolean; info?: any; error?: string }> {
    try {
      const url = new URL(fileUrl);
      const pathParts = url.pathname.split('/');
      const bucketIndex = pathParts.findIndex(part => part === this.config.bucket);
      
      if (bucketIndex === -1) {
        return {
          success: false,
          error: '无法解析文件路径'
        };
      }

      const filePath = pathParts.slice(bucketIndex + 1).join('/');

      const { data, error } = await supabase.storage
        .from(this.config.bucket)
        .list(filePath.split('/').slice(0, -1).join('/'), {
          search: filePath.split('/').pop()
        });

      if (error) {
        return {
          success: false,
          error: `获取文件信息失败: ${error.message}`
        };
      }

      return {
        success: true,
        info: data?.[0]
      };

    } catch (error: any) {
      return {
        success: false,
        error: `获取文件信息异常: ${error.message}`
      };
    }
  }

  // 创建存储桶（如果不存在）
  async createBucket(): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.storage.createBucket(this.config.bucket, {
        public: true,
        allowedMimeTypes: this.config.allowedTypes,
        fileSizeLimit: this.config.maxFileSize
      });

      if (error && !error.message.includes('already exists')) {
        return {
          success: false,
          error: `创建存储桶失败: ${error.message}`
        };
      }

      return { success: true };

    } catch (error: any) {
      return {
        success: false,
        error: `创建存储桶异常: ${error.message}`
      };
    }
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
  updateConfig(newConfig: Partial<UploadConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // 获取当前配置
  getConfig(): UploadConfig {
    return { ...this.config };
  }
}

// 创建默认实例
export const fileUploadService = new FileUploadService();

// 导出类型
export type { UploadConfig, UploadResult, BatchUploadResult };
