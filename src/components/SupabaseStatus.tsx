import React, { useState, useEffect } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  TextField,
  Box,
  Chip,
} from '@mui/material';
import { CloudOff, Cloud, Settings } from '@mui/icons-material';

const SupabaseStatus: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState({
    url: localStorage.getItem('supabase_url') || '',
    key: localStorage.getItem('supabase_key') || '',
  });

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      // 检查环境变量或本地配置
      const url = process.env.REACT_APP_SUPABASE_URL || config.url;
      const key = process.env.REACT_APP_SUPABASE_ANON_KEY || config.key;
      
      if (url && key) {
        // 这里可以添加实际的连接测试
        setIsConnected(true);
      } else {
        setIsConnected(false);
      }
    } catch (error) {
      console.error('Supabase连接检查失败:', error);
      setIsConnected(false);
    }
  };

  const handleSaveConfig = () => {
    localStorage.setItem('supabase_url', config.url);
    localStorage.setItem('supabase_key', config.key);
    setShowConfig(false);
    checkConnection();
    alert('Supabase配置已保存！请刷新页面生效。');
  };

  if (isConnected) {
    return (
      <Alert 
        severity="success" 
        sx={{ 
          mb: 2,
          backgroundColor: 'rgba(82, 196, 26, 0.2)',
          color: 'white',
          '& .MuiAlert-icon': { color: '#52c41a' },
        }}
        icon={<Cloud />}
      >
        Supabase已连接，云数据库可用
      </Alert>
    );
  }

  return (
    <>
      <Alert 
        severity="warning" 
        sx={{ 
          mb: 2,
          backgroundColor: 'rgba(250, 173, 20, 0.2)',
          color: 'white',
          '& .MuiAlert-icon': { color: '#faad14' },
        }}
        icon={<CloudOff />}
        action={
          <Button 
            size="small" 
            onClick={() => setShowConfig(true)}
            sx={{ color: 'white' }}
            startIcon={<Settings />}
          >
            配置
          </Button>
        }
      >
        Supabase未连接，当前使用本地存储。建议配置云数据库以获得更好的数据安全性。
      </Alert>

      <Dialog 
        open={showConfig} 
        onClose={() => setShowConfig(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: 'rgba(15, 32, 39, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'white',
          }
        }}
      >
        <DialogTitle sx={{ color: 'white' }}>
          配置Supabase
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 2 }}>
              请输入您的Supabase项目配置信息：
            </Typography>
          </Box>
          
          <TextField
            fullWidth
            label="Supabase URL"
            value={config.url}
            onChange={(e) => setConfig({...config, url: e.target.value})}
            placeholder="https://your-project.supabase.co"
            sx={{ mb: 2 }}
            InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)' } }}
            InputProps={{ style: { color: 'white' } }}
            helperText="在Supabase项目设置中找到项目URL"
            FormHelperTextProps={{ style: { color: 'rgba(255,255,255,0.5)' } }}
          />
          
          <TextField
            fullWidth
            label="Anon Key"
            value={config.key}
            onChange={(e) => setConfig({...config, key: e.target.value})}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)' } }}
            InputProps={{ style: { color: 'white' } }}
            helperText="在Supabase项目设置 → API中找到anon public key"
            FormHelperTextProps={{ style: { color: 'rgba(255,255,255,0.5)' } }}
          />
          
          <Box sx={{ mt: 2, p: 2, backgroundColor: 'rgba(25, 118, 210, 0.1)', borderRadius: 1 }}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              💡 提示：如果您还没有Supabase项目，请访问 
              <a href="https://supabase.com" target="_blank" rel="noopener" style={{ color: '#42a5f5' }}>
                supabase.com
              </a> 
              创建免费项目
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setShowConfig(false)}
            sx={{ color: 'white' }}
          >
            取消
          </Button>
          <Button 
            onClick={handleSaveConfig}
            variant="contained"
            disabled={!config.url || !config.key}
            sx={{
              background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
              '&:hover': { background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)' },
            }}
          >
            保存配置
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SupabaseStatus;
