import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { merchantService, deliveryStoreService, Product, DeliveryStore } from '../services/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import NavigationBar from '../components/home/NavigationBar';
import LoggerService from '../services/LoggerService';

const StoreProductsPage: React.FC = () => {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { language, setLanguage, t: translations } = useLanguage();
  const { addToCart, cartCount } = useCart();
  
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<DeliveryStore | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [currentUser, setCurrentUser] = useState<any>(null);

  const t = {
    zh: {
      loading: '正在加载商品...',
      addToCart: '加入购物车',
      noProducts: '该商店暂无商品',
      stock: '库存',
      infinite: '无限',
      addedToCart: '已加入购物车',
      cart: '购物车',
      back: '返回商场',
      merchantInfo: '商家信息',
      address: '详细地址',
      contact: '联系电话',
      hours: '营业时间'
    },
    en: {
      loading: 'Loading products...',
      addToCart: 'Add to Cart',
      noProducts: 'No products in this store',
      stock: 'Stock',
      infinite: 'Infinite',
      addedToCart: 'Added to cart',
      cart: 'Cart',
      back: 'Back to Mall',
      merchantInfo: 'Merchant Info',
      address: 'Address',
      contact: 'Phone',
      hours: 'Hours'
    },
    my: {
      loading: 'ကုန်ပစ္စည်းများရှာဖွေနေပါသည်...',
      addToCart: 'ခြင်းထဲသို့ထည့်ရန်',
      noProducts: 'ဤဆိုင်တွင် ကုန်ပစ္စည်းမရှိသေးပါ',
      stock: 'လက်ကျန်',
      infinite: 'အကန့်အသတ်မရှိ',
      addedToCart: 'ခြင်းထဲသို့ထည့်ပြီးပါပြီ',
      cart: 'ခြင်း',
      back: 'ဈေးသို့ပြန်သွားရန်',
      merchantInfo: 'ဆိုင်အချက်အလက်',
      address: 'လိပ်စာ',
      contact: 'ဖုန်းနံပါတ်',
      hours: 'ဖွင့်ချိန်'
    }
  }[language as 'zh' | 'en' | 'my'] || {
    loading: 'Loading...',
    addToCart: 'Add to Cart',
    noProducts: 'No products in this store',
    stock: 'Stock',
    infinite: 'Infinite',
    addedToCart: 'Added to cart',
    cart: 'Cart',
    back: 'Back',
    merchantInfo: 'Merchant Info',
    address: 'Address',
    contact: 'Phone',
    hours: 'Hours'
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('ml-express-user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Failed to load user info:', error);
      }
    }
    if (storeId) {
      loadStoreData();
    }
  }, [storeId]);

  const handleLogout = () => {
    localStorage.removeItem('ml-express-user');
    setCurrentUser(null);
    navigate('/');
  };

  const loadStoreData = async () => {
    setLoading(true);
    try {
      const [storeData, productsData] = await Promise.all([
        deliveryStoreService.getStoreById(storeId!),
        merchantService.getStoreProducts(storeId!)
      ]);
      setStore(storeData);
      setProducts(productsData);
    } catch (error) {
      LoggerService.error('Failed to load store data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setItemQuantities(prev => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + delta)
    }));
  };

  const handleAddToCart = (product: Product) => {
    const qty = itemQuantities[product.id] || 0;
    if (qty > 0) {
      addToCart(product, qty);
      setItemQuantities(prev => ({ ...prev, [product.id]: 0 }));
      alert(t.addedToCart);
    }
  };

  // 🚀 首页同款背景渐变
  const homeBackground = 'linear-gradient(to right top, #b0d3e8, #a2c3d6, #93b4c5, #86a4b4, #7895a3, #6c90a3, #618ca3, #5587a4, #498ab6, #428cc9, #468dda, #558cea)';

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: homeBackground,
      backgroundAttachment: 'fixed'
    }}>
      <div style={{ 
        padding: '1rem 2rem 0',
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        paddingBottom: '3rem'
      }}>
        <NavigationBar 
          language={language}
          onLanguageChange={setLanguage}
          currentUser={currentUser}
          onLogout={handleLogout}
          onShowRegisterModal={(isLoginMode) => {
            navigate('/', { state: { showModal: true, isLoginMode } });
          }}
          translations={translations}
        />
        
        <div style={{ maxWidth: '1200px', margin: '2rem auto 0', color: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ flex: 1, minWidth: '300px' }}>
              <button 
                onClick={() => navigate('/mall')}
                style={{ 
                  background: 'rgba(255,255,255,0.2)', 
                  border: '1px solid rgba(255,255,255,0.3)', 
                  color: 'white', 
                  padding: '0.6rem 1.2rem', 
                  borderRadius: '12px', 
                  cursor: 'pointer',
                  marginBottom: '1.5rem',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>←</span> {t.back}
              </button>
              
              {store && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div style={{ 
                    width: '80px', 
                    height: '80px', 
                    background: 'white', 
                    borderRadius: '24px', 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    fontSize: '2.5rem',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
                  }}>
                    🏪
                  </div>
                  <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '900', textShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                      {store.store_name}
                    </h1>
                    <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem' }}>
                      <span style={{ background: '#fbbf24', color: '#92400e', padding: '0.2rem 0.8rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                        {store.store_type}
                      </span>
                      <span style={{ background: '#10b981', color: 'white', padding: '0.2rem 0.8rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                        ● Open
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={() => navigate('/cart')}
              style={{ 
                background: '#ffffff', 
                border: 'none', 
                color: '#1e40af', 
                padding: '1rem 2rem', 
                borderRadius: '20px', 
                cursor: 'pointer',
                fontWeight: '900',
                fontSize: '1.1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.8rem',
                boxShadow: '0 15px 30px rgba(0,0,0,0.15)',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <span style={{ fontSize: '1.5rem' }}>🛒</span> {t.cart} 
              <span style={{ 
                background: '#ef4444', 
                color: 'white', 
                padding: '0.2rem 0.6rem', 
                borderRadius: '50px', 
                fontSize: '0.9rem' 
              }}>{cartCount}</span>
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '-2rem auto 4rem', padding: '0 1rem', position: 'relative', zIndex: 20 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '8rem 0', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', borderRadius: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <div className="spinner" style={{ 
              width: '40px', 
              height: '40px', 
              border: '4px solid #f3f3f3', 
              borderTop: '4px solid #3b82f6', 
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }}></div>
            <p style={{ color: '#64748b', fontWeight: 'bold' }}>{t.loading}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', alignItems: 'start' }}>
            {/* 商品列表 */}
            <div>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                gap: '2rem' 
              }}>
                {products.map(product => {
                  const qty = itemQuantities[product.id] || 0;
                  return (
                    <div 
                      key={product.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: '30px',
                        overflow: 'hidden',
                        boxShadow: '0 10px 20px rgba(0,0,0,0.03)',
                        border: '1px solid rgba(255,255,255,0.8)',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-8px)';
                        e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.1)';
                        e.currentTarget.style.background = '#ffffff';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.03)';
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
                      }}
                    >
                      <div style={{ height: '240px', background: '#f8fafc', position: 'relative' }}>
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '4.5rem', background: '#eff6ff' }}>
                            📦
                          </div>
                        )}
                        <div style={{ 
                          position: 'absolute', 
                          bottom: '1.2rem', 
                          right: '1.2rem', 
                          background: 'rgba(255,255,255,0.95)', 
                          padding: '0.5rem 1rem', 
                          borderRadius: '12px',
                          fontSize: '0.85rem',
                          fontWeight: '900',
                          color: '#1e40af',
                          backdropFilter: 'blur(4px)',
                          boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                          border: '1px solid #e0e7ff'
                        }}>
                          {t.stock}: {product.stock === -1 ? t.infinite : product.stock}
                        </div>
                      </div>
                      
                      <div style={{ padding: '1.8rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ fontSize: '1.3rem', fontWeight: '900', color: '#0f172a', marginBottom: '0.6rem' }}>{product.name}</h3>
                        <p style={{ color: '#10b981', fontSize: '1.6rem', fontWeight: '900', marginBottom: '1.8rem' }}>{product.price.toLocaleString()} MMK</p>

                        <div style={{ marginTop: 'auto' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', marginBottom: '1.2rem', justifyContent: 'center', background: '#f1f5f9', padding: '0.6rem', borderRadius: '18px' }}>
                            <button 
                              onClick={() => updateQuantity(product.id, -1)}
                              style={{ width: '40px', height: '40px', borderRadius: '14px', border: 'none', background: 'white', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', fontSize: '1.4rem', fontWeight: 'bold', color: '#1e40af' }}
                            >-</button>
                            <span style={{ fontWeight: '900', minWidth: '35px', textAlign: 'center', fontSize: '1.4rem', color: '#0f172a' }}>{qty}</span>
                            <button 
                              onClick={() => updateQuantity(product.id, 1)}
                              style={{ width: '40px', height: '40px', borderRadius: '14px', border: 'none', background: 'white', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', fontSize: '1.4rem', fontWeight: 'bold', color: '#1e40af' }}
                            >+</button>
                          </div>
                          <button 
                            disabled={qty === 0}
                            onClick={() => handleAddToCart(product)}
                            style={{ 
                              width: '100%', 
                              padding: '1.2rem', 
                              borderRadius: '20px', 
                              border: 'none', 
                              background: qty > 0 ? 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)' : '#e2e8f0', 
                              color: 'white', 
                              fontWeight: '900', 
                              fontSize: '1.1rem',
                              cursor: qty > 0 ? 'pointer' : 'default',
                              boxShadow: qty > 0 ? '0 12px 24px rgba(30, 64, 175, 0.2)' : 'none',
                              transition: 'all 0.3s ease'
                            }}
                          >
                            {t.addToCart}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {products.length === 0 && (
                <div style={{ textAlign: 'center', padding: '10rem 0', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', borderRadius: '40px', border: '2px dashed rgba(255,255,255,0.3)' }}>
                  <div style={{ fontSize: '6rem', marginBottom: '1.5rem', opacity: 0.8 }}>🧺</div>
                  <h3 style={{ fontSize: '1.8rem', color: 'white', fontWeight: '900' }}>{t.noProducts}</h3>
                </div>
              )}
            </div>

            {/* 商家信息侧边栏 */}
            <div style={{ position: 'sticky', top: '2rem' }}>
              <div style={{ 
                background: 'rgba(255, 255, 255, 0.95)', 
                borderRadius: '30px', 
                padding: '2.5rem', 
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)', 
                border: '1px solid rgba(255,255,255,0.8)',
                backdropFilter: 'blur(10px)'
              }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#0f172a', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <span style={{ fontSize: '1.8rem' }}>ℹ️</span> {t.merchantInfo}
                </h2>
                {store && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
                    <div style={{ borderBottom: '1px solid rgba(30, 64, 175, 0.05)', paddingBottom: '1.5rem' }}>
                      <p style={{ color: '#1e40af', fontSize: '0.9rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '0.6rem', letterSpacing: '1px' }}>{t.address}</p>
                      <p style={{ color: '#334155', fontSize: '1rem', lineHeight: '1.6', fontWeight: '500' }}>{store.address}</p>
                    </div>
                    <div style={{ borderBottom: '1px solid rgba(30, 64, 175, 0.05)', paddingBottom: '1.5rem' }}>
                      <p style={{ color: '#1e40af', fontSize: '0.9rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '0.6rem', letterSpacing: '1px' }}>{t.contact}</p>
                      <p style={{ color: '#0f172a', fontSize: '1.3rem', fontWeight: '900' }}>{store.phone}</p>
                    </div>
                    <div>
                      <p style={{ color: '#1e40af', fontSize: '0.9rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '0.6rem', letterSpacing: '1px' }}>{t.hours}</p>
                      <p style={{ color: '#334155', fontSize: '1.1rem', fontWeight: '700' }}>{store.operating_hours || '09:00 - 21:00'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default StoreProductsPage;
