import { Alert, LogBox, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 忽略某些已知的非严重警告
LogBox.ignoreLogs([
  'Setting a timer',
  'AsyncStorage has been extracted',
  'Non-serializable values were found in the navigation state',
]);

export const errorService = {
  /**
   * 初始化全局错误捕获
   */
  initGlobalErrorHandler() {
    // 1. 捕获 JS 层面的未处理异常
    const defaultHandler = ErrorUtils.getGlobalHandler();
    
    ErrorUtils.setGlobalHandler(async (error: any, isFatal?: boolean) => {
      // 记录日志
      console.error('🚨 全局捕获异常:', error);
      await this.saveErrorLog(error);

      // 如果是致命错误，弹窗提示
      if (isFatal) {
        Alert.alert(
          '⚠️ 应用程序异常 (Critical)',
          '很抱歉，程序遇到一个致命错误。我们已记录此问题，请尝试重启应用。\n\n' + (error.message || '未知错误'),
          [
            {
              text: '确定',
              onPress: () => {
                if (__DEV__) {
                  defaultHandler(error, isFatal);
                }
              }
            }
          ]
        );
      } else {
        // 非致命错误且在开发环境，显示红屏
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
        type: 'PROMISE_REJECTION' 
      });
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
        type: error.type || 'JS_ERROR'
      };

      const existingLogsStr = await AsyncStorage.getItem('app_error_logs');
      const existingLogs = existingLogsStr ? JSON.parse(existingLogsStr) : [];
      
      // 只保留最近 20 条日志
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
  }
};

