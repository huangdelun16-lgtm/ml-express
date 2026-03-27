import React, { useState, useEffect, useRef } from 'react';
import LoggerService from '../services/LoggerService';
import { useNavigate, useLocation } from 'react-router-dom';
import { merchantService, deliveryStoreService, Product, DeliveryStore } from '../services/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import NavigationBar from '../components/home/NavigationBar';

const StoreProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<DeliveryStore | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('ml-express-customer');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      const storeId = user.store_id || user.id;
      if (storeId) {
        loadStoreData(storeId);
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const loadStoreData = async (storeId: string) => {
    setLoading(true);
    try {
      const [storeData, productsData] = await Promise.all([
        deliveryStoreService.getStoreById(storeId),
        merchantService.getStoreProducts(storeId)
      ]);
      setStore(storeData);
      setProducts(productsData);
    } catch (error) {
      LoggerService.error('Failed to load store data:', error);
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
            <h1 style={{ fontSize: '2.2rem', fontWeight: '900', margin: 0 }}>🛍️ {t.profile.myProducts || '商品管理'}</h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem' }}>管理您店铺的在线商品与库存</p>
          </div>
          <button 
            style={{ 
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: 'white', border: 'none', padding: '0.8rem 1.5rem', borderRadius: '12px',
              fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}
            onClick={() => navigate('/')}
          >
            返回概况
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '10rem 0' }}>
            <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderTop: '4px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
            {products.map((product) => (
              <div key={product.id} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', backdropFilter: 'blur(10px)' }}>
                <div style={{ height: '200px', background: 'rgba(255,255,255,0.02)', position: 'relative' }}>
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '3rem' }}>📦</div>
                  )}
                  <div style={{ position: 'absolute', top: '15px', right: '15px', background: product.is_available ? '#10b981' : '#ef4444', color: 'white', padding: '4px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                    {product.is_available ? '上架中' : '已下架'}
                  </div>
                </div>
                <div style={{ padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '800', margin: '0 0 0.5rem 0' }}>{product.name}</h3>
                  <p style={{ color: '#fbbf24', fontSize: '1.4rem', fontWeight: '900', margin: '0 0 1rem 0' }}>{product.price.toLocaleString()} MMK</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                    <span>库存: {product.stock === -1 ? '无限' : product.stock}</span>
                    <span>已售: {product.sales_count || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && products.length === 0 && (
          <div style={{ textAlign: 'center', padding: '8rem 0', background: 'rgba(255,255,255,0.03)', borderRadius: '32px', border: '2px dashed rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🛒</div>
            <h3 style={{ color: 'rgba(255,255,255,0.5)' }}>暂无商品，请在移动端 App 或管理后台添加</h3>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default StoreProductsPage;
