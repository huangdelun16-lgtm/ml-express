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
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  IconButton,
  Grid,
  Avatar,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  styled,
} from '@mui/material';
import {
  Search,
  Add,
  Visibility,
  Edit,
  Person,
  TrendingUp,
  AttachMoney,
  ShoppingCart,
  CloudUpload,
  Work,
  Badge,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import PremiumBackground from '../components/PremiumBackground';
import { useLanguage } from '../contexts/LanguageContext';

interface User {
  id: string;
  workId: string; // 工作号
  name: string;
  phone: string;
  email: string;
  address: string;
  role: 'employee' | 'accountant' | 'manager' | 'admin'; // 角色
  username: string; // 用户名
  password: string; // 密码
  idNumber: string; // 身份证号
  joinDate: string; // 入职日期
  salary: number; // 薪水
  avatar?: string; // CV照片
  status: 'active' | 'inactive' | 'blocked';
  orderCount: number;
  totalSpent: number;
  registeredAt: string;
  lastOrder: string;
}

const mockUsers: User[] = [
  {
    id: 'U001',
    workId: 'ML001',
    name: '张三',
    phone: '09-123456789',
    email: 'zhangsan@marketlink.com',
    address: '仰光市中心区茵雅湖路123号',
    role: 'manager',
    username: 'zhangsan',
    password: '******',
    idNumber: '12/LAKANA(N)123456',
    joinDate: '2023-12-01',
    salary: 800000,
    avatar: undefined,
    status: 'active',
    orderCount: 25,
    totalSpent: 450000,
    registeredAt: '2023-12-01',
    lastOrder: '2024-01-15',
  },
  {
    id: 'U002',
    workId: 'ML002',
    name: 'Aung Ko',
    phone: '09-555666777',
    email: 'aungko@marketlink.com',
    address: '仰光市东区大学路789号',
    role: 'accountant',
    username: 'aungko',
    password: '******',
    idNumber: '12/YANKIN(N)789012',
    joinDate: '2023-11-15',
    salary: 600000,
    avatar: undefined,
    status: 'active',
    orderCount: 18,
    totalSpent: 320000,
    registeredAt: '2023-11-15',
    lastOrder: '2024-01-14',
  },
  {
    id: 'U003',
    workId: 'ML003',
    name: '王五',
    phone: '09-888999000',
    email: 'wangwu@marketlink.com',
    address: '曼德勒市北区皇宫路555号',
    role: 'employee',
    username: 'wangwu',
    password: '******',
    idNumber: '12/MAHAAUNGMYE(N)345678',
    joinDate: '2023-10-20',
    salary: 450000,
    avatar: undefined,
    status: 'inactive',
    orderCount: 8,
    totalSpent: 120000,
    registeredAt: '2023-10-20',
    lastOrder: '2023-12-20',
  },
];

const AdminCourierUsers: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newUserData, setNewUserData] = useState({
    workId: '',
    name: '',
    phone: '',
    email: '',
    address: '',
    role: 'employee',
    username: '',
    password: '',
    idNumber: '',
    joinDate: new Date().toISOString().split('T')[0],
    salary: 450000,
    avatar: '',
  });

  const statusColors: Record<string, 'success' | 'warning' | 'error'> = {
    active: 'success',
    inactive: 'warning',
    blocked: 'error',
  };

  const statusLabels: Record<string, string> = {
    active: '活跃',
    inactive: '不活跃',
    blocked: '已封禁',
  };

  const roleLabels = {
    employee: '员工',
    accountant: '会计',
    manager: '经理',
    admin: '管理员',
  };

  const roleColors: Record<string, 'default' | 'primary' | 'secondary' | 'error'> = {
    employee: 'default',
    accountant: 'primary',
    manager: 'secondary',
    admin: 'error',
  };

  // 权限定义
  const permissions = {
    employee: ['couriers'], // 员工只能访问快递员管理
    accountant: ['orders', 'couriers', 'courier-finance'], // 会计可以访问财务
    manager: ['orders', 'couriers', 'courier-finance', 'users', 'courier-dashboard', 'courier-settings'], // 经理全权限
    admin: ['orders', 'couriers', 'courier-finance', 'users', 'courier-dashboard', 'courier-settings', 'control-panel'], // 管理员全权限+控制台
  };

  // 文件上传样式
  const VisuallyHiddenInput = styled('input')({
    clip: 'rect(0 0 0 0)',
    clipPath: 'inset(50%)',
    height: 1,
    overflow: 'hidden',
    position: 'absolute',
    bottom: 0,
    left: 0,
    whiteSpace: 'nowrap',
    width: 1,
  });

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchText.toLowerCase()) ||
                         user.phone.includes(searchText) ||
                         user.email.toLowerCase().includes(searchText.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Statistics
  const activeUsers = users.filter(u => u.status === 'active').length;
  const totalUsers = users.length;
  const totalRevenue = users.reduce((sum, u) => sum + u.totalSpent, 0);
  const avgOrderValue = totalRevenue / users.reduce((sum, u) => sum + u.orderCount, 0);

  // 处理函数
  const handleAddUser = () => {
    setAddUserDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setNewUserData({
      workId: user.workId,
      name: user.name,
      phone: user.phone,
      email: user.email,
      address: user.address,
      role: user.role,
      username: user.username,
      password: '',
      idNumber: user.idNumber,
      joinDate: user.joinDate,
      salary: user.salary,
      avatar: user.avatar || '',
    });
    setEditUserDialogOpen(true);
  };

  const handleSaveUser = () => {
    try {
      if (selectedUser) {
        // 编辑用户
        setUsers(users.map(user => 
          user.id === selectedUser.id 
            ? { ...user, ...newUserData, role: newUserData.role as any, password: newUserData.password || user.password }
            : user
        ));
      } else {
        // 新增用户
        const newUser: User = {
          id: `U${String(users.length + 1).padStart(3, '0')}`,
          ...newUserData,
          role: newUserData.role as any,
          status: 'active',
          orderCount: 0,
          totalSpent: 0,
          registeredAt: new Date().toISOString().split('T')[0],
          lastOrder: '-',
        };
        setUsers([...users, newUser]);
      }
      
      // 重置表单
      setNewUserData({
        workId: '',
        name: '',
        phone: '',
        email: '',
        address: '',
        role: 'employee',
        username: '',
        password: '',
        idNumber: '',
        joinDate: new Date().toISOString().split('T')[0],
        salary: 450000,
        avatar: '',
      });
      setSelectedUser(null);
      setAddUserDialogOpen(false);
      setEditUserDialogOpen(false);
    } catch (error) {
      console.error('保存用户失败:', error);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setNewUserData({ ...newUserData, avatar: e.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <PremiumBackground variant="admin" minHeight="100vh">
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 600, color: 'white' }}>
              用户管理
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
            管理平台用户，查看用户行为分析
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
                    <Typography variant="h4" sx={{ color: '#42a5f5', fontWeight: 600 }}>
                      {totalUsers}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white' }}>
                      总用户数
                    </Typography>
                  </Box>
                  <Person sx={{ fontSize: 40, color: '#42a5f5' }} />
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
                      {activeUsers}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white' }}>
                      活跃用户
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                      / {totalUsers}
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
                    <Typography variant="h4" sx={{ color: '#faad14', fontWeight: 600 }}>
                      {Math.round(totalRevenue / 1000000 * 10) / 10}M
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white' }}>
                      总消费额 (MMK)
                    </Typography>
                  </Box>
                  <AttachMoney sx={{ fontSize: 40, color: '#faad14' }} />
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
                      {Math.round(avgOrderValue / 1000)}K
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white' }}>
                      平均订单价值
                    </Typography>
                  </Box>
                  <ShoppingCart sx={{ fontSize: 40, color: '#722ed1' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters */}
        <Card sx={{ 
          background: 'rgba(255, 255, 255, 0.1)', 
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          mb: 3,
        }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="搜索用户姓名、电话、邮箱"
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
                  <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>用户状态</InputLabel>
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
                    <MenuItem value="active">活跃</MenuItem>
                    <MenuItem value="inactive">不活跃</MenuItem>
                    <MenuItem value="blocked">已封禁</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Button 
                  variant="contained" 
                  startIcon={<Add />}
                  fullWidth
                  onClick={handleAddUser}
                  sx={{
                    background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                    '&:hover': { background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)' },
                  }}
                >
                  新增用户
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Users Table */}
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
                      工作号
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      用户信息
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      角色
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      邮箱
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      薪水
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      状态
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      订单数
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      消费金额
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      注册时间
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      操作
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Work sx={{ fontSize: 16, color: '#42a5f5' }} />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {user.workId}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar 
                            src={user.avatar} 
                            sx={{ backgroundColor: '#1890ff', width: 32, height: 32 }}
                          >
                            <Person />
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {user.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                              {user.phone}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Chip 
                          label={roleLabels[user.role]} 
                          color={roleColors[user.role]}
                          size="small"
                          icon={<Badge />}
                        />
                      </TableCell>
                      <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                        {user.email}
                      </TableCell>
                      <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#52c41a' }}>
                          {user.salary.toLocaleString()} MMK
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Chip 
                          label={statusLabels[user.status]} 
                          color={statusColors[user.status]}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                        {user.orderCount}
                      </TableCell>
                      <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#52c41a' }}>
                          {user.totalSpent.toLocaleString()} MMK
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                        {user.registeredAt}
                      </TableCell>
                      <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton size="small" sx={{ color: '#42a5f5' }}>
                            <Visibility fontSize="small" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            sx={{ color: '#faad14' }}
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit fontSize="small" />
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

        {/* Add User Dialog */}
        <Dialog 
          open={addUserDialogOpen} 
          onClose={() => setAddUserDialogOpen(false)}
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
            新增用户
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {/* 工作号 */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="工作号"
                  value={newUserData.workId}
                  onChange={(e) => setNewUserData({...newUserData, workId: e.target.value})}
                  placeholder="例: ML004"
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

              {/* 角色 */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>角色</InputLabel>
                  <Select
                    value={newUserData.role}
                    onChange={(e) => setNewUserData({...newUserData, role: e.target.value as any})}
                    sx={{
                      color: 'white',
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#42a5f5' },
                      '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.7)' },
                    }}
                  >
                    <MenuItem value="employee">员工</MenuItem>
                    <MenuItem value="accountant">会计</MenuItem>
                    <MenuItem value="manager">经理</MenuItem>
                    <MenuItem value="admin">管理员</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* 用户名 */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="用户名"
                  value={newUserData.username}
                  onChange={(e) => setNewUserData({...newUserData, username: e.target.value})}
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

              {/* 密码 */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="password"
                  label="密码"
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({...newUserData, password: e.target.value})}
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

              {/* 姓名 */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="姓名"
                  value={newUserData.name}
                  onChange={(e) => setNewUserData({...newUserData, name: e.target.value})}
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

              {/* 电话 */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="电话"
                  value={newUserData.phone}
                  onChange={(e) => setNewUserData({...newUserData, phone: e.target.value})}
                  placeholder="09-XXXXXXXXX"
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

              {/* 邮箱 */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="邮箱"
                  type="email"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
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

              {/* 身份证号 */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="身份证号"
                  value={newUserData.idNumber}
                  onChange={(e) => setNewUserData({...newUserData, idNumber: e.target.value})}
                  placeholder="12/LAKANA(N)123456"
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

              {/* 地址 */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="地址"
                  value={newUserData.address}
                  onChange={(e) => setNewUserData({...newUserData, address: e.target.value})}
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

              {/* 入职日期 */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="入职日期"
                  value={newUserData.joinDate}
                  onChange={(e) => setNewUserData({...newUserData, joinDate: e.target.value})}
                  InputLabelProps={{ 
                    style: { color: 'rgba(255,255,255,0.7)' },
                    shrink: true,
                  }}
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

              {/* 薪水 */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="薪水 (MMK)"
                  value={newUserData.salary}
                  onChange={(e) => setNewUserData({...newUserData, salary: parseInt(e.target.value) || 0})}
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

              {/* CV 照片上传 */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Button
                    component="label"
                    variant="outlined"
                    startIcon={<CloudUpload />}
                    sx={{
                      borderColor: 'rgba(255,255,255,0.3)',
                      color: 'white',
                      '&:hover': { borderColor: 'rgba(255,255,255,0.5)' },
                    }}
                  >
                    上传CV照片
                    <VisuallyHiddenInput
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                    />
                  </Button>
                  {newUserData.avatar && (
                    <Avatar 
                      src={newUserData.avatar} 
                      sx={{ width: 40, height: 40 }}
                    />
                  )}
                </Box>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setAddUserDialogOpen(false)}
              sx={{ color: 'white' }}
            >
              取消
            </Button>
            <Button 
              onClick={handleSaveUser}
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

        {/* Edit User Dialog */}
        <Dialog 
          open={editUserDialogOpen} 
          onClose={() => setEditUserDialogOpen(false)}
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
            编辑用户 - {selectedUser?.name}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {/* 相同的表单字段，但用于编辑 */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="工作号"
                  value={newUserData.workId}
                  onChange={(e) => setNewUserData({...newUserData, workId: e.target.value})}
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
                  <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>角色</InputLabel>
                  <Select
                    value={newUserData.role}
                    onChange={(e) => setNewUserData({...newUserData, role: e.target.value as any})}
                    sx={{
                      color: 'white',
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#42a5f5' },
                      '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.7)' },
                    }}
                  >
                    <MenuItem value="employee">员工</MenuItem>
                    <MenuItem value="accountant">会计</MenuItem>
                    <MenuItem value="manager">经理</MenuItem>
                    <MenuItem value="admin">管理员</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="姓名"
                  value={newUserData.name}
                  onChange={(e) => setNewUserData({...newUserData, name: e.target.value})}
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
                  type="number"
                  label="薪水 (MMK)"
                  value={newUserData.salary}
                  onChange={(e) => setNewUserData({...newUserData, salary: parseInt(e.target.value) || 0})}
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
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setEditUserDialogOpen(false)}
              sx={{ color: 'white' }}
            >
              取消
            </Button>
            <Button 
              onClick={handleSaveUser}
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

export default AdminCourierUsers;
