import { feedbackService } from './FeedbackService';

/**
 * 统一错误处理服务
 * 提供统一的错误处理、日志记录和用户提示
 */

export enum ErrorType {
  NETWORK = 'network',
  DATABASE = 'database',
  VALIDATION = 'validation',
  AUTHORIZATION = 'authorization',
  SYSTEM = 'system',
  UNKNOWN = 'unknown'
}

export interface ErrorInfo {
  message: string;
  type: ErrorType;
  code?: string;
  context?: string;
  timestamp: Date;
}

class ErrorHandler {
  private errorHistory: ErrorInfo[] = [];
  private maxHistorySize = 100;

  /**
   * 统一错误处理
   */
  handleError(
    error: any,
    context: string,
    userMessage?: string
  ): ErrorInfo {
    const errorInfo: ErrorInfo = {
      message: this.extractErrorMessage(error),
      type: this.classifyError(error),
      code: error?.code,
      context,
      timestamp: new Date()
    };

    // 记录错误
    this.logError(errorInfo, error);

    // 显示用户提示
    if (userMessage) {
      this.showUserMessage(userMessage, errorInfo.type);
    } else {
      this.showUserMessage(this.getDefaultMessage(errorInfo.type), errorInfo.type);
    }

    return errorInfo;
  }

  /**
   * 静默处理错误（不显示提示）
   */
  handleErrorSilent(error: any, context: string): ErrorInfo {
    const errorInfo: ErrorInfo = {
      message: this.extractErrorMessage(error),
      type: this.classifyError(error),
      code: error?.code,
      context,
      timestamp: new Date()
    };

    this.logError(errorInfo, error);
    return errorInfo;
  }

  /**
   * 显示成功消息
   */
  showSuccess(message: string): void {
    // 使用更友好的提示方式
    if (typeof window !== 'undefined') {
      // 可以考虑使用toast库，这里暂时使用alert
      feedbackService.notify(`✅ ${message}`);
    }
  }

  /**
   * 显示警告消息
   */
  showWarning(message: string): void {
    if (typeof window !== 'undefined') {
      feedbackService.notify(`⚠️ ${message}`);
    }
  }

  /**
   * 显示信息消息
   */
  showInfo(message: string): void {
    if (typeof window !== 'undefined') {
      feedbackService.notify(`ℹ️ ${message}`);
    }
  }

  /**
   * 提取错误信息
   */
  private extractErrorMessage(error: any): string {
    if (!error) return '未知错误';

    if (typeof error === 'string') return error;
    if (error.message) return error.message;
    if (error.error) return this.extractErrorMessage(error.error);
    
    return JSON.stringify(error);
  }

  /**
   * 错误分类
   */
  private classifyError(error: any): ErrorType {
    if (!error) return ErrorType.UNKNOWN;

    const message = this.extractErrorMessage(error).toLowerCase();
    
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return ErrorType.NETWORK;
    }
    
    if (message.includes('database') || message.includes('supabase') || message.includes('query')) {
      return ErrorType.DATABASE;
    }
    
    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return ErrorType.VALIDATION;
    }
    
    if (message.includes('unauthorized') || message.includes('permission') || message.includes('forbidden')) {
      return ErrorType.AUTHORIZATION;
    }

    return ErrorType.UNKNOWN;
  }

  /**
   * 记录错误日志
   */
  private logError(errorInfo: ErrorInfo, originalError: any): void {
    // 添加到历史记录
    this.errorHistory.unshift(errorInfo);
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
    }

    // 输出到控制台（仅在开发环境）
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Handler:', {
        ...errorInfo,
        originalError
      });
    }

    // 可选：发送到错误监控服务（Sentry等）
    // this.reportToErrorTracking(errorInfo, originalError);
  }

  /**
   * 显示用户消息
   */
  private showUserMessage(message: string, type: ErrorType): void {
    // 根据错误类型选择不同的提示方式
    switch (type) {
      case ErrorType.NETWORK:
        this.showNetworkError(message);
        break;
      case ErrorType.DATABASE:
        this.showDatabaseError(message);
        break;
      default:
        feedbackService.notify(message);
    }
  }

  /**
   * 网络错误提示
   */
  private showNetworkError(message: string): void {
    feedbackService.notify(`🌐 网络错误\n\n${message}\n\n请检查：\n• 网络连接\n• 服务器状态\n• 防火墙设置`);
  }

  /**
   * 数据库错误提示
   */
  private showDatabaseError(message: string): void {
    feedbackService.notify(`🗄️ 数据库错误\n\n${message}\n\n请稍后重试或联系管理员`);
  }

  /**
   * 获取默认错误消息
   */
  private getDefaultMessage(type: ErrorType): string {
    switch (type) {
      case ErrorType.NETWORK:
        return '网络连接失败，请检查您的网络设置';
      case ErrorType.DATABASE:
        return '数据库操作失败，请稍后重试';
      case ErrorType.VALIDATION:
        return '输入数据无效，请检查并重试';
      case ErrorType.AUTHORIZATION:
        return '权限不足，请检查您的登录状态';
      default:
        return '发生未知错误，请刷新页面重试';
    }
  }

  /**
   * 获取错误历史
   */
  getErrorHistory(): ErrorInfo[] {
    return [...this.errorHistory];
  }

  /**
   * 清除错误历史
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
  }
}

// 导出单例
export const errorHandler = new ErrorHandler();
export default errorHandler;

