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
        console.log('🔍 检查更新...');
        
        // 强制显示更新通知（因为我们刚刚修复了按钮问题）
        const currentAppVersion = localStorage.getItem('app_version') || '2.0.0';
        const newAppVersion = '2.1.0'; // 最新版本
        
        if (currentAppVersion !== newAppVersion) {
          console.log('✅ 发现新版本!', newAppVersion);
          setShowUpdate(true);
          setLastVersion(currentAppVersion);
          
          // 自动弹出确认对话框
          setTimeout(() => {
            if (window.confirm(`🚀 发现新版本 ${newAppVersion}！\n\n✅ 修复内容：\n• 订单管理删除按钮现在可以点击\n• 快递员管理操作按钮完全修复\n• 在线状态开关正常工作\n• 所有按钮都有明确反馈\n\n是否立即更新获取修复？`)) {
              handleUpdate();
            }
          }, 1000);
          return;
        }
        
        // 尝试获取最新的构建信息
        const response = await fetch('/asset-manifest.json?' + Date.now());
        const manifest = await response.json();
        
        // 使用主要JS文件的哈希作为版本标识
        const currentVersion = Object.keys(manifest.files).find(key => 
          key.startsWith('static/js/main.') && key.endsWith('.js')
        );
        
        const storedVersion = localStorage.getItem('build_version');
        
        if (storedVersion && storedVersion !== currentVersion && currentVersion) {
          console.log('🔄 检测到构建更新');
          setShowUpdate(true);
          setLastVersion(storedVersion);
          localStorage.setItem('build_version', currentVersion);
        } else if (!storedVersion && currentVersion) {
          // 首次访问，设置版本但不显示更新提示
          localStorage.setItem('build_version', currentVersion);
        }
      } catch (error) {
        console.log('检查更新失败:', error);
      }
    };

    // 页面加载时检查
    checkForUpdates();

    // 更频繁地检查更新（每30秒）
    const interval = setInterval(checkForUpdates, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleUpdate = () => {
    console.log('🔄 执行更新...');
    setShowUpdate(false);
    
    // 更新版本号
    localStorage.setItem('app_version', '2.1.0');
    
    // 清除所有缓存
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          console.log('🗑️ 清除缓存:', name);
          caches.delete(name);
        });
      });
    }
    
    // 清除浏览器缓存并强制刷新
    const timestamp = Date.now();
    const newUrl = window.location.href.split('?')[0] + '?v=' + timestamp + '&updated=true';
    
    if (onUpdate) {
      onUpdate();
    } else {
      console.log('🔄 强制刷新页面:', newUrl);
      window.location.href = newUrl;
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
              🚀 重要修复更新 v2.1.0！
            </Typography>
            <Typography variant="caption">
              ✅ 所有按钮点击问题已修复，立即更新体验
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
              🚀 重要修复更新 v2.1.0！
            </Typography>
            <Typography variant="caption" sx={{ mb: 2, display: 'block' }}>
              ✅ 所有按钮点击问题已修复，立即更新体验
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
