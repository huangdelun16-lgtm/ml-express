import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { verifyToken, isAuthenticated as checkAuth } from '../services/authService';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: ('admin' | 'manager' | 'operator' | 'finance')[];
}

/**
 * 受保护的路由组件
 * 用于保护后台管理页面，确保只有已登录且具有相应权限的用户才能访问
 * 使用服务端验证确保安全性
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRoles = ['admin', 'manager', 'operator', 'finance'] 
}) => {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // 调用服务端验证 Token（Token 通过 httpOnly Cookie 自动发送）
        const result = await verifyToken(requiredRoles);
        
        if (result.valid) {
          setIsAuthenticated(true);
          setError('');
        } else {
          setIsAuthenticated(false);
          setError(result.error || '权限验证失败，请重新登录');
        }
      } catch (error) {
        console.error('权限检查失败:', error);
        setIsAuthenticated(false);
        setError('验证过程出错，请重新登录');
      } finally {
        setIsChecking(false);
      }
    };

    checkAuthStatus();
  }, [requiredRoles]);

  // 正在检查权限时显示加载状态
  if (isChecking) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(to right top, #b0d3e8, #a2c3d6, #93b4c5, #86a4b4, #7895a3, #6c90a3, #618ca3, #5587a4, #498ab6, #428cc9, #468dda, #558cea)',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔒</div>
          <div style={{ fontSize: '1.2rem' }}>正在验证权限...</div>
        </div>
      </div>
    );
  }

  // 如果未认证，重定向到登录页
  if (!isAuthenticated) {
    return (
      <>
        {error && (
          <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: '#ff4d4f',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            zIndex: 9999,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}>
            {error}
          </div>
        )}
        <Navigate to="/admin/login" state={{ from: location }} replace />
      </>
    );
  }

  // 如果已认证且具有权限，渲染子组件
  return <>{children}</>;
};

export default ProtectedRoute;

