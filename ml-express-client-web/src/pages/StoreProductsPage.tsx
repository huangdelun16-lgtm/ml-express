import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { merchantService, deliveryStoreService, Product, DeliveryStore } from '../services/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart } from '../contexts/CartContext';
import NavigationBar from '../components/home/NavigationBar';
import LoggerService from '../services/LoggerService';

const StoreProductsPage: React.FC = () => {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const location = useLocation(); // 🚀 新增
  const { language, setLanguage, t } = useLanguage();
  const { addToCart, cartCount } = useCart();
  
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<DeliveryStore | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const productRefs = useRef<Record<string, HTMLDivElement | null>>({}); // 🚀 新增用于滚动定位

  const loadStoreData = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const [storeData, productsData] = await Promise.all([
        deliveryStoreService.getStoreById(storeId),
        merchantService.getPublicStoreProducts(storeId)
      ]);
      setStore(storeData);
      setProducts(productsData);

      const params = new URLSearchParams(location.search);
      const highlightId = params.get('highlight');
      if (highlightId) {
        setItemQuantities(prev => ({ ...prev, [highlightId]: 1 }));
        setTimeout(() => {
          productRefs.current[highlightId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 500);
      }
    } catch (error) {
      LoggerService.error('Failed to load store data:', error);
    } finally {
      setLoading(false);
    }
  }, [storeId, location.search]);

  useEffect(() => {
    const savedUser = localStorage.getItem('ml-express-customer');
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
  }, [storeId, loadStoreData]);

  const handleLogout = () => {
    localStorage.removeItem('ml-express-customer');
    setCurrentUser(null);
    navigate('/');
  };

  const updateQuantity = (id: string, delta: number) => {
    setItemQuantities(prev => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + delta)
    }));
  };

  const handleAddToCart = (product: Product) => {
    // 🚀 优化：必须登录才能加入购物车
    if (!currentUser) {
      alert(language === 'zh' ? '请先登录后再加入购物车' : language === 'en' ? 'Please login first to add items' : 'ခြင်းထဲသို့ထည့်ရန် အရင်ဝင်ပါ');
      return;
    }

    const status = checkStoreOpenStatus();
    if (!status.isOpen) {
      alert(language === 'zh' ? '该商户目前已打烊，无法下单' : 'Merchant is currently closed');
      return;
    }
    const qty = itemQuantities[product.id] || 0;
    if (qty > 0) {
      addToCart(product, qty);
      setItemQuantities(prev => ({ ...prev, [product.id]: 0 }));
      alert(t.store.addedToCart);
    }
  };

  // 🚀 新增：判断店铺是否正在营业
  const checkStoreOpenStatus = () => {
    if (!store) return { isOpen: true }; // 加载中默认允许
    if (store.is_closed_today) return { isOpen: false, reason: 'closed_today' };
    
    // 🚀 检查预设休假计划
    if (store.vacation_dates && Array.isArray(store.vacation_dates)) {
      const today = new Date().toISOString().split('T')[0];
      if (store.vacation_dates.includes(today)) {
        return { isOpen: false, reason: 'vacation' };
      }
    }
    
    try {
      const hours = store.operating_hours || '09:00 - 21:00';
      const [start, end] = hours.split(' - ');
      
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      
      const [startHour, startMin] = start.split(':').map(Number);
      const [endHour, endMin] = end.split(':').map(Number);
      
      const startTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;
      
      // 🚀 24小时算法优化：处理跨子夜的营业时间（如 22:00 - 02:00）
      if (startTime <= endTime) {
        // 普通情况：09:00 - 21:00
      if (currentTime >= startTime && currentTime <= endTime) {
        return { isOpen: true, reason: 'open' };
        }
      } else {
        // 跨子夜情况：22:00 - 02:00
        if (currentTime >= startTime || currentTime <= endTime) {
          return { isOpen: true, reason: 'open' };
        }
      }
      return { isOpen: false, reason: 'outside_hours' };
    } catch (e) {
      return { isOpen: true }; // 出错默认营业
    }
  };

  // 🚀 新增：批量加入购物车
  const handleBulkAddToCart = () => {
    // 🚀 优化：必须登录才能加入购物车
    if (!currentUser) {
      alert(language === 'zh' ? '请先登录后再加入购物车' : language === 'en' ? 'Please login first to add items' : 'ခြင်းထဲသို့ထည့်ရန် အရင်ဝင်ပါ');
      return;
    }

    const status = checkStoreOpenStatus();
    if (!status.isOpen) {
      alert(language === 'zh' ? '该商户目前已打烊，无法下单' : 'Merchant is currently closed');
      return;
    }

    const selectedItems = products.filter(p => (itemQuantities[p.id] || 0) > 0);
    if (selectedItems.length === 0) {
      alert(language === 'zh' ? '请先选择商品数量' : language === 'en' ? 'Please select quantity first' : 'အရေအတွက် အရင်ရွေးချယ်ပါ');
      return;
    }

    selectedItems.forEach(product => {
      addToCart(product, itemQuantities[product.id]);
    });

    setItemQuantities({});
    alert(t.store.addedToCart);
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
                <span style={{ fontSize: '1.2rem' }}>←</span> {t.store.back}
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
                        {(() => {
                          const type = store.store_type;
                          const mapping: any = {
                            'restaurant': { zh: '餐厅', en: 'Dining', my: 'စားသောက်ဆိုင်' },
                            'drinks_snacks': { zh: '饮料小吃', en: 'Snacks', my: 'မုန့်မျိုးစုံ' },
                            'breakfast': { zh: '早点铺', en: 'Breakfast', my: 'မနက်စာဆိုင်' },
                            'cake_shop': { zh: '蛋糕店', en: 'Cake Shop', my: 'ကိတ်မုန့်ဆိုင်' },
                            'tea_shop': { zh: '茶铺', en: 'Tea', my: 'လက်ဖက်ရည်ဆိုင်' },
                            'flower_shop': { zh: '鲜花店', en: 'Flowers', my: 'ပန်းဆိုင်' },
                            'clothing_store': { zh: '服装店', en: 'Clothing', my: 'အဝတ်အထည်ဆိုင်' },
                            'grocery': { zh: '杂货店', en: 'Grocery', my: 'ကုန်စုံဆိုင်' },
                            'hardware_store': { zh: '五金店', en: 'Hardware', my: 'ဟာ့ဒ်ဝဲလ်ဆိုင်' },
                            'supermarket': { zh: '超市', en: 'Supermarket', my: 'စူပါမားကတ်' },
                            'transit_station': { zh: '中转站', en: 'Hub', my: 'အချက်အချာဌာန' },
                            'other': { zh: '其它', en: 'Other', my: 'အခြား' }
                          };
                          return mapping[type]?.[language] || mapping[type]?.zh || type;
                        })()}
                      </span>
                      {(() => {
                        const status = checkStoreOpenStatus();
                        return (
                          <span style={{ 
                            background: status.isOpen ? '#10b981' : '#ef4444', 
                            color: 'white', 
                            padding: '0.2rem 0.8rem', 
                            borderRadius: '8px', 
                            fontSize: '0.8rem', 
                            fontWeight: 'bold' 
                          }}>
                            ● {status.isOpen ? t.store.openNow : (status.reason === 'closed_today' ? t.store.closedToday : (status.reason === 'vacation' ? (language === 'zh' ? '预设休假中' : 'On Vacation') : t.store.closedNow))}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <button 
                onClick={handleBulkAddToCart}
                style={{ 
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
                  border: 'none', 
                  color: 'white', 
                  padding: '1rem 2rem', 
                  borderRadius: '20px', 
                  cursor: 'pointer',
                  fontWeight: '900',
                  fontSize: '1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.8rem',
                  boxShadow: '0 15px 30px rgba(16, 185, 129, 0.3)',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <span style={{ fontSize: '1.5rem' }}>➕</span> {t.store.addToCart}
              </button>

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
                <span style={{ fontSize: '1.5rem' }}>🛒</span> {t.store.cart} 
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
            <p style={{ color: '#64748b', fontWeight: 'bold' }}>{t.store.loading}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', alignItems: 'start' }}>
            {/* 商品列表 */}
            <div>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
                gap: '1.5rem' 
              }}>
                {products.map((product: any) => {
                  const qty = itemQuantities[product.id] || 0;
                  const isHighlighted = new URLSearchParams(location.search).get('highlight') === product.id;
                  return (
                    <div 
                      key={product.id}
                      ref={el => productRefs.current[product.id] = el}
                      style={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: '24px',
                        overflow: 'hidden',
                        boxShadow: isHighlighted ? '0 0 0 3px #3b82f6, 0 15px 30px rgba(59, 130, 246, 0.2)' : '0 8px 16px rgba(0,0,0,0.03)',
                        border: '1px solid rgba(255,255,255,0.8)',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'all 0.3s ease',
                        transform: isHighlighted ? 'scale(1.02)' : 'none'
                      }}
                      onMouseOver={(e) => {
                        if (!isHighlighted) {
                          e.currentTarget.style.transform = 'translateY(-6px)';
                          e.currentTarget.style.boxShadow = '0 15px 30px rgba(0,0,0,0.08)';
                          e.currentTarget.style.background = '#ffffff';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (!isHighlighted) {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.03)';
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
                        }
                      }}
                    >
                      <div style={{ height: '180px', background: '#f8fafc', position: 'relative' }}>
                        {product.image_url && !product.image_url.startsWith('file://') ? (
                          <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '3rem', background: '#eff6ff' }}>
                            📦
                          </div>
                        )}
                        <div style={{ 
                          position: 'absolute', 
                          bottom: '0.8rem', 
                          right: '0.8rem', 
                          background: 'rgba(255,255,255,0.9)', 
                          padding: '0.4rem 0.8rem', 
                          borderRadius: '10px',
                          fontSize: '0.75rem',
                          fontWeight: '900',
                          color: '#1e40af',
                          backdropFilter: 'blur(4px)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          border: '1px solid #e0e7ff'
                        }}>
                          {t.store.stock}: {product.stock === -1 ? t.store.infinite : product.stock}
                        </div>
                      </div>
                      
                      <div style={{ padding: '1.2rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#0f172a', marginBottom: '0.4rem' }}>{product.name}</h3>
                        <p style={{ color: '#10b981', fontSize: '1.3rem', fontWeight: '900', marginBottom: '1.2rem' }}>{product.price.toLocaleString()} MMK</p>

                        <div style={{ marginTop: 'auto' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.2rem', justifyContent: 'center', background: '#f1f5f9', padding: '0.4rem', borderRadius: '14px' }}>
                            <button 
                              onClick={() => updateQuantity(product.id, -1)}
                              style={{ width: '32px', height: '32px', borderRadius: '10px', border: 'none', background: 'white', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', fontSize: '1.2rem', fontWeight: 'bold', color: '#1e40af' }}
                            >-</button>
                            <span style={{ fontWeight: '900', minWidth: '25px', textAlign: 'center', fontSize: '1.1rem', color: '#0f172a' }}>{qty}</span>
                            <button 
                              onClick={() => updateQuantity(product.id, 1)}
                              style={{ width: '32px', height: '32px', borderRadius: '10px', border: 'none', background: 'white', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', fontSize: '1.2rem', fontWeight: 'bold', color: '#1e40af' }}
                            >+</button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddToCart(product)}
                            style={{
                              marginTop: '0.6rem',
                              width: '100%',
                              padding: '0.55rem',
                              borderRadius: '12px',
                              border: 'none',
                              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                              color: 'white',
                              fontWeight: 800,
                              fontSize: '0.85rem',
                              cursor: 'pointer'
                            }}
                          >
                            {t.store.addToCart}
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
                  <h3 style={{ fontSize: '1.8rem', color: 'white', fontWeight: '900' }}>{t.store.noProducts}</h3>
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
                  <span style={{ fontSize: '1.8rem' }}>ℹ️</span> {t.store.merchantInfo}
                </h2>
                {store && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
                    <div style={{ borderBottom: '1px solid rgba(30, 64, 175, 0.05)', paddingBottom: '1.5rem' }}>
                      <p style={{ color: '#1e40af', fontSize: '0.9rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '0.6rem', letterSpacing: '1px' }}>{t.store.address}</p>
                      <p style={{ color: '#334155', fontSize: '1rem', lineHeight: '1.6', fontWeight: '500' }}>{store.address}</p>
                    </div>
                    <div style={{ borderBottom: '1px solid rgba(30, 64, 175, 0.05)', paddingBottom: '1.5rem' }}>
                      <p style={{ color: '#1e40af', fontSize: '0.9rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '0.6rem', letterSpacing: '1px' }}>{t.store.contact}</p>
                      <p style={{ color: '#0f172a', fontSize: '1.3rem', fontWeight: '900' }}>{store.phone}</p>
                    </div>
                    <div>
                      <p style={{ color: '#1e40af', fontSize: '0.9rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '0.6rem', letterSpacing: '1px' }}>{t.store.hours}</p>
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
