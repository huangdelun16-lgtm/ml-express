import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
} from '@mui/material';
import {
  Search,
  Add,
  Edit,
  Work,
  Badge,
  CloudUpload,
  Person,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import PremiumBackground from '../components/PremiumBackground';
import { useLanguage } from '../contexts/LanguageContext';

interface Employee {
  id: string;
  workId: string;
  username: string;
  role: 'employee' | 'accountant' | 'manager' | 'admin';
  name: string;
  phone: string;
  email: string;
  address: string;
  idNumber: string;
  joinDate: string;
  salary: number;
  avatar?: string;
  status: 'active' | 'inactive';
}

const mockEmployees: Employee[] = [
  {
    id: 'E001',
    workId: 'ML001',
    username: 'master',
    role: 'admin',
    name: 'AMT',
    phone: '09-123456789',
    email: 'amt@marketlink.com',
    address: '仰光市中心区',
    idNumber: '12/LAKANA(N)123456',
    joinDate: '2023-06-06',
    salary: 1000000,
    status: 'active',
  },
  {
    id: 'E002',
    workId: 'ML002',
    username: 'MDY2409251',
    role: 'manager',
    name: 'KO AUNG',
    phone: '09-987654321',
    email: 'koaung@marketlink.com',
    address: '曼德勒市北区',
    idNumber: '12/MAHAAUNGMYE(N)789012',
    joinDate: '2025-09-24',
    salary: 800000,
    status: 'active',
  },
  {
    id: 'E003',
    workId: 'ML003',
    username: 'MDY2409252',
    role: 'employee',
    name: 'KO KO',
    phone: '09-555666777',
    email: 'koko@marketlink.com',
    address: '仰光市东区',
    idNumber: '12/YANKIN(N)345678',
    joinDate: '2025-09-24',
    salary: 600000,
    status: 'active',
  },
  {
    id: 'E004',
    workId: 'ML004',
    username: 'MDY2409253',
    role: 'accountant',
    name: 'MA MYAT NOE',
    phone: '09-444333222',
    email: 'mamyatnoe@marketlink.com',
    address: '曼德勒市南区',
    idNumber: '12/CHANMYATHAZI(N)567890',
    joinDate: '2025-09-24',
    salary: 700000,
    status: 'active',
  },
];

const AdminControlPanel: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>(mockEmployees);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [addEmployeeDialogOpen, setAddEmployeeDialogOpen] = useState(false);
  const [editEmployeeDialogOpen, setEditEmployeeDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [newEmployeeData, setNewEmployeeData] = useState({
    workId: '',
    username: '',
    role: 'employee' as 'employee' | 'accountant' | 'manager' | 'admin',
    name: '',
    phone: '',
    email: '',
    address: '',
    idNumber: '',
    joinDate: new Date().toISOString().split('T')[0],
    salary: 450000,
    password: '',
    avatar: '',
  });

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

  const statusLabels = {
    active: '活跃',
    inactive: '不活跃',
  };

  const statusColors: Record<string, 'success' | 'warning'> = {
    active: 'success',
    inactive: 'warning',
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchText.toLowerCase()) ||
                         emp.username.toLowerCase().includes(searchText.toLowerCase()) ||
                         emp.phone.includes(searchText) ||
                         emp.email.toLowerCase().includes(searchText.toLowerCase()) ||
                         emp.workId.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleAddEmployee = () => {
    setSelectedEmployee(null);
    setNewEmployeeData({
      workId: '',
      username: '',
      role: 'employee',
      name: '',
      phone: '',
      email: '',
      address: '',
      idNumber: '',
      joinDate: new Date().toISOString().split('T')[0],
      salary: 450000,
      password: '',
      avatar: '',
    });
    setAddEmployeeDialogOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setNewEmployeeData({
      workId: employee.workId,
      username: employee.username,
      role: employee.role,
      name: employee.name,
      phone: employee.phone,
      email: employee.email,
      address: employee.address,
      idNumber: employee.idNumber,
      joinDate: employee.joinDate,
      salary: employee.salary,
      password: '',
      avatar: employee.avatar || '',
    });
    setEditEmployeeDialogOpen(true);
  };

  const handleSaveEmployee = () => {
    try {
      if (selectedEmployee) {
        // 编辑员工
        setEmployees(employees.map(emp => 
          emp.id === selectedEmployee.id 
            ? { ...emp, ...newEmployeeData, password: newEmployeeData.password || emp.username }
            : emp
        ));
      } else {
        // 新增员工
        const newEmployee: Employee = {
          id: `E${String(employees.length + 1).padStart(3, '0')}`,
          ...newEmployeeData,
          status: 'active',
        };
        setEmployees([...employees, newEmployee]);
      }
      
      // 重置表单
      setNewEmployeeData({
        workId: '',
        username: '',
        role: 'employee',
        name: '',
        phone: '',
        email: '',
        address: '',
        idNumber: '',
        joinDate: new Date().toISOString().split('T')[0],
        salary: 450000,
        password: '',
        avatar: '',
      });
      setSelectedEmployee(null);
      setAddEmployeeDialogOpen(false);
      setEditEmployeeDialogOpen(false);
    } catch (error) {
      console.error('保存员工失败:', error);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setNewEmployeeData({ ...newEmployeeData, avatar: e.target?.result as string });
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
              员工管理
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
            管理公司员工信息，包括工作号、角色、薪水等详细信息
          </Typography>
        </Box>

        {/* Search and Filter */}
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
                  <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>全部状态</InputLabel>
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
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Button 
                  variant="contained" 
                  startIcon={<Add />}
                  fullWidth
                  onClick={handleAddEmployee}
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

        {/* Employees Table */}
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
                      用户名
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      角色
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      姓名
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      薪水
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      入职日期
                    </TableCell>
                    <TableCell sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.1)' }}>
                      操作
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Work sx={{ fontSize: 16, color: '#42a5f5' }} />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {employee.workId}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                        {employee.username}
                      </TableCell>
                      <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Chip 
                          label={roleLabels[employee.role]} 
                          color={roleColors[employee.role]}
                          size="small"
                          icon={<Badge />}
                        />
                      </TableCell>
                      <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar 
                            src={employee.avatar} 
                            sx={{ backgroundColor: '#1890ff', width: 32, height: 32 }}
                          >
                            <Person />
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {employee.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                              {employee.phone}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#52c41a' }}>
                          {employee.salary.toLocaleString()} MMK
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.1)' }}>
                        {employee.joinDate}
                      </TableCell>
                      <TableCell sx={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                        <IconButton 
                          size="small" 
                          sx={{ color: '#faad14' }}
                          onClick={() => handleEditEmployee(employee)}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Add Employee Dialog */}
        <Dialog 
          open={addEmployeeDialogOpen} 
          onClose={() => setAddEmployeeDialogOpen(false)}
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
            新增员工
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {/* 工作号 */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="工作号"
                  value={newEmployeeData.workId}
                  onChange={(e) => setNewEmployeeData({...newEmployeeData, workId: e.target.value})}
                  placeholder="例: ML005"
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
                    value={newEmployeeData.role}
                    onChange={(e) => setNewEmployeeData({...newEmployeeData, role: e.target.value as any})}
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
                  value={newEmployeeData.username}
                  onChange={(e) => setNewEmployeeData({...newEmployeeData, username: e.target.value})}
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
                  value={newEmployeeData.password}
                  onChange={(e) => setNewEmployeeData({...newEmployeeData, password: e.target.value})}
                  placeholder={selectedEmployee ? "留空则不修改" : ""}
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
                  value={newEmployeeData.name}
                  onChange={(e) => setNewEmployeeData({...newEmployeeData, name: e.target.value})}
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
                  value={newEmployeeData.phone}
                  onChange={(e) => setNewEmployeeData({...newEmployeeData, phone: e.target.value})}
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
                  value={newEmployeeData.email}
                  onChange={(e) => setNewEmployeeData({...newEmployeeData, email: e.target.value})}
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
                  value={newEmployeeData.idNumber}
                  onChange={(e) => setNewEmployeeData({...newEmployeeData, idNumber: e.target.value})}
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
                  value={newEmployeeData.address}
                  onChange={(e) => setNewEmployeeData({...newEmployeeData, address: e.target.value})}
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
                  value={newEmployeeData.joinDate}
                  onChange={(e) => setNewEmployeeData({...newEmployeeData, joinDate: e.target.value})}
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
                  value={newEmployeeData.salary}
                  onChange={(e) => setNewEmployeeData({...newEmployeeData, salary: parseInt(e.target.value) || 0})}
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
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={handleFileUpload}
                    />
                  </Button>
                  {newEmployeeData.avatar && (
                    <Avatar 
                      src={newEmployeeData.avatar} 
                      sx={{ width: 40, height: 40 }}
                    />
                  )}
                </Box>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setAddEmployeeDialogOpen(false)}
              sx={{ color: 'white' }}
            >
              取消
            </Button>
            <Button 
              onClick={handleSaveEmployee}
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

        {/* Edit Employee Dialog */}
        <Dialog 
          open={editEmployeeDialogOpen} 
          onClose={() => setEditEmployeeDialogOpen(false)}
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
            编辑员工 - {selectedEmployee?.name}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {/* 相同的表单字段 */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="工作号"
                  value={newEmployeeData.workId}
                  onChange={(e) => setNewEmployeeData({...newEmployeeData, workId: e.target.value})}
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
                    value={newEmployeeData.role}
                    onChange={(e) => setNewEmployeeData({...newEmployeeData, role: e.target.value as any})}
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
                  value={newEmployeeData.name}
                  onChange={(e) => setNewEmployeeData({...newEmployeeData, name: e.target.value})}
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
                  value={newEmployeeData.salary}
                  onChange={(e) => setNewEmployeeData({...newEmployeeData, salary: parseInt(e.target.value) || 0})}
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
              onClick={() => setEditEmployeeDialogOpen(false)}
              sx={{ color: 'white' }}
            >
              取消
            </Button>
            <Button 
              onClick={handleSaveEmployee}
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

export default AdminControlPanel;