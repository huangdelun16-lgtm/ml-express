import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CityPackages: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('list');
  const [packages, setPackages] = useState([
    {
      id: 'PKG001',
      senderName: '张先生',
      senderPhone: '09-123456789',
      senderAddress: '曼德勒市中心区',
      receiverName: '李先生',
      receiverPhone: '09-987654321',
      receiverAddress: '曼德勒东区',
      packageType: '文件',
      weight: '0.5kg',
      status: '已取件',
      createTime: '2024-12-28 10:30',
      pickupTime: '2024-12-28 11:00',
      deliveryTime: '',
      courier: '快递员A',
      price: '5000 MMK'
    },
    {
      id: 'PKG002',
      senderName: '王女士',
      senderPhone: '09-111222333',
      senderAddress: '曼德勒南区',
      receiverName: '陈先生',
      receiverPhone: '09-444555666',
      receiverAddress: '曼德勒北区',
      packageType: '包裹',
      weight: '2.0kg',
      status: '配送中',
      createTime: '2024-12-28 09:15',
      pickupTime: '2024-12-28 10:00',
      deliveryTime: '',
      courier: '快递员B',
      price: '8000 MMK'
    },
    {
      id: 'PKG003',
      senderName: '刘先生',
      senderPhone: '09-777888999',
      senderAddress: '曼德勒西区',
      receiverName: '赵女士',
      receiverPhone: '09-000111222',
      receiverAddress: '曼德勒中区',
      packageType: '文件',
      weight: '0.3kg',
      status: '已送达',
      createTime: '2024-12-27 14:20',
      pickupTime: '2024-12-27 15:00',
      deliveryTime: '2024-12-27 16:30',
      courier: '快递员C',
      price: '3000 MMK'
    }
  ]);

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

  const handleCreatePackage = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `PKG${String(packages.length + 1).padStart(3, '0')}`;
    const newPkg = {
      id: newId,
      ...newPackage,
      status: '待取件',
      createTime: new Date().toLocaleString('zh-CN'),
      pickupTime: '',
      deliveryTime: '',
      courier: '待分配',
      price: '5000 MMK'
    };
    setPackages([...packages, newPkg]);
    // setShowCreateForm(false);
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
  };

  const updatePackageStatus = (id: string, newStatus: string) => {
    setPackages(packages.map(pkg => {
      if (pkg.id === id) {
        const updated = { ...pkg, status: newStatus };
        if (newStatus === '已取件' && pkg.pickupTime === '') {
          updated.pickupTime = new Date().toLocaleString('zh-CN');
        }
        if (newStatus === '已送达' && pkg.deliveryTime === '') {
          updated.deliveryTime = new Date().toLocaleString('zh-CN');
        }
        return updated;
      }
      return pkg;
    }));
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
            同城包裹管理
          </h1>
          <p style={{ margin: '5px 0 0 0', opacity: 0.8, textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>
            管理曼德勒同城快递包裹
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
          包裹列表
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
          <div style={{
            display: 'grid',
            gap: '15px'
          }}>
            {packages.map((pkg) => (
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
                      {pkg.id} - {pkg.packageType}
                    </h3>
                    <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '0.9rem' }}>
                      创建时间: {pkg.createTime}
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
                      {pkg.senderName} - {pkg.senderPhone}
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '0.8rem' }}>
                      {pkg.senderAddress}
                    </p>
                  </div>
                  <div>
                    <h4 style={{ color: '#C0C0C0', margin: '0 0 5px 0', fontSize: '1rem' }}>收件人</h4>
                    <p style={{ color: 'white', margin: 0, fontSize: '0.9rem' }}>
                      {pkg.receiverName} - {pkg.receiverPhone}
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '0.8rem' }}>
                      {pkg.receiverAddress}
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
                  flexWrap: 'wrap'
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
                  <button
                    onClick={() => alert(`包裹 ${pkg.id} 的详细信息`)}
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
                </div>
              </div>
            ))}
          </div>
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
                创建包裹
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default CityPackages;
