import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  LinearProgress,
  Alert,
  Switch,
  FormControlLabel,
  Divider,
} from '@mui/material';
import {
  Dashboard,
  Computer,
  Storage,
  NetworkCheck,
  Security,
  Update,
  Settings,
  Warning,
  CheckCircle,
  Error,
  Info,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import PremiumBackground from '../components/PremiumBackground';
import { useLanguage } from '../contexts/LanguageContext';

interface SystemStatus {
  service: string;
  status: 'online' | 'warning' | 'error';
  uptime: string;
  lastCheck: string;
  details: string;
}

interface ServerMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
}

const mockSystemStatus: SystemStatus[] = [
  {
    service: 'Web服务器',
    status: 'online',
    uptime: '99.9%',
    lastCheck: '2024-01-15 15:30:00',
    details: '运行正常',
  },
  {
    service: '数据库',
    status: 'online',
    uptime: '99.8%',
    lastCheck: '2024-01-15 15:30:00',
    details: '连接稳定',
  },
  {
    service: 'API服务',
    status: 'warning',
    uptime: '98.5%',
    lastCheck: '2024-01-15 15:29:00',
    details: '响应较慢',
  },
  {
    service: '短信服务',
    status: 'online',
    uptime: '99.2%',
    lastCheck: '2024-01-15 15:30:00',
    details: '发送正常',
  },
  {
    service: '支付网关',
    status: 'error',
    uptime: '95.1%',
    lastCheck: '2024-01-15 15:25:00',
    details: '连接超时',
  },
];

const AdminControlPanel: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [serverMetrics, setServerMetrics] = useState<ServerMetrics>({
    cpu: 45,
    memory: 68,
    disk: 32,
    network: 78,
  });
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle sx={{ color: '#52c41a' }} />;
      case 'warning':
        return <Warning sx={{ color: '#faad14' }} />;
      case 'error':
        return <Error sx={{ color: '#f5222d' }} />;
      default:
        return <Info sx={{ color: '#1890ff' }} />;
    }
  };

  const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'info' => {
    switch (status) {
      case 'online':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'info';
    }
  };

  const getMetricColor = (value: number): string => {
    if (value < 50) return '#52c41a';
    if (value < 80) return '#faad14';
    return '#f5222d';
  };

  return (
    <PremiumBackground variant="admin" minHeight="100vh">
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 600, color: 'white' }}>
              控制台
            </Typography>
            <Button
              variant="outlined"
              onClick={() => navigate('/admin/dashboard')}
              sx={{
                borderColor: 'rgba(255,255,255,0.3)',
                color: 'white',
                '&:hover': { 
                  borderColor: 'rgba(255,255,255,0.5)',
                  background: 'rgba(255,255,255,0.1)',
                },
              }}
            >
              返回管理中心
            </Button>
          </Box>
          <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            系统监控和管理控制台 - 实时监控系统状态
          </Typography>
        </Box>

        {/* System Metrics */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} lg={3}>
            <Card sx={{ 
              background: 'rgba(255, 255, 255, 0.1)', 
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" sx={{ color: 'white' }}>
                    CPU使用率
                  </Typography>
                  <Computer sx={{ color: getMetricColor(serverMetrics.cpu) }} />
                </Box>
                <Typography variant="h4" sx={{ color: getMetricColor(serverMetrics.cpu), fontWeight: 600, mb: 1 }}>
                  {serverMetrics.cpu}%
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={serverMetrics.cpu}
                  sx={{
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    '& .MuiLinearProgress-bar': { 
                      backgroundColor: getMetricColor(serverMetrics.cpu),
                    },
                  }}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} lg={3}>
            <Card sx={{ 
              background: 'rgba(255, 255, 255, 0.1)', 
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" sx={{ color: 'white' }}>
                    内存使用率
                  </Typography>
                  <Storage sx={{ color: getMetricColor(serverMetrics.memory) }} />
                </Box>
                <Typography variant="h4" sx={{ color: getMetricColor(serverMetrics.memory), fontWeight: 600, mb: 1 }}>
                  {serverMetrics.memory}%
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={serverMetrics.memory}
                  sx={{
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    '& .MuiLinearProgress-bar': { 
                      backgroundColor: getMetricColor(serverMetrics.memory),
                    },
                  }}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} lg={3}>
            <Card sx={{ 
              background: 'rgba(255, 255, 255, 0.1)', 
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" sx={{ color: 'white' }}>
                    磁盘使用率
                  </Typography>
                  <Storage sx={{ color: getMetricColor(serverMetrics.disk) }} />
                </Box>
                <Typography variant="h4" sx={{ color: getMetricColor(serverMetrics.disk), fontWeight: 600, mb: 1 }}>
                  {serverMetrics.disk}%
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={serverMetrics.disk}
                  sx={{
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    '& .MuiLinearProgress-bar': { 
                      backgroundColor: getMetricColor(serverMetrics.disk),
                    },
                  }}
                />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} lg={3}>
            <Card sx={{ 
              background: 'rgba(255, 255, 255, 0.1)', 
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" sx={{ color: 'white' }}>
                    网络流量
                  </Typography>
                  <NetworkCheck sx={{ color: getMetricColor(serverMetrics.network) }} />
                </Box>
                <Typography variant="h4" sx={{ color: getMetricColor(serverMetrics.network), fontWeight: 600, mb: 1 }}>
                  {serverMetrics.network}%
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={serverMetrics.network}
                  sx={{
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    '& .MuiLinearProgress-bar': { 
                      backgroundColor: getMetricColor(serverMetrics.network),
                    },
                  }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* System Status Table */}
        <Card sx={{ 
          background: 'rgba(255, 255, 255, 0.1)', 
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          mb: 4,
        }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, mb: 3 }}>
              系统服务状态
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      服务名称
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      状态
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      运行时间
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      最后检查
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      详情
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mockSystemStatus.map((service, index) => (
                    <TableRow key={index}>
                      <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          {getStatusIcon(service.status)}
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {service.service}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Chip 
                          label={service.status === 'online' ? '在线' : service.status === 'warning' ? '警告' : '错误'}
                          color={getStatusColor(service.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                        {service.uptime}
                      </TableCell>
                      <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                        {service.lastCheck}
                      </TableCell>
                      <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                        {service.details}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* System Controls */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ 
              background: 'rgba(255, 255, 255, 0.1)', 
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, mb: 3 }}>
                  系统控制
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={maintenanceMode}
                        onChange={(e) => setMaintenanceMode(e.target.checked)}
                      />
                    }
                    label={
                      <Typography sx={{ color: 'white' }}>
                        维护模式
                      </Typography>
                    }
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={debugMode}
                        onChange={(e) => setDebugMode(e.target.checked)}
                      />
                    }
                    label={
                      <Typography sx={{ color: 'white' }}>
                        调试模式
                      </Typography>
                    }
                  />
                </Box>

                <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }} />

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<Update />}
                      sx={{
                        borderColor: 'rgba(255,255,255,0.3)',
                        color: 'white',
                        '&:hover': { borderColor: 'rgba(255,255,255,0.5)' },
                      }}
                    >
                      重启服务
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<Security />}
                      sx={{
                        borderColor: 'rgba(255,255,255,0.3)',
                        color: 'white',
                        '&:hover': { borderColor: 'rgba(255,255,255,0.5)' },
                      }}
                    >
                      备份数据
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<Settings />}
                      sx={{
                        borderColor: 'rgba(255,255,255,0.3)',
                        color: 'white',
                        '&:hover': { borderColor: 'rgba(255,255,255,0.5)' },
                      }}
                    >
                      清理缓存
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<Dashboard />}
                      sx={{
                        background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                        '&:hover': { background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)' },
                      }}
                    >
                      系统诊断
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ 
              background: 'rgba(255, 255, 255, 0.1)', 
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, mb: 3 }}>
                  系统信息
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                      系统版本:
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
                      v2.0.0
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                      运行时间:
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
                      15天 8小时 32分钟
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                      总订单数:
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
                      12,456
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                      在线用户:
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
                      128
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                      数据库大小:
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
                      2.3 GB
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }} />

                <Alert 
                  severity="info" 
                  sx={{ 
                    backgroundColor: 'rgba(25, 118, 210, 0.2)',
                    color: 'white',
                    '& .MuiAlert-icon': { color: '#42a5f5' },
                  }}
                >
                  系统运行正常，所有服务状态良好
                </Alert>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Recent System Events */}
        <Card sx={{ 
          background: 'rgba(255, 255, 255, 0.1)', 
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, mb: 3 }}>
              系统事件日志
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderRadius: 1, backgroundColor: 'rgba(82, 196, 26, 0.1)' }}>
                <CheckCircle sx={{ color: '#52c41a' }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
                    系统启动成功
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    2024-01-15 09:00:00
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderRadius: 1, backgroundColor: 'rgba(250, 173, 20, 0.1)' }}>
                <Warning sx={{ color: '#faad14' }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
                    API响应时间较慢
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    2024-01-15 14:25:00
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, borderRadius: 1, backgroundColor: 'rgba(245, 34, 45, 0.1)' }}>
                <Error sx={{ color: '#f5222d' }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
                    支付网关连接超时
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    2024-01-15 15:25:00
                  </Typography>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </PremiumBackground>
  );
};

export default AdminControlPanel;
