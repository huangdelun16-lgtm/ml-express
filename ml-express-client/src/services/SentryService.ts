// Sentry 服务（可选，如果未安装 sentry-expo 则禁用）
let Sentry: any = null;
let SentryAvailable = false;

try {
  Sentry = require('sentry-expo');
  SentryAvailable = true;
} catch (error) {
  console.warn('⚠️ sentry-expo 未安装，Sentry 错误监控已禁用');
  SentryAvailable = false;
}

import Constants from 'expo-constants';

class SentryService {
  private initialized = false;

  init() {
    if (!SentryAvailable) {
      console.log('Sentry 不可用（sentry-expo 未安装）');
      return;
    }

    if (this.initialized || __DEV__) {
      console.log('Sentry initialized (dev mode)');
      return;
    }

    try {
      Sentry.init({
        dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || 'YOUR_SENTRY_DSN_HERE',
        enableInExpoDevelopment: false,
        environment: __DEV__ ? 'development' : 'production',
        release: Constants.expoConfig?.version,
      });

      this.initialized = true;
    } catch (error) {
      console.warn('Sentry 初始化失败:', error);
    }
  }

  captureException(error: Error, context?: Record<string, any>) {
    if (!SentryAvailable || !this.initialized) return;
    try {
      Sentry.Native.captureException(error, { extra: context });
    } catch (e) {
      console.warn('Sentry 捕获异常失败:', e);
    }
  }

  setUser(userId: string, userInfo?: Record<string, any>) {
    if (!SentryAvailable || !this.initialized) return;
    try {
      Sentry.Native.setUser({ id: userId, ...userInfo });
    } catch (e) {
      console.warn('Sentry 设置用户失败:', e);
    }
  }
}

export const sentryService = new SentryService();
