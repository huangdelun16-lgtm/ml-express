import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { merchantService, deliveryStoreService, Product, DeliveryStore } from '../services/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useCart, CartItem } from '../contexts/CartContext';
import NavigationBar from '../components/home/NavigationBar';
import LoggerService from '../services/LoggerService';

const PIECE_REMARK_LABELS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

function pieceRemarkPrefix(index: number): string {
  return PIECE_REMARK_LABELS[index] ?? `${index + 1}.`;
}

function padLineRemarks(arr: string[], length: number): string[] {
  const next = arr.slice(0, length);
  while (next.length < length) next.push('');
  return next;
}

const StoreProductsPage: React.FC = () => {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage, t } = useLanguage();
  const { addToCart, updateCartItemDetails, cartCount, cartItems } = useCart();

  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<DeliveryStore | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [lineRemarks, setLineRemarks] = useState<Record<string, string[]>>({});
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProductDetail, setSelectedProductDetail] = useState<Product | null>(null);
  const [detailRemarks, setDetailRemarks] = useState<string[]>(['']);
  const [detailQty, setDetailQty] = useState(1);
  const [detailOpenedFromCart, setDetailOpenedFromCart] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'ok' | 'warn' } | null>(null);

  const productRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const showToast = (message: string, type: 'ok' | 'warn' = 'ok') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 2000);
  };

  const loadStoreData = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const [storeData, productsData] = await Promise.all([
        deliveryStoreService.getStoreById(storeId),
        merchantService.getPublicStoreProducts(storeId),
      ]);
      setStore(storeData);
      setProducts(productsData);

      const params = new URLSearchParams(location.search);
      const highlightId = params.get('highlight');
      if (highlightId) {
        setItemQuantities((prev) => ({ ...prev, [highlightId]: 1 }));
        window.setTimeout(() => {
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

  const maxSelectableStock = (p: Product | null) => {
    if (!p) return 99999;
    if (p.stock === -1) return 99999;
    return Math.max(0, p.stock ?? 0);
  };

  const updateItemQuantity = (id: string, delta: number) => {
    setItemQuantities((prev) => {
      const newQ = Math.max(0, (prev[id] || 0) + delta);
      setLineRemarks((lr) => {
        if (newQ === 0) {
          const next = { ...lr };
          delete next[id];
          return next;
        }
        const prevLines = lr[id];
        const padded = prevLines ? padLineRemarks(prevLines, newQ) : Array(newQ).fill('');
        return { ...lr, [id]: padded };
      });
      return { ...prev, [id]: newQ };
    });
  };

  const remarkForProductId = (id: string): string[] | undefined => {
    if (!Object.prototype.hasOwnProperty.call(lineRemarks, id)) return undefined;
    const q = itemQuantities[id] || 0;
    if (q <= 0) return undefined;
    const padded = padLineRemarks(lineRemarks[id], q);
    if (!padded.some((r) => r.trim())) return undefined;
    return padded;
  };

  const otherStoreConflict = (): boolean =>
    Boolean(
      storeId &&
        cartItems.length > 0 &&
        cartItems[0].store_id &&
        cartItems[0].store_id !== storeId
    );

  const confirmReplaceOtherStore = (): boolean => {
    if (!otherStoreConflict()) return true;
    return window.confirm(`${t.store.clearCartDialogTitle}\n\n${t.store.clearCartDialogMessage}`);
  };

  const handleOpenProductDetail = (product: Product, cartLine?: CartItem | null) => {
    const cap = maxSelectableStock(product);

    if (cartLine) {
      setDetailOpenedFromCart(true);
      let q = cartLine.quantity;
      if (cap > 0 && cap !== 99999) q = Math.min(q, cap);
      if (cap === 0) q = 1;
      q = Math.max(1, q);
      let base: string[] = [];
      if (cartLine.customer_remarks && cartLine.customer_remarks.length > 0) {
        base = [...cartLine.customer_remarks];
      } else if (cartLine.customer_remark?.trim()) {
        base = [cartLine.customer_remark.trim()];
      }
      setDetailRemarks(padLineRemarks(base, q));
      setDetailQty(q);
      setSelectedProductDetail(product);
      setShowDetailModal(true);
      return;
    }

    setDetailOpenedFromCart(false);
    const gridQ = itemQuantities[product.id] || 0;
    let q = gridQ > 0 ? gridQ : 1;
    if (cap > 0 && cap !== 99999) q = Math.min(q, cap);
    if (cap === 0) q = 1;
    q = Math.max(1, q);
    const existing = lineRemarks[product.id];
    const base = Array.isArray(existing) ? [...existing] : [];
    setDetailRemarks(padLineRemarks(base, q));
    setDetailQty(q);
    setSelectedProductDetail(product);
    setShowDetailModal(true);
  };

  const adjustDetailQty = (nextQty: number) => {
    const n = Math.max(1, nextQty);
    setDetailQty(n);
    setDetailRemarks((prev) => {
      if (prev.length > n) return prev.slice(0, n);
      if (prev.length < n) return [...prev, ...Array(n - prev.length).fill('')];
      return prev;
    });
  };

  const detailStockCap = maxSelectableStock(selectedProductDetail);
  const detailQtyPlusDisabled =
    detailStockCap === 0 || (detailStockCap !== 99999 && detailQty >= detailStockCap);
  const detailAddDisabled =
    !selectedProductDetail ||
    (selectedProductDetail.stock !== -1 && (selectedProductDetail.stock ?? 0) <= 0);

  useEffect(() => {
    if (loading || products.length === 0 || !storeId) return;
    const params = new URLSearchParams(location.search);
    const openId = params.get('openDetail');
    if (!openId) return;

    const product = products.find((p) => p.id === openId);
    if (!product) {
      params.delete('openDetail');
      const qs = params.toString();
      navigate(`/mall/${storeId}${qs ? `?${qs}` : ''}`, { replace: true });
      return;
    }
    if (!product.is_available) {
      showToast(
        language === 'zh' ? '商品已下架' : language === 'en' ? 'This item is unavailable' : t.store.unavailable,
        'warn'
      );
      params.delete('openDetail');
      const qs = params.toString();
      navigate(`/mall/${storeId}${qs ? `?${qs}` : ''}`, { replace: true });
      return;
    }

    const cartLine = cartItems.find((c) => c.id === openId) ?? null;
    handleOpenProductDetail(product, cartLine);

    params.delete('openDetail');
    const qs = params.toString();
    navigate(`/mall/${storeId}${qs ? `?${qs}` : ''}`, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, products, location.search, storeId, cartItems.length]);

  const handleDetailSubmit = () => {
    if (!selectedProductDetail) return;
    const pid = selectedProductDetail.id;
    if (detailStockCap === 0) {
      showToast(t.store.outOfStock, 'warn');
      return;
    }
    const qty = detailStockCap === 99999 ? detailQty : Math.min(detailQty, detailStockCap);
    const padded = padLineRemarks(detailRemarks, qty);
    const fromCart = detailOpenedFromCart;
    setDetailOpenedFromCart(false);

    if (fromCart) {
      updateCartItemDetails(pid, qty, padded);
      showToast(t.store.cartUpdated);
    } else {
      setLineRemarks((prev) => {
        const next = { ...prev };
        if (padded.some((r) => r.trim())) next[pid] = padded;
        else delete next[pid];
        return next;
      });
      setItemQuantities((prev) => ({ ...prev, [pid]: qty }));
      showToast(t.store.detailSelectionSaved);
    }
    setShowDetailModal(false);
    setSelectedProductDetail(null);
  };

  const handleAddToCart = (product: Product) => {
    if (!currentUser) {
      alert(
        language === 'zh'
          ? '请先登录后再加入购物车'
          : language === 'en'
            ? 'Please login first to add items'
            : 'ခြင်းထဲသို့ထည့်ရန် အရင်ဝင်ပါ'
      );
      return;
    }

    const status = checkStoreOpenStatus();
    if (!status.isOpen) {
      alert(language === 'zh' ? '该商户目前已打烊，无法下单' : 'Merchant is currently closed');
      return;
    }
    const qty = itemQuantities[product.id] || 0;
    if (qty <= 0) return;
    if (!confirmReplaceOtherStore()) return;

    addToCart(product, qty, remarkForProductId(product.id));
    setItemQuantities((prev) => ({ ...prev, [product.id]: 0 }));
    setLineRemarks((prev) => {
      const next = { ...prev };
      delete next[product.id];
      return next;
    });
    showToast(t.store.addedToCart);
  };

  const handleBulkAddToCart = () => {
    if (!currentUser) {
      alert(
        language === 'zh'
          ? '请先登录后再加入购物车'
          : language === 'en'
            ? 'Please login first to add items'
            : 'ခြင်းထဲသို့ထည့်ရန် အရင်ဝင်ပါ'
      );
      return;
    }

    const status = checkStoreOpenStatus();
    if (!status.isOpen) {
      alert(language === 'zh' ? '该商户目前已打烊，无法下单' : 'Merchant is currently closed');
      return;
    }

    const selectedItems = products.filter((p) => (itemQuantities[p.id] || 0) > 0);
    if (selectedItems.length === 0) {
      alert(
        language === 'zh'
          ? '请先选择商品数量'
          : language === 'en'
            ? 'Please select quantity first'
            : 'အရေအတွက် အရင်ရွေးချယ်ပါ'
      );
      return;
    }

    if (!confirmReplaceOtherStore()) return;

    selectedItems.forEach((product) => {
      addToCart(product, itemQuantities[product.id], remarkForProductId(product.id));
    });

    setItemQuantities({});
    setLineRemarks({});
    showToast(t.store.addedToCart);
  };

  const checkStoreOpenStatus = () => {
    if (!store) return { isOpen: true };
    if (store.is_closed_today) return { isOpen: false, reason: 'closed_today' };

    if (store.vacation_dates && Array.isArray(store.vacation_dates)) {
      const today = new Date().toISOString().split('T')[0];
      if (store.vacation_dates.includes(today)) {
        return { isOpen: false, reason: 'vacation' };
      }
    }

    try {
      const hours = store.operating_hours || '09:00 - 21:00';
      const parts = hours.split(/\s*-\s*/);
      if (parts.length < 2) return { isOpen: true, reason: 'parse_error' };
      const [start, end] = parts;

      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();

      const [startHour, startMin] = start.split(':').map(Number);
      const [endHour, endMin] = end.split(':').map(Number);

      const startTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;

      if (startTime <= endTime) {
        if (currentTime >= startTime && currentTime <= endTime) {
          return { isOpen: true, reason: 'open' };
        }
      } else {
        if (currentTime >= startTime || currentTime <= endTime) {
          return { isOpen: true, reason: 'open' };
        }
      }
      return { isOpen: false, reason: 'outside_hours' };
    } catch {
      return { isOpen: true };
    }
  };

  const homeBackground =
    'linear-gradient(to right top, #b0d3e8, #a2c3d6, #93b4c5, #86a4b4, #7895a3, #6c90a3, #618ca3, #5587a4, #498ab6, #428cc9, #468dda, #558cea)';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: homeBackground,
        backgroundAttachment: 'fixed',
      }}
    >
      <div
        style={{
          padding: '1rem 2rem 0',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
          paddingBottom: '3rem',
        }}
      >
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
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
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
                  backdropFilter: 'blur(10px)',
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>←</span> {t.store.back}
              </button>

              {store && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div
                    style={{
                      width: '80px',
                      height: '80px',
                      background: 'white',
                      borderRadius: '24px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      fontSize: '2.5rem',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                    }}
                  >
                    🏪
                  </div>
                  <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '900', textShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                      {store.store_name}
                    </h1>
                    <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem' }}>
                      <span
                        style={{
                          background: '#fbbf24',
                          color: '#92400e',
                          padding: '0.2rem 0.8rem',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: 'bold',
                        }}
                      >
                        {(() => {
                          const type = store.store_type;
                          const mapping: any = {
                            restaurant: { zh: '餐厅', en: 'Dining', my: 'စားသောက်ဆိုင်' },
                            drinks_snacks: { zh: '饮料小吃', en: 'Snacks', my: 'မုန့်မျိုးစုံ' },
                            breakfast: { zh: '早点铺', en: 'Breakfast', my: 'မနက်စာဆိုင်' },
                            cake_shop: { zh: '蛋糕店', en: 'Cake Shop', my: 'ကိတ်မုန့်ဆိုင်' },
                            tea_shop: { zh: '茶铺', en: 'Tea', my: 'လက်ဖက်ရည်ဆိုင်' },
                            flower_shop: { zh: '鲜花店', en: 'Flowers', my: 'ပန်းဆိုင်' },
                            clothing_store: { zh: '服装店', en: 'Clothing', my: 'အဝတ်အထည်ဆိုင်' },
                            grocery: { zh: '杂货店', en: 'Grocery', my: 'ကုန်စုံဆိုင်' },
                            hardware_store: { zh: '五金店', en: 'Hardware', my: 'ဟာ့ဒ်ဝဲလ်ဆိုင်' },
                            supermarket: { zh: '超市', en: 'Supermarket', my: 'စူပါမားကတ်' },
                            transit_station: { zh: '中转站', en: 'Hub', my: 'အချက်အချာဌာန' },
                            other: { zh: '其它', en: 'Other', my: 'အခြား' },
                          };
                          return mapping[type]?.[language] || mapping[type]?.zh || type;
                        })()}
                      </span>
                      {(() => {
                        const status = checkStoreOpenStatus();
                        return (
                          <span
                            style={{
                              background: status.isOpen ? '#10b981' : '#ef4444',
                              color: 'white',
                              padding: '0.2rem 0.8rem',
                              borderRadius: '8px',
                              fontSize: '0.8rem',
                              fontWeight: 'bold',
                            }}
                          >
                            ●{' '}
                            {status.isOpen
                              ? t.store.openNow
                              : status.reason === 'closed_today'
                                ? t.store.closedToday
                                : status.reason === 'vacation'
                                  ? language === 'zh'
                                    ? '预设休假中'
                                    : 'On Vacation'
                                  : t.store.closedNow}
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
                  fontWeight: 900,
                  fontSize: '1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.8rem',
                  boxShadow: '0 15px 30px rgba(16, 185, 129, 0.3)',
                  transition: 'all 0.3s ease',
                }}
                onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-5px)')}
                onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
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
                  fontWeight: 900,
                  fontSize: '1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.8rem',
                  boxShadow: '0 15px 30px rgba(0,0,0,0.15)',
                  transition: 'all 0.3s ease',
                }}
                onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-5px)')}
                onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <span style={{ fontSize: '1.5rem' }}>🛒</span> {t.store.cart}
                <span
                  style={{
                    background: '#ef4444',
                    color: 'white',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '50px',
                    fontSize: '0.9rem',
                  }}
                >
                  {cartCount}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '-2rem auto 4rem', padding: '0 1rem', position: 'relative', zIndex: 20 }}>
        {loading ? (
          <div
            style={{
              textAlign: 'center',
              padding: '8rem 0',
              background: 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(10px)',
              borderRadius: '32px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            }}
          >
            <div
              className="spinner"
              style={{
                width: '40px',
                height: '40px',
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 1rem',
              }}
            />
            <p style={{ color: '#64748b', fontWeight: 'bold' }}>{t.store.loading}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', alignItems: 'start' }}>
            <div>
              <p
                style={{
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: '0.9rem',
                  marginBottom: '1rem',
                  fontWeight: 600,
                }}
              >
                {language === 'zh'
                  ? '点击商品卡片可查看详情、备注与数量（与 App 一致）'
                  : language === 'en'
                    ? 'Tap a product card for details, notes & quantity (same as the app).'
                    : 'ကုန်ပစ္စည်းကတ်ကို နှိပ်ကြည့်ပါ။'}
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '1.5rem',
                }}
              >
                {products.map((product: Product) => {
                  const qty = itemQuantities[product.id] || 0;
                  const isHighlighted = new URLSearchParams(location.search).get('highlight') === product.id;
                  const available = product.is_available;

                  return (
                    <div
                      key={product.id}
                      ref={(el) => {
                        productRefs.current[product.id] = el;
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && available) handleOpenProductDetail(product);
                      }}
                      onClick={() => available && handleOpenProductDetail(product)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: '24px',
                        overflow: 'hidden',
                        boxShadow: isHighlighted
                          ? '0 0 0 3px #3b82f6, 0 15px 30px rgba(59, 130, 246, 0.2)'
                          : '0 8px 16px rgba(0,0,0,0.03)',
                        border: '1px solid rgba(255,255,255,0.8)',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'all 0.3s ease',
                        transform: isHighlighted ? 'scale(1.02)' : 'none',
                        cursor: available ? 'pointer' : 'not-allowed',
                        opacity: available ? 1 : 0.92,
                      }}
                      onMouseOver={(e) => {
                        if (!isHighlighted && available) {
                          e.currentTarget.style.transform = 'translateY(-6px)';
                          e.currentTarget.style.boxShadow = '0 15px 30px rgba(0,0,0,0.08)';
                          e.currentTarget.style.background = '#ffffff';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (!isHighlighted) {
                          e.currentTarget.style.transform = isHighlighted ? 'scale(1.02)' : 'translateY(0)';
                          e.currentTarget.style.boxShadow = isHighlighted
                            ? '0 0 0 3px #3b82f6, 0 15px 30px rgba(59, 130, 246, 0.2)'
                            : '0 8px 16px rgba(0,0,0,0.03)';
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
                        }
                      }}
                    >
                      <div style={{ height: '180px', background: '#f8fafc', position: 'relative' }}>
                        {product.image_url && !product.image_url.startsWith('file://') ? (
                          <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div
                            style={{
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              fontSize: '3rem',
                              background: '#eff6ff',
                            }}
                          >
                            📦
                          </div>
                        )}
                        {!available && (
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              background: 'rgba(15,23,42,0.55)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontWeight: 900,
                              fontSize: '1rem',
                            }}
                          >
                            {t.store.unavailable}
                          </div>
                        )}
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '0.8rem',
                            right: '0.8rem',
                            background: 'rgba(255,255,255,0.9)',
                            padding: '0.4rem 0.8rem',
                            borderRadius: '10px',
                            fontSize: '0.75rem',
                            fontWeight: 900,
                            color: '#1e40af',
                            backdropFilter: 'blur(4px)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            border: '1px solid #e0e7ff',
                          }}
                        >
                          {t.store.stock}: {product.stock === -1 ? t.store.infinite : product.stock}
                        </div>
                      </div>

                      <div style={{ padding: '1.2rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.4rem' }}>{product.name}</h3>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
                          <span style={{ color: '#10b981', fontSize: '1.3rem', fontWeight: 900 }}>{product.price.toLocaleString()} MMK</span>
                          {product.original_price && product.original_price > product.price && (
                            <span style={{ fontSize: '0.95rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                              {product.original_price.toLocaleString()} MMK
                            </span>
                          )}
                        </div>

                        {available && (
                          <div style={{ marginTop: 'auto' }}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                marginBottom: '0.2rem',
                                justifyContent: 'center',
                                background: '#f1f5f9',
                                padding: '0.4rem',
                                borderRadius: '14px',
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => updateItemQuantity(product.id, -1)}
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '10px',
                                  border: 'none',
                                  background: 'white',
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                  fontSize: '1.2rem',
                                  fontWeight: 'bold',
                                  color: '#1e40af',
                                }}
                              >
                                -
                              </button>
                              <span style={{ fontWeight: 900, minWidth: '25px', textAlign: 'center', fontSize: '1.1rem', color: '#0f172a' }}>
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateItemQuantity(product.id, 1)}
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '10px',
                                  border: 'none',
                                  background: 'white',
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                  fontSize: '1.2rem',
                                  fontWeight: 'bold',
                                  color: '#1e40af',
                                }}
                              >
                                +
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToCart(product);
                              }}
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
                                cursor: 'pointer',
                              }}
                            >
                              {t.store.addToCart}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {products.length === 0 && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '10rem 0',
                    background: 'rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '40px',
                    border: '2px dashed rgba(255,255,255,0.3)',
                  }}
                >
                  <div style={{ fontSize: '6rem', marginBottom: '1.5rem', opacity: 0.8 }}>🧺</div>
                  <h3 style={{ fontSize: '1.8rem', color: 'white', fontWeight: 900 }}>{t.store.noProducts}</h3>
                </div>
              )}
            </div>

            <div style={{ position: 'sticky', top: '2rem' }}>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '30px',
                  padding: '2.5rem',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                  border: '1px solid rgba(255,255,255,0.8)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <h2
                  style={{
                    fontSize: '1.4rem',
                    fontWeight: 900,
                    color: '#0f172a',
                    marginBottom: '2rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.8rem',
                  }}
                >
                  <span style={{ fontSize: '1.8rem' }}>ℹ️</span> {t.store.merchantInfo}
                </h2>
                {store && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
                    <div style={{ borderBottom: '1px solid rgba(30, 64, 175, 0.05)', paddingBottom: '1.5rem' }}>
                      <p
                        style={{
                          color: '#1e40af',
                          fontSize: '0.9rem',
                          fontWeight: 900,
                          textTransform: 'uppercase',
                          marginBottom: '0.6rem',
                          letterSpacing: '1px',
                        }}
                      >
                        {t.store.address}
                      </p>
                      <p style={{ color: '#334155', fontSize: '1rem', lineHeight: 1.6, fontWeight: 500 }}>{store.address}</p>
                    </div>
                    <div style={{ borderBottom: '1px solid rgba(30, 64, 175, 0.05)', paddingBottom: '1.5rem' }}>
                      <p
                        style={{
                          color: '#1e40af',
                          fontSize: '0.9rem',
                          fontWeight: 900,
                          textTransform: 'uppercase',
                          marginBottom: '0.6rem',
                          letterSpacing: '1px',
                        }}
                      >
                        {t.store.contact}
                      </p>
                      <p style={{ color: '#0f172a', fontSize: '1.3rem', fontWeight: 900 }}>{store.phone}</p>
                    </div>
                    <div>
                      <p
                        style={{
                          color: '#1e40af',
                          fontSize: '0.9rem',
                          fontWeight: 900,
                          textTransform: 'uppercase',
                          marginBottom: '0.6rem',
                          letterSpacing: '1px',
                        }}
                      >
                        {t.store.hours}
                      </p>
                      <p style={{ color: '#334155', fontSize: '1.1rem', fontWeight: 700 }}>{store.operating_hours || '09:00 - 21:00'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showDetailModal && selectedProductDetail && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.55)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => {
            setDetailOpenedFromCart(false);
            setShowDetailModal(false);
            setSelectedProductDetail(null);
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '24px',
              width: '100%',
              maxWidth: 460,
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ position: 'relative', height: 220, background: '#f1f5f9', flexShrink: 0 }}>
              {selectedProductDetail.image_url && !selectedProductDetail.image_url.startsWith('file://') ? (
                <img src={selectedProductDetail.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem' }}>
                  📦
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setDetailOpenedFromCart(false);
                  setShowDetailModal(false);
                  setSelectedProductDetail(null);
                }}
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  border: 'none',
                  background: 'rgba(0,0,0,0.35)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ overflowY: 'auto', padding: '1.25rem 1.5rem', flex: 1 }}>
              <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.35rem', fontWeight: 900, color: '#0f172a' }}>{selectedProductDetail.name}</h2>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: '1rem', flexWrap: 'wrap' }}>
                <span style={{ color: '#10b981', fontSize: '1.35rem', fontWeight: 900 }}>{selectedProductDetail.price.toLocaleString()} MMK</span>
                {selectedProductDetail.original_price && selectedProductDetail.original_price > selectedProductDetail.price && (
                  <span style={{ color: '#94a3b8', textDecoration: 'line-through', fontSize: '1rem' }}>
                    {selectedProductDetail.original_price.toLocaleString()} MMK
                  </span>
                )}
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontWeight: 800, color: '#334155', marginBottom: 6 }}>{t.store.description}</div>
                <div
                  style={{
                    background: '#f8fafc',
                    borderRadius: 14,
                    padding: '0.85rem',
                    color: '#475569',
                    fontSize: '0.95rem',
                    lineHeight: 1.55,
                    maxHeight: 140,
                    overflowY: 'auto',
                  }}
                >
                  {selectedProductDetail.description?.trim() ? selectedProductDetail.description : t.store.noDescription}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: '1rem',
                  padding: '0.65rem 0.9rem',
                  background: '#eff6ff',
                  borderRadius: 14,
                  fontWeight: 700,
                  color: '#1e40af',
                }}
              >
                📦 {t.store.stock}:{' '}
                {selectedProductDetail.stock === -1 ? t.store.infinite : selectedProductDetail.stock}
              </div>

              <div style={{ marginBottom: '0.5rem' }}>
                <div style={{ fontWeight: 800, color: '#334155', marginBottom: 6 }}>{t.store.itemRemark}</div>
                {detailQty >= 2 ? (
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 8 }}>{t.store.itemRemarkMultiHint}</div>
                ) : null}
                {detailRemarks.map((row, index) => (
                  <div key={`rm-${index}`} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                    {detailQty >= 2 ? (
                      <span style={{ flexShrink: 0, fontSize: '0.95rem', paddingTop: 10 }}>{pieceRemarkPrefix(index)}</span>
                    ) : null}
                    <textarea
                      value={row}
                      onChange={(e) => {
                        const v = e.target.value;
                        setDetailRemarks((prev) => {
                          const next = [...prev];
                          next[index] = v;
                          return next;
                        });
                      }}
                      placeholder={t.store.itemRemarkPlaceholder}
                      rows={detailQty >= 2 ? 2 : 3}
                      maxLength={500}
                      style={{
                        flex: 1,
                        borderRadius: 12,
                        border: '1px solid #e2e8f0',
                        padding: '0.65rem 0.75rem',
                        fontSize: '0.95rem',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                padding: '1rem 1.5rem 1.25rem',
                borderTop: '1px solid #f1f5f9',
                background: '#fafafa',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 14 }}>
                <span style={{ fontWeight: 800, color: '#475569' }}>{t.store.quantity}</span>
                <button
                  type="button"
                  onClick={() => adjustDetailQty(detailQty - 1)}
                  disabled={detailQty <= 1}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    background: 'white',
                    cursor: detailQty <= 1 ? 'not-allowed' : 'pointer',
                    fontSize: '1.25rem',
                  }}
                >
                  −
                </button>
                <span style={{ fontWeight: 900, fontSize: '1.2rem', minWidth: 28, textAlign: 'center' }}>{detailQty}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (detailStockCap === 0) return;
                    const n =
                      detailStockCap === 99999 ? detailQty + 1 : Math.min(detailStockCap, detailQty + 1);
                    if (n > detailQty) adjustDetailQty(n);
                  }}
                  disabled={detailQtyPlusDisabled}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    background: 'white',
                    cursor: detailQtyPlusDisabled ? 'not-allowed' : 'pointer',
                    fontSize: '1.25rem',
                  }}
                >
                  +
                </button>
              </div>

              <button
                type="button"
                disabled={detailAddDisabled}
                onClick={handleDetailSubmit}
                style={{
                  width: '100%',
                  padding: '1rem',
                  borderRadius: 16,
                  border: 'none',
                  background: detailAddDisabled ? '#94a3b8' : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  color: 'white',
                  fontWeight: 900,
                  fontSize: '1.05rem',
                  cursor: detailAddDisabled ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                🛒 {t.store.addToCart}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 4000,
            background: toast.type === 'warn' ? '#b45309' : '#0f172a',
            color: 'white',
            padding: '12px 20px',
            borderRadius: 14,
            fontWeight: 700,
            boxShadow: '0 12px 28px rgba(0,0,0,0.2)',
            maxWidth: '90vw',
            textAlign: 'center',
          }}
        >
          {toast.message}
        </div>
      )}

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
