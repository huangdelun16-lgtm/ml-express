import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AttachMoney,
  Assessment,
  Download,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import PremiumBackground from '../components/PremiumBackground';
import { useLanguage } from '../contexts/LanguageContext';

interface Transaction {
  id: string;
  type: 'income' | 'expense' | 'commission';
  amount: number;
  description: string;
  orderId?: string;
  courierId?: string;
  courierName?: string;
  date: string;
  status: 'completed' | 'pending' | 'cancelled';
}

const revenueData = [
  { month: '1月', income: 2400000, expense: 800000, profit: 1600000 },
  { month: '2月', income: 2800000, expense: 900000, profit: 1900000 },
  { month: '3月', income: 3200000, expense: 1000000, profit: 2200000 },
  { month: '4月', income: 2900000, expense: 950000, profit: 1950000 },
  { month: '5月', income: 3500000, expense: 1100000, profit: 2400000 },
  { month: '6月', income: 3800000, expense: 1200000, profit: 2600000 },
];

const mockTransactions: Transaction[] = [
  {
    id: 'T001234',
    type: 'income',
    amount: 15000,
    description: '订单收入',
    orderId: 'ML001234',
    date: '2024-01-15 10:30:00',
    status: 'completed',
  },
  {
    id: 'T001235',
    type: 'commission',
    amount: -4500,
    description: '快递员佣金',
    orderId: 'ML001234',
    courierId: 'C001',
    courierName: '李师傅',
    date: '2024-01-15 10:35:00',
    status: 'completed',
  },
  {
    id: 'T001236',
    type: 'expense',
    amount: -2000,
    description: '燃油补贴',
    courierId: 'C002',
    courierName: '王师傅',
    date: '2024-01-15 09:00:00',
    status: 'completed',
  },
];

const AdminCourierFinance: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [typeFilter, setTypeFilter] = useState('all');

  const typeColors: Record<string, 'success' | 'error' | 'warning'> = {
    income: 'success',
    expense: 'error',
    commission: 'warning',
  };

  const typeLabels: Record<string, string> = {
    income: '收入',
    expense: '支出',
    commission: '佣金',
  };

  const statusColors: Record<string, 'success' | 'warning' | 'error'> = {
    completed: 'success',
    pending: 'warning',
    cancelled: 'error',
  };

  const statusLabels: Record<string, string> = {
    completed: '已完成',
    pending: '待处理',
    cancelled: '已取消',
  };

  const filteredTransactions = transactions.filter(transaction => {
    return typeFilter === 'all' || transaction.type === typeFilter;
  });

  // Calculate statistics
  const totalIncome = transactions
    .filter(t => t.type === 'income' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const totalExpense = Math.abs(transactions
    .filter(t => (t.type === 'expense' || t.type === 'commission') && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0));
    
  const netProfit = totalIncome - totalExpense;
  const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

  return (
    <PremiumBackground variant="admin" minHeight="100vh">
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 600, color: 'white' }}>
              财务管理
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
            管理收入支出，查看财务报表和快递员佣金
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
                      {Math.round(totalIncome / 1000000 * 10) / 10}M
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white' }}>
                      总收入 (MMK)
                    </Typography>
                  </Box>
                  <TrendingUp sx={{ fontSize: 40, color: '#52c41a' }} />
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
                    <Typography variant="h4" sx={{ color: '#f5222d', fontWeight: 600 }}>
                      {Math.round(totalExpense / 1000000 * 10) / 10}M
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white' }}>
                      总支出 (MMK)
                    </Typography>
                  </Box>
                  <TrendingDown sx={{ fontSize: 40, color: '#f5222d' }} />
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
                    <Typography variant="h4" sx={{ color: netProfit >= 0 ? '#52c41a' : '#f5222d', fontWeight: 600 }}>
                      {Math.round(netProfit / 1000000 * 10) / 10}M
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white' }}>
                      净利润 (MMK)
                    </Typography>
                  </Box>
                  <AttachMoney sx={{ fontSize: 40, color: netProfit >= 0 ? '#52c41a' : '#f5222d' }} />
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
                      {profitMargin.toFixed(1)}%
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white' }}>
                      利润率
                    </Typography>
                  </Box>
                  <Assessment sx={{ fontSize: 40, color: '#faad14' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Charts */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} lg={8}>
            <Card sx={{ 
              background: 'rgba(255, 255, 255, 0.1)', 
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              height: 400,
            }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, mb: 2 }}>
                  收入趋势
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="month" stroke="white" />
                    <YAxis stroke="white" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.8)', 
                        border: 'none',
                        borderRadius: '8px',
                        color: 'white',
                      }}
                      formatter={(value: number) => [`${value.toLocaleString()} MMK`, '']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="income" 
                      stroke="#52c41a" 
                      strokeWidth={3}
                      name="收入"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="expense" 
                      stroke="#f5222d" 
                      strokeWidth={3}
                      name="支出"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="profit" 
                      stroke="#42a5f5" 
                      strokeWidth={3}
                      name="利润"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} lg={4}>
            <Card sx={{ 
              background: 'rgba(255, 255, 255, 0.1)', 
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              height: 400,
            }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, mb: 2 }}>
                  月度对比
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenueData.slice(-3)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="month" stroke="white" />
                    <YAxis stroke="white" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0,0,0,0.8)', 
                        border: 'none',
                        borderRadius: '8px',
                        color: 'white',
                      }}
                      formatter={(value: number) => [`${value.toLocaleString()} MMK`, '']}
                    />
                    <Bar dataKey="profit" fill="#42a5f5" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters and Actions */}
        <Card sx={{ 
          background: 'rgba(255, 255, 255, 0.1)', 
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          mb: 3,
        }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>交易类型</InputLabel>
                  <Select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    sx={{
                      color: 'white',
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#42a5f5' },
                      '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.7)' },
                    }}
                  >
                    <MenuItem value="all">全部类型</MenuItem>
                    <MenuItem value="income">收入</MenuItem>
                    <MenuItem value="expense">支出</MenuItem>
                    <MenuItem value="commission">佣金</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={8}>
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Button 
                    variant="contained" 
                    startIcon={<Download />}
                    sx={{
                      background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                      '&:hover': { background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)' },
                    }}
                  >
                    导出报表
                  </Button>
                  <Button 
                    variant="outlined"
                    sx={{
                      borderColor: 'rgba(255,255,255,0.3)',
                      color: 'white',
                      '&:hover': { borderColor: 'rgba(255,255,255,0.5)' },
                    }}
                  >
                    佣金结算
                  </Button>
                  <Button 
                    variant="outlined"
                    sx={{
                      borderColor: 'rgba(255,255,255,0.3)',
                      color: 'white',
                      '&:hover': { borderColor: 'rgba(255,255,255,0.5)' },
                    }}
                  >
                    添加记录
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card sx={{ 
          background: 'rgba(255, 255, 255, 0.1)', 
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, mb: 2 }}>
              交易记录
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      交易ID
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      类型
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      金额
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      描述
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      关联订单
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      快递员
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      时间
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      状态
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                        {transaction.id}
                      </TableCell>
                      <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Chip 
                          label={typeLabels[transaction.type]} 
                          color={typeColors[transaction.type]}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: 600,
                            color: transaction.amount > 0 ? '#52c41a' : '#f5222d',
                          }}
                        >
                          {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString()} MMK
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                        {transaction.description}
                      </TableCell>
                      <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                        {transaction.orderId || '-'}
                      </TableCell>
                      <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                        {transaction.courierName || '-'}
                      </TableCell>
                      <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                        {new Date(transaction.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Chip 
                          label={statusLabels[transaction.status]} 
                          color={statusColors[transaction.status]}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Container>
    </PremiumBackground>
  );
};

export default AdminCourierFinance;
