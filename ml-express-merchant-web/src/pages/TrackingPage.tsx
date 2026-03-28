import React, { useState, useEffect, useRef, useCallback } from 'react';
import LoggerService from '../services/LoggerService';
import { useNavigate, useLocation } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { packageService, supabase, merchantService, deliveryStoreService } from '../services/supabase';
import NavigationBar from '../components/home/NavigationBar';
import { useLanguage } from '../contexts/LanguageContext';
import QRCode from 'qrcode';

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
const GOOGLE_MAPS_LIBRARIES: any = ['places'];

// 🚀 订单二维码子组件
const OrderQRCode: React.FC<{ orderId: string }> = ({ orderId }) => {
  const [qrUrl, setQrUrl] = useState('');
  useEffect(() => {
    if (orderId) {
      QRCode.toDataURL(orderId).then(setQrUrl);
    }
  }, [orderId]);
  return qrUrl ? <img src={qrUrl} style={{ width: '80px', height: '80px' }} alt="QR" /> : null;
};

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
  const [isPartnerStore, setIsPartnerStore] = useState(false);
  const [storeInfo, setStoreInfo] = useState<any>(null);
  const [productPriceMap, setProductPriceMap] = useState<Record<string, number>>({});

  // 模态框状态
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [showPackageDetailModal, setShowPackageDetailModal] = useState(false);
  const [showPackingModal, setShowPackingModal] = useState(false);
  const [packingOrderData, setPackingOrderData] = useState<any>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  // 分页显示
  const [currentPage, setCurrentPage] = useState(1);
  const packagesPerPage = 5;

  const searchParams = new URLSearchParams(location.search);
  const statusFilter = searchParams.get('status') || 'all';

  const loadStoreData = useCallback(async (storeId: string) => {
    try {
      const [storeData, productsData] = await Promise.all([
        deliveryStoreService.getStoreById(storeId),
        merchantService.getStoreProducts(storeId)
      ]);
      setStoreInfo(storeData);
      
      const priceMap = productsData.reduce<Record<string, number>>((acc, product) => {
        acc[product.name] = product.price;
        return acc;
      }, {});
      setProductPriceMap(priceMap);
    } catch (error) {
      LoggerService.error('Failed to load store/products data in TrackingPage:', error);
    }
  }, []);

  const loadActiveOrders = useCallback(async (user: any) => {
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
      if (user.user_type === 'merchant') {
        setIsPartnerStore(true);
        await loadStoreData(storeId);
      }
    } catch (error) {
      LoggerService.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  }, [loadStoreData]);

  useEffect(() => {
    const savedUser = localStorage.getItem('ml-express-customer');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      loadActiveOrders(user);
    } else {
      navigate('/login');
    }
  }, [navigate, loadActiveOrders]);

  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredOrders(activeOrders.filter(pkg => 
        !['已送达', '已取消', 'Delivered', 'Cancelled'].includes(pkg.status)
      ));
    } else {
      setFilteredOrders(activeOrders.filter(pkg => pkg.status === statusFilter));
    }
    setCurrentPage(1);
  }, [activeOrders, statusFilter]);

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

  const handlePrintReceipt = async (orderData: any) => {
    if (!orderData) return;
    try {
      const qrDataUrl = await QRCode.toDataURL(orderData.id, { margin: 1, width: 180 });
      const itemsMatch = orderData.description?.match(/\[(?:已选商品|Selected|Selected Products|ရွေးချယ်ထားသောပစ္စည်းများ|ကုန်ပစ္စည်းများ): (.*?)\]/);
      const productItems = itemsMatch ? itemsMatch[1].split(', ') : [];
      const parsedItems = productItems.map((item: string) => {
        const match = item.match(/^(.+?)\s*x(\d+)$/i);
        if (!match) return { label: item, qty: 1, price: undefined };
        const name = match[1].trim();
        const qty = Number(match[2]) || 1;
        const unitPrice = productPriceMap[name];
        return { label: name, qty, price: unitPrice ? unitPrice * qty : undefined };
      });

      const itemPayMatch = orderData.description?.match(/\[(?:商品费用 \(仅余额支付\)|Item Cost \(Balance Only\)|ကုန်ပစ္စည်းဖိုး \(လက်ကျန်ငွေဖြင့်သာ\)|余额支付|Balance Payment|လက်ကျန်ငွေဖြင့် ပေးချေခြင်း|平台支付|Platform Payment|ပလက်ဖောင်းမှ ပေးချေခြင်း): (.*?) MMK\]/);
      const itemCost = itemPayMatch?.[1] ? parseFloat(itemPayMatch[1].replace(/,/g, '')) : 0;
      const deliveryFee = parseFloat(orderData.price?.replace(/[^0-9.]/g, '') || '0');
      const computedItemTotal = parsedItems.reduce((sum: number, item: any) => sum + (item.price || 0), 0);
      const finalItemTotal = itemCost > 0 ? itemCost : computedItemTotal;
      const totalFee = deliveryFee + finalItemTotal;
      const paymentText = orderData.payment_method === 'cash' ? (language === 'zh' ? '现金支付' : 'Cash') : (language === 'zh' ? '余额支付' : 'Balance');
      const orderIdShort = `#${orderData.id.slice(-5)}`;

      const html = `
        <html>
          <head>
            <style>
              body { font-family: sans-serif; padding: 20px; color: #111827; width: 300px; margin: 0 auto; line-height: 1.4; }
              .title { text-align: center; font-size: 20px; font-weight: 900; margin-bottom: 5px; }
              .subtitle { text-align: center; font-size: 12px; color: #6b7280; margin-bottom: 15px; }
              .section { border-top: 1px dashed #d1d5db; padding: 10px 0; margin-top: 5px; }
              .row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 12px; align-items: flex-start; }
              .label { color: #6b7280; min-width: 50px; }
              .value { font-weight: 600; text-align: right; flex: 1; margin-left: 10px; }
              .item-row { display: flex; justify-content: space-between; font-size: 12px; margin: 4px 0; }
              .total-row { font-size: 15px; font-weight: 900; border-top: 1px solid #000; margin-top: 10px; padding-top: 8px; }
              .qr-box { text-align: center; margin: 15px 0; }
              .qr-box img { width: 140px; height: 140px; }
              .footer-note { text-align: center; font-size: 10px; color: #9ca3af; margin-top: 20px; font-style: italic; }
            </style>
          </head>
          <body>
            <div class="title">MARKET LINK EXPRESS</div>
            <div class="subtitle">订单号 ${orderIdShort}</div>
            <div class="qr-box"><img src="${qrDataUrl}" /><div style="font-size: 11px; font-weight: bold; margin-top: 5px;">取件码: ${orderData.id}</div></div>
            <div class="section">
              <div class="row"><span class="label">商家:</span><span class="value">${orderData.sender_name || '-'}</span></div>
              <div class="row"><span class="label">电话:</span><span class="value">${orderData.sender_phone || '-'}</span></div>
              <div class="row"><span class="label">地址:</span><span class="value">${orderData.sender_address || '-'}</span></div>
            </div>
            <div class="section">
              <div class="row"><span class="label">客户:</span><span class="value">${orderData.receiver_name || '-'}</span></div>
              <div class="row"><span class="label">电话:</span><span class="value">${orderData.receiver_phone || '-'}</span></div>
              <div class="row"><span class="label">地址:</span><span class="value">${orderData.receiver_address || '-'}</span></div>
            </div>
            <div class="section">
              <div class="row"><span class="label">支付:</span><span class="value">${paymentText}</span></div>
              ${parsedItems.map((item: any) => `
                <div class="item-row"><span>• ${item.label} x${item.qty}</span><span>${item.price ? `${item.price.toLocaleString()} MMK` : '-'}</span></div>
              `).join('')}
              <div class="row"><span class="label">跑腿费:</span><span class="value">${deliveryFee.toLocaleString()} MMK</span></div>
              <div class="row total-row"><span>合计:</span><span>${totalFee.toLocaleString()} MMK</span></div>
            </div>
            <div class="footer-note">请保留此票据用于对账，感谢使用！</div>
          </body>
        </html>
      `;

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);
      
      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        }, 500);
      }
    } catch (error) {
      LoggerService.error('生成小票失败:', error);
    }
  };

  const handleAcceptOrder = async (targetPkg?: any) => {
    const pkgToAccept = targetPkg || selectedPackage;
    if (!pkgToAccept?.id) return;
    try {
      setLoading(true);
      if (pkgToAccept.status !== '待确认') {
        alert(language === 'zh' ? '该订单状态已变更，无法接单' : 'Order status changed');
        return;
      }
      const success = await packageService.updatePackageStatus(pkgToAccept.id, '打包中');
      if (success) {
        handlePrintReceipt(pkgToAccept);
        alert(language === 'zh' ? '接单成功！小票已自动打印，请开始打包商品。' : 'Order accepted! Receipt printed.');
        if (currentUser) loadActiveOrders(currentUser);
        setShowPackageDetailModal(false);
      }
    } catch (error) {
      LoggerService.error('接单失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (pkg: any) => {
    if (!pkg?.id) return;
    const confirmMsg = language === 'zh' ? '确定要取消吗？' : 'Cancel order?';
    if (!window.confirm(confirmMsg)) return;
    try {
      setLoading(true);
      const success = await packageService.updatePackageStatus(pkg.id, '已取消');
      if (success) {
        if (currentUser) loadActiveOrders(currentUser);
        setShowPackageDetailModal(false);
      }
    } catch (error) {
      LoggerService.error('取消失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOrderClick = (order: any) => {
    if (order.status === '打包中') {
      handleStartPacking(order);
    } else {
      setSelectedPackage(order);
      setShowPackageDetailModal(true);
    }
  };

  const handleStartPacking = (pkg: any) => {
    setPackingOrderData(pkg);
    setCheckedItems({});
    setShowPackingModal(true);
    setShowPackageDetailModal(false);
  };

  const toggleItem = (itemId: string) => {
    setCheckedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleCompletePacking = async () => {
    if (!packingOrderData) return;
    try {
      setLoading(true);
      const isPaid = packingOrderData.payment_method === 'balance' || packingOrderData.payment_status === 'paid';
      const nextStatus = isPaid ? '待取件' : '待收款';
      const success = await packageService.updatePackageStatus(packingOrderData.id, nextStatus);
      if (success) {
        setShowPackingModal(false);
        if (currentUser) loadActiveOrders(currentUser);
      }
    } catch (error) {
      LoggerService.error('打包失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* 页眉 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', background: 'rgba(255, 255, 255, 0.03)', padding: '2rem', borderRadius: '30px', border: '1px solid rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '18px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', boxShadow: '0 10px 20px rgba(37, 99, 235, 0.3)' }}>📦</div>
            <div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: '900', margin: 0, letterSpacing: '-0.5px', color: '#ffffff' }}>{t?.packages || '订单列表'}</h1>
              <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '4px', fontSize: '0.9rem', fontWeight: '500' }}>{statusFilter === 'all' ? '处理中的订单' : statusFilter} {filteredOrders.length} 笔</p>
            </div>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>{statusFilter.toUpperCase()}</div>
        </div>

        {loading && activeOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '10rem 0' }}><div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderTop: '4px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div></div>
        ) : (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {filteredOrders.slice((currentPage - 1) * packagesPerPage, currentPage * packagesPerPage).map((order) => (
              <div key={order.id} onClick={() => handleOrderClick(order)} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '20px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backdropFilter: 'blur(10px)', cursor: 'pointer', transition: 'all 0.3s ease' }} onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }} onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: '900', color: 'white' }}>#{order.id}</span>
                    <span style={{ background: getStatusColor(order.status === '待收款' ? '待取件' : order.status), color: 'white', padding: '2px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold' }}>{order.status === '待收款' ? getStatusText(order.status) : order.status}</span>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: '0.9rem' }}>客户: {order.receiver_name}</p>
                  <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: '0.9rem' }}>地址: {order.receiver_address}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: '#fbbf24', fontSize: '1.2rem', fontWeight: '900', margin: 0 }}>{order.price ? `${order.price.replace('MMK', '').trim()} MMK` : '-'}</p>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>{new Date(order.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 分页 */}
        {filteredOrders.length > packagesPerPage && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '3rem' }}>
            <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center', padding: '1rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.1)', width: '40px', height: '40px', borderRadius: '12px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease', opacity: currentPage === 1 ? 0.3 : 1 }}><span style={{ fontSize: '1.2rem' }}>‹</span></button>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {Array.from({ length: Math.ceil(filteredOrders.length / packagesPerPage) }, (_, i) => i + 1).map((page) => (
                  <button key={page} onClick={() => setCurrentPage(page)} style={{ background: currentPage === page ? '#3b82f6' : 'transparent', color: 'white', border: currentPage === page ? 'none' : '1px solid rgba(255, 255, 255, 0.1)', width: '36px', height: '36px', borderRadius: '10px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '800', transition: 'all 0.2s ease', boxShadow: currentPage === page ? '0 4px 12px rgba(59, 130, 246, 0.4)' : 'none' }}>{page}</button>
                ))}
              </div>
              <button onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredOrders.length / packagesPerPage), prev + 1))} disabled={currentPage === Math.ceil(filteredOrders.length / packagesPerPage)} style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.1)', width: '40px', height: '40px', borderRadius: '12px', cursor: currentPage === Math.ceil(filteredOrders.length / packagesPerPage) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease', opacity: currentPage === Math.ceil(filteredOrders.length / packagesPerPage) ? 0.3 : 1 }}><span style={{ fontSize: '1.2rem' }}>›</span></button>
            </div>
            <div style={{ textAlign: 'center', marginTop: '1.5rem', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>{language === 'zh' ? `显示第 ${(currentPage - 1) * packagesPerPage + 1}-${Math.min(currentPage * packagesPerPage, filteredOrders.length)} 条，共 ${filteredOrders.length} 条` : `Showing ${(currentPage - 1) * packagesPerPage + 1}-${Math.min(currentPage * packagesPerPage, filteredOrders.length)} of ${filteredOrders.length}`}</div>
          </div>
        )}

        {!loading && filteredOrders.length === 0 && (
          <div style={{ textAlign: 'center', padding: '8rem 0', background: 'rgba(255,255,255,0.03)', borderRadius: '32px', border: '2px dashed rgba(255,255,255,0.1)' }}><div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✨</div><h3 style={{ color: 'rgba(255,255,255,0.5)' }}>当前暂无该状态下的订单</h3></div>
        )}
      </div>

      <style>{` @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .spinner { animation: spin 1s linear infinite; } `}</style>

      {/* 🚀 包裹详情模态框 (与 ProfilePage 同步) */}
      {showPackageDetailModal && selectedPackage && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(5px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }} onClick={() => setShowPackageDetailModal(false)}>
          <div style={{ background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(20px)', borderRadius: '24px', padding: '1.5rem', border: '1px solid rgba(255, 255, 255, 0.3)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid rgba(255,255,255,0.3)', paddingBottom: '1rem' }}>
              <h2 style={{ color: 'white', fontSize: '1.5rem', margin: 0 }}>{t?.packageDetails || '包裹详情'}</h2>
              <button onClick={() => setShowPackageDetailModal(false)} style={{ background: 'rgba(255, 255, 255, 0.2)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.3)', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}>{t?.close || '关闭'}</button>
            </div>

            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div><label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>{t?.packageId}</label><div style={{ color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}>{selectedPackage.id}</div></div>
                <div><label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem' }}>{t?.status}</label><div style={{ display: 'inline-block', background: getStatusColor(selectedPackage.status === '待收款' ? '待取件' : selectedPackage.status), color: 'white', padding: '0.5rem 1rem', borderRadius: '24px', fontSize: '0.9rem', fontWeight: 'bold' }}>{selectedPackage.status === '待收款' ? getStatusText(selectedPackage.status) : selectedPackage.status}</div></div>
              </div>

              {/* 余额支付解析 */}
              {(() => {
                const payMatch = selectedPackage.description?.match(/\[(?:付给商家|Pay to Merchant|ဆိုင်သို့ ပေးချေရန်|骑手代付|Courier Advance Pay|ကောင်ရီယာမှ ကြိုတင်ပေးချေခြင်း|平台支付|Platform Payment|ပလက်ဖောင်းမှ ပေးချေခြင်း|余额支付|Balance Payment|လက်ကျန်ငွေဖြင့် ပေးချေခြင်း): (.*?) MMK\]/);
                if (payMatch && payMatch[1]) {
                  return (<div><label style={{ color: '#10b981', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>{language === 'zh' ? '余额支付' : language === 'en' ? 'Balance Payment' : 'လက်ကျန်ငွေဖြင့် ပေးချေခြင်း'}</label><div style={{ color: '#10b981', fontSize: '1.5rem', fontWeight: '900' }}>{payMatch[1]} MMK</div></div>);
                }
                return null;
              })()}

              <div style={{ background: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '1.5rem', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ color: 'white', fontSize: '1.1rem', margin: 0 }}>{t?.sender}</h3>
                  {(selectedPackage.description?.includes('[下单身份: 商家]') || selectedPackage.description?.includes('[Orderer: MERCHANTS]')) && (<div style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', padding: '4px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800', border: '1px solid rgba(59, 130, 246, 0.3)' }}>{language === 'zh' ? '下单账号：MERCHANTS' : 'Order Account: MERCHANTS'}</div>)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div><label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>{t?.name}</label><div style={{ color: 'white' }}>{selectedPackage.sender_name || '-'}</div></div>
                  <div><label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>{t?.phone}</label><div style={{ color: 'white' }}>{selectedPackage.sender_phone || '-'}</div></div>
                  <div style={{ gridColumn: '1 / -1' }}><label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>{t?.address}</label><div style={{ color: 'white' }}>{selectedPackage.sender_address || '-'}</div></div>
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '1.5rem', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ color: 'white', fontSize: '1.1rem', margin: 0 }}>{t?.receiver}</h3>
                  {(selectedPackage.description?.includes('[下单身份: VIP]') || selectedPackage.description?.includes('[Orderer: VIP]')) && (<div style={{ background: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24', padding: '4px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '800', border: '1px solid rgba(251, 191, 36, 0.3)' }}>{language === 'zh' ? '下单账号：VIP' : 'Order Account: VIP'}</div>)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div><label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>{t?.name}</label><div style={{ color: 'white' }}>{selectedPackage.receiver_name || '-'}</div></div>
                  <div><label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>{t?.phone}</label><div style={{ color: 'white' }}>{selectedPackage.receiver_phone || '-'}</div></div>
                  <div style={{ gridColumn: '1 / -1' }}><label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>{t?.address}</label><div style={{ color: 'white' }}>{selectedPackage.receiver_address || '-'}</div></div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div><label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>{language === 'zh' ? '包裹类型' : 'Type'}</label><div style={{ color: 'white' }}>{selectedPackage.package_type || '-'}</div></div>
                <div><label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>{language === 'zh' ? '重量' : 'Weight'}</label><div style={{ color: 'white' }}>{selectedPackage.weight || '-'}</div></div>
                <div><label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>{t?.price}</label><div style={{ color: 'white', fontWeight: 'bold' }}>{selectedPackage.price || '-'}</div></div>
              </div>

              {/* 🚀 商家专属操作按钮 */}
              {isPartnerStore && (
                <div style={{ marginTop: '1rem' }}>
                  {selectedPackage.status === '待确认' && (
                    <>
                      <button onClick={() => handleAcceptOrder(selectedPackage)} disabled={loading} style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none', padding: '1rem 2rem', borderRadius: '12px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '1.1rem', fontWeight: '900', transition: 'all 0.3s ease', width: '100%', boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '0.5rem' }}>{loading ? <div className="spinner" style={{ width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.3)', borderTop: '3px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div> : <>✅ {language === 'zh' ? '立即接单' : language === 'en' ? 'Accept Order' : 'အော်ဒါလက်ခံရန်'}</>}</button>
                      <button onClick={() => handleCancelOrder(selectedPackage)} disabled={loading} style={{ width: '100%', padding: '0.8rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '10px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' }}>{language === 'zh' ? '拒绝接单' : 'Reject Order'}</button>
                    </>
                  )}
                  {selectedPackage.status === '打包中' && (
                    <button onClick={() => handleStartPacking(selectedPackage)} disabled={loading} style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none', padding: '1rem 2rem', borderRadius: '12px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '1.1rem', fontWeight: '900', transition: 'all 0.3s ease', width: '100%', boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '0.5rem' }}><>📦 {language === 'zh' ? '开始打包' : language === 'en' ? 'Start Packing' : 'ထုပ်ပိုးရန်စတင်ပါ'}</></button>
                  )}
                </div>
              )}
              
              <button onClick={() => setShowPackageDetailModal(false)} style={{ background: 'rgba(59, 130, 246, 0.5)', color: 'white', border: '1px solid rgba(59, 130, 246, 0.7)', padding: '0.75rem 2rem', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold', transition: 'all 0.3s ease', width: '100%' }}>{t?.close || '关闭'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 打包模态框 (与 ProfilePage 同步) */}
      {showPackingModal && packingOrderData && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(10px)', zIndex: 30000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => !loading && setShowPackingModal(false)}>
          <div style={{ background: 'white', borderRadius: '35px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', padding: '2.5rem 2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📦</div>
              <h2 style={{ color: 'white', fontSize: '2rem', fontWeight: '950', margin: 0 }}>{language === 'zh' ? '订单打包中' : 'Order Packing'}</h2>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1rem', marginTop: '0.5rem', fontWeight: '600' }}>{t?.packageId}: {packingOrderData.id}</p>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
              <h3 style={{ color: '#1e293b', fontSize: '1.2rem', fontWeight: '900', marginBottom: '1.5rem' }}>📋 {language === 'zh' ? '核对商品清单' : 'Checklist'}</h3>
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
                      <div style={{ width: '28px', height: '28px', borderRadius: '8px', border: `2px solid ${checkedItems[`item-${index}`] ? '#10b981' : '#cbd5e1'}`, backgroundColor: checkedItems[`item-${index}`] ? '#10b981' : 'transparent', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{checkedItems[`item-${index}`] && '✓'}</div>
                      <span style={{ fontSize: '1.1rem', fontWeight: '700', color: checkedItems[`item-${index}`] ? '#64748b' : '#1e293b', textDecoration: checkedItems[`item-${index}`] ? 'line-through' : 'none' }}>{item}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
            <div style={{ padding: '1.5rem', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
              <button onClick={handleCompletePacking} disabled={loading || (() => { const productsMatch = packingOrderData.description?.match(/\[商品清单: (.*?)\]/); const productItems = productsMatch ? productsMatch[1].split(', ') : []; if (productItems.length === 0) return !checkedItems['default']; return productItems.some((_: any, index: number) => !checkedItems[`item-${index}`]); })()} style={{ width: '100%', padding: '1.2rem', borderRadius: '24px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none', fontSize: '1.2rem', fontWeight: '950', cursor: 'pointer', boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)', opacity: loading ? 0.6 : 1 }}>{loading ? '...' : (language === 'zh' ? '确认打包完成' : 'Packing Done')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TrackingPage;
