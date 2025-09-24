import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Card,
  CardContent,
  Stack,
  Divider,
} from '@mui/material';
import {
  Error as ErrorIcon,
  Refresh,
  Home,
  BugReport,
} from '@mui/icons-material';
import PremiumBackground from '../components/PremiumBackground';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    errorId: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    // 生成错误ID用于追踪
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorInfo: null,
      errorId,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });
    
    // 调用错误回调
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // 发送错误报告到监控服务
    this.reportError(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    try {
      const errorReport = {
        errorId: this.state.errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: localStorage.getItem('adminUser') ? 
          JSON.parse(localStorage.getItem('adminUser') || '{}').username : 'anonymous',
      };
      
      // 保存错误日志到localStorage
      const errorLogs = JSON.parse(localStorage.getItem('error_logs') || '[]');
      errorLogs.push(errorReport);
      
      // 只保留最近50条错误日志
      if (errorLogs.length > 50) {
        errorLogs.splice(0, errorLogs.length - 50);
      }
      
      localStorage.setItem('error_logs', JSON.stringify(errorLogs));
      
      // 在开发环境下输出详细错误信息
      if (process.env.NODE_ENV === 'development') {
        console.group('🐛 Error Report');
        console.error('Error ID:', errorReport.errorId);
        console.error('Message:', errorReport.message);
        console.error('Stack:', errorReport.stack);
        console.error('Component Stack:', errorReport.componentStack);
        console.groupEnd();
      }
      
      // TODO: 发送错误报告到远程监控服务
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorReport),
      // });
      
    } catch (reportError) {
      console.error('发送错误报告失败:', reportError);
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReportBug = () => {
    const { error, errorInfo, errorId } = this.state;
    
    const bugReport = {
      errorId,
      message: error?.message || 'Unknown error',
      stack: error?.stack || 'No stack trace',
      componentStack: errorInfo?.componentStack || 'No component stack',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };
    
    // 复制错误信息到剪贴板
    navigator.clipboard.writeText(JSON.stringify(bugReport, null, 2)).then(() => {
      alert('错误信息已复制到剪贴板，请发送给技术支持团队');
    }).catch(() => {
      // 如果剪贴板API不可用，显示错误信息
      const textarea = document.createElement('textarea');
      textarea.value = JSON.stringify(bugReport, null, 2);
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert('错误信息已复制，请发送给技术支持团队');
    });
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  public render() {
    if (this.state.hasError) {
      // 如果提供了自定义fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // 默认错误页面
      return (
        <PremiumBackground variant="admin" minHeight="100vh">
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '100vh',
              p: 3,
            }}
          >
            <Card
              sx={{
                maxWidth: 600,
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '16px',
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                  <ErrorIcon sx={{ fontSize: 64, color: '#f5222d', mb: 2 }} />
                  <Typography variant="h4" sx={{ color: 'white', fontWeight: 600, mb: 1 }}>
                    系统出现错误
                  </Typography>
                  <Typography variant="subtitle1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    抱歉，应用程序遇到了意外错误
                  </Typography>
                </Box>
                
                <Alert 
                  severity="error" 
                  sx={{ 
                    mb: 3,
                    backgroundColor: 'rgba(245, 34, 45, 0.1)',
                    border: '1px solid rgba(245, 34, 45, 0.3)',
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    错误ID: {this.state.errorId}
                  </Typography>
                  <Typography variant="body2">
                    {this.state.error?.message || '未知错误'}
                  </Typography>
                </Alert>
                
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ color: 'white', mb: 1 }}>
                      详细错误信息 (开发模式):
                    </Typography>
                    <Box
                      sx={{
                        p: 2,
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        borderRadius: 1,
                        maxHeight: 200,
                        overflow: 'auto',
                      }}
                    >
                      <Typography
                        variant="caption"
                        component="pre"
                        sx={{
                          color: '#ff6b6b',
                          fontFamily: 'monospace',
                          fontSize: '12px',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {this.state.error.stack}
                      </Typography>
                    </Box>
                  </Box>
                )}
                
                <Divider sx={{ my: 3, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
                
                <Stack spacing={2}>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    您可以尝试以下操作来解决问题：
                  </Typography>
                  
                  <Stack direction="row" spacing={2} justifyContent="center">
                    <Button
                      variant="contained"
                      startIcon={<Refresh />}
                      onClick={this.handleRetry}
                      sx={{
                        background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                        '&:hover': { background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)' },
                      }}
                    >
                      重试
                    </Button>
                    
                    <Button
                      variant="outlined"
                      startIcon={<Refresh />}
                      onClick={this.handleReload}
                      sx={{
                        color: 'white',
                        borderColor: 'rgba(255,255,255,0.3)',
                        '&:hover': {
                          borderColor: 'white',
                          backgroundColor: 'rgba(255,255,255,0.1)',
                        },
                      }}
                    >
                      刷新页面
                    </Button>
                    
                    <Button
                      variant="outlined"
                      startIcon={<Home />}
                      onClick={this.handleGoHome}
                      sx={{
                        color: 'white',
                        borderColor: 'rgba(255,255,255,0.3)',
                        '&:hover': {
                          borderColor: 'white',
                          backgroundColor: 'rgba(255,255,255,0.1)',
                        },
                      }}
                    >
                      返回首页
                    </Button>
                  </Stack>
                  
                  <Button
                    variant="text"
                    startIcon={<BugReport />}
                    onClick={this.handleReportBug}
                    sx={{
                      color: 'rgba(255, 255, 255, 0.6)',
                      '&:hover': {
                        color: 'white',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                      },
                    }}
                  >
                    复制错误信息并报告问题
                  </Button>
                </Stack>
                
                <Box sx={{ mt: 3, textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    如果问题持续存在，请联系技术支持：support@market-link-express.com
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </PremiumBackground>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
