import React, { useState, useEffect, useRef, useCallback } from 'react';
import LoggerService from '../services/LoggerService';
import { useNavigate, useLocation } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { packageService } from '../services/supabase';
import NavigationBar from '../components/home/NavigationBar';
import { useLanguage } from '../contexts/LanguageContext';

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
const GOOGLE_MAPS_LIBRARIES: any = ['places'];

const TrackingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage, t: allT } = useLanguage();
  const t = allT.profile;
  
  const { isLoaded: isMapLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES
  });

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 🚀 新增：模态框状态
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [showPackageDetailModal, setShowPackageDetailModal] = useState(false);
  const [showPackingModal, setShowPackingModal] = useState(false);
  const [packingOrderData, setPackingOrderData] = useState<any>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  // 🚀 每页显示
  const [currentPage, setCurrentPage] = useState(1);
  const packagesPerPage = 5; // 🚀 与 ProfilePage 保持一致

  // 解析当前状态
  const searchParams = new URLSearchParams(location.search);
  const statusFilter = searchParams.get('status') || 'all';

  useEffect(() => {
    const savedUser = localStorage.getItem('ml-express-customer');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      loadActiveOrders(user);
    } else {
      navigate('/login');
    }
  }, [navigate]);

  // 根据 URL 参数过滤订单
  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredOrders(activeOrders.filter(pkg => 
        !['已送达', '已取消', 'Delivered', 'Cancelled'].includes(pkg.status)
      ));
    } else {
      setFilteredOrders(activeOrders.filter(pkg => pkg.status === statusFilter));
    }
  }, [activeOrders, statusFilter]);

  const loadActiveOrders = async (user: any) => {
    setLoading(true);
    try {
      const storeId = user.store_id || user.id;
      const packages = await packageService.getPackagesByUser(
        user.email,
        user.phone,
        undefined,
        storeId,
        user.id,
        user.name
      );
      
      setActiveOrders(packages);
    } catch (error) {
      LoggerService.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('ml-express-customer');
    localStorage.removeItem('userType');
    navigate('/login');
  };

  const getStatusColor = (status: string) => {
    const statusMap: { [key: string]: string } = {
      '待确认': '#fbbf24',
      '打包中': '#10b981',
      '待取件': '#f59e0b',
      '已取件': '#3b82f6',
      '运输中': '#8b5cf6',
      '已送达': '#10b981',
      '待收款': '#ef4444',
      '已取消': '#94a3b8',
      '已完成': '#6b7280'
    };
    return statusMap[status] || '#6b7280';
  };

  const getStatusText = (status: string) => {
    if (status === '待收款') return language === 'zh' ? '待取件' : language === 'en' ? 'Pending Pickup' : 'ကောက်ယူရန်စောင့်ဆိုင်းနေသည်';
    if (status === '待确认') return language === 'zh' ? '待接单' : language === 'en' ? 'Pending Accept' : 'လက်ခံရန်စောင့်ဆိုင်းနေသည်';
    if (status === '打包中') return language === 'zh' ? '打包中' : language === 'en' ? 'Packing' : 'ထုပ်ပိုးနေသည်';
    if (status === '已取消') return language === 'zh' ? '已取消' : language === 'en' ? 'Cancelled' : 'ပယ်ဖျက်လိုက်သည်';
    return status;
  };

  const getPaymentMethodColor = (method?: string) => {
    if (method === 'cash') return 'rgba(16, 185, 129, 0.15)'; // 现金：绿色
    return 'rgba(59, 130, 246, 0.15)'; // 线上/转账：蓝色
  };

  const getPaymentMethodBorderColor = (method?: string) => {
    if (method === 'cash') return 'rgba(16, 185, 129, 0.3)';
    return 'rgba(59, 130, 246, 0.3)';
  };

  // 🚀 新增：点击订单处理逻辑
  const handleOrderClick = (order: any) => {
    if (order.status === '打包中') {
      handleStartPacking(order);
    } else {
      setSelectedPackage(order);
      setShowPackageDetailModal(true);
    }
  };

  // 🚀 新增：开始打包功能
  const handleStartPacking = (pkg: any) => {
    setPackingOrderData(pkg);
    setCheckedItems({});
    setShowPackingModal(true);
  };

  // 🚀 新增：切换打包项勾选状态
  const toggleItem = (itemId: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  // 🚀 新增：完成打包逻辑
  const handleCompletePacking = async () => {
    if (!packingOrderData) return;

    try {
      setLoading(true);
      const isPaid = packingOrderData.payment_method === 'balance' || packingOrderData.payment_status === 'paid';
      const nextStatus = isPaid ? '待取件' : '待收款';
      
      const success = await packageService.updatePackageStatus(packingOrderData.id, nextStatus);
      
      if (success) {
        alert(language === 'zh' ? '打包完成！快递员将很快上门取件。' : 'Packing complete! Courier will arrive soon.');
        setShowPackingModal(false);
        setPackingOrderData(null);
        // 刷新数据
        if (currentUser) loadActiveOrders(currentUser);
      } else {
        throw new Error('Status update failed');
      }
    } catch (error) {
      LoggerService.error('打包完成更新失败:', error);
      alert(language === 'zh' ? '提交失败，请重试' : 'Submission failed, please try again');
    } finally {
      setLoading(false);
    }
  };

  const homeBackground = 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)';

  return (
    <>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '2.5rem',
          background: 'rgba(255, 255, 255, 0.03)',
          padding: '2rem',
          borderRadius: '30px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ 
              width: '60px', 
              height: '60px', 
              borderRadius: '18px', 
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              boxShadow: '0 10px 20px rgba(37, 99, 235, 0.3)'
            }}>📦</div>
            <div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: '900', margin: 0, letterSpacing: '-0.5px', color: '#ffffff' }}>
                {t?.profile?.packages || '订单列表'}
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '4px', fontSize: '0.9rem', fontWeight: '500' }}>
                {statusFilter === 'all' ? '处理中的订单' : statusFilter} {filteredOrders.length} 笔
              </p>
            </div>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>
            {statusFilter.toUpperCase()}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '10rem 0' }}>
            <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderTop: '4px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {filteredOrders
              .slice((currentPage - 1) * packagesPerPage, currentPage * packagesPerPage)
              .map((order) => (
              <div 
                key={order.id} 
                onClick={() => handleOrderClick(order)}
                style={{ 
                  background: 'rgba(255,255,255,0.05)', 
                  borderRadius: '20px', 
                  padding: '1.5rem', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  backdropFilter: 'blur(10px)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: '900', color: 'white' }}>#{order.id}</span>
                    <span style={{ 
                      background: getStatusColor(order.status === '待收款' ? '待取件' : order.status), 
                      color: 'white', 
                      padding: '2px 10px', 
                      borderRadius: '6px', 
                      fontSize: '0.75rem', 
                      fontWeight: 'bold' 
                    }}>
                      {order.status === '待收款' ? getStatusText(order.status) : order.status}
                    </span>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: '0.9rem' }}>客户: {order.receiver_name}</p>
                  <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: '0.9rem' }}>地址: {order.receiver_address}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: '#fbbf24', fontSize: '1.2rem', fontWeight: '900', margin: 0 }}>
                    {order.price ? `${order.price.replace('MMK', '').trim()} MMK` : '-'}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>{new Date(order.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 分页控件 */}
        {filteredOrders.length > packagesPerPage && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '3rem' }}>
            <div style={{
              display: 'flex',
              gap: '1.2rem',
              alignItems: 'center',
              padding: '1rem',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '24px',
              border: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  opacity: currentPage === 1 ? 0.3 : 1
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>‹</span>
              </button>

              <div style={{
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center'
              }}>
                {Array.from({ length: Math.ceil(filteredOrders.length / packagesPerPage) }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    style={{
                      background: currentPage === page ? '#3b82f6' : 'transparent',
                      color: 'white',
                      border: currentPage === page ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '800',
                      transition: 'all 0.2s ease',
                      boxShadow: currentPage === page ? '0 4px 12px rgba(59, 130, 246, 0.4)' : 'none'
                    }}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredOrders.length / packagesPerPage), prev + 1))}
                disabled={currentPage === Math.ceil(filteredOrders.length / packagesPerPage)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  cursor: currentPage === Math.ceil(filteredOrders.length / packagesPerPage) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  opacity: currentPage === Math.ceil(filteredOrders.length / packagesPerPage) ? 0.3 : 1
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>›</span>
              </button>
            </div>

            {/* 显示当前页信息 */}
            <div style={{
              textAlign: 'center',
              marginTop: '1.5rem',
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.9rem'
            }}>
              {language === 'zh' 
                ? `显示第 ${(currentPage - 1) * packagesPerPage + 1}-${Math.min(currentPage * packagesPerPage, filteredOrders.length)} 条，共 ${filteredOrders.length} 条`
                : language === 'en'
                ? `Showing ${(currentPage - 1) * packagesPerPage + 1}-${Math.min(currentPage * packagesPerPage, filteredOrders.length)} of ${filteredOrders.length}`
                : ((currentPage - 1) * packagesPerPage + 1) + '-' + Math.min(currentPage * packagesPerPage, filteredOrders.length) + ' ကို ပြသထားသည်၊ စုစုပေါင်း ' + filteredOrders.length
              }
            </div>
          </div>
        )}

        {!loading && filteredOrders.length === 0 && (
          <div style={{ textAlign: 'center', padding: '8rem 0', background: 'rgba(255,255,255,0.03)', borderRadius: '32px', border: '2px dashed rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✨</div>
            <h3 style={{ color: 'rgba(255,255,255,0.5)' }}>当前暂无该状态下的订单</h3>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spinner { animation: spin 1s linear infinite; }
      `}</style>

      {/* 🚀 包裹详情模态框 */}
      {showPackageDetailModal && selectedPackage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(5px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem'
        }}
        onClick={() => setShowPackageDetailModal(false)}
        >
          <div style={{
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: '1.5rem',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
              borderBottom: '2px solid rgba(255,255,255,0.3)',
              paddingBottom: '1rem'
            }}>
              <h2 style={{
                color: 'white',
                fontSize: '1.5rem',
                margin: 0
              }}>
                {t?.packageDetails || '包裹详情'}
              </h2>
              <button
                onClick={() => setShowPackageDetailModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}
              >
                {t?.close || '关闭'}
              </button>
            </div>

            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <div>
                <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>
                  {t?.packageId || '订单号'}
                </label>
                <div style={{ color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}>
                  {selectedPackage.id}
                </div>
              </div>

              <div>
                <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>
                  {t?.status || '状态'}
                </label>
                <div style={{
                  display: 'inline-block',
                  background: getStatusColor(selectedPackage.status === '待收款' ? '待取件' : selectedPackage.status),
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  fontSize: '0.9rem',
                  fontWeight: 'bold'
                }}>
                  {selectedPackage.status === '待收款' ? getStatusText(selectedPackage.status) : selectedPackage.status}
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '1.5rem' }}>
                <h3 style={{ color: 'white', fontSize: '1.1rem', margin: '0 0 1rem 0' }}>{t?.sender || '寄件人'}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>{t?.name || '姓名'}</label>
                    <div style={{ color: 'white' }}>{selectedPackage.sender_name}</div>
                  </div>
                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>{t?.phone || '电话'}</label>
                    <div style={{ color: 'white' }}>{selectedPackage.sender_phone}</div>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>{t?.address || '地址'}</label>
                    <div style={{ color: 'white' }}>{selectedPackage.sender_address}</div>
                  </div>
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '1.5rem' }}>
                <h3 style={{ color: 'white', fontSize: '1.1rem', margin: '0 0 1rem 0' }}>{t?.receiver || '收件人'}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>{t?.name || '姓名'}</label>
                    <div style={{ color: 'white' }}>{selectedPackage.receiver_name}</div>
                  </div>
                  <div>
                    <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>{t?.phone || '电话'}</label>
                    <div style={{ color: 'white' }}>{selectedPackage.receiver_phone}</div>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>{t?.address || '地址'}</label>
                    <div style={{ color: 'white' }}>{selectedPackage.receiver_address}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 打包模态框 */}
      {showPackingModal && packingOrderData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(10px)',
          zIndex: 30000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}
        onClick={() => !loading && setShowPackingModal(false)}
        >
          <div style={{
            background: 'white',
            borderRadius: '35px',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
            position: 'relative'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', padding: '2.5rem 2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📦</div>
              <h2 style={{ color: 'white', fontSize: '2rem', fontWeight: '950', margin: 0 }}>
                {language === 'zh' ? '订单打包中' : language === 'en' ? 'Order Packing' : 'အော်ဒါထုပ်ပိုးနေသည်'}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1rem', marginTop: '0.5rem', fontWeight: '600' }}>
                {t?.packageId || '订单号'}: {packingOrderData.id}
              </p>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ color: '#1e293b', fontSize: '1.2rem', fontWeight: '900', marginBottom: '1.5rem' }}>
                  📋 {language === 'zh' ? '核对商品清单' : 'Checklist'}
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {(() => {
                    const productsMatch = packingOrderData.description?.match(/\[商品清单: (.*?)\]/);
                    const productItems = productsMatch ? productsMatch[1].split(', ') : [];
                    
                    if (productItems.length === 0) {
                      return (
                        <div style={{ padding: '1.5rem', textAlign: 'center', background: '#f8fafc', borderRadius: '24px', border: '2px dashed #e2e8f0' }}>
                          <p style={{ color: '#64748b' }}>{language === 'zh' ? '暂无详细商品清单' : 'No detailed list'}</p>
                          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '1rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={checkedItems['default']} onChange={() => toggleItem('default')} style={{ width: '24px', height: '24px' }} />
                            <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1e293b' }}>{language === 'zh' ? '确认商品已备齐' : 'Confirm'}</span>
                          </label>
                        </div>
                      );
                    }

                    return productItems.map((item: string, index: number) => (
                      <div key={index} onClick={() => toggleItem(`item-${index}`)} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '1.2rem', background: checkedItems[`item-${index}`] ? 'rgba(16, 185, 129, 0.05)' : '#f8fafc', borderRadius: '18px', border: `2px solid ${checkedItems[`item-${index}`] ? '#10b981' : '#f1f5f9'}`, cursor: 'pointer' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '8px', border: `2px solid ${checkedItems[`item-${index}`] ? '#10b981' : '#cbd5e1'}`, backgroundColor: checkedItems[`item-${index}`] ? '#10b981' : 'transparent', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {checkedItems[`item-${index}`] && '✓'}
                        </div>
                        <span style={{ fontSize: '1.1rem', fontWeight: '700', color: checkedItems[`item-${index}`] ? '#64748b' : '#1e293b', textDecoration: checkedItems[`item-${index}`] ? 'line-through' : 'none' }}>{item}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>

            <div style={{ padding: '1.5rem', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
              <button
                onClick={handleCompletePacking}
                disabled={loading || (() => {
                  const productsMatch = packingOrderData.description?.match(/\[商品清单: (.*?)\]/);
                  const productItems = productsMatch ? productsMatch[1].split(', ') : [];
                  if (productItems.length === 0) return !checkedItems['default'];
                  return productItems.some((_: any, index: number) => !checkedItems[`item-${index}`]);
                })()}
                style={{ width: '100%', padding: '1.2rem', borderRadius: '24px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none', fontSize: '1.2rem', fontWeight: '950', cursor: 'pointer', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)', opacity: loading ? 0.6 : 1 }}
              >
                {loading ? '...' : (language === 'zh' ? '确认打包完成' : 'Packing Done')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TrackingPage;
