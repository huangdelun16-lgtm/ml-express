import { useEffect, useRef, useCallback } from 'react';
import { analytics, EventType } from '../services/AnalyticsService';

// 分析钩子
export const useAnalytics = () => {
  const pageStartTime = useRef<number>(0);

  // 页面访问追踪
  const trackPageView = useCallback((pageName: string, pageTitle?: string, properties?: any) => {
    pageStartTime.current = Date.now();
    analytics.trackPageView(pageName, pageTitle, properties);
  }, []);

  // 页面退出追踪
  const trackPageExit = useCallback((pageName: string, properties?: any) => {
    const timeSpent = Date.now() - pageStartTime.current;
    analytics.track(EventType.PAGE_EXIT, {
      page_name: pageName,
      time_spent: timeSpent,
      ...properties,
    });
  }, []);

  // 按钮点击追踪
  const trackButtonClick = useCallback((buttonName: string, pageName: string, properties?: any) => {
    analytics.trackButtonClick(buttonName, pageName, properties);
  }, []);

  // 功能使用追踪
  const trackFeatureUse = useCallback((featureName: string, properties?: any) => {
    analytics.trackFeatureUse(featureName, properties);
  }, []);

  // 错误追踪
  const trackError = useCallback((errorType: string, errorMessage: string, properties?: any) => {
    analytics.trackError(errorType, errorMessage, properties);
  }, []);

  // 性能追踪
  const trackPerformance = useCallback((metricName: string, value: number, properties?: any) => {
    analytics.trackPerformance(metricName, value, properties);
  }, []);

  // 订单事件追踪
  const trackOrderEvent = useCallback((eventType: EventType, orderId: string, properties?: any) => {
    analytics.trackOrderEvent(eventType, orderId, properties);
  }, []);

  return {
    trackPageView,
    trackPageExit,
    trackButtonClick,
    trackFeatureUse,
    trackError,
    trackPerformance,
    trackOrderEvent,
  };
};

// 页面分析钩子
export const usePageAnalytics = (pageName: string, pageTitle?: string) => {
  const { trackPageView, trackPageExit } = useAnalytics();

  useEffect(() => {
    // 页面进入时追踪
    trackPageView(pageName, pageTitle);

    // 页面退出时追踪
    return () => {
      trackPageExit(pageName);
    };
  }, [pageName, pageTitle, trackPageView, trackPageExit]);
};

// 按钮分析钩子
export const useButtonAnalytics = (buttonName: string, pageName: string) => {
  const { trackButtonClick } = useAnalytics();

  const handlePress = useCallback((onPress?: () => void) => {
    return () => {
      trackButtonClick(buttonName, pageName);
      onPress?.();
    };
  }, [buttonName, pageName, trackButtonClick]);

  return { handlePress };
};

// 功能分析钩子
export const useFeatureAnalytics = (featureName: string) => {
  const { trackFeatureUse } = useAnalytics();

  const trackUse = useCallback((properties?: any) => {
    trackFeatureUse(featureName, properties);
  }, [featureName, trackFeatureUse]);

  return { trackUse };
};

// 错误分析钩子
export const useErrorAnalytics = () => {
  const { trackError } = useAnalytics();

  const trackApiError = useCallback((apiEndpoint: string, statusCode: number, errorMessage: string) => {
    analytics.trackApiError(apiEndpoint, statusCode, errorMessage);
  }, []);

  const trackNetworkError = useCallback((errorMessage: string) => {
    trackError('network_error', errorMessage);
  }, [trackError]);

  const trackValidationError = useCallback((field: string, errorMessage: string) => {
    trackError('validation_error', errorMessage, { field });
  }, [trackError]);

  return {
    trackError,
    trackApiError,
    trackNetworkError,
    trackValidationError,
  };
};

// 性能分析钩子
export const usePerformanceAnalytics = () => {
  const { trackPerformance } = useAnalytics();

  const trackLoadTime = useCallback((pageName: string, loadTime: number) => {
    analytics.trackLoadTime(pageName, loadTime);
  }, []);

  const trackRenderTime = useCallback((componentName: string, renderTime: number) => {
    trackPerformance('render_time', renderTime, { component: componentName });
  }, [trackPerformance]);

  const trackApiResponseTime = useCallback((endpoint: string, responseTime: number) => {
    trackPerformance('api_response_time', responseTime, { endpoint });
  }, [trackPerformance]);

  return {
    trackLoadTime,
    trackRenderTime,
    trackApiResponseTime,
  };
};

// 订单分析钩子
export const useOrderAnalytics = () => {
  const { trackOrderEvent } = useAnalytics();

  const trackOrderCreate = useCallback((orderId: string, properties?: any) => {
    trackOrderEvent(EventType.ORDER_CREATE, orderId, properties);
  }, [trackOrderEvent]);

  const trackOrderCancel = useCallback((orderId: string, reason?: string) => {
    trackOrderEvent(EventType.ORDER_CANCEL, orderId, { reason });
  }, [trackOrderEvent]);

  const trackOrderComplete = useCallback((orderId: string, properties?: any) => {
    trackOrderEvent(EventType.ORDER_COMPLETE, orderId, properties);
  }, [trackOrderEvent]);

  const trackOrderRate = useCallback((orderId: string, rating: number, comment?: string) => {
    trackOrderEvent(EventType.ORDER_RATE, orderId, { rating, comment });
  }, [trackOrderEvent]);

  const trackOrderTrack = useCallback((orderId: string, trackingCode: string) => {
    trackOrderEvent(EventType.ORDER_TRACK, orderId, { tracking_code: trackingCode });
  }, [trackOrderEvent]);

  return {
    trackOrderCreate,
    trackOrderCancel,
    trackOrderComplete,
    trackOrderRate,
    trackOrderTrack,
  };
};

// 用户分析钩子
export const useUserAnalytics = () => {
  const trackUserLogin = useCallback((userId: string, loginMethod: string = 'email') => {
    analytics.trackUserLogin(userId, loginMethod);
  }, []);

  const trackUserRegister = useCallback((userId: string, registrationMethod: string = 'email') => {
    analytics.trackUserRegister(userId, registrationMethod);
  }, []);

  const trackUserLogout = useCallback((userId: string) => {
    analytics.track(EventType.USER_LOGOUT, { user_id: userId });
  }, []);

  const trackProfileUpdate = useCallback((userId: string, updatedFields: string[]) => {
    analytics.track(EventType.USER_PROFILE_UPDATE, {
      user_id: userId,
      updated_fields: updatedFields.join(','),
    });
  }, []);

  return {
    trackUserLogin,
    trackUserRegister,
    trackUserLogout,
    trackProfileUpdate,
  };
};

// 自动页面追踪高阶组件
export const withPageAnalytics = <P extends object>(
  Component: React.ComponentType<P>,
  pageName: string,
  pageTitle?: string
) => {
  return (props: P) => {
    usePageAnalytics(pageName, pageTitle);
    return <Component {...props} />;
  };
};

// 自动按钮追踪高阶组件
export const withButtonAnalytics = <P extends { onPress?: () => void }>(
  Component: React.ComponentType<P>,
  buttonName: string,
  pageName: string
) => {
  return (props: P) => {
    const { handlePress } = useButtonAnalytics(buttonName, pageName);
    return <Component {...props} onPress={handlePress(props.onPress)} />;
  };
};
