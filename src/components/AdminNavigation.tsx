import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Box,
  Button,
  ButtonGroup,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import { Person, Settings, Logout } from '@mui/icons-material';
import { getAdminSession, clearAdminSession, hasPermission, getRoleDisplayName } from '../utils/auth';
import { preloadPage } from '../utils/preloadPages';

interface AdminNavigationProps {
  title?: string;
  extraContent?: React.ReactNode;
}

const AdminNavigation: React.FC<AdminNavigationProps> = ({ title, extraContent }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  
  const session = getAdminSession();
  if (!session) return null;

  // 检测是否为移动设备
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;

  const handleLogout = () => {
    clearAdminSession();
    navigate('/admin/login');
  };

  // 导航菜单项配置
  const menuItems = [
    {
      group: '跨境业务',
      items: [
        { label: '跨境包裹', path: '/admin/inventory' },
        { label: '跨境运输', path: '/admin/transport' },
      ]
    },
    {
      group: '同城业务', 
      items: [
        { label: '同城运输', path: '/admin/city/transport' },
      ]
    },
    {
      group: '管理功能',
      items: [
        { label: '财务管理', path: '/admin/finance' },
        { label: '控制台', path: '/admin/dashboard' },
        ...(isMobile ? [
          { label: '扫码工具', path: '/admin/scan' },
          { label: '移动端', path: '/admin/mobile' },
        ] : [])
      ]
    }
  ];

  return (
    <>
      <AppBar position="static" sx={{ backgroundColor: 'white', color: 'text.primary' }}>
        <Toolbar>
          {title && (
            <Typography variant="h6" sx={{ mr: 2 }}>
              {title}
            </Typography>
          )}
          <Box sx={{ flexGrow: 1 }} />
          
          <Box sx={{ display: 'flex', gap: 2, mr: 2, flexWrap: 'wrap' }}>
            {menuItems.map((group) => {
              // 过滤出用户有权限的菜单项
              const allowedItems = group.items.filter(item => hasPermission(session.role, item.path));
              
              if (allowedItems.length === 0) return null;
              
              return (
                <ButtonGroup key={group.group} size="small" variant="outlined">
                  {allowedItems.map((item) => (
                    <Button
                      key={item.path}
                      variant={location.pathname === item.path ? 'contained' : 'outlined'}
                      onClick={() => navigate(item.path)}
                      onMouseEnter={() => preloadPage(item.path)}
                    >
                      {item.label}
                    </Button>
                  ))}
                </ButtonGroup>
              );
            })}
          </Box>
          
          {extraContent && (
            <Box sx={{ display: 'flex', alignItems: 'center', mx: 2 }}>
              {extraContent}
            </Box>
          )}
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              欢迎，{session.username} ({getRoleDisplayName(session.role)})
            </Typography>
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                <Person />
              </Avatar>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={() => setAnchorEl(null)}>
          <Person sx={{ mr: 1 }} />个人信息
        </MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)}>
          <Settings sx={{ mr: 1 }} />设置
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <Logout sx={{ mr: 1 }} />退出登录
        </MenuItem>
      </Menu>
    </>
  );
};

export default AdminNavigation;
