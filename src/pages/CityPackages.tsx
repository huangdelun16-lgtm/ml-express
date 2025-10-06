import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { packageService, Package, supabase, auditLogService } from '../services/supabase';
import { useLanguage } from '../contexts/LanguageContext';

const CityPackages: React.FC = () => {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState('list');
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [courierDetail, setCourierDetail] = useState<any>(null);
  const [courierLoading, setCourierLoading] = useState(false);
  
  // 新增状态管理
  const [showPickupCodeModal, setShowPickupCodeModal] = useState(false);
  const [showDeliveryScanModal, setShowDeliveryScanModal] = useState(false);
  const [showUploadPhotoModal, setShowUploadPhotoModal] = useState(false);
  const [deliveryScanTab, setDeliveryScanTab] = useState('pickup');

  // 加载包裹数据
  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      setLoading(true);
      const data = await packageService.getAllPackages();
      setPackages(data);
    } catch (error) {
      console.error('加载包裹数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPackage, setNewPackage] = useState({
    senderName: '',
    senderPhone: '',
    senderAddress: '',
    receiverName: '',
    receiverPhone: '',
    receiverAddress: '',
    packageType: '文件',
    weight: '',
    description: ''
  });

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `PKG${String(packages.length + 1).padStart(3, '0')}`;
    const newPkg = {
      id: newId,
      sender_name: newPackage.senderName,
      sender_phone: newPackage.senderPhone,
      sender_address: newPackage.senderAddress,
      receiver_name: newPackage.receiverName,
      receiver_phone: newPackage.receiverPhone,
      receiver_address: newPackage.receiverAddress,
      package_type: newPackage.packageType,
      weight: newPackage.weight,
      description: newPackage.description,
      status: '待取件',
      create_time: new Date().toLocaleString('zh-CN'),
      pickup_time: '',
      delivery_time: '',
      courier: '待分配',
      price: '5000 MMK'
    };
    
    // 保存到数据库
    const result = await packageService.createPackage(newPkg);
    if (result) {
      // 记录审计日志
      const currentUser = localStorage.getItem('currentUser') || 'unknown';
      const currentUserName = localStorage.getItem('currentUserName') || '未知用户';
      await auditLogService.log({
        user_id: currentUser,
        user_name: currentUserName,
        action_type: 'create',
        module: 'packages',
        target_id: newId,
        target_name: `包裹 ${newId} (${newPackage.receiverName})`,
        action_description: `创建新包裹，收件人：${newPackage.receiverName}，电话：${newPackage.receiverPhone}，类型：${newPackage.packageType}`,
        new_value: JSON.stringify(newPkg)
      });
      
      // 重新加载数据
      await loadPackages();
      setNewPackage({
        senderName: '',
        senderPhone: '',
        senderAddress: '',
        receiverName: '',
        receiverPhone: '',
        receiverAddress: '',
        packageType: '文件',
        weight: '',
        description: ''
      });
    }
  };

  const updatePackageStatus = async (id: string, newStatus: string) => {
    // 获取当前包裹信息（用于审计日志）
    const currentPkg = packages.find(p => p.id === id);
    const oldStatus = currentPkg?.status || '未知';
    
    let pickupTime = '';
    let deliveryTime = '';
    
    if (newStatus === '已取件') {
      pickupTime = new Date().toLocaleString('zh-CN');
    }
    if (newStatus === '已送达') {
      deliveryTime = new Date().toLocaleString('zh-CN');
    }
    
    // 更新数据库
    const success = await packageService.updatePackageStatus(id, newStatus, pickupTime, deliveryTime);
    
    if (success) {
      // 记录审计日志
      const currentUser = localStorage.getItem('currentUser') || 'unknown';
      const currentUserName = localStorage.getItem('currentUserName') || '未知用户';
      await auditLogService.log({
        user_id: currentUser,
        user_name: currentUserName,
        action_type: 'update',
        module: 'packages',
        target_id: id,
        target_name: `包裹 ${id}`,
        action_description: `更新包裹状态：${oldStatus} → ${newStatus}`,
        old_value: oldStatus,
        new_value: newStatus
      });
      
      // 重新加载数据
      await loadPackages();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '待取件': return '#f39c12';
      case '已取件': return '#3498db';
      case '配送中': return '#9b59b6';
      case '已送达': return '#27ae60';
      case '已取消': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case '待取件': return '待取件';
      case '已取件': return '已取件';
      case '配送中': return '配送中';
      case '已送达': return '已送达';
      case '已取消': return '已取消';
      default: return status;
    }
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedPackage(null);
    setCourierDetail(null);
  };

  const loadCourierDetail = async (pkg: Package) => {
    if (!pkg.courier || pkg.courier === '待分配') {
      setCourierDetail(null);
      return;
    }

    try {
      setCourierLoading(true);
      let courierData = null;

      if (pkg.courier.startsWith('COU')) {
        const { data, error } = await supabase
          .from('couriers')
          .select('*')
          .eq('id', pkg.courier)
          .single();

        if (!error) {
          courierData = data;
        }
      }

      if (!courierData) {
        const { data, error } = await supabase
          .from('couriers')
          .select('*')
          .eq('name', pkg.courier)
          .maybeSingle();

        if (!error) {
          courierData = data;
        }
      }

      setCourierDetail(courierData);
    } catch (error) {
      console.error('加载快递员详情失败:', error);
      setCourierDetail(null);
    } finally {
      setCourierLoading(false);
    }
  };

  const handleViewDetail = async (pkg: Package) => {
    setSelectedPackage(pkg);
    setShowDetailModal(true);
    await loadCourierDetail(pkg);
  };

  const renderTimelineItem = (label: string, time?: string) => {
    const isCompleted = Boolean(time && time.trim() !== '');
    const dotColor = isCompleted ? '#27ae60' : 'rgba(255, 255, 255, 0.4)';
    const textColor = isCompleted ? 'white' : 'rgba(255,255,255,0.7)';

    return (
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <div style={{
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          background: dotColor,
          marginTop: '4px',
          boxShadow: isCompleted ? '0 0 6px rgba(39, 174, 96, 0.6)' : 'none'
        }}></div>
        <div>
          <p style={{ margin: 0, color: textColor, fontWeight: isCompleted ? 600 : 500 }}>{label}</p>
          <p style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
            {isCompleted ? time : '等待更新'}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 50%, #3182ce 100%)',
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
            {language === 'zh' ? '同城包裹管理' : language === 'en' ? 'City Package Management' : 'မြို့တွင်းပက်ကေ့ဂျ်စီမံခန့်ခွဲမှု'}
          </h1>
          <p style={{ margin: '5px 0 0 0', opacity: 0.8, textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>
            {language === 'zh' ? '管理曼德勒同城快递包裹' : 'Manage local express packages in Mandalay'}
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
          ← {language === 'zh' ? '返回管理后台' : 'Back to Dashboard'}
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
          {language === 'zh' ? '包裹列表' : language === 'en' ? 'Package List' : 'ပက်ကေ့ဂျ်စာရင်း'}
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
          创建包裹
        </button>
      </div>

      {/* 包裹列表 */}
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
          {loading ? (
            <div style={{ textAlign: 'center', color: 'white', padding: '2rem' }}>
              <p>加载中...</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gap: '15px'
            }}>
              {packages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'white', padding: '2rem' }}>
                  <p>暂无包裹数据</p>
                </div>
              ) : (
                packages.map((pkg) => (
              <div key={pkg.id} style={{
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
                      {pkg.id} - {pkg.package_type}
                    </h3>
                    <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '0.9rem' }}>
                      创建时间: {pkg.create_time}
                    </p>
                  </div>
                  <div style={{
                    background: getStatusColor(pkg.status),
                    color: 'white',
                    padding: '5px 15px',
                    borderRadius: '20px',
                    fontSize: '0.9rem',
                    fontWeight: 'bold'
                  }}>
                    {getStatusText(pkg.status)}
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '15px',
                  marginBottom: '15px'
                }}>
                  <div>
                    <h4 style={{ color: '#C0C0C0', margin: '0 0 5px 0', fontSize: '1rem' }}>寄件人</h4>
                    <p style={{ color: 'white', margin: 0, fontSize: '0.9rem' }}>
                      {pkg.sender_name} - {pkg.sender_phone}
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '0.8rem' }}>
                      {pkg.sender_address}
                    </p>
                  </div>
                  <div>
                    <h4 style={{ color: '#C0C0C0', margin: '0 0 5px 0', fontSize: '1rem' }}>收件人</h4>
                    <p style={{ color: 'white', margin: 0, fontSize: '0.9rem' }}>
                      {pkg.receiver_name} - {pkg.receiver_phone}
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '0.8rem' }}>
                      {pkg.receiver_address}
                    </p>
                  </div>
                  <div>
                    <h4 style={{ color: '#C0C0C0', margin: '0 0 5px 0', fontSize: '1rem' }}>包裹信息</h4>
                    <p style={{ color: 'white', margin: 0, fontSize: '0.9rem' }}>
                      重量: {pkg.weight} | 价格: {pkg.price}
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '0.8rem' }}>
                      快递员: {pkg.courier}
                    </p>
                  </div>
                </div>

                {/* 状态操作按钮 */}
                <div style={{
                  display: 'flex',
                  gap: '10px',
                  flexWrap: 'wrap',
                  marginBottom: '15px'
                }}>
                  {pkg.status === '待取件' && (
                    <button
                      onClick={() => updatePackageStatus(pkg.id, '已取件')}
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
                      标记已取件
                    </button>
                  )}
                  {pkg.status === '已取件' && (
                    <button
                      onClick={() => updatePackageStatus(pkg.id, '配送中')}
                      style={{
                        background: '#9b59b6',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                      }}
                    >
                      开始配送
                    </button>
                  )}
                  {pkg.status === '配送中' && (
                    <button
                      onClick={() => updatePackageStatus(pkg.id, '已送达')}
                      style={{
                        background: '#27ae60',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '0.9rem'
                      }}
                    >
                      标记已送达
                    </button>
                  )}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => handleViewDetail(pkg)}
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
                      查看详情
                    </button>
                    
                    <button
                      onClick={() => {
                        setSelectedPackage(pkg);
                        setShowDeliveryScanModal(true);
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 8px rgba(39, 174, 96, 0.3)',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(39, 174, 96, 0.4)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(39, 174, 96, 0.3)';
                      }}
                    >
                      📱 送件扫码
                    </button>
                  </div>
                </div>
              </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* 创建包裹表单 */}
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
            创建新包裹
          </h2>
          
          <form onSubmit={handleCreatePackage}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px',
              marginBottom: '30px'
            }}>
              {/* 寄件人信息 */}
              <div>
                <h3 style={{ color: '#C0C0C0', marginBottom: '15px' }}>寄件人信息</h3>
                <input
                  type="text"
                  placeholder="寄件人姓名"
                  value={newPackage.senderName}
                  onChange={(e) => setNewPackage({...newPackage, senderName: e.target.value})}
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
                  placeholder="联系电话"
                  value={newPackage.senderPhone}
                  onChange={(e) => setNewPackage({...newPackage, senderPhone: e.target.value})}
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
                  placeholder="寄件地址"
                  value={newPackage.senderAddress}
                  onChange={(e) => setNewPackage({...newPackage, senderAddress: e.target.value})}
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

              {/* 收件人信息 */}
              <div>
                <h3 style={{ color: '#C0C0C0', marginBottom: '15px' }}>收件人信息</h3>
                <input
                  type="text"
                  placeholder="收件人姓名"
                  value={newPackage.receiverName}
                  onChange={(e) => setNewPackage({...newPackage, receiverName: e.target.value})}
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
                  placeholder="联系电话"
                  value={newPackage.receiverPhone}
                  onChange={(e) => setNewPackage({...newPackage, receiverPhone: e.target.value})}
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
                  placeholder="收件地址"
                  value={newPackage.receiverAddress}
                  onChange={(e) => setNewPackage({...newPackage, receiverAddress: e.target.value})}
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
            </div>

            {/* 包裹信息 */}
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ color: '#C0C0C0', marginBottom: '15px' }}>包裹信息</h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '15px'
              }}>
                <select
                  value={newPackage.packageType}
                  onChange={(e) => setNewPackage({...newPackage, packageType: e.target.value})}
                  style={{
                    padding: '12px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    fontSize: '1rem'
                  }}
                >
                  <option value="文件">文件</option>
                  <option value="包裹">包裹</option>
                  <option value="易碎品">易碎品</option>
                </select>
                <input
                  type="text"
                  placeholder="重量 (kg)"
                  value={newPackage.weight}
                  onChange={(e) => setNewPackage({...newPackage, weight: e.target.value})}
                  required
                  style={{
                    padding: '12px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    fontSize: '1rem'
                  }}
                />
              </div>
              <textarea
                placeholder="包裹描述 (可选)"
                value={newPackage.description}
                onChange={(e) => setNewPackage({...newPackage, description: e.target.value})}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  height: '80px',
                  resize: 'vertical',
                  marginTop: '15px',
                  fontSize: '1rem'
                }}
              />
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
                  transition: 'all 0.3s ease'
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
                {language === 'zh' ? '创建包裹' : language === 'en' ? 'Create Package' : 'ပက်ကေ့ဂျ်ဖန်တီးရန်'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 包裹详情弹窗 */}
      {showDetailModal && selectedPackage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 32, 60, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '960px',
            maxHeight: '90vh',
            background: 'linear-gradient(145deg, rgba(26, 54, 93, 0.95), rgba(18, 38, 65, 0.92))',
            borderRadius: '24px',
            padding: '0 0 30px 0',
            color: 'white',
            boxShadow: '0 25px 55px rgba(0,0,0,0.45)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            overflow: 'hidden'
          }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '24px 30px 0 30px',
                position: 'sticky',
                top: 0,
                background: 'linear-gradient(145deg, rgba(26, 54, 93, 0.95), rgba(18, 38, 65, 0.94))',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                zIndex: 2
              }}
            >
              <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 600 }}>
                包裹详情 · {selectedPackage.id}
              </h2>
              <button
                onClick={closeDetailModal}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                  padding: '10px 22px',
                  borderRadius: '30px',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                关闭
              </button>
            </div>

            <div style={{
              padding: '25px 30px',
              overflowY: 'auto',
              maxHeight: 'calc(90vh - 96px)',
              scrollbarWidth: 'thin'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '20px',
                marginBottom: '25px'
              }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.08)',
                padding: '18px',
                borderRadius: '14px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <h3 style={{ margin: '0 0 12px 0', color: '#A5C7FF', fontSize: '1.05rem' }}>寄件人信息</h3>
                <p style={{ margin: '0 0 6px 0', fontWeight: 600 }}>{selectedPackage.sender_name}</p>
                <p style={{ margin: '0 0 6px 0', color: 'rgba(255,255,255,0.8)' }}>{selectedPackage.sender_phone}</p>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>{selectedPackage.sender_address}</p>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.08)',
                padding: '18px',
                borderRadius: '14px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <h3 style={{ margin: '0 0 12px 0', color: '#A5C7FF', fontSize: '1.05rem' }}>收件人信息</h3>
                <p style={{ margin: '0 0 6px 0', fontWeight: 600 }}>{selectedPackage.receiver_name}</p>
                <p style={{ margin: '0 0 6px 0', color: 'rgba(255,255,255,0.8)' }}>{selectedPackage.receiver_phone}</p>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>{selectedPackage.receiver_address}</p>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.08)',
                padding: '18px',
                borderRadius: '14px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <h3 style={{ margin: '0 0 12px 0', color: '#A5C7FF', fontSize: '1.05rem' }}>包裹信息</h3>
                <p style={{ margin: '0 0 6px 0' }}>类型：{selectedPackage.package_type}</p>
                <p style={{ margin: '0 0 6px 0' }}>重量：{selectedPackage.weight}</p>
                <p style={{ margin: '0 0 6px 0' }}>价格：{selectedPackage.price}</p>
                <p style={{ margin: '0 0 6px 0' }}>状态：{getStatusText(selectedPackage.status)}</p>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
                  创建时间：{selectedPackage.create_time}
                </p>
              </div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.06)',
              padding: '20px',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              marginBottom: '25px'
            }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#A5C7FF', fontSize: '1.05rem' }}>配送进度</h3>
              <div style={{ display: 'grid', gap: '14px' }}>
                {renderTimelineItem('下单完成', selectedPackage.create_time)}
                {renderTimelineItem('包裹已取件', selectedPackage.pickup_time)}
                {renderTimelineItem('配送进行中', selectedPackage.status === '配送中' || selectedPackage.status === '已送达' ? selectedPackage.pickup_time || selectedPackage.create_time : '')}
                {renderTimelineItem('包裹已送达', selectedPackage.delivery_time)}
              </div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.06)',
              padding: '20px',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#A5C7FF', fontSize: '1.05rem' }}>负责快递员</h3>
              {courierLoading ? (
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)' }}>正在加载快递员详情...</p>
              ) : selectedPackage.courier === '待分配' || !selectedPackage.courier ? (
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)' }}>尚未分配快递员</p>
              ) : courierDetail ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '15px'
                }}>
                  <div>
                    <p style={{ margin: '0 0 6px 0', fontWeight: 600 }}>{courierDetail.name}</p>
                    <p style={{ margin: '0 0 6px 0', color: 'rgba(255,255,255,0.8)' }}>{courierDetail.phone}</p>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>{courierDetail.address}</p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 6px 0' }}>车辆类型：{courierDetail.vehicle_type}</p>
                    <p style={{ margin: '0 0 6px 0' }}>状态：{courierDetail.status}</p>
                    <p style={{ margin: 0 }}>总配送：{courierDetail.total_deliveries || 0} 单</p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 6px 0' }}>加入日期：{courierDetail.join_date}</p>
                    <p style={{ margin: '0 0 6px 0' }}>最近活跃：{courierDetail.last_active || '暂无'}</p>
                    <p style={{ margin: 0 }}>评分：{courierDetail.rating || 0} ⭐</p>
                  </div>
                  {courierDetail.notes && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <p style={{ margin: '10px 0 0 0', color: 'rgba(255,255,255,0.7)' }}>备注：{courierDetail.notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)' }}>
                  当前包裹记录中的快递员信息暂时无法在系统中找到，可能使用了手写名称。
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* 寄件码模态框 */}
      {showPickupCodeModal && selectedPackage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 32, 60, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(145deg, rgba(26, 54, 93, 0.95), rgba(18, 38, 65, 0.92))',
            borderRadius: '20px',
            padding: '30px',
            color: 'white',
            boxShadow: '0 25px 55px rgba(0,0,0,0.45)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            maxWidth: '500px',
            width: '100%',
            textAlign: 'center'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '25px'
            }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>
                🔑 寄件码
              </h2>
              <button
                onClick={() => setShowPickupCodeModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  transition: 'all 0.3s ease'
                }}
              >
                ✕ 关闭
              </button>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '25px',
              borderRadius: '15px',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#A5C7FF' }}>
                客户下单条形码
              </h3>
              <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '10px',
                marginBottom: '15px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '200px'
              }}>
                <div style={{
                  width: '300px',
                  height: '120px',
                  background: '#f8f9fa',
                  border: '2px dashed #2c5282',
                  borderRadius: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  color: '#2c5282',
                  fontSize: '14px',
                  fontWeight: '500',
                  position: 'relative'
                }}>
                  {/* 条形码样式 */}
                  <div style={{
                    width: '250px',
                    height: '60px',
                    background: 'white',
                    border: '1px solid #2c5282',
                    borderRadius: '5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '10px',
                    position: 'relative'
                  }}>
                    {/* 模拟条形码线条 */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px',
                      height: '40px'
                    }}>
                      {Array.from({ length: 20 }, (_, i) => (
                        <div
                          key={i}
                          style={{
                            width: i % 3 === 0 ? '3px' : '1px',
                            height: i % 4 === 0 ? '40px' : '30px',
                            backgroundColor: '#2c5282',
                            borderRadius: '1px'
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', marginTop: '4px' }}>
                    {selectedPackage.id}
                  </div>
                </div>
              </div>
              <p style={{ 
                margin: 0, 
                color: 'rgba(255,255,255,0.8)', 
                fontSize: '0.9rem',
                lineHeight: '1.5'
              }}>
                客户下单时生成的条形码<br/>
                快递员可扫描此码进行取件<br/>
                请妥善保管此条形码
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 送件扫码模态框 */}
      {showDeliveryScanModal && selectedPackage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 32, 60, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(145deg, rgba(26, 54, 93, 0.95), rgba(18, 38, 65, 0.92))',
            borderRadius: '20px',
            padding: '30px',
            color: 'white',
            boxShadow: '0 25px 55px rgba(0,0,0,0.45)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            maxWidth: '600px',
            width: '100%',
            textAlign: 'center'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '25px'
            }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>
                📱 送件扫码
              </h2>
              <button
                onClick={() => setShowDeliveryScanModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  transition: 'all 0.3s ease'
                }}
              >
                ✕ 关闭
              </button>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '25px',
              borderRadius: '15px',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: '0 0 20px 0', color: '#A5C7FF' }}>
                送件扫码 - 多功能窗口
              </h3>
              
              {/* 功能选择标签 */}
              <div style={{
                display: 'flex',
                gap: '10px',
                marginBottom: '20px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                paddingBottom: '15px'
              }}>
                <button
                  onClick={() => setDeliveryScanTab('pickup')}
                  style={{
                    background: deliveryScanTab === 'pickup' ? '#2c5282' : 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    transition: 'all 0.3s ease'
                  }}
                >
                  🔑 寄件码
                </button>
                <button
                  onClick={() => setDeliveryScanTab('camera')}
                  style={{
                    background: deliveryScanTab === 'camera' ? '#27ae60' : 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    transition: 'all 0.3s ease'
                  }}
                >
                  📷 摄像机
                </button>
                <button
                  onClick={() => setDeliveryScanTab('upload')}
                  style={{
                    background: deliveryScanTab === 'upload' ? '#9b59b6' : 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    transition: 'all 0.3s ease'
                  }}
                >
                  📸 上传照片
                </button>
              </div>
              
              {/* 寄件码功能 */}
              {deliveryScanTab === 'pickup' && (
                <div style={{
                  background: 'white',
                  padding: '20px',
                  borderRadius: '10px',
                  marginBottom: '15px'
                }}>
                  <h4 style={{ margin: '0 0 15px 0', color: '#2c5282', fontSize: '1.1rem' }}>
                    客户下单条形码
                  </h4>
                  <div style={{
                    width: '300px',
                    height: '120px',
                    background: '#f8f9fa',
                    border: '2px dashed #2c5282',
                    borderRadius: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    color: '#2c5282',
                    fontSize: '14px',
                    fontWeight: '500',
                    margin: '0 auto 15px auto',
                    position: 'relative'
                  }}>
                    {/* 条形码样式 */}
                    <div style={{
                      width: '250px',
                      height: '60px',
                      background: 'white',
                      border: '1px solid #2c5282',
                      borderRadius: '5px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '10px',
                      position: 'relative'
                    }}>
                      {/* 模拟条形码线条 */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                        height: '40px'
                      }}>
                        {Array.from({ length: 20 }, (_, i) => (
                          <div
                            key={i}
                            style={{
                              width: i % 3 === 0 ? '3px' : '1px',
                              height: i % 4 === 0 ? '40px' : '30px',
                              backgroundColor: '#2c5282',
                              borderRadius: '1px'
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>
                      {selectedPackage.id}
                    </div>
                  </div>
                  <p style={{ 
                    margin: 0, 
                    color: '#666', 
                    fontSize: '0.8rem',
                    lineHeight: '1.4'
                  }}>
                    客户下单时生成的条形码<br/>
                    快递员可扫描此码进行取件<br/>
                    请妥善保管此条形码
                  </p>
                </div>
              )}

              {/* 摄像机功能 */}
              {deliveryScanTab === 'camera' && (
                <div style={{
                  background: 'white',
                  padding: '20px',
                  borderRadius: '10px',
                  marginBottom: '15px'
                }}>
                  <h4 style={{ margin: '0 0 15px 0', color: '#27ae60', fontSize: '1.1rem' }}>
                    摄像机扫码和拍照
                  </h4>
                  
                  {/* 扫码框 */}
                  <div style={{
                    width: '200px',
                    height: '200px',
                    border: '3px solid #27ae60',
                    borderRadius: '15px',
                    position: 'relative',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    background: 'rgba(39, 174, 96, 0.1)',
                    margin: '0 auto 15px auto'
                  }}>
                    {/* 四角标识 */}
                    <div style={{
                      position: 'absolute',
                      top: '10px',
                      left: '10px',
                      width: '20px',
                      height: '20px',
                      borderTop: '4px solid #27ae60',
                      borderLeft: '4px solid #27ae60',
                      borderRadius: '2px'
                    }}></div>
                    <div style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      width: '20px',
                      height: '20px',
                      borderTop: '4px solid #27ae60',
                      borderRight: '4px solid #27ae60',
                      borderRadius: '2px'
                    }}></div>
                    <div style={{
                      position: 'absolute',
                      bottom: '10px',
                      left: '10px',
                      width: '20px',
                      height: '20px',
                      borderBottom: '4px solid #27ae60',
                      borderLeft: '4px solid #27ae60',
                      borderRadius: '2px'
                    }}></div>
                    <div style={{
                      position: 'absolute',
                      bottom: '10px',
                      right: '10px',
                      width: '20px',
                      height: '20px',
                      borderBottom: '4px solid #27ae60',
                      borderRight: '4px solid #27ae60',
                      borderRadius: '2px'
                    }}></div>
                    
                    <div style={{
                      color: '#27ae60',
                      fontSize: '14px',
                      fontWeight: '500',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '24px', marginBottom: '8px' }}>📷</div>
                      <div>扫码/拍照区域</div>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: '10px',
                    justifyContent: 'center',
                    marginBottom: '15px'
                  }}>
                    <button
                      onClick={() => alert('启动扫码功能')}
                      style={{
                        background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '500'
                      }}
                    >
                      📱 扫码
                    </button>
                    <button
                      onClick={() => alert('启动拍照功能')}
                      style={{
                        background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '500'
                      }}
                    >
                      📷 拍照
                    </button>
                  </div>

                  <p style={{ 
                    margin: 0, 
                    color: '#666', 
                    fontSize: '0.8rem',
                    lineHeight: '1.4',
                    textAlign: 'center'
                  }}>
                    可以扫描二维码或拍照记录<br/>
                    支持实时扫码和照片拍摄
                  </p>
                </div>
              )}

              {/* 上传照片功能 */}
              {deliveryScanTab === 'upload' && (
                <div style={{
                  background: 'white',
                  padding: '20px',
                  borderRadius: '10px',
                  marginBottom: '15px'
                }}>
                  <h4 style={{ margin: '0 0 15px 0', color: '#9b59b6', fontSize: '1.1rem' }}>
                    上传照片 - 生成内存图片
                  </h4>
                  
                  {/* 照片上传区域 */}
                  <div style={{
                    width: '100%',
                    height: '200px',
                    border: '2px dashed #9b59b6',
                    borderRadius: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    background: 'rgba(155, 89, 182, 0.1)',
                    marginBottom: '15px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(155, 89, 182, 0.2)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(155, 89, 182, 0.1)';
                  }}
                  onClick={() => alert('选择照片文件')}
                  >
                    <div style={{
                      color: '#9b59b6',
                      fontSize: '14px',
                      fontWeight: '500',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '48px', marginBottom: '10px' }}>📸</div>
                      <div>点击上传照片</div>
                      <div style={{ fontSize: '12px', marginTop: '5px', opacity: 0.7 }}>
                        支持 JPG, PNG, GIF 格式
                      </div>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: '10px',
                    justifyContent: 'center',
                    marginBottom: '15px'
                  }}>
                    <button
                      onClick={() => alert('从相册选择')}
                      style={{
                        background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '500'
                      }}
                    >
                      📁 从相册选择
                    </button>
                    <button
                      onClick={() => alert('生成内存图片')}
                      style={{
                        background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '500'
                      }}
                    >
                      💾 生成内存图片
                    </button>
                  </div>

                  <p style={{ 
                    margin: 0, 
                    color: '#666', 
                    fontSize: '0.8rem',
                    lineHeight: '1.4',
                    textAlign: 'center'
                  }}>
                    上传照片后可以生成内存中的图片<br/>
                    用于记录和证明送达情况
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 上传照片模态框 */}
      {showUploadPhotoModal && selectedPackage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 32, 60, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(145deg, rgba(26, 54, 93, 0.95), rgba(18, 38, 65, 0.92))',
            borderRadius: '20px',
            padding: '30px',
            color: 'white',
            boxShadow: '0 25px 55px rgba(0,0,0,0.45)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            maxWidth: '500px',
            width: '100%',
            textAlign: 'center'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '25px'
            }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>
                📸 上传照片
              </h2>
              <button
                onClick={() => setShowUploadPhotoModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  transition: 'all 0.3s ease'
                }}
              >
                ✕ 关闭
              </button>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '25px',
              borderRadius: '15px',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#A5C7FF' }}>
                📸 包裹送达留底证明
              </h3>
              
              <p style={{ 
                margin: '0 0 20px 0', 
                color: 'rgba(255,255,255,0.8)', 
                fontSize: '0.9rem',
                lineHeight: '1.5'
              }}>
                请拍摄包裹送达证明照片<br/>
                系统将自动记录当前位置<br/>
                完成后可获得KM积分
              </p>

              {/* 包裹信息 */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '15px',
                borderRadius: '10px',
                marginBottom: '20px',
                textAlign: 'left'
              }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#A5C7FF', fontSize: '1rem' }}>
                  包裹信息
                </h4>
                <p style={{ margin: '0 0 5px 0', fontSize: '0.9rem' }}>
                  包裹编号: {selectedPackage.id}
                </p>
                <p style={{ margin: '0 0 5px 0', fontSize: '0.9rem' }}>
                  收件人: {selectedPackage.receiver_name}
                </p>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>
                  地址: {selectedPackage.receiver_address}
                </p>
              </div>

              {/* 拍照按钮 */}
              <button
                onClick={() => {
                  // 模拟拍照功能
                  alert('拍照功能已触发！\n系统将自动记录GPS位置信息');
                  setShowUploadPhotoModal(false);
                }}
                style={{
                  background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '15px 30px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  margin: '0 auto',
                  boxShadow: '0 4px 15px rgba(155, 89, 182, 0.3)',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(155, 89, 182, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(155, 89, 182, 0.3)';
                }}
              >
                📷 拍照上传送达证明
              </button>

              <p style={{ 
                margin: '15px 0 0 0', 
                color: 'rgba(255,255,255,0.6)', 
                fontSize: '0.8rem',
                fontStyle: 'italic',
                lineHeight: '1.4'
              }}>
                💡 提示: 请确保照片清晰显示包裹和收件地址<br/>
                拍照后系统将自动记录GPS位置信息
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CityPackages;
