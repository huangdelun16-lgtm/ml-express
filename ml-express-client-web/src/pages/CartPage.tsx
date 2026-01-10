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
      title: '购物车',
      empty: '您的购物车是空的',
      backToMall: '返回商场',
      total: '总计',
      checkout: '立即下单',
      clear: '清空购物车',
      price: '单价',
      quantity: '数量'
    },
    en: {
      title: 'Shopping Cart',
      empty: 'Your cart is empty',
      backToMall: 'Back to Mall',
      total: 'Total',
      checkout: 'Place Order',
      clear: 'Clear Cart',
      price: 'Price',
      quantity: 'Quantity'
    },
    my: {
      title: 'ခြင်းထဲရှိပစ္စည်းများ',
      empty: 'ခြင်းထဲတွင် ပစ္စည်းမရှိသေးပါ',
      backToMall: 'ဈေးသို့ပြန်သွားရန်',
      total: 'စုစုပေါင်း',
      checkout: 'ယခုဝယ်မည်',
      clear: 'ခြင်းထဲမှပစ္စည်းများဖျက်ရန်',
      price: 'စျေးနှုန်း',
      quantity: 'အရေအတွက်'
    }
  }[language as 'zh' | 'en' | 'my'] || {
    title: 'Shopping Cart',
    empty: 'Your cart is empty',
    backToMall: 'Back to Mall',
    total: 'Total',
    checkout: 'Place Order',
    clear: 'Clear Cart',
    price: 'Price',
    quantity: 'Quantity'
  };

  const handleCheckout = () => {
    // 导航到首页并传递选中的商品
    navigate('/', { state: { selectedProducts: cartItems } });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <div style={{ padding: '1rem 2rem 0' }}>
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
      </div>
      
      <div style={{ maxWidth: '1000px', margin: '3rem auto', padding: '0 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b' }}>{t.title}</h1>
          {cartItems.length > 0 && (
            <button 
              onClick={clearCart}
              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.9rem' }}
            >
              🗑️ {t.clear}
            </button>
          )}
        </div>

        {cartItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem', background: 'white', borderRadius: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '5rem', marginBottom: '1.5rem' }}>🛒</div>
            <p style={{ color: '#64748b', fontSize: '1.2rem', marginBottom: '2rem' }}>{t.empty}</p>
            <button 
              onClick={() => navigate('/mall')}
              style={{ 
                background: '#3b82f6', 
                color: 'white', 
                border: 'none', 
                padding: '1rem 2rem', 
                borderRadius: '50px', 
                fontSize: '1.1rem', 
                fontWeight: 'bold', 
                cursor: 'pointer' 
              }}
            >
              {t.backToMall}
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
            {/* 商品列表 */}
            <div style={{ background: 'white', borderRadius: '24px', padding: '1.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              {cartItems.map(item => (
                <div 
                  key={item.id}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '1.5rem 0', 
                    borderBottom: '1px solid #f1f5f9'
                  }}
                >
                  <div style={{ width: '80px', height: '80px', borderRadius: '12px', background: '#f8fafc', overflow: 'hidden', marginRight: '1.5rem' }}>
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '2rem' }}>📦</div>
                    )}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '0.4rem' }}>{item.name}</h3>
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>{t.price}: {item.price.toLocaleString()} MMK</p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', borderRadius: '50px', padding: '0.2rem' }}>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        style={{ width: '28px', height: '28px', borderRadius: '50%', border: 'none', background: 'white', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                      >-</button>
                      <span style={{ margin: '0 1rem', fontWeight: 'bold', width: '20px', textAlign: 'center' }}>{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        style={{ width: '28px', height: '28px', borderRadius: '50%', border: 'none', background: 'white', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                      >+</button>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}
                    >×</button>
                  </div>
                </div>
              ))}
            </div>

            {/* 结算卡片 */}
            <div style={{ height: 'fit-content', position: 'sticky', top: '100px' }}>
              <div style={{ background: 'white', borderRadius: '24px', padding: '2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>{t.total}</h2>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', fontSize: '1.1rem' }}>
                  <span style={{ color: '#64748b' }}>{t.total}</span>
                  <span style={{ fontWeight: '900', color: '#10b981' }}>{cartTotal.toLocaleString()} MMK</span>
                </div>
                <button 
                  onClick={handleCheckout}
                  style={{ 
                    width: '100%', 
                    padding: '1.2rem', 
                    borderRadius: '16px', 
                    border: 'none', 
                    background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', 
                    color: 'white', 
                    fontWeight: 'bold', 
                    fontSize: '1.1rem',
                    cursor: 'pointer',
                    boxShadow: '0 10px 20px rgba(37, 99, 235, 0.2)'
                  }}
                >
                  {t.checkout}
                </button>
                <button 
                  onClick={() => navigate('/mall')}
                  style={{ 
                    width: '100%', 
                    padding: '1rem', 
                    marginTop: '1rem',
                    borderRadius: '16px', 
                    border: '1px solid #e2e8f0', 
                    background: 'white', 
                    color: '#64748b', 
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {t.backToMall}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
