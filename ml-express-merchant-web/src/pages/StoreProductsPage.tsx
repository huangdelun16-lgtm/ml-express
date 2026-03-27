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
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        const storeId = user.store_id || user.id;
        if (storeId) {
          loadStoreData(storeId);
        }
      } catch (e) {
        navigate('/login');
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
    <>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* 精致页眉 */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '3rem',
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
              background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              boxShadow: '0 10px 20px rgba(245, 158, 11, 0.3)'
            }}>🛍️</div>
            <div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: '900', margin: 0, letterSpacing: '-0.5px' }}>
                {t?.profile?.myProducts || '商品管理'}
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '4px', fontSize: '0.9rem', fontWeight: '500' }}>
                {store?.store_name} · 在线商品 {products.length} 件
              </p>
            </div>
          </div>
          
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>
            Merchant Command Center
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '10rem 0' }}>
            <div className="spinner" style={{ 
              width: '40px', 
              height: '40px', 
              border: '4px solid rgba(255,255,255,0.1)', 
              borderTop: '4px solid #fbbf24', 
              borderRadius: '50%', 
              animation: 'spin 1s linear infinite', 
              margin: '0 auto' 
            }}></div>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
            gap: '2rem' 
          }}>
            {products.map((product) => (
              <div 
                key={product.id} 
                style={{ 
                  background: 'rgba(255,255,255,0.05)', 
                  borderRadius: '28px', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  overflow: 'hidden', 
                  backdropFilter: 'blur(15px)',
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  cursor: 'default'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-10px)';
                  e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.3)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                }}
              >
                <div style={{ height: '220px', background: 'rgba(255,255,255,0.02)', position: 'relative' }}>
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '4rem', opacity: 0.2 }}>📦</div>
                  )}
                  
                  {/* 状态标签 */}
                  <div style={{ 
                    position: 'absolute', 
                    top: '20px', 
                    right: '20px', 
                    background: product.is_available ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)', 
                    color: 'white', 
                    padding: '6px 14px', 
                    borderRadius: '12px', 
                    fontSize: '0.75rem', 
                    fontWeight: '800',
                    backdropFilter: 'blur(4px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                  }}>
                    {product.is_available ? 'ON SALE' : 'OFF SHELF'}
                  </div>
                </div>

                <div style={{ padding: '1.75rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: '0 0 0.5rem 0', color: 'white' }}>{product.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '1.5rem' }}>
                    <span style={{ color: '#fbbf24', fontSize: '1.6rem', fontWeight: '900' }}>{product.price.toLocaleString()}</span>
                    <span style={{ color: '#fbbf24', fontSize: '0.9rem', fontWeight: '700' }}>MMK</span>
                  </div>
                  
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '1rem',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>库存状态</span>
                      <span style={{ color: 'white', fontWeight: '800', fontSize: '0.95rem' }}>
                        {product.stock === -1 ? '无限供应' : `${product.stock} 件`}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase' }}>累计销量</span>
                      <span style={{ color: '#10b981', fontWeight: '800', fontSize: '0.95rem' }}>{product.sales_count || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && products.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '10rem 0', 
            background: 'rgba(255,255,255,0.02)', 
            borderRadius: '40px', 
            border: '2px dashed rgba(255,255,255,0.1)' 
          }}>
            <div style={{ fontSize: '5rem', marginBottom: '1.5rem', opacity: 0.3 }}>🛒</div>
            <h3 style={{ color: 'rgba(255,255,255,0.4)', fontSize: '1.5rem', fontWeight: '700' }}>
              暂无商品数据
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.2)', marginTop: '0.5rem' }}>请在移动端 App 或管理后台同步商品</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
};

export default StoreProductsPage;
