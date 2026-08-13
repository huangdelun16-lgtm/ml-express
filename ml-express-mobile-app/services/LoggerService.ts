/**
 * 统一日志：开发环境输出控制台；生产环境压制 debug/info，错误走 Sentry。
 */
import * as Sentry from '@sentry/react-native';

const isDevelopment = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const currentLogLevel = (() => {
  const level = process.env.EXPO_PUBLIC_LOG_LEVEL;
  if (level === 'DEBUG') return LogLevel.DEBUG;
  if (level === 'INFO') return LogLevel.INFO;
  if (level === 'WARN') return LogLevel.WARN;
  if (level === 'ERROR') return LogLevel.ERROR;
  return isDevelopment ? LogLevel.DEBUG : LogLevel.ERROR;
})();

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
  'anon',
];

function sanitizeData(data: any): any {
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    let sanitized = data;
    SENSITIVE_KEYS.forEach((key) => {
      const regex = new RegExp(`${key}["\\s:=]+[^,\\s}]+`, 'gi');
      sanitized = sanitized.replace(regex, `[${key.toUpperCase()}_REDACTED]`);
    });
    return sanitized;
  }

  if (typeof data === 'object' && !Array.isArray(data)) {
    if (data instanceof Error) {
      return { name: data.name, message: sanitizeData(data.message), stack: data.stack };
    }
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      const isSensitive = SENSITIVE_KEYS.some((sk) => key.toLowerCase().includes(sk.toLowerCase()));
      sanitized[key] = isSensitive ? '[REDACTED]' : sanitizeData(value);
    }
    return sanitized;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item));
  }

  return data;
}

function sendToSentry(level: LogLevel, message: string, data?: any) {
  try {
    if (level >= LogLevel.ERROR) {
      if (data instanceof Error) {
        Sentry.captureException(data, { extra: { message } });
      } else {
        Sentry.captureMessage(message, {
          level: 'error',
          extra: sanitizeData(data),
        });
      }
      return;
    }
    if (level >= LogLevel.WARN) {
      Sentry.addBreadcrumb({
        category: 'app',
        message,
        level: 'warning',
        data: sanitizeData(data),
      });
    }
  } catch {
    // Sentry 未初始化时忽略
  }
}

class LoggerService {
  static debug(message: string, data?: any): void {
    if (isDevelopment && currentLogLevel <= LogLevel.DEBUG) {
      console.log('[DEBUG]', message, data !== undefined ? sanitizeData(data) : '');
    }
  }

  static info(message: string, data?: any): void {
    if (isDevelopment && currentLogLevel <= LogLevel.INFO) {
      console.info('[INFO]', message, data !== undefined ? sanitizeData(data) : '');
    }
  }

  static warn(message: string, data?: any): void {
    if (currentLogLevel <= LogLevel.WARN) {
      if (isDevelopment) {
        console.warn('[WARN]', message, data !== undefined ? sanitizeData(data) : '');
      }
    }
    if (!isDevelopment) {
      sendToSentry(LogLevel.WARN, message, data);
    }
  }

  static error(message: string, error?: Error | any, context?: any): void {
    if (currentLogLevel <= LogLevel.ERROR) {
      if (isDevelopment) {
        console.error('[ERROR]', message, sanitizeData(error), sanitizeData(context));
      }
    }
    if (!isDevelopment) {
      sendToSentry(LogLevel.ERROR, message, error ?? context);
      if (context) {
        Sentry.addBreadcrumb({
          category: 'app.error',
          message,
          level: 'error',
          data: sanitizeData(context),
        });
      }
    }
  }

  static log(message: string, ...args: any[]): void {
    if (isDevelopment) {
      console.log('[LOG]', message, ...args.map(sanitizeData));
    }
  }
}

/**
 * 生产环境压制 console.log/info/debug，避免泄露内部信息；warn/error 脱敏后保留。
 */
export function installProductionConsoleGate(): void {
  if (isDevelopment) return;

  const redactedWarn = (...args: any[]) => {
    try {
      console.warn.apply(console, args.map(sanitizeData) as any);
    } catch {
      /* ignore */
    }
  };
  const redactedError = (...args: any[]) => {
    try {
      console.error.apply(console, args.map(sanitizeData) as any);
      const first = args[0];
      const msg = typeof first === 'string' ? first : 'console.error';
      sendToSentry(LogLevel.ERROR, msg, args.length > 1 ? args[1] : first);
    } catch {
      /* ignore */
    }
  };

  // eslint-disable-next-line no-console
  console.log = () => {};
  // eslint-disable-next-line no-console
  console.info = () => {};
  // eslint-disable-next-line no-console
  console.debug = () => {};
  // eslint-disable-next-line no-console
  console.warn = redactedWarn as typeof console.warn;
  // eslint-disable-next-line no-console
  console.error = redactedError as typeof console.error;
}

export default LoggerService;

export const logger = {
  debug: LoggerService.debug.bind(LoggerService),
  info: LoggerService.info.bind(LoggerService),
  warn: LoggerService.warn.bind(LoggerService),
  error: LoggerService.error.bind(LoggerService),
  log: LoggerService.log.bind(LoggerService),
};
