import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useLanguage } from '../contexts/LanguageContext';

// 用户数据类型定义
interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  user_type: 'customer' | 'courier' | 'admin';
  status: 'active' | 'inactive' | 'suspended';
  registration_date: string;
  last_login: string;
  total_orders: number;
  total_spent: number;
  rating: number;
  notes: string;
  created_at?: string;
  updated_at?: string;
}

const UserManagement: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState('list');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  // const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [userForm, setUserForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    user_type: 'customer' as 'customer' | 'courier' | 'admin',
    status: 'active' as 'active' | 'inactive' | 'suspended',
    notes: ''
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
      name: user.name,
      phone: user.phone,
      email: user.email,
      address: user.address,
      user_type: user.user_type,
      status: user.status,
      notes: user.notes
    });
    // setShowUserForm(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const updatedUser = { ...editingUser, ...userForm };

    try {
      const { error } = await supabase
        .from('users')
        .update(userForm)
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

  // 过滤用户
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.phone.includes(searchTerm) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || user.user_type === filterType;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(to right top, #b0d3e8, #a2c3d6, #93b4c5, #86a4b4, #7895a3, #6c90a3, #618ca3, #5587a4, #498ab6, #428cc9, #468dda, #558cea)',
      padding: '20px',
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
          <h1 style={{ fontSize: '2rem', margin: 0, textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>
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
          onClick={() => setActiveTab('list')}
          style={{
            background: activeTab === 'list' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
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
          {language === 'zh' ? '用户列表' : language === 'en' ? 'User List' : 'အသုံးပြုသူစာရင်း'}
        </button>
        <button
          onClick={() => setActiveTab('create')}
          style={{
            background: activeTab === 'create' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
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
          创建用户
        </button>
      </div>

      {/* 用户列表 */}
      {activeTab === 'list' && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          borderRadius: '15px',
          padding: '20px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 25px rgba(26, 54, 93, 0.3)',
          position: 'relative',
          zIndex: 1
        }}>
          {/* 统计信息 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
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
                {users.filter(u => u.user_type === 'courier').length}
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
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginBottom: '20px'
          }}>
            <input
              type="text"
              placeholder="搜索用户..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '10px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                fontSize: '1rem'
              }}
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{
                padding: '10px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '8px',
                background: 'rgba(7, 23, 53, 0.65)',
                color: 'white',
                fontSize: '1rem'
              }}
            >
              <option value="all">所有类型</option>
              <option value="customer">客户</option>
              <option value="courier">快递员</option>
              <option value="admin">管理员</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                padding: '10px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '8px',
                background: 'rgba(7, 23, 53, 0.65)',
                color: 'white',
                fontSize: '1rem'
              }}
            >
              <option value="all">所有状态</option>
              <option value="active">活跃</option>
              <option value="inactive">非活跃</option>
              <option value="suspended">已暂停</option>
            </select>
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
                <div style={{ textAlign: 'center', color: 'white', padding: '2rem' }}>
                  <p>没有找到匹配的用户</p>
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div key={user.id} style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    padding: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '15px'
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
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* 创建/编辑用户表单 */}
      {activeTab === 'create' && (
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px',
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
                    user_type: 'customer',
                    status: 'active',
                    notes: ''
                  });
                  setActiveTab('list');
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
    </div>
  );
};

export default UserManagement;
