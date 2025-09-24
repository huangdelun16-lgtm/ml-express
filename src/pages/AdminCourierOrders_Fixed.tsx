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
  IconButton,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Chip,
  Alert,
  Snackbar,
  Backdrop,
  CircularProgress,
  Tooltip,
  Grid,
  Divider,
} from '@mui/material';
import {
  Visibility,
  Edit,
  ArrowBack,
  Add,
  Search,
  FilterList,
  Refresh,
  Download,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import PremiumBackground from '../components/PremiumBackground';
import { useLanguage } from '../contexts/LanguageContext';
import { generateOrderId, OrderData } from '../utils/orderUtils';

// 订单接口定义
interface Order {
  id: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  receiverName: string;
  receiverPhone: string;
  packageType: string;
  weight: number;
  amount: number;
  status: string;
  courierId?: string;
  courierName?: string;
  courierPhone?: string;
  createdAt: string;
  updatedAt: string;
}

// 快递员接口
interface Courier {
  id: string;
  name: string;
  phone: string;
  workId: string;
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
  courierFilter: string;
}

const AdminCourierOrders: React.FC = () => {
  // 基础状态
  const [orders, setOrders] = useState<Order[]>([]);
  const [availableCouriers, setAvailableCouriers] = useState<Courier[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // UI状态
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // 过滤状态
  const [filterParams, setFilterParams] = useState<FilterParams>({
    searchText: '',
    statusFilter: 'all',
    courierFilter: 'all',
  });
  
  // 编辑状态
  const [editOrderData, setEditOrderData] = useState({
    customerName: '',
    customerPhone: '',
    receiverName: '',
    receiverPhone: '',
    packageType: '',
    weight: 0,
    amount: 0,
    status: '',
    courierId: '',
    courierName: '',
    courierPhone: '',
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
  const abortControllerRef = useRef<AbortController | null>(null);

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

  const safeLocalStorageSet = useCallback((key: string, value: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`保存localStorage失败 [${key}]:`, error);
      showNotification(`数据保存失败: ${key}`, 'error');
      return false;
    }
  }, [showNotification]);

  // 加载订单数据
  const loadOrders = useCallback(async () => {
    if (!mountedRef.current) return;
    
    try {
      const ordersData = safeLocalStorageGet('courier_orders', []);
      const validOrders = Array.isArray(ordersData) ? ordersData : [];
      
      if (mountedRef.current) {
        setOrders(validOrders);
        console.log('✅ 订单数据加载完成:', validOrders.length, '条订单');
      }
    } catch (error) {
      console.error('❌ 加载订单失败:', error);
      showNotification('加载订单数据失败', 'error');
    }
  }, [safeLocalStorageGet, showNotification]);

  // 加载快递员数据
  const loadCouriers = useCallback(async () => {
    if (!mountedRef.current) return;
    
    try {
      const employeesData = safeLocalStorageGet('company_employees', []);
      const courierEmployees = employeesData
        .filter((emp: any) => emp.role === 'employee' && emp.status === 'active')
        .map((emp: any) => ({
          id: emp.workId || emp.id,
          name: emp.name || emp.username,
          phone: emp.phone || '未设置',
          workId: emp.workId || 'N/A',
        }));
      
      if (mountedRef.current) {
        setAvailableCouriers(courierEmployees);
        console.log('✅ 快递员数据加载完成:', courierEmployees.length, '名快递员');
      }
    } catch (error) {
      console.error('❌ 加载快递员失败:', error);
      showNotification('加载快递员数据失败', 'error');
    }
  }, [safeLocalStorageGet, showNotification]);

  // 加载所有数据
  const loadAllData = useCallback(async () => {
    if (!mountedRef.current) return;
    
    setLoading(true);
    
    try {
      // 取消之前的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // 创建新的AbortController
      abortControllerRef.current = new AbortController();
      
      // 并行加载数据
      await Promise.allSettled([
        loadOrders(),
        loadCouriers(),
      ]);
      
      if (mountedRef.current) {
        showNotification('数据加载完成', 'success');
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('请求被取消');
        return;
      }
      
      console.error('加载数据失败:', error);
      if (mountedRef.current) {
        showNotification('数据加载失败，请重试', 'error');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [loadOrders, loadCouriers, showNotification]);

  // 刷新数据
  const handleRefresh = useCallback(async () => {
    if (refreshing || !mountedRef.current) return;
    
    setRefreshing(true);
    
    try {
      await loadAllData();
      showNotification('数据刷新完成', 'success');
    } catch (error) {
      console.error('刷新数据失败:', error);
      showNotification('刷新失败，请重试', 'error');
    } finally {
      if (mountedRef.current) {
        setRefreshing(false);
      }
    }
  }, [refreshing, loadAllData, showNotification]);

  // 过滤订单
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = !filterParams.searchText || 
        order.orderId.toLowerCase().includes(filterParams.searchText.toLowerCase()) ||
        order.customerName.toLowerCase().includes(filterParams.searchText.toLowerCase()) ||
        order.receiverName.toLowerCase().includes(filterParams.searchText.toLowerCase()) ||
        order.customerPhone.includes(filterParams.searchText) ||
        order.receiverPhone.includes(filterParams.searchText);
      
      const matchesStatus = filterParams.statusFilter === 'all' || order.status === filterParams.statusFilter;
      const matchesCourier = filterParams.courierFilter === 'all' || order.courierId === filterParams.courierFilter;
      
      return matchesSearch && matchesStatus && matchesCourier;
    });
  }, [orders, filterParams]);

  // 查看订单详情
  const handleViewOrder = useCallback((order: Order) => {
    try {
      console.log('🔍 查看订单详情:', order.orderId);
      setSelectedOrder(order);
      setDetailDialogOpen(true);
      showNotification(`查看订单 ${order.orderId} 详情`, 'info');
    } catch (error) {
      console.error('查看订单失败:', error);
      showNotification('查看订单失败', 'error');
    }
  }, [showNotification]);

  // 编辑订单
  const handleEditOrder = useCallback((order: Order) => {
    try {
      console.log('✏️ 编辑订单:', order.orderId);
      setSelectedOrder(order);
      setEditOrderData({
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        receiverName: order.receiverName,
        receiverPhone: order.receiverPhone,
        packageType: order.packageType,
        weight: order.weight,
        amount: order.amount,
        status: order.status,
        courierId: order.courierId || '',
        courierName: order.courierName || '',
        courierPhone: order.courierPhone || '',
      });
      setEditDialogOpen(true);
    } catch (error) {
      console.error('编辑订单失败:', error);
      showNotification('编辑订单失败', 'error');
    }
  }, [showNotification]);

  // 保存订单编辑
  const handleSaveOrder = useCallback(async () => {
    if (!selectedOrder || !mountedRef.current) return;
    
    try {
      const updatedOrder: Order = {
        ...selectedOrder,
        ...editOrderData,
        updatedAt: new Date().toISOString(),
      };
      
      const updatedOrders = orders.map(order =>
        order.id === selectedOrder.id ? updatedOrder : order
      );
      
      // 保存到状态
      setOrders(updatedOrders);
      
      // 保存到localStorage
      const success = safeLocalStorageSet('courier_orders', updatedOrders);
      
      if (success) {
        setEditDialogOpen(false);
        setSelectedOrder(null);
        showNotification(`订单 ${selectedOrder.orderId} 更新成功`, 'success');
      }
    } catch (error) {
      console.error('保存订单失败:', error);
      showNotification('保存订单失败，请重试', 'error');
    }
  }, [selectedOrder, orders, editOrderData, safeLocalStorageSet, showNotification]);

  // 删除订单（增强版）
  const handleDeleteOrder = useCallback(async (order: Order) => {
    if (!mountedRef.current) return;
    
    try {
      console.log('🗑️ 删除整个订单被点击，订单:', order.orderId);
      
      // 设置要删除的订单
      setSelectedOrder(order);
      setDeleteDialogOpen(true);
    } catch (error) {
      console.error('删除订单失败:', error);
      showNotification('删除订单失败', 'error');
    }
  }, [showNotification]);

  // 确认删除订单
  const confirmDeleteOrder = useCallback(async () => {
    if (!selectedOrder || !mountedRef.current) return;
    
    try {
      console.log('🔥 开始永久删除整个订单:', selectedOrder.orderId);
      
      // 1. 从当前状态中移除订单
      const updatedOrders = orders.filter(o => 
        o.id !== selectedOrder.id && o.orderId !== selectedOrder.orderId
      );
      
      // 2. 保存到localStorage
      const success = safeLocalStorageSet('courier_orders', updatedOrders);
      
      if (success) {
        setOrders(updatedOrders);
        
        // 3. 清理相关缓存数据
        const cacheKeys = [
          `order_${selectedOrder.orderId}`,
          `order_details_${selectedOrder.orderId}`,
          `order_status_${selectedOrder.orderId}`,
          `order_tracking_${selectedOrder.orderId}`,
        ];
        
        cacheKeys.forEach(key => {
          try {
            localStorage.removeItem(key);
            console.log('🧹 清理缓存:', key);
          } catch (error) {
            console.warn('清理缓存失败:', key, error);
          }
        });
        
        // 4. 清理其他相关数据
        try {
          // 清理财务记录
          const financeData = safeLocalStorageGet('finance_records', []);
          const updatedFinanceData = financeData.filter((record: any) => 
            record.orderId !== selectedOrder.orderId
          );
          safeLocalStorageSet('finance_records', updatedFinanceData);
          
          // 清理包裹数据
          const packageData = safeLocalStorageGet('packages', []);
          const updatedPackageData = packageData.filter((pkg: any) => 
            pkg.orderId !== selectedOrder.orderId
          );
          safeLocalStorageSet('packages', updatedPackageData);
          
          console.log('💰 清理财务和包裹数据完成');
        } catch (cleanupError) {
          console.warn('⚠️ 清理相关数据时出现警告:', cleanupError);
        }
        
        // 关闭对话框
        setDeleteDialogOpen(false);
        setSelectedOrder(null);
        
        showNotification(`订单 ${selectedOrder.orderId} 已完全删除`, 'success');
        console.log('🎉 订单完全删除成功:', selectedOrder.orderId);
      }
    } catch (error) {
      console.error('❌ 删除订单失败:', error);
      showNotification(`删除订单失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error');
    }
  }, [selectedOrder, orders, safeLocalStorageSet, safeLocalStorageGet, showNotification]);

  // 创建测试订单
  const handleCreateTestOrder = useCallback(async () => {
    if (!mountedRef.current) return;
    
    try {
      console.log('创建测试订单');
      
      const newOrder: Order = {
        id: `order_${Date.now()}`,
        orderId: generateOrderId(),
        customerName: `客户${Math.floor(Math.random() * 1000)}`,
        customerPhone: `09${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`,
        receiverName: `收件人${Math.floor(Math.random() * 1000)}`,
        receiverPhone: `09${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`,
        packageType: ['文件', '包裹', '礼品', '电子产品'][Math.floor(Math.random() * 4)],
        weight: Math.round((Math.random() * 10 + 0.5) * 10) / 10,
        amount: Math.round(Math.random() * 50000 + 5000),
        status: '待确认',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const updatedOrders = [newOrder, ...orders];
      const success = safeLocalStorageSet('courier_orders', updatedOrders);
      
      if (success) {
        setOrders(updatedOrders);
        showNotification(`测试订单 ${newOrder.orderId} 创建成功`, 'success');
      }
    } catch (error) {
      console.error('创建测试订单失败:', error);
      showNotification('创建测试订单失败', 'error');
    }
  }, [orders, safeLocalStorageSet, showNotification]);

  // 更新过滤参数
  const updateFilterParams = useCallback((key: keyof FilterParams, value: string) => {
    setFilterParams(prev => ({ ...prev, [key]: value }));
  }, []);

  // 导出订单数据
  const handleExportOrders = useCallback(() => {
    try {
      const dataStr = JSON.stringify(filteredOrders, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `orders_${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      showNotification('订单数据导出成功', 'success');
    } catch (error) {
      console.error('导出失败:', error);
      showNotification('导出订单数据失败', 'error');
    }
  }, [filteredOrders, showNotification]);

  // 组件挂载时加载数据
  useEffect(() => {
    mountedRef.current = true;
    loadAllData();
    
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadAllData]);

  // 渲染加载状态
  if (loading) {
    return (
      <PremiumBackground variant="admin" minHeight="100vh">
        <Backdrop open={loading} sx={{ color: '#fff', zIndex: 9999 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <CircularProgress color="inherit" size={60} />
            <Typography variant="h6" sx={{ color: 'white' }}>
              正在加载订单数据...
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
            <Typography variant="h4" sx={{ color: 'white', fontWeight: 600 }}>
              订单管理
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleCreateTestOrder}
              sx={{
                background: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
                '&:hover': { background: 'linear-gradient(135deg, #389e0d 0%, #237804 100%)' },
              }}
            >
              新建订单
            </Button>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleExportOrders}
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
            >
              导出
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
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  placeholder="搜索订单号、客户姓名、电话..."
                  value={filterParams.searchText}
                  onChange={(e) => updateFilterParams('searchText', e.target.value)}
                  InputProps={{
                    startAdornment: <Search sx={{ color: 'rgba(255,255,255,0.7)', mr: 1 }} />,
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
              
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>订单状态</InputLabel>
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
              
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>快递员</InputLabel>
                  <Select
                    value={filterParams.courierFilter}
                    onChange={(e) => updateFilterParams('courierFilter', e.target.value)}
                    sx={{
                      color: 'white',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255,255,255,0.3)',
                      },
                      '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.7)' },
                    }}
                  >
                    <MenuItem value="all">全部快递员</MenuItem>
                    {availableCouriers.map((courier) => (
                      <MenuItem key={courier.id} value={courier.id}>
                        {courier.name} ({courier.workId})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={2}>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>
                  显示 {filteredOrders.length} / {orders.length} 条订单
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* 订单列表 */}
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
                      订单号
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
                      金额
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                      状态
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                      快递员
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                      操作
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4 }}>
                        <Typography sx={{ color: 'rgba(255,255,255,0.7)' }}>
                          {orders.length === 0 ? '暂无订单数据' : '没有找到匹配的订单'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => (
                      <TableRow key={order.id} hover>
                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                          <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
                            {order.orderId}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                            {new Date(order.createdAt).toLocaleDateString('zh-CN')}
                          </Typography>
                        </TableCell>
                        
                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                          <Typography variant="body2" sx={{ color: 'white' }}>
                            {order.customerName}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                            {order.customerPhone}
                          </Typography>
                        </TableCell>
                        
                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                          <Typography variant="body2" sx={{ color: 'white' }}>
                            {order.receiverName}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                            {order.receiverPhone}
                          </Typography>
                        </TableCell>
                        
                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                          <Typography variant="body2" sx={{ color: 'white' }}>
                            {order.packageType}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                            {order.weight}kg
                          </Typography>
                        </TableCell>
                        
                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                          <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
                            {order.amount.toLocaleString()} MMK
                          </Typography>
                        </TableCell>
                        
                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                          <Chip
                            label={order.status}
                            size="small"
                            sx={{
                              backgroundColor: order.status === '已送达' ? '#52c41a' : 
                                             order.status === '待确认' ? '#faad14' : '#1890ff',
                              color: 'white',
                              fontWeight: 600,
                            }}
                          />
                        </TableCell>
                        
                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                          {order.courierName ? (
                            <Box>
                              <Typography variant="body2" sx={{ color: 'white' }}>
                                {order.courierName}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                {order.courierPhone}
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                              未分配
                            </Typography>
                          )}
                        </TableCell>
                        
                        <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="查看详情">
                              <IconButton
                                size="small"
                                onClick={() => handleViewOrder(order)}
                                sx={{
                                  color: '#42a5f5',
                                  '&:hover': { backgroundColor: 'rgba(66, 165, 245, 0.1)' },
                                }}
                              >
                                <Visibility fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            
                            <Tooltip title="编辑订单">
                              <IconButton
                                size="small"
                                onClick={() => handleEditOrder(order)}
                                sx={{
                                  color: '#faad14',
                                  '&:hover': { backgroundColor: 'rgba(250, 173, 20, 0.1)' },
                                }}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            
                            <Tooltip title="删除订单">
                              <Button 
                                size="small"
                                variant="outlined"
                                onClick={() => handleDeleteOrder(order)}
                                sx={{ 
                                  color: '#f5222d',
                                  borderColor: '#f5222d',
                                  minWidth: '70px',
                                  height: '32px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  borderWidth: '2px',
                                  '&:hover': {
                                    backgroundColor: 'rgba(245, 34, 45, 0.15)',
                                    borderColor: '#ff4d4f',
                                    transform: 'scale(1.05)',
                                  },
                                  '&:active': { transform: 'scale(0.95)' },
                                  transition: 'all 0.2s ease',
                                }}
                              >
                                🗑️ 删除
                              </Button>
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

        {/* 订单详情对话框 */}
        <Dialog
          open={detailDialogOpen}
          onClose={() => setDetailDialogOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '16px',
              color: 'white',
            },
          }}
        >
          <DialogTitle>
            订单详情 - {selectedOrder?.orderId}
          </DialogTitle>
          <DialogContent>
            {selectedOrder && (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                    寄件人信息
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    姓名: {selectedOrder.customerName}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    电话: {selectedOrder.customerPhone}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                    收件人信息
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    姓名: {selectedOrder.receiverName}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    电话: {selectedOrder.receiverPhone}
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.2)' }} />
                  <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                    包裹信息
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    类型: {selectedOrder.packageType} | 重量: {selectedOrder.weight}kg | 金额: {selectedOrder.amount.toLocaleString()} MMK
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 1 }}>
                    状态: {selectedOrder.status}
                  </Typography>
                  {selectedOrder.courierName && (
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 1 }}>
                      快递员: {selectedOrder.courierName} ({selectedOrder.courierPhone})
                    </Typography>
                  )}
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailDialogOpen(false)} sx={{ color: 'white' }}>
              关闭
            </Button>
          </DialogActions>
        </Dialog>

        {/* 编辑订单对话框 */}
        <Dialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '16px',
              color: 'white',
            },
          }}
        >
          <DialogTitle>
            编辑订单 - {selectedOrder?.orderId}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="客户姓名"
                  value={editOrderData.customerName}
                  onChange={(e) => setEditOrderData(prev => ({ ...prev, customerName: e.target.value }))}
                  InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.7)' } }}
                  InputProps={{
                    sx: {
                      color: 'white',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255,255,255,0.3)',
                      },
                    },
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="客户电话"
                  value={editOrderData.customerPhone}
                  onChange={(e) => setEditOrderData(prev => ({ ...prev, customerPhone: e.target.value }))}
                  InputLabelProps={{ sx: { color: 'rgba(255,255,255,0.7)' } }}
                  InputProps={{
                    sx: {
                      color: 'white',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255,255,255,0.3)',
                      },
                    },
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>订单状态</InputLabel>
                  <Select
                    value={editOrderData.status}
                    onChange={(e) => setEditOrderData(prev => ({ ...prev, status: e.target.value }))}
                    sx={{
                      color: 'white',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255,255,255,0.3)',
                      },
                      '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.7)' },
                    }}
                  >
                    <MenuItem value="待确认">待确认</MenuItem>
                    <MenuItem value="已确认">已确认</MenuItem>
                    <MenuItem value="运输中">运输中</MenuItem>
                    <MenuItem value="派送中">派送中</MenuItem>
                    <MenuItem value="已送达">已送达</MenuItem>
                    <MenuItem value="已取消">已取消</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>分配快递员</InputLabel>
                  <Select
                    value={editOrderData.courierId}
                    onChange={(e) => {
                      const courier = availableCouriers.find(c => c.id === e.target.value);
                      setEditOrderData(prev => ({
                        ...prev,
                        courierId: e.target.value,
                        courierName: courier?.name || '',
                        courierPhone: courier?.phone || '',
                      }));
                    }}
                    sx={{
                      color: 'white',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255,255,255,0.3)',
                      },
                      '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.7)' },
                    }}
                  >
                    <MenuItem value="">未分配</MenuItem>
                    {availableCouriers.map((courier) => (
                      <MenuItem key={courier.id} value={courier.id}>
                        {courier.name} ({courier.workId})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)} sx={{ color: 'white' }}>
              取消
            </Button>
            <Button 
              onClick={handleSaveOrder}
              variant="contained"
              sx={{
                background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
              }}
            >
              保存
            </Button>
          </DialogActions>
        </Dialog>

        {/* 删除确认对话框 */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '16px',
              color: 'white',
            },
          }}
        >
          <DialogTitle sx={{ color: '#f5222d' }}>
            ⚠️ 确认删除订单
          </DialogTitle>
          <DialogContent>
            {selectedOrder && (
              <Box>
                <Alert severity="warning" sx={{ mb: 2, backgroundColor: 'rgba(255, 193, 7, 0.1)' }}>
                  此操作将完全移除订单及所有相关数据，删除后无法恢复！
                </Alert>
                
                <Typography variant="body1" sx={{ color: 'white', mb: 2 }}>
                  确定要删除以下订单吗？
                </Typography>
                
                <Box sx={{ p: 2, backgroundColor: 'rgba(245, 34, 45, 0.1)', borderRadius: 2 }}>
                  <Typography variant="body2" sx={{ color: 'white' }}>
                    📦 订单号: {selectedOrder.orderId}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'white' }}>
                    👤 客户: {selectedOrder.customerName}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'white' }}>
                    💰 金额: {selectedOrder.amount.toLocaleString()} MMK
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'white' }}>
                    📞 电话: {selectedOrder.customerPhone}
                  </Typography>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setDeleteDialogOpen(false)} 
              sx={{ color: 'white' }}
            >
              取消
            </Button>
            <Button 
              onClick={confirmDeleteOrder}
              variant="contained"
              sx={{
                backgroundColor: '#f5222d',
                '&:hover': { backgroundColor: '#ff4d4f' },
              }}
            >
              确认删除
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

export default AdminCourierOrders;
