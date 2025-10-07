import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, auditLogService } from '../services/supabase';
import { useLanguage } from '../contexts/LanguageContext';

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
  created_at?: string;
  updated_at?: string;
}

const CourierManagement: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
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
    notes: ''
  });

  // 加载快递员数据
  useEffect(() => {
    loadCouriers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCouriers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('couriers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('获取快递员列表失败:', error);
        // 不使用模拟数据，显示空列表
        setCouriers([]);
      } else {
        // 只使用数据库数据
        setCouriers(data || []);
      }
    } catch (error) {
      console.error('加载快递员数据失败:', error);
      // 不使用模拟数据，显示空列表
      setCouriers([]);
    } finally {
      setLoading(false);
    }
  };

  // 从账号系统导入骑手
  const handleImportFromAccounts = async () => {
    if (!window.confirm('确定要从账号系统导入骑手吗？\n\n将自动导入职位为"骑手"或"骑手队长"的员工账号。')) {
      return;
    }

    setImporting(true);
    try {
      // 查询职位为骑手或骑手队长的账号
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

      // 获取现有快递员，避免重复导入
      const existingCouriers = couriers.map(c => c.phone);
      
      // 转换为快递员数据 - 只使用现有字段
      const newCouriers = riderAccounts
        .filter(account => !existingCouriers.includes(account.phone)) // 避免重复
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

      // 批量插入到couriers表 - 只插入基本字段
      const { error: insertError } = await supabase
        .from('couriers')
        .insert(newCouriers);

      if (insertError) {
        console.error('导入快递员失败 - 详细错误:', {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code
        });
        alert(`导入失败\n\n错误信息：${insertError.message}\n\n${insertError.hint || '请检查控制台获取详细信息'}`);
        return;
      }

      // 记录审计日志
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
      name: courierForm.name,
      phone: courierForm.phone,
      email: courierForm.email,
      address: courierForm.address,
      vehicle_type: courierForm.vehicle_type,
      license_number: courierForm.license_number,
      status: courierForm.status,
      join_date: new Date().toLocaleDateString('zh-CN'),
      last_active: '从未上线',
      total_deliveries: 0,
      rating: 0,
      notes: courierForm.notes
    };

    try {
      const { data, error } = await supabase
        .from('couriers')
        .insert([newCourier])
        .select()
        .single();
      
      if (error) {
        console.error('创建快递员失败:', error);
        // 添加到本地状态
        setCouriers([newCourier, ...couriers]);
      } else {
        setCouriers([data, ...couriers]);
      }
      
      // 重置表单
      setCourierForm({
        name: '',
        phone: '',
        email: '',
        address: '',
        vehicle_type: 'motorcycle',
        license_number: '',
        status: 'active',
        notes: ''
      });
      setActiveTab('list');
    } catch (error) {
      console.error('创建快递员异常:', error);
      setCouriers([newCourier, ...couriers]);
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
      status: courier.status,
      notes: courier.notes
    });
    setActiveTab('create');
  };

  const handleUpdateCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourier) return;

    const updatedCourier = {
      ...editingCourier,
      ...courierForm
    };

    try {
      const { error } = await supabase
        .from('couriers')
        .update(updatedCourier)
        .eq('id', editingCourier.id);
      
      if (error) {
        console.error('更新快递员失败:', error);
        // 更新本地状态
        setCouriers(couriers.map(c => c.id === editingCourier.id ? updatedCourier : c));
      } else {
        setCouriers(couriers.map(c => c.id === editingCourier.id ? updatedCourier : c));
      }
      
      setEditingCourier(null);
      setCourierForm({
        name: '',
        phone: '',
        email: '',
        address: '',
        vehicle_type: 'motorcycle',
        license_number: '',
        status: 'active',
        notes: ''
      });
      setActiveTab('list');
    } catch (error) {
      console.error('更新快递员异常:', error);
      setCouriers(couriers.map(c => c.id === editingCourier.id ? updatedCourier : c));
    }
  };

  const handleDeleteCourier = async (courierId: string) => {
    if (window.confirm('确定要删除这个快递员吗？')) {
      // 获取要删除的快递员信息（用于审计日志）
      const courierToDelete = couriers.find(c => c.id === courierId);
      
      try {
        const { error } = await supabase
          .from('couriers')
          .delete()
          .eq('id', courierId);
        
        if (error) {
          console.error('删除快递员失败:', error);
        }
        
        // 记录审计日志
        const currentUser = localStorage.getItem('currentUser') || 'unknown';
        const currentUserName = localStorage.getItem('currentUserName') || '未知用户';
        
        await auditLogService.log({
          user_id: currentUser,
          user_name: currentUserName,
          action_type: 'delete',
          module: 'couriers',
          target_id: courierId,
          target_name: `快递员 ${courierToDelete?.name || courierId}`,
          action_description: `删除快递员，姓名：${courierToDelete?.name || '未知'}，电话：${courierToDelete?.phone || '未知'}`,
          old_value: JSON.stringify(courierToDelete)
        });
        
        setCouriers(couriers.filter(c => c.id !== courierId));
      } catch (error) {
        console.error('删除快递员异常:', error);
        setCouriers(couriers.filter(c => c.id !== courierId));
      }
    }
  };

  const handleStatusChange = async (courierId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('couriers')
        .update({ status: newStatus })
        .eq('id', courierId);
      
      if (error) {
        console.error('更新状态失败:', error);
        // 更新本地状态
        setCouriers(couriers.map(c => 
          c.id === courierId ? { ...c, status: newStatus } : c
        ));
      } else {
        setCouriers(couriers.map(c => 
          c.id === courierId ? { ...c, status: newStatus } : c
        ));
      }
    } catch (error) {
      console.error('更新状态异常:', error);
      setCouriers(couriers.map(c => 
        c.id === courierId ? { ...c, status: newStatus } : c
      ));
    }
  };

  // 过滤快递员
  const filteredCouriers = couriers.filter(courier => {
    const matchesSearch = courier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         courier.phone.includes(searchTerm) ||
                         courier.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || courier.status === statusFilter;
    const matchesVehicle = vehicleFilter === 'all' || courier.vehicle_type === vehicleFilter;
    
    return matchesSearch && matchesStatus && matchesVehicle;
  });

  const getStatusColor = (status: string) => {
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

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 50%, #3182ce 100%)',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        padding: '30px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 25px rgba(26, 54, 93, 0.3)',
        position: 'relative',
        zIndex: 1
      }}>
        {/* 标题和退出按钮 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px'
        }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <h1 style={{
              color: 'white',
              fontSize: '2.5rem',
              margin: '0 0 10px 0',
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
            }}>
              {language === 'zh' ? '快递员管理' : language === 'en' ? 'Courier Management' : 'စာပို့သမားစီမံခန့်ခွဲမှု'}
            </h1>
            <p style={{ margin: '5px 0 0 0', opacity: 0.8, textShadow: '1px 1px 2px rgba(0,0,0,0.3)', color: 'white' }}>
              {language === 'zh' ? '管理快递员信息和业绩' : 
               language === 'en' ? 'Manage courier information and performance' : 
               'စာပို့သမားအချက်အလက်နှင့် စွမ်းဆောင်ရည်ကို စီမံခန့်ခွဲပါ'}
            </p>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', margin: 0 }}>
              管理快递员信息、状态和配送记录
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
            ← 返回仪表板
          </button>
        </div>

        {/* 标签页导航 */}
        <div style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '30px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <button
            onClick={() => setActiveTab('list')}
            style={{
              background: activeTab === 'list' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontSize: '1rem',
              transition: 'all 0.3s ease'
            }}
          >
            📋 快递员列表
          </button>
          <button
            onClick={() => setActiveTab('create')}
            style={{
              background: activeTab === 'create' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontSize: '1rem',
              transition: 'all 0.3s ease'
            }}
          >
            ➕ 添加快递员
          </button>
          <button
            onClick={handleImportFromAccounts}
            disabled={importing}
            style={{
              background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: importing ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              transition: 'all 0.3s ease',
              marginLeft: '12px',
              opacity: importing ? 0.6 : 1,
              boxShadow: '0 4px 12px rgba(155, 89, 182, 0.3)'
            }}
          >
            {importing ? '导入中...' : '📥 从账号导入骑手'}
          </button>
        </div>

        {activeTab === 'list' && (
          <div>
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
                  {couriers.filter(c => c.status === 'active').length}
                </h3>
                <p style={{ color: 'white', margin: 0, fontSize: '0.9rem' }}>活跃快递员</p>
              </div>
              <div style={{
                background: 'rgba(230, 126, 34, 0.2)',
                padding: '15px',
                borderRadius: '10px',
                textAlign: 'center',
                border: '1px solid rgba(230, 126, 34, 0.3)'
              }}>
                <h3 style={{ color: '#e67e22', margin: '0 0 5px 0', fontSize: '1.5rem' }}>
                  {couriers.reduce((sum, c) => sum + c.total_deliveries, 0)}
                </h3>
                <p style={{ color: 'white', margin: 0, fontSize: '0.9rem' }}>总配送数</p>
              </div>
              <div style={{
                background: 'rgba(155, 89, 182, 0.2)',
                padding: '15px',
                borderRadius: '10px',
                textAlign: 'center',
                border: '1px solid rgba(155, 89, 182, 0.3)'
              }}>
                <h3 style={{ color: '#9b59b6', margin: '0 0 5px 0', fontSize: '1.5rem' }}>
                  {(couriers.reduce((sum, c) => sum + c.rating, 0) / couriers.length || 0).toFixed(1)}
                </h3>
                <p style={{ color: 'white', margin: 0, fontSize: '0.9rem' }}>平均评分</p>
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
                placeholder="搜索快递员..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  fontSize: '1rem'
                }}
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  background: 'rgba(7, 23, 53, 0.65)',
                  color: 'white',
                  fontSize: '1rem'
                }}
              >
                <option value="all" style={{ background: 'rgba(26, 54, 93, 0.9)', color: 'white' }}>所有状态</option>
                <option value="active" style={{ background: 'rgba(26, 54, 93, 0.9)', color: 'white' }}>活跃</option>
                <option value="inactive" style={{ background: 'rgba(26, 54, 93, 0.9)', color: 'white' }}>非活跃</option>
                <option value="busy" style={{ background: 'rgba(26, 54, 93, 0.9)', color: 'white' }}>忙碌</option>
              </select>
              <select
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value)}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  background: 'rgba(7, 23, 53, 0.65)',
                  color: 'white',
                  fontSize: '1rem'
                }}
              >
                <option value="all" style={{ background: 'rgba(26, 54, 93, 0.9)', color: 'white' }}>所有车辆</option>
                <option value="motorcycle" style={{ background: 'rgba(26, 54, 93, 0.9)', color: 'white' }}>摩托车</option>
                <option value="car" style={{ background: 'rgba(26, 54, 93, 0.9)', color: 'white' }}>汽车</option>
                <option value="bicycle" style={{ background: 'rgba(26, 54, 93, 0.9)', color: 'white' }}>自行车</option>
                <option value="truck" style={{ background: 'rgba(26, 54, 93, 0.9)', color: 'white' }}>卡车</option>
                <option value="tricycle" style={{ background: 'rgba(26, 54, 93, 0.9)', color: 'white' }}>三轮车</option>
                <option value="small_truck" style={{ background: 'rgba(26, 54, 93, 0.9)', color: 'white' }}>小卡车</option>
              </select>
            </div>

            {/* 快递员列表 */}
            {loading ? (
              <div style={{ textAlign: 'center', color: 'white', padding: '40px' }}>
                加载中...
              </div>
            ) : filteredCouriers.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'white', padding: '40px' }}>
                没有找到快递员
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gap: '15px'
              }}>
                {filteredCouriers.map(courier => (
                  <div key={courier.id} style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    transition: 'all 0.3s ease'
                  }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '15px',
                      alignItems: 'center'
                    }}>
                      <div>
                        <h3 style={{ color: 'white', margin: '0 0 5px 0', fontSize: '1.2rem' }}>
                          {getVehicleIcon(courier.vehicle_type)} {courier.name}
                        </h3>
                        <p style={{ color: 'rgba(255, 255, 255, 0.8)', margin: '0 0 5px 0' }}>
                          📞 {courier.phone}
                        </p>
                        <p style={{ color: 'rgba(255, 255, 255, 0.8)', margin: 0 }}>
                          📧 {courier.email}
                        </p>
                      </div>
                      <div>
                        <p style={{ color: 'rgba(255, 255, 255, 0.8)', margin: '0 0 5px 0' }}>
                          🏠 {courier.address}
                        </p>
                        <p style={{ color: 'rgba(255, 255, 255, 0.8)', margin: '0 0 5px 0' }}>
                          🆔 {courier.license_number}
                        </p>
                        <p style={{ color: 'rgba(255, 255, 255, 0.8)', margin: 0 }}>
                          📅 加入时间: {courier.join_date}
                        </p>
                      </div>
                      <div>
                        <p style={{ color: 'rgba(255, 255, 255, 0.8)', margin: '0 0 5px 0' }}>
                          📦 配送数: {courier.total_deliveries}
                        </p>
                        <p style={{ color: 'rgba(255, 255, 255, 0.8)', margin: '0 0 5px 0' }}>
                          ⭐ 评分: {courier.rating}
                        </p>
                        <p style={{ color: 'rgba(255, 255, 255, 0.8)', margin: 0 }}>
                          🕐 最后活跃: {courier.last_active}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          display: 'inline-block',
                          background: getStatusColor(courier.status),
                          color: 'white',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '0.9rem',
                          marginBottom: '10px'
                        }}>
                          {courier.status === 'active' ? '活跃' : 
                           courier.status === 'inactive' ? '非活跃' : '忙碌'}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleEditCourier(courier)}
                            style={{
                              background: 'rgba(52, 152, 219, 0.8)',
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.9rem'
                            }}
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleDeleteCourier(courier.id)}
                            style={{
                              background: 'rgba(231, 76, 60, 0.8)',
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.9rem'
                            }}
                          >
                            删除
                          </button>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                          <button
                            onClick={() => handleStatusChange(courier.id, 'active')}
                            style={{
                              background: courier.status === 'active' ? 'rgba(39, 174, 96, 0.8)' : 'rgba(255, 255, 255, 0.2)',
                              color: 'white',
                              border: 'none',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.8rem'
                            }}
                          >
                            活跃
                          </button>
                          <button
                            onClick={() => handleStatusChange(courier.id, 'inactive')}
                            style={{
                              background: courier.status === 'inactive' ? 'rgba(231, 76, 60, 0.8)' : 'rgba(255, 255, 255, 0.2)',
                              color: 'white',
                              border: 'none',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.8rem'
                            }}
                          >
                            非活跃
                          </button>
                          <button
                            onClick={() => handleStatusChange(courier.id, 'busy')}
                            style={{
                              background: courier.status === 'busy' ? 'rgba(243, 156, 18, 0.8)' : 'rgba(255, 255, 255, 0.2)',
                              color: 'white',
                              border: 'none',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '0.8rem'
                            }}
                          >
                            忙碌
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'create' && (
          <div>
            <h2 style={{ color: 'white', marginBottom: '20px' }}>
              {editingCourier ? '编辑快递员' : '添加快递员'}
            </h2>
            <form onSubmit={editingCourier ? handleUpdateCourier : handleCreateCourier}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '20px',
                marginBottom: '20px'
              }}>
                <div>
                  <label style={{ color: 'white', display: 'block', marginBottom: '8px' }}>
                    姓名 *
                  </label>
                  <input
                    type="text"
                    value={courierForm.name}
                    onChange={(e) => setCourierForm({...courierForm, name: e.target.value})}
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      fontSize: '1rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ color: 'white', display: 'block', marginBottom: '8px' }}>
                    电话 *
                  </label>
                  <input
                    type="tel"
                    value={courierForm.phone}
                    onChange={(e) => setCourierForm({...courierForm, phone: e.target.value})}
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      fontSize: '1rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ color: 'white', display: 'block', marginBottom: '8px' }}>
                    邮箱
                  </label>
                  <input
                    type="email"
                    value={courierForm.email}
                    onChange={(e) => setCourierForm({...courierForm, email: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      fontSize: '1rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ color: 'white', display: 'block', marginBottom: '8px' }}>
                    地址 *
                  </label>
                  <input
                    type="text"
                    value={courierForm.address}
                    onChange={(e) => setCourierForm({...courierForm, address: e.target.value})}
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      fontSize: '1rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ color: 'white', display: 'block', marginBottom: '8px' }}>
                    车辆类型 *
                  </label>
                  <select
                    value={courierForm.vehicle_type}
                    onChange={(e) => setCourierForm({...courierForm, vehicle_type: e.target.value})}
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      background: 'rgba(7, 23, 53, 0.65)',
                      color: 'white',
                      fontSize: '1rem'
                    }}
                  >
                    <option value="motorcycle" style={{ background: 'rgba(26, 54, 93, 0.9)', color: 'white' }}>摩托车</option>
                    <option value="car" style={{ background: 'rgba(26, 54, 93, 0.9)', color: 'white' }}>汽车</option>
                    <option value="bicycle" style={{ background: 'rgba(26, 54, 93, 0.9)', color: 'white' }}>自行车</option>
                    <option value="truck" style={{ background: 'rgba(26, 54, 93, 0.9)', color: 'white' }}>卡车</option>
                    <option value="tricycle" style={{ background: 'rgba(26, 54, 93, 0.9)', color: 'white' }}>三轮车</option>
                    <option value="small_truck" style={{ background: 'rgba(26, 54, 93, 0.9)', color: 'white' }}>小卡车</option>
                  </select>
                </div>
                <div>
                  <label style={{ color: 'white', display: 'block', marginBottom: '8px' }}>
                    驾驶证号 *
                  </label>
                  <input
                    type="text"
                    value={courierForm.license_number}
                    onChange={(e) => setCourierForm({...courierForm, license_number: e.target.value})}
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      fontSize: '1rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ color: 'white', display: 'block', marginBottom: '8px' }}>
                    状态 *
                  </label>
                  <select
                    value={courierForm.status}
                    onChange={(e) => setCourierForm({...courierForm, status: e.target.value})}
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      background: 'rgba(7, 23, 53, 0.65)',
                      color: 'white',
                      fontSize: '1rem'
                    }}
                  >
                    <option value="active" style={{ background: 'rgba(26, 54, 93, 0.9)', color: 'white' }}>活跃</option>
                    <option value="inactive" style={{ background: 'rgba(26, 54, 93, 0.9)', color: 'white' }}>非活跃</option>
                    <option value="busy" style={{ background: 'rgba(26, 54, 93, 0.9)', color: 'white' }}>忙碌</option>
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ color: 'white', display: 'block', marginBottom: '8px' }}>
                    备注
                  </label>
                  <textarea
                    value={courierForm.notes}
                    onChange={(e) => setCourierForm({...courierForm, notes: e.target.value})}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      fontSize: '1rem',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                <button
                  type="submit"
                  style={{
                    background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '15px 30px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 15px rgba(39, 174, 96, 0.3)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {editingCourier ? '更新快递员' : '添加快递员'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingCourier(null);
                    setCourierForm({
                      name: '',
                      phone: '',
                      email: '',
                      address: '',
                      vehicle_type: 'motorcycle',
                      license_number: '',
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
    </div>
  );
};

export default CourierManagement;
