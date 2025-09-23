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
    { name: '直接下单', path: '/order' },
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
        MARKET LINK
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
                  width: 50,
                  height: 50,
                  background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 2,
                  borderRadius: '8px',
                  boxShadow: '0 8px 32px rgba(44, 62, 80, 0.3)',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    top: '50%',
                    right: 8,
                    width: 12,
                    height: 8,
                    background: 'white',
                    clipPath: 'polygon(0 0, 100% 50%, 0 100%)',
                    transform: 'translateY(-50%)',
                  }
                }}
              >
                {/* ML Logo with truck icon */}
                <Typography
                  sx={{
                    fontSize: '24px',
                    fontWeight: 900,
                    color: 'white',
                    letterSpacing: '-2px',
                    fontFamily: '"Arial Black", sans-serif',
                  }}
                >
                  ML
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography 
                  variant="h6" 
                  component="div" 
                  sx={{ 
                    fontWeight: 700, 
                    color: '#2c3e50',
                    display: { xs: 'none', sm: 'block' },
                    lineHeight: 1,
                    mb: 0.2,
                    letterSpacing: '1px',
                  }}
                >
                  MARKET LINK
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'text.secondary',
                    display: { xs: 'none', sm: 'block' },
                    fontWeight: 500,
                    letterSpacing: '0.5px',
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
