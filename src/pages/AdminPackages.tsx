import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
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
  Grid,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  TablePagination,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Search,
  LocalShipping,
  Refresh,
  FileDownload,
  QrCodeScanner,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminNavigation from '../components/AdminNavigation';
import { getAdminSession } from '../utils/auth';
import { fetchWithRetry } from '../utils/api';

interface Package {
  id: string;
  trackingNumber: string;
  sender: string;
  receiver: string;
  receiverPhone?: string;
  origin: string;
  destination: string;
  packageType: string;
  weightKg: number;
  dimensions?: { lengthCm: number; widthCm: number; heightCm: number };
  fee: number;
  status: string;
  createdAt: string;
  estimatedDelivery?: string;
  note?: string;
  quantity?: number;
}

const AdminPackages: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = getAdminSession();
  
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [formData, setFormData] = useState<Partial<Package>>({
    trackingNumber: '',
    sender: '',
    receiver: '',
    receiverPhone: '',
    origin: '',
    destination: '',
    packageType: '普通',
    weightKg: 0,
    fee: 0,
    status: '已下单',
    note: '',
    quantity: 1,
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    if (!session) {
      navigate('/admin/login');
    }
  }, [session, navigate]);

  // 获取包裹列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['packages', 'cross', page, rowsPerPage, searchTerm, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        biz: 'cross',
        page: String(page + 1),
        pageSize: String(rowsPerPage),
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });
      
      const response = await fetchWithRetry(`/.netlify/functions/packages-manage?${params}`, {
        headers: {
          'x-ml-actor': session?.username || '',
          'x-ml-role': session?.role || '',
        },
      });
      
      if (!response.ok) throw new Error('获取包裹列表失败');
      return response.json();
    },
    enabled: !!session,
  });

  // 创建包裹
  const createMutation = useMutation({
    mutationFn: async (data: Partial<Package>) => {
      const response = await fetchWithRetry('/.netlify/functions/packages-manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-ml-actor': session?.username || '',
        },
        body: JSON.stringify({
          ...data,
          biz: 'cross',
          createdBy: session?.username,
        }),
      });
      
      if (!response.ok) throw new Error('创建包裹失败');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      setSnackbar({ open: true, message: '包裹创建成功', severity: 'success' });
      handleCloseDialog();
    },
    onError: () => {
      setSnackbar({ open: true, message: '包裹创建失败', severity: 'error' });
    },
  });

  // 更新包裹
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Package> }) => {
      const response = await fetchWithRetry('/.netlify/functions/packages-manage', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-ml-actor': session?.username || '',
        },
        body: JSON.stringify({
          id,
          ...data,
        }),
      });
      
      if (!response.ok) throw new Error('更新包裹失败');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      setSnackbar({ open: true, message: '包裹更新成功', severity: 'success' });
      handleCloseDialog();
    },
    onError: () => {
      setSnackbar({ open: true, message: '包裹更新失败', severity: 'error' });
    },
  });

  // 删除包裹
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetchWithRetry('/.netlify/functions/packages-manage', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-ml-actor': session?.username || '',
        },
        body: JSON.stringify({ id }),
      });
      
      if (!response.ok) throw new Error('删除包裹失败');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packages'] });
      setSnackbar({ open: true, message: '包裹删除成功', severity: 'success' });
    },
    onError: () => {
      setSnackbar({ open: true, message: '包裹删除失败', severity: 'error' });
    },
  });

  const handleEdit = (pkg: Package) => {
    setEditingPackage(pkg);
    setFormData({
      trackingNumber: pkg.trackingNumber,
      sender: pkg.sender,
      receiver: pkg.receiver,
      receiverPhone: pkg.receiverPhone,
      origin: pkg.origin,
      destination: pkg.destination,
      packageType: pkg.packageType,
      weightKg: pkg.weightKg,
      fee: pkg.fee,
      status: pkg.status,
      note: pkg.note,
      quantity: pkg.quantity || 1,
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingPackage(null);
    setFormData({
      trackingNumber: '',
      sender: '',
      receiver: '',
      receiverPhone: '',
      origin: '',
      destination: '',
      packageType: '普通',
      weightKg: 0,
      fee: 0,
      status: '已下单',
      note: '',
      quantity: 1,
    });
  };

  const handleSubmit = () => {
    if (editingPackage) {
      updateMutation.mutate({ id: editingPackage.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
      '已下单': 'default',
      '已入库': 'info',
      '运输中': 'primary',
      '待签收': 'warning',
      '已签收': 'success',
      '异常': 'error',
    };
    return statusColors[status] || 'default';
  };

  const packages = data?.items || [];
  const total = data?.total || 0;

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'grey.50' }}>
      <AdminNavigation title="跨境包裹管理" />
      
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* 统计信息 */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4">{total}</Typography>
              <Typography color="text.secondary">总包裹数</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4">
                {packages.filter((p: Package) => p.status === '运输中').length}
              </Typography>
              <Typography color="text.secondary">运输中</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4">
                {packages.filter((p: Package) => p.status === '待签收').length}
              </Typography>
              <Typography color="text.secondary">待签收</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4">
                {packages.filter((p: Package) => p.status === '已签收').length}
              </Typography>
              <Typography color="text.secondary">已签收</Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* 搜索和筛选 */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="搜索包裹"
                variant="outlined"
                size="small"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>状态筛选</InputLabel>
                <Select
                  value={statusFilter}
                  label="状态筛选"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">全部</MenuItem>
                  <MenuItem value="已下单">已下单</MenuItem>
                  <MenuItem value="已入库">已入库</MenuItem>
                  <MenuItem value="运输中">运输中</MenuItem>
                  <MenuItem value="待签收">待签收</MenuItem>
                  <MenuItem value="已签收">已签收</MenuItem>
                  <MenuItem value="异常">异常</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={5}>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={() => refetch()}
                >
                  刷新
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<QrCodeScanner />}
                  onClick={() => navigate('/admin/scan')}
                >
                  扫码录入
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setOpenDialog(true)}
                >
                  新增包裹
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* 包裹列表 */}
        <Paper>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : packages.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">暂无包裹数据</Typography>
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>追踪号</TableCell>
                      <TableCell>发件人</TableCell>
                      <TableCell>收件人</TableCell>
                      <TableCell>路线</TableCell>
                      <TableCell>重量/数量</TableCell>
                      <TableCell>费用</TableCell>
                      <TableCell>状态</TableCell>
                      <TableCell>创建时间</TableCell>
                      <TableCell>操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {packages.map((pkg: Package) => (
                      <TableRow key={pkg.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {pkg.trackingNumber}
                          </Typography>
                        </TableCell>
                        <TableCell>{pkg.sender}</TableCell>
                        <TableCell>
                          {pkg.receiver}
                          {pkg.receiverPhone && (
                            <Typography variant="caption" display="block" color="text.secondary">
                              {pkg.receiverPhone}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {pkg.origin} → {pkg.destination}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {pkg.weightKg}kg / {pkg.quantity || 1}件
                        </TableCell>
                        <TableCell>¥{pkg.fee}</TableCell>
                        <TableCell>
                          <Chip
                            label={pkg.status}
                            size="small"
                            color={getStatusColor(pkg.status)}
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(pkg.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Tooltip title="编辑">
                            <IconButton size="small" onClick={() => handleEdit(pkg)}>
                              <Edit />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="删除">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                if (window.confirm('确定要删除这个包裹吗？')) {
                                  deleteMutation.mutate(pkg.id);
                                }
                              }}
                            >
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[10, 25, 50]}
                component="div"
                count={total}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                labelRowsPerPage="每页显示"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} 共 ${count}`}
              />
            </>
          )}
        </Paper>

        {/* 新增/编辑对话框 */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingPackage ? '编辑包裹' : '新增包裹'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="追踪号"
                  value={formData.trackingNumber}
                  onChange={(e) => setFormData({ ...formData, trackingNumber: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>包裹类型</InputLabel>
                  <Select
                    value={formData.packageType}
                    label="包裹类型"
                    onChange={(e) => setFormData({ ...formData, packageType: e.target.value })}
                  >
                    <MenuItem value="普通">普通</MenuItem>
                    <MenuItem value="快件">快件</MenuItem>
                    <MenuItem value="特殊">特殊</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="发件人"
                  value={formData.sender}
                  onChange={(e) => setFormData({ ...formData, sender: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="收件人"
                  value={formData.receiver}
                  onChange={(e) => setFormData({ ...formData, receiver: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="收件人电话"
                  value={formData.receiverPhone}
                  onChange={(e) => setFormData({ ...formData, receiverPhone: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>状态</InputLabel>
                  <Select
                    value={formData.status}
                    label="状态"
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <MenuItem value="已下单">已下单</MenuItem>
                    <MenuItem value="已入库">已入库</MenuItem>
                    <MenuItem value="运输中">运输中</MenuItem>
                    <MenuItem value="待签收">待签收</MenuItem>
                    <MenuItem value="已签收">已签收</MenuItem>
                    <MenuItem value="异常">异常</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="始发地"
                  value={formData.origin}
                  onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="目的地"
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="重量(kg)"
                  type="number"
                  value={formData.weightKg}
                  onChange={(e) => setFormData({ ...formData, weightKg: parseFloat(e.target.value) || 0 })}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="数量"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="费用"
                  type="number"
                  value={formData.fee}
                  onChange={(e) => setFormData({ ...formData, fee: parseFloat(e.target.value) || 0 })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="备注"
                  multiline
                  rows={3}
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>取消</Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingPackage ? '更新' : '创建'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* 消息提示 */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
};

export default AdminPackages;

