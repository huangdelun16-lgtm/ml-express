import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { verifyToken } from '../services/authService';
import { logger } from '../utils/logger';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: ('admin' | 'manager' | 'operator' | 'finance')[];
  /** 满足任一即可（在服务端校验，与 requiredRoles 逻辑一致） */
  permissionId?: string | string[];
}

/**
 * 受保护的路由组件
 * 用于保护后台管理页面，确保只有已登录且具有相应权限的用户才能访问
 * 使用服务端验证确保安全性
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRoles = ['admin', 'manager', 'operator', 'finance'],
  permissionId
}) => {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string>('');

  const rolesDep = [...requiredRoles].sort().join(',');
  const permissionDep =
    permissionId == null
      ? ''
      : typeof permissionId === 'string'
        ? permissionId
        : [...permissionId].sort().join(',');

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const result = await verifyToken(requiredRoles, permissionId);
        
        if (result.valid) {
          setIsAuthenticated(true);
          setError('');
        } else {
          setIsAuthenticated(false);
          setError(result.error || '权限验证失败，请重新登录');
        }
      } catch (error) {
        logger.error('权限检查失败:', error);
        setIsAuthenticated(false);
        setError('验证过程出错，请重新登录');
      } finally {
        setIsChecking(false);
      }
    };

    checkAuthStatus();
    // rolesDep / permissionDep 避免每次渲染新数组触发重复校验（控制台连打 401）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolesDep, permissionDep]);

  // 正在检查权限时显示加载状态
  if (isChecking) {
    return (
      <div className="admin-auth-splash">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>🔒</div>
          <div style={{ fontSize: '1rem', color: '#64748b' }}>正在验证权限...</div>
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

