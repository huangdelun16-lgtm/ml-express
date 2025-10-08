import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { packageService, Package, supabase, auditLogService } from '../services/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import QRCode from 'qrcode';

const CityPackages: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
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
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  
  // 新增功能状态
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [packagePhotos, setPackagePhotos] = useState<any[]>([]);
  const [photoLoading, setPhotoLoading] = useState(false);
  
  // 查询单号功能状态
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<Package | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // 生成二维码
  const generateQRCode = async (orderId: string) => {
    try {
      const qrCodeUrl = await QRCode.toDataURL(orderId, {
        width: 200,
        margin: 2,
        color: {
          dark: '#2c5282',
          light: '#FFFFFF'
        }
      });
      setQrCodeDataUrl(qrCodeUrl);
    } catch (error) {
      console.error('生成二维码失败:', error);
    }
  };

  // 加载包裹数据
  useEffect(() => {
    loadPackages();
    
    // 设置定时刷新，每30秒刷新一次包裹状态
    const refreshInterval = setInterval(() => {
      loadPackages();
    }, 30000);
    
    return () => clearInterval(refreshInterval);
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

  // 计算包裹统计信息
  const getPackageStatistics = () => {
    const total = packages.length;
    const pending = packages.filter(p => p.status === '待取件').length;
    const pickedUp = packages.filter(p => p.status === '已取件').length;
    const delivering = packages.filter(p => p.status === '配送中' || p.status === '配送进行中').length;
    const delivered = packages.filter(p => p.status === '已送达').length;
    const cancelled = packages.filter(p => p.status === '已取消').length;

    return {
      total,
      pending,
      pickedUp,
      delivering,
      delivered,
      cancelled
    };
  };

  // 按日期过滤包裹
  const getFilteredPackages = () => {
    if (!selectedDate) {
      // 如果没有选择日期，按创建时间倒序排列
      return [...packages].sort((a, b) => {
        const dateA = new Date(a.created_at || a.create_time).getTime();
        const dateB = new Date(b.created_at || b.create_time).getTime();
        return dateB - dateA;
      });
    }
    
    return packages.filter(pkg => {
      const pkgDate = new Date(pkg.created_at || pkg.create_time).toLocaleDateString('zh-CN');
      return pkgDate === selectedDate;
    }).sort((a, b) => {
      // 同一天内按时间倒序排列
      const dateA = new Date(a.created_at || a.create_time).getTime();
      const dateB = new Date(b.created_at || b.create_time).getTime();
      return dateB - dateA;
    });
  };

  // 获取可用日期列表
  const getAvailableDates = () => {
    const dates = new Set<string>();
    packages.forEach(pkg => {
      const date = new Date(pkg.created_at || pkg.create_time).toLocaleDateString('zh-CN');
      dates.add(date);
    });
    return Array.from(dates).sort((a, b) => {
      // 按日期倒序排列（最新的在前）
      return new Date(b).getTime() - new Date(a).getTime();
    });
  };

  // 格式化日期显示
  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return `今天 (${dateStr})`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `昨天 (${dateStr})`;
    } else {
      return dateStr;
    }
  };

  // 查找包裹照片
  const findPackagePhotos = async (packageId: string) => {
    try {
      setPhotoLoading(true);
      // 这里应该从数据库或存储中获取照片
      // 暂时使用模拟数据
      const mockPhotos = [
        {
          id: '1',
          url: 'https://via.placeholder.com/300x200/27ae60/ffffff?text=配送照片1',
          timestamp: new Date().toLocaleString('zh-CN'),
          courier: '骑手A',
          location: '曼德勒市中心'
        },
        {
          id: '2', 
          url: 'https://via.placeholder.com/300x200/3498db/ffffff?text=配送照片2',
          timestamp: new Date().toLocaleString('zh-CN'),
          courier: '骑手A',
          location: '曼德勒市中心'
        }
      ];
      setPackagePhotos(mockPhotos);
      setShowPhotoModal(true);
    } catch (error) {
      console.error('查找包裹照片失败:', error);
    } finally {
      setPhotoLoading(false);
    }
  };

  // 查询包裹单号
  const searchPackage = async () => {
    if (!searchQuery.trim()) {
      alert('请输入包裹单号');
      return;
    }

    try {
      setSearchLoading(true);
      // 在当前包裹列表中搜索
      const foundPackage = packages.find(pkg => 
        pkg.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.sender_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.receiver_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.sender_phone.includes(searchQuery) ||
        pkg.receiver_phone.includes(searchQuery)
      );

      if (foundPackage) {
        setSearchResult(foundPackage);
        setShowSearchModal(false);
        setShowDetailModal(true);
        setSelectedPackage(foundPackage);
      } else {
        alert('未找到相关包裹，请检查单号是否正确');
      }
    } catch (error) {
      console.error('查询包裹失败:', error);
      alert('查询失败，请重试');
    } finally {
      setSearchLoading(false);
    }
  };

  const updatePackageStatus = async (id: string, newStatus: string) => {
    const success = await packageService.updatePackageStatus(id, newStatus);
    if (success) {
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

  const handleViewDetail = async (pkg: Package) => {
    setSelectedPackage(pkg);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedPackage(null);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 50%, #3182ce 100%)',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <h1 style={{ fontSize: '2rem', margin: 0, textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>
              {language === 'zh' ? '同城包裹管理' : language === 'en' ? 'City Package Management' : 'မြို့တွင်းပက်ကေ့ဂျ်စီမံခန့်ခွဲမှု'}
            </h1>
            <p style={{ margin: '5px 0 0 0', opacity: 0.8, textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>
              {language === 'zh' ? '管理曼德勒同城快递包裹' : 'Manage local express packages in Mandalay'}
            </p>
            
            {/* 包裹统计信息 */}
            <div style={{ 
              display: 'flex', 
              gap: '20px', 
              marginTop: '15px',
              flexWrap: 'wrap'
            }}>
              {(() => {
                const stats = getPackageStatistics();
                return (
                  <>
                    <div style={{ 
                      background: 'rgba(255, 255, 255, 0.1)', 
                      padding: '8px 16px', 
                      borderRadius: '20px',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}>
                      <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>总包裹: </span>
                      <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{stats.total}</span>
                    </div>
                    <div style={{ 
                      background: 'rgba(243, 156, 18, 0.2)', 
                      padding: '8px 16px', 
                      borderRadius: '20px',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(243, 156, 18, 0.3)'
                    }}>
                      <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>待取件: </span>
                      <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#f39c12' }}>{stats.pending}</span>
                    </div>
                    <div style={{ 
                      background: 'rgba(52, 152, 219, 0.2)', 
                      padding: '8px 16px', 
                      borderRadius: '20px',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(52, 152, 219, 0.3)'
                    }}>
                      <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>已取件: </span>
                      <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#3498db' }}>{stats.pickedUp}</span>
                    </div>
                    <div style={{ 
                      background: 'rgba(155, 89, 182, 0.2)', 
                      padding: '8px 16px', 
                      borderRadius: '20px',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(155, 89, 182, 0.3)'
                    }}>
                      <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>配送中: </span>
                      <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#9b59b6' }}>{stats.delivering}</span>
                    </div>
                    <div style={{ 
                      background: 'rgba(39, 174, 96, 0.2)', 
                      padding: '8px 16px', 
                      borderRadius: '20px',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(39, 174, 96, 0.3)'
                    }}>
                      <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>已送达: </span>
                      <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#27ae60' }}>{stats.delivered}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowSearchModal(true)}
              style={{
                background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(52, 152, 219, 0.3)',
                transition: 'all 0.3s ease',
                textShadow: 'none'
              }}
            >
              🔍 {language === 'zh' ? '查询单号' : 'Search Package'}
            </button>
            
            <button
              onClick={() => setShowDatePicker(true)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease',
                textShadow: 'none'
              }}
            >
              📅 {language === 'zh' ? '日期筛选' : 'Date Filter'}
              {selectedDate && <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>({formatDateDisplay(selectedDate)})</span>}
            </button>
            
            <button
              onClick={loadPackages}
              style={{
                background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(39, 174, 96, 0.3)',
                transition: 'all 0.3s ease',
                textShadow: 'none'
              }}
            >
              🔄 {language === 'zh' ? '刷新状态' : 'Refresh Status'}
            </button>
            
            <button
              onClick={() => navigate('/admin')}
              style={{
                background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(231, 76, 60, 0.3)',
                transition: 'all 0.3s ease',
                textShadow: 'none'
              }}
            >
              ← {language === 'zh' ? '返回后台' : 'Back to Admin'}
            </button>
          </div>
        </div>
      </div>

      {/* 包裹列表 */}
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
          <div style={{ display: 'grid', gap: '15px' }}>
            {getFilteredPackages().length === 0 ? (
              <div style={{ textAlign: 'center', color: 'white', padding: '2rem' }}>
                <p>{selectedDate ? `所选日期 ${selectedDate} 暂无包裹数据` : '暂无包裹数据'}</p>
                {selectedDate && (
                  <button
                    onClick={() => setSelectedDate(null)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      marginTop: '10px'
                    }}
                  >
                    清除日期筛选
                  </button>
                )}
              </div>
            ) : (
              getFilteredPackages().map((pkg) => (
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
                    </div>
                    <div>
                      <h4 style={{ color: '#C0C0C0', margin: '0 0 5px 0', fontSize: '1rem' }}>收件人</h4>
                      <p style={{ color: 'white', margin: 0, fontSize: '0.9rem' }}>
                        {pkg.receiver_name} - {pkg.receiver_phone}
                      </p>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                    gap: '15px',
                    flexWrap: 'wrap',
                    marginTop: '15px'
                  }}>
                    {/* 左侧状态操作按钮 */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      {pkg.status === '待取件' && (
                        <button
                          onClick={() => updatePackageStatus(pkg.id, '已取件')}
                          style={{
                            background: '#3498db',
                            color: 'white',
                            border: 'none',
                            padding: '10px 18px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: '500',
                            minHeight: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
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
                            padding: '10px 18px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: '500',
                            minHeight: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
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
                            padding: '10px 18px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: '500',
                            minHeight: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          标记已送达
                        </button>
                      )}
                    </div>
                    
                    {/* 右侧功能按钮 */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <button
                        onClick={() => handleViewDetail(pkg)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.2)',
                          color: 'white',
                          border: '1px solid rgba(255, 255, 255, 0.3)',
                          padding: '10px 18px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          fontWeight: '500',
                          minHeight: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                        }}
                      >
                        查看详情
                      </button>
                      
                      <button
                        onClick={() => findPackagePhotos(pkg.id)}
                        style={{
                          background: 'linear-gradient(135deg, #e67e22 0%, #f39c12 100%)',
                          color: 'white',
                          border: 'none',
                          padding: '10px 18px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          fontWeight: '500',
                          minHeight: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 8px rgba(230, 126, 34, 0.3)',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(230, 126, 34, 0.4)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(230, 126, 34, 0.3)';
                        }}
                      >
                        🔍 查找照片
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 查询单号模态框 */}
      {showSearchModal && (
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
            background: 'linear-gradient(135deg, #2c5282 0%, #3182ce 100%)',
            borderRadius: '15px',
            padding: '25px',
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
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, color: 'white' }}>
                🔍 查询包裹单号
              </h2>
              <button
                onClick={() => {
                  setShowSearchModal(false);
                  setSearchQuery('');
                  setSearchResult(null);
                }}
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
              padding: '20px',
              borderRadius: '15px',
              marginBottom: '20px'
            }}>
              <p style={{ color: 'rgba(255,255,255,0.9)', margin: '0 0 15px 0', fontSize: '1rem' }}>
                请输入包裹单号、寄件人姓名、收件人姓名或电话号码
              </p>
              
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="例如：MDY20251006172107 或 张三 或 13800138000"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  fontSize: '1rem',
                  marginBottom: '15px',
                  outline: 'none'
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    searchPackage();
                  }
                }}
              />
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  onClick={searchPackage}
                  disabled={searchLoading}
                  style={{
                    background: searchLoading ? 'rgba(255, 255, 255, 0.3)' : 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: searchLoading ? 'not-allowed' : 'pointer',
                    fontSize: '1rem',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(52, 152, 219, 0.3)',
                    transition: 'all 0.3s ease',
                    opacity: searchLoading ? 0.7 : 1
                  }}
                >
                  {searchLoading ? '🔍 查询中...' : '🔍 查询包裹'}
                </button>
                
                <button
                  onClick={() => {
                    setShowSearchModal(false);
                    setSearchQuery('');
                    setSearchResult(null);
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '500',
                    transition: 'all 0.3s ease'
                  }}
                >
                  取消
                </button>
              </div>
            </div>

            {/* 搜索提示 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '15px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <h4 style={{ color: '#A5C7FF', margin: '0 0 10px 0', fontSize: '0.9rem' }}>
                💡 搜索提示
              </h4>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', textAlign: 'left' }}>
                <p style={{ margin: '5px 0' }}>• 包裹单号：MDY20251006172107</p>
                <p style={{ margin: '5px 0' }}>• 寄件人姓名：张三</p>
                <p style={{ margin: '5px 0' }}>• 收件人姓名：李四</p>
                <p style={{ margin: '5px 0' }}>• 电话号码：13800138000</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 日期选择器模态框 */}
      {showDatePicker && (
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
            background: 'linear-gradient(135deg, #2c5282 0%, #3182ce 100%)',
            borderRadius: '15px',
            padding: '25px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            maxWidth: '400px',
            width: '100%',
            textAlign: 'center'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '25px'
            }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, color: 'white' }}>
                📅 选择日期
              </h2>
              <button
                onClick={() => setShowDatePicker(false)}
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
              padding: '20px',
              borderRadius: '15px',
              marginBottom: '20px'
            }}>
              <button
                onClick={() => {
                  setSelectedDate(null);
                  setShowDatePicker(false);
                }}
                style={{
                  background: selectedDate === null ? 'rgba(39, 174, 96, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  width: '100%',
                  marginBottom: '10px',
                  transition: 'all 0.3s ease'
                }}
              >
                全部日期 ({packages.length} 个包裹)
              </button>
              
              {getAvailableDates().map((date) => {
                const datePackages = packages.filter(pkg => {
                  const pkgDate = new Date(pkg.created_at || pkg.create_time).toLocaleDateString('zh-CN');
                  return pkgDate === date;
                }).length;
                
                return (
                  <button
                    key={date}
                    onClick={() => {
                      setSelectedDate(date);
                      setShowDatePicker(false);
                    }}
                    style={{
                      background: selectedDate === date ? 'rgba(39, 174, 96, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      padding: '12px 20px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      width: '100%',
                      marginBottom: '10px',
                      transition: 'all 0.3s ease',
                      textAlign: 'left',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span>{formatDateDisplay(date)}</span>
                    <span style={{ 
                      background: 'rgba(255, 255, 255, 0.2)', 
                      padding: '4px 8px', 
                      borderRadius: '12px',
                      fontSize: '0.8rem'
                    }}>
                      {datePackages} 个包裹
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 照片查看模态框 */}
      {showPhotoModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #2c5282 0%, #3182ce 100%)',
            borderRadius: '15px',
            padding: '25px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '25px'
            }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, color: 'white' }}>
                📸 包裹配送照片
              </h2>
              <button
                onClick={() => setShowPhotoModal(false)}
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

            {photoLoading ? (
              <div style={{ textAlign: 'center', color: 'white', padding: '2rem' }}>
                <p>正在加载照片...</p>
              </div>
            ) : packagePhotos.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'white', padding: '2rem' }}>
                <p>暂无配送照片</p>
                <p style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '10px' }}>
                  骑手送件完成后上传的照片将显示在这里
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '20px' }}>
                {packagePhotos.map((photo) => (
                  <div key={photo.id} style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    padding: '15px',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}>
                    <img 
                      src={photo.url} 
                      alt={`配送照片 ${photo.id}`}
                      style={{
                        width: '100%',
                        height: '200px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        marginBottom: '10px'
                      }}
                    />
                    <div style={{ color: 'white' }}>
                      <p style={{ margin: '0 0 5px 0', fontSize: '0.9rem' }}>
                        <strong>上传时间:</strong> {photo.timestamp}
                      </p>
                      <p style={{ margin: '0 0 5px 0', fontSize: '0.9rem' }}>
                        <strong>上传骑手:</strong> {photo.courier}
                      </p>
                      <p style={{ margin: '0', fontSize: '0.9rem' }}>
                        <strong>拍摄位置:</strong> {photo.location}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 包裹详情模态框 */}
      {showDetailModal && selectedPackage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #2c5282 0%, #3182ce 100%)',
            borderRadius: '15px',
            padding: '25px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '25px'
            }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, color: 'white' }}>
                📦 包裹详情
              </h2>
              <button
                onClick={closeDetailModal}
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

            <div style={{ display: 'grid', gap: '20px' }}>
              {/* 基本信息 */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                padding: '20px',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#A5C7FF', fontSize: '1.1rem' }}>
                  📋 基本信息
                </h3>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>包裹编号:</span>
                    <span style={{ color: 'white', fontWeight: '500' }}>{selectedPackage.id}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>包裹类型:</span>
                    <span style={{ color: 'white', fontWeight: '500' }}>{selectedPackage.package_type}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>重量:</span>
                    <span style={{ color: 'white', fontWeight: '500' }}>{selectedPackage.weight}kg</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>状态:</span>
                    <span style={{ 
                      color: 'white', 
                      fontWeight: '500',
                      background: getStatusColor(selectedPackage.status),
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '0.9rem'
                    }}>
                      {getStatusText(selectedPackage.status)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>创建时间:</span>
                    <span style={{ color: 'white', fontWeight: '500' }}>{selectedPackage.create_time}</span>
                  </div>
                </div>
              </div>

              {/* 寄件人信息 */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                padding: '20px',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#A5C7FF', fontSize: '1.1rem' }}>
                  📤 寄件人信息
                </h3>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>姓名:</span>
                    <span style={{ color: 'white', fontWeight: '500' }}>{selectedPackage.sender_name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>电话:</span>
                    <span style={{ color: 'white', fontWeight: '500' }}>{selectedPackage.sender_phone}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>地址:</span>
                    <span style={{ color: 'white', fontWeight: '500' }}>{selectedPackage.sender_address}</span>
                  </div>
                </div>
              </div>

              {/* 收件人信息 */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                padding: '20px',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#A5C7FF', fontSize: '1.1rem' }}>
                  📥 收件人信息
                </h3>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>姓名:</span>
                    <span style={{ color: 'white', fontWeight: '500' }}>{selectedPackage.receiver_name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>电话:</span>
                    <span style={{ color: 'white', fontWeight: '500' }}>{selectedPackage.receiver_phone}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>地址:</span>
                    <span style={{ color: 'white', fontWeight: '500' }}>{selectedPackage.receiver_address}</span>
                  </div>
                </div>
              </div>

              {/* 配送信息 */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                padding: '20px',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#A5C7FF', fontSize: '1.1rem' }}>
                  🚚 配送信息
                </h3>
                <div style={{ display: 'grid', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>负责骑手:</span>
                    <span style={{ color: 'white', fontWeight: '500' }}>{selectedPackage.courier || '待分配'}</span>
                  </div>
                  {selectedPackage.pickup_time && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'rgba(255,255,255,0.8)' }}>取件时间:</span>
                      <span style={{ color: 'white', fontWeight: '500' }}>{selectedPackage.pickup_time}</span>
                    </div>
                  )}
                  {selectedPackage.delivery_time && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'rgba(255,255,255,0.8)' }}>送达时间:</span>
                      <span style={{ color: 'white', fontWeight: '500' }}>{selectedPackage.delivery_time}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CityPackages;