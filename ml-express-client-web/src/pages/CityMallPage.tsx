import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { deliveryStoreService, DeliveryStore, reviewService, merchantService, bannerService, Banner } from '../services/supabase';
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
  const [selectedCategory, setSelectedCategory] = useState<string>('全部'); // 🚀 新增
  // 预留商品搜索模式；UI 切换接入前仅使用 stores
  const [searchMode] = useState<'stores' | 'products'>('stores');
  const [foundProducts, setFoundProducts] = useState<any[]>([]); // 🚀 新增
  const [searchingProducts, setSearchingProducts] = useState(false); // 🚀 新增
  const [banners, setBanners] = useState<Banner[]>([]); // 🚀 新增
  const [storeReviewStats, setStoreReviewStats] = useState<Record<string, any>>({});
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedStoreForReviews, setSelectedStoreForReviews] = useState<any>(null);
  const [currentStoreReviews, setCurrentStoreReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [nearbyStores, setNearbyStores] = useState<DeliveryStore[]>([]); // 🚀 新增
  const [recommendedStores, setRecommendedStores] = useState<DeliveryStore[]>([]); // 🚀 新增

  const regions = [
    { id: 'MDY', zh: '曼德勒', en: 'Mandalay', my: 'မန္တလေး' },
    { id: 'YGN', zh: '仰光', en: 'Yangon', my: 'ရန်ကုန်' },
    { id: 'POL', zh: '彬乌伦', en: 'Pyin Oo Lwin', my: 'ပြင်ဦးလွင်' },
    { id: 'NPW', zh: '内比都', en: 'Naypyidaw', my: 'နေပြည်တော်' },
    { id: 'TGI', zh: '东枝', en: 'Taunggyi', my: 'တောင်ကြီး' },
    { id: 'LSO', zh: '腊戌', en: 'Lashio', my: 'လားရှိုး' },
    { id: 'MSE', zh: '木姐', en: 'Muse', my: 'မူဆယ်' }
  ];

  const categories = [
    { id: '全部', zh: '全部', en: 'All', my: 'အားလုံး', icon: 'grid-outline' },
    { id: 'restaurant', zh: '餐厅', en: 'Dining', my: 'စားသောက်ဆိုင်', icon: 'restaurant-outline' },
    { id: 'drinks_snacks', zh: '饮料小吃', en: 'Snacks', my: 'မုန့်မျိုးစုံ', icon: 'fast-food-outline' },
    { id: 'breakfast', zh: '早点铺', en: 'Breakfast', my: 'မနက်စာဆိုင်', icon: 'sunny-outline' },
    { id: 'cake_shop', zh: '蛋糕店', en: 'Cake Shop', my: 'ကိတ်မုန့်ဆိုင်', icon: 'heart-outline' },
    { id: 'tea_shop', zh: '茶铺', en: 'Tea', my: 'လက်ဖက်ရည်ဆိုင်', icon: 'cafe-outline' },
    { id: 'flower_shop', zh: '鲜花店', en: 'Flowers', my: 'ပန်းဆိုင်', icon: 'flower-outline' },
    { id: 'clothing_store', zh: '服装店', en: 'Clothing', my: 'အဝတ်အထည်ဆိုင်', icon: 'shirt-outline' },
    { id: 'grocery', zh: '杂货店', en: 'Grocery', my: 'ကုန်စုံဆိုင်', icon: 'cart-outline' },
    { id: 'hardware_store', zh: '五金店', en: 'Hardware', my: 'ဟာ့ဒ်ဝဲလ်ဆိုင်', icon: 'build-outline' },
    { id: 'supermarket', zh: '超市', en: 'Supermarket', my: 'စူပါမားကတ်', icon: 'basket-outline' },
    { id: 'transit_station', zh: '中转站', en: 'Hub', my: 'အချက်အချာဌာန', icon: 'bus-outline' },
    { id: 'other', zh: '其它', en: 'Other', my: 'အခြား', icon: 'ellipsis-horizontal-outline' },
  ];

  const uiT = {
    zh: {
      searchPlaceholder: '搜索商户或商品...',
      storesTab: '店铺',
      productsTab: '商品',
      allStores: '全部分类',
      noStores: '该区域暂无商户',
      noProducts: '未搜索到相关商品',
      visitStore: '进入店铺',
      addToCart: '查看详情',
      partnerTag: '深度合作 🤝',
      nearbyPopular: '附近热门商户',
      guessYouLike: '猜你喜欢',
      allMerchants: '所有入驻商户',
    },
    en: {
      searchPlaceholder: 'Search store or product...',
      storesTab: 'Stores',
      productsTab: 'Products',
      allStores: 'All Categories',
      noStores: 'No stores found',
      noProducts: 'No products found',
      visitStore: 'Visit Store',
      addToCart: 'View Detail',
      partnerTag: 'Partner 🤝',
      nearbyPopular: 'Nearby Popular',
      guessYouLike: 'Recommended for You',
      allMerchants: 'All Registered Merchants',
    },
    my: {
      searchPlaceholder: 'ဆိုင် သို့မဟုတ် ပစ္စည်းရှာရန်...',
      storesTab: 'ဆိုင်များ',
      productsTab: 'ကုန်ပစ္စည်းများ',
      allStores: 'ကဏ္ဍအားလုံး',
      noStores: 'ဆိုင်များမရှိသေးပါ',
      noProducts: 'ကုန်ပစ္စည်းမရှိပါ',
      visitStore: 'ဆိုင်သို့ဝင်ရန်',
      addToCart: 'အသေးစိတ်ကြည့်ရန်',
      partnerTag: 'Partner 🤝',
      nearbyPopular: 'အနီးနားရှိ လူကြိုက်များသောဆိုင်များ',
      guessYouLike: 'သင့်အတွက် အကြံပြုချက်',
      allMerchants: 'ဆိုင်အားလုံး',
    }
  }[language as 'zh' | 'en' | 'my'] || {
    searchPlaceholder: 'Search store or product...',
    storesTab: 'Stores',
    productsTab: 'Products',
    allStores: 'All Categories',
    noStores: 'No stores found',
    noProducts: 'No products found',
    visitStore: 'Visit Store',
    addToCart: 'View Detail',
    partnerTag: 'Partner 🤝',
  };

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
    loadBanners();
  }, []);

  // 🚀 商品实时搜索逻辑
  useEffect(() => {
    const query = searchText.trim();
    if (!query) {
      setFoundProducts([]);
      setSearchingProducts(false);
      return;
    }
    
    const timer = setTimeout(async () => {
      setSearchingProducts(true);
      const results = await merchantService.searchProductsByName(query);
      setFoundProducts(results);
      setSearchingProducts(false);
    }, 400);
    
    return () => clearTimeout(timer);
  }, [searchText]);

  const loadBanners = async () => {
    try {
      const data = await bannerService.getActiveBanners();
      setBanners(data);
    } catch (error) {
      console.warn('Failed to load banners');
    }
  };

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

  // 🚀 计算推荐和热门店铺逻辑 (与 App 端同步)
  useEffect(() => {
    if (stores.length > 0) {
      // 1. 猜你喜欢 (评分最高)
      const recommended = [...stores]
        .filter(s => !s.is_closed_today)
        .sort((a, b) => {
          const ratingA = storeReviewStats[a.id]?.average || 0;
          const ratingB = storeReviewStats[b.id]?.average || 0;
          return ratingB - ratingA;
        })
        .slice(0, 8);
      setRecommendedStores(recommended);

      // 2. 附近热门 (当前领区评分最高)
      const nearby = stores
        .filter(s => {
          const addr = (s.address || '').toUpperCase();
          let sRegion = 'MDY';
          if (addr.includes('YGN')) sRegion = 'YGN';
          else if (addr.includes('POL')) sRegion = 'POL';
          else if (addr.includes('NPW')) sRegion = 'NPW';
          else if (addr.includes('TGI')) sRegion = 'TGI';
          else if (addr.includes('LASHIO')) sRegion = 'LSO';
          else if (addr.includes('MUSE')) sRegion = 'MSE';
          return sRegion === selectedRegion && !s.is_closed_today;
        })
        .sort((a, b) => {
          const ratingA = storeReviewStats[a.id]?.average || 0;
          const ratingB = storeReviewStats[b.id]?.average || 0;
          return ratingB - ratingA;
        })
        .slice(0, 8);
      setNearbyStores(nearby);
    }
  }, [stores, selectedRegion, storeReviewStats]);

  const getStoreIcon = (type: string) => {
    const t = (type || '').toLowerCase();
    switch (t) {
      case 'restaurant': return '🍽️';
      case 'tea_shop': return '🍵';
      case 'drinks_snacks': return '🥤';
      case 'grocery': return '🛒';
      case 'supermarket': return '🏪';
      case 'breakfast': return '🍳';
      case 'cake_shop': return '🎂';
      case 'flower_shop': return '💐';
      case 'clothing_store': return '👕';
      case 'hardware_store': return '🔧';
      case 'transit_station': return '🚚';
      default: return '🏪';
    }
  };

  const getStoreTypeLabel = (type: string) => {
    const category = categories.find(c => c.id === type);
    if (!category) return type;
    return (category as any)[language] || category.zh;
  };

  // 🚀 新增：判断店铺是否正在营业
  const checkStoreOpenStatus = (store: DeliveryStore) => {
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
      const searchLower = searchText.toLowerCase();
      const matchesSearch = store.store_name.toLowerCase().includes(searchLower) ||
        (store.store_code && store.store_code.toLowerCase().includes(searchLower)) ||
        (store.store_type && store.store_type.toLowerCase().includes(searchLower));
      
      const storeAddr = (store.address || '').toUpperCase();
      let storeRegion = 'MDY';
      
      if (storeAddr.includes('YANGON') || storeAddr.includes('YGN')) storeRegion = 'YGN';
      else if (storeAddr.includes('PYIN OO LWIN') || storeAddr.includes('POL')) storeRegion = 'POL';
      else if (storeAddr.includes('NAYPYIDAW') || storeAddr.includes('NPW')) storeRegion = 'NPW';
      else if (storeAddr.includes('TAUNGGYI') || storeAddr.includes('TGI')) storeRegion = 'TGI';
      else if (storeAddr.includes('LASHIO') || storeAddr.includes('LSO')) storeRegion = 'LSO';
      else if (storeAddr.includes('MUSE') || storeAddr.includes('MSE')) storeRegion = 'MSE';
      else storeRegion = 'MDY';

      const matchesRegion = storeRegion === selectedRegion;

      // 🚀 分类过滤逻辑
      let matchesCategory = true;
      if (selectedCategory !== '全部') {
        matchesCategory = store.store_type === selectedCategory;
      }

      return matchesSearch && matchesRegion && matchesCategory;
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
                placeholder={uiT.searchPlaceholder}
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
            {searchingProducts && (
              <div style={{ color: 'white', marginTop: '10px', fontSize: '0.9rem' }}>正在搜索商品...</div>
            )}
          </div>
        </div>
      </div>

      {/* 🚀 精选 Banner 区域 */}
      {banners.length > 0 && !searchText.trim() && (
        <div style={{ 
          maxWidth: '1200px', 
          margin: '2rem auto 0', 
          padding: '0 1.5rem',
          display: 'flex',
          gap: '1.5rem',
          overflowX: 'auto',
          paddingBottom: '1rem'
        }} className="banner-scroll">
          <style>{`
            .banner-scroll::-webkit-scrollbar { height: 6px; }
            .banner-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); borderRadius: 10px; }
          `}</style>
          {banners.map((banner) => (
            <div 
              key={banner.id}
              onClick={() => {
                if (banner.link_url?.startsWith('store:')) {
                  navigate(`/mall/${banner.link_url.split(':')[1]}`);
                } else if (banner.link_url?.startsWith('category:')) {
                  setSelectedCategory(banner.link_url.split(':')[1]);
                }
              }}
              style={{
                minWidth: '450px',
                height: '180px',
                background: `linear-gradient(135deg, ${banner.bg_color_start || '#3b82f6'} 0%, ${banner.bg_color_end || '#1e40af'} 100%)`,
                borderRadius: '24px',
                padding: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'transform 0.3s ease',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{ flex: 1, color: 'white' }}>
                <h3 style={{ fontSize: '1.8rem', fontWeight: '900', marginBottom: '0.5rem' }}>
                  {language === 'my' ? banner.burmese_title : banner.title}
                </h3>
                <p style={{ fontSize: '1rem', opacity: 0.9, marginBottom: '1rem' }}>{banner.subtitle}</p>
                <span style={{ 
                  background: 'rgba(255,255,255,0.2)', 
                  padding: '0.4rem 1rem', 
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  fontWeight: 'bold'
                }}>{uiT.partnerTag}</span>
              </div>
              {banner.image_url && (
                <img 
                  src={banner.image_url} 
                  alt={banner.title} 
                  style={{ width: '130px', height: '130px', borderRadius: '16px', objectFit: 'cover', marginLeft: '1rem' }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* 🚀 分类聚合滑动条 */}
      {!searchText.trim() && (
        <div style={{ maxWidth: '1200px', margin: '2rem auto 0', padding: '0 1.5rem' }}>
          <div style={{ 
            display: 'flex', 
            gap: '2rem', 
            overflowX: 'auto', 
            paddingBottom: '1rem' 
          }} className="category-scroll">
            <style>{`.category-scroll::-webkit-scrollbar { display: none; }`}</style>
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <div 
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    gap: '0.8rem',
                    cursor: 'pointer',
                    minWidth: '80px'
                  }}
                >
                  <div style={{ 
                    width: '64px', 
                    height: '64px', 
                    borderRadius: '20px',
                    background: isActive ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.8rem',
                    transition: 'all 0.3s ease',
                    boxShadow: isActive ? '0 10px 20px rgba(59, 130, 246, 0.3)' : 'none',
                    border: '1px solid rgba(255,255,255,0.2)'
                  }}>
                    {getStoreIcon(cat.id === '全部' ? 'default' : cat.id)}
                  </div>
                  <span style={{ 
                    color: isActive ? 'white' : 'rgba(255,255,255,0.7)', 
                    fontWeight: isActive ? '900' : '600',
                    fontSize: '0.9rem'
                  }}>
                    {cat[language as 'zh' | 'en' | 'my'] || cat.en}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

      <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1rem' }}>
        {/* 🚀 推荐和热门区域 (仅在非搜索模式显示) */}
        {!searchText.trim() && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', marginBottom: '3.5rem' }}>
            
            {/* 附近热门 */}
            {nearbyStores.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2 style={{ color: 'white', fontSize: '1.8rem', fontWeight: '950', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    🔥 {uiT.nearbyPopular}
                  </h2>
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', paddingBottom: '1rem' }} className="h-scroll">
                  {nearbyStores.map(store => (
                    <div 
                      key={store.id} 
                      onClick={() => navigate(`/mall/${store.id}`)}
                      style={{ 
                        minWidth: '220px', 
                        background: 'rgba(255,255,255,0.1)', 
                        borderRadius: '24px', 
                        padding: '1.5rem', 
                        border: '1px solid rgba(255,255,255,0.15)',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      className="h-card"
                    >
                      <div style={{ fontSize: '2.5rem', marginBottom: '1rem', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '16px' }}>
                        {getStoreIcon(store.store_type)}
                      </div>
                      <h4 style={{ color: 'white', fontSize: '1.1rem', margin: '0 0 8px 0', fontWeight: '800' }}>{store.store_name}</h4>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '0.9rem' }}>⭐ {storeReviewStats[store.id]?.average || '5.0'}</span>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>{getStoreTypeLabel(store.store_type)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 猜你喜欢 */}
            {recommendedStores.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2 style={{ color: 'white', fontSize: '1.8rem', fontWeight: '950', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    ✨ {uiT.guessYouLike}
                  </h2>
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', paddingBottom: '1rem' }} className="h-scroll">
                  {recommendedStores.map(store => (
                    <div 
                      key={store.id} 
                      onClick={() => navigate(`/mall/${store.id}`)}
                      style={{ 
                        minWidth: '220px', 
                        background: 'rgba(255,255,255,0.1)', 
                        borderRadius: '24px', 
                        padding: '1.5rem', 
                        border: '1px solid rgba(255,255,255,0.15)',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease'
                      }}
                      className="h-card"
                    >
                      <div style={{ fontSize: '2.5rem', marginBottom: '1rem', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '16px' }}>
                        {getStoreIcon(store.store_type)}
                      </div>
                      <h4 style={{ color: 'white', fontSize: '1.1rem', margin: '0 0 8px 0', fontWeight: '800' }}>{store.store_name}</h4>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '0.9rem' }}>⭐ {storeReviewStats[store.id]?.average || '5.0'}</span>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>{getStoreTypeLabel(store.store_type)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <style>{`
              .h-scroll::-webkit-scrollbar { height: 4px; }
              .h-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); borderRadius: 10px; }
              .h-card:hover { transform: translateY(-5px); background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.3); }
            `}</style>

            <h2 style={{ color: 'white', fontSize: '1.8rem', fontWeight: '950', display: 'flex', alignItems: 'center', gap: '12px', marginTop: '1rem' }}>
              🏪 {uiT.allMerchants}
            </h2>
          </div>
        )}

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
          <div>
            {/* 🚀 商品显示模式 */}
            {searchMode === 'products' && searchText.trim() ? (
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                gap: '2rem' 
              }}>
                {foundProducts.map((product: any) => {
                  const store = product.delivery_stores;
                  const storeStatus = store ? checkStoreOpenStatus(store as any) : { isOpen: true };
                  return (
                    <div 
                      key={product.id}
                      onClick={() => navigate(`/mall/${store.id}?highlight=${product.id}`)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: '24px',
                        padding: '1.5rem',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        border: '1px solid rgba(255,255,255,0.8)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-8px)'}
                      onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      <img 
                        src={product.image_url || 'https://via.placeholder.com/150'} 
                        alt={product.name} 
                        style={{ width: '100%', height: '180px', borderRadius: '16px', objectFit: 'cover' }}
                      />
                      <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: '#0f172a', marginBottom: '0.4rem' }}>{product.name}</h3>
                        <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: '1.4', height: '2.8rem', overflow: 'hidden' }}>{product.description}</p>
                        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                          <span style={{ fontSize: '1.3rem', fontWeight: '900', color: '#1e40af' }}>{Number(product.price).toLocaleString()} MMK</span>
                          {product.original_price && (
                            <span style={{ fontSize: '0.9rem', color: '#94a3b8', textDecoration: 'line-through' }}>{Number(product.original_price).toLocaleString()} MMK</span>
                          )}
                        </div>
                        {store && (
                          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.85rem' }}>
                            <span>🏪</span>
                            <span style={{ fontWeight: 'bold' }}>{store.store_name}</span>
                          </div>
                        )}
                      </div>
                      <div style={{ 
                        marginTop: 'auto', 
                        padding: '0.8rem', 
                        background: storeStatus.isOpen ? '#1e40af' : '#94a3b8', 
                        color: 'white', 
                        textAlign: 'center', 
                        borderRadius: '12px',
                        fontWeight: 'bold'
                      }}>
                        {storeStatus.isOpen ? uiT.addToCart : t.mall.closedNow}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* 🚀 店铺显示模式 (原有逻辑) */
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
                              {getStoreTypeLabel(store.store_type)}
                            </span>
                            <span style={{ 
                              background: status.isOpen ? '#dcfce7' : '#fee2e2', 
                              color: status.isOpen ? '#15803d' : '#ef4444', 
                              fontSize: '0.8rem', 
                              padding: '0.3rem 0.8rem', 
                              borderRadius: '10px', 
                              fontWeight: '800'
                            }}>
                              ● {status.isOpen ? t.mall.openNow : (status.reason === 'closed_today' ? t.mall.closedToday : (status.reason === 'vacation' ? (language === 'zh' ? '预设休假中' : 'On Vacation') : t.mall.closedNow))}
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
                          }} title={store.address}>{store.address}</span>
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
                        {status.isOpen ? uiT.visitStore : t.mall.closedToday} <span style={{ fontSize: '1.6rem' }}>{status.isOpen ? '→' : '🔒'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {!loading && (searchMode === 'stores' ? filteredStores.length === 0 : foundProducts.length === 0) && (
          <div style={{ 
            textAlign: 'center', 
            padding: '10rem 0', 
            color: 'white',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '40px',
            border: '2px dashed rgba(255, 255, 255, 0.3)'
          }}>
            <div style={{ fontSize: '7rem', marginBottom: '1.5rem', opacity: 0.8 }}>
              {searchMode === 'stores' ? '🏢' : '📦'}
            </div>
            <h3 style={{ fontSize: '1.8rem', color: 'white', fontWeight: '900' }}>
              {searchMode === 'stores' ? uiT.noStores : uiT.noProducts}
            </h3>
            <p style={{ marginTop: '0.8rem', fontSize: '1.1rem', opacity: 0.9 }}>
              {searchMode === 'stores' ? '请尝试切换其他地区或搜索关键词' : '换个关键词搜搜看吧'}
            </p>
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
