// Sentry 服务（暂时禁用以避免依赖问题）
// 如果需要启用 Sentry，请确保安装了所有必要的依赖包

import Constants from 'expo-constants';

class SentryService {
  private initialized = false;
  private enabled = false; // 暂时禁用 Sentry

  init() {
    // 暂时禁用 Sentry，避免依赖问题
    if (__DEV__) {
      console.log('Sentry 已禁用（开发模式）');
      return;
    }

    // 如果需要启用 Sentry，取消下面的注释并确保安装了所有依赖
    /*
    try {
      const Sentry = require('sentry-expo');
      Sentry.init({
        dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || 'YOUR_SENTRY_DSN_HERE',
        enableInExpoDevelopment: false,
        environment: __DEV__ ? 'development' : 'production',
        release: Constants.expoConfig?.version,
      });
      this.initialized = true;
      this.enabled = true;
    } catch (error) {
      console.warn('Sentry 初始化失败:', error);
    }
    */
    
    console.log('Sentry 已禁用（暂时关闭以避免依赖问题）');
  }

  captureException(error: Error, context?: Record<string, any>) {
    if (!this.enabled || !this.initialized) {
      // 在开发模式下，至少打印错误到控制台
      if (__DEV__) {
        console.error('错误:', error, context);
      }
      return;
    }
    // Sentry 代码已禁用
  }

  setUser(userId: string, userInfo?: Record<string, any>) {
    if (!this.enabled || !this.initialized) return;
    // Sentry 代码已禁用
  }
}

export const sentryService = new SentryService();
