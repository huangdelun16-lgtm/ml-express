import * as Sentry from 'sentry-expo';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

class SentryService {
  private initialized = false;

  init() {
    if (this.initialized || __DEV__) {
      console.log('Sentry initialized (dev mode)');
      return;
    }

    Sentry.init({
      dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || 'YOUR_SENTRY_DSN_HERE',
      enableInExpoDevelopment: false,
      environment: __DEV__ ? 'development' : 'production',
      release: Constants.expoConfig?.version,
    });

    this.initialized = true;
  }

  captureException(error: Error, context?: Record<string, any>) {
    if (!this.initialized) return;
    Sentry.Native.captureException(error, { extra: context });
  }

  setUser(userId: string, userInfo?: Record<string, any>) {
    if (!this.initialized) return;
    Sentry.Native.setUser({ id: userId, ...userInfo });
  }
}

export const sentryService = new SentryService();
