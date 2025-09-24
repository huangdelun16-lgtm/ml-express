import React, { useState } from 'react';
import {
  Box,
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
  Paper,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Avatar,
  Divider,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from '@mui/material';
import {
  Search,
  Add,
  Visibility,
  Edit,
  Delete,
  Phone,
  LocationOn,
  Person,
  LocalShipping,
  CheckCircle,
  Schedule,
  Cancel,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import PremiumBackground from '../components/PremiumBackground';
import { useLanguage } from '../contexts/LanguageContext';
import { OrderData, orderStatusLabels } from '../utils/orderUtils';

interface Order {
  id: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  senderAddress: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  packageType: string;
  weight: number;
  distance: number;
  amount: number;
  status: 'pending' | 'accepted' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  courierId?: string;
  courierName?: string;
  courierPhone?: string;
  createdAt: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
}

const mockOrders: Order[] = [
  {
    id: '1',
    orderId: 'ML001234',
    customerName: '张三',
    customerPhone: '09-123456789',
    senderAddress: '仰光市中心区茵雅湖路123号',
    receiverName: '李四',
    receiverPhone: '09-987654321',
    receiverAddress: '曼德勒市中心区84街456号',
    packageType: '文件',
    weight: 0.5,
    distance: 5.2,
    amount: 15000,
    status: 'in_transit',
    courierId: 'C001',
    courierName: '李师傅',
    courierPhone: '09-111222333',
    createdAt: '2024-01-15 09:30:00',
    estimatedDelivery: '2024-01-15 14:30:00',
  },
  {
    id: '2',
    orderId: 'ML001235',
    customerName: 'Aung Ko',
    customerPhone: '09-555666777',
    senderAddress: '仰光市东区大学路789号',
    receiverName: 'Ma Thida',
    receiverPhone: '09-444555666',
    receiverAddress: '仰光市西区机场路321号',
    packageType: '食品',
    weight: 2.0,
    distance: 8.5,
    amount: 25000,
    status: 'pending',
    createdAt: '2024-01-15 11:15:00',
  },
  {
    id: '3',
    orderId: 'ML001236',
    customerName: '王五',
    customerPhone: '09-888999000',
    senderAddress: '曼德勒市北区皇宫路555号',
    receiverName: '赵六',
    receiverPhone: '09-777888999',
    receiverAddress: '曼德勒市南区火车站路666号',
    packageType: '电子产品',
    weight: 1.5,
    distance: 3.8,
    amount: 18000,
    status: 'delivered',
    courierId: 'C002',
    courierName: '王师傅',
    courierPhone: '09-222333444',
    createdAt: '2024-01-15 08:00:00',
    actualDelivery: '2024-01-15 12:30:00',
  },
];

const AdminCourierOrders: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editOrderData, setEditOrderData] = useState<Partial<Order>>({});
  const [availableCouriers, setAvailableCouriers] = useState<any[]>([]);

  // 从localStorage加载订单数据
  React.useEffect(() => {
    const loadOrders = () => {
      try {
        const storedOrders = localStorage.getItem('courier_orders');
        if (storedOrders) {
          const parsedOrders: OrderData[] = JSON.parse(storedOrders);
          // 转换为Order格式，保持快递员分配信息
          const convertedOrders: Order[] = parsedOrders.map((order, index) => ({
            id: (index + 1).toString(),
            orderId: order.orderId,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            senderAddress: order.senderAddress,
            receiverName: order.receiverName,
            receiverPhone: order.receiverPhone,
            receiverAddress: order.receiverAddress,
            packageType: order.packageType,
            weight: order.weight,
            distance: order.distance,
            amount: order.amount,
            status: order.status as any,
            // 重要：保持快递员分配信息
            courierId: order.courierId,
            courierName: order.courierName,
            courierPhone: order.courierPhone,
            createdAt: order.createdAt,
            estimatedDelivery: order.estimatedDelivery,
            actualDelivery: order.status === 'delivered' ? order.estimatedDelivery : undefined,
          }));
          setOrders([...convertedOrders, ...mockOrders]);
        } else {
          setOrders(mockOrders);
        }
      } catch (error) {
        console.error('加载订单数据失败:', error);
        setOrders(mockOrders);
      }
    };

    loadOrders();

    // 定期刷新订单数据（每30秒）
    const interval = setInterval(loadOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  // 加载员工数据作为快递员选项
  React.useEffect(() => {
    const loadCouriers = () => {
      try {
        const storedEmployees = localStorage.getItem('company_employees');
        if (storedEmployees) {
          const employees = JSON.parse(storedEmployees);
          // 只显示员工角色的人员作为快递员选项
          const couriers = employees.filter((emp: any) => 
            emp.role === 'employee'
          );
          setAvailableCouriers(couriers);
        }
      } catch (error) {
        console.error('加载快递员数据失败:', error);
      }
    };

    loadCouriers();
    // 定期刷新快递员数据
    const interval = setInterval(loadCouriers, 10000);
    return () => clearInterval(interval);
  }, []);

  const statusColors: Record<string, 'warning' | 'info' | 'success' | 'error' | 'default'> = {
    pending: 'warning',
    accepted: 'info',
    picked_up: 'info',
    in_transit: 'info',
    delivered: 'success',
    cancelled: 'error',
  };

  const statusLabels: Record<string, string> = {
    pending: '待接单',
    accepted: '已接单',
    picked_up: '已取件',
    in_transit: '配送中',
    delivered: '已送达',
    cancelled: '已取消',
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.orderId.toLowerCase().includes(searchText.toLowerCase()) ||
                         order.customerName.toLowerCase().includes(searchText.toLowerCase()) ||
                         order.receiverName.toLowerCase().includes(searchText.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleViewOrder = (order: Order) => {
    console.log('🔍 查看订单被点击:', order.orderId);
    alert(`🔍 查看订单详情\n\n订单号: ${order.orderId}\n客户: ${order.customerName}\n金额: ${order.amount.toLocaleString()} MMK\n状态: ${order.status}`);
    setSelectedOrder(order);
    setDetailDialogOpen(true);
  };

  const handleEditOrder = (order: Order) => {
    console.log('✏️ 编辑订单被点击:', order.orderId);
    alert(`✏️ 编辑订单\n\n订单号: ${order.orderId}\n即将打开编辑对话框`);
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
      courierId: order.courierId,
      courierName: order.courierName,
      courierPhone: order.courierPhone,
    });
    setEditDialogOpen(true);
  };

  const handleSaveOrder = () => {
    if (!selectedOrder) return;
    
    try {
      // 更新订单数据
      const updatedOrders = orders.map(order => 
        order.id === selectedOrder.id 
          ? { ...order, ...editOrderData }
          : order
      );
      setOrders(updatedOrders);
      
      // 同时更新localStorage中的数据
      const storedOrders = JSON.parse(localStorage.getItem('courier_orders') || '[]');
      const updatedStoredOrders = storedOrders.map((order: OrderData) => 
        order.orderId === selectedOrder.orderId 
          ? { 
              ...order, 
              customerName: editOrderData.customerName || order.customerName,
              customerPhone: editOrderData.customerPhone || order.customerPhone,
              receiverName: editOrderData.receiverName || order.receiverName,
              receiverPhone: editOrderData.receiverPhone || order.receiverPhone,
              amount: editOrderData.amount || order.amount,
              status: editOrderData.status || order.status,
              // 重要：保存快递员分配信息
              courierId: editOrderData.courierId,
              courierName: editOrderData.courierName,
              courierPhone: editOrderData.courierPhone,
              notes: `${order.notes || ''} | 快递员分配: ${editOrderData.courierName || '未分配'} - ${new Date().toLocaleString()}`,
            }
          : order
      );
      localStorage.setItem('courier_orders', JSON.stringify(updatedStoredOrders));
      
      console.log('订单已保存:', {
        orderId: selectedOrder.orderId,
        courierAssigned: editOrderData.courierName,
        status: editOrderData.status,
      });
      
      setEditDialogOpen(false);
      setSelectedOrder(null);
      setEditOrderData({});
      
      alert(`订单 ${selectedOrder.orderId} 保存成功！${editOrderData.courierName ? `已分配给快递员: ${editOrderData.courierName}` : ''}`);
      
      // 立即重新加载数据以确保显示最新状态
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('保存订单失败:', error);
      alert('保存订单失败，请重试');
    }
  };

  // 删除订单处理函数
  const handleDeleteOrder = (order: Order) => {
    console.log('🗑️ 删除整个订单被点击，订单:', order.orderId);
    
    const confirmDelete = window.confirm(`⚠️ 永久删除整个订单？\n\n📦 订单号: ${order.orderId}\n👤 客户: ${order.customerName}\n💰 金额: ${order.amount.toLocaleString()} MMK\n📞 电话: ${order.customerPhone}\n\n⚠️ 此操作将完全移除订单号及所有相关数据！\n⚠️ 删除后无法恢复！\n\n确定要继续吗？`);
    
    if (confirmDelete) {
      try {
        console.log('🔥 开始永久删除整个订单:', order.orderId);
        
        // 1. 从当前状态中移除订单
        const updatedOrders = orders.filter(o => o.id !== order.id && o.orderId !== order.orderId);
        console.log('✅ 从状态中移除，剩余订单:', updatedOrders.length);
        setOrders(updatedOrders);
        
        // 2. 从localStorage中完全移除订单
        const storedOrders = JSON.parse(localStorage.getItem('courier_orders') || '[]');
        console.log('📦 localStorage中的订单数量:', storedOrders.length);
        
        const updatedStoredOrders = storedOrders.filter((o: any) => 
          o.orderId !== order.orderId && o.id !== order.id
        );
        console.log('🗑️ 删除后localStorage订单数量:', updatedStoredOrders.length);
        
        localStorage.setItem('courier_orders', JSON.stringify(updatedStoredOrders));
        
        // 3. 清理相关的缓存数据
        const cacheKeys = [
          `order_${order.orderId}`,
          `order_details_${order.orderId}`,
          `order_status_${order.orderId}`,
          `order_tracking_${order.orderId}`,
        ];
        
        cacheKeys.forEach(key => {
          localStorage.removeItem(key);
          console.log('🧹 清理缓存:', key);
        });
        
        // 4. 从其他相关存储中移除
        try {
          // 清理财务记录中的相关数据
          const financeData = JSON.parse(localStorage.getItem('finance_records') || '[]');
          const updatedFinanceData = financeData.filter((record: any) => record.orderId !== order.orderId);
          localStorage.setItem('finance_records', JSON.stringify(updatedFinanceData));
          console.log('💰 清理财务记录完成');
          
          // 清理包裹数据中的相关记录
          const packageData = JSON.parse(localStorage.getItem('packages') || '[]');
          const updatedPackageData = packageData.filter((pkg: any) => pkg.orderId !== order.orderId);
          localStorage.setItem('packages', JSON.stringify(updatedPackageData));
          console.log('📦 清理包裹数据完成');
          
        } catch (cleanupError) {
          console.warn('⚠️ 清理相关数据时出现警告:', cleanupError);
        }
        
        console.log('🎉 订单完全删除成功:', order.orderId);
        alert(`🎉 订单完全删除成功！\n\n📦 订单号: ${order.orderId}\n✅ 已完全从系统中移除\n✅ 所有相关数据已清理\n✅ 缓存已清空\n\n系统将自动刷新...`);
        
        // 立即刷新页面显示最新数据
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        
      } catch (error) {
        console.error('❌ 删除订单失败:', error);
        alert(`❌ 删除订单失败\n\n错误信息: ${error instanceof Error ? error.message : '未知错误'}\n\n请重试或联系技术支持`);
      }
    } else {
      console.log('用户取消了删除操作');
    }
  };

  // 创建测试订单
  const handleCreateTestOrder = () => {
    console.log('创建测试订单');
    
    const testCustomers = [
      { name: 'Aung Ko', phone: '09-123456789', address: '仰光市中心区第1街123号' },
      { name: 'Thida Min', phone: '09-234567890', address: '曼德勒市北区商业街45号' },
      { name: 'Zaw Win', phone: '09-345678901', address: '内比都新区政府大楼附近' },
      { name: 'Su Su', phone: '09-456789012', address: '勃生市港口区渔民街67号' },
      { name: 'Kyaw Soe', phone: '09-567890123', address: '密支那市中心市场对面' },
    ];
    
    const testReceivers = [
      { name: 'Ma Htwe', phone: '09-111111111', address: '仰光市东区大学路89号' },
      { name: 'Ko Thant', phone: '09-222222222', address: '曼德勒市南区寺庙街12号' },
      { name: 'Daw Khin', phone: '09-333333333', address: '内比都商业区购物中心' },
      { name: 'U Maung', phone: '09-444444444', address: '勃生市老城区传统市场' },
      { name: 'Ma Aye', phone: '09-555555555', address: '密支那市郊区农场路34号' },
    ];

    const packageTypes = ['文件', '小包裹', '中包裹', '大包裹', '易碎品'];
    const serviceTypes = ['标准配送', '加急配送', '当日达', '次日达'];

    const customer = testCustomers[Math.floor(Math.random() * testCustomers.length)];
    const receiver = testReceivers[Math.floor(Math.random() * testReceivers.length)];
    const packageType = packageTypes[Math.floor(Math.random() * packageTypes.length)];
    const serviceType = serviceTypes[Math.floor(Math.random() * serviceTypes.length)];

    // 生成缅甸时间的订单号
    const { generateOrderId } = require('../utils/orderUtils');
    const orderId = generateOrderId();
    
    const weight = Math.round((Math.random() * 10 + 0.5) * 10) / 10; // 0.5-10.5kg
    const distance = Math.round((Math.random() * 50 + 5) * 10) / 10; // 5-55km
    const amount = Math.round((distance * 1000 + weight * 500 + Math.random() * 5000) / 100) * 100; // 价格计算

    const newOrder: OrderData = {
      orderId,
      customerName: customer.name,
      customerPhone: customer.phone,
      senderAddress: customer.address,
      receiverName: receiver.name,
      receiverPhone: receiver.phone,
      receiverAddress: receiver.address,
      packageType,
      weight,
      description: `${packageType} - ${serviceType}`,
      serviceType,
      distance,
      amount,
      status: 'pending' as any,
      createdAt: new Date().toISOString(),
      estimatedDelivery: new Date(Date.now() + (serviceType === '当日达' ? 8 : serviceType === '次日达' ? 24 : 48) * 60 * 60 * 1000).toISOString(),
    };

    try {
      // 保存到localStorage
      const existingOrders = JSON.parse(localStorage.getItem('courier_orders') || '[]');
      const updatedOrders = [newOrder, ...existingOrders];
      localStorage.setItem('courier_orders', JSON.stringify(updatedOrders));

      console.log('✅ 测试订单创建成功:', newOrder);
      
      alert(`🎉 测试订单创建成功！\n\n订单号: ${orderId}\n客户: ${customer.name}\n收货人: ${receiver.name}\n包裹: ${packageType} (${weight}kg)\n距离: ${distance}km\n金额: ${amount.toLocaleString()} MMK\n服务: ${serviceType}`);

      // 刷新页面显示新订单
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('❌ 创建测试订单失败:', error);
      alert('创建测试订单失败，请重试');
    }
  };


  return (
    <PremiumBackground variant="admin" minHeight="100vh">
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 600, color: 'white' }}>
              订单管理
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
            管理所有快递订单，跟踪配送状态
          </Typography>
        </Box>

        {/* Filters */}
        <Card sx={{ 
          background: 'rgba(255, 255, 255, 0.1)', 
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          mb: 3,
        }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="搜索订单号、客户姓名"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  InputProps={{
                    startAdornment: <Search sx={{ color: 'rgba(255,255,255,0.7)', mr: 1 }} />,
                    style: { color: 'white' },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                      '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                      '&.Mui-focused fieldset': { borderColor: '#42a5f5' },
                    },
                    '& .MuiInputBase-input::placeholder': { color: 'rgba(255,255,255,0.5)' },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>订单状态</InputLabel>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    sx={{
                      color: 'white',
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#42a5f5' },
                      '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.7)' },
                    }}
                  >
                    <MenuItem value="all">全部状态</MenuItem>
                    <MenuItem value="pending">待接单</MenuItem>
                    <MenuItem value="accepted">已接单</MenuItem>
                    <MenuItem value="picked_up">已取件</MenuItem>
                    <MenuItem value="in_transit">配送中</MenuItem>
                    <MenuItem value="delivered">已送达</MenuItem>
                    <MenuItem value="cancelled">已取消</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={5}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button 
                    variant="contained" 
                    startIcon={<Add />}
                    onClick={handleCreateTestOrder}
                    sx={{
                      background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                      '&:hover': { background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)' },
                    }}
                  >
                    新建订单
                  </Button>
                  <Button 
                    variant="outlined"
                    sx={{
                      borderColor: 'rgba(255,255,255,0.3)',
                      color: 'white',
                      '&:hover': { borderColor: 'rgba(255,255,255,0.5)' },
                    }}
                  >
                    导出
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card sx={{ 
          background: 'rgba(255, 255, 255, 0.1)', 
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }}>
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      订单号
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      寄件人
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      收件人
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      包裹信息
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      金额
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      状态
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      快递员
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      操作
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {order.orderId}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Box>
                          <Typography variant="body2">{order.customerName}</Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            {order.customerPhone}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Box>
                          <Typography variant="body2">{order.receiverName}</Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            {order.receiverPhone}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Box>
                          <Typography variant="body2">{order.packageType}</Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            {order.weight}kg | {order.distance}km
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#52c41a' }}>
                          {order.amount.toLocaleString()} MMK
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Chip 
                          label={statusLabels[order.status]} 
                          color={statusColors[order.status]}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                        {order.courierName ? (
                          <Box>
                            <Typography variant="body2">{order.courierName}</Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                              {order.courierPhone}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            未分配
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton 
                            size="small" 
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log('👁️ 查看按钮被点击！订单:', order.orderId);
                              handleViewOrder(order);
                            }}
                            sx={{ 
                              color: '#42a5f5',
                              '&:hover': {
                                backgroundColor: 'rgba(66, 165, 245, 0.1)',
                              }
                            }}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                          <IconButton 
                            size="small"
                            sx={{ 
                              color: '#faad14',
                              '&:hover': {
                                backgroundColor: 'rgba(250, 173, 20, 0.1)',
                              }
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log('✏️ 编辑按钮被点击！订单:', order.orderId);
                              handleEditOrder(order);
                            }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <Button 
                            size="small"
                            variant="outlined"
                            sx={{ 
                              color: '#f5222d',
                              borderColor: '#f5222d',
                              minWidth: '60px',
                              height: '32px',
                              fontSize: '12px',
                              '&:hover': {
                                backgroundColor: 'rgba(245, 34, 45, 0.1)',
                                borderColor: '#f5222d',
                              }
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log('🗑️ 删除按钮被点击！订单:', order.orderId);
                              handleDeleteOrder(order);
                            }}
                          >
                            删除
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Order Detail Dialog */}
        <Dialog 
          open={detailDialogOpen} 
          onClose={() => setDetailDialogOpen(false)}
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
            订单详情 - {selectedOrder?.orderId}
          </DialogTitle>
          <DialogContent>
            {selectedOrder && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ 
                    background: 'rgba(255, 255, 255, 0.1)', 
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                  }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                        订单信息
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                            订单号：
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'white' }}>
                            {selectedOrder.orderId}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                            状态：
                          </Typography>
                          <Chip 
                            label={statusLabels[selectedOrder.status]} 
                            color={statusColors[selectedOrder.status]}
                            size="small"
                          />
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                            包裹类型：
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'white' }}>
                            {selectedOrder.packageType}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                            重量：
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'white' }}>
                            {selectedOrder.weight} kg
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                            距离：
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'white' }}>
                            {selectedOrder.distance} km
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                            金额：
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#52c41a', fontWeight: 600 }}>
                            {selectedOrder.amount.toLocaleString()} MMK
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>

                  {selectedOrder.courierName && (
                    <Card sx={{ 
                      background: 'rgba(255, 255, 255, 0.1)', 
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      mt: 2,
                    }}>
                      <CardContent>
                        <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                          快递员信息
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ backgroundColor: '#1890ff' }}>
                            <Person />
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
                              {selectedOrder.courierName}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                              {selectedOrder.courierPhone}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  )}
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card sx={{ 
                    background: 'rgba(255, 255, 255, 0.1)', 
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                  }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                        配送进度
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <CheckCircle sx={{ color: '#52c41a' }} />
                          <Box>
                            <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
                              订单创建
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                              {new Date(selectedOrder.createdAt).toLocaleString()}
                            </Typography>
                          </Box>
                        </Box>
                        {selectedOrder.status !== 'pending' && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <CheckCircle sx={{ color: '#52c41a' }} />
                            <Box>
                              <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
                                订单接受
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                快递员: {selectedOrder.courierName}
                              </Typography>
                            </Box>
                          </Box>
                        )}
                        {['picked_up', 'in_transit', 'delivered'].includes(selectedOrder.status) && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <CheckCircle sx={{ color: '#52c41a' }} />
                            <Box>
                              <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
                                包裹取件
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                已从寄件地址取件
                              </Typography>
                            </Box>
                          </Box>
                        )}
                        {['in_transit', 'delivered'].includes(selectedOrder.status) && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <LocalShipping sx={{ color: '#42a5f5' }} />
                            <Box>
                              <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
                                配送中
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                正在前往目的地
                              </Typography>
                            </Box>
                          </Box>
                        )}
                        {selectedOrder.status === 'delivered' && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <CheckCircle sx={{ color: '#52c41a' }} />
                            <Box>
                              <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
                                配送完成
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                {selectedOrder.actualDelivery ? new Date(selectedOrder.actualDelivery).toLocaleString() : '已送达'}
                              </Typography>
                            </Box>
                          </Box>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12}>
                  <Card sx={{ 
                    background: 'rgba(255, 255, 255, 0.1)', 
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                  }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
                        地址信息
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Box>
                            <Typography variant="subtitle2" sx={{ color: '#42a5f5', mb: 1 }}>
                              寄件地址
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'white' }}>
                              {selectedOrder.senderAddress}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Box>
                            <Typography variant="subtitle2" sx={{ color: '#52c41a', mb: 1 }}>
                              收件地址
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'white' }}>
                              {selectedOrder.receiverAddress}
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
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

        {/* Edit Order Dialog */}
        <Dialog 
          open={editDialogOpen} 
          onClose={() => setEditDialogOpen(false)}
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
            编辑订单 - {selectedOrder?.orderId}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="寄件人姓名"
                  value={editOrderData.customerName || ''}
                  onChange={(e) => setEditOrderData({...editOrderData, customerName: e.target.value})}
                  InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)' } }}
                  InputProps={{ style: { color: 'white' } }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                      '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                      '&.Mui-focused fieldset': { borderColor: '#42a5f5' },
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="寄件人电话"
                  value={editOrderData.customerPhone || ''}
                  onChange={(e) => setEditOrderData({...editOrderData, customerPhone: e.target.value})}
                  InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)' } }}
                  InputProps={{ style: { color: 'white' } }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                      '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                      '&.Mui-focused fieldset': { borderColor: '#42a5f5' },
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="收件人姓名"
                  value={editOrderData.receiverName || ''}
                  onChange={(e) => setEditOrderData({...editOrderData, receiverName: e.target.value})}
                  InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)' } }}
                  InputProps={{ style: { color: 'white' } }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                      '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                      '&.Mui-focused fieldset': { borderColor: '#42a5f5' },
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="收件人电话"
                  value={editOrderData.receiverPhone || ''}
                  onChange={(e) => setEditOrderData({...editOrderData, receiverPhone: e.target.value})}
                  InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)' } }}
                  InputProps={{ style: { color: 'white' } }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                      '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                      '&.Mui-focused fieldset': { borderColor: '#42a5f5' },
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>订单状态</InputLabel>
                  <Select
                    value={editOrderData.status || ''}
                    onChange={(e) => setEditOrderData({...editOrderData, status: e.target.value as any})}
                    sx={{
                      color: 'white',
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#42a5f5' },
                      '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.7)' },
                    }}
                  >
                    <MenuItem value="pending">待接单</MenuItem>
                    <MenuItem value="accepted">已接单</MenuItem>
                    <MenuItem value="picked_up">已取件</MenuItem>
                    <MenuItem value="in_transit">配送中</MenuItem>
                    <MenuItem value="delivered">已送达</MenuItem>
                    <MenuItem value="cancelled">已取消</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="金额 (MMK)"
                  value={editOrderData.amount || ''}
                  onChange={(e) => setEditOrderData({...editOrderData, amount: parseInt(e.target.value) || 0})}
                  InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)' } }}
                  InputProps={{ style: { color: 'white' } }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                      '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                      '&.Mui-focused fieldset': { borderColor: '#42a5f5' },
                    },
                  }}
                />
              </Grid>
              
              {/* 快递员选择 */}
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>分配快递员</InputLabel>
                  <Select
                    value={editOrderData.courierId || ''}
                    onChange={(e) => {
                      const selectedCourier = availableCouriers.find(c => c.id === e.target.value);
                      setEditOrderData({
                        ...editOrderData, 
                        courierId: e.target.value,
                        courierName: selectedCourier?.name,
                        courierPhone: selectedCourier?.phone,
                      });
                    }}
                    sx={{
                      color: 'white',
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#42a5f5' },
                      '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.7)' },
                    }}
                  >
                    <MenuItem value="">未分配</MenuItem>
                    {availableCouriers.map((courier) => (
                      <MenuItem key={courier.id} value={courier.id}>
                        {courier.name} ({courier.workId}) - {courier.phone}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setEditDialogOpen(false)}
              sx={{ color: 'white' }}
            >
              取消
            </Button>
            <Button 
              onClick={handleSaveOrder}
              variant="contained"
              sx={{
                background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                '&:hover': { background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)' },
              }}
            >
              保存
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </PremiumBackground>
  );
};

export default AdminCourierOrders;
