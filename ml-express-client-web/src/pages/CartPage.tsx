import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useLanguage } from '../contexts/LanguageContext';
import NavigationBar from '../components/home/NavigationBar';

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { cartItems, updateQuantity, removeFromCart, cartTotal, clearCart } = useCart();
  const { language, setLanguage, t: translations } = useLanguage();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('ml-express-user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Failed to load user info:', error);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('ml-express-user');
    setCurrentUser(null);
    navigate('/');
  };

  const t = {
    zh: {
      title: '我的购物车',
      empty: '您的购物车是空的',
      backToMall: '返回商场',
      total: '订单总计',
      checkout: '立即结算下单',
      clear: '清空全部',
      price: '单价',
      quantity: '数量',
      items: '件商品'
    },
    en: {
      title: 'My Cart',
      empty: 'Your cart is empty',
      backToMall: 'Back to Mall',
      total: 'Order Total',
      checkout: 'Checkout Now',
      clear: 'Clear All',
      price: 'Price',
      quantity: 'Qty',
      items: 'Items'
    },
    my: {
      title: 'ကျွန်ုပ်၏ခြင်း',
      empty: 'ခြင်းထဲတွင် ပစ္စည်းမရှိသေးပါ',
      backToMall: 'ဈေးသို့ပြန်သွားရန်',
      total: 'စုစုပေါင်း',
      checkout: 'အခုပဲဝယ်မည်',
      clear: 'အားလုံးဖျက်ရန်',
      price: 'စျေးနှုန်း',
      quantity: 'အရေအတွက်',
      items: 'ခု'
    }
  }[language as 'zh' | 'en' | 'my'] || {
    title: 'Shopping Cart',
    empty: 'Your cart is empty',
    backToMall: 'Back to Mall',
    total: 'Total',
    checkout: 'Place Order',
    clear: 'Clear Cart',
    price: 'Price',
    quantity: 'Quantity',
    items: 'Items'
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
          translations={translations}
        />
        
        <div style={{ maxWidth: '1000px', margin: '2rem auto 0', color: 'white', textAlign: 'center' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: '900', textShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>{t.title}</h1>
          <p style={{ fontSize: '1.1rem', opacity: 0.9, fontWeight: '600' }}>
            {cartItems.length} {t.items}
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
            <h2 style={{ color: '#1e293b', fontSize: '2rem', marginBottom: '1rem', fontWeight: '900' }}>{t.empty}</h2>
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
              🚀 {t.backToMall}
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2.5rem', alignItems: 'start' }}>
            {/* 商品列表 */}
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.95)', 
              borderRadius: '35px', 
              padding: '2.5rem', 
              boxShadow: '0 20px 40px rgba(0,0,0,0.05)',
              border: '1px solid white',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '2px solid #f1f5f9', paddingBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '900', color: '#0f172a' }}>商品清单</h2>
                <button 
                  onClick={clearCart}
                  style={{ background: '#fee2e2', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '800', padding: '0.6rem 1.2rem', borderRadius: '12px', transition: 'all 0.2s ease' }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#fecaca'}
                  onMouseOut={(e) => e.currentTarget.style.background = '#fee2e2'}
                >
                  🗑️ {t.clear}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {cartItems.map(item => (
                  <div 
                    key={item.id}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      padding: '1.5rem', 
                      background: 'white',
                      borderRadius: '24px',
                      border: '1px solid #f1f5f9',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{ width: '100px', height: '100px', borderRadius: '18px', background: '#f8fafc', overflow: 'hidden', marginRight: '1.8rem', border: '1px solid #f1f5f9' }}>
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '3rem', background: '#eff6ff' }}>📦</div>
                      )}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontWeight: '900', fontSize: '1.25rem', marginBottom: '0.6rem', color: '#0f172a' }}>{item.name}</h3>
                      <p style={{ color: '#10b981', fontSize: '1.1rem', fontWeight: '800' }}>{item.price.toLocaleString()} MMK</p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: '18px', padding: '0.4rem' }}>
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          style={{ width: '32px', height: '32px', borderRadius: '12px', border: 'none', background: 'white', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', fontWeight: 'bold', color: '#1e40af' }}
                        >-</button>
                        <span style={{ margin: '0 1.2rem', fontWeight: '900', width: '25px', textAlign: 'center', fontSize: '1.1rem', color: '#0f172a' }}>{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          style={{ width: '32px', height: '32px', borderRadius: '12px', border: 'none', background: 'white', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', fontWeight: 'bold', color: '#1e40af' }}
                        >+</button>
                      </div>
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.8rem', transition: 'all 0.2s ease', padding: '0.5rem' }}
                        onMouseOver={(e) => e.currentTarget.style.color = '#ef4444'}
                        onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
                      >×</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 结算卡片 */}
            <div style={{ height: 'fit-content', position: 'sticky', top: '2rem' }}>
              <div style={{ 
                background: 'rgba(255, 255, 255, 0.95)', 
                borderRadius: '35px', 
                padding: '2.5rem', 
                boxShadow: '0 25px 50px rgba(0,0,0,0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid white'
              }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '2rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <span style={{ fontSize: '1.8rem' }}>📋</span> 结算详情
                </h2>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginBottom: '2.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', color: '#64748b', fontWeight: '600' }}>
                    <span>商品总数</span>
                    <span>{cartItems.length} 件</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5rem 0', borderTop: '2px dashed #e2e8f0', borderBottom: '2px dashed #e2e8f0' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: '900', color: '#0f172a' }}>{t.total}</span>
                    <span style={{ fontWeight: '900', color: '#10b981', fontSize: '1.8rem' }}>{cartTotal.toLocaleString()} MMK</span>
                  </div>
                </div>

                <button 
                  onClick={handleCheckout}
                  style={{ 
                    width: '100%', 
                    padding: '1.5rem', 
                    borderRadius: '24px', 
                    border: 'none', 
                    background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)', 
                    color: 'white', 
                    fontWeight: '900', 
                    fontSize: '1.25rem',
                    cursor: 'pointer',
                    boxShadow: '0 15px 30px rgba(37, 99, 235, 0.3)',
                    transition: 'all 0.3s ease',
                    marginBottom: '1.2rem'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  🚀 {t.checkout}
                </button>
                
                <button 
                  onClick={() => navigate('/mall')}
                  style={{ 
                    width: '100%', 
                    padding: '1.2rem', 
                    borderRadius: '20px', 
                    border: '2px solid #e2e8f0', 
                    background: 'white', 
                    color: '#475569', 
                    fontWeight: '800',
                    cursor: 'pointer',
                    fontSize: '1rem',
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
                  🏪 {t.backToMall}
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
