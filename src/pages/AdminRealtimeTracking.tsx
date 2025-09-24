import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Avatar,
  Chip,
  IconButton,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  LocationOn,
  Refresh,
  MyLocation,
  Visibility,
  Phone,
  DirectionsRun,
  Speed,
  AccessTime,
  LocalShipping,
  Map as MapIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import PremiumBackground from '../components/PremiumBackground';

interface CourierLocation {
  id: string;
  name: string;
  phone: string;
  workId: string;
  currentLocation: {
    lat: number;
    lng: number;
    address: string;
    lastUpdate: string;
  };
  status: 'online' | 'offline' | 'delivering' | 'idle';
  currentOrder?: string;
  speed: number; // km/h
  batteryLevel: number; // %
  appVersion: string;
  isTracking: boolean;
}

const AdminRealtimeTracking: React.FC = () => {
  const navigate = useNavigate();
  const [couriers, setCouriers] = useState<CourierLocation[]>([]);
  const [selectedCourier, setSelectedCourier] = useState<CourierLocation | null>(null);
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    loadCourierLocations();
    
    // 自动刷新位置信息（每30秒）
    const interval = setInterval(() => {
      if (autoRefresh) {
        loadCourierLocations();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const loadCourierLocations = () => {
    try {
      // 从员工管理中加载快递员信息
      const employees = JSON.parse(localStorage.getItem('company_employees') || '[]');
      const courierEmployees = employees.filter((emp: any) => emp.role === 'employee');
      
      // 模拟位置数据（实际应该从APP获取）
      const mockLocations: CourierLocation[] = courierEmployees.map((emp: any, index: number) => ({
        id: emp.workId || `courier-${index}`,
        name: emp.name || emp.username,
        phone: emp.phone || '09-123456789',
        workId: emp.workId || `ML${String(index + 1).padStart(3, '0')}`,
        currentLocation: {
          lat: 16.8661 + (Math.random() - 0.5) * 0.1, // 仰光附近
          lng: 96.1951 + (Math.random() - 0.5) * 0.1,
          address: generateRandomAddress(),
          lastUpdate: new Date(Date.now() - Math.random() * 300000).toISOString(), // 5分钟内
        },
        status: Math.random() > 0.3 ? 'online' : 'offline',
        currentOrder: Math.random() > 0.6 ? `MDY${Date.now().toString().slice(-8)}` : undefined,
        speed: Math.round(Math.random() * 40), // 0-40 km/h
        batteryLevel: Math.round(60 + Math.random() * 40), // 60-100%
        appVersion: '1.2.0',
        isTracking: Math.random() > 0.2, // 80%启用跟踪
      }));

      setCouriers(mockLocations);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('加载快递员位置失败:', error);
    }
  };

  const generateRandomAddress = () => {
    const areas = [
      '仰光市中心区', '北达贡区', '南达贡区', '巴汉区', '拉达那区',
      '卡马尤特区', '拉因区', '塔穆威区', '明加拉东区', '明加拉塔农彬区'
    ];
    const streets = ['第1街', '第2街', '第3街', '第4街', '第5街', '大学路', '商业街', '和平路'];
    
    return `${areas[Math.floor(Math.random() * areas.length)]} ${streets[Math.floor(Math.random() * streets.length)]} ${Math.floor(Math.random() * 200) + 1}号`;
  };

  const handleViewLocation = (courier: CourierLocation) => {
    setSelectedCourier(courier);
    setMapDialogOpen(true);
  };

  const handleRefresh = () => {
    loadCourierLocations();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'success';
      case 'delivering': return 'primary';
      case 'idle': return 'warning';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'online': return '在线';
      case 'offline': return '离线';
      case 'delivering': return '配送中';
      case 'idle': return '空闲';
      default: return '未知';
    }
  };

  const onlineCouriers = couriers.filter(c => c.status !== 'offline').length;
  const deliveringCouriers = couriers.filter(c => c.status === 'delivering').length;
  const trackingEnabled = couriers.filter(c => c.isTracking).length;

  return (
    <PremiumBackground variant="admin" minHeight="100vh">
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 600, color: 'white' }}>
              实时跟踪
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={handleRefresh}
                sx={{
                  borderColor: 'rgba(255,255,255,0.3)',
                  color: 'white',
                  '&:hover': { 
                    borderColor: 'rgba(255,255,255,0.5)',
                    background: 'rgba(255,255,255,0.1)',
                  },
                }}
              >
                刷新位置
              </Button>
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
          </Box>
          <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            实时监控快递员位置，提高配送效率和安全性
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            最后更新: {lastUpdate.toLocaleString()} | 自动刷新: {autoRefresh ? '开启' : '关闭'}
          </Typography>
        </Box>

        {/* Statistics */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} lg={3}>
            <Card sx={{ 
              background: 'rgba(255, 255, 255, 0.1)', 
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ color: '#52c41a', fontWeight: 600 }}>
                      {onlineCouriers}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white' }}>
                      在线快递员
                    </Typography>
                  </Box>
                  <DirectionsRun sx={{ fontSize: 40, color: '#52c41a' }} />
                </Box>
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
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ color: '#1890ff', fontWeight: 600 }}>
                      {deliveringCouriers}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white' }}>
                      配送中
                    </Typography>
                  </Box>
                  <LocalShipping sx={{ fontSize: 40, color: '#1890ff' }} />
                </Box>
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
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ color: '#faad14', fontWeight: 600 }}>
                      {trackingEnabled}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white' }}>
                      启用跟踪
                    </Typography>
                  </Box>
                  <MyLocation sx={{ fontSize: 40, color: '#faad14' }} />
                </Box>
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
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={autoRefresh}
                          onChange={(e) => setAutoRefresh(e.target.checked)}
                          size="small"
                        />
                      }
                      label={
                        <Typography variant="body2" sx={{ color: 'white' }}>
                          自动刷新
                        </Typography>
                      }
                    />
                  </Box>
                  <AccessTime sx={{ fontSize: 40, color: '#722ed1' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Courier Locations Table */}
        <Card sx={{ 
          background: 'rgba(255, 255, 255, 0.1)', 
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: 'white', mb: 3 }}>
              快递员位置监控
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      快递员信息
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      当前位置
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      状态
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      速度
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      电池
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      当前订单
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      操作
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {couriers.map((courier) => (
                    <TableRow key={courier.id}>
                      <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ backgroundColor: courier.isTracking ? '#52c41a' : '#f5222d' }}>
                            <LocalShipping />
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {courier.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                              {courier.workId} | {courier.phone}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Box>
                          <Typography variant="body2">
                            {courier.currentLocation.address}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            {new Date(courier.currentLocation.lastUpdate).toLocaleTimeString()}前更新
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Chip 
                          label={getStatusLabel(courier.status)} 
                          color={getStatusColor(courier.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Speed sx={{ fontSize: 16, color: 'rgba(255,255,255,0.7)' }} />
                          <Typography variant="body2">
                            {courier.speed} km/h
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Typography variant="body2" sx={{ 
                          color: courier.batteryLevel > 20 ? '#52c41a' : '#f5222d' 
                        }}>
                          {courier.batteryLevel}%
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                        {courier.currentOrder ? (
                          <Typography variant="body2" sx={{ color: '#1890ff' }}>
                            {courier.currentOrder}
                          </Typography>
                        ) : (
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            无
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton 
                            size="small" 
                            sx={{ color: '#42a5f5' }}
                            onClick={() => handleViewLocation(courier)}
                          >
                            <MapIcon fontSize="small" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            sx={{ color: '#52c41a' }}
                            onClick={() => window.open(`tel:${courier.phone}`)}
                          >
                            <Phone fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Location Detail Dialog */}
        <Dialog 
          open={mapDialogOpen} 
          onClose={() => setMapDialogOpen(false)}
          maxWidth="md"
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
            {selectedCourier?.name} - 位置详情
          </DialogTitle>
          <DialogContent>
            {selectedCourier && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ 
                    background: 'rgba(255, 255, 255, 0.1)', 
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    mb: 2,
                  }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                        位置信息
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                          地址: {selectedCourier.currentLocation.address}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                          坐标: {selectedCourier.currentLocation.lat.toFixed(6)}, {selectedCourier.currentLocation.lng.toFixed(6)}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                          更新时间: {new Date(selectedCourier.currentLocation.lastUpdate).toLocaleString()}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                          移动速度: {selectedCourier.speed} km/h
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card sx={{ 
                    background: 'rgba(255, 255, 255, 0.1)', 
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    mb: 2,
                  }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                        设备状态
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                          电池电量: {selectedCourier.batteryLevel}%
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                          APP版本: {selectedCourier.appVersion}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                          跟踪状态: {selectedCourier.isTracking ? '已启用' : '已禁用'}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                          工作状态: {getStatusLabel(selectedCourier.status)}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ 
                    height: 300, 
                    background: 'rgba(255, 255, 255, 0.1)', 
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <MapIcon sx={{ fontSize: 60, color: 'rgba(255,255,255,0.5)' }} />
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mt: 2 }}>
                        地图集成功能
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                        将在下个版本中添加Google Maps集成
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setMapDialogOpen(false)}
              sx={{ color: 'white' }}
            >
              关闭
            </Button>
            <Button 
              variant="contained"
              sx={{
                background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                '&:hover': { background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)' },
              }}
              onClick={() => {
                if (selectedCourier) {
                  window.open(`https://maps.google.com/?q=${selectedCourier.currentLocation.lat},${selectedCourier.currentLocation.lng}`);
                }
              }}
            >
              在Google地图中查看
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </PremiumBackground>
  );
};

export default AdminRealtimeTracking;
