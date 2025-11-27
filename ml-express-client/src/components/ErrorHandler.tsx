import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { errorService, AppError } from '../services/ErrorService';

interface ErrorHandlerProps {
  error?: any;
  onRetry?: () => void;
  onDismiss?: () => void;
}

const ErrorHandler: React.FC<ErrorHandlerProps> = ({ 
  error, 
  onRetry, 
  onDismiss 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [appError, setAppError] = useState<AppError | null>(null);
  const slideAnim = useState(new Animated.Value(-100))[0];

  useEffect(() => {
    if (error) {
      const parsed = errorService.parseError(error);
      setAppError(parsed);
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
        setAppError(null);
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
      setAppError(null);
      onDismiss?.();
    });
  };

  const handleRetry = () => {
    handleDismiss();
    onRetry?.();
  };

  if (!isVisible || !appError) return null;

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
            <Text style={styles.title}>提示</Text>
            <Text style={styles.message} numberOfLines={2}>
              {appError.message}
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
    // 使用 ErrorService 记录错误
    errorService.handleError(error, { context: 'ErrorBoundary', silent: true });
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // 这里简化处理，实际应用中可以获取更详细的错误信息
      const appError = errorService.parseError(this.state.error);
      
      return this.props.fallback || (
        <View style={styles.errorBoundaryContainer}>
          <Text style={styles.errorBoundaryIcon}>💥</Text>
          <Text style={styles.errorBoundaryTitle}>应用出现错误</Text>
          <Text style={styles.errorBoundaryMessage}>
            {appError.message}
          </Text>
          {this.state.error && __DEV__ && (
            <Text style={styles.errorBoundaryDebug}>
              {this.state.error.toString()}
            </Text>
          )}
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

  const handleError = (error: any, options?: { context?: string; silent?: boolean }) => {
    const appError = errorService.handleError(error, { 
        context: options?.context, 
        silent: true // 我们自己显示错误 UI，所以让 Service 保持沉默
    });
    // 这里我们将 appError 转回 Error 对象或者直接使用它
    // 为了兼容现有代码，我们设置 error state
    setError(new Error(appError.message));
  };

  const clearError = () => {
    setError(null);
  };

  const retry = () => {
    clearError();
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
  const { error, clearError, retry, handleError } = useErrorHandler();

  useEffect(() => {
    const originalConsoleError = console.error;
    console.error = (...args) => {
      originalConsoleError(...args);
      
      // 检查是否是React错误
      if (args[0]?.includes?.('Error:') || args[0]?.includes?.('TypeError:')) {
        const errorMessage = args.join(' ');
        const error = new Error(errorMessage);
        // 捕获全局错误
        handleError(error, { context: 'GlobalErrorHandler' });
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
  errorBoundaryDebug: {
    fontSize: 11,
    color: '#ef4444',
    marginTop: 12,
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#fee2e2',
    borderRadius: 4,
    fontFamily: 'monospace',
    maxWidth: '90%',
  },
});

export default ErrorHandler;
