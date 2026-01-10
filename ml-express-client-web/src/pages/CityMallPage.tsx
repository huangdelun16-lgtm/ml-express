import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { deliveryStoreService, DeliveryStore } from '../services/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import NavigationBar from '../components/home/NavigationBar';
import LoggerService from '../services/LoggerService';

const CityMallPage: React.FC = () => {
  const navigate = useNavigate();
  const { language, setLanguage, t: translations } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<DeliveryStore[]>([]);
  const [searchText, setSearchText] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  const t = {
    zh: {
      title: '同城商场',
      searchPlaceholder: '搜索商户名称...',
      noStores: '暂无商户',
      operatingHours: '营业时间',
      contact: '联系电话',
      visitStore: '进入店铺',
      loading: '正在加载...',
      all: '全部'
    },
    en: {
      title: 'City Mall',
      searchPlaceholder: 'Search store name...',
      noStores: 'No stores found',
      operatingHours: 'Hours',
      contact: 'Phone',
      visitStore: 'Visit Store',
      loading: 'Loading...',
      all: 'All'
    },
    my: {
      title: 'မြို့တွင်းဈေးဝယ်စင်တာ',
      searchPlaceholder: 'ဆိုင်အမည်ရှာရန်...',
      noStores: 'ဆိုင်များမရှိသေးပါ',
      operatingHours: 'ဖွင့်ချိန်',
      contact: 'ဖုန်းနံပါတ်',
      visitStore: 'ဆိုင်သို့ဝင်ရန်',
      loading: 'ခေတ္တစောင့်ဆိုင်းပါ...',
      all: 'အားလုံး'
    }
  }[language as 'zh' | 'en' | 'my'] || {
    title: 'City Mall',
    searchPlaceholder: 'Search store name...',
    noStores: 'No stores found',
    operatingHours: 'Hours',
    contact: 'Phone',
    visitStore: 'Visit Store',
    loading: 'Loading...',
    all: 'All'
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
    loadStores();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('ml-express-user');
    setCurrentUser(null);
    navigate('/');
  };

  const loadStores = async () => {
    setLoading(true);
    try {
      const data = await deliveryStoreService.getActiveStores();
      setStores(data);
    } catch (error) {
      LoggerService.error('Failed to load stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStores = stores.filter(store =>
    store.store_name.toLowerCase().includes(searchText.toLowerCase()) ||
    (store.store_code && store.store_code.toLowerCase().includes(searchText.toLowerCase()))
  );

  const getStoreIcon = (type: string) => {
    switch (type) {
      case '餐厅': return '🍽️';
      case '茶铺': return '🍵';
      case '饮料和小吃': return '🥤';
      case '杂货店': return '🛒';
      default: return '🏪';
    }
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
      
      {/* 顶部标题栏 */}
      <div style={{ 
        background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
        padding: '3rem 2rem',
        color: 'white',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1.5rem', fontWeight: 'bold' }}>{t.title}</h1>
        <div style={{ 
          maxWidth: '600px', 
          margin: '0 auto',
          position: 'relative'
        }}>
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{
              width: '100%',
              padding: '1rem 1.5rem',
              borderRadius: '50px',
              border: 'none',
              fontSize: '1.1rem',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              outline: 'none'
            }}
          />
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem' }}>
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
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
            gap: '2rem' 
          }}>
            {filteredStores.map(store => (
              <div 
                key={store.id}
                onClick={() => navigate(`/mall/${store.id}`)}
                style={{
                  background: 'white',
                  borderRadius: '20px',
                  padding: '1.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                  position: 'relative',
                  border: '1px solid #f1f5f9'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 15px 30px rgba(0,0,0,0.1)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.2rem' }}>
                  <div style={{ 
                    width: '60px', 
                    height: '60px', 
                    borderRadius: '15px', 
                    background: '#eff6ff', 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    fontSize: '2rem',
                    marginRight: '1rem'
                  }}>
                    {getStoreIcon(store.store_type)}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '0.4rem' }}>{store.store_name}</h3>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <span style={{ 
                        background: '#f1f5f9', 
                        color: '#64748b', 
                        fontSize: '0.75rem', 
                        padding: '0.2rem 0.6rem', 
                        borderRadius: '6px',
                        fontWeight: '600'
                      }}>
                        {store.store_type}
                      </span>
                      <span style={{ 
                        background: '#dcfce7', 
                        color: '#15803d', 
                        fontSize: '0.75rem', 
                        padding: '0.2rem 0.6rem', 
                        borderRadius: '6px',
                        fontWeight: '600'
                      }}>
                        Open
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem', gap: '0.6rem', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                    <span style={{ marginRight: '0.5rem' }}>⏰</span>
                    <span>{t.operatingHours}: {store.operating_hours || '09:00 - 21:00'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                    <span style={{ marginRight: '0.5rem' }}>📞</span>
                    <span>{t.contact}: {store.phone}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                    <span style={{ marginRight: '0.5rem' }}>📍</span>
                    <span style={{ 
                      whiteSpace: 'nowrap', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis' 
                    }}>{store.address}</span>
                  </div>
                </div>

                <div style={{ textAlign: 'right', marginTop: '1rem', fontWeight: 'bold', color: '#3b82f6' }}>
                  {t.visitStore} →
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filteredStores.length === 0 && (
          <div style={{ textAlign: 'center', padding: '5rem', color: '#94a3b8' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🏢</div>
            <p>{t.noStores}</p>
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

export default CityMallPage;
