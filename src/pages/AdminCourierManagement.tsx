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
  Rating,
  LinearProgress,
} from '@mui/material';
import {
  Search,
  Add,
  Visibility,
  Edit,
  Phone,
  LocationOn,
  LocalShipping,
  Person,
  TrendingUp,
} from '@mui/icons-material';
import PremiumBackground from '../components/PremiumBackground';
import { useLanguage } from '../contexts/LanguageContext';

interface Courier {
  id: string;
  name: string;
  phone: string;
  email: string;
  vehicleType: string;
  vehiclePlate: string;
  status: 'online' | 'offline' | 'busy' | 'suspended';
  rating: number;
  completedOrders: number;
  totalEarnings: number;
  currentLocation: string;
  joinedAt: string;
  lastActive: string;
}

const mockCouriers: Courier[] = [
  {
    id: 'C001',
    name: '李师傅',
    phone: '09-111222333',
    email: 'li@courier.com',
    vehicleType: '摩托车',
    vehiclePlate: 'YGN-1234',
    status: 'online',
    rating: 4.9,
    completedOrders: 245,
    totalEarnings: 1250000,
    currentLocation: '仰光市中心区',
    joinedAt: '2023-08-15',
    lastActive: '2024-01-15 12:30',
  },
  {
    id: 'C002',
    name: '王师傅',
    phone: '09-222333444',
    email: 'wang@courier.com',
    vehicleType: '面包车',
    vehiclePlate: 'MDL-5678',
    status: 'busy',
    rating: 4.8,
    completedOrders: 189,
    totalEarnings: 980000,
    currentLocation: '曼德勒市北区',
    joinedAt: '2023-09-20',
    lastActive: '2024-01-15 13:15',
  },
  {
    id: 'C003',
    name: 'Ko Ko',
    phone: '09-333444555',
    email: 'koko@courier.com',
    vehicleType: '摩托车',
    vehiclePlate: 'YGN-9876',
    status: 'offline',
    rating: 4.7,
    completedOrders: 156,
    totalEarnings: 720000,
    currentLocation: '仰光市东区',
    joinedAt: '2023-10-10',
    lastActive: '2024-01-14 18:00',
  },
];

const AdminCourierManagement: React.FC = () => {
  const { t } = useLanguage();
  const [couriers, setCouriers] = useState<Courier[]>(mockCouriers);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const statusColors: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
    online: 'success',
    offline: 'warning',
    busy: 'info',
    suspended: 'error',
  };

  const statusLabels: Record<string, string> = {
    online: '在线',
    offline: '离线',
    busy: '忙碌',
    suspended: '暂停',
  };

  const filteredCouriers = couriers.filter(courier => {
    const matchesSearch = courier.name.toLowerCase().includes(searchText.toLowerCase()) ||
                         courier.phone.includes(searchText) ||
                         courier.vehiclePlate.toLowerCase().includes(searchText.toLowerCase());
    const matchesStatus = statusFilter === 'all' || courier.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Statistics
  const onlineCouriers = couriers.filter(c => c.status === 'online').length;
  const totalCouriers = couriers.length;
  const avgRating = couriers.reduce((sum, c) => sum + c.rating, 0) / couriers.length;
  const totalOrders = couriers.reduce((sum, c) => sum + c.completedOrders, 0);

  const handleToggleStatus = (courierId: string, newStatus: boolean) => {
    setCouriers(couriers.map(courier => 
      courier.id === courierId 
        ? { ...courier, status: newStatus ? 'online' : 'offline' }
        : courier
    ));
  };

  return (
    <PremiumBackground variant="admin" minHeight="100vh">
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ mb: 1, fontWeight: 600, color: 'white' }}>
            快递员管理
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            管理快递员信息，监控配送状态和业绩
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
                      {totalCouriers}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white' }}>
                      总快递员数
                    </Typography>
                  </Box>
                  <LocalShipping sx={{ fontSize: 40, color: '#42a5f5' }} />
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
                      {onlineCouriers}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white' }}>
                      在线快递员
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                      / {totalCouriers}
                    </Typography>
                  </Box>
                  <TrendingUp sx={{ fontSize: 40, color: '#52c41a' }} />
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={(onlineCouriers / totalCouriers) * 100}
                  sx={{ 
                    mt: 1,
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    '& .MuiLinearProgress-bar': { backgroundColor: '#52c41a' },
                  }}
                />
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
                      {avgRating.toFixed(1)}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white' }}>
                      平均评分
                    </Typography>
                    <Rating value={avgRating} readOnly size="small" />
                  </Box>
                  <Person sx={{ fontSize: 40, color: '#faad14' }} />
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
                      {totalOrders}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'white' }}>
                      总完成订单
                    </Typography>
                  </Box>
                  <LocalShipping sx={{ fontSize: 40, color: '#722ed1' }} />
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
                  placeholder="搜索快递员姓名、电话、车牌"
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
                  <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>在线状态</InputLabel>
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
                    <MenuItem value="online">在线</MenuItem>
                    <MenuItem value="offline">离线</MenuItem>
                    <MenuItem value="busy">忙碌</MenuItem>
                    <MenuItem value="suspended">暂停</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Button 
                  variant="contained" 
                  startIcon={<Add />}
                  fullWidth
                  sx={{
                    background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                    '&:hover': { background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)' },
                  }}
                >
                  添加快递员
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Couriers Table */}
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
                      快递员信息
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      车辆信息
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      状态
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      评分
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      完成订单
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      总收入
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      当前位置
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      在线状态
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      操作
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredCouriers.map((courier) => (
                    <TableRow key={courier.id}>
                      <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ backgroundColor: '#1890ff' }}>
                            <LocalShipping />
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {courier.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                              {courier.phone}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Box>
                          <Typography variant="body2">{courier.vehicleType}</Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                            {courier.vehiclePlate}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Chip 
                          label={statusLabels[courier.status]} 
                          color={statusColors[courier.status]}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Rating value={courier.rating} readOnly size="small" />
                          <Typography variant="body2">{courier.rating}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                        {courier.completedOrders}
                      </TableCell>
                      <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#52c41a' }}>
                          {courier.totalEarnings.toLocaleString()} MMK
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LocationOn sx={{ fontSize: 16, color: 'rgba(255,255,255,0.7)' }} />
                          <Typography variant="body2">{courier.currentLocation}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Switch
                          checked={courier.status === 'online'}
                          onChange={(e) => handleToggleStatus(courier.id, e.target.checked)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton size="small" sx={{ color: '#42a5f5' }}>
                            <Visibility fontSize="small" />
                          </IconButton>
                          <IconButton size="small" sx={{ color: '#faad14' }}>
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            sx={{ color: '#52c41a' }}
                            onClick={() => window.open(`tel:${courier.phone}`)}
                          >
                            <Phone fontSize="small" />
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
      </Container>
    </PremiumBackground>
  );
};

export default AdminCourierManagement;
