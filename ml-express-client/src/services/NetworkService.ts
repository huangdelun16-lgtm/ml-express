import { errorService } from './ErrorService';
import { toastService } from './ToastService';

export interface RequestOptions extends RequestInit {
  retries?: number;
  retryDelay?: number;
  retryCondition?: (error: any) => boolean;
  showErrorToast?: boolean;
  showSuccessToast?: boolean;
  successMessage?: string;
  timeout?: number;
}

export interface NetworkError extends Error {
  status?: number;
  statusText?: string;
  response?: Response;
  isNetworkError?: boolean;
  isTimeout?: boolean;
}

class NetworkService {
  private static instance: NetworkService;
  private defaultRetries = 3;
  private defaultRetryDelay = 1000; // 1秒
  private defaultTimeout = 30000; // 30秒

  private constructor() {}

  static getInstance(): NetworkService {
    if (!NetworkService.instance) {
      NetworkService.instance = new NetworkService();
    }
    return NetworkService.instance;
  }

  /**
   * 判断是否为可重试的错误
   */
  private isRetryableError(error: any): boolean {
    // 网络错误（无响应）
    if (error.isNetworkError || error.message?.includes('Network request failed')) {
      return true;
    }

    // 超时错误
    if (error.isTimeout) {
      return true;
    }

    // 5xx 服务器错误
    if (error.status >= 500 && error.status < 600) {
      return true;
    }

    // 429 请求过多
    if (error.status === 429) {
      return true;
    }

    // 408 请求超时
    if (error.status === 408) {
      return true;
    }

    return false;
  }

  /**
   * 创建超时 Promise
   */
  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        const timeoutError: NetworkError = new Error('请求超时') as NetworkError;
        timeoutError.isTimeout = true;
        reject(timeoutError);
      }, timeout);
    });
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 计算重试延迟（指数退避）
   */
  private calculateRetryDelay(attempt: number, baseDelay: number): number {
    // 指数退避：1s, 2s, 4s, 8s...
    return baseDelay * Math.pow(2, attempt);
  }

  /**
   * 统一的网络请求方法（支持重试）
   */
  async request<T = any>(
    url: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      retries = this.defaultRetries,
      retryDelay = this.defaultRetryDelay,
      retryCondition,
      showErrorToast = true,
      showSuccessToast = false,
      successMessage,
      timeout = this.defaultTimeout,
      ...fetchOptions
    } = options;

    let lastError: NetworkError | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // 创建超时 Promise
        const timeoutPromise = this.createTimeoutPromise(timeout);

        // 执行请求
        const fetchPromise = fetch(url, {
          ...fetchOptions,
          headers: {
            'Content-Type': 'application/json',
            ...fetchOptions.headers,
          },
        });

        // 竞态：请求 vs 超时
        const response = await Promise.race([fetchPromise, timeoutPromise]);

        // 检查响应状态
        if (!response.ok) {
          const error: NetworkError = new Error(
            `请求失败: ${response.status} ${response.statusText}`
          ) as NetworkError;
          error.status = response.status;
          error.statusText = response.statusText;
          error.response = response;

          // 判断是否可重试
          const shouldRetry =
            attempt < retries &&
            (retryCondition ? retryCondition(error) : this.isRetryableError(error));

          if (shouldRetry) {
            const delay = this.calculateRetryDelay(attempt, retryDelay);
            if (__DEV__) {
              console.log(
                `请求失败，${delay}ms 后重试 (${attempt + 1}/${retries})`,
                error.message
              );
            }
            await this.delay(delay);
            continue;
          }

          // 不可重试或已达到最大重试次数
          lastError = error;
          break;
        }

        // 请求成功
        const data = await response.json().catch(() => response.text());

        // 显示成功提示
        if (showSuccessToast && successMessage) {
          toastService.success(successMessage);
        }

        return data as T;
      } catch (error: any) {
        lastError = error as NetworkError;

        // 判断是否可重试
        const shouldRetry =
          attempt < retries &&
          (retryCondition
            ? retryCondition(error)
            : this.isRetryableError(error));

        if (shouldRetry) {
          const delay = this.calculateRetryDelay(attempt, retryDelay);
          if (__DEV__) {
            console.log(
              `请求异常，${delay}ms 后重试 (${attempt + 1}/${retries})`,
              error.message
            );
          }
          await this.delay(delay);
          continue;
        }

        // 不可重试或已达到最大重试次数
        break;
      }
    }

    // 所有重试都失败，处理错误
    const finalError = lastError || new Error('未知网络错误') as NetworkError;
    
    // 标记为网络错误
    if (!finalError.isNetworkError && !finalError.isTimeout) {
      finalError.isNetworkError = true;
    }

    // 记录错误
    const appError = errorService.handleError(finalError, {
      context: 'NetworkService',
      silent: !showErrorToast,
    });

    // 显示错误提示
    if (showErrorToast) {
      const errorMessage =
        finalError.isTimeout
          ? '请求超时，请检查网络连接'
          : finalError.status === 0
          ? '网络连接失败，请检查网络设置'
          : finalError.status >= 500
          ? '服务器错误，请稍后重试'
          : appError.message;

      toastService.error(errorMessage);
    }

    throw finalError;
  }

  /**
   * GET 请求
   */
  async get<T = any>(url: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'GET',
    });
  }

  /**
   * POST 请求
   */
  async post<T = any>(
    url: string,
    body?: any,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PUT 请求
   */
  async put<T = any>(
    url: string,
    body?: any,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE 请求
   */
  async delete<T = any>(url: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'DELETE',
    });
  }

  /**
   * PATCH 请求
   */
  async patch<T = any>(
    url: string,
    body?: any,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}

export const networkService = NetworkService.getInstance();

