import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Chip,
  Alert,
  Snackbar,
  Backdrop,
  CircularProgress,
  Tooltip,
  Grid,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Stack,
  Divider,
} from '@mui/material';
import {
  ArrowBack,
  Search,
  FilterList,
  Refresh,
  Download,
  Visibility,
  LocalShipping,
  Phone,
  LocationOn,
  Schedule,
  Person,
  Clear,
  Print,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import PremiumBackground from '../components/PremiumBackground';
import { useLanguage } from '../contexts/LanguageContext';

// 包裹订单接口（从直接下单获取）
interface CityPackage {
  id: string;
  orderId: string;
  
  // 寄件人信息
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  
  // 收件人信息
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  
  // 包裹信息
  packageType: string;
  weight: number;
  dimensions?: string;
  description?: string;
  
  // 服务信息
  serviceType: string;
  urgency: string;
  
  // 费用信息
  distance: number;
  calculatedPrice: number;
  finalPrice: number;
  
  // 状态信息
  status: string;
  createdAt: string;
  updatedAt: string;
  
  // 备注
  notes?: string;
}

// 通知状态
interface NotificationState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
}

// 过滤参数
interface FilterParams {
  searchText: string;
  statusFilter: string;
  serviceTypeFilter: string;
  urgencyFilter: string;
}

const AdminCityPackages: React.FC = () => {
  // 基础状态
  const [packages, setPackages] = useState<CityPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<CityPackage | null>(null);
  
  // UI状态
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  
  // 过滤状态
  const [filterParams, setFilterParams] = useState<FilterParams>({
    searchText: '',
    statusFilter: 'all',
    serviceTypeFilter: 'all',
    urgencyFilter: 'all',
  });
  
  // 通知状态
  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // Hooks
  const navigate = useNavigate();
  const { t } = useLanguage();
  const mountedRef = useRef(true);

  // 显示通知
  const showNotification = useCallback((message: string, severity: NotificationState['severity'] = 'info') => {
    if (!mountedRef.current) return;
    
    setNotification({
      open: true,
      message,
      severity,
    });
  }, []);

  // 关闭通知
  const handleCloseNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, open: false }));
  }, []);

  // 安全的localStorage操作
  const safeLocalStorageGet = useCallback((key: string, defaultValue: any = []) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`读取localStorage失败 [${key}]:`, error);
      return defaultValue;
    }
  }, []);

  // 加载同城包裹数据（从直接下单获取）
  const loadCityPackages = useCallback(async () => {
    if (!mountedRef.current) return;
    
    try {
      console.log('🔍 加载同城包裹数据...');
      
      // 从直接下单的数据中获取包裹信息（主要来源：courier_orders）
      const courierOrders = safeLocalStorageGet('courier_orders', []);
      
      console.log('📦 从localStorage读取订单数据:', courierOrders.length, '条记录');
      
      // 使用courier_orders作为主要数据源
      const allOrders = courierOrders;
      
      // 转换为同城包裹格式
      const cityPackages: CityPackage[] = allOrders.map((order: any, index: number) => ({
        id: order.id || `pkg_${Date.now()}_${index}`,
        orderId: order.orderId || order.orderNumber || `MDY${Date.now()}`,
        
        // 寄件人信息
        senderName: order.senderName || order.customerName || '未知寄件人',
        senderPhone: order.senderPhone || order.customerPhone || '未设置',
        senderAddress: order.senderAddress || '未设置',
        
        // 收件人信息
        receiverName: order.receiverName || '未知收件人',
        receiverPhone: order.receiverPhone || '未设置',
        receiverAddress: order.receiverAddress || '未设置',
        
        // 包裹信息
        packageType: order.packageType || '普通包裹',
        weight: Number(order.weight) || 0,
        dimensions: order.dimensions || '未设置',
        description: order.description || order.packageDescription || '',
        
        // 服务信息
        serviceType: order.serviceType || '标准配送',
        urgency: order.urgency || order.priority || '普通',
        
        // 费用信息
        distance: Number(order.distance) || Number(order.calculatedDistance) || 0,
        calculatedPrice: Number(order.calculatedPrice) || 0,
        finalPrice: Number(order.finalPrice) || Number(order.amount) || 0,
        
        // 状态信息
        status: order.status || '待确认',
        createdAt: order.createdAt || new Date().toISOString(),
        updatedAt: order.updatedAt || new Date().toISOString(),
        
        // 备注
        notes: order.notes || order.specialRequirements || '',
      }));
      
      if (mountedRef.current) {
        setPackages(cityPackages);
        console.log('✅ 同城包裹数据加载完成:', cityPackages.length, '个包裹');
        showNotification(`加载完成：${cityPackages.length} 个同城包裹`, 'success');
      }
    } catch (error) {
      console.error('❌ 加载同城包裹失败:', error);
      showNotification('加载包裹数据失败', 'error');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [safeLocalStorageGet, showNotification]);

  // 刷新数据
  const handleRefresh = useCallback(async () => {
    if (refreshing || !mountedRef.current) return;
    
    setRefreshing(true);
    
    try {
      await loadCityPackages();
      showNotification('数据刷新完成', 'success');
    } catch (error) {
      console.error('刷新数据失败:', error);
      showNotification('刷新失败，请重试', 'error');
    } finally {
      if (mountedRef.current) {
        setRefreshing(false);
      }
    }
  }, [refreshing, loadCityPackages, showNotification]);

  // 过滤包裹
  const filteredPackages = useMemo(() => {
    return packages.filter(pkg => {
      const matchesSearch = !filterParams.searchText || 
        pkg.orderId.toLowerCase().includes(filterParams.searchText.toLowerCase()) ||
        pkg.senderName.toLowerCase().includes(filterParams.searchText.toLowerCase()) ||
        pkg.receiverName.toLowerCase().includes(filterParams.searchText.toLowerCase()) ||
        pkg.senderPhone.includes(filterParams.searchText) ||
        pkg.receiverPhone.includes(filterParams.searchText);
      
      const matchesStatus = filterParams.statusFilter === 'all' || pkg.status === filterParams.statusFilter;
      const matchesServiceType = filterParams.serviceTypeFilter === 'all' || pkg.serviceType === filterParams.serviceTypeFilter;
      const matchesUrgency = filterParams.urgencyFilter === 'all' || pkg.urgency === filterParams.urgencyFilter;
      
      return matchesSearch && matchesStatus && matchesServiceType && matchesUrgency;
    });
  }, [packages, filterParams]);

  // 查看包裹详情
  const handleViewPackage = useCallback((pkg: CityPackage) => {
    try {
      console.log('🔍 查看包裹详情:', pkg.orderId);
      setSelectedPackage(pkg);
      setDetailDialogOpen(true);
    } catch (error) {
      console.error('查看包裹失败:', error);
      showNotification('查看包裹失败', 'error');
    }
  }, [showNotification]);

  // 更新过滤参数
  const updateFilterParams = useCallback((key: keyof FilterParams, value: string) => {
    setFilterParams(prev => ({ ...prev, [key]: value }));
  }, []);

  // 清除过滤条件
  const clearFilters = useCallback(() => {
    setFilterParams({
      searchText: '',
      statusFilter: 'all',
      serviceTypeFilter: 'all',
      urgencyFilter: 'all',
    });
  }, []);

  // 导出包裹数据
  const handleExportPackages = useCallback(() => {
    try {
      const dataStr = JSON.stringify(filteredPackages, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `city_packages_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      showNotification('包裹数据导出成功', 'success');
    } catch (error) {
      console.error('导出失败:', error);
      showNotification('导出包裹数据失败', 'error');
    }
  }, [filteredPackages, showNotification]);

  // 获取状态颜色
  const getStatusColor = useCallback((status: string) => {
    const statusColors: Record<string, string> = {
      '待确认': '#faad14',
      '已确认': '#1890ff',
      '已取件': '#722ed1',
      '运输中': '#13c2c2',
      '派送中': '#52c41a',
      '已送达': '#389e0d',
      '已取消': '#f5222d',
      '已退回': '#fa541c',
    };
    return statusColors[status] || '#666666';
  }, []);

  // 获取紧急程度颜色
  const getUrgencyColor = useCallback((urgency: string) => {
    const urgencyColors: Record<string, string> = {
      '普通': '#52c41a',
      '加急': '#faad14',
      '特急': '#f5222d',
      '标准': '#1890ff',
    };
    return urgencyColors[urgency] || '#666666';
  }, []);

  // 组件挂载时加载数据
  useEffect(() => {
    mountedRef.current = true;
    loadCityPackages();
    
    // 设置自动刷新（每2分钟）
    const interval = setInterval(() => {
      if (mountedRef.current) {
        loadCityPackages();
      }
    }, 2 * 60 * 1000);
    
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [loadCityPackages]);

  // 渲染加载状态
  if (loading) {
    return (
      <PremiumBackground variant="admin" minHeight="100vh">
        <Backdrop open={loading} sx={{ color: '#fff', zIndex: 9999 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <CircularProgress color="inherit" size={60} />
            <Typography variant="h6" sx={{ color: 'white' }}>
              正在加载同城包裹数据...
            </Typography>
          </Box>
        </Backdrop>
      </PremiumBackground>
    );
  }

  return (
    <PremiumBackground variant="admin" minHeight="100vh">
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* 页面头部 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={() => navigate('/admin/dashboard')}
              sx={{
                color: 'white',
                borderColor: 'rgba(255,255,255,0.3)',
                '&:hover': {
                  borderColor: 'white',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                },
              }}
            >
              返回管理中心
            </Button>
            <Box>
              <Typography variant="h4" sx={{ color: 'white', fontWeight: 600 }}>
                📦 同城包裹管理
              </Typography>
              <Typography variant="subtitle1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                管理所有直接下单的同城包裹
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleExportPackages}
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
            >
              导出数据
            </Button>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={handleRefresh}
              disabled={refreshing}
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
            >
              {refreshing ? '刷新中...' : '刷新'}
            </Button>
          </Box>
        </Box>

        {/* 统计卡片 */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                color: 'white',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                      {packages.length}
                    </Typography>
                    <Typography variant="body2">
                      总包裹数
                    </Typography>
                  </Box>
                  <LocalShipping sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #faad14 0%, #fa8c16 100%)',
                color: 'white',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                      {packages.filter(pkg => ['待确认', '已确认', '运输中'].includes(pkg.status)).length}
                    </Typography>
                    <Typography variant="body2">
                      待处理
                    </Typography>
                  </Box>
                  <Schedule sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
                color: 'white',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                      {packages.filter(pkg => pkg.status === '已送达').length}
                    </Typography>
                    <Typography variant="body2">
                      已送达
                    </Typography>
                  </Box>
                  <LocalShipping sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)',
                color: 'white',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                      {(packages.reduce((sum, pkg) => sum + pkg.finalPrice, 0) / 1000).toFixed(1)}K
                    </Typography>
                    <Typography variant="body2">
                      总金额 (MMK)
                    </Typography>
                  </Box>
                  <LocalShipping sx={{ fontSize: 40, opacity: 0.8 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* 搜索和过滤 */}
        <Card
          sx={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '16px',
            mb: 3,
          }}
        >
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  placeholder="搜索订单号、姓名、电话..."
                  value={filterParams.searchText}
                  onChange={(e) => updateFilterParams('searchText', e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ color: 'rgba(255,255,255,0.7)' }} />
                      </InputAdornment>
                    ),
                    endAdornment: filterParams.searchText && (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => updateFilterParams('searchText', '')}
                          sx={{ color: 'rgba(255,255,255,0.7)' }}
                        >
                          <Clear fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                    sx: {
                      color: 'white',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255,255,255,0.3)',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255,255,255,0.5)',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#1976d2',
                      },
                    },
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>状态</InputLabel>
                  <Select
                    value={filterParams.statusFilter}
                    onChange={(e) => updateFilterParams('statusFilter', e.target.value)}
                    sx={{
                      color: 'white',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255,255,255,0.3)',
                      },
                      '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.7)' },
                    }}
                  >
                    <MenuItem value="all">全部状态</MenuItem>
                    <MenuItem value="待确认">待确认</MenuItem>
                    <MenuItem value="已确认">已确认</MenuItem>
                    <MenuItem value="运输中">运输中</MenuItem>
                    <MenuItem value="派送中">派送中</MenuItem>
                    <MenuItem value="已送达">已送达</MenuItem>
                    <MenuItem value="已取消">已取消</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>服务类型</InputLabel>
                  <Select
                    value={filterParams.serviceTypeFilter}
                    onChange={(e) => updateFilterParams('serviceTypeFilter', e.target.value)}
                    sx={{
                      color: 'white',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255,255,255,0.3)',
                      },
                      '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.7)' },
                    }}
                  >
                    <MenuItem value="all">全部服务</MenuItem>
                    <MenuItem value="标准配送">标准配送</MenuItem>
                    <MenuItem value="快速配送">快速配送</MenuItem>
                    <MenuItem value="当日达">当日达</MenuItem>
                    <MenuItem value="次日达">次日达</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>紧急程度</InputLabel>
                  <Select
                    value={filterParams.urgencyFilter}
                    onChange={(e) => updateFilterParams('urgencyFilter', e.target.value)}
                    sx={{
                      color: 'white',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255,255,255,0.3)',
                      },
                      '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.7)' },
                    }}
                  >
                    <MenuItem value="all">全部</MenuItem>
                    <MenuItem value="普通">普通</MenuItem>
                    <MenuItem value="加急">加急</MenuItem>
                    <MenuItem value="特急">特急</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    startIcon={<Clear />}
                    onClick={clearFilters}
                    sx={{
                      color: 'rgba(255,255,255,0.7)',
                      borderColor: 'rgba(255,255,255,0.3)',
                      minWidth: '80px',
                    }}
                  >
                    清除
                  </Button>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: 'rgba(255,255,255,0.7)', 
                      display: 'flex', 
                      alignItems: 'center',
                      minWidth: '120px',
                    }}
                  >
                    显示 {filteredPackages.length} / {packages.length}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* 包裹列表 */}
        <Card
          sx={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '16px',
          }}
        >
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                      订单信息
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                      寄件人
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                      收件人
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                      包裹信息
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                      服务类型
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                      状态
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                      金额
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                      操作
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPackages.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4 }}>
                        <Typography sx={{ color: 'rgba(255,255,255,0.7)' }}>
                          {packages.length === 0 ? '暂无同城包裹数据' : '没有找到匹配的包裹'}
                        </Typography>
                        {packages.length === 0 && (
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block', mt: 1 }}>
                            包裹数据来自客户端"直接下单"功能
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPackages.map((pkg) => (
                      <TableRow key={pkg.id} hover>
                        {/* 订单信息 */}
                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                          <Box>
                            <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
                              {pkg.orderId}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                              {new Date(pkg.createdAt).toLocaleDateString('zh-CN')} {new Date(pkg.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                              <Chip
                                label={pkg.urgency}
                                size="small"
                                sx={{
                                  backgroundColor: getUrgencyColor(pkg.urgency),
                                  color: 'white',
                                  fontSize: '10px',
                                  height: 20,
                                }}
                              />
                            </Box>
                          </Box>
                        </TableCell>

                        {/* 寄件人 */}
                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 32, height: 32, backgroundColor: '#1976d2' }}>
                              <Person sx={{ fontSize: 18 }} />
                            </Avatar>
                            <Box>
                              <Typography variant="body2" sx={{ color: 'white' }}>
                                {pkg.senderName}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                {pkg.senderPhone}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>

                        {/* 收件人 */}
                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 32, height: 32, backgroundColor: '#52c41a' }}>
                              <Person sx={{ fontSize: 18 }} />
                            </Avatar>
                            <Box>
                              <Typography variant="body2" sx={{ color: 'white' }}>
                                {pkg.receiverName}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                {pkg.receiverPhone}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>

                        {/* 包裹信息 */}
                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                          <Box>
                            <Typography variant="body2" sx={{ color: 'white' }}>
                              {pkg.packageType}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                              {pkg.weight}kg | {pkg.distance.toFixed(1)}km
                            </Typography>
                            {pkg.description && (
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block' }}>
                                {pkg.description.length > 20 ? pkg.description.substring(0, 20) + '...' : pkg.description}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>

                        {/* 服务类型 */}
                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                          <Chip
                            label={pkg.serviceType}
                            size="small"
                            sx={{
                              backgroundColor: 'rgba(25, 118, 210, 0.2)',
                              color: '#42a5f5',
                              border: '1px solid rgba(66, 165, 245, 0.3)',
                            }}
                          />
                        </TableCell>

                        {/* 状态 */}
                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                          <Chip
                            label={pkg.status}
                            size="small"
                            sx={{
                              backgroundColor: getStatusColor(pkg.status),
                              color: 'white',
                              fontWeight: 600,
                            }}
                          />
                        </TableCell>

                        {/* 金额 */}
                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                          <Box>
                            <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
                              {pkg.finalPrice.toLocaleString()} MMK
                            </Typography>
                            {pkg.calculatedPrice !== pkg.finalPrice && (
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'line-through' }}>
                                {pkg.calculatedPrice.toLocaleString()} MMK
                              </Typography>
                            )}
                          </Box>
                        </TableCell>

                        {/* 操作 */}
                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="查看详情">
                              <IconButton
                                size="small"
                                onClick={() => handleViewPackage(pkg)}
                                sx={{
                                  color: '#42a5f5',
                                  '&:hover': { backgroundColor: 'rgba(66, 165, 245, 0.1)' },
                                }}
                              >
                                <Visibility fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            
                            <Tooltip title="打印标签">
                              <IconButton
                                size="small"
                                onClick={() => showNotification('打印功能开发中', 'info')}
                                sx={{
                                  color: '#faad14',
                                  '&:hover': { backgroundColor: 'rgba(250, 173, 20, 0.1)' },
                                }}
                              >
                                <Print fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* 包裹详情对话框 */}
        <Dialog
          open={detailDialogOpen}
          onClose={() => setDetailDialogOpen(false)}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: {
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '16px',
              color: 'white',
              maxHeight: '90vh',
            },
          }}
        >
          <DialogTitle
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <LocalShipping sx={{ color: '#1976d2', fontSize: 28 }} />
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 600, color: 'white' }}>
                  同城包裹详情
                </Typography>
                <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  {selectedPackage?.orderId}
                </Typography>
              </Box>
            </Box>
          </DialogTitle>

          <DialogContent sx={{ p: 3 }}>
            {selectedPackage && (
              <Grid container spacing={3}>
                {/* 寄件人信息 */}
                <Grid item xs={12} md={6}>
                  <Card
                    sx={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                    }}
                  >
                    <CardContent>
                      <Typography variant="h6" sx={{ color: 'white', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Person sx={{ color: '#1976d2' }} />
                        寄件人信息
                      </Typography>
                      <Stack spacing={1}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', minWidth: '60px' }}>
                            姓名:
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'white', fontWeight: 500 }}>
                            {selectedPackage.senderName}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Phone sx={{ fontSize: 16, color: 'rgba(255,255,255,0.7)' }} />
                          <Typography variant="body2" sx={{ color: 'white' }}>
                            {selectedPackage.senderPhone}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                          <LocationOn sx={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', mt: 0.2 }} />
                          <Typography variant="body2" sx={{ color: 'white', lineHeight: 1.4 }}>
                            {selectedPackage.senderAddress}
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                {/* 收件人信息 */}
                <Grid item xs={12} md={6}>
                  <Card
                    sx={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                    }}
                  >
                    <CardContent>
                      <Typography variant="h6" sx={{ color: 'white', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Person sx={{ color: '#52c41a' }} />
                        收件人信息
                      </Typography>
                      <Stack spacing={1}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', minWidth: '60px' }}>
                            姓名:
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'white', fontWeight: 500 }}>
                            {selectedPackage.receiverName}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Phone sx={{ fontSize: 16, color: 'rgba(255,255,255,0.7)' }} />
                          <Typography variant="body2" sx={{ color: 'white' }}>
                            {selectedPackage.receiverPhone}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                          <LocationOn sx={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', mt: 0.2 }} />
                          <Typography variant="body2" sx={{ color: 'white', lineHeight: 1.4 }}>
                            {selectedPackage.receiverAddress}
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                {/* 包裹和服务信息 */}
                <Grid item xs={12}>
                  <Card
                    sx={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                    }}
                  >
                    <CardContent>
                      <Typography variant="h6" sx={{ color: 'white', mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocalShipping sx={{ color: '#faad14' }} />
                        包裹和服务信息
                      </Typography>
                      <Grid container spacing={3}>
                        <Grid item xs={12} md={3}>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                            包裹类型
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'white', fontWeight: 500 }}>
                            {selectedPackage.packageType}
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                            重量
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'white', fontWeight: 500 }}>
                            {selectedPackage.weight} kg
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                            距离
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'white', fontWeight: 500 }}>
                            {selectedPackage.distance.toFixed(1)} km
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                            服务类型
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'white', fontWeight: 500 }}>
                            {selectedPackage.serviceType}
                          </Typography>
                        </Grid>
                        {selectedPackage.description && (
                          <Grid item xs={12}>
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                              包裹描述
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'white', fontWeight: 500 }}>
                              {selectedPackage.description}
                            </Typography>
                          </Grid>
                        )}
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                {/* 费用信息 */}
                <Grid item xs={12}>
                  <Card
                    sx={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                    }}
                  >
                    <CardContent>
                      <Typography variant="h6" sx={{ color: 'white', mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                        💰 费用信息
                      </Typography>
                      <Grid container spacing={3}>
                        <Grid item xs={12} md={4}>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                            计算价格
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'white', fontWeight: 500 }}>
                            {selectedPackage.calculatedPrice.toLocaleString()} MMK
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                            最终价格
                          </Typography>
                          <Typography variant="h6" sx={{ color: '#52c41a', fontWeight: 600 }}>
                            {selectedPackage.finalPrice.toLocaleString()} MMK
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                            状态
                          </Typography>
                          <Chip
                            label={selectedPackage.status}
                            sx={{
                              backgroundColor: getStatusColor(selectedPackage.status),
                              color: 'white',
                              fontWeight: 600,
                            }}
                          />
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </DialogContent>

          <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <Button
              variant="outlined"
              onClick={() => setDetailDialogOpen(false)}
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
            >
              关闭
            </Button>
            <Button
              variant="contained"
              startIcon={<Print />}
              onClick={() => showNotification('打印功能开发中', 'info')}
              sx={{
                background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
              }}
            >
              打印包裹单
            </Button>
          </DialogActions>
        </Dialog>

        {/* 通知组件 */}
        <Snackbar
          open={notification.open}
          autoHideDuration={4000}
          onClose={handleCloseNotification}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert
            onClose={handleCloseNotification}
            severity={notification.severity}
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      </Container>
    </PremiumBackground>
  );
};

export default AdminCityPackages;
