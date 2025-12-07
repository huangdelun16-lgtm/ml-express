import React, { useState, useEffect } from 'react';
import { SkeletonTable } from '../components/SkeletonLoader';
import { useNavigate } from 'react-router-dom';
import { supabase, auditLogService, deliveryStoreService } from '../services/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useResponsive } from '../hooks/useResponsive';

// 用户数据类型定义
interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  password?: string;
  user_type: 'customer' | 'courier' | 'admin';
  status: 'active' | 'inactive' | 'suspended';
  registration_date: string;
  last_login: string;
  total_orders: number;
  total_spent: number;
  rating: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

interface Courier {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  vehicle_type: string;
  license_number: string;
  status: string;
  join_date: string;
  last_active: string;
  total_deliveries: number;
  rating: number;
  notes: string;
  employee_id?: string;
  department?: string;
  position?: string;
  role?: string;
  region?: string;
  created_at?: string;
  updated_at?: string;
}

const UserManagement: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'customer_list' | 'admin_list' | 'partner_store' | 'courier_management'>('customer_list');
  const { isMobile, isTablet, isDesktop, width } = useResponsive();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [partnerStores, setPartnerStores] = useState<any[]>([]);
  const [loadingStores, setLoadingStores] = useState(false);
  
  // 快递员管理状态
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [courierLoading, setCourierLoading] = useState(true);
  const [courierSubTab, setCourierSubTab] = useState<'list' | 'create'>('list');
  const [courierSearchTerm, setCourierSearchTerm] = useState('');
  const [courierStatusFilter, setCourierStatusFilter] = useState('all');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [editingCourier, setEditingCourier] = useState<Courier | null>(null);
  const [importing, setImporting] = useState(false);
  const [courierForm, setCourierForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    vehicle_type: 'motorcycle',
    license_number: '',
    status: 'active',
    notes: '',
    employee_id: '',
    department: '',
    position: '',
    role: 'operator' as 'admin' | 'manager' | 'operator' | 'finance',
    region: 'yangon' as 'yangon' | 'mandalay'
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  // const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // 批量操作状态
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  // 批量选择处理
  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length && filteredUsers.length > 0) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  // 批量删除处理
  const handleBatchDelete = async () => {
    if (selectedUsers.size === 0) return;
    
    if (!window.confirm(`确定要删除选中的 ${selectedUsers.size} 个用户吗？此操作不可恢复！`)) return;

    try {
      setIsBatchDeleting(true);
      const { error } = await supabase
        .from('users')
        .delete()
        .in('id', Array.from(selectedUsers));

      if (error) {
        console.error('批量删除失败:', error);
        window.alert('批量删除失败，请重试');
      } else {
        await loadUsers();
        setSelectedUsers(new Set());
        window.alert('批量删除成功');
      }
    } catch (error) {
      console.error('批量删除异常:', error);
      window.alert('操作出错');
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const [userForm, setUserForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    password: '123456',  // 默认密码
    user_type: 'customer' as 'customer' | 'courier' | 'admin',
    status: 'active' as 'active' | 'inactive' | 'suspended',
    notes: ''
  });

  // 过滤用户
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.phone.includes(searchTerm) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
                         
    // 根据当前标签页过滤类型
    let matchesType = true;
    if (activeTab === 'customer_list') {
      matchesType = user.user_type === 'customer';
    } else if (activeTab === 'admin_list') {
      matchesType = user.user_type === 'admin';
    }
    
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // 加载用户数据
  useEffect(() => {
    loadUsers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('获取用户列表失败:', error);
        // 使用模拟数据
        setUsers(getMockUsers());
      } else {
        // 只使用数据库数据
        setUsers(data || []);
      }
    } catch (error) {
      console.error('加载用户数据失败:', error);
      setUsers(getMockUsers());
    } finally {
      setLoading(false);
    }
  };

  // 模拟用户数据 - 已删除测试数据
  const getMockUsers = (): User[] => [];

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `USR${String(users.length + 1).padStart(3, '0')}`;
    const newUser: User = {
      id: newId,
      ...userForm,
      registration_date: new Date().toLocaleDateString('zh-CN'),
      last_login: '从未登录',
      total_orders: 0,
      total_spent: 0,
      rating: 0
    };

    try {
      const { error } = await supabase
        .from('users')
        .insert([newUser]);
      
      if (error) {
        console.error('创建用户失败:', error);
        // 添加到本地状态
        setUsers([newUser, ...users]);
      } else {
        await loadUsers();
      }
      
      // setShowUserForm(false);
      setUserForm({
        name: '',
        phone: '',
        email: '',
        address: '',
        password: '123456',
        user_type: 'customer',
        status: 'active',
        notes: ''
      });
    } catch (error) {
      console.error('创建用户异常:', error);
      setUsers([newUser, ...users]);
      // setShowUserForm(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUserForm({
      name: user.name || '',
      phone: user.phone || '',
      email: user.email || '',
      address: user.address || '',
      password: '',  // 编辑时不显示密码，留空表示不修改
      user_type: user.user_type || 'customer',
      status: user.status || 'active',
      notes: user.notes || ''
    });
    // setShowUserForm(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    // 如果密码为空，则不更新密码字段
    const updateData: any = { ...userForm };
    if (!updateData.password || updateData.password.trim() === '') {
      delete updateData.password;
    }

    const updatedUser = { ...editingUser, ...updateData };

    try {
      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', editingUser.id);
      
      if (error) {
        console.error('更新用户失败:', error);
        setUsers(users.map(u => u.id === editingUser.id ? updatedUser : u));
      } else {
        await loadUsers();
      }
      
      // setShowUserForm(false);
      setEditingUser(null);
      setUserForm({
        name: '',
        phone: '',
        email: '',
        address: '',
        password: '123456',
        user_type: 'customer',
        status: 'active',
        notes: ''
      });
    } catch (error) {
      console.error('更新用户异常:', error);
      setUsers(users.map(u => u.id === editingUser.id ? updatedUser : u));
      // setShowUserForm(false);
      setEditingUser(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('确定要删除这个用户吗？')) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);
      
      if (error) {
        console.error('删除用户失败:', error);
        setUsers(users.filter(u => u.id !== userId));
      } else {
        await loadUsers();
      }
    } catch (error) {
      console.error('删除用户异常:', error);
      setUsers(users.filter(u => u.id !== userId));
    }
  };

  const updateUserStatus = async (userId: string, newStatus: 'active' | 'inactive' | 'suspended') => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ status: newStatus })
        .eq('id', userId);
      
      if (error) {
        console.error('更新用户状态失败:', error);
        setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u));
      } else {
        await loadUsers();
      }
    } catch (error) {
      console.error('更新用户状态异常:', error);
      setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#27ae60';
      case 'inactive': return '#f39c12';
      case 'suspended': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '活跃';
      case 'inactive': return '非活跃';
      case 'suspended': return '已暂停';
      default: return status;
    }
  };

  const getUserTypeText = (type: string) => {
    switch (type) {
      case 'customer': return '客户';
      case 'courier': return '快递员';
      case 'admin': return '管理员';
      default: return type;
    }
  };

  const getUserTypeColor = (type: string) => {
    switch (type) {
      case 'customer': return '#3498db';
      case 'courier': return '#9b59b6';
      case 'admin': return '#e67e22';
      default: return '#95a5a6';
    }
  };

  // --- 快递员管理相关函数 ---

  useEffect(() => {
    if (activeTab === 'courier_management') {
      loadCouriers();
    } else if (activeTab === 'partner_store') {
      loadPartnerStores();
    } else if (activeTab === 'customer_list' || activeTab === 'admin_list') {
      loadUsers();
    }
  }, [activeTab]);

  const loadPartnerStores = async () => {
    try {
      setLoadingStores(true);
      const data = await deliveryStoreService.getAllStores();
      setPartnerStores(data || []);
    } catch (error) {
      console.error('加载合伙店铺异常:', error);
      setPartnerStores([]);
    } finally {
      setLoadingStores(false);
    }
  };

  const loadCouriers = async () => {
    try {
      setCourierLoading(true);
      const { data, error } = await supabase
        .from('couriers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('获取快递员列表失败:', error);
        setCouriers([]);
      } else {
        setCouriers(data || []);
      }
    } catch (error) {
      console.error('加载快递员数据失败:', error);
      setCouriers([]);
    } finally {
      setCourierLoading(false);
    }
  };

  const generateEmployeeId = (region: string, position: string, role: string): string => {
    const regionPrefix = region === 'yangon' ? 'YGN' : 'MDY';
    let positionType = '';
    if (position.includes('骑手') || position === '骑手') {
      positionType = 'RIDER';
    } else if (role === 'finance' || position.includes('财务')) {
      positionType = 'ACCOUNT';
    } else if (role === 'manager' || position.includes('经理')) {
      positionType = 'MANAGER';
    } else if (role === 'admin' || position.includes('管理员')) {
      positionType = 'ADMIN';
    } else {
      positionType = 'STAFF';
    }
    
    const filteredCouriers = couriers.filter(c => {
      const idPrefix = `${regionPrefix}-${positionType}`;
      return c.employee_id && c.employee_id.startsWith(idPrefix);
    });
    
    const nextNumber = (filteredCouriers.length + 1).toString().padStart(3, '0');
    return `${regionPrefix}-${positionType}-${nextNumber}`;
  };

  const handleCourierFormChange = (field: string, value: any) => {
    setCourierForm(prev => {
      const newData = { ...prev, [field]: value };
      if ((field === 'region' || field === 'position' || field === 'role') && 
          newData.region && newData.position && newData.role) {
        const autoId = generateEmployeeId(newData.region, newData.position, newData.role);
        return { ...newData, employee_id: autoId };
      }
      return newData;
    });
  };

  const handleImportFromAccounts = async () => {
    if (!window.confirm('确定要从账号系统导入骑手吗？\n\n将自动导入职位为"骑手"或"骑手队长"的员工账号。')) {
      return;
    }

    setImporting(true);
    try {
      const { data: riderAccounts, error: queryError } = await supabase
        .from('admin_accounts')
        .select('*')
        .in('position', ['骑手', '骑手队长'])
        .eq('status', 'active');

      if (queryError) {
        console.error('查询骑手账号失败:', queryError);
        alert('查询失败，请检查数据库连接');
        return;
      }

      if (!riderAccounts || riderAccounts.length === 0) {
        alert('未找到骑手账号\n\n请先在"系统设置 → 账号管理"中创建职位为"骑手"或"骑手队长"的账号');
        return;
      }

      const existingCouriers = couriers.map(c => c.phone);
      
      const newCouriers = riderAccounts
        .filter(account => !existingCouriers.includes(account.phone))
        .map(account => ({
          id: `COU${Date.now()}${Math.floor(Math.random() * 1000)}`,
          name: account.employee_name,
          phone: account.phone,
          vehicle_type: account.position === '骑手队长' ? 'car' : 'motorcycle',
          status: 'active',
          rating: 5.0
        }));

      if (newCouriers.length === 0) {
        alert('所有骑手账号已存在，无需重复导入');
        return;
      }

      const { error: insertError } = await supabase
        .from('couriers')
        .insert(newCouriers);

      if (insertError) {
        console.error('导入快递员失败:', insertError);
        alert(`导入失败: ${insertError.message}`);
        return;
      }

      const currentUser = localStorage.getItem('currentUser') || 'admin';
      const currentUserName = localStorage.getItem('currentUserName') || '管理员';
      await auditLogService.log({
        user_id: currentUser,
        user_name: currentUserName,
        action_type: 'create',
        module: 'couriers',
        action_description: `从账号系统导入 ${newCouriers.length} 名骑手`,
        new_value: JSON.stringify(newCouriers.map(c => c.name))
      });

      alert(`✅ 导入成功！\n\n共导入 ${newCouriers.length} 名骑手`);
      await loadCouriers();
      
    } catch (error) {
      console.error('导入骑手异常:', error);
      alert('导入失败，请稍后重试');
    } finally {
      setImporting(false);
    }
  };

  const handleCreateCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `COU${String(couriers.length + 1).padStart(3, '0')}`;
    const newCourier: Courier = {
      id: newId,
      ...courierForm,
      join_date: new Date().toLocaleDateString('zh-CN'),
      last_active: '从未上线',
      total_deliveries: 0,
      rating: 0
    };

    try {
      const { data, error } = await supabase
        .from('couriers')
        .insert([newCourier])
        .select()
        .single();
      
      if (error) throw error;
      
      setCouriers([data, ...couriers]);
      
      setCourierForm({
        name: '',
        phone: '',
        email: '',
        address: '',
        vehicle_type: 'motorcycle',
        license_number: '',
        status: 'active',
        notes: '',
        employee_id: '',
        department: '',
        position: '',
        role: 'operator',
        region: 'yangon'
      });
      setCourierSubTab('list');
    } catch (error) {
      console.error('创建快递员异常:', error);
      alert('创建失败');
    }
  };

  const handleEditCourier = (courier: Courier) => {
    setEditingCourier(courier);
    setCourierForm({
      name: courier.name,
      phone: courier.phone,
      email: courier.email,
      address: courier.address,
      vehicle_type: courier.vehicle_type,
      license_number: courier.license_number,
      status: courier.status as any,
      notes: courier.notes,
      employee_id: courier.employee_id || '',
      department: courier.department || '',
      position: courier.position || '',
      role: (courier.role as any) || 'operator',
      region: (courier.region as any) || 'yangon'
    });
    setCourierSubTab('create');
  };

  const handleUpdateCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourier) return;

    const updatedCourier = { ...editingCourier, ...courierForm };

    try {
      const { error } = await supabase
        .from('couriers')
        .update(updatedCourier)
        .eq('id', editingCourier.id);
      
      if (error) throw error;
      
      setCouriers(couriers.map(c => c.id === editingCourier.id ? updatedCourier : c));
      setEditingCourier(null);
      setCourierForm({
        name: '',
        phone: '',
        email: '',
        address: '',
        vehicle_type: 'motorcycle',
        license_number: '',
        status: 'active',
        notes: '',
        employee_id: '',
        department: '',
        position: '',
        role: 'operator',
        region: 'yangon'
      });
      setCourierSubTab('list');
    } catch (error) {
      console.error('更新快递员异常:', error);
      alert('更新失败');
    }
  };

  const handleDeleteCourier = async (courierId: string) => {
    if (!window.confirm('确定要删除这个快递员吗？')) return;
    
    const courierToDelete = couriers.find(c => c.id === courierId);
    
    try {
      const { error } = await supabase
        .from('couriers')
        .delete()
        .eq('id', courierId);
      
      if (error) throw error;
      
      setCouriers(couriers.filter(c => c.id !== courierId));
      
      const currentUser = localStorage.getItem('currentUser') || 'unknown';
      const currentUserName = localStorage.getItem('currentUserName') || '未知用户';
      
      await auditLogService.log({
        user_id: currentUser,
        user_name: currentUserName,
        action_type: 'delete',
        module: 'couriers',
        target_id: courierId,
        target_name: `快递员 ${courierToDelete?.name || courierId}`,
        action_description: `删除快递员，姓名：${courierToDelete?.name || '未知'}`,
        old_value: JSON.stringify(courierToDelete)
      });
    } catch (error) {
      console.error('删除快递员异常:', error);
      setCouriers(couriers.filter(c => c.id !== courierId));
    }
  };

  const handleCourierStatusChange = async (courierId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('couriers')
        .update({ status: newStatus })
        .eq('id', courierId);
      
      if (error) throw error;
      
      setCouriers(couriers.map(c => c.id === courierId ? { ...c, status: newStatus } : c));
    } catch (error) {
      console.error('更新状态异常:', error);
    }
  };

  const getCourierStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#27ae60';
      case 'inactive': return '#e74c3c';
      case 'busy': return '#f39c12';
      default: return '#95a5a6';
    }
  };

  const getVehicleIcon = (vehicleType: string) => {
    switch (vehicleType) {
      case 'motorcycle': return '🏍️';
      case 'car': return '🚗';
      case 'bicycle': return '🚲';
      case 'truck': return '🚚';
      case 'tricycle': return '🛺';
      case 'small_truck': return '🚛';
      default: return '🚚';
    }
  };

  const filteredCouriers = couriers.filter(courier => {
    const matchesSearch = courier.name.toLowerCase().includes(courierSearchTerm.toLowerCase()) ||
                         courier.phone.includes(courierSearchTerm) ||
                         courier.email.toLowerCase().includes(courierSearchTerm.toLowerCase());
    const matchesStatus = courierStatusFilter === 'all' || courier.status === courierStatusFilter;
    const matchesVehicle = vehicleFilter === 'all' || courier.vehicle_type === vehicleFilter;
    
    return matchesSearch && matchesStatus && matchesVehicle;
  });

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(to right top, #b0d3e8, #a2c3d6, #93b4c5, #86a4b4, #7895a3, #6c90a3, #618ca3, #5587a4, #498ab6, #428cc9, #468dda, #558cea)',
      padding: isMobile ? '12px' : '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* 背景装饰 */}
      <div style={{
        position: 'absolute',
        top: '5%',
        right: '5%',
        width: '200px',
        height: '200px',
        background: 'rgba(192, 192, 192, 0.1)',
        borderRadius: '50%',
        filter: 'blur(40px)'
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '5%',
        left: '5%',
        width: '150px',
        height: '150px',
        background: 'rgba(192, 192, 192, 0.1)',
        borderRadius: '50%',
        filter: 'blur(30px)'
      }}></div>

      {/* 头部 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        color: 'white',
        position: 'relative',
        zIndex: 1
      }}>
        <div>
          <h1 style={{ fontSize: isMobile ? '1.5rem' : '2rem', margin: 0, textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>
            {language === 'zh' ? '用户管理' : language === 'en' ? 'User Management' : 'အသုံးပြုသူစီမံခန့်ခွဲမှု'}
          </h1>
          <p style={{ margin: '5px 0 0 0', opacity: 0.8, textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>
            {language === 'zh' ? '管理客户、快递员和管理员账户' : 
             language === 'en' ? 'Manage customer, courier and admin accounts' : 
             'ဖောက်သည်၊ စာပို့သမားနှင့် စီမံခန့်ခွဲသူအကောင့်များကို စီမံခန့်ခွဲပါ'}
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/dashboard')}
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            padding: '10px 20px',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '1rem',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          ← 返回管理后台
        </button>
      </div>

      {/* 标签页 */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '30px',
        position: 'relative',
        zIndex: 1
      }}>
        <button
          onClick={() => setActiveTab('customer_list')}
          style={{
            background: activeTab === 'customer_list' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            padding: '10px 20px',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '1rem',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease'
          }}
        >
          客户列表
        </button>
        <button
          onClick={() => setActiveTab('admin_list')}
          style={{
            background: activeTab === 'admin_list' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            padding: '10px 20px',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '1rem',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease'
          }}
        >
          管理员列表
        </button>
        <button
          onClick={() => setActiveTab('partner_store')}
          style={{
            background: activeTab === 'partner_store' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            padding: '10px 20px',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '1rem',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease'
          }}
        >
          合伙店铺
        </button>
        <button
          onClick={() => setActiveTab('courier_management')}
          style={{
            background: activeTab === 'courier_management' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            padding: '10px 20px',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '1rem',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease'
          }}
        >
          快递员管理
        </button>
      </div>

      {/* 用户列表 (客户/管理员) */}
      {(activeTab === 'customer_list' || activeTab === 'admin_list') && !editingUser && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          borderRadius: '15px',
          padding: isMobile ? '12px' : '20px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 25px rgba(26, 54, 93, 0.3)',
          position: 'relative',
          zIndex: 1
        }}>
          {/* 统计信息 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '15px',
            marginBottom: '20px'
          }}>
            <div style={{
              background: 'rgba(52, 152, 219, 0.2)',
              padding: '15px',
              borderRadius: '10px',
              textAlign: 'center',
              border: '1px solid rgba(52, 152, 219, 0.3)'
            }}>
              <h3 style={{ color: '#3498db', margin: '0 0 5px 0', fontSize: '1.5rem' }}>
                {users.filter(u => u.user_type === 'customer').length}
              </h3>
              <p style={{ color: 'white', margin: 0, fontSize: '0.9rem' }}>客户总数</p>
            </div>
            <div style={{
              background: 'rgba(155, 89, 182, 0.2)',
              padding: '15px',
              borderRadius: '10px',
              textAlign: 'center',
              border: '1px solid rgba(155, 89, 182, 0.3)'
            }}>
              <h3 style={{ color: '#9b59b6', margin: '0 0 5px 0', fontSize: '1.5rem' }}>
                {couriers.length}
              </h3>
              <p style={{ color: 'white', margin: 0, fontSize: '0.9rem' }}>快递员总数</p>
            </div>
            <div style={{
              background: 'rgba(39, 174, 96, 0.2)',
              padding: '15px',
              borderRadius: '10px',
              textAlign: 'center',
              border: '1px solid rgba(39, 174, 96, 0.3)'
            }}>
              <h3 style={{ color: '#27ae60', margin: '0 0 5px 0', fontSize: '1.5rem' }}>
                {users.filter(u => u.status === 'active').length}
              </h3>
              <p style={{ color: 'white', margin: 0, fontSize: '0.9rem' }}>活跃用户</p>
            </div>
            <div style={{
              background: 'rgba(230, 126, 34, 0.2)',
              padding: '15px',
              borderRadius: '10px',
              textAlign: 'center',
              border: '1px solid rgba(230, 126, 34, 0.3)'
            }}>
              <h3 style={{ color: '#e67e22', margin: '0 0 5px 0', fontSize: '1.5rem' }}>
                {users.reduce((sum, u) => sum + (u.total_orders || 0), 0)}
              </h3>
              <p style={{ color: 'white', margin: 0, fontSize: '0.9rem' }}>总订单数</p>
            </div>
          </div>

          {/* 搜索和过滤 */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '15px',
            marginBottom: '24px',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '16px',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ flex: '1 1 300px' }}>
              <input
                type="text"
                placeholder={activeTab === 'customer_list' ? "🔍 搜索客户姓名、电话..." : "🔍 搜索管理员..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  background: 'rgba(0, 0, 0, 0.2)',
                  color: 'white',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)'}
                onBlur={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.2)'}
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                padding: '12px 16px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                background: 'rgba(0, 0, 0, 0.2)',
                color: 'white',
                fontSize: '1rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">📊 所有状态</option>
              <option value="active">✅ 活跃</option>
              <option value="inactive">💤 非活跃</option>
              <option value="suspended">🚫 已暂停</option>
            </select>

            <div style={{ flex: 1 }}></div>

            {/* 批量操作按钮 */}
            {selectedUsers.size > 0 && (
              <button
                onClick={handleBatchDelete}
                disabled={isBatchDeleting}
                style={{
                  background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  cursor: isBatchDeleting ? 'not-allowed' : 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(231, 76, 60, 0.3)',
                  transition: 'all 0.3s ease',
                  opacity: isBatchDeleting ? 0.7 : 1
                }}
                onMouseOver={(e) => !isBatchDeleting && (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseOut={(e) => !isBatchDeleting && (e.currentTarget.style.transform = 'translateY(0)')}
              >
                {isBatchDeleting ? '⏳ 删除中...' : `🗑️ 批量删除 (${selectedUsers.size})`}
              </button>
            )}
            
            <button
              onClick={handleSelectAll}
              style={{
                background: selectedUsers.size === filteredUsers.length && filteredUsers.length > 0 
                  ? 'rgba(52, 152, 219, 0.3)' 
                  : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: selectedUsers.size === filteredUsers.length && filteredUsers.length > 0
                  ? '1px solid #3498db'
                  : '1px solid rgba(255, 255, 255, 0.2)',
                padding: '12px 24px',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '0.95rem',
                fontWeight: '600',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
              onMouseOut={(e) => e.currentTarget.style.background = selectedUsers.size === filteredUsers.length && filteredUsers.length > 0 
                  ? 'rgba(52, 152, 219, 0.3)' 
                  : 'rgba(255, 255, 255, 0.1)'}
            >
              {selectedUsers.size === filteredUsers.length && filteredUsers.length > 0 ? '☒ 取消全选' : '☐ 全选'}
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', color: 'white', padding: '2rem' }}>
              <p>加载中...</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gap: '15px'
            }}>
              {filteredUsers.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  color: 'white', 
                  padding: '4rem 2rem',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔍</div>
                  <p style={{ fontSize: '1.2rem', margin: 0 }}>没有找到匹配的用户</p>
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const isSelected = selectedUsers.has(user.id);
                  return (
                    <div key={user.id} style={{
                      background: isSelected ? 'rgba(52, 152, 219, 0.15)' : 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '16px',
                      padding: isMobile ? '16px' : '24px',
                      border: isSelected ? '2px solid #3498db' : '1px solid rgba(255, 255, 255, 0.15)',
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      backdropFilter: 'blur(10px)',
                      boxShadow: isSelected ? '0 8px 24px rgba(52, 152, 219, 0.2)' : '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).tagName !== 'BUTTON') {
                        handleSelectUser(user.id);
                      }
                    }}
                    >
                      {/* Checkbox Badge */}
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectUser(user.id);
                        }}
                        style={{
                          position: 'absolute',
                          top: '16px',
                          right: '16px',
                          width: '24px',
                          height: '24px',
                          borderRadius: '6px',
                          border: isSelected ? 'none' : '2px solid rgba(255, 255, 255, 0.3)',
                          background: isSelected ? '#3498db' : 'rgba(255, 255, 255, 0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          zIndex: 10
                        }}
                      >
                        {isSelected && <span style={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>✓</span>}
                      </div>

                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '15px',
                        paddingRight: '40px'
                      }}>
                      <div>
                        <h3 style={{ color: 'white', margin: '0 0 5px 0', fontSize: '1.2rem' }}>
                          {user.name} ({user.id})
                        </h3>
                        <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '0.9rem' }}>
                          注册时间: {user.registration_date} | 最后登录: {user.last_login}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{
                          background: getUserTypeColor(user.user_type),
                          color: 'white',
                          padding: '5px 15px',
                          borderRadius: '20px',
                          fontSize: '0.9rem',
                          fontWeight: 'bold'
                        }}>
                          {getUserTypeText(user.user_type)}
                        </div>
                        <div style={{
                          background: getStatusColor(user.status),
                          color: 'white',
                          padding: '5px 15px',
                          borderRadius: '20px',
                          fontSize: '0.9rem',
                          fontWeight: 'bold'
                        }}>
                          {getStatusText(user.status)}
                        </div>
                      </div>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '15px',
                      marginBottom: '15px'
                    }}>
                      <div>
                        <h4 style={{ color: '#C0C0C0', margin: '0 0 5px 0', fontSize: '1rem' }}>联系信息</h4>
                        <p style={{ color: 'white', margin: 0, fontSize: '0.9rem' }}>
                          电话: {user.phone}
                        </p>
                        <p style={{ color: 'white', margin: 0, fontSize: '0.9rem' }}>
                          邮箱: {user.email}
                        </p>
                        <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '0.8rem' }}>
                          地址: {user.address}
                        </p>
                      </div>
                      <div>
                        <h4 style={{ color: '#C0C0C0', margin: '0 0 5px 0', fontSize: '1rem' }}>统计信息</h4>
                        <p style={{ color: 'white', margin: 0, fontSize: '0.9rem' }}>
                          订单数: {user.total_orders}
                        </p>
                        <p style={{ color: 'white', margin: 0, fontSize: '0.9rem' }}>
                          消费金额: {user.total_spent.toLocaleString()} MMK
                        </p>
                        <p style={{ color: 'white', margin: 0, fontSize: '0.9rem' }}>
                          评分: {user.rating}/5.0
                        </p>
                      </div>
                      <div>
                        <h4 style={{ color: '#C0C0C0', margin: '0 0 5px 0', fontSize: '1rem' }}>备注</h4>
                        <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '0.8rem' }}>
                          {user.notes || '无备注'}
                        </p>
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div style={{
                      display: 'flex',
                      gap: '10px',
                      flexWrap: 'wrap'
                    }}>
                      <button
                        onClick={() => handleEditUser(user)}
                        style={{
                          background: '#3498db',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontSize: '0.9rem'
                        }}
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => updateUserStatus(user.id, user.status === 'active' ? 'inactive' : 'active')}
                        style={{
                          background: user.status === 'active' ? '#f39c12' : '#27ae60',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontSize: '0.9rem'
                        }}
                      >
                        {user.status === 'active' ? '停用' : '启用'}
                      </button>
                      <button
                        onClick={() => updateUserStatus(user.id, 'suspended')}
                        style={{
                          background: '#e74c3c',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontSize: '0.9rem'
                        }}
                      >
                        暂停
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.2)',
                          color: 'white',
                          border: '1px solid rgba(255, 255, 255, 0.3)',
                          padding: '8px 16px',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontSize: '0.9rem'
                        }}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                );
              })
              )}
            </div>
          )}
        </div>
      )}

      {/* 创建/编辑用户表单 - 仅在编辑模式下显示，或者后续添加新建按钮时启用 */}
      {editingUser && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          borderRadius: '15px',
          padding: '30px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 25px rgba(26, 54, 93, 0.3)',
          position: 'relative',
          zIndex: 1,
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          <h2 style={{ color: 'white', textAlign: 'center', marginBottom: '30px' }}>
            {editingUser ? '编辑用户' : '创建新用户'}
          </h2>
          
          <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: isMobile ? '12px' : '20px',
              marginBottom: '30px'
            }}>
              {/* 基本信息 */}
              <div>
                <h3 style={{ color: '#C0C0C0', marginBottom: '15px' }}>基本信息</h3>
                <input
                  type="text"
                  placeholder="姓名"
                  value={userForm.name}
                  onChange={(e) => setUserForm({...userForm, name: e.target.value})}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    marginBottom: '10px',
                    fontSize: '1rem'
                  }}
                />
                <input
                  type="tel"
                  placeholder="电话"
                  value={userForm.phone}
                  onChange={(e) => setUserForm({...userForm, phone: e.target.value})}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    marginBottom: '10px',
                    fontSize: '1rem'
                  }}
                />
                <input
                  type="email"
                  placeholder="邮箱"
                  value={userForm.email}
                  onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    marginBottom: '10px',
                    fontSize: '1rem'
                  }}
                />
                <textarea
                  placeholder="地址"
                  value={userForm.address}
                  onChange={(e) => setUserForm({...userForm, address: e.target.value})}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    height: '80px',
                    resize: 'vertical',
                    fontSize: '1rem',
                    marginBottom: '10px'
                  }}
                />
                <input
                  type="text"
                  placeholder={editingUser ? "密码（留空则不修改）" : "密码（默认：123456）"}
                  value={userForm.password}
                  onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    fontSize: '1rem'
                  }}
                />
              </div>

              {/* 账户设置 */}
              <div>
                <h3 style={{ color: '#C0C0C0', marginBottom: '15px' }}>账户设置</h3>
                <select
                  value={userForm.user_type}
                  onChange={(e) => setUserForm({...userForm, user_type: e.target.value as 'customer' | 'courier' | 'admin'})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '8px',
                    background: 'rgba(7, 23, 53, 0.65)',
                    color: 'white',
                    marginBottom: '10px',
                    fontSize: '1rem'
                  }}
                >
                  <option value="customer">客户</option>
                  <option value="courier">快递员</option>
                  <option value="admin">管理员</option>
                </select>
                <select
                  value={userForm.status}
                  onChange={(e) => setUserForm({...userForm, status: e.target.value as 'active' | 'inactive' | 'suspended'})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '8px',
                    background: 'rgba(7, 23, 53, 0.65)',
                    color: 'white',
                    marginBottom: '10px',
                    fontSize: '1rem'
                  }}
                >
                  <option value="active">活跃</option>
                  <option value="inactive">非活跃</option>
                  <option value="suspended">已暂停</option>
                </select>
                <textarea
                  placeholder="备注"
                  value={userForm.notes}
                  onChange={(e) => setUserForm({...userForm, notes: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    height: '80px',
                    resize: 'vertical',
                    fontSize: '1rem'
                  }}
                />
              </div>
            </div>

            {/* 提交按钮 */}
            <div style={{ textAlign: 'center' }}>
              <button
                type="submit"
                style={{
                  background: 'linear-gradient(135deg, #C0C0C0 0%, #E8E8E8 100%)',
                  color: '#2C3E50',
                  border: 'none',
                  padding: '15px 30px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 15px rgba(192, 192, 192, 0.3)',
                  transition: 'all 0.3s ease',
                  marginRight: '10px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(192, 192, 192, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(192, 192, 192, 0.3)';
                }}
              >
                {editingUser ? '更新用户' : '创建用户'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingUser(null);
                  setUserForm({
                    name: '',
                    phone: '',
                    email: '',
                    address: '',
                    password: '123456',
                    user_type: 'customer',
                    status: 'active',
                    notes: ''
                  });
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  padding: '15px 30px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease'
                }}
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 合伙店铺列表 */}
      {activeTab === 'partner_store' && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          borderRadius: '15px',
          padding: isMobile ? '12px' : '20px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 25px rgba(26, 54, 93, 0.3)',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <h2 style={{ color: 'white', margin: 0 }}>合伙店铺 ({partnerStores.length})</h2>
             {/* 未来可以添加创建店铺按钮 */}
          </div>

          {loadingStores ? (
            <div style={{ textAlign: 'center', color: 'white', padding: '40px' }}>加载中...</div>
          ) : partnerStores.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'white', padding: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
               暂无合伙店铺数据
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '15px', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))' }}>
              {partnerStores.map((store: any) => (
                <div key={store.id} style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0, color: 'white', fontSize: '1.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                      🏪 {store.store_name}
                    </h3>
                    <span style={{ 
                      background: store.status === 'active' ? 'rgba(39, 174, 96, 0.8)' : 'rgba(149, 165, 166, 0.8)', 
                      color: 'white', 
                      padding: '4px 10px', 
                      borderRadius: '12px', 
                      fontSize: '0.8rem' 
                    }}>
                      {store.status === 'active' ? '营业中' : '休息'}
                    </span>
                  </div>
                  
                  <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>📞</span>
                      <span>{store.contact_phone || '无电话'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <span>📍</span>
                      <span style={{ lineHeight: '1.4' }}>{store.address || '无地址'}</span>
                    </div>
                    {store.store_code && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <span style={{ opacity: 0.6 }}>代码:</span>
                        <span style={{ fontFamily: 'monospace', background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '4px' }}>{store.store_code}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 快递员管理 */}
      {activeTab === 'courier_management' && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          borderRadius: '15px',
          padding: isMobile ? '12px' : '20px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 25px rgba(26, 54, 93, 0.3)',
          position: 'relative',
          zIndex: 1
        }}>
          {/* 内部标签页 */}
          <div style={{
            display: 'flex',
            gap: '10px',
            marginBottom: '20px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            paddingBottom: '15px'
          }}>
            <button
              onClick={() => setCourierSubTab('list')}
              style={{
                background: courierSubTab === 'list' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '1rem'
              }}
            >
              📋 快递员列表
            </button>
            <button
              onClick={() => setCourierSubTab('create')}
              style={{
                background: courierSubTab === 'create' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '1rem'
              }}
            >
              ➕ {editingCourier ? '编辑快递员' : '添加快递员'}
            </button>
            <button
              onClick={handleImportFromAccounts}
              disabled={importing}
              style={{
                background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: importing ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: '1rem',
                marginLeft: 'auto',
                opacity: importing ? 0.7 : 1
              }}
            >
              {importing ? '⏳ 导入中...' : '📥 从账号导入'}
            </button>
          </div>

          {courierSubTab === 'list' && (
            <div>
              {/* 统计卡片 */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
                gap: '15px',
                marginBottom: '20px'
              }}>
                 <div style={{ background: 'rgba(52, 152, 219, 0.2)', padding: '15px', borderRadius: '10px', textAlign: 'center', border: '1px solid rgba(52, 152, 219, 0.3)' }}>
                    <h3 style={{ color: '#3498db', margin: '0 0 5px 0', fontSize: '1.5rem' }}>{couriers.length}</h3>
                    <p style={{ color: 'white', margin: 0, fontSize: '0.9rem' }}>总数</p>
                 </div>
                 <div style={{ background: 'rgba(39, 174, 96, 0.2)', padding: '15px', borderRadius: '10px', textAlign: 'center', border: '1px solid rgba(39, 174, 96, 0.3)' }}>
                    <h3 style={{ color: '#27ae60', margin: '0 0 5px 0', fontSize: '1.5rem' }}>{couriers.filter(c => c.status === 'active').length}</h3>
                    <p style={{ color: 'white', margin: 0, fontSize: '0.9rem' }}>活跃</p>
                 </div>
                 <div style={{ background: 'rgba(230, 126, 34, 0.2)', padding: '15px', borderRadius: '10px', textAlign: 'center', border: '1px solid rgba(230, 126, 34, 0.3)' }}>
                    <h3 style={{ color: '#e67e22', margin: '0 0 5px 0', fontSize: '1.5rem' }}>{couriers.reduce((s, c) => s + c.total_deliveries, 0)}</h3>
                    <p style={{ color: 'white', margin: 0, fontSize: '0.9rem' }}>总配送</p>
                 </div>
                 <div style={{ background: 'rgba(155, 89, 182, 0.2)', padding: '15px', borderRadius: '10px', textAlign: 'center', border: '1px solid rgba(155, 89, 182, 0.3)' }}>
                    <h3 style={{ color: '#9b59b6', margin: '0 0 5px 0', fontSize: '1.5rem' }}>{(couriers.reduce((s, c) => s + c.rating, 0) / couriers.length || 0).toFixed(1)}</h3>
                    <p style={{ color: 'white', margin: 0, fontSize: '0.9rem' }}>评分</p>
                 </div>
              </div>

              {/* 筛选 */}
              <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '12px' }}>
                <input 
                  type="text" 
                  placeholder="🔍 搜索快递员..." 
                  value={courierSearchTerm}
                  onChange={(e) => setCourierSearchTerm(e.target.value)}
                  style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: 'white', flex: '1 1 200px', fontSize: '1rem' }}
                />
                <select 
                  value={courierStatusFilter}
                  onChange={(e) => setCourierStatusFilter(e.target.value)}
                  style={{ padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', fontSize: '1rem', cursor: 'pointer' }}
                >
                  <option value="all">📊 所有状态</option>
                  <option value="active">✅ 活跃</option>
                  <option value="inactive">💤 非活跃</option>
                  <option value="busy">📦 忙碌</option>
                </select>
                <select 
                  value={vehicleFilter}
                  onChange={(e) => setVehicleFilter(e.target.value)}
                  style={{ padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', fontSize: '1rem', cursor: 'pointer' }}
                >
                  <option value="all">🚗 所有车辆</option>
                  <option value="motorcycle">🏍️ 摩托车</option>
                  <option value="car">🚗 汽车</option>
                  <option value="bicycle">🚲 自行车</option>
                  <option value="truck">🚚 卡车</option>
                  <option value="tricycle">🛺 三轮车</option>
                  <option value="small_truck">🚛 小卡车</option>
                </select>
              </div>

              {/* 列表 */}
              {courierLoading ? (
                <div style={{ color: 'white', textAlign: 'center', padding: '40px' }}>加载中...</div>
              ) : filteredCouriers.length === 0 ? (
                <div style={{ color: 'white', textAlign: 'center', padding: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>没有找到快递员</div>
              ) : (
                <div style={{ display: 'grid', gap: '15px' }}>
                  {filteredCouriers.map(courier => (
                    <div key={courier.id} style={{ background: 'rgba(255,255,255,0.1)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
                       <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '15px', alignItems: 'center' }}>
                          <div style={{ gridColumn: isMobile ? '1 / -1' : 'span 1' }}>
                             <h3 style={{ margin: '0 0 5px 0', color: 'white', fontSize: '1.2rem' }}>{getVehicleIcon(courier.vehicle_type)} {courier.name}</h3>
                             <p style={{ margin: '5px 0', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>{courier.phone}</p>
                             <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>{courier.email}</p>
                          </div>
                          <div style={{ gridColumn: isMobile ? '1 / -1' : 'span 1' }}>
                             <p style={{ margin: '0 0 5px 0', color: 'rgba(255,255,255,0.8)' }}>🏠 {courier.address}</p>
                             <p style={{ margin: '0 0 5px 0', color: 'rgba(255,255,255,0.8)' }}>🆔 {courier.license_number}</p>
                             <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>📅 {courier.join_date}</p>
                          </div>
                          <div style={{ gridColumn: isMobile ? '1 / -1' : 'span 1' }}>
                             <p style={{ margin: '0 0 5px 0', color: 'rgba(255,255,255,0.8)' }}>📦 配送: {courier.total_deliveries}</p>
                             <p style={{ margin: '0 0 5px 0', color: 'rgba(255,255,255,0.8)' }}>⭐ 评分: {courier.rating}</p>
                             <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>🕐 {courier.last_active}</p>
                          </div>
                          <div style={{ gridColumn: isMobile ? '1 / -1' : 'span 1', textAlign: isMobile ? 'left' : 'right' }}>
                             <div style={{ display: 'inline-block', background: getCourierStatusColor(courier.status), color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '10px' }}>
                                {courier.status === 'active' ? '活跃' : courier.status === 'inactive' ? '非活跃' : '忙碌'}
                             </div>
                             <div style={{ display: 'flex', gap: '8px', justifyContent: isMobile ? 'flex-start' : 'flex-end', flexWrap: 'wrap' }}>
                                <button onClick={() => handleEditCourier(courier)} style={{ background: '#3498db', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>编辑</button>
                                <button onClick={() => handleCourierStatusChange(courier.id, courier.status === 'active' ? 'inactive' : 'active')} style={{ background: courier.status === 'active' ? '#f39c12' : '#27ae60', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>{courier.status === 'active' ? '停用' : '启用'}</button>
                                <button onClick={() => handleDeleteCourier(courier.id)} style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>删除</button>
                             </div>
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {courierSubTab === 'create' && (
             <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
                <h2 style={{ color: 'white', textAlign: 'center', marginBottom: '30px' }}>{editingCourier ? '编辑快递员' : '添加快递员'}</h2>
                <form onSubmit={editingCourier ? handleUpdateCourier : handleCreateCourier}>
                   <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '20px', marginBottom: '30px' }}>
                      <input placeholder="姓名" value={courierForm.name} onChange={e => setCourierForm({...courierForm, name: e.target.value})} required style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: 'white' }} />
                      <input placeholder="电话" value={courierForm.phone} onChange={e => setCourierForm({...courierForm, phone: e.target.value})} required style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: 'white' }} />
                      <input placeholder="邮箱" value={courierForm.email} onChange={e => setCourierForm({...courierForm, email: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: 'white' }} />
                      <input placeholder="地址" value={courierForm.address} onChange={e => setCourierForm({...courierForm, address: e.target.value})} required style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: 'white' }} />
                      
                      <select value={courierForm.vehicle_type} onChange={e => setCourierForm({...courierForm, vehicle_type: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(7, 23, 53, 0.65)', color: 'white' }}>
                         <option value="motorcycle">🏍️ 摩托车</option>
                         <option value="car">🚗 汽车</option>
                         <option value="bicycle">🚲 自行车</option>
                         <option value="truck">🚚 卡车</option>
                         <option value="tricycle">🛺 三轮车</option>
                         <option value="small_truck">🚛 小卡车</option>
                      </select>
                      
                      <input placeholder="驾驶证号" value={courierForm.license_number} onChange={e => setCourierForm({...courierForm, license_number: e.target.value})} required style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: 'white' }} />
                      
                      <select value={courierForm.status} onChange={e => setCourierForm({...courierForm, status: e.target.value})} style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(7, 23, 53, 0.65)', color: 'white' }}>
                         <option value="active">✅ 活跃</option>
                         <option value="inactive">💤 非活跃</option>
                         <option value="busy">📦 忙碌</option>
                      </select>

                      <div style={{ gridColumn: '1 / -1' }}>
                         <textarea placeholder="备注" value={courierForm.notes} onChange={e => setCourierForm({...courierForm, notes: e.target.value})} rows={3} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: 'white', resize: 'vertical' }} />
                      </div>
                   </div>
                   <div style={{ textAlign: 'center', display: 'flex', gap: '15px', justifyContent: 'center' }}>
                      <button type="submit" style={{ background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)', color: 'white', border: 'none', padding: '12px 30px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', boxShadow: '0 4px 15px rgba(39, 174, 96, 0.3)' }}>
                         {editingCourier ? '更新快递员' : '添加快递员'}
                      </button>
                      <button type="button" onClick={() => { setEditingCourier(null); setCourierSubTab('list'); }} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '12px 30px', borderRadius: '10px', cursor: 'pointer', fontSize: '1.1rem' }}>
                         取消
                      </button>
                   </div>
                </form>
             </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserManagement;
