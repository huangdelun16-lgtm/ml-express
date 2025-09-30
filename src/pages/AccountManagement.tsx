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

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    employee_name: '',
    employee_id: '',
    phone: '',
    email: '',
    department: '',
    position: '',
    role: 'operator' as 'admin' | 'manager' | 'operator' | 'finance',
    hire_date: new Date().toISOString().split('T')[0],
    id_number: '',
    emergency_contact: '',
    emergency_phone: '',
    address: '',
    notes: ''
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
    setSuccessMessage(null);

    // 验证必填项
    if (!formData.username || !formData.password || !formData.employee_name || !formData.employee_id) {
      setErrorMessage('请填写所有必填项');
      return;
    }

    const currentUser = localStorage.getItem('currentUser') || 'admin';
    const result = await adminAccountService.createAccount({
      ...formData,
      created_by: currentUser
    });

    if (result) {
      setSuccessMessage('账号创建成功！');
      setShowForm(false);
      setFormData({
        username: '',
        password: '',
        employee_name: '',
        employee_id: '',
        phone: '',
        email: '',
        department: '',
        position: '',
        role: 'operator',
        hire_date: new Date().toISOString().split('T')[0],
        id_number: '',
        emergency_contact: '',
        emergency_phone: '',
        address: '',
        notes: ''
      });
      loadAccounts();
    } else {
      setErrorMessage('创建失败，用户名或员工ID可能已存在');
    }
  };

  const handleStatusChange = async (id: string, newStatus: 'active' | 'inactive' | 'suspended') => {
    const success = await adminAccountService.updateAccountStatus(id, newStatus);
    if (success) {
      setSuccessMessage('状态更新成功');
      loadAccounts();
    } else {
      setErrorMessage('状态更新失败');
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.25)',
    background: 'rgba(15, 32, 60, 0.55)',
    color: 'white',
    fontSize: '0.95rem',
    outline: 'none'
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '6px',
    color: 'rgba(255,255,255,0.9)',
    fontSize: '0.9rem',
    fontWeight: 500
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 50%, #3182ce 100%)',
        padding: '20px',
        fontFamily: 'Segoe UI, Arial, sans-serif'
      }}
    >
      {/* 头部 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          color: 'white'
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 700 }}>账号管理</h1>
          <p style={{ margin: '6px 0 0 0', opacity: 0.85 }}>管理员工登录账号与权限设置</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => navigate('/admin/system-settings')}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '10px 18px',
              borderRadius: '10px',
              cursor: 'pointer'
            }}
          >
            ← 返回系统设置
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              background: showForm ? 'rgba(245, 101, 101, 0.8)' : 'linear-gradient(135deg, #38a169 0%, #48bb78 100%)',
              color: 'white',
              border: 'none',
              padding: '10px 24px',
              borderRadius: '10px',
              cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(56, 161, 105, 0.35)'
            }}
          >
            {showForm ? '取消' : '+ 新增账号'}
          </button>
        </div>
      </div>

      {/* 消息提示 */}
      {(errorMessage || successMessage) && (
        <div
          style={{
            marginBottom: '20px',
            padding: '14px 18px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.25)',
            background: errorMessage ? 'rgba(245, 101, 101, 0.2)' : 'rgba(72, 187, 120, 0.2)',
            color: 'white'
          }}
        >
          {errorMessage || successMessage}
        </div>
      )}

      {/* 新增表单 */}
      {showForm && (
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.12)',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid rgba(255,255,255,0.1)',
            marginBottom: '20px'
          }}
        >
          <h2 style={{ color: 'white', marginBottom: '20px' }}>新增员工账号</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>用户名 *</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="登录用户名"
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>密码 *</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="登录密码"
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>员工姓名 *</label>
                <input
                  type="text"
                  name="employee_name"
                  value={formData.employee_name}
                  onChange={handleInputChange}
                  placeholder="员工真实姓名"
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>员工编号 *</label>
                <input
                  type="text"
                  name="employee_id"
                  value={formData.employee_id}
                  onChange={handleInputChange}
                  placeholder="例: EMP002"
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>手机号码 *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="09-XXXXXXXXX"
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>邮箱地址 *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="example@company.com"
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>部门 *</label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  placeholder="例: 运营部"
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>职位 *</label>
                <select
                  name="position"
                  value={formData.position}
                  onChange={handleInputChange}
                  style={inputStyle}
                  required
                >
                  <option value="">请选择职位</option>
                  <option value="销售">销售</option>
                  <option value="销售主管">销售主管</option>
                  <option value="财务">财务</option>
                  <option value="财务经理">财务经理</option>
                  <option value="骑手">骑手</option>
                  <option value="骑手队长">骑手队长</option>
                  <option value="客服">客服</option>
                  <option value="客服主管">客服主管</option>
                  <option value="运营专员">运营专员</option>
                  <option value="运营经理">运营经理</option>
                  <option value="技术支持">技术支持</option>
                  <option value="仓库管理员">仓库管理员</option>
                  <option value="调度员">调度员</option>
                  <option value="人事专员">人事专员</option>
                  <option value="系统管理员">系统管理员</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>角色权限 *</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  style={inputStyle}
                  required
                >
                  <option value="operator">操作员 (Operator)</option>
                  <option value="manager">经理 (Manager)</option>
                  <option value="finance">财务 (Finance)</option>
                  <option value="admin">管理员 (Admin)</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>入职日期 *</label>
                <input
                  type="date"
                  name="hire_date"
                  value={formData.hire_date}
                  onChange={handleInputChange}
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>身份证号</label>
                <input
                  type="text"
                  name="id_number"
                  value={formData.id_number}
                  onChange={handleInputChange}
                  placeholder="身份证号码"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>紧急联系人</label>
                <input
                  type="text"
                  name="emergency_contact"
                  value={formData.emergency_contact}
                  onChange={handleInputChange}
                  placeholder="紧急联系人姓名"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>紧急联系电话</label>
                <input
                  type="tel"
                  name="emergency_phone"
                  value={formData.emergency_phone}
                  onChange={handleInputChange}
                  placeholder="紧急联系电话"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>住址</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="详细地址"
                  style={inputStyle}
                />
              </div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>备注</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="其他备注信息"
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>
            <button
              type="submit"
              style={{
                background: 'linear-gradient(135deg, #38a169 0%, #48bb78 100%)',
                color: 'white',
                border: 'none',
                padding: '12px 32px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 600,
                boxShadow: '0 8px 20px rgba(56, 161, 105, 0.35)'
              }}
            >
              创建账号
            </button>
          </form>
        </div>
      )}

      {/* 账号列表 */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'white'
        }}
      >
        <h2 style={{ marginBottom: '20px' }}>现有账号列表</h2>
        {loading ? (
          <p>加载中...</p>
        ) : accounts.length === 0 ? (
          <p style={{ opacity: 0.7 }}>暂无账号数据</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>用户名</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>员工姓名</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>员工编号</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>部门</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>职位</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>角色</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>手机</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>状态</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>最后登录</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '12px' }}>{account.username}</td>
                    <td style={{ padding: '12px' }}>{account.employee_name}</td>
                    <td style={{ padding: '12px' }}>{account.employee_id}</td>
                    <td style={{ padding: '12px' }}>{account.department}</td>
                    <td style={{ padding: '12px' }}>{account.position}</td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          padding: '4px 12px',
                          borderRadius: '6px',
                          background:
                            account.role === 'admin'
                              ? 'rgba(245, 101, 101, 0.3)'
                              : account.role === 'manager'
                              ? 'rgba(237, 137, 54, 0.3)'
                              : account.role === 'finance'
                              ? 'rgba(72, 187, 120, 0.3)'
                              : 'rgba(66, 153, 225, 0.3)',
                          fontSize: '0.85rem'
                        }}
                      >
                        {account.role === 'admin' && '管理员'}
                        {account.role === 'manager' && '经理'}
                        {account.role === 'finance' && '财务'}
                        {account.role === 'operator' && '操作员'}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>{account.phone}</td>
                    <td style={{ padding: '12px' }}>
                      <select
                        value={account.status}
                        onChange={(e) =>
                          handleStatusChange(account.id!, e.target.value as 'active' | 'inactive' | 'suspended')
                        }
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid rgba(255,255,255,0.3)',
                          background:
                            account.status === 'active'
                              ? 'rgba(72, 187, 120, 0.3)'
                              : account.status === 'inactive'
                              ? 'rgba(160, 174, 192, 0.3)'
                              : 'rgba(245, 101, 101, 0.3)',
                          color: 'white',
                          fontSize: '0.85rem'
                        }}
                      >
                        <option value="active" style={{ color: '#000' }}>
                          在职
                        </option>
                        <option value="inactive" style={{ color: '#000' }}>
                          离职
                        </option>
                        <option value="suspended" style={{ color: '#000' }}>
                          停用
                        </option>
                      </select>
                    </td>
                    <td style={{ padding: '12px', fontSize: '0.85rem', opacity: 0.8 }}>
                      {account.last_login
                        ? new Date(account.last_login).toLocaleString('zh-CN')
                        : '从未登录'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <button
                        onClick={() => {
                          alert(`查看详情功能待开发\n员工: ${account.employee_name}\n编号: ${account.employee_id}`);
                        }}
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountManagement;
