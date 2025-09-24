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
  Snackbar,
  useTheme,
  AppBar,
  Toolbar,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  FormControl,
  InputLabel,
  Select,
  styled,
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
  CloudUpload,
  Work,
  Badge,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import PremiumBackground from '../components/PremiumBackground';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher, { LanguageType } from '../components/LanguageSwitcher';

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
  // 新增：规格/体积相关
  dimensions?: { lengthCm: number; widthCm: number; heightCm: number };
  // 新增：费用（用于自动生成财务记录）
  fee?: number;
}

interface User {
  username: string;
  role: string;
  loginTime: string;
}

interface FinanceTxn {
  id: string;
  type: '收入' | '支出';
  amount: number;
  note: string;
  date: string;
  category?: string;
}

const AdminDashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  // 使用独立的草稿对象，避免受控组件因 null 状态导致无法输入
  const [draftPackage, setDraftPackage] = useState<Package | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [finance, setFinance] = useState<FinanceTxn[]>([]);
  const [openFinanceDialog, setOpenFinanceDialog] = useState(false);
  const [newTxn, setNewTxn] = useState<FinanceTxn>({ id: '', type: '收入', amount: 0, note: '', date: new Date().toISOString().slice(0,10) });
  const [toast, setToast] = useState<{ open: boolean; text: string; severity: 'success' | 'error' | 'info' | 'warning' }>({ open: false, text: '', severity: 'success' });
  const theme = useTheme();
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();

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
      // 加载包裹数据（优先本地存储，没有则使用示例数据）
      try {
        const rawPkgs = localStorage.getItem('packages');
        const parsed = rawPkgs ? JSON.parse(rawPkgs) : null;
        if (Array.isArray(parsed)) {
          setPackages(parsed);
        } else {
          setPackages(mockPackages);
          localStorage.setItem('packages', JSON.stringify(mockPackages));
        }
      } catch {
        setPackages(mockPackages);
      }
      // 读取财务数据
      try {
        const rawFinance = localStorage.getItem('finance');
        setFinance(rawFinance ? JSON.parse(rawFinance) : []);
      } catch { setFinance([]); }
    } catch (error) {
      navigate('/admin/login');
    }
  }, [navigate]);

  // 同步包裹数据到本地存储
  useEffect(() => {
    try {
      localStorage.setItem('packages', JSON.stringify(packages));
    } catch {}
  }, [packages]);

  // 确保打开对话框时一定有可编辑的对象，避免 null 导致无法输入
  useEffect(() => {
    if (openDialog && !draftPackage) {
      setDraftPackage(createEmptyPackage());
    }
  }, [openDialog, draftPackage]);

  const handleLogout = () => {
    localStorage.removeItem('adminUser');
    navigate('/admin/login');
  };

  const handleEdit = (pkg: Package) => {
    setDraftPackage({ ...pkg });
    setOpenDialog(true);
  };

  const handleDelete = (id: string) => {
    setPackages(packages.filter(pkg => pkg.id !== id));
    setToast({ open: true, text: '已删除包裹', severity: 'success' });
  };

  const handleSave = () => {
    if (!draftPackage) return;

    const isNew = !draftPackage.id;
    const withId: Package = isNew ? { ...draftPackage, id: Date.now().toString() } : draftPackage;

    if (isNew) {
      setPackages([withId, ...packages]);

      // 新增包裹时写入一条财务收入记录（金额取包裹费用fee，默认0）
      const entry: FinanceTxn = {
        id: `${withId.id}-fee`,
        type: '收入',
        amount: Number(withId.fee || 0),
        note: `新包裹入库 - 单号 ${withId.trackingNumber}`,
        date: withId.createdAt || new Date().toISOString().slice(0,10),
        category: '运费',
      };
      const updatedFinance = [entry, ...finance];
      setFinance(updatedFinance);
      localStorage.setItem('finance', JSON.stringify(updatedFinance));
      // 确保新增后可见：清空搜索并切换为“全部状态”
      setSearchTerm('');
      setFilterStatus('all');
      setToast({ open: true, text: '新增包裹成功', severity: 'success' });
    } else {
      setPackages(packages.map(pkg => pkg.id === withId.id ? withId : pkg));
      setToast({ open: true, text: '保存成功', severity: 'success' });
    }

    setOpenDialog(false);
    setDraftPackage(null);
  };

  const createEmptyPackage = (): Package => {
    const today = new Date();
    const yyyyMmDd = today.toISOString().slice(0, 10);
    const eta = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return {
      id: '',
      trackingNumber: '',
      sender: '',
      receiver: '',
      status: '已下单',
      packageType: '',
      weight: '',
      createdAt: yyyyMmDd,
      estimatedDelivery: eta,
      dimensions: { lengthCm: 0, widthCm: 0, heightCm: 0 },
      fee: 0,
    };
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

  const canViewFinance = user && ['accountant', 'manager', 'master'].includes(user.role);



  const financeSummary = finance.reduce((acc, t) => {
    if (t.type === '收入') acc.income += t.amount; else acc.expense += t.amount;
    return acc;
  }, { income: 0, expense: 0 });

  const handleAddTxn = () => {
    if (!newTxn.amount || newTxn.amount <= 0) return;
    const entry = { ...newTxn, id: Date.now().toString() };
    const updated = [entry, ...finance];
    setFinance(updated);
    localStorage.setItem('finance', JSON.stringify(updated));
    setOpenFinanceDialog(false);
    setNewTxn({ id: '', type: '收入', amount: 0, note: '', date: new Date().toISOString().slice(0,10) });
  };

  if (!user) {
    return null;
  }

  return (
    <PremiumBackground variant="admin" minHeight="100vh">
      {/* 顶部导航栏 */}
      <AppBar position="static" sx={{ 
        background: 'rgba(255, 255, 255, 0.1)', 
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      }}>
        <Toolbar>
          <Box
            sx={{
              width: 40,
              height: 40,
              background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mr: 2,
              boxShadow: '0 4px 20px rgba(44, 62, 80, 0.3)',
              position: 'relative',
              '&::after': {
                content: '""',
                position: 'absolute',
                top: '50%',
                right: 6,
                width: 8,
                height: 6,
                background: 'white',
                clipPath: 'polygon(0 0, 100% 50%, 0 100%)',
                transform: 'translateY(-50%)',
              }
            }}
          >
            <Typography
              sx={{
                fontSize: '16px',
                fontWeight: 900,
                color: 'white',
                letterSpacing: '-1px',
                fontFamily: '"Arial Black", sans-serif',
              }}
            >
              ML
            </Typography>
          </Box>
          <Typography variant="h6" component="div" sx={{ 
            flexGrow: 1, 
            color: 'white', 
            fontWeight: 700,
            letterSpacing: '1px',
          }}>
            MARKET LINK EXPRESS {t('adminPanel')}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* 控制台按钮 */}
            <Button
              variant="outlined"
              onClick={() => navigate('/admin/control-panel')}
              sx={{
                borderColor: 'rgba(255,255,255,0.3)',
                color: 'white',
                borderRadius: '20px',
                px: 2,
                py: 0.5,
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': { 
                  borderColor: 'rgba(255,255,255,0.5)',
                  background: 'rgba(255,255,255,0.1)',
                },
              }}
            >
              控制台
            </Button>
            
            {/* 云升级按钮 */}
            <Button
              variant="contained"
              onClick={() => navigate('/admin/cloud-upgrade')}
              sx={{
                background: 'linear-gradient(135deg, #722ed1 0%, #9c27b0 100%)',
                color: 'white',
                borderRadius: '20px',
                px: 2,
                py: 0.5,
                textTransform: 'none',
                fontWeight: 600,
                boxShadow: '0 4px 20px rgba(156, 39, 176, 0.3)',
                '&:hover': { 
                  background: 'linear-gradient(135deg, #6a1b9a 0%, #8e24aa 100%)',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 6px 25px rgba(156, 39, 176, 0.4)',
                },
              }}
            >
              ☁️ 云升级
            </Button>
            
            <Typography variant="body2" sx={{ color: 'white' }}>
              {t('welcome')}，{user.username} ({user.role})
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
          {t('logout')}
        </MenuItem>
      </Menu>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* 管理模块导航 */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ mb: 3, fontWeight: 600, color: 'white' }}>
            管理中心
          </Typography>
          <Grid container spacing={3}>
            {/* 仪表盘 */}
            <Grid item xs={12} sm={6} md={4}>
              <Card
                sx={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.2)',
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 40px rgba(255, 255, 255, 0.1)',
                  },
                }}
                onClick={() => navigate('/admin/courier-dashboard')}
              >
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <Assessment sx={{ fontSize: 48, color: '#42a5f5', mb: 2 }} />
                  <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, mb: 1 }}>
                    仪表板
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    实时数据统计和系统监控
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* 订单管理 */}
            <Grid item xs={12} sm={6} md={4}>
              <Card
                sx={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.2)',
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 40px rgba(255, 255, 255, 0.1)',
                  },
                }}
                onClick={() => navigate('/admin/orders')}
              >
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <LocalShipping sx={{ fontSize: 48, color: '#52c41a', mb: 2 }} />
                  <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, mb: 1 }}>
                    订单管理
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    订单处理和状态跟踪
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* 用户管理 */}
            <Grid item xs={12} sm={6} md={4}>
              <Card
                sx={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.2)',
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 40px rgba(255, 255, 255, 0.1)',
                  },
                }}
                onClick={() => navigate('/admin/users')}
              >
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <People sx={{ fontSize: 48, color: '#faad14', mb: 2 }} />
                  <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, mb: 1 }}>
                    用户管理
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    客户信息和行为分析
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* 快递员管理 */}
            <Grid item xs={12} sm={6} md={4}>
              <Card
                sx={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.2)',
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 40px rgba(255, 255, 255, 0.1)',
                  },
                }}
                onClick={() => navigate('/admin/couriers')}
              >
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <LocalShipping sx={{ fontSize: 48, color: '#722ed1', mb: 2 }} />
                  <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, mb: 1 }}>
                    快递员管理
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    快递员信息和业绩管理
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* 财务管理 */}
            <Grid item xs={12} sm={6} md={4}>
              <Card
                sx={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.2)',
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 40px rgba(255, 255, 255, 0.1)',
                  },
                }}
                onClick={() => navigate('/admin/courier-finance')}
              >
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <Assessment sx={{ fontSize: 48, color: '#f5222d', mb: 2 }} />
                  <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, mb: 1 }}>
                    财务管理
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    收入统计和佣金管理
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* 系统设置 */}
            <Grid item xs={12} sm={6} md={4}>
              <Card
                sx={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: 'rgba(255, 255, 255, 0.2)',
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 40px rgba(255, 255, 255, 0.1)',
                  },
                }}
                onClick={() => navigate('/admin/courier-settings')}
              >
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <Settings sx={{ fontSize: 48, color: '#13c2c2', mb: 2 }} />
                  <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, mb: 1 }}>
                    系统设置
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    价格规则和系统配置
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>


        {/* 包裹列表已移除 */}

        {/* 包裹编辑对话框已移除 */}

        {/* 员工管理已移动到控制台 */}

        {/* 新增财务记录对话框 */}
        <Dialog open={openFinanceDialog} onClose={() => setOpenFinanceDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>新增财务记录</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth label="类型" value={newTxn.type} onChange={(e) => setNewTxn({ ...newTxn, type: e.target.value as any })}>
                  <MenuItem value="收入">收入</MenuItem>
                  <MenuItem value="支出">支出</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="金额" type="number" value={newTxn.amount} onChange={(e) => setNewTxn({ ...newTxn, amount: Number(e.target.value) })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="日期" type="date" value={newTxn.date} onChange={(e) => setNewTxn({ ...newTxn, date: e.target.value })} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="备注" value={newTxn.note} onChange={(e) => setNewTxn({ ...newTxn, note: e.target.value })} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenFinanceDialog(false)}>取消</Button>
            <Button variant="contained" onClick={handleAddTxn}>保存</Button>
          </DialogActions>
        </Dialog>
      </Container>
      {/* 全局提示 */}
      <Snackbar
        open={toast.open}
        autoHideDuration={2500}
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setToast(prev => ({ ...prev, open: false }))} severity={toast.severity} sx={{ width: '100%' }}>
          {toast.text}
        </Alert>
      </Snackbar>
    </PremiumBackground>
  );
};

export default AdminDashboard;
