import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
} from '@mui/material';
import {
  Save,
  Add,
  Edit,
  Delete,
  Person,
  Settings,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import PremiumBackground from '../components/PremiumBackground';
import { useLanguage } from '../contexts/LanguageContext';

interface PriceRule {
  id: string;
  name: string;
  basePrice: number;
  pricePerKm: number;
  pricePerKg: number;
  maxDistance: number;
  isActive: boolean;
}

// AdminUser 接口已删除 - 使用新的管理系统

const mockPriceRules: PriceRule[] = [
  {
    id: 'PR001',
    name: '市内标准',
    basePrice: 5000,
    pricePerKm: 1000,
    pricePerKg: 500,
    maxDistance: 10,
    isActive: true,
  },
  {
    id: 'PR002',
    name: '跨区配送',
    basePrice: 8000,
    pricePerKm: 1500,
    pricePerKg: 800,
    maxDistance: 50,
    isActive: true,
  },
];

// mockAdminUsers 已删除 - 使用新的管理系统

const AdminCourierSettings: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [priceRules, setPriceRules] = useState<PriceRule[]>(mockPriceRules);
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState<PriceRule | null>(null);

  // System settings state
  const [systemSettings, setSystemSettings] = useState({
    companyName: 'MARKET LINK EXPRESS',
    companyPhone: '09-259369349',
    companyEmail: 'marketlink982@gmail.com',
    companyAddress: 'Chan Mya Tha Zi, Mandalay',
    orderTimeout: 30,
    deliveryRadius: 50,
    enableSms: true,
    enableEmail: true,
    autoAssign: false,
    currency: 'MMK',
    defaultLanguage: 'my',
  });

  // roleLabels 已删除 - 使用新的管理系统

  const handleSaveSettings = () => {
    console.log('Saving system settings:', systemSettings);
    // Here you would save to backend
  };

  const handleAddPrice = () => {
    setEditingPrice(null);
    setPriceDialogOpen(true);
  };

  const handleEditPrice = (price: PriceRule) => {
    setEditingPrice(price);
    setPriceDialogOpen(true);
  };

  // 管理员用户相关函数已删除

  return (
    <PremiumBackground variant="admin" minHeight="100vh">
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 600, color: 'white' }}>
              系统设置
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
            配置系统参数、价格规则和管理员权限
          </Typography>
        </Box>

        {/* System Configuration */}
        <Card sx={{ 
          background: 'rgba(255, 255, 255, 0.1)', 
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          mb: 4,
        }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 600, mb: 3 }}>
              系统配置
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="公司名称"
                  value={systemSettings.companyName}
                  onChange={(e) => setSystemSettings({...systemSettings, companyName: e.target.value})}
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
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="公司电话"
                  value={systemSettings.companyPhone}
                  onChange={(e) => setSystemSettings({...systemSettings, companyPhone: e.target.value})}
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
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="公司邮箱"
                  value={systemSettings.companyEmail}
                  onChange={(e) => setSystemSettings({...systemSettings, companyEmail: e.target.value})}
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
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>默认货币</InputLabel>
                  <Select
                    value={systemSettings.currency}
                    onChange={(e) => setSystemSettings({...systemSettings, currency: e.target.value})}
                    sx={{
                      color: 'white',
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#42a5f5' },
                      '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.7)' },
                    }}
                  >
                    <MenuItem value="MMK">缅甸元 (MMK)</MenuItem>
                    <MenuItem value="USD">美元 (USD)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="公司地址"
                  value={systemSettings.companyAddress}
                  onChange={(e) => setSystemSettings({...systemSettings, companyAddress: e.target.value})}
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

            <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }} />

            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="订单超时时间(分钟)"
                  value={systemSettings.orderTimeout}
                  onChange={(e) => setSystemSettings({...systemSettings, orderTimeout: parseInt(e.target.value)})}
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
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="配送范围(公里)"
                  value={systemSettings.deliveryRadius}
                  onChange={(e) => setSystemSettings({...systemSettings, deliveryRadius: parseInt(e.target.value)})}
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
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>系统语言</InputLabel>
                  <Select
                    value={systemSettings.defaultLanguage}
                    onChange={(e) => setSystemSettings({...systemSettings, defaultLanguage: e.target.value})}
                    sx={{
                      color: 'white',
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#42a5f5' },
                      '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.7)' },
                    }}
                  >
                    <MenuItem value="zh">中文</MenuItem>
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="my">မြန်မာ</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }} />

            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={systemSettings.enableSms}
                      onChange={(e) => setSystemSettings({...systemSettings, enableSms: e.target.checked})}
                    />
                  }
                  label={<Typography sx={{ color: 'white' }}>启用短信通知</Typography>}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={systemSettings.enableEmail}
                      onChange={(e) => setSystemSettings({...systemSettings, enableEmail: e.target.checked})}
                    />
                  }
                  label={<Typography sx={{ color: 'white' }}>启用邮件通知</Typography>}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={systemSettings.autoAssign}
                      onChange={(e) => setSystemSettings({...systemSettings, autoAssign: e.target.checked})}
                    />
                  }
                  label={<Typography sx={{ color: 'white' }}>自动分配订单</Typography>}
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 3 }}>
              <Button 
                variant="contained" 
                startIcon={<Save />}
                onClick={handleSaveSettings}
                sx={{
                  background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                  '&:hover': { background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)' },
                }}
              >
                保存设置
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Price Rules */}
        <Card sx={{ 
          background: 'rgba(255, 255, 255, 0.1)', 
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          mb: 4,
        }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                价格规则
              </Typography>
              <Button 
                variant="contained" 
                startIcon={<Add />}
                onClick={handleAddPrice}
                sx={{
                  background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                  '&:hover': { background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)' },
                }}
              >
                添加规则
              </Button>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      规则名称
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      起步价
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      每公里价格
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      每公斤价格
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      最大距离
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      状态
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      操作
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {priceRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                        {rule.name}
                      </TableCell>
                      <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                        {rule.basePrice.toLocaleString()} MMK
                      </TableCell>
                      <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                        {rule.pricePerKm.toLocaleString()} MMK
                      </TableCell>
                      <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                        {rule.pricePerKg.toLocaleString()} MMK
                      </TableCell>
                      <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                        {rule.maxDistance} km
                      </TableCell>
                      <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Switch checked={rule.isActive} size="small" disabled />
                      </TableCell>
                      <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton 
                            size="small" 
                            onClick={() => handleEditPrice(rule)}
                            sx={{ color: '#faad14' }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton size="small" sx={{ color: '#f5222d' }}>
                            <Delete fontSize="small" />
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

        {/* 管理员账户部分已删除 - 用户已配置新的管理系统 */}

        {/* Price Rule Dialog - Placeholder */}
        <Dialog 
          open={priceDialogOpen} 
          onClose={() => setPriceDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {editingPrice ? '编辑价格规则' : '添加价格规则'}
          </DialogTitle>
          <DialogContent>
            <Typography>价格规则编辑功能</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPriceDialogOpen(false)}>取消</Button>
            <Button variant="contained">保存</Button>
          </DialogActions>
        </Dialog>

        {/* 管理员用户对话框已删除 */}
      </Container>
    </PremiumBackground>
  );
};

export default AdminCourierSettings;
