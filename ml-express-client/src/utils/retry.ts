/**
 * 通用重试函数
 * @param fn 要执行的异步函数
 * @param options 重试配置
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number; // 重试次数，默认 3
    delay?: number; // 重试延迟（毫秒），默认 1000
    backoff?: boolean; // 是否指数退避，默认 true
    shouldRetry?: (error: any) => boolean; // 自定义重试条件
  } = {}
): Promise<T> {
  const {
    retries = 3,
    delay = 1000,
    backoff = true,
    shouldRetry = () => true,
  } = options;

  let lastError: any;

  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // 如果是最后一次尝试，或者不应该重试，则抛出错误
      if (i === retries || !shouldRetry(error)) {
        throw error;
      }

      // 计算延迟时间
      const waitTime = backoff ? delay * Math.pow(2, i) : delay;
      
      // 等待
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw lastError;
}

