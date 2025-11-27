import { Alert } from 'react-native';
import { toastService } from './ToastService';

export interface AppError {
  message: string;
  code?: string;
  details?: any;
  originalError?: any;
  isNetworkError?: boolean;
  isTimeout?: boolean;
  status?: number;
}

export interface ErrorHandlerOptions {
  context?: string;
  silent?: boolean;
  useToast?: boolean; // 是否使用 Toast 而不是 Alert
  showRetry?: boolean; // 是否显示重试选项
  onRetry?: () => void; // 重试回调
}

class ErrorService {
  private static instance: ErrorService;

  private constructor() {}

  static getInstance(): ErrorService {
    if (!ErrorService.instance) {
      ErrorService.instance = new ErrorService();
    }
    return ErrorService.instance;
  }

  // 解析错误并返回标准化的 AppError
  parseError(error: any): AppError {
    if (!error) {
      return { message: '未知错误' };
    }

    // 处理网络错误
    if (error.isNetworkError || error.isTimeout) {
      return {
        message: this.getFriendlyMessage(
          error.isTimeout ? '请求超时' : '网络连接失败',
          undefined,
          error
        ),
        isNetworkError: true,
        isTimeout: error.isTimeout,
        originalError: error,
      };
    }

    // 处理 HTTP 响应错误
    if (error.status || error.response) {
      const status = error.status || error.response?.status;
      return {
        message: this.getFriendlyMessage(
          error.message || `请求失败 (${status})`,
          undefined,
          error
        ),
        status,
        originalError: error,
      };
    }

    // 处理 Supabase 错误
    if (error.code && error.message) {
      return {
        message: this.getFriendlyMessage(error.message, error.code, error),
        code: error.code,
        details: error.details,
        originalError: error,
      };
    }

    // 处理 Error 对象
    if (error instanceof Error) {
      return {
        message: this.getFriendlyMessage(error.message, undefined, error),
        originalError: error,
      };
    }

    // 处理字符串错误
    if (typeof error === 'string') {
      return { message: this.getFriendlyMessage(error) };
    }

    return {
      message: '发生意外错误',
      originalError: error,
    };
  }

  // 将技术错误消息转换为用户友好的消息
  private getFriendlyMessage(
    message: string,
    code?: string,
    error?: any
  ): string {
    // Supabase/PostgreSQL 错误代码映射
    if (code === 'PGRST116') return '未找到数据';
    if (code === '23505') return '数据已存在';
    if (code === '42P01') return '表不存在'; // 开发调试用
    if (code === '42501') return '权限不足';

    // 网络错误
    if (
      message.includes('Network request failed') ||
      message.includes('Failed to fetch') ||
      error?.isNetworkError
    ) {
      return '网络连接失败，请检查您的网络设置';
    }

    // 超时错误
    if (message.includes('timeout') || message.includes('超时') || error?.isTimeout) {
      return '请求超时，请稍后重试';
    }

    // 认证错误
    if (message.includes('auth') || message.includes('认证') || error?.status === 401) {
      return '认证失败，请重新登录';
    }

    // 权限错误
    if (error?.status === 403) {
      return '权限不足，无法执行此操作';
    }

    // 服务器错误
    if (error?.status >= 500) {
      return '服务器错误，请稍后重试';
    }

    // 请求过多
    if (error?.status === 429) {
      return '请求过于频繁，请稍后再试';
    }

    // 未找到
    if (error?.status === 404) {
      return '请求的资源不存在';
    }

    return message;
  }

  // 统一处理错误（记录 + 提示）
  handleError(error: any, options: ErrorHandlerOptions = {}) {
    const {
      context,
      silent = false,
      useToast = true,
      showRetry = false,
      onRetry,
    } = options;

    const appError = this.parseError(error);

    // 1. 记录错误
    this.logError(appError, context);

    // 2. 提示用户（如果未静音）
    if (!silent) {
      if (useToast) {
        // 使用 Toast 显示错误
        toastService.error(appError.message);
      } else {
        // 使用 Alert 显示错误（支持重试）
        this.showErrorAlert(appError, showRetry, onRetry);
      }
    }

    return appError;
  }

  // 记录错误（后续可对接 Sentry 等）
  private logError(error: AppError, context?: string) {
    const timestamp = new Date().toISOString();
    const contextMsg = context ? `[${context}]` : '';

    if (__DEV__) {
      console.error(
        `${timestamp} ${contextMsg} Error:`,
        error.message,
        error.originalError || ''
      );
    } else {
      // 生产环境：发送到日志服务
      // SentryService.captureException(error.originalError || new Error(error.message));
    }
  }

  // 显示错误提示（Alert）
  private showErrorAlert(
    error: AppError,
    showRetry: boolean,
    onRetry?: () => void
  ) {
    const buttons: any[] = [{ text: '确定', style: 'default' }];

    if (showRetry && onRetry) {
      buttons.unshift({
        text: '重试',
        onPress: onRetry,
        style: 'default',
      });
    }

    Alert.alert('提示', error.message, buttons);
  }

  // 判断错误是否可重试
  isRetryableError(error: any): boolean {
    const appError = this.parseError(error);

    // 网络错误可重试
    if (appError.isNetworkError || appError.isTimeout) {
      return true;
    }

    // 5xx 服务器错误可重试
    if (appError.status && appError.status >= 500 && appError.status < 600) {
      return true;
    }

    // 429 请求过多可重试
    if (appError.status === 429) {
      return true;
    }

    // 408 请求超时可重试
    if (appError.status === 408) {
      return true;
    }

    return false;
  }
}

export const errorService = ErrorService.getInstance();
