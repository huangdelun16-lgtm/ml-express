// 文件验证配置
interface ValidationConfig {
  maxFileSize: number; // 字节
  allowedTypes: string[];
  maxFiles: number;
  minFileSize?: number; // 字节
}

// 默认验证配置
const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
  maxFiles: 10,
  minFileSize: 1024, // 1KB
};

// 验证结果接口
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// 单个文件验证结果
interface FileValidationResult {
  file: File;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// 批量文件验证结果
interface BatchValidationResult {
  valid: boolean;
  results: FileValidationResult[];
  totalFiles: number;
  validFiles: number;
  invalidFiles: number;
  allErrors: string[];
  allWarnings: string[];
}

// 文件验证服务类
export class FileValidationService {
  private config: ValidationConfig;

  constructor(config: Partial<ValidationConfig> = {}) {
    this.config = { ...DEFAULT_VALIDATION_CONFIG, ...config };
  }

  // 验证单个文件
  validateFile(file: File): FileValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查文件类型
    if (!this.config.allowedTypes.includes(file.type)) {
      errors.push(`不支持的文件类型: ${file.type}`);
    }

    // 检查文件大小（上限）
    if (file.size > this.config.maxFileSize) {
      errors.push(`文件过大: ${this.formatFileSize(file.size)}。最大允许: ${this.formatFileSize(this.config.maxFileSize)}`);
    }

    // 检查文件大小（下限）
    if (this.config.minFileSize && file.size < this.config.minFileSize) {
      warnings.push(`文件过小: ${this.formatFileSize(file.size)}。建议至少: ${this.formatFileSize(this.config.minFileSize)}`);
    }

    // 检查文件名
    if (!file.name || file.name.trim() === '') {
      errors.push('文件名不能为空');
    }

    // 检查文件名长度
    if (file.name.length > 255) {
      errors.push('文件名过长（超过255个字符）');
    }

    // 检查文件名中的特殊字符
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(file.name)) {
      warnings.push('文件名包含特殊字符，可能导致兼容性问题');
    }

    // 检查图片文件的尺寸（如果是图片）
    if (file.type.startsWith('image/')) {
      this.validateImageFile(file, errors, warnings);
    }

    // 检查PDF文件（如果是PDF）
    if (file.type === 'application/pdf') {
      this.validatePdfFile(file, errors, warnings);
    }

    return {
      file,
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  // 批量验证文件
  validateFiles(files: File[]): BatchValidationResult {
    const results: FileValidationResult[] = [];
    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    // 检查文件数量
    if (files.length > this.config.maxFiles) {
      allErrors.push(`文件数量过多: ${files.length}。最大允许: ${this.config.maxFiles}`);
    }

    // 验证每个文件
    files.forEach(file => {
      const result = this.validateFile(file);
      results.push(result);
      
      if (!result.valid) {
        allErrors.push(...result.errors.map(error => `${file.name}: ${error}`));
      }
      
      allWarnings.push(...result.warnings.map(warning => `${file.name}: ${warning}`));
    });

    // 检查重复文件名
    const fileNames = files.map(f => f.name.toLowerCase());
    const duplicateNames = fileNames.filter((name, index) => fileNames.indexOf(name) !== index);
    if (duplicateNames.length > 0) {
      allWarnings.push(`发现重复文件名: ${[...new Set(duplicateNames)].join(', ')}`);
    }

    const validFiles = results.filter(r => r.valid).length;
    const invalidFiles = results.length - validFiles;

    return {
      valid: allErrors.length === 0,
      results,
      totalFiles: files.length,
      validFiles,
      invalidFiles,
      allErrors,
      allWarnings
    };
  }

  // 验证图片文件
  private async validateImageFile(file: File, errors: string[], warnings: string[]): Promise<void> {
    try {
      // 创建图片对象来检查尺寸
      const image = await this.createImageFromFile(file);
      
      // 检查图片尺寸
      if (image.width > 4000 || image.height > 4000) {
        warnings.push(`图片尺寸较大: ${image.width}x${image.height}。建议压缩以提高上传速度`);
      }

      if (image.width < 100 || image.height < 100) {
        warnings.push(`图片尺寸较小: ${image.width}x${image.height}。可能影响显示效果`);
      }

      // 检查宽高比
      const aspectRatio = image.width / image.height;
      if (aspectRatio > 10 || aspectRatio < 0.1) {
        warnings.push(`图片宽高比异常: ${aspectRatio.toFixed(2)}。建议使用正常比例的图片`);
      }

    } catch (error) {
      errors.push('无法读取图片信息，文件可能已损坏');
    }
  }

  // 验证PDF文件
  private validatePdfFile(file: File, errors: string[], warnings: string[]): void {
    // PDF文件的基本验证
    if (file.size < 1024) {
      warnings.push('PDF文件过小，可能内容不完整');
    }

    // 检查PDF文件头
    // 注意：这里只是基本检查，实际应用中可能需要更复杂的PDF验证
    if (file.name.toLowerCase().endsWith('.pdf')) {
      // PDF文件通常以 %PDF 开头
      // 这里我们假设文件扩展名正确
    } else {
      warnings.push('文件扩展名与MIME类型不匹配');
    }
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

  // 格式化文件大小
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // 获取文件类型的人类可读描述
  getFileTypeDescription(mimeType: string): string {
    const descriptions: { [key: string]: string } = {
      'image/jpeg': 'JPEG图片',
      'image/png': 'PNG图片',
      'image/jpg': 'JPG图片',
      'application/pdf': 'PDF文档',
      'image/gif': 'GIF图片',
      'image/webp': 'WebP图片',
      'image/svg+xml': 'SVG图片'
    };

    return descriptions[mimeType] || mimeType;
  }

  // 检查文件是否为图片
  isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
  }

  // 检查文件是否为PDF
  isPdfFile(file: File): boolean {
    return file.type === 'application/pdf';
  }

  // 获取文件扩展名
  getFileExtension(fileName: string): string {
    return fileName.split('.').pop()?.toLowerCase() || '';
  }

  // 生成安全的文件名
  generateSafeFileName(originalName: string): string {
    // 移除特殊字符
    let safeName = originalName.replace(/[<>:"/\\|?*]/g, '_');
    
    // 限制长度
    if (safeName.length > 200) {
      const extension = this.getFileExtension(originalName);
      const nameWithoutExt = safeName.substring(0, 200 - extension.length - 1);
      safeName = `${nameWithoutExt}.${extension}`;
    }

    return safeName;
  }

  // 更新配置
  updateConfig(newConfig: Partial<ValidationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // 获取当前配置
  getConfig(): ValidationConfig {
    return { ...this.config };
  }
}

// 创建默认实例
export const fileValidationService = new FileValidationService();

// 导出类型
export type { ValidationConfig, ValidationResult, FileValidationResult, BatchValidationResult };
