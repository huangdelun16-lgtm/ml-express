import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useLanguage } from '../contexts/LanguageContext';
import NavigationBar from '../components/home/NavigationBar';

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { cartItems, updateQuantity, removeFromCart, cartTotal, clearCart } = useCart();
  const { language, setLanguage, t } = useLanguage();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('ml-express-customer');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Failed to load user info:', error);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('ml-express-customer');
    setCurrentUser(null);
    navigate('/');
  };

  const handleCheckout = () => {
    navigate('/', { state: { selectedProducts: cartItems } });
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
        paddingBottom: '2rem'
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
        
        <div style={{ maxWidth: '1000px', margin: '2rem auto 0', color: 'white', textAlign: 'center' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: '900', textShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>{t.cart.title}</h1>
          <p style={{ fontSize: '1.1rem', opacity: 0.9, fontWeight: '600' }}>
            {cartItems.length} {t.cart.items}
          </p>
        </div>
      </div>
      
      <div style={{ maxWidth: '1100px', margin: '3rem auto 6rem', padding: '0 1rem', position: 'relative', zIndex: 20 }}>
        {cartItems.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '8rem 2rem', 
            background: 'rgba(255, 255, 255, 0.95)', 
            borderRadius: '40px', 
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid white'
          }}>
            <div style={{ fontSize: '7rem', marginBottom: '2rem' }}>🛒</div>
            <h2 style={{ color: '#1e293b', fontSize: '2rem', marginBottom: '1rem', fontWeight: '900' }}>{t.cart.empty}</h2>
            <p style={{ color: '#64748b', fontSize: '1.2rem', marginBottom: '3rem', fontWeight: '500' }}>快去商场选购您喜欢的商品吧！</p>
            <button 
              onClick={() => navigate('/mall')}
              style={{ 
                background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)', 
                color: 'white', 
                border: 'none', 
                padding: '1.2rem 3rem', 
                borderRadius: '20px', 
                fontSize: '1.2rem', 
                fontWeight: '900', 
                cursor: 'pointer',
                boxShadow: '0 15px 30px rgba(37, 99, 235, 0.3)',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              🚀 {t.cart.backToMall}
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 1024 ? '1fr' : '1fr 320px', gap: '1.5rem', alignItems: 'start' }}>
            {/* 商品列表 */}
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.95)', 
              borderRadius: '28px', 
              padding: '1.5rem', 
              boxShadow: '0 20px 40px rgba(0,0,0,0.05)',
              border: '1px solid white',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#0f172a' }}>商品清单</h2>
                <button 
                  onClick={clearCart}
                  style={{ background: '#fee2e2', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '800', padding: '0.5rem 1rem', borderRadius: '10px', transition: 'all 0.2s ease' }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#fecaca'}
                  onMouseOut={(e) => e.currentTarget.style.background = '#fee2e2'}
                >
                  🗑️ {t.cart.clear}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {cartItems.map((item: any) => (
                  <div 
                    key={item.id}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      padding: '0.8rem', 
                      background: 'white',
                      borderRadius: '18px',
                      border: '1px solid #f1f5f9',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div
                      onClick={() => item.store_id && navigate(`/mall/${item.store_id}?openDetail=${item.id}`)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        flex: 1,
                        cursor: item.store_id ? 'pointer' : 'default',
                        minWidth: 0,
                      }}
                      title={t.cart.openDetailHint}
                    >
                      <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: '#f8fafc', overflow: 'hidden', marginRight: '1rem', border: '1px solid #f1f5f9', flexShrink: 0 }}>
                        {item.image_url && !item.image_url.startsWith('file://') ? (
                          <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.8rem', background: '#eff6ff' }}>📦</div>
                        )}
                      </div>
                      
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ fontWeight: '900', fontSize: '1rem', marginBottom: '0.2rem', color: '#0f172a' }}>{item.name}</h3>
                        <p style={{ color: '#10b981', fontSize: '0.9rem', fontWeight: '800' }}>{item.price.toLocaleString()} MMK</p>
                        {item.customer_remark ? (
                          <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '0.35rem 0 0', fontWeight: 600, lineHeight: 1.4 }}>
                            {t.cart.remark}：{item.customer_remark}
                          </p>
                        ) : null}
                        {item.store_id ? (
                          <p style={{ color: '#3b82f6', fontSize: '0.75rem', margin: '0.35rem 0 0', fontWeight: 700 }}>{t.cart.openDetailHint} →</p>
                        ) : null}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: '12px', padding: '0.2rem' }}>
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, item.quantity - 1); }}
                          style={{ width: '24px', height: '24px', borderRadius: '8px', border: 'none', background: 'white', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', fontWeight: 'bold', color: '#1e40af', fontSize: '0.9rem' }}
                        >-</button>
                        <span style={{ margin: '0 0.6rem', fontWeight: '900', width: '18px', textAlign: 'center', fontSize: '0.9rem', color: '#0f172a' }}>{item.quantity}</span>
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, item.quantity + 1); }}
                          style={{ width: '24px', height: '24px', borderRadius: '8px', border: 'none', background: 'white', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', fontWeight: 'bold', color: '#1e40af', fontSize: '0.9rem' }}
                        >+</button>
                      </div>
                      <button 
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeFromCart(item.id); }}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem', transition: 'all 0.2s ease', padding: '0.3rem' }}
                        onMouseOver={(e) => e.currentTarget.style.color = '#ef4444'}
                        onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
                      >×</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 结算卡片 */}
            <div style={{ height: 'fit-content', position: window.innerWidth < 1024 ? 'static' : 'sticky', top: '2rem' }}>
              <div style={{ 
                background: 'rgba(255, 255, 255, 0.95)', 
                borderRadius: '28px', 
                padding: '1.8rem', 
                boxShadow: '0 25px 50px rgba(0,0,0,0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid white'
              }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '900', marginBottom: '1.5rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>📋</span> 结算详情
                </h2>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', color: '#64748b', fontWeight: '600' }}>
                    <span>商品总数</span>
                    <span>{cartItems.length} 件</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', borderTop: '2px dashed #e2e8f0', borderBottom: '2px dashed #e2e8f0' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: '900', color: '#0f172a' }}>{t.cart.total}</span>
                    <span style={{ fontWeight: '900', color: '#10b981', fontSize: '1.5rem' }}>{cartTotal.toLocaleString()} MMK</span>
                  </div>
                </div>

                <button 
                  onClick={handleCheckout}
                  style={{ 
                    width: '100%', 
                    padding: '1.2rem', 
                    borderRadius: '18px', 
                    border: 'none', 
                    background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)', 
                    color: 'white', 
                    fontWeight: '900', 
                    fontSize: '1.1rem',
                    cursor: 'pointer',
                    boxShadow: '0 12px 24px rgba(37, 99, 235, 0.3)',
                    transition: 'all 0.3s ease',
                    marginBottom: '1rem'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  🚀 {t.cart.checkout}
                </button>
                
                <button 
                  onClick={() => navigate('/mall')}
                  style={{ 
                    width: '100%', 
                    padding: '1rem', 
                    borderRadius: '16px', 
                    border: '2px solid #e2e8f0', 
                    background: 'white', 
                    color: '#475569', 
                    fontWeight: '800',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  🏪 {t.cart.backToMall}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        ::-webkit-scrollbar {
          height: 8px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 10px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
      `}</style>
    </div>
  );
};

export default CartPage;
