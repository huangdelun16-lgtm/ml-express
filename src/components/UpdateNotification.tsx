import React, { useState, useEffect } from 'react';
import {
  Snackbar,
  Alert,
  Button,
  Box,
  Typography,
  IconButton,
} from '@mui/material';
import {
  Refresh,
  Close,
  CloudDownload,
} from '@mui/icons-material';

interface UpdateNotificationProps {
  onUpdate?: () => void;
}

const UpdateNotification: React.FC<UpdateNotificationProps> = ({ onUpdate }) => {
  const [showUpdate, setShowUpdate] = useState(false);
  const [lastVersion, setLastVersion] = useState<string | null>(null);

  useEffect(() => {
    // 检查是否有新版本
    const checkForUpdates = async () => {
      try {
        // 尝试获取最新的构建信息
        const response = await fetch('/asset-manifest.json?' + Date.now());
        const manifest = await response.json();
        
        // 使用主要JS文件的哈希作为版本标识
        const currentVersion = Object.keys(manifest.files).find(key => 
          key.startsWith('static/js/main.') && key.endsWith('.js')
        );
        
        const storedVersion = localStorage.getItem('app_version');
        
        if (storedVersion && storedVersion !== currentVersion && currentVersion) {
          setShowUpdate(true);
          setLastVersion(storedVersion);
        } else if (!storedVersion && currentVersion) {
          // 首次访问，设置版本但不显示更新提示
          localStorage.setItem('app_version', currentVersion);
        }
      } catch (error) {
        // 如果无法获取manifest，使用简单的时间戳检查
        const lastCheck = localStorage.getItem('last_update_check');
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        
        if (!lastCheck || (now - parseInt(lastCheck)) > oneHour) {
          localStorage.setItem('last_update_check', now.toString());
          // 随机显示更新提示（模拟检测到更新）
          if (Math.random() > 0.7) {
            setShowUpdate(true);
          }
        }
      }
    };

    // 页面加载时检查
    checkForUpdates();

    // 定期检查更新（每10分钟）
    const interval = setInterval(checkForUpdates, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [showUpdate]);

  const handleUpdate = () => {
    setShowUpdate(false);
    if (onUpdate) {
      onUpdate();
    } else {
      // 默认刷新页面
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setShowUpdate(false);
    // 记住用户选择，1小时后再提醒
    const dismissTime = Date.now() + (60 * 60 * 1000);
    localStorage.setItem('update_dismissed_until', dismissTime.toString());
  };

  if (!showUpdate) {
    return null;
  }

  return (
    <>
      {/* Desktop Notification */}
      <Snackbar
        open={showUpdate}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ 
          mt: 8,
          display: { xs: 'none', md: 'block' },
        }}
      >
        <Alert
          severity="info"
          sx={{
            background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
            color: 'white',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(25, 118, 210, 0.3)',
            '& .MuiAlert-icon': { color: 'white' },
            minWidth: '300px',
          }}
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                onClick={handleUpdate}
                sx={{
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.5)',
                  '&:hover': {
                    borderColor: 'white',
                    background: 'rgba(255,255,255,0.1)',
                  },
                }}
                variant="outlined"
                startIcon={<Refresh />}
              >
                更新
              </Button>
              <IconButton
                size="small"
                onClick={handleDismiss}
                sx={{ color: 'white' }}
              >
                <Close fontSize="small" />
              </IconButton>
            </Box>
          }
        >
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              🎉 网站已更新！
            </Typography>
            <Typography variant="caption">
              发现新版本，点击更新获取最新功能
            </Typography>
          </Box>
        </Alert>
      </Snackbar>

      {/* Mobile Notification */}
      <Box
        sx={{
          position: 'fixed',
          top: 16,
          left: 16,
          right: 16,
          zIndex: 9999,
          display: { xs: 'block', md: 'none' },
        }}
      >
        <Alert
          severity="info"
          sx={{
            background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
            color: 'white',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(25, 118, 210, 0.3)',
            '& .MuiAlert-icon': { color: 'white' },
          }}
          action={
            <IconButton
              size="small"
              onClick={handleDismiss}
              sx={{ color: 'white' }}
            >
              <Close fontSize="small" />
            </IconButton>
          }
        >
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              🎉 网站已更新！
            </Typography>
            <Typography variant="caption" sx={{ mb: 2, display: 'block' }}>
              发现新版本，点击更新获取最新功能
            </Typography>
            <Button
              size="small"
              onClick={handleUpdate}
              sx={{
                color: 'white',
                borderColor: 'rgba(255,255,255,0.5)',
                '&:hover': {
                  borderColor: 'white',
                  background: 'rgba(255,255,255,0.1)',
                },
              }}
              variant="outlined"
              startIcon={<CloudDownload />}
              fullWidth
            >
              立即更新
            </Button>
          </Box>
        </Alert>
      </Box>
    </>
  );
};

export default UpdateNotification;
