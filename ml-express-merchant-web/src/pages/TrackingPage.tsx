import React, { useState, useEffect, useRef } from 'react';
import LoggerService from '../services/LoggerService';
import { useNavigate } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { packageService } from '../services/supabase';
import NavigationBar from '../components/home/NavigationBar';
import { useLanguage } from '../contexts/LanguageContext';

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
const GOOGLE_MAPS_LIBRARIES: any = ['places'];

const TrackingPage: React.FC = () => {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  
  const { isLoaded: isMapLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES
  });

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      
      const active = packages.filter(pkg => 
        !['已送达', '已取消', 'Delivered', 'Cancelled'].includes(pkg.status)
      );
      setActiveOrders(active);
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
                正在处理中的订单 {activeOrders.length} 笔
              </p>
            </div>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>
            Live Monitoring
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '10rem 0' }}>
            <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderTop: '4px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {activeOrders.map((order) => (
              <div key={order.id} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '20px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backdropFilter: 'blur(10px)' }}>
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

        {!loading && activeOrders.length === 0 && (
          <div style={{ textAlign: 'center', padding: '8rem 0', background: 'rgba(255,255,255,0.03)', borderRadius: '32px', border: '2px dashed rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✨</div>
            <h3 style={{ color: 'rgba(255,255,255,0.5)' }}>当前暂无正在进行的订单</h3>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
};

export default TrackingPage;
