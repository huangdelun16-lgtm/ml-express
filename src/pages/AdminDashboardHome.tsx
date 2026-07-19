import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useResponsive } from '../hooks/useResponsive';
import { useAdminTodo } from '../contexts/AdminTodoContext';
import { bannerService, type Banner } from '../services/supabase';
import { isAbortLikeError } from '../utils/fetchError';

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
  const pendingTotal =
    pendingRechargeCount +
    pendingAssignmentCount +
    pendingProductReviewCount +
    pendingDeliveryAlertsCount;

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

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes pulse-alert {
        0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.4); }
        70% { transform: scale(1.02); box-shadow: 0 0 0 10px rgba(231, 76, 60, 0); }
        100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(231, 76, 60, 0); }
      }
      @keyframes admin-home-fade {
        from { opacity: 0.35; transform: scale(1.02); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes admin-shimmer {
        0% { background-position: 0% 50%; }
        100% { background-position: 200% 50%; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

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

  const totalPendingHighlight =
    pendingRechargeCount +
    pendingAssignmentCount +
    pendingProductReviewCount +
    pendingDeliveryAlertsCount;

  const quickLinks: { path: string; icon: string; labelZh: string; labelEn: string; labelMy: string }[] = [
    { path: '/admin/city-packages', icon: '📦', labelZh: '同城订单', labelEn: 'Orders', labelMy: 'အပြင်ဘက်အော်ဒါများ' },
    { path: '/admin/tracking', icon: '🗺️', labelZh: '实时跟踪', labelEn: 'Tracking', labelMy: 'လမ်းကြောင်းခြေရာခံ' },
    { path: '/admin/finance', icon: '💰', labelZh: '财务管理', labelEn: 'Finance', labelMy: 'ဘဏ္ဍာရေး' },
    { path: '/admin/banners', icon: '🖼️', labelZh: '页面与广告', labelEn: 'Banners', labelMy: 'ကြေညာခြင်း' },
  ];

  const qlLabel = (q: (typeof quickLinks)[0]) =>
    language === 'zh' ? q.labelZh : language === 'en' ? q.labelEn : q.labelMy;

  const activeBanner = banners.length > 0 ? banners[carouselIndex % banners.length] : null;

  return (
    <>
      {(pendingRechargeCount > 0 ||
        pendingAssignmentCount > 0 ||
        pendingProductReviewCount > 0 ||
        pendingDeliveryAlertsCount > 0) && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 11,
            maxWidth: 720,
            margin: '0 auto 22px',
          }}
        >
          {pendingRechargeCount > 0 && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate('/admin/recharges')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') navigate('/admin/recharges');
              }}
              style={{
                background: 'rgba(231, 76, 60, 0.14)',
                backdropFilter: 'blur(14px)',
                borderRadius: 14,
                padding: '12px 18px',
                border: '2px solid #e74c3c',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                animation: 'pulse-alert 2s infinite',
                boxShadow: '0 6px 22px rgba(231, 76, 60, 0.28)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '1.6rem' }}>💰</span>
                <div>
                  <div style={{ color: '#e74c3c', fontWeight: 900, fontSize: '0.98rem' }}>
                    {language === 'zh' ? '待审核充值' : 'Pending Recharges'}
                  </div>
                  <div style={{ color: 'white', fontSize: '0.8rem', opacity: 0.82 }}>
                    {language === 'zh' ? '有客户提交了充值凭证' : 'Customers submitted proof'}
                  </div>
                </div>
              </div>
              <div
                style={{
                  background: '#e74c3c',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: 12,
                  fontWeight: 900,
                  fontSize: '1.15rem',
                }}
              >
                {pendingRechargeCount}
              </div>
            </div>
          )}

          {pendingAssignmentCount > 0 && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate('/admin/tracking')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') navigate('/admin/tracking');
              }}
              style={{
                background: 'rgba(52, 152, 219, 0.14)',
                backdropFilter: 'blur(14px)',
                borderRadius: 14,
                padding: '12px 18px',
                border: '2px solid #3498db',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                animation: 'pulse-alert 2s infinite',
                boxShadow: '0 6px 22px rgba(52, 152, 219, 0.28)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '1.6rem' }}>📦</span>
                <div>
                  <div style={{ color: '#3498db', fontWeight: 900, fontSize: '0.98rem' }}>
                    {language === 'zh' ? '待分配包裹' : 'Pending Assignment'}
                  </div>
                  <div style={{ color: 'white', fontSize: '0.8rem', opacity: 0.82 }}>
                    {language === 'zh' ? '有新订单等待分配骑手' : 'New orders waiting for riders'}
                  </div>
                </div>
              </div>
              <div
                style={{
                  background: '#3498db',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: 12,
                  fontWeight: 900,
                  fontSize: '1.15rem',
                }}
              >
                {pendingAssignmentCount}
              </div>
            </div>
          )}

          {pendingDeliveryAlertsCount > 0 && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate('/admin/delivery-alerts')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') navigate('/admin/delivery-alerts');
              }}
              style={{
                background: 'rgba(220, 38, 38, 0.14)',
                backdropFilter: 'blur(14px)',
                borderRadius: 14,
                padding: '12px 18px',
                border: '2px solid #dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                animation: 'pulse-alert 2s infinite',
                boxShadow: '0 6px 22px rgba(220, 38, 38, 0.3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '1.6rem' }}>🚨</span>
                <div>
                  <div style={{ color: '#fecaca', fontWeight: 900, fontSize: '0.98rem' }}>
                    {language === 'zh'
                      ? '待处理配送警报'
                      : language === 'en'
                        ? 'Pending delivery alerts'
                        : 'Pending alerts'}
                  </div>
                  <div style={{ color: 'white', fontSize: '0.8rem', opacity: 0.85 }}>
                    {language === 'zh'
                      ? '有新的骑手异常警报需处理'
                      : language === 'en'
                        ? 'Courier alerts need attention'
                        : 'Tap to review'}
                  </div>
                </div>
              </div>
              <div
                style={{
                  background: '#dc2626',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: 12,
                  fontWeight: 900,
                  fontSize: '1.15rem',
                }}
              >
                {pendingDeliveryAlertsCount}
              </div>
            </div>
          )}

          {pendingProductReviewCount > 0 && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate('/admin/delivery-stores')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') navigate('/admin/delivery-stores');
              }}
              style={{
                background: 'rgba(245, 158, 11, 0.14)',
                backdropFilter: 'blur(14px)',
                borderRadius: 14,
                padding: '12px 18px',
                border: '2px solid #f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                animation: 'pulse-alert 2s infinite',
                boxShadow: '0 6px 22px rgba(245, 158, 11, 0.3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '1.6rem' }}>🛍️</span>
                <div>
                  <div style={{ color: '#fbbf24', fontWeight: 900, fontSize: '0.98rem' }}>
                    {language === 'zh'
                      ? '待审核商品'
                      : language === 'en'
                        ? 'Products to review'
                        : 'စစ်ဆေးရန် ကုန်ပစ္စည်းများ'}
                  </div>
                  <div style={{ color: 'white', fontSize: '0.8rem', opacity: 0.85 }}>
                    {language === 'zh'
                      ? '商家提交了新品，请在合伙店铺中处理'
                      : language === 'en'
                        ? 'Open Merchants → store product list'
                        : 'ကုန်သည်မှ ကုန်ပစ္စည်းအသစ်'}
                  </div>
                </div>
              </div>
              <div
                style={{
                  background: '#f59e0b',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: 12,
                  fontWeight: 900,
                  fontSize: '1.15rem',
                }}
              >
                {pendingProductReviewCount}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 动态待办摘要条 */}
      <div
        style={{
          maxWidth: 920,
          margin: '0 auto 18px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          justifyContent: 'center',
        }}
      >
        {[
          {
            n: pendingTotal,
            zh: '待办合计',
            en: 'All pending',
            my: 'စုစုပေါင်း',
            color: '#94a3b8',
            path: '/admin/city-packages',
          },
          {
            n: pendingRechargeCount,
            zh: '充值待审',
            en: 'Recharges',
            my: 'အားပြန်သွင်းမှု',
            color: '#f472b6',
            path: '/admin/recharges',
          },
          {
            n: pendingAssignmentCount,
            zh: '待分配',
            en: 'Assign',
            my: 'ဖြန့်ပေးရန်',
            color: '#38bdf8',
            path: '/admin/tracking',
          },
          {
            n: pendingDeliveryAlertsCount,
            zh: '配送警报',
            en: 'Alerts',
            my: 'သတိပေးချက်များ',
            color: '#fb7185',
            path: '/admin/delivery-alerts',
          },
        ].map((item) => (
          <button
            key={item.zh}
            type="button"
            onClick={() => navigate(item.path)}
            style={{
              padding: '8px 14px',
              borderRadius: 999,
              border: `1px solid ${item.color}55`,
              background: 'rgba(15, 23, 42, 0.45)',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '0.82rem',
              fontWeight: 700,
              backdropFilter: 'blur(10px)',
            }}
          >
            <span style={{ color: item.color }}>
              {language === 'zh' ? item.zh : language === 'en' ? item.en : item.my}
            </span>
            <span
              style={{
                background: `${item.color}33`,
                color: item.color,
                padding: '2px 8px',
                borderRadius: 8,
                minWidth: 22,
                textAlign: 'center',
              }}
            >
              {item.n}
            </span>
          </button>
        ))}
      </div>

      {/* 公司广告轮播（与「页面管理」banners 表同步） */}
      <div
        style={{ maxWidth: 920, margin: '0 auto 20px', width: '100%' }}
        onMouseEnter={() => setCarouselPaused(true)}
        onMouseLeave={() => setCarouselPaused(false)}
      >
        {bannersLoading ? (
          <div
            style={{
              height: isMobile ? 140 : 200,
              borderRadius: 20,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.55)',
              fontSize: '0.9rem',
            }}
          >
            {language === 'zh' ? '加载广告…' : language === 'en' ? 'Loading…' : 'ဆောင်ရွက်နေ…'}
          </div>
        ) : banners.length === 0 ? (
          <div
            style={{
              borderRadius: 20,
              padding: isMobile ? '22px 18px' : '28px 26px',
              background:
                'linear-gradient(125deg, rgba(59, 130, 246, 0.35) 0%, rgba(15, 23, 42, 0.85) 45%, rgba(99, 102, 241, 0.3) 100%)',
              backgroundSize: '200% 100%',
              animation: 'admin-shimmer 8s ease infinite alternate',
              border: '1px solid rgba(147, 197, 253, 0.25)',
              textAlign: 'center',
              color: 'white',
            }}
          >
            <div style={{ fontSize: '1.35rem', marginBottom: 8 }}>📢</div>
            <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 6 }}>
              {language === 'zh'
                ? '暂无展示中的首页广告'
                : language === 'en'
                  ? 'No active homepage promos'
                  : 'ကြေညာမရှိသေးပါ'}
            </div>
            <p style={{ margin: '0 0 16px', fontSize: '0.85rem', opacity: 0.82, lineHeight: 1.5 }}>
              {language === 'zh'
                ? '在「页面管理」中上传横幅图、标题与链接，启用后即可在此自动轮播。'
                : language === 'en'
                  ? 'Add banners under Page management → enable to show them here.'
                  : 'စီမံချက်မှ ကြေညာထည့်ပါ။'}
            </p>
            <button
              type="button"
              onClick={() => navigate('/admin/banners')}
              style={{
                padding: '10px 22px',
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, #38bdf8, #6366f1)',
                color: 'white',
                fontWeight: 800,
                cursor: 'pointer',
                fontSize: '0.9rem',
                boxShadow: '0 10px 28px rgba(99, 102, 241, 0.35)',
              }}
            >
              {language === 'zh' ? '去配置广告' : language === 'en' ? 'Manage banners' : 'ကြေညာစီမံရန်'}
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
                  src={activeBanner.image_url}
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

      {/* 快捷入口 */}
      <div
        style={{
          maxWidth: 920,
          margin: '0 auto 20px',
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: 12,
        }}
      >
        {quickLinks.map((q) => (
          <button
            key={q.path}
            type="button"
            onClick={() => navigate(q.path)}
            style={{
              padding: '16px 12px',
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(12px)',
              color: 'white',
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'transform 0.15s ease, border-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.borderColor = 'rgba(125,211,252,0.45)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)';
            }}
          >
            <div style={{ fontSize: '1.75rem', marginBottom: 6 }}>{q.icon}</div>
            <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>{qlLabel(q)}</div>
          </button>
        ))}
      </div>

      <div
        style={{
          maxWidth: 640,
          margin: '0 auto',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(18px)',
          borderRadius: 18,
          padding: isMobile ? '18px 18px' : '22px 24px',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          color: 'white',
        }}
      >
        <div style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 8 }}>
          {language === 'zh' ? '欢迎回来' : language === 'en' ? 'Welcome back' : 'ပြန်လည်ကြိုဆိုပါသည်'}
          {totalPendingHighlight > 0 ? (
            <span style={{ marginLeft: 10, fontSize: '0.78rem', fontWeight: 600, color: '#fcd34d' }}>
              · {language === 'zh' ? `${totalPendingHighlight} 项待处理` : `${totalPendingHighlight} pending`}
            </span>
          ) : null}
        </div>
        <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.55, opacity: 0.88 }}>
          {language === 'zh'
            ? '左侧菜单进入各模块；上方轮播与「页面管理」中的启用广告同步。暂停轮播：鼠标移入横幅区域。'
            : language === 'en'
              ? 'Use the sidebar for modules. The carousel shows active banners from Page management. Hover the banner to pause rotation.'
              : 'ဘေးဘားနှင့်ကြေညာများကို သုံးပါ။'}
        </p>
      </div>
    </>
  );
};

export default AdminDashboardHome;
