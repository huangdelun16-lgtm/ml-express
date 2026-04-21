import { Alert, LogBox, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import { translations } from '../utils/i18n';

// 忽略某些已知的非严重警告
LogBox.ignoreLogs([
  'Setting a timer',
  'AsyncStorage has been extracted',
  'Non-serializable values were found in the navigation state',
]);

async function getLocalizedStrings() {
  try {
    const raw = await AsyncStorage.getItem('appSettings');
    if (raw) {
      const lang = JSON.parse(raw).language as string | undefined;
      if (lang && translations[lang]) {
        return translations[lang];
      }
    }
  } catch {
    // ignore
  }
  return translations.zh;
}

function captureToSentry(error: unknown) {
  try {
    if (error instanceof Error) {
      Sentry.captureException(error);
    } else {
      Sentry.captureException(new Error(typeof error === 'string' ? error : JSON.stringify(error)));
    }
  } catch {
    // Sentry 未初始化或不可用时忽略
  }
}

export const errorService = {
  /**
   * 初始化全局错误捕获
   */
  initGlobalErrorHandler() {
    // 1. 捕获 JS 层面的未处理异常
    const defaultHandler = ErrorUtils.getGlobalHandler();

    ErrorUtils.setGlobalHandler(async (error: any, isFatal?: boolean) => {
      console.error('🚨 全局捕获异常:', error);
      await this.saveErrorLog(error);
      captureToSentry(error);

      const t = await getLocalizedStrings();

      if (isFatal) {
        Alert.alert(
          t.criticalAppErrorTitle,
          `${t.criticalAppErrorMessage}\n\n${error?.message || t.unknownError}`,
          [
            {
              text: t.ok,
              onPress: () => {
                if (__DEV__) {
                  defaultHandler(error, isFatal);
                }
              },
            },
          ]
        );
      } else {
        if (__DEV__) {
          defaultHandler(error, isFatal);
        }
      }
    });

    // 2. 捕获未处理的 Promise Rejection
    const originalHandler = (global as any).Promise.onUnhandledRejection;
    (global as any).Promise.onUnhandledRejection = (id: string, error: any) => {
      console.warn('⚠️ 未处理的 Promise 拒绝:', error);
      this.saveErrorLog({
        message: error?.message || 'Unhandled Promise Rejection',
        stack: error?.stack || '',
        type: 'PROMISE_REJECTION',
      });
      captureToSentry(error ?? new Error('Unhandled Promise Rejection'));
      if (originalHandler) originalHandler(id, error);
    };
  },

  /**
   * 保存错误日志到本地存储
   */
  async saveErrorLog(error: any) {
    try {
      const logEntry = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        message: typeof error === 'string' ? error : (error.message || 'No message'),
        stack: error.stack || 'No stack',
        device: `${Platform.OS} ${Platform.Version}`,
        type: error.type || 'JS_ERROR',
      };

      const existingLogsStr = await AsyncStorage.getItem('app_error_logs');
      const existingLogs = existingLogsStr ? JSON.parse(existingLogsStr) : [];

      const newLogs = [logEntry, ...existingLogs].slice(0, 20);
      await AsyncStorage.setItem('app_error_logs', JSON.stringify(newLogs));
    } catch (e) {
      console.error('Failed to save error log:', e);
    }
  },

  /**
   * 获取所有错误日志
   */
  async getErrorLogs() {
    try {
      const logs = await AsyncStorage.getItem('app_error_logs');
      return logs ? JSON.parse(logs) : [];
    } catch (e) {
      return [];
    }
  },

  /**
   * 清除日志
   */
  async clearLogs() {
    try {
      await AsyncStorage.removeItem('app_error_logs');
    } catch (e) {}
  },
};
