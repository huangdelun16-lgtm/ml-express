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
  const [selectedRegion, setSelectedRegion] = useState<string>('MDY');

  const regions = [
    { id: 'MDY', zh: '曼德勒', en: 'Mandalay', my: 'မန္တလေး' },
    { id: 'YGN', zh: '仰光', en: 'Yangon', my: 'ရန်ကုန်' },
    { id: 'POL', zh: '彬乌伦', en: 'Pyin Oo Lwin', my: 'ပြင်ဦးလွင်' },
    { id: 'NPW', zh: '内比都', en: 'Naypyidaw', my: 'နေပြည်တော်' },
    { id: 'TGI', zh: '东枝', en: 'Taunggyi', my: 'တောင်ကြီး' },
    { id: 'LSO', zh: '腊戌', en: 'Lashio', my: 'လားရှိုး' },
    { id: 'MSE', zh: '木姐', en: 'Muse', my: 'မူဆယ်' }
  ];

  const t = {
    zh: {
      title: '同城商场',
      subtitle: '发现您身边的优质商户',
      searchPlaceholder: '搜索商户名称或类型...',
      noStores: '该区域暂无商户',
      operatingHours: '营业时间',
      contact: '联系电话',
      visitStore: '进入店铺',
      loading: '正在为您加载...',
      all: '全部',
      region: '所在地区'
    },
    en: {
      title: 'City Mall',
      subtitle: 'Discover quality merchants around you',
      searchPlaceholder: 'Search store name or type...',
      noStores: 'No stores found in this region',
      operatingHours: 'Hours',
      contact: 'Phone',
      visitStore: 'Visit Store',
      loading: 'Loading for you...',
      all: 'All',
      region: 'Region'
    },
    my: {
      title: 'မြို့တွင်းဈေးဝယ်စင်တာ',
      subtitle: 'သင့်အနီးနားရှိ အရည်အသွေးမြင့်ဆိုင်များကို ရှာဖွေပါ',
      searchPlaceholder: 'ဆိုင်အမည် သို့မဟုတ် အမျိုးအစားရှာရန်...',
      noStores: 'ဤဒေသတွင် ဆိုင်များမရှိသေးပါ',
      operatingHours: 'ဖွင့်ချိန်',
      contact: 'ဖုန်းနံပါတ်',
      visitStore: 'ဆိုင်သို့ဝင်ရန်',
      loading: 'ခေတ္တစောင့်ဆိုင်းပါ...',
      all: 'အားလုံး',
      region: 'ဒေသ'
    }
  }[language as 'zh' | 'en' | 'my'] || {
    title: 'City Mall',
    subtitle: 'Discover quality merchants around you',
    searchPlaceholder: 'Search store name or type...',
    noStores: 'No stores found in this region',
    operatingHours: 'Hours',
    contact: 'Phone',
    visitStore: 'Visit Store',
    loading: 'Loading...',
    all: 'All',
    region: 'Region'
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('ml-express-user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        
        // 🚀 自动根据用户地址检测区域
        if (user.address) {
          const addr = user.address.toUpperCase();
          if (addr.includes('YANGON') || addr.includes('YGN')) setSelectedRegion('YGN');
          else if (addr.includes('PYIN OO LWIN') || addr.includes('POL')) setSelectedRegion('POL');
          else if (addr.includes('NAYPYIDAW') || addr.includes('NPW')) setSelectedRegion('NPW');
          else if (addr.includes('TAUNGGYI') || addr.includes('TGI')) setSelectedRegion('TGI');
          else if (addr.includes('LASHIO') || addr.includes('LSO')) setSelectedRegion('LSO');
          else if (addr.includes('MUSE') || addr.includes('MSE')) setSelectedRegion('MSE');
          else setSelectedRegion('MDY'); // 默认曼德勒
        }
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

  const filteredStores = stores.filter(store => {
    // 匹配搜索文本
    const matchesSearch = store.store_name.toLowerCase().includes(searchText.toLowerCase()) ||
      (store.store_code && store.store_code.toLowerCase().includes(searchText.toLowerCase())) ||
      store.store_type.toLowerCase().includes(searchText.toLowerCase());
    
    // 匹配地区 (如果 store.address 包含地区标识)
    const storeAddr = (store.address || '').toUpperCase();
    const matchesRegion = 
      (selectedRegion === 'YGN' && (storeAddr.includes('YANGON') || storeAddr.includes('YGN'))) ||
      (selectedRegion === 'MDY' && (storeAddr.includes('MANDALAY') || storeAddr.includes('MDY'))) ||
      (selectedRegion === 'POL' && (storeAddr.includes('PYIN OO LWIN') || storeAddr.includes('POL'))) ||
      (selectedRegion === 'NPW' && (storeAddr.includes('NAYPYIDAW') || storeAddr.includes('NPW'))) ||
      (selectedRegion === 'TGI' && (storeAddr.includes('TAUNGGYI') || storeAddr.includes('TGI'))) ||
      (selectedRegion === 'LSO' && (storeAddr.includes('LASHIO') || storeAddr.includes('LSO'))) ||
      (selectedRegion === 'MSE' && (storeAddr.includes('MUSE') || storeAddr.includes('MSE')));

    return matchesSearch && matchesRegion;
  });

  const getStoreIcon = (type: string) => {
    const t = (type || '').toLowerCase();
    switch (t) {
      case '餐厅': case 'restaurant': return '🍽️';
      case '茶铺': case 'tea_shop': return '🍵';
      case '饮料和小吃': case 'drinks_snacks': return '🥤';
      case '杂货店': case 'grocery': return '🛒';
      default: return '🏪';
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      <div style={{ 
        padding: '1rem 2rem 0',
        background: 'linear-gradient(to bottom, #1e3a8a 0%, #1e40af 100%)',
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
        
        {/* 🚀 优化后的 Header */}
        <div style={{ 
          maxWidth: '1200px', 
          margin: '2rem auto 0',
          textAlign: 'center',
          color: 'white'
        }}>
          <h1 style={{ 
            fontSize: '3rem', 
            marginBottom: '0.5rem', 
            fontWeight: '900',
            textShadow: '0 4px 12px rgba(0,0,0,0.3)',
            letterSpacing: '2px'
          }}>{t.title}</h1>
          <p style={{ 
            fontSize: '1.2rem', 
            opacity: 0.9, 
            marginBottom: '2.5rem',
            fontWeight: '500'
          }}>{t.subtitle}</p>
          
          <div style={{ 
            maxWidth: '700px', 
            margin: '0 auto',
            position: 'relative',
            zIndex: 10
          }}>
            <div style={{
              display: 'flex',
              background: 'white',
              borderRadius: '16px',
              padding: '4px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              <div style={{
                padding: '0 1.5rem',
                display: 'flex',
                alignItems: 'center',
                color: '#94a3b8',
                fontSize: '1.5rem'
              }}>🔍</div>
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{
                  flex: 1,
                  padding: '1.2rem 0',
                  border: 'none',
                  fontSize: '1.1rem',
                  outline: 'none',
                  color: '#1e293b',
                  background: 'transparent'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 🚀 地区选择栏 */}
      <div style={{ 
        background: 'white', 
        borderBottom: '1px solid #e2e8f0',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          display: 'flex', 
          alignItems: 'center',
          padding: '0 1rem',
          overflowX: 'auto'
        }}>
          <div style={{ 
            padding: '1rem', 
            fontWeight: 'bold', 
            color: '#64748b', 
            whiteSpace: 'nowrap',
            borderRight: '1px solid #f1f5f9',
            marginRight: '1rem'
          }}>
            📍 {t.region}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {regions.map(r => (
              <button
                key={r.id}
                onClick={() => setSelectedRegion(r.id)}
                style={{
                  padding: '0.8rem 1.5rem',
                  border: 'none',
                  background: selectedRegion === r.id ? '#eff6ff' : 'transparent',
                  color: selectedRegion === r.id ? '#2563eb' : '#64748b',
                  fontWeight: selectedRegion === r.id ? 'bold' : '500',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease'
                }}
              >
                {r[language as 'zh' | 'en' | 'my'] || r.en}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '2.5rem auto', padding: '0 1rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '8rem 0' }}>
            <div className="spinner" style={{ 
              width: '50px', 
              height: '50px', 
              border: '5px solid #e2e8f0', 
              borderTop: '5px solid #2563eb', 
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1.5rem'
            }}></div>
            <p style={{ color: '#64748b', fontSize: '1.1rem', fontWeight: '500' }}>{t.loading}</p>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
            gap: '2rem' 
          }}>
            {filteredStores.map(store => (
              <div 
                key={store.id}
                onClick={() => navigate(`/mall/${store.id}`)}
                style={{
                  background: 'white',
                  borderRadius: '24px',
                  padding: '1.8rem',
                  cursor: 'pointer',
                  transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
                  position: 'relative',
                  border: '1px solid #f1f5f9',
                  display: 'flex',
                  flexDirection: 'column'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(0,0,0,0.1)';
                  e.currentTarget.style.borderColor = '#3b82f6';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.02)';
                  e.currentTarget.style.borderColor = '#f1f5f9';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                  <div style={{ 
                    width: '70px', 
                    height: '70px', 
                    borderRadius: '20px', 
                    background: '#f0f7ff', 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center',
                    fontSize: '2.5rem',
                    marginRight: '1.2rem',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                  }}>
                    {getStoreIcon(store.store_type)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ 
                      fontSize: '1.3rem', 
                      fontWeight: '800', 
                      color: '#0f172a', 
                      marginBottom: '0.5rem',
                      lineHeight: '1.2'
                    }}>{store.store_name}</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span style={{ 
                        background: '#f1f5f9', 
                        color: '#475569', 
                        fontSize: '0.75rem', 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '8px',
                        fontWeight: '700',
                        textTransform: 'uppercase'
                      }}>
                        {store.store_type}
                      </span>
                      <span style={{ 
                        background: '#dcfce7', 
                        color: '#166534', 
                        fontSize: '0.75rem', 
                        padding: '0.25rem 0.75rem', 
                        borderRadius: '8px',
                        fontWeight: '700'
                      }}>
                        ● Open
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ 
                  background: '#f8fafc', 
                  borderRadius: '16px', 
                  padding: '1.2rem', 
                  gap: '0.8rem', 
                  display: 'flex', 
                  flexDirection: 'column',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', color: '#475569', fontSize: '0.95rem' }}>
                    <span style={{ fontSize: '1.2rem', marginRight: '0.8rem' }}>⏰</span>
                    <span style={{ fontWeight: '500' }}>{t.operatingHours}:</span>
                    <span style={{ marginLeft: 'auto', color: '#1e293b' }}>{store.operating_hours || '09:00 - 21:00'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', color: '#475569', fontSize: '0.95rem' }}>
                    <span style={{ fontSize: '1.2rem', marginRight: '0.8rem' }}>📞</span>
                    <span style={{ fontWeight: '500' }}>{t.contact}:</span>
                    <span style={{ marginLeft: 'auto', color: '#1e293b' }}>{store.phone}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', color: '#475569', fontSize: '0.95rem' }}>
                    <span style={{ fontSize: '1.2rem', marginRight: '0.8rem' }}>📍</span>
                    <span style={{ 
                      whiteSpace: 'nowrap', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis',
                      color: '#1e293b'
                    }}>{store.address}</span>
                  </div>
                </div>

                <div style={{ 
                  textAlign: 'right', 
                  marginTop: 'auto', 
                  fontWeight: '800', 
                  color: '#2563eb',
                  fontSize: '1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '0.5rem'
                }}>
                  {t.visitStore} <span style={{ fontSize: '1.4rem' }}>→</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filteredStores.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '10rem 0', 
            color: '#94a3b8',
            background: 'white',
            borderRadius: '32px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
          }}>
            <div style={{ fontSize: '6rem', marginBottom: '1.5rem' }}>🏢</div>
            <h3 style={{ fontSize: '1.5rem', color: '#64748b', fontWeight: 'bold' }}>{t.noStores}</h3>
            <p style={{ marginTop: '0.5rem' }}>请尝试切换其他地区或搜索关键词</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        ::-webkit-scrollbar {
          height: 6px;
        }
        ::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default CityMallPage;
