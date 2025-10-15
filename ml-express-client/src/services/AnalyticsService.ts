import AsyncStorage from '@react-native-async-storage/async-storage';

// 事件类型枚举
export enum EventType {
  // 用户行为事件
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  USER_REGISTER = 'user_register',
  USER_PROFILE_UPDATE = 'user_profile_update',
  
  // 订单相关事件
  ORDER_CREATE = 'order_create',
  ORDER_CANCEL = 'order_cancel',
  ORDER_COMPLETE = 'order_complete',
  ORDER_RATE = 'order_rate',
  ORDER_TRACK = 'order_track',
  
  // 页面访问事件
  PAGE_VIEW = 'page_view',
  PAGE_EXIT = 'page_exit',
  
  // 功能使用事件
  FEATURE_USE = 'feature_use',
  BUTTON_CLICK = 'button_click',
  
  // 错误事件
  ERROR_OCCURRED = 'error_occurred',
  API_ERROR = 'api_error',
  NETWORK_ERROR = 'network_error',
  
  // 性能事件
  PERFORMANCE_METRIC = 'performance_metric',
  LOAD_TIME = 'load_time',
  
  // 崩溃事件
  CRASH_OCCURRED = 'crash_occurred',
  EXCEPTION_OCCURRED = 'exception_occurred',
}

// 事件属性接口
interface EventProperties {
  [key: string]: string | number | boolean | null;
}

// 事件接口
interface AnalyticsEvent {
  type: EventType;
  properties: EventProperties;
  timestamp: number;
  userId?: string;
  sessionId: string;
  deviceInfo: DeviceInfo;
}

// 设备信息接口
interface DeviceInfo {
  platform: string;
  version: string;
  model: string;
  screenWidth: number;
  screenHeight: number;
  language: string;
  timezone: string;
}

// 用户属性接口
interface UserProperties {
  userId: string;
  email?: string;
  name?: string;
  phone?: string;
  userType?: string;
  registrationDate?: string;
  lastLoginDate?: string;
}

// 会话信息接口
interface SessionInfo {
  sessionId: string;
  startTime: number;
  lastActivity: number;
  pageViews: number;
  events: number;
}

// 分析服务类
export class AnalyticsService {
  private static instance: AnalyticsService;
  private events: AnalyticsEvent[] = [];
  private sessionInfo: SessionInfo | null = null;
  private userProperties: UserProperties | null = null;
  private deviceInfo: DeviceInfo | null = null;
  private isEnabled = true;
  private batchSize = 10;
  private flushInterval = 30000; // 30秒

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  // 初始化分析服务
  async initialize(): Promise<void> {
    try {
      // 获取设备信息
      this.deviceInfo = await this.getDeviceInfo();
      
      // 获取会话信息
      this.sessionInfo = await this.getSessionInfo();
      
      // 获取用户属性
      this.userProperties = await this.getUserProperties();
      
      // 开始定期刷新事件
      this.startFlushInterval();
      
      // 记录应用启动事件
      this.track(EventType.PAGE_VIEW, {
        page_name: 'app_start',
        page_title: 'MARKET LINK EXPRESS',
      });
      
      console.log('Analytics service initialized');
    } catch (error) {
      console.error('Failed to initialize analytics:', error);
    }
  }

  // 追踪事件
  track(type: EventType, properties: EventProperties = {}): void {
    if (!this.isEnabled || !this.sessionInfo || !this.deviceInfo) return;

    const event: AnalyticsEvent = {
      type,
      properties: {
        ...properties,
        session_id: this.sessionInfo.sessionId,
        user_id: this.userProperties?.userId || 'anonymous',
      },
      timestamp: Date.now(),
      userId: this.userProperties?.userId,
      sessionId: this.sessionInfo.sessionId,
      deviceInfo: this.deviceInfo,
    };

    this.events.push(event);
    this.sessionInfo.events++;
    this.sessionInfo.lastActivity = Date.now();

    // 如果事件数量达到批次大小，立即刷新
    if (this.events.length >= this.batchSize) {
      this.flush();
    }

    console.log('Event tracked:', type, properties);
  }

  // 设置用户属性
  async setUserProperties(properties: UserProperties): Promise<void> {
    this.userProperties = properties;
    
    try {
      await AsyncStorage.setItem('analytics_user_properties', JSON.stringify(properties));
    } catch (error) {
      console.error('Failed to save user properties:', error);
    }
  }

  // 页面访问追踪
  trackPageView(pageName: string, pageTitle?: string, properties: EventProperties = {}): void {
    this.track(EventType.PAGE_VIEW, {
      page_name: pageName,
      page_title: pageTitle || pageName,
      ...properties,
    });
    
    if (this.sessionInfo) {
      this.sessionInfo.pageViews++;
    }
  }

  // 按钮点击追踪
  trackButtonClick(buttonName: string, pageName: string, properties: EventProperties = {}): void {
    this.track(EventType.BUTTON_CLICK, {
      button_name: buttonName,
      page_name: pageName,
      ...properties,
    });
  }

  // 功能使用追踪
  trackFeatureUse(featureName: string, properties: EventProperties = {}): void {
    this.track(EventType.FEATURE_USE, {
      feature_name: featureName,
      ...properties,
    });
  }

  // 错误追踪
  trackError(errorType: string, errorMessage: string, properties: EventProperties = {}): void {
    this.track(EventType.ERROR_OCCURRED, {
      error_type: errorType,
      error_message: errorMessage,
      ...properties,
    });
  }

  // API错误追踪
  trackApiError(apiEndpoint: string, statusCode: number, errorMessage: string): void {
    this.track(EventType.API_ERROR, {
      api_endpoint: apiEndpoint,
      status_code: statusCode,
      error_message: errorMessage,
    });
  }

  // 性能指标追踪
  trackPerformance(metricName: string, value: number, properties: EventProperties = {}): void {
    this.track(EventType.PERFORMANCE_METRIC, {
      metric_name: metricName,
      metric_value: value,
      ...properties,
    });
  }

  // 加载时间追踪
  trackLoadTime(pageName: string, loadTime: number): void {
    this.track(EventType.LOAD_TIME, {
      page_name: pageName,
      load_time: loadTime,
    });
  }

  // 订单事件追踪
  trackOrderEvent(eventType: EventType, orderId: string, properties: EventProperties = {}): void {
    this.track(eventType, {
      order_id: orderId,
      ...properties,
    });
  }

  // 用户登录追踪
  trackUserLogin(userId: string, loginMethod: string = 'email'): void {
    this.track(EventType.USER_LOGIN, {
      user_id: userId,
      login_method: loginMethod,
    });
  }

  // 用户注册追踪
  trackUserRegister(userId: string, registrationMethod: string = 'email'): void {
    this.track(EventType.USER_REGISTER, {
      user_id: userId,
      registration_method: registrationMethod,
    });
  }

  // 刷新事件到服务器
  async flush(): Promise<void> {
    if (this.events.length === 0) return;

    const eventsToSend = [...this.events];
    this.events = [];

    try {
      // 这里应该发送到分析服务器
      await this.sendEventsToServer(eventsToSend);
      console.log(`Sent ${eventsToSend.length} events to server`);
    } catch (error) {
      console.error('Failed to send events:', error);
      // 发送失败时重新添加到队列
      this.events.unshift(...eventsToSend);
    }
  }

  // 启用/禁用分析
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  // 获取分析统计
  getStats() {
    return {
      eventsInQueue: this.events.length,
      sessionInfo: this.sessionInfo,
      userProperties: this.userProperties,
      deviceInfo: this.deviceInfo,
    };
  }

  // 清理数据
  async clear(): Promise<void> {
    this.events = [];
    this.sessionInfo = null;
    this.userProperties = null;
    
    try {
      await AsyncStorage.removeItem('analytics_session');
      await AsyncStorage.removeItem('analytics_user_properties');
    } catch (error) {
      console.error('Failed to clear analytics data:', error);
    }
  }

  // 获取设备信息
  private async getDeviceInfo(): Promise<DeviceInfo> {
    const { Dimensions, Platform } = require('react-native');
    const { width, height } = Dimensions.get('window');
    
    return {
      platform: Platform.OS,
      version: Platform.Version.toString(),
      model: Platform.OS === 'ios' ? 'iPhone' : 'Android',
      screenWidth: width,
      screenHeight: height,
      language: 'zh-CN',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  // 获取会话信息
  private async getSessionInfo(): Promise<SessionInfo> {
    try {
      const stored = await AsyncStorage.getItem('analytics_session');
      if (stored) {
        const session = JSON.parse(stored);
        // 检查会话是否过期（24小时）
        if (Date.now() - session.startTime < 24 * 60 * 60 * 1000) {
          return session;
        }
      }
    } catch (error) {
      console.error('Failed to load session info:', error);
    }

    // 创建新会话
    const newSession: SessionInfo = {
      sessionId: this.generateSessionId(),
      startTime: Date.now(),
      lastActivity: Date.now(),
      pageViews: 0,
      events: 0,
    };

    try {
      await AsyncStorage.setItem('analytics_session', JSON.stringify(newSession));
    } catch (error) {
      console.error('Failed to save session info:', error);
    }

    return newSession;
  }

  // 获取用户属性
  private async getUserProperties(): Promise<UserProperties | null> {
    try {
      const stored = await AsyncStorage.getItem('analytics_user_properties');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to load user properties:', error);
      return null;
    }
  }

  // 生成会话ID
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 开始定期刷新
  private startFlushInterval(): void {
    setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  // 发送事件到服务器（模拟实现）
  private async sendEventsToServer(events: AnalyticsEvent[]): Promise<void> {
    // 在实际项目中，这里应该发送到真实的分析服务器
    // 例如：Firebase Analytics, Mixpanel, Amplitude 等
    
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Events sent to server:', events.length);
        resolve();
      }, 100);
    });
  }
}

// 崩溃报告服务
export class CrashReportingService {
  private static instance: CrashReportingService;
  private isEnabled = true;

  static getInstance(): CrashReportingService {
    if (!CrashReportingService.instance) {
      CrashReportingService.instance = new CrashReportingService();
    }
    return CrashReportingService.instance;
  }

  // 初始化崩溃报告
  initialize(): void {
    // 设置全局错误处理器
    this.setupGlobalErrorHandler();
    
    // 设置未处理的Promise拒绝处理器
    this.setupUnhandledRejectionHandler();
    
    console.log('Crash reporting initialized');
  }

  // 记录崩溃
  recordCrash(error: Error, context?: any): void {
    if (!this.isEnabled) return;

    const crashReport = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context,
      timestamp: Date.now(),
      deviceInfo: this.getDeviceInfo(),
      userInfo: this.getUserInfo(),
    };

    // 发送崩溃报告到服务器
    this.sendCrashReport(crashReport);
    
    console.error('Crash recorded:', crashReport);
  }

  // 记录异常
  recordException(exception: any, context?: any): void {
    if (!this.isEnabled) return;

    const exceptionReport = {
      exception,
      context,
      timestamp: Date.now(),
      deviceInfo: this.getDeviceInfo(),
      userInfo: this.getUserInfo(),
    };

    // 发送异常报告到服务器
    this.sendExceptionReport(exceptionReport);
    
    console.error('Exception recorded:', exceptionReport);
  }

  // 设置全局错误处理器
  private setupGlobalErrorHandler(): void {
    const originalHandler = ErrorUtils.getGlobalHandler();
    
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      this.recordCrash(error, { isFatal });
      originalHandler(error, isFatal);
    });
  }

  // 设置未处理的Promise拒绝处理器
  private setupUnhandledRejectionHandler(): void {
    // React Native 中的实现
    const originalHandler = global.onunhandledrejection;
    
    global.onunhandledrejection = (event) => {
      this.recordException(event.reason, { type: 'unhandledRejection' });
      if (originalHandler) {
        originalHandler(event);
      }
    };
  }

  // 获取设备信息
  private getDeviceInfo(): any {
    const { Platform, Dimensions } = require('react-native');
    const { width, height } = Dimensions.get('window');
    
    return {
      platform: Platform.OS,
      version: Platform.Version,
      screenWidth: width,
      screenHeight: height,
    };
  }

  // 获取用户信息
  private getUserInfo(): any {
    // 这里应该获取当前用户信息
    return {
      userId: 'anonymous',
    };
  }

  // 发送崩溃报告
  private async sendCrashReport(report: any): Promise<void> {
    // 在实际项目中，这里应该发送到崩溃报告服务
    // 例如：Crashlytics, Sentry, Bugsnag 等
    console.log('Crash report sent:', report);
  }

  // 发送异常报告
  private async sendExceptionReport(report: any): Promise<void> {
    // 在实际项目中，这里应该发送到异常报告服务
    console.log('Exception report sent:', report);
  }

  // 启用/禁用崩溃报告
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }
}

// 导出单例实例
export const analytics = AnalyticsService.getInstance();
export const crashReporting = CrashReportingService.getInstance();
