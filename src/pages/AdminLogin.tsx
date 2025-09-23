import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Lock,
  Person,
  AdminPanelSettings,
  Security,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import PremiumBackground from '../components/PremiumBackground';

const AdminLogin: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // 默认主账号（请妥善保管）
  const defaultMaster = { username: 'master', password: 'marketlink#2025', role: 'master' } as const;

  // 初始化用户存储：首次进入时注入主账号
  useEffect(() => {
    try {
      const raw = localStorage.getItem('users');
      const users: Array<{ username: string; password: string; role: string }>|null = raw ? JSON.parse(raw) : null;
      if (!users || users.length === 0) {
        localStorage.setItem('users', JSON.stringify([defaultMaster]));
      } else {
        const hasMaster = users.some(u => u.username === defaultMaster.username);
        if (!hasMaster) {
          localStorage.setItem('users', JSON.stringify([defaultMaster, ...users]));
        }
      }
    } catch (e) {
      console.error('初始化用户数据失败:', e);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('请输入用户名和密码');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 验证用户凭据
      const storedUsers = localStorage.getItem('users');
      const users = storedUsers ? JSON.parse(storedUsers) : [defaultMaster];
      
      const user = users.find((u: any) => u.username === username && u.password === password);
      
      if (user) {
        // 登录成功
        const userSession = {
          username: user.username,
          role: user.role,
          loginTime: new Date().toISOString(),
        };
        localStorage.setItem('adminUser', JSON.stringify(userSession));
        navigate('/admin/dashboard');
      } else {
        setError('用户名或密码错误');
      }
    } catch (err) {
      setError('登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PremiumBackground variant="admin">
      <Container maxWidth="sm" sx={{ py: 8, position: 'relative', zIndex: 1 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          {/* Logo */}
          <Box
            sx={{
              width: 80,
              height: 80,
              background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
              boxShadow: '0 12px 40px rgba(44, 62, 80, 0.4)',
              position: 'relative',
              '&::after': {
                content: '""',
                position: 'absolute',
                top: '50%',
                right: 12,
                width: 16,
                height: 10,
                background: 'white',
                clipPath: 'polygon(0 0, 100% 50%, 0 100%)',
                transform: 'translateY(-50%)',
              }
            }}
          >
            <Typography
              sx={{
                fontSize: '32px',
                fontWeight: 900,
                color: 'white',
                letterSpacing: '-2px',
                fontFamily: '"Arial Black", sans-serif',
              }}
            >
              ML
            </Typography>
          </Box>
          
          <Typography variant="h4" component="h1" sx={{ 
            fontWeight: 700, 
            mb: 1,
            background: 'linear-gradient(135deg, #ffffff 0%, #e3f2fd 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 2px 10px rgba(255,255,255,0.1)',
          }}>
            MARKET LINK EXPRESS
          </Typography>
          <Typography variant="h6" sx={{ 
            opacity: 0.8, 
            fontWeight: 300,
            letterSpacing: '1px',
          }}>
            管理后台
          </Typography>
        </Box>

        <Paper 
          elevation={0}
          sx={{ 
            p: 5,
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '24px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <AdminPanelSettings sx={{ 
              fontSize: 48, 
              color: 'rgba(255, 255, 255, 0.9)',
              mb: 2,
              filter: 'drop-shadow(0 4px 20px rgba(255,255,255,0.3))',
            }} />
            <Typography variant="h5" sx={{ 
              fontWeight: 600, 
              color: 'white',
              mb: 1,
            }}>
              安全登录
            </Typography>
            <Typography variant="body2" sx={{ 
              color: 'rgba(255, 255, 255, 0.7)',
            }}>
              请输入您的管理员凭据
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleLogin} sx={{ mt: 3 }}>
            <TextField
              fullWidth
              label="用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              margin="normal"
              required
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '12px',
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.8)',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                },
                '& .MuiInputBase-input': {
                  color: 'white',
                },
              }}
            />

            <TextField
              fullWidth
              label="密码"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '12px',
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.8)',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: 'rgba(255, 255, 255, 0.7)',
                },
                '& .MuiInputBase-input': {
                  color: 'white',
                },
              }}
            />

            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  mt: 3,
                  background: 'rgba(244, 67, 54, 0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(244, 67, 54, 0.3)',
                  color: '#ffcdd2',
                  borderRadius: '12px',
                }}
              >
                {error}
              </Alert>
            )}

            <Button
              fullWidth
              variant="contained"
              type="submit"
              disabled={loading}
              sx={{
                mt: 4,
                py: 2,
                fontSize: '1.1rem',
                fontWeight: 600,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                boxShadow: '0 8px 32px rgba(25, 118, 210, 0.4)',
                textTransform: 'none',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 12px 40px rgba(25, 118, 210, 0.5)',
                },
                '&:disabled': {
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: 'rgba(255, 255, 255, 0.5)',
                },
              }}
            >
              {loading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CircularProgress size={20} sx={{ color: 'white' }} />
                  登录中...
                </Box>
              ) : (
                '登录管理后台'
              )}
            </Button>
          </Box>

          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ 
              color: 'rgba(255, 255, 255, 0.6)',
              mb: 2,
            }}>
              <Security sx={{ fontSize: 16, mr: 1, verticalAlign: 'text-bottom' }} />
              安全提示：请保护好您的登录凭据
            </Typography>
            
            <Paper sx={{
              p: 2,
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
            }}>
              <Typography variant="caption" sx={{ 
                color: 'rgba(255, 255, 255, 0.8)',
                display: 'block',
                mb: 1,
              }}>
                测试账号
              </Typography>
              <Typography variant="body2" sx={{ 
                color: 'rgba(255, 255, 255, 0.9)',
                fontFamily: 'monospace',
              }}>
                用户名: master<br />
                密码: marketlink#2025
              </Typography>
            </Paper>
          </Box>
        </Paper>
      </Container>
    </PremiumBackground>
  );
};

export default AdminLogin;