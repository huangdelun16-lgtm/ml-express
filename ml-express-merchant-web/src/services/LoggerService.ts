/**
 * 统一的日志服务
 * 用于替换所有 console.log/error/warn/info
 * 
 * 功能：
 * - 开发环境：输出到控制台
 * - 生产环境：发送到日志服务（可选：Sentry、LogRocket等）
 * - 自动清理敏感信息（密码、token、密钥等）
 */

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * 日志级别
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * 当前日志级别（可通过环境变量配置）
 */
const currentLogLevel = (() => {
  const level = process.env.REACT_APP_LOG_LEVEL;
  if (level === 'DEBUG') return LogLevel.DEBUG;
  if (level === 'INFO') return LogLevel.INFO;
  if (level === 'WARN') return LogLevel.WARN;
  if (level === 'ERROR') return LogLevel.ERROR;
  // 默认：开发环境 DEBUG，生产环境 ERROR
  return isDevelopment ? LogLevel.DEBUG : LogLevel.ERROR;
})();

/**
 * 敏感信息关键词（用于清理日志）
 */
const SENSITIVE_KEYS = [
  'password',
  'token',
  'key',
  'secret',
  'authorization',
  'apikey',
  'api_key',
  'access_token',
  'refresh_token',
  'session',
  'cookie',
];

/**
 * 安全地序列化数据（移除敏感信息）
 */
function sanitizeData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  // 如果是字符串，检查是否包含敏感信息
  if (typeof data === 'string') {
    let sanitized = data;
    SENSITIVE_KEYS.forEach(key => {
      const regex = new RegExp(`${key}["\\s:=]+[^,\\s}]+`, 'gi');
      sanitized = sanitized.replace(regex, `[${key.toUpperCase()}_REDACTED]`);
    });
    return sanitized;
  }

  // 如果是对象，递归处理
  if (typeof data === 'object' && !Array.isArray(data)) {
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(data)) {
      const isSensitive = SENSITIVE_KEYS.some(sk => 
        key.toLowerCase().includes(sk.toLowerCase())
      );
      
      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeData(value);
      }
    }
    return sanitized;
  }

  // 如果是数组，处理每个元素
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }

  return data;
}

/**
 * 发送日志到外部服务（生产环境）
 */
function sendToLogService(level: LogLevel, message: string, data?: any) {
  // 生产环境：可以发送到 Sentry、LogRocket 等服务
  // 示例：Sentry
  // if (window.Sentry && level >= LogLevel.ERROR) {
  //   window.Sentry.captureMessage(message, {
  //     level: level === LogLevel.ERROR ? 'error' : 'info',
  //     extra: sanitizeData(data),
  //   });
  // }
  
  // 示例：自定义日志服务
  // fetch('/api/logs', {
  //   method: 'POST',
  //   body: JSON.stringify({
  //     level,
  //     message,
  //     data: sanitizeData(data),
  //     timestamp: new Date().toISOString(),
  //   }),
  // }).catch(() => {
  //   // 静默失败，不影响应用运行
  // });
}

/**
 * LoggerService 类
 */
class LoggerService {
  /**
   * 调试日志（仅在开发环境）
   */
  static debug(message: string, ...args: any[]): void {
    const sanitizedArgs = args.map(arg => sanitizeData(arg));
    
    if (isDevelopment && currentLogLevel <= LogLevel.DEBUG) {
      console.log('[DEBUG]', message, ...sanitizedArgs);
    }
  }

  /**
   * 信息日志（仅在开发环境）
   */
  static info(message: string, ...args: any[]): void {
    const sanitizedArgs = args.map(arg => sanitizeData(arg));
    
    if (isDevelopment && currentLogLevel <= LogLevel.INFO) {
      console.info('[INFO]', message, ...sanitizedArgs);
    }
  }

  /**
   * 警告日志（开发环境 + 生产环境）
   */
  static warn(message: string, ...args: any[]): void {
    const sanitizedArgs = args.map(arg => sanitizeData(arg));
    
    if (currentLogLevel <= LogLevel.WARN) {
      console.warn('[WARN]', message, ...sanitizedArgs);
    }
    
    // 生产环境发送警告到日志服务
    if (!isDevelopment) {
      sendToLogService(LogLevel.WARN, message, args);
    }
  }

  /**
   * 错误日志（始终输出，但会清理敏感信息）
   */
  static error(message: string, ...args: any[]): void {
    const sanitizedArgs = args.map(arg => sanitizeData(arg));
    
    if (currentLogLevel <= LogLevel.ERROR) {
      console.error('[ERROR]', message, ...sanitizedArgs);
    }
    
    // 生产环境发送错误到日志服务
    if (!isDevelopment) {
      sendToLogService(LogLevel.ERROR, message, { args });
    }
  }

  /**
   * 兼容 console.log 的 API（仅在开发环境）
   */
  static log(message: string, ...args: any[]): void {
    if (isDevelopment) {
      console.log('[LOG]', message, ...args.map(sanitizeData));
    }
  }
}

/**
 * 导出默认实例（兼容旧代码）
 */
export default LoggerService;

/**
 * 导出便捷方法（兼容旧代码）
 */
export const logger = {
  debug: LoggerService.debug.bind(LoggerService),
  info: LoggerService.info.bind(LoggerService),
  warn: LoggerService.warn.bind(LoggerService),
  error: LoggerService.error.bind(LoggerService),
  log: LoggerService.log.bind(LoggerService),
};

