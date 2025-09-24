import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Alert,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  CloudUpload,
  Storage,
  Sync,
  CheckCircle,
  Error,
  Warning,
  Info,
  People,
  Assignment,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import PremiumBackground from '../components/PremiumBackground';
import { useLanguage } from '../contexts/LanguageContext';
import SupabaseService from '../utils/supabaseClient';

interface MigrationStatus {
  step: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  message: string;
  count?: number;
}

const DataMigrationTool: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [localDataStats, setLocalDataStats] = useState({
    employees: 0,
    orders: 0,
  });
  const [cloudDataStats, setCloudDataStats] = useState({
    employees: 0,
    orders: 0,
  });

  // 检查Supabase连接状态
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const connected = await SupabaseService.checkConnection();
        setIsSupabaseConnected(connected);
        
        if (connected) {
          // 获取云端数据统计
          const employees = await SupabaseService.getEmployees();
          const orders = await SupabaseService.getOrders();
          setCloudDataStats({
            employees: employees.length,
            orders: orders.length,
          });
        }
      } catch (error) {
        console.error('检查Supabase连接失败:', error);
        setIsSupabaseConnected(false);
      }
    };

    checkConnection();
  }, []);

  // 检查本地数据
  useEffect(() => {
    const checkLocalData = () => {
      try {
        const employees = JSON.parse(localStorage.getItem('company_employees') || '[]');
        const orders = JSON.parse(localStorage.getItem('courier_orders') || '[]');
        
        setLocalDataStats({
          employees: employees.length,
          orders: orders.length,
        });
      } catch (error) {
        console.error('检查本地数据失败:', error);
      }
    };

    checkLocalData();
  }, []);

  const addMigrationStep = (step: string, status: MigrationStatus['status'], message: string, count?: number) => {
    setMigrationStatus(prev => [...prev, { step, status, message, count }]);
  };

  const updateLastStep = (status: MigrationStatus['status'], message: string, count?: number) => {
    setMigrationStatus(prev => {
      const newStatus = [...prev];
      if (newStatus.length > 0) {
        newStatus[newStatus.length - 1] = { ...newStatus[newStatus.length - 1], status, message, count };
      }
      return newStatus;
    });
  };

  const handleMigrateData = async () => {
    if (!isSupabaseConnected) {
      alert('Supabase未连接，无法迁移数据');
      return;
    }

    setIsRunning(true);
    setMigrationStatus([]);

    try {
      addMigrationStep('准备迁移', 'running', '正在准备数据迁移...');
      
      // 检查本地数据
      const localEmployees = JSON.parse(localStorage.getItem('company_employees') || '[]');
      const localOrders = JSON.parse(localStorage.getItem('courier_orders') || '[]');
      
      updateLastStep('completed', `发现本地数据: ${localEmployees.length} 个员工, ${localOrders.length} 个订单`);

      // 开始迁移
      addMigrationStep('迁移数据', 'running', '正在迁移到Supabase...');
      
      const result = await SupabaseService.migrateLocalDataToSupabase();
      
      updateLastStep('completed', `迁移完成: ${result.employees} 个员工, ${result.orders} 个订单`);

      // 更新云端统计
      addMigrationStep('更新统计', 'running', '正在更新数据统计...');
      
      const employees = await SupabaseService.getEmployees();
      const orders = await SupabaseService.getOrders();
      setCloudDataStats({
        employees: employees.length,
        orders: orders.length,
      });
      
      updateLastStep('completed', '数据统计更新完成');

      addMigrationStep('迁移完成', 'completed', '🎉 数据迁移成功！现在可以多设备同步使用了');
      
    } catch (error: any) {
      console.error('数据迁移失败:', error);
      updateLastStep('error', `迁移失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleEnableCloudSync = () => {
    // 这里可以添加启用云同步的逻辑
    localStorage.setItem('use_cloud_storage', 'true');
    alert('云同步已启用！数据将自动保存到Supabase');
  };

  const getStatusIcon = (status: MigrationStatus['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle sx={{ color: '#52c41a' }} />;
      case 'running':
        return <Sync sx={{ color: '#1890ff' }} className="animate-spin" />;
      case 'error':
        return <Error sx={{ color: '#f5222d' }} />;
      default:
        return <Info sx={{ color: '#faad14' }} />;
    }
  };

  return (
    <PremiumBackground variant="admin" minHeight="100vh">
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 600, color: 'white' }}>
              云数据库升级
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
            升级到Supabase云数据库，实现多设备同步和数据安全保障
          </Typography>
        </Box>

        {/* Connection Status */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Card sx={{ 
              background: 'rgba(255, 255, 255, 0.1)', 
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Storage sx={{ color: '#42a5f5' }} />
                  <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                    本地数据
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ color: '#52c41a', fontWeight: 600 }}>
                        {localDataStats.employees}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'white' }}>
                        员工
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ color: '#faad14', fontWeight: 600 }}>
                        {localDataStats.orders}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'white' }}>
                        订单
                      </Typography>
                    </Box>
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <CloudUpload sx={{ color: '#722ed1' }} />
                  <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                    云端数据 (Supabase)
                  </Typography>
                  <Chip 
                    label={isSupabaseConnected ? '已连接' : '未连接'}
                    color={isSupabaseConnected ? 'success' : 'error'}
                    size="small"
                  />
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ color: '#52c41a', fontWeight: 600 }}>
                        {cloudDataStats.employees}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'white' }}>
                        员工
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ color: '#faad14', fontWeight: 600 }}>
                        {cloudDataStats.orders}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'white' }}>
                        订单
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Migration Controls */}
        <Card sx={{ 
          background: 'rgba(255, 255, 255, 0.1)', 
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          mb: 4,
        }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, mb: 3 }}>
              数据迁移控制
            </Typography>
            
            {!isSupabaseConnected && (
              <Alert 
                severity="warning" 
                sx={{ 
                  mb: 3,
                  backgroundColor: 'rgba(250, 173, 20, 0.2)',
                  color: 'white',
                  '& .MuiAlert-icon': { color: '#faad14' },
                }}
              >
                Supabase未连接。请检查环境变量配置：REACT_APP_SUPABASE_URL 和 REACT_APP_SUPABASE_ANON_KEY
              </Alert>
            )}

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<CloudUpload />}
                  onClick={handleMigrateData}
                  disabled={!isSupabaseConnected || isRunning}
                  sx={{
                    background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                    '&:hover': { background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)' },
                    '&:disabled': { background: 'rgba(255,255,255,0.1)' },
                  }}
                >
                  {isRunning ? '迁移中...' : '迁移到云端'}
                </Button>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Sync />}
                  onClick={handleEnableCloudSync}
                  disabled={!isSupabaseConnected}
                  sx={{
                    borderColor: 'rgba(255,255,255,0.3)',
                    color: 'white',
                    '&:hover': { borderColor: 'rgba(255,255,255,0.5)' },
                    '&:disabled': { borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)' },
                  }}
                >
                  启用云同步
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Migration Progress */}
        {migrationStatus.length > 0 && (
          <Card sx={{ 
            background: 'rgba(255, 255, 255, 0.1)', 
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            mb: 4,
          }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, mb: 3 }}>
                迁移进度
              </Typography>
              
              {isRunning && (
                <LinearProgress 
                  sx={{ 
                    mb: 2,
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    '& .MuiLinearProgress-bar': { backgroundColor: '#42a5f5' },
                  }} 
                />
              )}
              
              <List>
                {migrationStatus.map((status, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      {getStatusIcon(status.status)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="body1" sx={{ color: 'white', fontWeight: 600 }}>
                          {status.step}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                          {status.message}
                          {status.count !== undefined && ` (${status.count} 条记录)`}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        )}

        {/* Benefits */}
        <Card sx={{ 
          background: 'rgba(255, 255, 255, 0.1)', 
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, mb: 3 }}>
              云数据库优势
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Sync sx={{ color: '#52c41a' }} />
                  <Typography variant="body1" sx={{ color: 'white', fontWeight: 600 }}>
                    多设备同步
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 3 }}>
                  在任何设备上都能访问最新数据，手机、电脑、平板完全同步
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <CheckCircle sx={{ color: '#52c41a' }} />
                  <Typography variant="body1" sx={{ color: 'white', fontWeight: 600 }}>
                    数据安全
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 3 }}>
                  专业级数据库，自动备份，数据永不丢失
                </Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <People sx={{ color: '#42a5f5' }} />
                  <Typography variant="body1" sx={{ color: 'white', fontWeight: 600 }}>
                    团队协作
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 3 }}>
                  多人同时使用，实时数据共享，提高工作效率
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Assignment sx={{ color: '#722ed1' }} />
                  <Typography variant="body1" sx={{ color: 'white', fontWeight: 600 }}>
                    高性能
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  专业数据库，查询速度快，支持大量数据
                </Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }} />

            <Alert 
              severity="info" 
              sx={{ 
                backgroundColor: 'rgba(25, 118, 210, 0.2)',
                color: 'white',
                '& .MuiAlert-icon': { color: '#42a5f5' },
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                升级到云数据库后的好处：
              </Typography>
              <Typography variant="body2">
                • 数据永不丢失，专业级备份保障<br/>
                • 多设备实时同步，随时随地访问<br/>
                • 支持团队协作，多人同时使用<br/>
                • 高性能查询，支持大量数据<br/>
                • 自动扩容，业务增长无忧
              </Typography>
            </Alert>
          </CardContent>
        </Card>
      </Container>
    </PremiumBackground>
  );
};

export default DataMigrationTool;
