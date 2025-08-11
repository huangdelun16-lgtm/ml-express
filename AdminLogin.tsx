import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  InputAdornment,
  IconButton,
  useTheme,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Lock,
  Person,
  LocalShipping,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const AdminLogin: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const theme = useTheme();
  const navigate = useNavigate();

  // 模拟员工账号数据
  const mockUsers = [
    { username: 'admin', password: 'admin123', role: '管理员' },
    { username: 'staff1', password: 'staff123', role: '员工' },
    { username: 'manager', password: 'manager123', role: '经理' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码');
      return;
    }

    setLoading(true);
    setError('');

    // 模拟API调用延迟
    setTimeout(() => {
      const user = mockUsers.find(
        u => u.username === username && u.password === password
      );

      if (user) {
        // 模拟登录成功，存储用户信息
        localStorage.setItem('adminUser', JSON.stringify({
          username: user.username,
          role: user.role,
          loginTime: new Date().toISOString(),
        }));
        
        // 跳转到管理后台
        navigate('/admin/dashboard');
      } else {
        setError('用户名或密码错误');
      }
      setLoading(false);
    }, 1000);
  };

  const handleDemoLogin = (demoUser: typeof mockUsers[0]) => {
    setUsername(demoUser.username);
    setPassword(demoUser.password);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={24}
          sx={{
            p: 4,
            borderRadius: 3,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {/* 头部 */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <LocalShipping sx={{ fontSize: 48, color: 'primary.main', mr: 2 }} />
            </Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
              ML Express
            </Typography>
            <Typography variant="h6" component="h2" color="text.secondary">
              员工登录系统
            </Typography>
          </Box>

          {/* 登录表单 */}
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              variant="outlined"
              margin="normal"
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 3 }}
            />

            <TextField
              fullWidth
              label="密码"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              variant="outlined"
              margin="normal"
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 3 }}
            />

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 600,
                borderRadius: 2,
                background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #1565c0, #1976d2)',
                },
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                '登录'
              )}
            </Button>
          </form>

          {/* 演示账号 */}
          <Box sx={{ mt: 4 }}>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2 }}>
              演示账号（点击使用）：
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              {mockUsers.map((user) => (
                <Button
                  key={user.username}
                  variant="outlined"
                  size="small"
                  onClick={() => handleDemoLogin(user)}
                  sx={{
                    fontSize: '0.8rem',
                    fontFamily: 'monospace',
                  }}
                >
                  {user.username} ({user.role})
                </Button>
              ))}
            </Box>
          </Box>

          {/* 安全提示 */}
          <Card sx={{ mt: 4, backgroundColor: 'info.50', border: '1px solid', borderColor: 'info.200' }}>
            <CardContent sx={{ py: 2 }}>
              <Typography variant="body2" color="info.main" align="center">
                🔒 安全提示：请使用公司提供的安全网络登录，不要在公共场所保存登录信息
              </Typography>
            </CardContent>
          </Card>
        </Paper>
      </Container>
    </Box>
  );
};

export default AdminLogin;
