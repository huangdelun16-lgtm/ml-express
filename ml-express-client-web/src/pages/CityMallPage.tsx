import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { deliveryStoreService, DeliveryStore, reviewService } from '../services/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import NavigationBar from '../components/home/NavigationBar';
import LoggerService from '../services/LoggerService';

const CityMallPage: React.FC = () => {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<DeliveryStore[]>([]);
  const [searchText, setSearchText] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedRegion, setSelectedRegion] = useState<string>('MDY');
  const [storeReviewStats, setStoreReviewStats] = useState<Record<string, any>>({});
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedStoreForReviews, setSelectedStoreForReviews] = useState<any>(null);
  const [currentStoreReviews, setCurrentStoreReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  const regions = [
    { id: 'MDY', zh: '曼德勒', en: 'Mandalay', my: 'မန္တလေး' },
    { id: 'YGN', zh: '仰光', en: 'Yangon', my: 'ရန်ကုန်' },
    { id: 'POL', zh: '彬乌伦', en: 'Pyin Oo Lwin', my: 'ပြင်ဦးလွင်' },
    { id: 'NPW', zh: '内比都', en: 'Naypyidaw', my: 'နေပြည်တော်' },
    { id: 'TGI', zh: '东枝', en: 'Taunggyi', my: 'တောင်ကြီး' },
    { id: 'LSO', zh: '腊戌', en: 'Lashio', my: 'လားရှိုး' },
    { id: 'MSE', zh: '木姐', en: 'Muse', my: 'မူဆယ်' }
  ];

  useEffect(() => {
    const savedUser = localStorage.getItem('ml-express-customer');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        
        if (user.address) {
          const addr = user.address.toUpperCase();
          if (addr.includes('YANGON') || addr.includes('YGN')) setSelectedRegion('YGN');
          else if (addr.includes('PYIN OO LWIN') || addr.includes('POL')) setSelectedRegion('POL');
          else if (addr.includes('NAYPYIDAW') || addr.includes('NPW')) setSelectedRegion('NPW');
          else if (addr.includes('TAUNGGYI') || addr.includes('TGI')) setSelectedRegion('TGI');
          else if (addr.includes('LASHIO') || addr.includes('LSO')) setSelectedRegion('LSO');
          else if (addr.includes('MUSE') || addr.includes('MSE')) setSelectedRegion('MSE');
          else setSelectedRegion('MDY');
        }
      } catch (error) {
        console.error('Failed to load user info:', error);
      }
    }
    loadStores();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('ml-express-customer');
    setCurrentUser(null);
    navigate('/');
  };

  const loadStores = async () => {
    setLoading(true);
    try {
      const data = await deliveryStoreService.getActiveStores();
      setStores(data);
      
      // 🚀 加载所有店铺的评价统计
      const statsPromises = data.map(store => reviewService.getStoreReviewStats(store.id));
      const statsResults = await Promise.all(statsPromises);
      
      const statsMap: Record<string, any> = {};
      data.forEach((store, index) => {
        statsMap[store.id] = statsResults[index];
      });
      setStoreReviewStats(statsMap);
    } catch (error) {
      LoggerService.error('Failed to load stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStoreReviews = async (store: any) => {
    setSelectedStoreForReviews(store);
    setShowReviewModal(true);
    setLoadingReviews(true);
    try {
      const reviews = await reviewService.getStoreReviews(store.id);
      setCurrentStoreReviews(reviews);
    } catch (error) {
      LoggerService.error('Failed to load reviews:', error);
    } finally {
      setLoadingReviews(false);
    }
  };

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

  // 🚀 新增：判断店铺是否正在营业
  const checkStoreOpenStatus = (store: DeliveryStore) => {
    if (store.is_closed_today) return { isOpen: false, reason: 'closed_today' };
    
    try {
      const hours = store.operating_hours || '09:00 - 21:00';
      // 使用正则兼容 "09:00 - 21:00" 和 "09:00-21:00"
      const parts = hours.split(/\s*-\s*/);
      if (parts.length < 2) return { isOpen: true, reason: 'parse_error' };
      
      const [start, end] = parts;
      
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
      return { isOpen: true, reason: 'parse_error' }; // 出错默认营业
    }
  };

  // 🚀 核心逻辑：过滤并排序店铺（营业中的排在前面，休息中的排在最后）
  const filteredStores = stores
    .filter(store => {
      const matchesSearch = store.store_name.toLowerCase().includes(searchText.toLowerCase()) ||
        (store.store_code && store.store_code.toLowerCase().includes(searchText.toLowerCase())) ||
        (store.store_type && store.store_type.toLowerCase().includes(searchText.toLowerCase()));
      
      const storeAddr = (store.address || '').toUpperCase();
      let storeRegion = 'MDY';
      
      if (storeAddr.includes('YANGON') || storeAddr.includes('YGN')) storeRegion = 'YGN';
      else if (storeAddr.includes('PYIN OO LWIN') || storeAddr.includes('POL')) storeRegion = 'POL';
      else if (storeAddr.includes('NAYPYIDAW') || storeAddr.includes('NPW')) storeRegion = 'NPW';
      else if (storeAddr.includes('TAUNGGYI') || storeAddr.includes('TGI')) storeRegion = 'TGI';
      else if (storeAddr.includes('LASHIO') || storeAddr.includes('LSO')) storeRegion = 'LSO';
      else if (storeAddr.includes('MUSE') || storeAddr.includes('MSE')) storeRegion = 'MSE';
      else storeRegion = 'MDY';

      return matchesSearch && storeRegion === selectedRegion;
    })
    .sort((a, b) => {
      const statusA = checkStoreOpenStatus(a);
      const statusB = checkStoreOpenStatus(b);
      if (statusA.isOpen === statusB.isOpen) return 0;
      return statusA.isOpen ? -1 : 1; // 营业中的排前面
    });

  // 🚀 首页同款背景渐变
  const homeBackground = 'linear-gradient(to right top, #b0d3e8, #a2c3d6, #93b4c5, #86a4b4, #7895a3, #6c90a3, #618ca3, #5587a4, #498ab6, #428cc9, #468dda, #558cea)';

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: homeBackground,
      backgroundAttachment: 'fixed'
    }}>
      {/* 顶部导航与 Header 区域 */}
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
        
        <div style={{ 
          maxWidth: '1200px', 
          margin: '2rem auto 0',
          textAlign: 'center',
          color: 'white'
        }}>
          <h1 style={{ 
            fontSize: '3.5rem', 
            marginBottom: '0.5rem', 
            fontWeight: '900',
            textShadow: '2px 4px 8px rgba(0,0,0,0.2)',
            letterSpacing: '2px'
          }}>{t.mall.title}</h1>
          <p style={{ 
            fontSize: '1.2rem', 
            opacity: 0.9, 
            marginBottom: '2.5rem',
            fontWeight: '600',
            textShadow: '1px 2px 4px rgba(0,0,0,0.1)'
          }}>{t.mall.subtitle}</p>
          
          <div style={{ 
            maxWidth: '700px', 
            margin: '0 auto',
            position: 'relative',
            zIndex: 10
          }}>
            <div style={{
              display: 'flex',
              background: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '20px',
              padding: '6px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              border: '1px solid rgba(255,255,255,0.5)'
            }}>
              <div style={{
                padding: '0 1.5rem',
                display: 'flex',
                alignItems: 'center',
                color: '#64748b',
                fontSize: '1.5rem'
              }}>🔍</div>
              <input
                type="text"
                placeholder={t.mall.searchPlaceholder}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{
                  flex: 1,
                  padding: '1.2rem 0',
                  border: 'none',
                  fontSize: '1.1rem',
                  outline: 'none',
                  color: '#1e293b',
                  background: 'transparent',
                  fontWeight: '500'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 🚀 地区选择栏 - 优化为高级玻璃拟态效果 */}
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.05)', 
        backdropFilter: 'blur(30px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        padding: '0.75rem 0'
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          display: 'flex', 
          alignItems: 'center',
          padding: '0 1.5rem'
        }}>
          {/* 标签 */}
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '0.8rem',
            padding: '0.6rem 1.2rem', 
            fontWeight: '900', 
            color: 'white', 
            whiteSpace: 'nowrap',
            marginRight: '1.5rem',
            fontSize: '1rem',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <span style={{ fontSize: '1.2rem' }}>📍</span> {t.mall.region}
          </div>

          {/* 滚动容器 */}
          <div style={{ 
            display: 'flex', 
            gap: '0.75rem',
            overflowX: 'auto',
            padding: '0.5rem 0',
            scrollbarWidth: 'none', // Firefox
            msOverflowStyle: 'none', // IE
          }}>
            <style>{`
              .region-scroll::-webkit-scrollbar { display: none; }
            `}</style>
            <div className="region-scroll" style={{ display: 'flex', gap: '0.75rem' }}>
              {regions.map((r: any) => {
                const isActive = selectedRegion === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRegion(r.id)}
                    style={{
                      padding: '0.7rem 1.8rem',
                      border: '1px solid',
                      borderColor: isActive ? 'transparent' : 'rgba(255, 255, 255, 0.2)',
                      background: isActive 
                        ? 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)' 
                        : 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      fontWeight: isActive ? '900' : '700',
                      borderRadius: '18px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      fontSize: '0.95rem',
                      boxShadow: isActive 
                        ? '0 8px 20px rgba(30, 64, 175, 0.4)' 
                        : '0 4px 12px rgba(0,0,0,0.05)',
                      transform: isActive ? 'scale(1.05)' : 'scale(1)',
                    }}
                    onMouseOver={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                      }
                    }}
                  >
                    {r[language as 'zh' | 'en'] || r.en}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '3rem auto', padding: '0 1rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '8rem 0' }}>
            <div className="spinner" style={{ 
              width: '50px', 
              height: '50px', 
              border: '5px solid rgba(255,255,255,0.3)', 
              borderTop: '5px solid #1e40af', 
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1.5rem'
            }}></div>
            <p style={{ color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}>{t.mall.loading}</p>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', 
            gap: '2.5rem' 
          }}>
            {filteredStores.map((store: any) => {
              const status = checkStoreOpenStatus(store);
              return (
                <div 
                  key={store.id}
                  onClick={() => {
                    if (!status.isOpen) {
                      alert(t.mall.closedToday);
                      return;
                    }
                    navigate(`/mall/${store.id}`);
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '30px',
                    padding: '2rem',
                    cursor: status.isOpen ? 'pointer' : 'not-allowed',
                    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    boxShadow: '0 10px 20px rgba(0,0,0,0.05)',
                    position: 'relative',
                    border: '1px solid rgba(255,255,255,0.8)',
                    display: 'flex',
                    flexDirection: 'column',
                    opacity: status.isOpen ? 1 : 0.8 // 休息中店铺半透明
                  }}
                  onMouseOver={(e) => {
                    if (status.isOpen) {
                      e.currentTarget.style.transform = 'translateY(-12px)';
                      e.currentTarget.style.boxShadow = '0 30px 60px rgba(0,0,0,0.15)';
                      e.currentTarget.style.background = '#ffffff';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (status.isOpen) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.05)';
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '1.8rem' }}>
                    <div style={{ 
                      width: '80px', 
                      height: '80px', 
                      borderRadius: '24px', 
                      background: homeBackground, 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center',
                      fontSize: '2.8rem',
                      marginRight: '1.5rem',
                      boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                      color: 'white',
                      filter: status.isOpen ? 'none' : 'grayscale(1)' // 休息中图标变灰
                    }}>
                      {getStoreIcon(store.store_type)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ 
                        fontSize: '1.4rem', 
                        fontWeight: '900', 
                        color: status.isOpen ? '#0f172a' : '#64748b', 
                        marginBottom: '0.6rem',
                        lineHeight: '1.2'
                      }}>{store.store_name}</h3>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                        <span style={{ 
                          background: '#eff6ff', 
                          color: '#1e40af', 
                          fontSize: '0.8rem', 
                          padding: '0.3rem 0.8rem', 
                          borderRadius: '10px',
                          fontWeight: '800',
                          textTransform: 'uppercase'
                        }}>
                          {store.store_type}
                        </span>
                        <span style={{ 
                          background: status.isOpen ? '#dcfce7' : '#fee2e2', 
                          color: status.isOpen ? '#15803d' : '#ef4444', 
                          fontSize: '0.8rem', 
                          padding: '0.3rem 0.8rem', 
                          borderRadius: '10px',
                          fontWeight: '800'
                        }}>
                          ● {status.isOpen ? t.mall.openNow : (status.reason === 'closed_today' ? t.mall.closedToday : t.mall.closedNow)}
                        </span>
                      </div>

                      {/* 🚀 新增：评价统计显示 */}
                      {storeReviewStats[store.id] && storeReviewStats[store.id].count > 0 && (
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            loadStoreReviews(store);
                          }}
                          style={{ 
                            marginTop: '0.8rem', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            cursor: 'pointer'
                          }}
                        >
                          <div style={{ display: 'flex', color: '#fbbf24', fontSize: '0.9rem' }}>
                            {'★'.repeat(Math.round(storeReviewStats[store.id].average))}
                            {'☆'.repeat(5 - Math.round(storeReviewStats[store.id].average))}
                          </div>
                          <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '700' }}>
                            {storeReviewStats[store.id].average} ({storeReviewStats[store.id].count} {language === 'zh' ? '条评价' : 'Reviews'})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ 
                    background: '#f8fafc', 
                    borderRadius: '20px', 
                    padding: '1.5rem', 
                    gap: '1rem', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    marginBottom: '1.8rem',
                    border: '1px solid #f1f5f9',
                    opacity: status.isOpen ? 1 : 0.6
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', color: '#475569', fontSize: '1rem' }}>
                      <span style={{ fontSize: '1.2rem', marginRight: '1rem' }}>⏰</span>
                      <span style={{ fontWeight: '600' }}>{t.mall.operatingHours}:</span>
                      <span style={{ marginLeft: 'auto', color: '#1e293b', fontWeight: '700' }}>{store.operating_hours || '09:00 - 21:00'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', color: '#475569', fontSize: '1rem' }}>
                      <span style={{ fontSize: '1.2rem', marginRight: '1rem' }}>📞</span>
                      <span style={{ fontWeight: '600' }}>{t.mall.contact}:</span>
                      <span style={{ marginLeft: 'auto', color: '#1e40af', fontWeight: '800' }}>{store.phone}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', color: '#475569', fontSize: '1rem' }}>
                      <span style={{ fontSize: '1.2rem', marginRight: '1rem' }}>📍</span>
                      <span style={{ 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        color: '#1e293b',
                        fontWeight: '500',
                        maxWidth: '180px'
                      }}>{store.address}</span>
                    </div>
                  </div>

                  <div style={{ 
                    textAlign: 'right', 
                    marginTop: 'auto', 
                    fontWeight: '900', 
                    color: status.isOpen ? '#1e40af' : '#94a3b8',
                    fontSize: '1.2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '0.6rem'
                  }}>
                    {status.isOpen ? t.mall.visitStore : t.mall.closedToday} <span style={{ fontSize: '1.6rem' }}>{status.isOpen ? '→' : '🔒'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && filteredStores.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '10rem 0', 
            color: 'white',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '40px',
            border: '2px dashed rgba(255, 255, 255, 0.3)'
          }}>
            <div style={{ fontSize: '7rem', marginBottom: '1.5rem', opacity: 0.8 }}>🏢</div>
            <h3 style={{ fontSize: '1.8rem', color: 'white', fontWeight: '900' }}>{t.mall.noStores}</h3>
            <p style={{ marginTop: '0.8rem', fontSize: '1.1rem', opacity: 0.9 }}>请尝试切换其他地区或搜索关键词</p>
          </div>
        )}
      </div>

      {/* 🚀 新增：店铺评价详情弹窗 */}
      {showReviewModal && selectedStoreForReviews && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}
        onClick={() => setShowReviewModal(false)}
        >
          <div style={{
            background: 'white',
            borderRadius: '32px',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '85vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
            position: 'relative'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* 页眉 */}
            <div style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
              padding: '2.5rem 2rem',
              textAlign: 'center',
              position: 'relative'
            }}>
              <button 
                onClick={() => setShowReviewModal(false)}
                style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.2)', border: 'none', width: '36px', height: '36px', borderRadius: '12px', color: 'white', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >✕</button>
              
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⭐</div>
              <h2 style={{ color: 'white', fontSize: '1.8rem', fontWeight: '900', margin: 0 }}>
                {selectedStoreForReviews.store_name}
              </h2>
              
              {storeReviewStats[selectedStoreForReviews.id] && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '1rem' }}>
                  <div style={{ color: '#fbbf24', fontSize: '1.2rem', fontWeight: '900' }}>
                    {storeReviewStats[selectedStoreForReviews.id].average} / 5.0
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', fontWeight: '600' }}>
                    {storeReviewStats[selectedStoreForReviews.id].count} {language === 'zh' ? '条评价' : 'Reviews'}
                  </div>
                </div>
              )}
            </div>

            {/* 评分分布 */}
            {storeReviewStats[selectedStoreForReviews.id] && (
              <div style={{ padding: '1.5rem 2rem', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[5, 4, 3, 2, 1].map(star => {
                    const count = storeReviewStats[selectedStoreForReviews.id].distribution[star] || 0;
                    const total = storeReviewStats[selectedStoreForReviews.id].count;
                    const percent = total > 0 ? (count / total) * 100 : 0;
                    return (
                      <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ width: '30px', fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b' }}>{star} ⭐</span>
                        <div style={{ flex: 1, height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${percent}%`, height: '100%', background: star >= 4 ? '#10b981' : star === 3 ? '#fbbf24' : '#ef4444', borderRadius: '4px' }}></div>
                        </div>
                        <span style={{ width: '30px', fontSize: '0.85rem', color: '#94a3b8', textAlign: 'right' }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 评论列表 */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
              {loadingReviews ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #f1f5f9', borderTop: '4px solid #3b82f6', borderRadius: '50%', margin: '0 auto', animation: 'spin 1s linear infinite' }}></div>
                </div>
              ) : currentStoreReviews.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {currentStoreReviews.map((review) => (
                    <div key={review.id} style={{ paddingBottom: '1.5rem', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b' }}>
                            {review.is_anonymous ? '匿' : (review.user_name?.charAt(0).toUpperCase() || 'U')}
                          </div>
                          <span style={{ fontWeight: '700', fontSize: '0.95rem', color: '#1e293b' }}>
                            {review.is_anonymous ? (language === 'zh' ? '匿名用户' : 'Anonymous') : review.user_name}
                          </span>
                        </div>
                        <div style={{ color: '#fbbf24', fontSize: '0.8rem' }}>
                          {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                        </div>
                      </div>
                      <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: '1.6', margin: '0 0 1rem 0' }}>{review.comment}</p>
                      
                      {review.images && review.images.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1rem' }}>
                          {review.images.map((img: string, idx: number) => (
                            <img key={idx} src={img} alt="Review" style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} />
                          ))}
                        </div>
                      )}

                      {review.reply_text && (
                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '14px', borderLeft: '4px solid #3b82f6', marginTop: '0.5rem' }}>
                          <div style={{ color: '#3b82f6', fontSize: '0.8rem', fontWeight: '800', marginBottom: '4px' }}>
                            {language === 'zh' ? '商家回复' : 'Merchant Reply'}
                          </div>
                          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>{review.reply_text}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                  {language === 'zh' ? '暂无评价内容' : 'No review content yet'}
                </div>
              )}
            </div>

            <div style={{ padding: '1.5rem 2rem', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
              <button
                onClick={() => setShowReviewModal(false)}
                style={{ width: '100%', padding: '12px', borderRadius: '14px', background: '#1e293b', color: 'white', border: 'none', fontWeight: '700', cursor: 'pointer' }}
              >
                {t.profile.close}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
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

export default CityMallPage;
