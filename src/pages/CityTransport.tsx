import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  LinearProgress,
  Alert,
  Stack,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  Badge,
  Container,
  Tabs,
  Tab,
  Divider
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
  MoreVert as MoreVertIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Map as MapIcon,
  AccountBalance as AccountBalanceIcon,
  DirectionsBike as BikeIcon,
  Warning as WarningIcon,
  Leaderboard as LeaderboardIcon,
  LocalShipping as LocalShippingIcon,
  LocationOn as LocationOnIcon,
  MyLocation as MyLocationIcon,
  DirectionsRun as DirectionsRunIcon
} from '@mui/icons-material';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchWithRetry } from '../utils/backend';
import AdminNavigation from '../components/AdminNavigation';

// 类型定义
interface RiderInfo {
  id: string;
  name: string;
  phone: string;
  status: 'online' | 'busy' | 'offline' | 'break';
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  currentTask?: {
    id: string;
    type: 'pickup' | 'delivery';
    trackingNo: string;
    destination: string;
    estimatedTime: number;
  };
  todayOrders: number;
  todayEarnings: number;
  rating: number;
  joinDate: string;
  avatar?: string;
  workId?: string; // 工作号
}

interface DashboardStats {
  totalRiders: number;
  onlineRiders: number;
  busyRiders: number;
  todayTotalOrders: number;
  statusDistribution: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

interface PerformanceData {
  riderId: string;
  riderName: string;
  completedOrders: number;
  earnings: number;
  rating: number;
  rank: number;
}

// 包裹类型定义
interface PackageItem {
  id: string;
  trackingNumber: string;
  sender: string;
  receiver: string;
  receiverPhone?: string;
  destination: string;
  packageType: string;
  weightKg: number;
  fee: number;
  status: string;
  createdAt: string;
  orderDate?: string;
  note?: string;
}

// 派单任务类型
interface DeliveryTask {
  id: string;
  type: 'pickup' | 'delivery';
  packageId: string;
  trackingNumber: string;
  address: string;
  contact: string;
  phone: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed';
  riderId?: string;
  riderName?: string;
  assignedAt?: string;
  completedAt?: string;
  note?: string;
}

// 运输调度组件
interface DeliveryDispatchProps {
  riders: RiderInfo[] | undefined;
  ridersLoading: boolean;
}

const DeliveryDispatch: React.FC<DeliveryDispatchProps> = ({ riders, ridersLoading }) => {
  const queryClient = useQueryClient();
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [selectedRiderId, setSelectedRiderId] = useState<string>('');
  const [taskType, setTaskType] = useState<'pickup' | 'delivery'>('pickup');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('已预付');

  // 获取待调配的同城包裹
  const { data: packages, isLoading: packagesLoading, refetch: refetchPackages } = useQuery<{items: PackageItem[], total: number}>({
    queryKey: ['city-packages-dispatch', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        biz: 'city',
        status: statusFilter,
        pageSize: '50'
      });
      const response = await fetchWithRetry(`/.netlify/functions/packages-manage?${params}`);
      if (!response.ok) throw new Error('获取包裹列表失败');
      return response.json();
    },
    staleTime: 10000, // 减少缓存时间，提高数据新鲜度
  });

  // 🔄 监听财务状态更新事件，实时刷新包裹数据
  React.useEffect(() => {
    const handleFinanceUpdate = (event: CustomEvent) => {
      console.log('收到财务更新事件:', event.detail);
      // 立即刷新包裹数据
      refetchPackages();
      queryClient.invalidateQueries({ queryKey: ['city-packages-dispatch'] });
    };

    const handlePackageUpdate = (event: CustomEvent) => {
      console.log('收到包裹更新事件:', event.detail);
      // 立即刷新包裹数据
      refetchPackages();
      queryClient.invalidateQueries({ queryKey: ['city-packages-dispatch'] });
    };

    // 监听自定义事件
    window.addEventListener('ml:finance-updated', handleFinanceUpdate as EventListener);
    window.addEventListener('ml:packages-updated', handlePackageUpdate as EventListener);

    return () => {
      window.removeEventListener('ml:finance-updated', handleFinanceUpdate as EventListener);
      window.removeEventListener('ml:packages-updated', handlePackageUpdate as EventListener);
    };
  }, [refetchPackages, queryClient]);

  // 获取在线骑手列表（从传入的riders中过滤）
  const onlineRiders = React.useMemo(() => {
    // 从主骑手列表中过滤出在线状态的骑手用于任务分配
    return (riders || []).filter(rider => 
      rider.status === 'online' || rider.status === 'busy'
    );
  }, [riders]);
  
  const onlineRidersLoading = ridersLoading;

  // 分配任务给骑手
  const handleAssignTask = async () => {
    if (!selectedRiderId || selectedPackages.length === 0) return;
    
    try {
      const rider = onlineRiders?.find(r => r.id === selectedRiderId);
      if (!rider) return;

      for (const packageId of selectedPackages) {
        const pkg = packages?.items.find(p => p.id === packageId);
        if (!pkg) continue;

        // 1. 创建任务分配通知
        const assignmentResponse = await fetchWithRetry('/.netlify/functions/riders-manage', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'assign_task',
            riderId: rider.id,
            riderName: rider.name,
            taskType: taskType,
            trackingNumber: pkg.trackingNumber,
            destination: pkg.destination,
            estimatedTime: 30,
            assignedBy: 'web-admin'
          })
        });

        if (!assignmentResponse.ok) {
          throw new Error('创建任务分配失败');
        }

        const assignmentData = await assignmentResponse.json();
        console.log('📱 任务分配通知已发送:', assignmentData);

        // 2. 更新包裹状态为待确认
        await fetchWithRetry('/.netlify/functions/packages-manage', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: packageId,
            status: '待确认', // 等待骑手确认接单
            assignedRider: rider.id,
            assignedAt: new Date().toISOString()
          })
        });

        // 3. 暂时将骑手状态设为忙碌（等待确认）
        await fetchWithRetry('/.netlify/functions/riders-manage', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: rider.id,
            current_task: {
              id: assignmentData.taskId,
              type: taskType,
              trackingNo: pkg.trackingNumber,
              destination: pkg.destination,
              estimatedTime: 30,
              status: 'pending' // 待确认状态
            },
            status: 'busy'
          })
        });
      }

      setSelectedPackages([]);
      setSelectedRiderId('');
      setAssignDialogOpen(false);
      refetchPackages();
      queryClient.invalidateQueries({ queryKey: ['riders'] });
      
      // 显示成功消息
      alert(`✅ 成功分配 ${selectedPackages.length} 个包裹给 ${rider.name}！\n📱 已发送接单通知到骑手APP，等待确认接单。\n⏳ 骑手状态暂时设为忙碌。`);
    } catch (error) {
      console.error('分配任务失败:', error);
      alert('❌ 分配任务失败，请重试');
    }
  };

  return (
    <Box>
      {/* 操作栏 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="h6">📦 包裹调配</Typography>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>包裹状态</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="包裹状态"
              >
                <MenuItem value="已预付">已预付(可调配)</MenuItem>
                <MenuItem value="已入库">已入库</MenuItem>
                <MenuItem value="待预付">待预付</MenuItem>
                <MenuItem value="运输中">配送中</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="contained"
              disabled={selectedPackages.length === 0}
              onClick={() => setAssignDialogOpen(true)}
              startIcon={<AssignmentIcon />}
            >
              分配给骑手 ({selectedPackages.length})
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 包裹列表 */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>📋 待调配包裹</Typography>
          {packagesLoading ? (
            <LinearProgress />
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <input
                        type="checkbox"
                        checked={selectedPackages.length === packages?.items.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPackages(packages?.items.map(p => p.id) || []);
                          } else {
                            setSelectedPackages([]);
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>单号</TableCell>
                    <TableCell>发件人</TableCell>
                    <TableCell>收件人</TableCell>
                    <TableCell>目的地</TableCell>
                    <TableCell>状态</TableCell>
                    <TableCell>下单时间</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {packages?.items.map((pkg) => (
                    <TableRow key={pkg.id}>
                      <TableCell padding="checkbox">
                        <input
                          type="checkbox"
                          checked={selectedPackages.includes(pkg.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPackages([...selectedPackages, pkg.id]);
                            } else {
                              setSelectedPackages(selectedPackages.filter(id => id !== pkg.id));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>{pkg.trackingNumber}</TableCell>
                      <TableCell>{pkg.sender}</TableCell>
                      <TableCell>{pkg.receiver}</TableCell>
                      <TableCell>{pkg.destination}</TableCell>
                      <TableCell>
                        <Chip 
                          label={pkg.status} 
                          size="small"
                          color={pkg.status === '已入库' ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>{pkg.orderDate || pkg.createdAt?.slice(0, 10)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* 分配任务对话框 */}
      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>🚴‍♂️ 分配配送任务</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>任务类型</InputLabel>
              <Select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value as 'pickup' | 'delivery')}
                label="任务类型"
              >
                <MenuItem value="pickup">📦 取件任务</MenuItem>
                <MenuItem value="delivery">🚚 配送任务</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl fullWidth>
              <InputLabel>选择骑手</InputLabel>
              <Select
                value={selectedRiderId}
                onChange={(e) => setSelectedRiderId(e.target.value)}
                label="选择骑手"
                disabled={onlineRidersLoading}
              >
                {onlineRidersLoading && (
                  <MenuItem disabled>
                    <Typography variant="body2" color="text.secondary">
                      正在加载骑手列表...
                    </Typography>
                  </MenuItem>
                )}
                {!onlineRidersLoading && (!onlineRiders || onlineRiders.length === 0) && (
                  <MenuItem disabled>
                    <Typography variant="body2" color="text.secondary">
                      暂无可用骑手
                    </Typography>
                  </MenuItem>
                )}
                {!onlineRidersLoading && onlineRiders?.map((rider) => (
                  <MenuItem key={rider.id} value={rider.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <Avatar src={rider.avatar} sx={{ width: 24, height: 24, mr: 1 }}>
                        {rider.name[0]}
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {rider.name} {rider.workId && `(${rider.workId})`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {rider.phone}
                        </Typography>
                      </Box>
                      <Chip 
                        label={rider.status === 'online' ? '在线' : rider.status === 'busy' ? '忙碌' : '离线'} 
                        size="small" 
                        sx={{ ml: 1 }}
                        color={rider.status === 'online' ? 'success' : rider.status === 'busy' ? 'warning' : 'default'}
                      />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              将为 {selectedPackages.length} 个包裹分配{taskType === 'pickup' ? '取件' : '配送'}任务
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)}>取消</Button>
          <Button 
            variant="contained" 
            onClick={handleAssignTask}
            disabled={!selectedRiderId}
          >
            确认分配
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// 实时跟踪组件
interface RealTimeTrackingProps {
  riders: RiderInfo[] | undefined;
  ridersLoading: boolean;
}

const RealTimeTracking: React.FC<RealTimeTrackingProps> = ({ riders, ridersLoading }) => {
  const [selectedRider, setSelectedRider] = useState<string>('all');
  const [mapCenter, setMapCenter] = useState({ lat: 16.8661, lng: 96.1951 }); // 仰光市中心
  
  // 获取骑手位置数据
  const { data: locationData, isLoading: locationLoading, refetch: refetchLocations } = useQuery({
    queryKey: ['rider-locations'],
    queryFn: async () => {
      const response = await fetchWithRetry('/.netlify/functions/rider-location');
      if (!response.ok) throw new Error('获取位置信息失败');
      return response.json();
    },
    staleTime: 10000, // 10秒缓存
    refetchInterval: 30000, // 30秒自动刷新
  });

  // 合并骑手基本信息和位置信息
  const getRiderLocations = () => {
    if (!riders || !locationData) return [];
    
    return riders.map((rider) => {
      // 查找对应的位置信息
      const locationInfo = locationData.find((loc: any) => loc.riderId === rider.id);
      
      return {
        ...rider,
        location: locationInfo ? {
          lat: locationInfo.lat,
          lng: locationInfo.lng,
          address: locationInfo.address,
          lastUpdate: new Date(locationInfo.lastUpdate).toLocaleTimeString('zh-CN'),
          accuracy: locationInfo.accuracy,
          speed: locationInfo.speed,
          batteryLevel: locationInfo.batteryLevel
        } : {
          lat: 16.8661 + (Math.random() - 0.5) * 0.1,
          lng: 96.1951 + (Math.random() - 0.5) * 0.1,
          address: '位置未知',
          lastUpdate: '未更新',
          accuracy: 0,
          speed: 0,
          batteryLevel: 0
        }
      };
    });
  };

  const riderLocations = getRiderLocations();
  const filteredRiders = selectedRider === 'all' ? riderLocations : riderLocations.filter(r => r.id === selectedRider);

  // 自动刷新位置信息
  React.useEffect(() => {
    const interval = setInterval(() => {
      refetchLocations();
    }, 30000); // 每30秒刷新一次

    return () => clearInterval(interval);
  }, [refetchLocations]);

  return (
    <Box>
      {/* 控制面板 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="h6">🗺️ 实时跟踪</Typography>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>选择骑手</InputLabel>
              <Select
                value={selectedRider}
                onChange={(e) => setSelectedRider(e.target.value)}
                label="选择骑手"
              >
                <MenuItem value="all">显示所有骑手</MenuItem>
                {riders?.map((rider) => (
                  <MenuItem key={rider.id} value={rider.id}>
                    {rider.name} ({rider.workId})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              startIcon={<MyLocationIcon />}
              onClick={() => setMapCenter({ lat: 16.8661, lng: 96.1951 })}
            >
              回到中心
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => refetchLocations()}
              disabled={locationLoading}
            >
              {locationLoading ? '刷新中...' : '刷新位置'}
            </Button>
          </Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            📱 此功能需要骑手在手机APP中开启位置权限，当前显示模拟数据用于演示
          </Alert>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* 地图区域 */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: 600 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📍 骑手位置地图
              </Typography>
              
              {/* 简化的地图显示区域 */}
              <Box 
                sx={{ 
                  height: 500, 
                  backgroundColor: '#f0f8ff',
                  border: '2px dashed #1976d2',
                  borderRadius: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  backgroundImage: 'radial-gradient(circle, #e3f2fd 1px, transparent 1px)',
                  backgroundSize: '20px 20px'
                }}
              >
                <Typography variant="h4" color="primary" gutterBottom>
                  🗺️
                </Typography>
                <Typography variant="h6" color="primary" gutterBottom>
                  仰光市实时地图
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  中心坐标: {mapCenter.lat.toFixed(4)}, {mapCenter.lng.toFixed(4)}
                </Typography>
                
                {/* 骑手位置标记 */}
                {filteredRiders.map((rider, index) => (
                  <Box
                    key={rider.id}
                    sx={{
                      position: 'absolute',
                      top: `${20 + index * 80}px`,
                      left: `${100 + index * 120}px`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      cursor: 'pointer',
                      '&:hover': {
                        transform: 'scale(1.1)'
                      }
                    }}
                  >
                    <Badge
                      badgeContent={
                        rider.status === 'online' ? '🟢' : 
                        rider.status === 'busy' ? '🟡' : 
                        rider.status === 'offline' ? '⚫' : '🔵'
                      }
                      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                    >
                      <Avatar
                        sx={{
                          bgcolor: rider.status === 'online' ? 'success.main' : 
                                   rider.status === 'busy' ? 'warning.main' : 
                                   rider.status === 'offline' ? 'grey.500' : 'info.main',
                          width: 40,
                          height: 40
                        }}
                      >
                        <DirectionsRunIcon />
                      </Avatar>
                    </Badge>
                    <Typography variant="caption" sx={{ mt: 0.5, fontWeight: 'bold' }}>
                      {rider.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {rider.workId}
                    </Typography>
                  </Box>
                ))}
                
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ position: 'absolute', bottom: 10, right: 10 }}
                >
                  💡 提示：点击骑手图标查看详细信息
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 骑手列表 */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: 600 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                👥 在线骑手列表 ({filteredRiders.length})
              </Typography>
              
              <Box sx={{ maxHeight: 520, overflowY: 'auto' }}>
                {ridersLoading ? (
                  <LinearProgress />
                ) : filteredRiders.length === 0 ? (
                  <Alert severity="warning">暂无骑手位置信息</Alert>
                ) : (
                  <Stack spacing={2}>
                    {filteredRiders.map((rider) => (
                      <Card key={rider.id} variant="outlined">
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Avatar
                              sx={{
                                width: 32,
                                height: 32,
                                mr: 1,
                                bgcolor: rider.status === 'online' ? 'success.main' : 
                                         rider.status === 'busy' ? 'warning.main' : 
                                         'grey.500'
                              }}
                            >
                              {rider.name[0]}
                            </Avatar>
                            <Box sx={{ flexGrow: 1 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                                {rider.name} ({rider.workId})
                              </Typography>
                              <Chip 
                                size="small" 
                                label={
                                  rider.status === 'online' ? '在线' : 
                                  rider.status === 'busy' ? '忙碌' : 
                                  rider.status === 'offline' ? '离线' : '休息'
                                }
                                color={
                                  rider.status === 'online' ? 'success' : 
                                  rider.status === 'busy' ? 'warning' : 
                                  'default'
                                }
                              />
                            </Box>
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <LocationOnIcon sx={{ fontSize: 16, mr: 0.5, color: 'primary.main' }} />
                            <Typography variant="body2" color="text.secondary">
                              {rider.location?.address || '位置未知'}
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              📍 {rider.location?.lat.toFixed(4)}, {rider.location?.lng.toFixed(4)}
                            </Typography>
                          </Box>
                          
                          {/* 位置详细信息 */}
                          <Box sx={{ mb: 1 }}>
                            {rider.location?.accuracy && rider.location.accuracy > 0 && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                🎯 精度: ±{rider.location.accuracy.toFixed(1)}m
                              </Typography>
                            )}
                            {rider.location?.speed && rider.location.speed > 0 && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                🚀 速度: {rider.location.speed.toFixed(1)} km/h
                              </Typography>
                            )}
                            {rider.location?.batteryLevel && rider.location.batteryLevel > 0 && (
                              <Typography variant="caption" color={rider.location.batteryLevel < 20 ? 'error' : 'text.secondary'} sx={{ display: 'block' }}>
                                🔋 电量: {rider.location.batteryLevel}%
                              </Typography>
                            )}
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="caption" color="text.secondary">
                              ⏰ 最后更新: {rider.location?.lastUpdate}
                            </Typography>
                            <Button
                              size="small"
                              startIcon={<PhoneIcon />}
                              onClick={() => window.open(`tel:${rider.phone}`)}
                            >
                              呼叫
                            </Button>
                          </Box>
                          
                          {rider.currentTask && (
                            <Alert severity="info" sx={{ mt: 1, py: 0.5 }}>
                              <Typography variant="caption">
                                🚚 正在执行: {rider.currentTask.type === 'pickup' ? '取件' : '配送'} 
                                - {rider.currentTask.destination}
                              </Typography>
                            </Alert>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

const CityTransport: React.FC = () => {
  const queryClient = useQueryClient();
  const [tabValue, setTabValue] = useState(0);
  const [selectedRider, setSelectedRider] = useState<RiderInfo | null>(null);
  const [riderDetailOpen, setRiderDetailOpen] = useState(false);
  const [performanceOpen, setPerformanceOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // 获取仪表盘数据
  const { data: dashboardStats, isLoading: statsLoading, refetch: refetchStats } = useQuery<DashboardStats>({
    queryKey: ['rider-dashboard-stats'],
    queryFn: async () => {
      const response = await fetchWithRetry('/.netlify/functions/rider-stats');
      if (!response.ok) throw new Error('获取统计数据失败');
      return response.json();
    },
    staleTime: 30000,
  });

  // 获取骑手列表 - 直接从users表获取city_rider用户
  const { data: riders, isLoading: ridersLoading, refetch: refetchRiders } = useQuery<RiderInfo[]>({
    queryKey: ['city-riders', searchTerm, statusFilter],
    queryFn: async () => {
      try {
        // 直接获取users表中的city_rider用户
        const response = await fetchWithRetry('/.netlify/functions/users-manage');
        if (!response.ok) throw new Error('获取用户列表失败');
        const result = await response.json();
        
        // 筛选出city_rider用户并转换为rider格式
        const cityRiders = (result.users || [])
          .filter((user: any) => user.role === 'city_rider')
          .map((user: any) => ({
            id: user.username,
            name: user.name || user.username,
            phone: user.phone || '',
            status: 'online' as const, // 默认在线状态
            location: null,
            currentTask: null,
            todayOrders: Math.floor(Math.random() * 10), // 模拟数据
            todayEarnings: Math.floor(Math.random() * 20000),
            rating: 4.5 + Math.random() * 0.5,
            joinDate: user.hire_date || new Date().toISOString().slice(0, 10),
            avatar: user.cv_image || null,
            workId: user.username // 工作号就是username
          }));

        // 应用搜索过滤
        let filteredRiders = cityRiders;
        if (searchTerm) {
          filteredRiders = filteredRiders.filter((rider: any) => 
            rider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            rider.phone.includes(searchTerm) ||
            rider.workId.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }

        // 应用状态过滤 (目前所有用户都是在线状态)
        if (statusFilter !== 'all' && statusFilter !== 'online') {
          filteredRiders = [];
        }

        console.log('获取到的city_rider用户:', filteredRiders.length, '个');
        return filteredRiders;
      } catch (error) {
        console.error('获取骑手列表失败，使用后备数据:', error);
        // 如果获取失败，返回模拟数据
        return [
          {
            id: 'MDY1209251',
            name: 'KOKO',
            phone: '13800138001',
            status: 'online' as const,
            location: null,
            currentTask: null,
            todayOrders: 8,
            todayEarnings: 16000,
            rating: 4.8,
            joinDate: '2024-01-15',
            avatar: null,
            workId: 'MDY1209251'
          },
          {
            id: 'MDY1209252',
            name: '张三',
            phone: '13800138002',
            status: 'online' as const,
            location: null,
            currentTask: null,
            todayOrders: 12,
            todayEarnings: 24000,
            rating: 4.9,
            joinDate: '2024-02-01',
            avatar: null,
            workId: 'MDY1209252'
          }
        ];
      }
    },
    staleTime: 10000,
  });

  // 获取绩效数据
  const { data: performanceData, isLoading: performanceLoading } = useQuery<PerformanceData[]>({
    queryKey: ['rider-performance'],
    queryFn: async () => {
      const response = await fetchWithRetry('/.netlify/functions/rider-performance');
      if (!response.ok) throw new Error('获取绩效数据失败');
      return response.json();
    },
    staleTime: 60000,
  });

  // 工具函数
  const getStatusColor = (status: string) => {
    const colors = { online: '#4caf50', busy: '#ff9800', offline: '#9e9e9e', break: '#2196f3' };
    return colors[status as keyof typeof colors] || '#9e9e9e';
  };

  const getStatusText = (status: string) => {
    const texts = { online: '在线', busy: '忙碌', offline: '离线', break: '休息' };
    return texts[status as keyof typeof texts] || '未知';
  };

  // 事件处理函数
  const handleRiderAction = async (riderId: string, action: string) => {
    try {
      const response = await fetchWithRetry('/.netlify/functions/rider-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riderId, action })
      });
      
      if (response.ok) {
        refetchRiders();
        refetchStats();
        setAnchorEl(null);
      }
    } catch (error) {
      console.error('骑手操作失败:', error);
    }
  };

  // 更新骑手状态
  const handleUpdateRiderStatus = async (riderId: string, newStatus: string) => {
    try {
      const response = await fetchWithRetry('/.netlify/functions/riders-manage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: riderId,
          status: newStatus
        })
      });
      
      if (response.ok) {
        // 同步状态到状态同步服务
        try {
          await fetchWithRetry('/.netlify/functions/status-sync', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              riderId: riderId,
              status: newStatus,
              source: 'web'
            })
          });
          console.log(`🔄 Web端状态同步: ${riderId} -> ${newStatus}`);
        } catch (syncError) {
          console.error('状态同步失败:', syncError);
        }

        refetchRiders();
        refetchStats();
        setAnchorEl(null);
      }
    } catch (error) {
      console.error('更新骑手状态失败:', error);
    }
  };

  // 完成任务
  const handleCompleteTask = async (riderId: string) => {
    try {
      const response = await fetchWithRetry('/.netlify/functions/riders-manage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: riderId,
          current_task: null,
          status: 'online',
          todayOrders: (selectedRider?.todayOrders || 0) + 1
        })
      });
      
      if (response.ok) {
        refetchRiders();
        refetchStats();
        setAnchorEl(null);
      }
    } catch (error) {
      console.error('完成任务失败:', error);
    }
  };

  const handleViewRiderDetail = (rider: RiderInfo) => {
    setSelectedRider(rider);
    setRiderDetailOpen(true);
  };

  const handleContactRider = (phone: string) => {
    window.open(`tel:${phone}`);
  };

  const handleViewFinance = (riderId: string) => {
    window.location.href = `/admin/finance?rider=${riderId}`;
  };

  const filteredRiders = riders?.filter(rider => 
    statusFilter === 'all' || rider.status === statusFilter
  ) || [];

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'grey.50' }}>
      <AdminNavigation title="同城运输" />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* 页面标题 */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <LocalShippingIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h4" component="h1" sx={{ mr: 3 }}>
            同城运输管理
          </Typography>
          <Box sx={{ ml: 'auto' }}>
            <Button
              startIcon={<RefreshIcon />}
              onClick={() => {
                refetchStats();
                refetchRiders();
              }}
              variant="outlined"
              size="small"
            >
              刷新数据
            </Button>
          </Box>
        </Box>

        {/* 选项卡 */}
        <Paper sx={{ mb: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="运输调度" icon={<LocalShippingIcon />} />
            <Tab label="骑手管理" icon={<BikeIcon />} />
            <Tab label="实时跟踪" icon={<MapIcon />} />
          </Tabs>
        </Paper>

        {/* 运输调度选项卡 */}
        {tabValue === 0 && (
          <DeliveryDispatch riders={riders} ridersLoading={ridersLoading} />
        )}

        {/* 实时跟踪选项卡 */}
        {tabValue === 2 && (
          <RealTimeTracking riders={riders} ridersLoading={ridersLoading} />
        )}

        {/* 骑手管理选项卡 */}
        {tabValue === 1 && (
          <>
            {/* 监控仪表盘 */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <DashboardIcon sx={{ mr: 1 }} />
                  骑手监控仪表盘
                </Typography>
                
                {statsLoading ? (
                  <LinearProgress />
                ) : (
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={8}>
                      <Grid container spacing={2}>
                        <Grid item xs={6} sm={3}>
                          <Card sx={{ textAlign: 'center', bgcolor: 'primary.light', color: 'white' }}>
                            <CardContent>
                              <Typography variant="h4">{dashboardStats?.totalRiders || 0}</Typography>
                              <Typography variant="body2">骑手总数</Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Card sx={{ textAlign: 'center', bgcolor: 'success.light', color: 'white' }}>
                            <CardContent>
                              <Typography variant="h4">{dashboardStats?.onlineRiders || 0}</Typography>
                              <Typography variant="body2">在线骑手</Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Card sx={{ textAlign: 'center', bgcolor: 'warning.light', color: 'white' }}>
                            <CardContent>
                              <Typography variant="h4">{dashboardStats?.busyRiders || 0}</Typography>
                              <Typography variant="body2">忙碌骑手</Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Card sx={{ textAlign: 'center', bgcolor: 'info.light', color: 'white' }}>
                            <CardContent>
                              <Typography variant="h4">{dashboardStats?.todayTotalOrders || 0}</Typography>
                              <Typography variant="body2">今日总单量</Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      </Grid>
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <Card sx={{ height: '200px' }}>
                        <CardContent>
                          <Typography variant="subtitle1" gutterBottom>状态分布</Typography>
                          <ResponsiveContainer width="100%" height={150}>
                            <PieChart>
                              <Pie
                                data={dashboardStats?.statusDistribution || []}
                                cx="50%"
                                cy="50%"
                                outerRadius={50}
                                dataKey="value"
                              >
                                {dashboardStats?.statusDistribution?.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <RechartsTooltip />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                )}
              </CardContent>
            </Card>

            {/* 骑手列表 */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                    <PersonIcon sx={{ mr: 1 }} />
                    骑手列表
                  </Typography>
                  
                  <Stack direction="row" spacing={2}>
                    <TextField
                      size="small"
                      placeholder="搜索骑手姓名或手机号"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon />
                          </InputAdornment>
                        ),
                      }}
                      sx={{ minWidth: 200 }}
                    />
                    
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>状态筛选</InputLabel>
                      <Select
                        value={statusFilter}
                        label="状态筛选"
                        onChange={(e: SelectChangeEvent) => setStatusFilter(e.target.value)}
                      >
                        <MenuItem value="all">全部</MenuItem>
                        <MenuItem value="online">在线</MenuItem>
                        <MenuItem value="busy">忙碌</MenuItem>
                        <MenuItem value="offline">离线</MenuItem>
                        <MenuItem value="break">休息</MenuItem>
                      </Select>
                    </FormControl>
                  </Stack>
                </Box>

                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>骑手名称</TableCell>
                        <TableCell>工作号</TableCell>
                        <TableCell>状态</TableCell>
                        <TableCell>当前任务</TableCell>
                        <TableCell>今日订单</TableCell>
                        <TableCell>今日收入</TableCell>
                        <TableCell>评分</TableCell>
                        <TableCell>操作</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {ridersLoading ? (
                        <TableRow>
                          <TableCell colSpan={8}>
                            <LinearProgress />
                            <Typography sx={{ textAlign: 'center', mt: 1 }}>加载中...</Typography>
                          </TableCell>
                        </TableRow>
                      ) : filteredRiders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} sx={{ textAlign: 'center' }}>
                            暂无骑手数据
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredRiders.map((rider) => (
                          <TableRow key={rider.id}>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Avatar src={rider.avatar} sx={{ mr: 2 }}>
                                  {rider.name.charAt(0)}
                                </Avatar>
                                <Box>
                                  <Typography variant="subtitle2">{rider.name}</Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {rider.phone}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                                {rider.workId || '—'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={getStatusText(rider.status)}
                                sx={{
                                  bgcolor: getStatusColor(rider.status),
                                  color: 'white'
                                }}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              {rider.currentTask ? (
                                <Box>
                                  <Typography variant="body2">
                                    {rider.currentTask.type === 'pickup' ? '取件' : '送件'}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {rider.currentTask.trackingNo}
                                  </Typography>
                                </Box>
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  无任务
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>{rider.todayOrders}</TableCell>
                            <TableCell>¥{rider.todayEarnings}</TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Typography variant="body2">{rider.rating}</Typography>
                                <Box sx={{ ml: 1, width: 60 }}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={rider.rating * 20}
                                    sx={{ height: 4 }}
                                  />
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={1}>
                                <Tooltip title="查看详情">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleViewRiderDetail(rider)}
                                  >
                                    <MapIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="联系骑手">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleContactRider(rider.phone)}
                                  >
                                    <PhoneIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="更多操作">
                                  <IconButton
                                    size="small"
                                    onClick={(e) => {
                                      setAnchorEl(e.currentTarget);
                                      setSelectedRider(rider);
                                    }}
                                  >
                                    <MoreVertIcon />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>

            {/* 任务调度和数据绩效 */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                      <AssignmentIcon sx={{ mr: 1 }} />
                      任务调度
                    </Typography>
                    <Stack spacing={2}>
                      <Button variant="contained" startIcon={<AssignmentIcon />} fullWidth>
                        人工派单
                      </Button>
                      <Button variant="outlined" startIcon={<WarningIcon />} color="warning" fullWidth>
                        状态异常干预
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                      <TrendingUpIcon sx={{ mr: 1 }} />
                      数据绩效
                    </Typography>
                    <Stack spacing={2}>
                      <Button
                        variant="contained"
                        startIcon={<LeaderboardIcon />}
                        onClick={() => setPerformanceOpen(true)}
                        fullWidth
                      >
                        绩效排行榜
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<AccountBalanceIcon />}
                        onClick={() => handleViewFinance('all')}
                        fullWidth
                      >
                        查看财务明细
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </>
        )}

        {/* 对话框组件 */}
        <Dialog open={riderDetailOpen} onClose={() => setRiderDetailOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>骑手详情 - {selectedRider?.name}</DialogTitle>
          <DialogContent>
            {selectedRider && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>基本信息</Typography>
                      <Stack spacing={2}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar src={selectedRider.avatar} sx={{ mr: 2, width: 60, height: 60 }}>
                            {selectedRider.name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="h6">{selectedRider.name}</Typography>
                            <Typography variant="body2" color="text.secondary">{selectedRider.phone}</Typography>
                            <Chip
                              label={getStatusText(selectedRider.status)}
                              sx={{ bgcolor: getStatusColor(selectedRider.status), color: 'white', mt: 1 }}
                              size="small"
                            />
                          </Box>
                        </Box>
                        <Divider />
                        <Typography><strong>评分:</strong> {selectedRider.rating}/5.0</Typography>
                        <Typography><strong>加入日期:</strong> {selectedRider.joinDate}</Typography>
                        <Typography><strong>今日订单:</strong> {selectedRider.todayOrders}</Typography>
                        <Typography><strong>今日收入:</strong> ¥{selectedRider.todayEarnings}</Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>实时位置</Typography>
                      {selectedRider.location ? (
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {selectedRider.location.address}
                          </Typography>
                          <Box sx={{ height: 200, bgcolor: 'grey.100', display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1 }}>
                            <Typography color="text.secondary">地图显示区域</Typography>
                          </Box>
                        </Box>
                      ) : (
                        <Alert severity="info">暂无位置信息</Alert>
                      )}
                    </CardContent>
                  </Card>
                  {selectedRider.currentTask && (
                    <Card sx={{ mt: 2 }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>当前任务</Typography>
                        <Stack spacing={1}>
                          <Typography><strong>任务类型:</strong> {selectedRider.currentTask.type === 'pickup' ? '取件' : '送件'}</Typography>
                          <Typography><strong>订单号:</strong> {selectedRider.currentTask.trackingNo}</Typography>
                          <Typography><strong>目的地:</strong> {selectedRider.currentTask.destination}</Typography>
                          <Typography><strong>预计时间:</strong> {selectedRider.currentTask.estimatedTime}分钟</Typography>
                        </Stack>
                      </CardContent>
                    </Card>
                  )}
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRiderDetailOpen(false)}>关闭</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={performanceOpen} onClose={() => setPerformanceOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>骑手绩效排行榜</DialogTitle>
          <DialogContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>排名</TableCell>
                    <TableCell>骑手</TableCell>
                    <TableCell>完成订单</TableCell>
                    <TableCell>收入</TableCell>
                    <TableCell>评分</TableCell>
                    <TableCell>操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {performanceLoading ? (
                    <TableRow>
                      <TableCell colSpan={6}><LinearProgress /></TableCell>
                    </TableRow>
                  ) : (
                    performanceData?.map((rider, index) => (
                      <TableRow key={rider.riderId}>
                        <TableCell>
                          <Badge badgeContent={index + 1} color={index < 3 ? 'primary' : 'default'}>
                            <LeaderboardIcon />
                          </Badge>
                        </TableCell>
                        <TableCell>{rider.riderName}</TableCell>
                        <TableCell>{rider.completedOrders}</TableCell>
                        <TableCell>¥{rider.earnings}</TableCell>
                        <TableCell>{rider.rating}</TableCell>
                        <TableCell>
                          <Button size="small" onClick={() => handleViewFinance(rider.riderId)}>
                            查看收入
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPerformanceOpen(false)}>关闭</Button>
          </DialogActions>
        </Dialog>

        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
          <MenuItem onClick={() => handleUpdateRiderStatus(selectedRider?.id || '', 'online')}>
            🟢 设为在线
          </MenuItem>
          <MenuItem onClick={() => handleUpdateRiderStatus(selectedRider?.id || '', 'offline')}>
            ⚫ 设为离线
          </MenuItem>
          <MenuItem onClick={() => handleUpdateRiderStatus(selectedRider?.id || '', 'break')}>
            🔵 设为休息
          </MenuItem>
          {selectedRider?.currentTask && (
            <MenuItem onClick={() => handleCompleteTask(selectedRider?.id || '')}>
              ✅ 完成当前任务
            </MenuItem>
          )}
          <Divider />
          <MenuItem onClick={() => handleViewFinance(selectedRider?.id || '')}>
            💰 查看收入明细
          </MenuItem>
        </Menu>
      </Container>
    </Box>
  );
};

export default CityTransport;
