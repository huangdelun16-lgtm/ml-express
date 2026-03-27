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

  const homeBackground = 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)';

  return (
    <div style={{ minHeight: '100vh', background: homeBackground, color: 'white', padding: '2rem' }}>
      <NavigationBar 
        language={language}
        onLanguageChange={setLanguage}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: '900', margin: 0 }}>📦 {t?.profile?.packages || '订单列表'}</h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem' }}>实时监控您店铺正在处理中的所有订单</p>
          </div>
          <button 
            style={{ 
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'white', 
              border: '1px solid rgba(255, 255, 255, 0.2)', 
              padding: '0.6rem 1.2rem', 
              borderRadius: '12px',
              fontWeight: '700', 
              cursor: 'pointer', 
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.9rem',
              whiteSpace: 'nowrap'
            }}
            onClick={() => navigate('/')}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
          >
            <span>←</span> {language === 'zh' ? '返回' : 'Back'}
          </button>
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
                    <span style={{ background: '#3b82f6', color: 'white', padding: '2px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold' }}>{order.status}</span>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: '0.9rem' }}>客户: {order.receiver_name}</p>
                  <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: '0.9rem' }}>地址: {order.receiver_address}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: '#fbbf24', fontSize: '1.2rem', fontWeight: '900', margin: 0 }}>{order.price} MMK</p>
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
    </div>
  );
};

export default TrackingPage;
