import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useResponsive } from '../hooks/useResponsive';
import { useAdminTodo } from '../contexts/AdminTodoContext';
import { bannerService, type Banner } from '../services/supabase';
import { isAbortLikeError } from '../utils/fetchError';
import { rewritePublicStorageUrl } from '../utils/supabaseBrowserUrl';

const CAROUSEL_INTERVAL_MS = 6500;

/**
 * 后台「首页」主区：待办提醒 + 公司广告轮播 + 快捷入口
 */
const AdminDashboardHome: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { isMobile } = useResponsive();
  const { counts } = useAdminTodo();
  const pendingRechargeCount = counts.pendingRecharge;
  const pendingAssignmentCount = counts.pendingAssignment;
  const pendingProductReviewCount = counts.pendingProductReview;
  const pendingDeliveryAlertsCount = counts.pendingDeliveryAlerts;
  const overdueMerchantAcceptCount = counts.overdueMerchantAccept;
  const afterSalesCount =
    counts.watchReviews + counts.waitingChats + counts.pendingRefunds;
  const pendingFinanceCashCount = counts.pendingFinanceCash;
  const pendingTotal =
    pendingRechargeCount +
    pendingAssignmentCount +
    pendingProductReviewCount +
    pendingDeliveryAlertsCount +
    overdueMerchantAcceptCount +
    afterSalesCount +
    pendingFinanceCashCount;

  const [banners, setBanners] = useState<Banner[]>([]);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselPaused, setCarouselPaused] = useState(false);

  const loadBanners = useCallback(async (signal?: { cancelled: boolean }) => {
    setBannersLoading(true);
    try {
      const data = await bannerService.getAllBanners(true);
      if (signal?.cancelled) return;
      setBanners(data);
      setCarouselIndex(0);
    } catch (e) {
      if (signal?.cancelled || isAbortLikeError(e)) return;
      setBanners([]);
    } finally {
      if (!signal?.cancelled) setBannersLoading(false);
    }
  }, []);

  useEffect(() => {
    const signal = { cancelled: false };
    void loadBanners(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [loadBanners]);

  useEffect(() => {
    if (banners.length <= 1 || carouselPaused) return;
    const id = window.setInterval(() => {
      setCarouselIndex((i) => (i + 1) % banners.length);
    }, CAROUSEL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [banners.length, carouselPaused]);

  const bannerTitle = (b: Banner) => {
    if (language === 'my') return b.burmese_title || b.title;
    return b.title;
  };

  const bannerSubtitle = (b: Banner) => (b.subtitle ? b.subtitle : '');

  const openBannerLink = (b: Banner) => {
    if (!b.link_url?.trim()) return;
    const url = b.link_url.trim();
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      window.open(`https://${url}`, '_blank', 'noopener,noreferrer');
    }
  };

  const quickLinks: {
    path: string;
    icon: string;
    labelZh: string;
    labelEn: string;
    labelMy: string;
    hintZh: string;
    hintEn: string;
    hintMy: string;
  }[] = [
    { path: '/admin/city-packages', icon: '📦', labelZh: '同城订单', labelEn: 'Orders', labelMy: 'အပြင်ဘက်အော်ဒါများ', hintZh: '分配骑手、看配送进度', hintEn: 'Assign riders and deliveries', hintMy: 'စီးနင်းသူနှင့် ပို့ဆောင်မှု' },
    { path: '/admin/merchant-ops', icon: '🛎️', labelZh: '商家监管', labelEn: 'Merchant ops', labelMy: 'ဆိုင်စောင့်ကြည့်', hintZh: '接单超时和店铺状态', hintEn: 'Accept delays and stores', hintMy: 'ဆိုင်အခြေအနေ' },
    { path: '/admin/after-sales', icon: '🎧', labelZh: '售后跟单', labelEn: 'After-sales', labelMy: 'ရောင်းချပြီး', hintZh: '评价、会话和退款', hintEn: 'Reviews, chats, refunds', hintMy: 'သုံးသပ်ချက်နှင့် ပြန်အမ်း' },
    { path: '/admin/tracking', icon: '🗺️', labelZh: '实时跟踪', labelEn: 'Tracking', labelMy: 'လမ်းကြောင်းခြေရာခံ', hintZh: '包裹位置和当前状态', hintEn: 'Parcel location and status', hintMy: 'ပါဆယ်တည်နေရာ' },
    { path: '/admin/finance', icon: '💰', labelZh: '财务管理', labelEn: 'Finance', labelMy: 'ဘဏ္ဍာရေး', hintZh: '对账和骑手现金', hintEn: 'Reconciliation and rider cash', hintMy: 'ငွေစာရင်းနှင့် ငွေသား' },
    { path: '/admin/banners', icon: '🖼️', labelZh: '页面与广告', labelEn: 'Banners', labelMy: 'ကြေညာခြင်း', hintZh: '首页横幅和页面内容', hintEn: 'Homepage banners and pages', hintMy: 'ပင်မစာမျက်နှာ ကြေညာ' },
  ];

  const qlLabel = (q: (typeof quickLinks)[0]) =>
    language === 'zh' ? q.labelZh : language === 'en' ? q.labelEn : q.labelMy;
  const qlHint = (q: (typeof quickLinks)[0]) =>
    language === 'zh' ? q.hintZh : language === 'en' ? q.hintEn : q.hintMy;

  const todayLabel = new Date().toLocaleDateString(
    language === 'zh' ? 'zh-CN' : language === 'en' ? 'en-US' : 'my-MM',
    { weekday: 'short', month: 'long', day: 'numeric' },
  );

  const activeBanner = banners.length > 0 ? banners[carouselIndex % banners.length] : null;

  return (
    <div className="admin-home">
      <header className="admin-home-head">
        <h1>{language === 'zh' ? '欢迎回来' : language === 'en' ? 'Welcome back' : 'ပြန်လည်ကြိုဆိုပါသည်'}</h1>
        <p>
          {todayLabel}
          {pendingTotal > 0
            ? language === 'zh'
              ? ` · ${pendingTotal} 项待处理`
              : language === 'en'
                ? ` · ${pendingTotal} pending`
                : ` · ${pendingTotal}`
            : ''}
        </p>
      </header>
      {(pendingRechargeCount > 0 ||
        pendingAssignmentCount > 0 ||
        pendingProductReviewCount > 0 ||
        pendingDeliveryAlertsCount > 0 ||
        overdueMerchantAcceptCount > 0 ||
        afterSalesCount > 0 ||
        pendingFinanceCashCount > 0) && (
        <div className="admin-home-alerts">
          {pendingRechargeCount > 0 && (
            <div
              role="button"
              tabIndex={0}
              className="admin-home-alert admin-home-alert--danger admin-home-alert--pulse"
              onClick={() => navigate('/admin/recharges')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') navigate('/admin/recharges');
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '1.6rem' }}>💰</span>
                <div>
                  <div className="admin-home-alert__title">
                    {language === 'zh' ? '待审核充值' : 'Pending Recharges'}
                  </div>
                  <div className="admin-home-alert__sub">
                    {language === 'zh' ? '有客户提交了充值凭证' : 'Customers submitted proof'}
                  </div>
                </div>
              </div>
              <div className="admin-home-alert__n">{pendingRechargeCount}</div>
            </div>
          )}

          {pendingAssignmentCount > 0 && (
            <div
              role="button"
              tabIndex={0}
              className="admin-home-alert admin-home-alert--info admin-home-alert--pulse"
              onClick={() => navigate('/admin/tracking')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') navigate('/admin/tracking');
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '1.6rem' }}>📦</span>
                <div>
                  <div className="admin-home-alert__title">
                    {language === 'zh' ? '待分配包裹' : 'Pending Assignment'}
                  </div>
                  <div className="admin-home-alert__sub">
                    {language === 'zh' ? '有新订单等待分配骑手' : 'New orders waiting for riders'}
                  </div>
                </div>
              </div>
              <div className="admin-home-alert__n">{pendingAssignmentCount}</div>
            </div>
          )}

          {pendingDeliveryAlertsCount > 0 && (
            <div
              role="button"
              tabIndex={0}
              className="admin-home-alert admin-home-alert--danger admin-home-alert--pulse"
              onClick={() => navigate('/admin/delivery-alerts')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') navigate('/admin/delivery-alerts');
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '1.6rem' }}>🚨</span>
                <div>
                  <div className="admin-home-alert__title">
                    {language === 'zh'
                      ? '待处理配送警报'
                      : language === 'en'
                        ? 'Pending delivery alerts'
                        : 'Pending alerts'}
                  </div>
                  <div className="admin-home-alert__sub">
                    {language === 'zh'
                      ? '有新的骑手异常警报需处理'
                      : language === 'en'
                        ? 'Courier alerts need attention'
                        : 'Tap to review'}
                  </div>
                </div>
              </div>
              <div className="admin-home-alert__n">{pendingDeliveryAlertsCount}</div>
            </div>
          )}

          {overdueMerchantAcceptCount > 0 && (
            <div
              role="button"
              tabIndex={0}
              className="admin-home-alert admin-home-alert--warn admin-home-alert--pulse"
              onClick={() => navigate('/admin/merchant-ops?tab=overdue')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') navigate('/admin/merchant-ops?tab=overdue');
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '1.6rem' }}>🛎️</span>
                <div>
                  <div className="admin-home-alert__title">
                    {language === 'zh'
                      ? '商家待接单超时'
                      : language === 'en'
                        ? 'Merchant accept overdue'
                        : 'ဆိုင်လက်ခံကျော်'}
                  </div>
                  <div className="admin-home-alert__sub">
                    {language === 'zh'
                      ? '有店铺的待确认订单已超过 10 分钟，请打开今日商家监管'
                      : language === 'en'
                        ? 'Open merchant ops watch for 待确认 older than 10 minutes'
                        : '၁၀ မိနစ်ကျော် အော်ဒါ'}
                  </div>
                </div>
              </div>
              <div className="admin-home-alert__n">{overdueMerchantAcceptCount}</div>
            </div>
          )}

          {pendingFinanceCashCount > 0 && (
            <div
              role="button"
              tabIndex={0}
              className="admin-home-alert admin-home-alert--warn admin-home-alert--pulse"
              onClick={() => navigate('/admin/finance?tab=cash_collection')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  navigate('/admin/finance?tab=cash_collection');
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '1.6rem' }}>💰</span>
                <div>
                  <div className="admin-home-alert__title">
                    {language === 'zh'
                      ? '往日骑手现金未结清'
                      : language === 'en'
                        ? 'Prior rider cash unsettled'
                        : 'ယခင်ရက် ငွေမရှင်းရသေး'}
                  </div>
                  <div className="admin-home-alert__sub">
                    {language === 'zh'
                      ? '打开财务管理 → 当日收款管理，核对骑手上缴现金'
                      : language === 'en'
                        ? 'Open Finance → Daily collection to settle rider cash'
                        : 'ဘဏ္ဍာရေး → ယနေ့ငွေကောက်ယူမှု'}
                  </div>
                </div>
              </div>
              <div className="admin-home-alert__n">{pendingFinanceCashCount}</div>
            </div>
          )}

          {afterSalesCount > 0 && (
            <div
              role="button"
              tabIndex={0}
              className="admin-home-alert admin-home-alert--warn admin-home-alert--pulse"
              onClick={() => navigate('/admin/after-sales')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') navigate('/admin/after-sales');
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '1.6rem' }}>🎧</span>
                <div>
                  <div className="admin-home-alert__title">
                    {language === 'zh' ? '售后待跟' : 'After-sales follow-up'}
                  </div>
                  <div className="admin-home-alert__sub">
                    {language === 'zh'
                      ? '低分评价、待回复会话或待跟退款'
                      : 'Low reviews, waiting chats, or pending refunds'}
                  </div>
                </div>
              </div>
              <div className="admin-home-alert__n">{afterSalesCount}</div>
            </div>
          )}

          {pendingProductReviewCount > 0 && (
            <div
              role="button"
              tabIndex={0}
              className="admin-home-alert admin-home-alert--warn admin-home-alert--pulse"
              onClick={() => navigate('/admin/product-reviews')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') navigate('/admin/product-reviews');
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '1.6rem' }}>🛍️</span>
                <div>
                  <div className="admin-home-alert__title">
                    {language === 'zh'
                      ? '待审核商品'
                      : language === 'en'
                        ? 'Products to review'
                        : 'စစ်ဆေးရန် ကုန်ပစ္စည်းများ'}
                  </div>
                  <div className="admin-home-alert__sub">
                    {language === 'zh'
                      ? '商家提交了新品或改价，请在商品审核工作台处理'
                      : language === 'en'
                        ? 'Open the product review queue'
                        : 'ကုန်သည်မှ ကုန်ပစ္စည်းအသစ်'}
                  </div>
                </div>
              </div>
              <div className="admin-home-alert__n">{pendingProductReviewCount}</div>
            </div>
          )}
        </div>
      )}

      {pendingTotal === 0 ? (
        <p className="admin-home-clear">
          {language === 'zh' ? '今天没有待办' : language === 'en' ? 'Nothing pending today' : 'ယနေ့လုပ်စရာမရှိ'}
        </p>
      ) : null}

      {/* 公司广告轮播（与「页面管理」banners 表同步） */}
      <div
        className="admin-home-promo-slot"
        onMouseEnter={() => setCarouselPaused(true)}
        onMouseLeave={() => setCarouselPaused(false)}
      >
        {bannersLoading ? (
          <div className="admin-home-empty admin-home-promo--loading">
            {language === 'zh' ? '加载广告…' : language === 'en' ? 'Loading…' : 'ဆောင်ရွက်နေ…'}
          </div>
        ) : banners.length === 0 ? (
          <div className="admin-home-empty admin-home-promo--empty">
            <div className="admin-home-promo__copy">
              <strong>
                {language === 'zh'
                  ? '还没有启用中的首页广告'
                  : language === 'en'
                    ? 'No active homepage promo'
                    : 'ကြေညာမရှိသေးပါ'}
              </strong>
              <p>
                {language === 'zh'
                  ? '需要展示时，到页面管理里上传并启用，这里会自动轮播。'
                  : language === 'en'
                    ? 'Upload and enable a banner in Page management to show it here.'
                    : 'ကြေညာထည့်ပြီး ဖွင့်ထားမှ ဒီမှာပေါ်မည်။'}
              </p>
            </div>
            <button type="button" className="admin-home-promo__btn" onClick={() => navigate('/admin/banners')}>
              {language === 'zh' ? '去配置' : language === 'en' ? 'Manage' : 'စီမံရန်'}
            </button>
          </div>
        ) : (
          <div
            style={{
              position: 'relative',
              borderRadius: 20,
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.14)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
              minHeight: isMobile ? 150 : 198,
            }}
          >
            <div
              key={activeBanner?.id ?? carouselIndex}
              style={{
                animation: 'admin-home-fade 0.5s ease-out',
                position: 'relative',
                minHeight: isMobile ? 150 : 198,
                background: activeBanner?.image_url
                  ? '#0f172a'
                  : `linear-gradient(135deg, ${activeBanner?.bg_color_start ?? '#1e40af'}, ${activeBanner?.bg_color_end ?? '#3b82f6'})`,
              }}
            >
              {activeBanner?.image_url ? (
                <img
                  src={rewritePublicStorageUrl(activeBanner.image_url)}
                  alt=""
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: 0.92,
                  }}
                />
              ) : null}
              <div
                style={{
                  position: 'relative',
                  zIndex: 1,
                  padding: isMobile ? '18px 16px 52px' : '24px 28px 56px 28px',
                  background: activeBanner?.image_url
                    ? 'linear-gradient(90deg, rgba(15,23,42,0.88) 0%, rgba(15,23,42,0.45) 55%, transparent 100%)'
                    : undefined,
                  minHeight: isMobile ? 150 : 198,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: isMobile ? '1.15rem' : '1.45rem',
                    fontWeight: 900,
                    color: '#fff',
                    textShadow: '0 2px 16px rgba(0,0,0,0.35)',
                    lineHeight: 1.25,
                    maxWidth: 560,
                  }}
                >
                  {activeBanner ? bannerTitle(activeBanner) : ''}
                </div>
                {activeBanner && bannerSubtitle(activeBanner) ? (
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: '0.88rem',
                      color: 'rgba(255,255,255,0.9)',
                      maxWidth: 480,
                      lineHeight: 1.45,
                      textShadow: '0 1px 8px rgba(0,0,0,0.35)',
                    }}
                  >
                    {bannerSubtitle(activeBanner)}
                  </div>
                ) : null}
                {activeBanner?.link_url ? (
                  <button
                    type="button"
                    onClick={() => openBannerLink(activeBanner)}
                    style={{
                      alignSelf: 'flex-start',
                      marginTop: 14,
                      padding: '8px 16px',
                      borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.5)',
                      background: 'rgba(255,255,255,0.15)',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                    }}
                  >
                    {language === 'zh' ? '查看详情 →' : language === 'en' ? 'Open link →' : 'リンク →'}
                  </button>
                ) : null}
              </div>
            </div>

            {banners.length > 1 ? (
              <>
                <button
                  type="button"
                  aria-label="Previous"
                  onClick={() => setCarouselIndex((i) => (i - 1 + banners.length) % banners.length)}
                  style={{
                    position: 'absolute',
                    left: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    border: '1px solid rgba(255,255,255,0.25)',
                    background: 'rgba(15,23,42,0.55)',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    lineHeight: 1,
                    zIndex: 3,
                  }}
                >
                  ‹
                </button>
                <button
                  type="button"
                  aria-label="Next"
                  onClick={() => setCarouselIndex((i) => (i + 1) % banners.length)}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    border: '1px solid rgba(255,255,255,0.25)',
                    background: 'rgba(15,23,42,0.55)',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    lineHeight: 1,
                    zIndex: 3,
                  }}
                >
                  ›
                </button>
                <div
                  style={{
                    position: 'absolute',
                    bottom: 12,
                    left: 0,
                    right: 0,
                    display: 'flex',
                    justifyContent: 'center',
                    gap: 6,
                    zIndex: 3,
                  }}
                >
                  {banners.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Slide ${i + 1}`}
                      onClick={() => setCarouselIndex(i)}
                      style={{
                        width: i === carouselIndex ? 22 : 8,
                        height: 8,
                        borderRadius: 4,
                        border: 'none',
                        padding: 0,
                        background:
                          i === carouselIndex ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.35)',
                        cursor: 'pointer',
                        transition: 'width 0.2s ease',
                      }}
                    />
                  ))}
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>

      <div className="admin-home-quick-wrap">
        <div className="admin-home-section-label">
          {language === 'zh' ? '常用入口' : language === 'en' ? 'Shortcuts' : 'အမြန်ဝင်ပေါက်'}
        </div>
        <div className="admin-home-quick">
          {quickLinks.map((q) => (
            <button key={q.path} type="button" onClick={() => navigate(q.path)}>
              <span className="admin-home-quick__icon" aria-hidden>{q.icon}</span>
              <span>
                <span className="admin-home-quick__title">{qlLabel(q)}</span>
                <span className="admin-home-quick__hint">{qlHint(q)}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardHome;
