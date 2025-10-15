import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ErrorHandlerProps {
  error?: Error | null;
  onRetry?: () => void;
  onDismiss?: () => void;
}

const ErrorHandler: React.FC<ErrorHandlerProps> = ({ 
  error, 
  onRetry, 
  onDismiss 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const slideAnim = useState(new Animated.Value(-100))[0];

  useEffect(() => {
    if (error) {
      setIsVisible(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setIsVisible(false);
      });
    }
  }, [error, slideAnim]);

  const handleDismiss = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsVisible(false);
      onDismiss?.();
    });
  };

  const handleRetry = () => {
    handleDismiss();
    onRetry?.();
  };

  if (!isVisible || !error) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={['#ef4444', '#dc2626']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <Text style={styles.icon}>⚠️</Text>
          <View style={styles.textContainer}>
            <Text style={styles.title}>出现错误</Text>
            <Text style={styles.message} numberOfLines={2}>
              {error.message || '未知错误'}
            </Text>
          </View>
          <View style={styles.buttons}>
            {onRetry && (
              <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                <Text style={styles.retryText}>重试</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.dismissButton} onPress={handleDismiss}>
              <Text style={styles.dismissText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

// 错误边界组件
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <View style={styles.errorBoundaryContainer}>
          <Text style={styles.errorBoundaryIcon}>💥</Text>
          <Text style={styles.errorBoundaryTitle}>应用出现错误</Text>
          <Text style={styles.errorBoundaryMessage}>
            很抱歉，应用遇到了一个错误。请重启应用或联系技术支持。
          </Text>
          <TouchableOpacity
            style={styles.errorBoundaryButton}
            onPress={() => this.setState({ hasError: false, error: undefined })}
          >
            <LinearGradient
              colors={['#2E86AB', '#4CA1CF']}
              style={styles.errorBoundaryButtonGradient}
            >
              <Text style={styles.errorBoundaryButtonText}>重试</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

// 错误处理钩子
export const useErrorHandler = () => {
  const [error, setError] = useState<Error | null>(null);

  const handleError = (error: Error) => {
    console.error('Error caught:', error);
    setError(error);
  };

  const clearError = () => {
    setError(null);
  };

  const retry = () => {
    clearError();
    // 可以在这里添加重试逻辑
  };

  return {
    error,
    handleError,
    clearError,
    retry,
  };
};

// 全局错误处理器
export const GlobalErrorHandler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { error, clearError, retry } = useErrorHandler();

  useEffect(() => {
    const originalConsoleError = console.error;
    console.error = (...args) => {
      originalConsoleError(...args);
      
      // 检查是否是React错误
      if (args[0]?.includes?.('Error:') || args[0]?.includes?.('TypeError:')) {
        const errorMessage = args.join(' ');
        const error = new Error(errorMessage);
        // 这里可以发送错误到错误报告服务
        console.log('Global error caught:', error);
      }
    };

    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  return (
    <>
      {children}
      <ErrorHandler
        error={error}
        onRetry={retry}
        onDismiss={clearError}
      />
    </>
  );
};

// 错误类型枚举
export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  PERMISSION = 'PERMISSION',
  UNKNOWN = 'UNKNOWN',
}

// 错误消息映射
export const ErrorMessages = {
  [ErrorType.NETWORK]: '网络连接失败，请检查网络设置',
  [ErrorType.VALIDATION]: '输入信息有误，请检查后重试',
  [ErrorType.PERMISSION]: '权限被拒绝，请在设置中开启相关权限',
  [ErrorType.UNKNOWN]: '未知错误，请稍后重试',
};

// 错误处理工具函数
export const handleApiError = (error: any): string => {
  if (error?.response?.status === 401) {
    return '登录已过期，请重新登录';
  }
  if (error?.response?.status === 403) {
    return '没有权限执行此操作';
  }
  if (error?.response?.status === 404) {
    return '请求的资源不存在';
  }
  if (error?.response?.status >= 500) {
    return '服务器错误，请稍后重试';
  }
  if (error?.code === 'NETWORK_ERROR') {
    return '网络连接失败，请检查网络设置';
  }
  return error?.message || '操作失败，请稍后重试';
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  gradient: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingTop: 50,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 16,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  message: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
  },
  buttons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginRight: 8,
  },
  retryText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  dismissButton: {
    padding: 4,
  },
  dismissText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorBoundaryContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#f8fafc',
  },
  errorBoundaryIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  errorBoundaryTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorBoundaryMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  errorBoundaryButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  errorBoundaryButtonGradient: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  errorBoundaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default ErrorHandler;
