import { useState, useCallback, useRef, useEffect } from 'react';

// 异步操作状态
interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

// 异步操作配置
interface AsyncOperationConfig {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

// 自定义Hook：安全的异步操作管理
export function useAsyncOperation<T = any>(config: AsyncOperationConfig = {}) {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: false,
    error: null,
  });
  
  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const {
    onSuccess,
    onError,
    timeout = 30000, // 30秒超时
    retries = 3,
    retryDelay = 1000,
  } = config;

  // 清理函数
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // 执行异步操作
  const execute = useCallback(async (
    operation: (signal?: AbortSignal) => Promise<T>,
    currentRetry = 0
  ): Promise<T | null> => {
    if (!mountedRef.current) return null;
    
    // 清理之前的操作
    cleanup();
    
    // 创建新的AbortController
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    
    // 设置加载状态
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
    }));
    
    try {
      // 设置超时
      timeoutRef.current = setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      }, timeout);
      
      // 执行操作
      const result = await operation(signal);
      
      // 清理超时
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      if (!mountedRef.current) return null;
      
      // 更新成功状态
      setState({
        data: result,
        loading: false,
        error: null,
      });
      
      // 调用成功回调
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
      
    } catch (error) {
      // 清理超时
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      if (!mountedRef.current) return null;
      
      const err = error instanceof Error ? error : new Error('Unknown error');
      
      // 检查是否被取消
      if (err.name === 'AbortError') {
        console.log('操作被取消');
        return null;
      }
      
      // 重试逻辑
      if (currentRetry < retries) {
        console.log(`操作失败，${retryDelay}ms后重试 (${currentRetry + 1}/${retries}):`, err.message);
        
        return new Promise((resolve) => {
          setTimeout(async () => {
            const result = await execute(operation, currentRetry + 1);
            resolve(result);
          }, retryDelay);
        });
      }
      
      // 更新错误状态
      setState({
        data: null,
        loading: false,
        error: err,
      });
      
      // 调用错误回调
      if (onError) {
        onError(err);
      }
      
      return null;
    }
  }, [cleanup, timeout, retries, retryDelay, onSuccess, onError]);

  // 重置状态
  const reset = useCallback(() => {
    cleanup();
    setState({
      data: null,
      loading: false,
      error: null,
    });
  }, [cleanup]);

  // 组件卸载时清理
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  return {
    ...state,
    execute,
    reset,
    isLoading: state.loading,
    isError: !!state.error,
    isSuccess: !!state.data && !state.loading && !state.error,
  };
}

// 防抖Hook
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return debouncedValue;
}

// 节流Hook
export function useThrottle<T>(value: T, limit: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRun = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRun.current >= limit) {
        setThrottledValue(value);
        lastRun.current = Date.now();
      }
    }, limit - (Date.now() - lastRun.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
}

// 安全的事件处理Hook
export function useSafeEventHandler<T extends (...args: any[]) => any>(
  handler: T,
  dependencies: React.DependencyList = []
): T {
  const mountedRef = useRef(true);
  
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  
  return useCallback((...args: Parameters<T>) => {
    if (!mountedRef.current) return;
    
    try {
      return handler(...args);
    } catch (error) {
      console.error('事件处理器执行失败:', error);
      throw error;
    }
  }, dependencies) as T;
}

export default useAsyncOperation;
