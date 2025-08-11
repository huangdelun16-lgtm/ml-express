import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Alert,
  useTheme,
  AppBar,
  Toolbar,
  Avatar,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  LocalShipping,
  Add,
  Edit,
  Delete,
  Search,
  FilterList,
  Dashboard,
  Inventory,
  People,
  Assessment,
  Logout,
  Person,
  Settings,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface Package {
  id: string;
  trackingNumber: string;
  sender: string;
  receiver: string;
  status: string;
  packageType: string;
  weight: string;
  createdAt: string;
  estimatedDelivery: string;
}

interface User {
  username: string;
  role: string;
  loginTime: string;
}

const AdminDashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const theme = useTheme();
  const navigate = useNavigate();

  // 模拟快递数据
  const mockPackages: Package[] = [
    {
      id: '1',
      trackingNumber: 'ML123456789',
      sender: '张三 - 仰光市',
      receiver: '李四 - 曼德勒市',
      status: '运输中',
      packageType: '文件包裹',
      weight: '0.5kg',
      createdAt: '2024-01-14',
      estimatedDelivery: '2024-01-15',
    },
    {
      id: '2',
      trackingNumber: 'ML987654321',
      sender: '王五 - 仰光市',
      receiver: '赵六 - 内比都市',
      status: '已揽收',
      packageType: '电子产品',
      weight: '2.0kg',
      createdAt: '2024-01-14',
      estimatedDelivery: '2024-01-16',
    },
    {
      id: '3',
      trackingNumber: 'ML555666777',
      sender: '陈七 - 曼德勒市',
      receiver: '刘八 - 仰光市',
      status: '已签收',
      packageType: '服装',
      weight: '1.5kg',
      createdAt: '2024-01-13',
      estimatedDelivery: '2024-01-14',
    },
  ];

  useEffect(() => {
    // 检查登录状态
    const userData = localStorage.getItem('adminUser');
    if (!userData) {
      navigate('/admin/login');
      return;
    }

    try {
      const userInfo = JSON.parse(userData);
      setUser(userInfo);
      setPackages(mockPackages);
    } catch (error) {
      navigate('/admin/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('adminUser');
    navigate('/admin/login');
  };

  const handleEdit = (pkg: Package) => {
    setEditingPackage(pkg);
    setOpenDialog(true);
  };

  const handleDelete = (id: string) => {
    setPackages(packages.filter(pkg => pkg.id !== id));
  };

  const handleSave = () => {
    if (editingPackage) {
      setPackages(packages.map(pkg => 
        pkg.id === editingPackage.id ? editingPackage : pkg
      ));
    }
    setOpenDialog(false);
    setEditingPackage(null);
  };

  const filteredPackages = packages.filter(pkg => {
    const matchesSearch = pkg.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pkg.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pkg.receiver.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || pkg.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case '已签收':
        return 'success';
      case '运输中':
        return 'warning';
      case '已揽收':
        return 'info';
      default:
        return 'default';
    }
  };

  const stats = [
    { title: '总包裹数', value: packages.length, icon: <Inventory />, color: 'primary.main' },
    { title: '运输中', value: packages.filter(p => p.status === '运输中').length, icon: <LocalShipping />, color: 'warning.main' },
    { title: '已签收', value: packages.filter(p => p.status === '已签收').length, icon: <Assessment />, color: 'success.main' },
    { title: '今日新增', value: packages.filter(p => p.createdAt === new Date().toISOString().split('T')[0]).length, icon: <Add />, color: 'info.main' },
  ];

  if (!user) {
    return null;
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'grey.50' }}>
      {/* 顶部导航栏 */}
      <AppBar position="static" sx={{ backgroundColor: 'white', color: 'text.primary' }}>
        <Toolbar>
          <LocalShipping sx={{ color: 'primary.main', mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: 'primary.main', fontWeight: 600 }}>
            ML Express 管理后台
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              欢迎，{user.username} ({user.role})
            </Typography>
            <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                <Person />
              </Avatar>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* 用户菜单 */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem>
          <Person sx={{ mr: 1 }} />
          个人信息
        </MenuItem>
        <MenuItem>
          <Settings sx={{ mr: 1 }} />
          设置
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <Logout sx={{ mr: 1 }} />
          退出登录
        </MenuItem>
      </Menu>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* 统计卡片 */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {stats.map((stat, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Box sx={{ color: stat.color, mb: 1 }}>
                    {stat.icon}
                  </Box>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 700, mb: 1 }}>
                    {stat.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {stat.title}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* 搜索和过滤 */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="搜索快递单号、寄件人、收件人..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                select
                fullWidth
                label="状态筛选"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                SelectProps={{
                  startAdornment: <FilterList sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              >
                <MenuItem value="all">全部状态</MenuItem>
                <MenuItem value="已下单">已下单</MenuItem>
                <MenuItem value="已揽收">已揽收</MenuItem>
                <MenuItem value="运输中">运输中</MenuItem>
                <MenuItem value="已签收">已签收</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Add />}
                onClick={() => setOpenDialog(true)}
              >
                新增包裹
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* 包裹列表 */}
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'grey.50' }}>
                  <TableCell>快递单号</TableCell>
                  <TableCell>寄件人</TableCell>
                  <TableCell>收件人</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>包裹类型</TableCell>
                  <TableCell>重量</TableCell>
                  <TableCell>创建时间</TableCell>
                  <TableCell>预计送达</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPackages.map((pkg) => (
                  <TableRow key={pkg.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      {pkg.trackingNumber}
                    </TableCell>
                    <TableCell>{pkg.sender}</TableCell>
                    <TableCell>{pkg.receiver}</TableCell>
                    <TableCell>
                      <Chip
                        label={pkg.status}
                        color={getStatusColor(pkg.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{pkg.packageType}</TableCell>
                    <TableCell>{pkg.weight}</TableCell>
                    <TableCell>{pkg.createdAt}</TableCell>
                    <TableCell>{pkg.estimatedDelivery}</TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleEdit(pkg)}
                        sx={{ color: 'primary.main' }}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(pkg.id)}
                        sx={{ color: 'error.main' }}
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* 编辑对话框 */}
        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingPackage ? '编辑包裹信息' : '新增包裹'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="快递单号"
                  value={editingPackage?.trackingNumber || ''}
                  onChange={(e) => setEditingPackage(prev => prev ? {...prev, trackingNumber: e.target.value} : null)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="状态"
                  select
                  value={editingPackage?.status || ''}
                  onChange={(e) => setEditingPackage(prev => prev ? {...prev, status: e.target.value} : null)}
                >
                  <MenuItem value="已下单">已下单</MenuItem>
                  <MenuItem value="已揽收">已揽收</MenuItem>
                  <MenuItem value="运输中">运输中</MenuItem>
                  <MenuItem value="已签收">已签收</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="寄件人"
                  value={editingPackage?.sender || ''}
                  onChange={(e) => setEditingPackage(prev => prev ? {...prev, sender: e.target.value} : null)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="收件人"
                  value={editingPackage?.receiver || ''}
                  onChange={(e) => setEditingPackage(prev => prev ? {...prev, receiver: e.target.value} : null)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="包裹类型"
                  value={editingPackage?.packageType || ''}
                  onChange={(e) => setEditingPackage(prev => prev ? {...prev, packageType: e.target.value} : null)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="重量"
                  value={editingPackage?.weight || ''}
                  onChange={(e) => setEditingPackage(prev => prev ? {...prev, weight: e.target.value} : null)}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>取消</Button>
            <Button onClick={handleSave} variant="contained">保存</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default AdminDashboard;
