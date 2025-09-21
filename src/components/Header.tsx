import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  useTheme,
  useMediaQuery,
  Container,
} from '@mui/material';
import {
  Menu as MenuIcon,
  LocalShipping,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const Header: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { name: '首页', path: '/' },
    { name: '服务介绍', path: '/services' },
    { name: '价格咨询', path: '/pricing' },
    { name: '查询快递', path: '/tracking' },
    { name: '联系我们', path: '/contact' },
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
      <Typography variant="h6" sx={{ my: 2 }}>
        MARKETLINK EXPRESS
      </Typography>
      <List>
        {navItems.map((item) => (
          <ListItem key={item.name} onClick={() => handleNavClick(item.path)}>
            <ListItemText 
              primary={item.name} 
              sx={{ 
                textAlign: 'center',
                color: isActive(item.path) ? 'primary.main' : 'text.primary',
                fontWeight: isActive(item.path) ? 600 : 400,
              }}
            />
          </ListItem>
        ))}
        <ListItem onClick={() => handleNavClick('/admin/login')}>
          <ListItemText 
            primary="管理后台" 
            sx={{ 
              textAlign: 'center',
              color: isActive('/admin/login') ? 'primary.main' : 'text.primary',
              fontWeight: isActive('/admin/login') ? 600 : 400,
            }}
          />
        </ListItem>
      </List>
    </Box>
  );

  return (
    <>
      <AppBar 
        position="static" 
        sx={{ 
          backgroundColor: 'white', 
          color: 'text.primary',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        }}
      >
        <Container maxWidth="lg">
          <Toolbar sx={{ px: { xs: 0 } }}>
            {/* Logo */}
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                cursor: 'pointer',
                mr: 4,
              }}
              onClick={() => handleNavClick('/')}
            >
              <Box
                sx={{
                  position: 'relative',
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 2,
                  boxShadow: '0 4px 20px rgba(25, 118, 210, 0.3)',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 2,
                    left: 2,
                    right: 2,
                    bottom: 2,
                    borderRadius: '50%',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                  }
                }}
              >
                {/* 高级感 ML 字母组合 Logo */}
                <svg width="26" height="26" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg" aria-label="MARKETLINK EXPRESS">
                  <defs>
                    <linearGradient id="mlg" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#fff" stopOpacity="0.95" />
                      <stop offset="100%" stopColor="#e3f2ff" stopOpacity="0.95" />
                    </linearGradient>
                  </defs>
                  <g fill="url(#mlg)">
                    <path d="M3 20 L3 6 L5.8 6 L10.2 14 L14.6 6 L17.4 6 L17.4 20 L14.9 20 L14.9 11.4 L10.9 18.6 L9.5 18.6 L5.5 11.4 L5.5 20 Z"/>
                    <rect x="18.6" y="6" width="2.8" height="14" rx="1.2" />
                  </g>
                </svg>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography 
                  variant="h5" 
                  component="div" 
                  sx={{ 
                    fontWeight: 800, 
                    color: 'primary.main',
                    display: { xs: 'none', sm: 'block' },
                    lineHeight: 1,
                    mb: 0.5,
                  }}
                >
                  MARKETLINK EXPRESS
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'text.secondary',
                    display: { xs: 'none', sm: 'block' },
                    fontWeight: 500,
                    letterSpacing: 1,
                  }}
                >
                  专业快递服务
                </Typography>
              </Box>
            </Box>

            {/* Desktop Navigation */}
            {!isMobile && (
              <Box sx={{ display: 'flex', gap: 2, flexGrow: 1 }}>
                {navItems.map((item) => (
                  <Button
                    key={item.name}
                    onClick={() => handleNavClick(item.path)}
                    sx={{
                      color: isActive(item.path) ? 'primary.main' : 'text.primary',
                      fontWeight: isActive(item.path) ? 600 : 400,
                      '&:hover': {
                        backgroundColor: 'rgba(25, 118, 210, 0.08)',
                      },
                    }}
                  >
                    {item.name}
                  </Button>
                ))}
              </Box>
            )}

            {/* Admin Login Button */}
            {!isMobile && (
              <Button
                variant="outlined"
                onClick={() => handleNavClick('/admin/login')}
                sx={{
                  borderColor: 'primary.main',
                  color: 'primary.main',
                  '&:hover': {
                    borderColor: 'primary.dark',
                    backgroundColor: 'rgba(25, 118, 210, 0.08)',
                  },
                }}
              >
                管理后台
              </Button>
            )}

            {/* Mobile Menu Button */}
            {isMobile && (
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ ml: 'auto' }}
              >
                <MenuIcon />
              </IconButton>
            )}
          </Toolbar>
        </Container>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: 240,
          },
        }}
      >
        {drawer}
      </Drawer>
    </>
  );
};

export default Header;
