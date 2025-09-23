import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import { getAdminSession, hasPermission } from '../utils/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPath?: string; // 需要的路径权限
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredPath }) => {
  const location = useLocation();
  const session = getAdminSession();
  
  // 如果没有登录，重定向到登录页
  if (!session) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }
  
  // 如果指定了路径权限，检查权限
  const pathToCheck = requiredPath || location.pathname;
  if (!hasPermission(session.role, pathToCheck)) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '60vh',
        textAlign: 'center',
        p: 3 
      }}>
        <Typography variant="h4" color="error" gutterBottom>
          访问被拒绝
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          您的角色（{session.role}）没有权限访问此页面
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => window.history.back()}
        >
          返回上一页
        </Button>
      </Box>
    );
  }
  
  return <>{children}</>;
};

export default ProtectedRoute;


