import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  AttachMoney,
  People,
  LocalShipping,
  Assessment,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import PremiumBackground from '../components/PremiumBackground';
import { useLanguage } from '../contexts/LanguageContext';

// Mock data
const orderTrendData = [
  { name: '周一', orders: 120, revenue: 2400000 },
  { name: '周二', orders: 132, revenue: 2800000 },
  { name: '周三', orders: 101, revenue: 2200000 },
  { name: '周四', orders: 134, revenue: 2900000 },
  { name: '周五', orders: 190, revenue: 3800000 },
  { name: '周六', orders: 230, revenue: 4600000 },
  { name: '周日', orders: 210, revenue: 4200000 },
];

const orderStatusData = [
  { name: '待接单', value: 45, color: '#faad14' },
  { name: '配送中', value: 120, color: '#1890ff' },
  { name: '已完成', value: 280, color: '#52c41a' },
  { name: '已取消', value: 15, color: '#f5222d' },
];

const recentOrders = [
  {
    id: 'ML001234',
    customer: '张三',
    phone: '09-123456789',
    status: '配送中',
    amount: 15000,
    courier: '李师傅',
    time: '10:30',
  },
  {
    id: 'ML001235',
    customer: '李四',
    phone: '09-987654321',
    status: '已完成',
    amount: 8500,
    courier: '王师傅',
    time: '09:45',
  },
  {
    id: 'ML001236',
    customer: 'Aung Ko',
    phone: '09-555666777',
    status: '待接单',
    amount: 12000,
    courier: '-',
    time: '11:15',
  },
];

const topCouriers = [
  { name: '李师傅', orders: 45, rating: 4.9, revenue: 680000 },
  { name: '王师傅', orders: 38, rating: 4.8, revenue: 570000 },
  { name: 'Ko Ko', orders: 32, rating: 4.7, revenue: 480000 },
];

const AdminCourierDashboard: React.FC = () => {
  const { t } = useLanguage();

  const getStatusColor = (status: string) => {
    const colors: Record<string, 'warning' | 'info' | 'success' | 'error'> = {
      '待接单': 'warning',
      '配送中': 'info',
      '已完成': 'success',
      '已取消': 'error',
    };
    return colors[status] || 'default';
  };

  return (
    <PremiumBackground variant="admin" minHeight="100vh">
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ mb: 1, fontWeight: 600, color: 'white' }}>
            仪表盘
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            缅甸同城快递管理系统 - 实时数据概览
          </Typography>
        </Box>

        {/* Statistics Cards */}
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
                    <Typography variant="h4" sx={{ color: '#42a5f5', fontWeight: 600 }}>
                      234
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white' }}>
                      今日订单
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#52c41a' }}>
                      <TrendingUp sx={{ fontSize: 14, mr: 0.5 }} />
                      +12%
                    </Typography>
                  </Box>
                  <ShoppingCart sx={{ fontSize: 40, color: '#42a5f5' }} />
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
                    <Typography variant="h4" sx={{ color: '#52c41a', fontWeight: 600 }}>
                      3.42M
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white' }}>
                      今日收入 (MMK)
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#52c41a' }}>
                      <TrendingUp sx={{ fontSize: 14, mr: 0.5 }} />
                      +8%
                    </Typography>
                  </Box>
                  <AttachMoney sx={{ fontSize: 40, color: '#52c41a' }} />
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
                      28
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white' }}>
                      活跃快递员
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'white' }}>
                      在线
                    </Typography>
                  </Box>
                  <LocalShipping sx={{ fontSize: 40, color: '#faad14' }} />
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
                    <Typography variant="h4" sx={{ color: '#722ed1', fontWeight: 600 }}>
                      1,240
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white' }}>
                      用户总数
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#52c41a' }}>
                      <TrendingUp sx={{ fontSize: 14, mr: 0.5 }} />
                      +5%
                    </Typography>
                  </Box>
                  <People sx={{ fontSize: 40, color: '#722ed1' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Charts Row */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Order Trend Chart */}
          <Grid item xs={12} lg={8}>
            <Card sx={{ 
              background: 'rgba(255, 255, 255, 0.1)', 
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              height: 400,
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                    订单趋势
                  </Typography>
                  <Button size="small" sx={{ color: 'white' }}>
                    查看详情
                  </Button>
                </Box>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={orderTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="name" stroke="white" />
                    <YAxis yAxisId="left" stroke="white" />
                    <YAxis yAxisId="right" orientation="right" stroke="white" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.8)', 
                        border: 'none',
                        borderRadius: '8px',
                        color: 'white',
                      }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="orders"
                      stroke="#42a5f5"
                      strokeWidth={3}
                      name="订单数量"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="revenue"
                      stroke="#52c41a"
                      strokeWidth={3}
                      name="收入 (MMK)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Order Status Pie Chart */}
          <Grid item xs={12} lg={4}>
            <Card sx={{ 
              background: 'rgba(255, 255, 255, 0.1)', 
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              height: 400,
            }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, mb: 2 }}>
                  订单状态分布
                </Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={orderStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {orderStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <Box sx={{ mt: 2 }}>
                  {orderStatusData.map((item, index) => (
                    <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box 
                          sx={{ 
                            width: 12, 
                            height: 12, 
                            backgroundColor: item.color, 
                            borderRadius: 1,
                            mr: 1,
                          }} 
                        />
                        <Typography variant="body2" sx={{ color: 'white' }}>
                          {item.name}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
                        {item.value}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Tables Row */}
        <Grid container spacing={3}>
          {/* Recent Orders */}
          <Grid item xs={12} lg={8}>
            <Card sx={{ 
              background: 'rgba(255, 255, 255, 0.1)', 
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                    最近订单
                  </Typography>
                  <Button size="small" sx={{ color: 'white' }}>
                    查看全部
                  </Button>
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>订单号</TableCell>
                        <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>客户</TableCell>
                        <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>状态</TableCell>
                        <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>金额</TableCell>
                        <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>快递员</TableCell>
                        <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>时间</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {order.id}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                            <Box>
                              <Typography variant="body2">{order.customer}</Typography>
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                                {order.phone}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                            <Chip 
                              label={order.status} 
                              color={getStatusColor(order.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#52c41a' }}>
                              {order.amount.toLocaleString()} MMK
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                            {order.courier}
                          </TableCell>
                          <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                            {order.time}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Top Couriers */}
          <Grid item xs={12} lg={4}>
            <Card sx={{ 
              background: 'rgba(255, 255, 255, 0.1)', 
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, mb: 2 }}>
                  优秀快递员
                </Typography>
                <List>
                  {topCouriers.map((courier, index) => (
                    <ListItem key={index} sx={{ px: 0 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ backgroundColor: '#1890ff' }}>
                          {index + 1}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
                              {courier.name}
                            </Typography>
                            <Chip 
                              label={`⭐ ${courier.rating}`} 
                              size="small"
                              sx={{ backgroundColor: '#faad14', color: 'white' }}
                            />
                          </Box>
                        }
                        secondary={
                          <Box sx={{ color: 'rgba(255,255,255,0.7)' }}>
                            <Typography variant="caption">
                              订单: {courier.orders}单
                            </Typography>
                            <br />
                            <Typography variant="caption">
                              收入: {courier.revenue.toLocaleString()} MMK
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* System Status */}
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card sx={{ 
              background: 'rgba(255, 255, 255, 0.1)', 
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, mb: 3 }}>
                  系统状态
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
                        <Box
                          sx={{
                            width: 100,
                            height: 100,
                            borderRadius: '50%',
                            background: `conic-gradient(#52c41a 0deg ${92 * 3.6}deg, rgba(255,255,255,0.1) ${92 * 3.6}deg 360deg)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Box
                            sx={{
                              width: 70,
                              height: 70,
                              borderRadius: '50%',
                              backgroundColor: 'rgba(255,255,255,0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                              92%
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                      <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
                        服务器状态
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        运行正常
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
                        <Box
                          sx={{
                            width: 100,
                            height: 100,
                            borderRadius: '50%',
                            background: `conic-gradient(#1890ff 0deg ${78 * 3.6}deg, rgba(255,255,255,0.1) ${78 * 3.6}deg 360deg)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Box
                            sx={{
                              width: 70,
                              height: 70,
                              borderRadius: '50%',
                              backgroundColor: 'rgba(255,255,255,0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                              78%
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                      <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
                        数据库性能
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        良好
                      </Typography>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
                        <Box
                          sx={{
                            width: 100,
                            height: 100,
                            borderRadius: '50%',
                            background: `conic-gradient(#faad14 0deg ${85 * 3.6}deg, rgba(255,255,255,0.1) ${85 * 3.6}deg 360deg)`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Box
                            sx={{
                              width: 70,
                              height: 70,
                              borderRadius: '50%',
                              backgroundColor: 'rgba(255,255,255,0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                              85%
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                      <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
                        API响应
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        快速
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </PremiumBackground>
  );
};

export default AdminCourierDashboard;
