import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAccountService, AdminAccount } from '../services/supabase';

const AccountManagement: React.FC = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<AdminAccount | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [viewingAccount, setViewingAccount] = useState<AdminAccount | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showCvUploadModal, setShowCvUploadModal] = useState(false);
  const [showCvViewModal, setShowCvViewModal] = useState(false);
  const [cvImages, setCvImages] = useState<string[]>([]);
  const [uploadingCv, setUploadingCv] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    employee_name: '',
    employee_id: '',
    phone: '',
    email: '',
    department: '',
    position: '',
    salary: '',
    role: 'operator' as 'admin' | 'manager' | 'operator' | 'finance',
    hire_date: new Date().toISOString().split('T')[0],
    id_number: '',
    emergency_contact: '',
    emergency_phone: '',
    address: '',
    notes: ''
  });

  const [editFormData, setEditFormData] = useState({
    username: '',
    password: '',
    employee_name: ''
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    const data = await adminAccountService.getAllAccounts();
    setAccounts(data);
    setLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      const newAccount = {
        username: formData.username,
        password: formData.password,
        employee_name: formData.employee_name,
        employee_id: formData.employee_id,
        phone: formData.phone,
        email: formData.email,
        department: formData.department,
        position: formData.position,
        salary: formData.salary ? Number(formData.salary) : undefined,
        role: formData.role,
        hire_date: formData.hire_date,
        id_number: formData.id_number,
        emergency_contact: formData.emergency_contact,
        emergency_phone: formData.emergency_phone,
        address: formData.address,
        notes: formData.notes
      };

      await adminAccountService.createAccount(newAccount);
      setSuccessMessage('账号创建成功！');
      setFormData({
        username: '',
        password: '',
        employee_name: '',
        employee_id: '',
        phone: '',
        email: '',
        department: '',
        position: '',
        salary: '',
        role: 'operator',
        hire_date: new Date().toISOString().split('T')[0],
        id_number: '',
        emergency_contact: '',
        emergency_phone: '',
        address: '',
        notes: ''
      });
      setShowForm(false);
      loadAccounts();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      setErrorMessage(error.message || '创建账号失败');
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  const handleViewAccount = (account: AdminAccount) => {
    setViewingAccount(account);
    setShowViewModal(true);
  };

  const handleEditAccount = (account: AdminAccount) => {
    setEditingAccount(account);
    setEditFormData({
      username: account.username,
      password: '', // 不显示原密码
      employee_name: account.employee_name
    });
    setShowEditModal(true);
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;

    try {
      const updateData: Partial<AdminAccount> = {
        username: editFormData.username,
        employee_name: editFormData.employee_name
      };

      // 只有在输入了新密码时才更新密码
      if (editFormData.password.trim()) {
        updateData.password = editFormData.password;
      }

      await adminAccountService.updateAccount(editingAccount.id!, updateData);
      await loadAccounts();
      setShowEditModal(false);
      setEditingAccount(null);
      setEditFormData({ username: '', password: '', employee_name: '' });
      alert('账号信息更新成功！');
    } catch (error) {
      console.error('更新账号失败:', error);
      alert('更新账号失败，请重试');
    }
  };

  const handleStatusChange = async (id: string, newStatus: 'active' | 'inactive' | 'suspended') => {
    const success = await adminAccountService.updateAccountStatus(id, newStatus);
    if (success) {
      loadAccounts();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#48bb78';
      case 'inactive': return '#ed8936';
      case 'suspended': return '#f56565';
      default: return '#a0aec0';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return '#9f7aea';
      case 'manager': return '#4299e1';
      case 'operator': return '#48bb78';
      case 'finance': return '#ed8936';
      default: return '#a0aec0';
    }
  };

  // 处理CV文件上传
  const handleCvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: string[] = [];
    
    Array.from(files).forEach((file) => {
      // 检查文件类型
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        alert(`文件 ${file.name} 格式不支持，请上传图片或PDF文件`);
        return;
      }

      // 检查文件大小 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert(`文件 ${file.name} 过大，请选择小于10MB的文件`);
        return;
      }

      // 创建预览URL
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        newImages.push(result);
        
        if (newImages.length === Array.from(files).length) {
          setCvImages(prev => [...prev, ...newImages]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // 保存CV图片
  const handleSaveCvImages = async () => {
    if (cvImages.length === 0) {
      alert('请先上传CV Form');
      return;
    }

    setUploadingCv(true);
    try {
      // 这里应该将图片保存到服务器或数据库
      // 目前只是模拟保存过程
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert('CV Form保存成功！');
      setShowCvUploadModal(false);
      setCvImages([]);
    } catch (error) {
      console.error('保存CV Form失败:', error);
      alert('保存CV Form失败，请重试');
    } finally {
      setUploadingCv(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f1419 0%, #1a2332 50%, #2d3748 100%)',
      padding: '20px',
      color: 'white'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        background: 'rgba(26, 54, 93, 0.3)',
        borderRadius: '16px',
        padding: '32px',
        border: '1px solid rgba(255,255,255,0.1)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>账号管理</h1>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              onClick={() => setShowForm(!showForm)}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 600
              }}
            >
              {showForm ? '取消' : '创建新账号'}
            </button>
            <button
              onClick={() => navigate('/admin/dashboard')}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              返回主页
            </button>
          </div>
        </div>

        {successMessage && (
          <div style={{
            background: 'rgba(72, 187, 120, 0.2)',
            border: '1px solid rgba(72, 187, 120, 0.5)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '20px',
            color: '#68d391'
          }}>
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div style={{
            background: 'rgba(245, 101, 101, 0.2)',
            border: '1px solid rgba(245, 101, 101, 0.5)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '20px',
            color: '#fc8181'
          }}>
            {errorMessage}
          </div>
        )}

        {showForm && (
          <div style={{
            background: 'rgba(15, 32, 60, 0.4)',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '32px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <h2 style={{ marginBottom: '24px' }}>创建新账号</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>
                    用户名 *
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.25)',
                      background: 'rgba(15, 32, 60, 0.55)',
                      color: 'white',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>
                    密码 *
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.25)',
                      background: 'rgba(15, 32, 60, 0.55)',
                      color: 'white',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>
                    员工姓名 *
                  </label>
                  <input
                    type="text"
                    name="employee_name"
                    value={formData.employee_name}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.25)',
                      background: 'rgba(15, 32, 60, 0.55)',
                      color: 'white',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>
                    员工编号 *
                  </label>
                  <input
                    type="text"
                    name="employee_id"
                    value={formData.employee_id}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.25)',
                      background: 'rgba(15, 32, 60, 0.55)',
                      color: 'white',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>
                    部门 *
                  </label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.25)',
                      background: 'rgba(15, 32, 60, 0.55)',
                      color: 'white',
                      fontSize: '1rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                    required
                  >
                    <option value="" style={{ color: '#000' }}>请选择部门</option>
                    <option value="运营部" style={{ color: '#000' }}>运营部</option>
                    <option value="配送部" style={{ color: '#000' }}>配送部</option>
                    <option value="客服部" style={{ color: '#000' }}>客服部</option>
                    <option value="财务部" style={{ color: '#000' }}>财务部</option>
                    <option value="技术部" style={{ color: '#000' }}>技术部</option>
                    <option value="人事部" style={{ color: '#000' }}>人事部</option>
                    <option value="市场部" style={{ color: '#000' }}>市场部</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>
                    职位 *
                  </label>
                  <select
                    name="position"
                    value={formData.position}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.25)',
                      background: 'rgba(15, 32, 60, 0.55)',
                      color: 'white',
                      fontSize: '1rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                    required
                  >
                    <option value="" style={{ color: '#000' }}>请选择职位</option>
                    <option value="总经理" style={{ color: '#000' }}>总经理</option>
                    <option value="部门经理" style={{ color: '#000' }}>部门经理</option>
                    <option value="主管" style={{ color: '#000' }}>主管</option>
                    <option value="骑手队长" style={{ color: '#000' }}>骑手队长</option>
                    <option value="骑手" style={{ color: '#000' }}>骑手</option>
                    <option value="客服专员" style={{ color: '#000' }}>客服专员</option>
                    <option value="财务专员" style={{ color: '#000' }}>财务专员</option>
                    <option value="技术专员" style={{ color: '#000' }}>技术专员</option>
                    <option value="操作员" style={{ color: '#000' }}>操作员</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>
                    角色 *
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.25)',
                      background: 'rgba(15, 32, 60, 0.55)',
                      color: 'white',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                    required
                  >
                    <option value="operator">操作员</option>
                    <option value="manager">经理</option>
                    <option value="admin">管理员</option>
                    <option value="finance">财务</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>
                    手机号码
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.25)',
                      background: 'rgba(15, 32, 60, 0.55)',
                      color: 'white',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>
                    邮箱
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.25)',
                      background: 'rgba(15, 32, 60, 0.55)',
                      color: 'white',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '24px', textAlign: 'center', display: 'flex', gap: '16px', justifyContent: 'center' }}>
                <button
                  type="submit"
                  style={{
                    background: 'linear-gradient(135deg, #38a169 0%, #48bb78 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 32px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 600
                  }}
                >
                  创建账号
                </button>
                <button
                  type="button"
                  onClick={() => setShowCvUploadModal(true)}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 32px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 600
                  }}
                >
                  📄 上传CV Form
                </button>
              </div>
            </form>
          </div>
        )}

        <div style={{
          background: 'rgba(15, 32, 60, 0.4)',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <h2 style={{ marginBottom: '24px' }}>现有账号列表</h2>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '1.2rem' }}>加载中...</div>
            </div>
          ) : accounts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.7)' }}>暂无账号数据</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.2)' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.9rem', fontWeight: 600 }}>用户名</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.9rem', fontWeight: 600 }}>员工姓名</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.9rem', fontWeight: 600 }}>员工编号</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.9rem', fontWeight: 600 }}>部门</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.9rem', fontWeight: 600 }}>职位</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.9rem', fontWeight: 600 }}>角色</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.9rem', fontWeight: 600 }}>手机</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.9rem', fontWeight: 600 }}>状态</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.9rem', fontWeight: 600 }}>最后登录</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.9rem', fontWeight: 600 }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account) => (
                    <tr key={account.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <td style={{ padding: '12px', fontSize: '0.9rem' }}>{account.username}</td>
                      <td style={{ padding: '12px', fontSize: '0.9rem' }}>{account.employee_name}</td>
                      <td style={{ padding: '12px', fontSize: '0.9rem' }}>{account.employee_id}</td>
                      <td style={{ padding: '12px', fontSize: '0.9rem' }}>{account.department || '-'}</td>
                      <td style={{ padding: '12px', fontSize: '0.9rem' }}>{account.position || '-'}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          background: getRoleColor(account.role),
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          fontWeight: 500
                        }}>
                          {account.role === 'admin' ? '管理员' : 
                           account.role === 'manager' ? '经理' : 
                           account.role === 'operator' ? '操作员' : 
                           account.role === 'finance' ? '财务' : account.role}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '0.9rem' }}>{account.phone || '-'}</td>
                      <td style={{ padding: '12px' }}>
                        <select
                          value={account.status || 'active'}
                          onChange={(e) => handleStatusChange(account.id!, e.target.value as 'active' | 'inactive' | 'suspended')}
                          style={{
                            background: getStatusColor(account.status || 'active'),
                            color: 'white',
                            border: 'none',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="active">正常</option>
                          <option value="inactive">停用</option>
                          <option value="suspended">暂停</option>
                        </select>
                      </td>
                      <td style={{ padding: '12px', fontSize: '0.9rem' }}>
                        {account.last_login ? new Date(account.last_login).toLocaleString('zh-CN') : '从未登录'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleEditAccount(account)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid rgba(255,255,255,0.3)',
                              background: 'rgba(72, 187, 120, 0.3)',
                              color: 'white',
                              cursor: 'pointer',
                              fontSize: '0.85rem'
                            }}
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleViewAccount(account)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid rgba(255,255,255,0.3)',
                              background: 'rgba(66, 153, 225, 0.3)',
                              color: 'white',
                              cursor: 'pointer',
                              fontSize: '0.85rem'
                            }}
                          >
                            查看
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 编辑账号模态框 */}
        {showEditModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'linear-gradient(to right top, #b0d3e8, #a2c3d6, #93b4c5, #86a4b4, #7895a3, #6c90a3, #618ca3, #5587a4, #498ab6, #428cc9, #468dda, #558cea)',
              borderRadius: '16px',
              padding: '32px',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'white',
              width: '90%',
              maxWidth: '500px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
            }}>
              <h2 style={{ marginBottom: '24px', textAlign: 'center' }}>编辑账号信息</h2>
              <form onSubmit={handleUpdateAccount}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>
                    用户名 *
                  </label>
                  <input
                    type="text"
                    value={editFormData.username}
                    onChange={(e) => setEditFormData({...editFormData, username: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.25)',
                      background: 'rgba(15, 32, 60, 0.55)',
                      color: 'white',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                    required
                  />
                </div>
                
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>
                    员工姓名 *
                  </label>
                  <input
                    type="text"
                    value={editFormData.employee_name}
                    onChange={(e) => setEditFormData({...editFormData, employee_name: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.25)',
                      background: 'rgba(15, 32, 60, 0.55)',
                      color: 'white',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                    required
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>
                    新密码 (留空则不修改)
                  </label>
                  <input
                    type="password"
                    value={editFormData.password}
                    onChange={(e) => setEditFormData({...editFormData, password: e.target.value})}
                    placeholder="输入新密码或留空保持不变"
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.25)',
                      background: 'rgba(15, 32, 60, 0.55)',
                      color: 'white',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button
                    type="submit"
                    style={{
                      background: 'linear-gradient(135deg, #38a169 0%, #48bb78 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: 600
                    }}
                  >
                    保存修改
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingAccount(null);
                      setEditFormData({ username: '', password: '', employee_name: '' });
                    }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.3)',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '1rem'
                    }}
                  >
                    取消
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 查看员工详情模态框 */}
        {showViewModal && viewingAccount && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              backdropFilter: 'blur(5px)'
            }}
          >
            <div
              style={{
                background: 'rgba(15, 32, 60, 0.85)',
                borderRadius: '16px',
                padding: '32px',
                width: '90%',
                maxWidth: '700px',
                maxHeight: '85vh',
                overflowY: 'auto',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'white',
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                backdropFilter: 'blur(10px)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>员工详细信息</h2>
                <button
                  onClick={() => setShowViewModal(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'white',
                    fontSize: '28px',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)'}
                  onMouseLeave={(e) => (e.target as HTMLButtonElement).style.background = 'transparent'}
                >
                  ×
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* 基本信息 */}
                <div style={{ 
                  background: 'rgba(255,255,255,0.05)', 
                  padding: '20px', 
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#60a5fa' }}>基本信息</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>员工姓名：</span>
                      <span style={{ fontSize: '1rem', fontWeight: 500 }}>{viewingAccount.employee_name}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>员工编号：</span>
                      <span style={{ fontSize: '1rem', fontWeight: 500 }}>{viewingAccount.employee_id}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>用户名：</span>
                      <span style={{ fontSize: '1rem', fontWeight: 500 }}>{viewingAccount.username}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>身份证号：</span>
                      <span style={{ fontSize: '1rem', fontWeight: 500 }}>{viewingAccount.id_number || '未填写'}</span>
                    </div>
                  </div>
                </div>

                {/* 职位信息 */}
                <div style={{ 
                  background: 'rgba(255,255,255,0.05)', 
                  padding: '20px', 
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#34d399' }}>职位信息</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>部门：</span>
                      <span style={{ fontSize: '1rem', fontWeight: 500 }}>{viewingAccount.department || '未分配'}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>职位：</span>
                      <span style={{ fontSize: '1rem', fontWeight: 500 }}>{viewingAccount.position || '未分配'}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>角色：</span>
                      <span style={{ 
                        fontSize: '1rem', 
                        fontWeight: 500,
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: viewingAccount.role === 'admin' ? 'rgba(239, 68, 68, 0.2)' : 
                                   viewingAccount.role === 'manager' ? 'rgba(245, 158, 11, 0.2)' :
                                   viewingAccount.role === 'finance' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                        color: viewingAccount.role === 'admin' ? '#fca5a5' : 
                               viewingAccount.role === 'manager' ? '#fbbf24' :
                               viewingAccount.role === 'finance' ? '#86efac' : '#93c5fd'
                      }}>
                        {viewingAccount.role === 'admin' ? '系统管理员' : 
                         viewingAccount.role === 'manager' ? '经理' :
                         viewingAccount.role === 'finance' ? '财务' : '操作员'}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>入职日期：</span>
                      <span style={{ fontSize: '1rem', fontWeight: 500 }}>
                        {viewingAccount.hire_date ? new Date(viewingAccount.hire_date).toLocaleDateString('zh-CN') : '未填写'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 联系信息 */}
                <div style={{ 
                  background: 'rgba(255,255,255,0.05)', 
                  padding: '20px', 
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#f59e0b' }}>联系信息</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>手机号码：</span>
                      <span style={{ fontSize: '1rem', fontWeight: 500 }}>{viewingAccount.phone || '未填写'}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>邮箱地址：</span>
                      <span style={{ fontSize: '1rem', fontWeight: 500 }}>{viewingAccount.email || '未填写'}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>家庭地址：</span>
                      <span style={{ fontSize: '1rem', fontWeight: 500, wordBreak: 'break-all' }}>
                        {viewingAccount.address || '未填写'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 薪资与紧急联系人 */}
                <div style={{ 
                  background: 'rgba(255,255,255,0.05)', 
                  padding: '20px', 
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#ec4899' }}>薪资与紧急联系</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>薪资：</span>
                      <span style={{ 
                        fontSize: '1.1rem', 
                        fontWeight: 600,
                        color: '#10b981'
                      }}>
                        {viewingAccount.salary ? `¥${viewingAccount.salary.toLocaleString()}` : '未设置'}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>紧急联系人：</span>
                      <span style={{ fontSize: '1rem', fontWeight: 500 }}>{viewingAccount.emergency_contact || '未填写'}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>紧急联系电话：</span>
                      <span style={{ fontSize: '1rem', fontWeight: 500 }}>{viewingAccount.emergency_phone || '未填写'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 账号状态与备注 */}
              <div style={{ 
                marginTop: '24px',
                background: 'rgba(255,255,255,0.05)', 
                padding: '20px', 
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#8b5cf6' }}>账号状态与备注</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>账号状态：</span>
                    <span style={{ 
                      fontSize: '1rem', 
                      fontWeight: 500,
                      padding: '4px 8px',
                      borderRadius: '4px',
                      background: viewingAccount.status === 'active' ? 'rgba(34, 197, 94, 0.2)' : 
                                 viewingAccount.status === 'inactive' ? 'rgba(156, 163, 175, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: viewingAccount.status === 'active' ? '#86efac' : 
                             viewingAccount.status === 'inactive' ? '#d1d5db' : '#fca5a5'
                    }}>
                      {viewingAccount.status === 'active' ? '正常' : 
                       viewingAccount.status === 'inactive' ? '停用' : '暂停'}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>创建时间：</span>
                    <span style={{ fontSize: '1rem', fontWeight: 500 }}>
                      {viewingAccount.created_at ? new Date(viewingAccount.created_at).toLocaleDateString('zh-CN') : '未知'}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>最后登录：</span>
                    <span style={{ fontSize: '1rem', fontWeight: 500 }}>
                      {viewingAccount.last_login ? new Date(viewingAccount.last_login).toLocaleString('zh-CN') : '从未登录'}
                    </span>
                  </div>
                </div>
                {viewingAccount.notes && (
                  <div>
                    <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>备注信息：</span>
                    <div style={{ 
                      marginTop: '8px',
                      padding: '12px',
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      lineHeight: '1.5',
                      wordBreak: 'break-all'
                    }}>
                      {viewingAccount.notes}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginTop: '24px', textAlign: 'center', display: 'flex', gap: '16px', justifyContent: 'center' }}>
                <button
                  onClick={() => {
                    setCvImages(viewingAccount.cv_images || []);
                    setShowCvViewModal(true);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 500,
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
                    (e.target as HTMLButtonElement).style.boxShadow = '0 8px 20px rgba(245, 158, 11, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                    (e.target as HTMLButtonElement).style.boxShadow = 'none';
                  }}
                >
                  📄 查看CV Form
                </button>
                <button
                  onClick={() => setShowViewModal(false)}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 32px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 500,
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
                    (e.target as HTMLButtonElement).style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                    (e.target as HTMLButtonElement).style.boxShadow = 'none';
                  }}
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CV Form 上传模态框 */}
        {showCvUploadModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'rgba(15, 32, 60, 0.95)',
              borderRadius: '16px',
              padding: '32px',
              width: '90%',
              maxWidth: '800px',
              maxHeight: '85vh',
              overflowY: 'auto',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'white',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>📄 上传员工CV Form</h2>
                <button
                  onClick={() => setShowCvUploadModal(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'white',
                    fontSize: '28px',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)'}
                  onMouseLeave={(e) => (e.target as HTMLButtonElement).style.background = 'transparent'}
                >
                  ×
                </button>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '24px',
                border: '2px dashed rgba(255,255,255,0.3)'
              }}>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem' }}>拖拽文件到此处或点击上传</h3>
                  <p style={{ margin: 0, opacity: 0.7, fontSize: '0.9rem' }}>
                    支持 JPG、PNG、PDF 格式，单个文件不超过 10MB
                  </p>
                </div>
                
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleCvFileUpload}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.25)',
                    background: 'rgba(15, 32, 60, 0.55)',
                    color: 'white',
                    fontSize: '1rem',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                />
              </div>

              {/* 已上传的CV图片预览 */}
              {cvImages.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#60a5fa' }}>
                    已上传的CV Form ({cvImages.length} 张)
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: '16px'
                  }}>
                    {cvImages.map((image, index) => (
                      <div key={index} style={{
                        position: 'relative',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '8px',
                        padding: '8px',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}>
                        <img
                          src={image}
                          alt={`CV Form ${index + 1}`}
                          style={{
                            width: '100%',
                            height: '120px',
                            objectFit: 'cover',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                          onClick={() => {
                            setCvImages([image]);
                            setShowCvViewModal(true);
                          }}
                        />
                        <button
                          onClick={() => {
                            const newImages = cvImages.filter((_, i) => i !== index);
                            setCvImages(newImages);
                          }}
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            background: 'rgba(239, 68, 68, 0.8)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          ×
                        </button>
                        <div style={{
                          fontSize: '0.8rem',
                          textAlign: 'center',
                          marginTop: '8px',
                          opacity: 0.7
                        }}>
                          CV Form {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={() => {
                    setCvImages([]);
                    setShowCvUploadModal(false);
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.3)',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 500
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleSaveCvImages}
                  disabled={cvImages.length === 0 || uploadingCv}
                  style={{
                    background: uploadingCv ? 'rgba(255,255,255,0.3)' : 'linear-gradient(135deg, #38a169 0%, #48bb78 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: uploadingCv ? 'not-allowed' : 'pointer',
                    fontSize: '1rem',
                    fontWeight: 600,
                    opacity: uploadingCv ? 0.6 : 1
                  }}
                >
                  {uploadingCv ? '保存中...' : '保存CV Form'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CV Form 查看模态框 */}
        {showCvViewModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'rgba(15, 32, 60, 0.95)',
              borderRadius: '16px',
              padding: '24px',
              width: '95%',
              maxWidth: '1200px',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'white',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>📄 员工CV Form</h2>
                <button
                  onClick={() => setShowCvViewModal(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'white',
                    fontSize: '28px',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)'}
                  onMouseLeave={(e) => (e.target as HTMLButtonElement).style.background = 'transparent'}
                >
                  ×
                </button>
              </div>

              {cvImages.length > 0 ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '20px'
                }}>
                  {cvImages.map((image, index) => (
                    <div key={index} style={{
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '12px',
                      padding: '16px',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                      <div style={{
                        fontSize: '0.9rem',
                        marginBottom: '12px',
                        opacity: 0.7,
                        textAlign: 'center'
                      }}>
                        CV Form {index + 1}
                      </div>
                      <img
                        src={image}
                        alt={`CV Form ${index + 1}`}
                        style={{
                          width: '100%',
                          height: 'auto',
                          maxHeight: '600px',
                          objectFit: 'contain',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'transform 0.2s'
                        }}
                        onClick={() => window.open(image, '_blank')}
                        onMouseEnter={(e) => (e.target as HTMLImageElement).style.transform = 'scale(1.02)'}
                        onMouseLeave={(e) => (e.target as HTMLImageElement).style.transform = 'scale(1)'}
                      />
                      <div style={{
                        textAlign: 'center',
                        marginTop: '12px',
                        fontSize: '0.8rem',
                        opacity: 0.6
                      }}>
                        点击图片查看大图
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <div style={{ fontSize: '64px', marginBottom: '20px', opacity: 0.5 }}>📄</div>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '1.2rem', opacity: 0.8 }}>
                    暂无CV Form
                  </h3>
                  <p style={{ margin: 0, opacity: 0.6, fontSize: '0.9rem' }}>
                    该员工尚未上传CV Form
                  </p>
                </div>
              )}

              <div style={{ marginTop: '24px', textAlign: 'center' }}>
                <button
                  onClick={() => setShowCvViewModal(false)}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 32px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 500
                  }}
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountManagement;
