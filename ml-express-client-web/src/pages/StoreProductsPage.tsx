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

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <div style={{ 
        padding: '1rem 2rem 0',
        background: 'linear-gradient(to bottom, #1e3a8a 0%, #1e40af 100%)',
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
                  background: 'rgba(255,255,255,0.15)', 
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
          <div style={{ textAlign: 'center', padding: '8rem 0', background: 'white', borderRadius: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <div className="spinner" style={{ 
              width: '40px', 
              height: '40px', 
              border: '4px solid #f3f3f3', 
              borderTop: '4px solid #3b82f6', 
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }}></div>
            <p style={{ color: '#64748b' }}>{t.loading}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '2rem', alignItems: 'start' }}>
            {/* 商品列表 */}
            <div>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', 
                gap: '1.5rem' 
              }}>
                {products.map(product => {
                  const qty = itemQuantities[product.id] || 0;
                  return (
                    <div 
                      key={product.id}
                      style={{
                        background: 'white',
                        borderRadius: '24px',
                        overflow: 'hidden',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
                        border: '1px solid #f1f5f9',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.boxShadow = '0 15px 30px rgba(0,0,0,0.08)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.03)';
                      }}
                    >
                      <div style={{ height: '220px', background: '#f8fafc', position: 'relative' }}>
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '4rem', background: '#eff6ff' }}>
                            📦
                          </div>
                        )}
                        <div style={{ 
                          position: 'absolute', 
                          bottom: '1rem', 
                          right: '1rem', 
                          background: 'rgba(255,255,255,0.9)', 
                          padding: '0.4rem 0.8rem', 
                          borderRadius: '10px',
                          fontSize: '0.8rem',
                          fontWeight: 'bold',
                          color: '#64748b',
                          backdropFilter: 'blur(4px)',
                          boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                        }}>
                          {t.stock}: {product.stock === -1 ? t.infinite : product.stock}
                        </div>
                      </div>
                      
                      <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e293b', marginBottom: '0.5rem' }}>{product.name}</h3>
                        <p style={{ color: '#10b981', fontSize: '1.4rem', fontWeight: '900', marginBottom: '1.5rem' }}>{product.price.toLocaleString()} MMK</p>

                        <div style={{ marginTop: 'auto' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', justifyContent: 'center', background: '#f8fafc', padding: '0.5rem', borderRadius: '15px' }}>
                            <button 
                              onClick={() => updateQuantity(product.id, -1)}
                              style={{ width: '36px', height: '36px', borderRadius: '12px', border: 'none', background: 'white', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', fontSize: '1.2rem', fontWeight: 'bold' }}
                            >-</button>
                            <span style={{ fontWeight: '900', minWidth: '30px', textAlign: 'center', fontSize: '1.2rem', color: '#1e293b' }}>{qty}</span>
                            <button 
                              onClick={() => updateQuantity(product.id, 1)}
                              style={{ width: '36px', height: '36px', borderRadius: '12px', border: 'none', background: 'white', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', fontSize: '1.2rem', fontWeight: 'bold' }}
                            >+</button>
                          </div>
                          <button 
                            disabled={qty === 0}
                            onClick={() => handleAddToCart(product)}
                            style={{ 
                              width: '100%', 
                              padding: '1rem', 
                              borderRadius: '16px', 
                              border: 'none', 
                              background: qty > 0 ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : '#e2e8f0', 
                              color: 'white', 
                              fontWeight: 'bold', 
                              fontSize: '1rem',
                              cursor: qty > 0 ? 'pointer' : 'default',
                              boxShadow: qty > 0 ? '0 10px 20px rgba(37, 99, 235, 0.2)' : 'none',
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
                <div style={{ textAlign: 'center', padding: '8rem 0', background: 'white', borderRadius: '32px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                  <div style={{ fontSize: '5rem', marginBottom: '1.5rem' }}>🧺</div>
                  <h3 style={{ fontSize: '1.5rem', color: '#64748b', fontWeight: 'bold' }}>{t.noProducts}</h3>
                </div>
              )}
            </div>

            {/* 商家信息侧边栏 */}
            <div style={{ position: 'sticky', top: '2rem' }}>
              <div style={{ background: 'white', borderRadius: '24px', padding: '1.8rem', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: '900', color: '#1e293b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>ℹ️</span> {t.merchantInfo}
                </h2>
                {store && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                      <p style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.4rem' }}>{t.address}</p>
                      <p style={{ color: '#1e293b', fontSize: '0.95rem', lineHeight: '1.5' }}>{store.address}</p>
                    </div>
                    <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                      <p style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.4rem' }}>{t.contact}</p>
                      <p style={{ color: '#1e293b', fontSize: '1.1rem', fontWeight: 'bold' }}>{store.phone}</p>
                    </div>
                    <div>
                      <p style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.4rem' }}>{t.hours}</p>
                      <p style={{ color: '#1e293b', fontSize: '0.95rem' }}>{store.operating_hours || '09:00 - 21:00'}</p>
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
