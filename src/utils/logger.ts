/**
 * 安全的日志工具
 * 仅在开发环境输出日志，避免在生产环境泄露敏感信息
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
 * 安全地序列化数据（移除敏感信息）
 */
function sanitizeData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  // 如果是字符串，检查是否包含敏感信息
  if (typeof data === 'string') {
    // 移除可能的密码、密钥等敏感信息
    return data.replace(/password["\s:=]+[^,\s}]+/gi, '[REDACTED]')
               .replace(/token["\s:=]+[^,\s}]+/gi, '[REDACTED]')
               .replace(/key["\s:=]+[^,\s}]+/gi, '[REDACTED]')
               .replace(/secret["\s:=]+[^,\s}]+/gi, '[REDACTED]');
  }

  // 如果是对象，递归处理
  if (typeof data === 'object' && !Array.isArray(data)) {
    const sanitized: any = {};
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'authorization', 'apiKey', 'apikey'];
    
    for (const [key, value] of Object.entries(data)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
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
 * 调试日志（仅在开发环境）
 */
export function debug(...args: any[]): void {
  if (isDevelopment && currentLogLevel <= LogLevel.DEBUG) {
    console.log('[DEBUG]', ...args.map(sanitizeData));
  }
}

/**
 * 信息日志（仅在开发环境）
 */
export function info(...args: any[]): void {
  if (isDevelopment && currentLogLevel <= LogLevel.INFO) {
    console.info('[INFO]', ...args.map(sanitizeData));
  }
}

/**
 * 警告日志（开发环境 + 生产环境）
 */
export function warn(...args: any[]): void {
  if (currentLogLevel <= LogLevel.WARN) {
    console.warn('[WARN]', ...args.map(sanitizeData));
  }
}

/**
 * 错误日志（始终输出，但会清理敏感信息）
 */
export function error(...args: any[]): void {
  if (currentLogLevel <= LogLevel.ERROR) {
    console.error('[ERROR]', ...args.map(sanitizeData));
  }
  
  // 可选：发送到错误监控服务（Sentry 等）
  // if (window.Sentry) {
  //   window.Sentry.captureException(new Error(args.join(' ')));
  // }
}

/**
 * 日志工具（兼容 console.log 的 API）
 */
export const logger = {
  debug,
  info,
  warn,
  error,
  log: isDevelopment ? debug : () => {}, // log 仅在开发环境
};

export default logger;

