import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart, getCartItemLineKey } from '../contexts/CartContext';
import { useLanguage } from '../contexts/LanguageContext';
import NavigationBar from '../components/home/NavigationBar';
import ClientInteriorShell from '../components/layout/ClientInteriorShell';
import StorageImg from '../components/StorageImg';

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

  return (
    <ClientInteriorShell ambient="cart">
      <NavigationBar
        variant="landing"
        language={language}
        onLanguageChange={setLanguage}
        currentUser={currentUser}
        onLogout={handleLogout}
        onShowRegisterModal={(isLoginMode) => {
          navigate('/', { state: { showModal: true, isLoginMode } });
        }}
      />

      <div className="client-page-title-wrap" style={{ marginTop: 'clamp(0.75rem, 2vw, 1.5rem)' }}>
        <div className="client-page-accent-bar" />
        <h1 className="client-page-title">{t.cart.title}</h1>
        <p className="client-page-subtitle">
          {cartItems.length} {t.cart.items}
        </p>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 0.25rem', position: 'relative', zIndex: 20 }}>
        {cartItems.length === 0 ? (
          <div
            className="client-glass-panel"
            style={{
              textAlign: 'center',
              padding: 'clamp(3.5rem, 10vw, 6rem) 1.5rem',
              marginTop: '1rem',
            }}
          >
            <div style={{ fontSize: 'clamp(3.5rem, 12vw, 5rem)', marginBottom: '1.5rem', filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.35))' }}>🛒</div>
            <h2 style={{ color: '#1a2b48', fontSize: 'clamp(1.5rem, 4vw, 2rem)', marginBottom: '0.75rem', fontWeight: 800 }}>{t.cart.empty}</h2>
            <p style={{ color: '#8a94a6', fontSize: '1.05rem', marginBottom: '2.25rem', fontWeight: 500, maxWidth: '28rem', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.55 }}>
              {language === 'zh' ? '快去商场选购您喜欢的商品吧！' : language === 'my' ? 'ဈေးဝယ်စင်တာမှ ပစ္စည်းများရွေးချယ်လိုက်ပါ။' : 'Browse the city mall and add items you love.'}
            </p>
            <button
              type="button"
              onClick={() => navigate('/mall')}
              style={{
                background: '#2c98a6',
                color: 'white',
                border: 'none',
                padding: '1rem 2.5rem',
                borderRadius: '999px',
                fontSize: '1.05rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 16px 40px rgba(44, 152, 166, 0.28)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 20px 48px rgba(30, 111, 122, 0.35)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 16px 40px rgba(44, 152, 166, 0.28)';
              }}
            >
              🚀 {t.cart.backToMall}
            </button>
          </div>
        ) : (
          <div className="client-cart-grid">
            <div className="client-glass-panel" style={{ padding: 'clamp(1.1rem, 3vw, 1.5rem)' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1.25rem',
                  borderBottom: '1px solid rgba(26, 43, 72, 0.08)',
                  paddingBottom: '1rem',
                }}
              >
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1a2b48', margin: 0 }}>
                  {language === 'zh' ? '商品清单' : language === 'my' ? 'ပစ္စည်းစာရင်း' : 'Items'}
                </h2>
                <button
                  type="button"
                  onClick={clearCart}
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(248, 113, 113, 0.35)',
                    color: '#dc2626',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    padding: '0.45rem 0.9rem',
                    borderRadius: '10px',
                    transition: 'background 0.2s ease',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.28)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                  }}
                >
                  🗑️ {t.cart.clear}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {cartItems.map((item: any) => {
                  const lineKey = getCartItemLineKey(item);
                  return (
                  <div
                    key={lineKey}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0.85rem',
                      background: '#ffffff',
                      borderRadius: '16px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 8px 24px rgba(26, 43, 72, 0.06)',
                    }}
                  >
                    <div
                      onClick={() =>
                        item.store_id &&
                        navigate(
                          `/mall/${item.store_id}?openDetail=${item.id}${item.variant_id ? `&variant=${item.variant_id}` : ''}`,
                        )
                      }
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        flex: 1,
                        cursor: item.store_id ? 'pointer' : 'default',
                        minWidth: 0,
                      }}
                      title={t.cart.openDetailHint}
                    >
                      <div
                        style={{
                          width: '60px',
                          height: '60px',
                          borderRadius: '12px',
                          background: '#e8f4fa',
                          overflow: 'hidden',
                          marginRight: '1rem',
                          border: '1px solid #e2e8f0',
                          flexShrink: 0,
                        }}
                      >
                        {item.image_url && !item.image_url.startsWith('file://') ? (
                          <StorageImg src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} fallback={
                          <div
                            style={{
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              fontSize: '1.8rem',
                              background: 'rgba(56, 189, 248, 0.12)',
                            }}
                          >
                            📦
                          </div>
                          } />
                        ) : (
                          <div
                            style={{
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              fontSize: '1.8rem',
                              background: 'rgba(56, 189, 248, 0.12)',
                            }}
                          >
                            📦
                          </div>
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.2rem', color: '#1a2b48' }}>{item.name}</h3>
                        {item.variant_name ? (
                          <p style={{ color: '#2c98a6', fontSize: '0.78rem', margin: '0 0 0.15rem', fontWeight: 700 }}>
                            {language === 'zh' ? '规格：' : 'Variant: '}{item.variant_name}
                          </p>
                        ) : null}
                        <p style={{ color: '#2c98a6', fontSize: '0.9rem', fontWeight: 700 }}>{item.price.toLocaleString()} MMK</p>
                        {item.customer_remark ? (
                          <p style={{ color: '#8a94a6', fontSize: '0.8rem', margin: '0.35rem 0 0', fontWeight: 600, lineHeight: 1.4 }}>
                            {t.cart.remark}：{item.customer_remark}
                          </p>
                        ) : null}
                        {item.store_id ? (
                          <p style={{ color: '#2c98a6', fontSize: '0.75rem', margin: '0.35rem 0 0', fontWeight: 700 }}>{t.cart.openDetailHint} →</p>
                        ) : null}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', background: '#e8f6f8', borderRadius: '12px', padding: '0.2rem', border: '1px solid #e2e8f0' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateQuantity(lineKey, item.quantity - 1);
                          }}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '8px',
                            border: 'none',
                            background: '#ffffff',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            color: '#1a2b48',
                            fontSize: '0.95rem',
                          }}
                        >
                          -
                        </button>
                        <span style={{ margin: '0 0.55rem', fontWeight: 800, width: '20px', textAlign: 'center', fontSize: '0.9rem', color: '#1a2b48' }}>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateQuantity(lineKey, item.quantity + 1);
                          }}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '8px',
                            border: 'none',
                            background: '#ffffff',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            color: '#1a2b48',
                            fontSize: '0.95rem',
                          }}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromCart(lineKey);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'rgba(148, 163, 184, 0.85)',
                          cursor: 'pointer',
                          fontSize: '1.35rem',
                          transition: 'color 0.2s ease',
                          padding: '0.3rem',
                          lineHeight: 1,
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.color = '#f87171';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.color = 'rgba(148, 163, 184, 0.85)';
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
                })}
              </div>
            </div>

            <div className="client-cart-summary">
              <div className="client-glass-panel" style={{ padding: '1.75rem' }}>
                <h2
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    marginBottom: '1.35rem',
                    color: '#1a2b48',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.55rem',
                  }}
                >
                  <span style={{ fontSize: '1.35rem' }}>📋</span>{' '}
                  {language === 'zh' ? '结算详情' : language === 'my' ? 'ငွေရှင်းပြီး' : 'Summary'}
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#5b6b7c', fontWeight: 600 }}>
                    <span>{language === 'zh' ? '商品总数' : language === 'my' ? 'အရေအတွက်' : 'Line items'}</span>
                    <span>
                      {cartItems.length} {language === 'zh' ? '件' : language === 'my' ? 'ခု' : ''}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '1rem 0',
                      borderTop: '1px dashed rgba(26, 43, 72, 0.12)',
                      borderBottom: '1px dashed rgba(26, 43, 72, 0.12)',
                    }}
                  >
                    <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1a2b48' }}>{t.cart.total}</span>
                    <span style={{ fontWeight: 800, color: '#2c98a6', fontSize: '1.45rem' }}>{cartTotal.toLocaleString()} MMK</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCheckout}
                  style={{
                    width: '100%',
                    padding: '1.05rem',
                    borderRadius: '999px',
                    border: 'none',
                    background: '#2c98a6',
                    color: 'white',
                    fontWeight: 800,
                    fontSize: '1.05rem',
                    cursor: 'pointer',
                    boxShadow: '0 14px 36px rgba(44, 152, 166, 0.28)',
                    transition: 'transform 0.2s ease',
                    marginBottom: '0.85rem',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  🚀 {t.cart.checkout}
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/mall')}
                  style={{
                    width: '100%',
                    padding: '0.95rem',
                    borderRadius: '999px',
                    border: '1.5px solid #2c98a6',
                    background: '#ffffff',
                    color: '#2c98a6',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    transition: 'background 0.2s ease, border-color 0.2s ease',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#e8f6f8';
                    e.currentTarget.style.borderColor = '#1e6f7a';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.borderColor = '#2c98a6';
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
          width: 8px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(44, 152, 166, 0.28);
          border-radius: 10px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
      `}</style>
    </ClientInteriorShell>
  );
};

export default CartPage;
