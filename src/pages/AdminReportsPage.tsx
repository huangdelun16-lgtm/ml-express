import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useResponsive } from '../hooks/useResponsive';
import type { Package } from '../services/supabase';
import {
  DatePreset,
  fetchPackagesBetween,
  filterPackagesByRegion,
  getRangeForPreset,
  summarizePackages,
  fetchRechargeSummaryBetween,
  toCsvRow,
  inferPackageRegion,
} from '../services/adminInsightsService';

const REGIONS: { id: string; labelZh: string; labelEn: string }[] = [
  { id: 'all', labelZh: '全部区域', labelEn: 'All regions' },
  { id: 'yangon', labelZh: '仰光', labelEn: 'Yangon' },
  { id: 'mandalay', labelZh: '曼德勒', labelEn: 'Mandalay' },
  { id: 'maymyo', labelZh: '彬乌伦', labelEn: 'Pyin Oo Lwin' },
  { id: 'other', labelZh: '其他/未标', labelEn: 'Other' },
];

function downloadText(filename: string, text: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob(['\uFEFF', text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatRangeLabel(startIso: string, endIso: string, lang: string): string {
  const opt: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
  const loc = lang === 'en' ? 'en-US' : 'zh-CN';
  try {
    const a = new Date(startIso).toLocaleDateString(loc, opt);
    const b = new Date(endIso).toLocaleDateString(loc, opt);
    return `${a} — ${b}`;
  } catch {
    return `${startIso.slice(0, 10)} — ${endIso.slice(0, 10)}`;
  }
}

const AdminReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { isMobile } = useResponsive();
  const isEn = language === 'en';
  const [preset, setPreset] = useState<DatePreset>('7d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [region, setRegion] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [allPackages, setAllPackages] = useState<Package[]>([]);
  const [recharge, setRecharge] = useState({ count: 0, completed: 0, pending: 0, rejected: 0, amountCompletedMmk: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getRangeForPreset(preset, customStart, customEnd);
      const [pkgs, rechargeSum] = await Promise.all([
        fetchPackagesBetween(start, end),
        fetchRechargeSummaryBetween(start, end),
      ]);
      setAllPackages(pkgs);
      setRecharge(rechargeSum);
    } finally {
      setLoading(false);
    }
  }, [preset, customStart, customEnd]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const rangeMeta = useMemo(() => getRangeForPreset(preset, customStart, customEnd), [preset, customStart, customEnd]);
  const rangeLabel = useMemo(() => formatRangeLabel(rangeMeta.start, rangeMeta.end, language), [rangeMeta, language]);

  const filtered = useMemo(
    () => filterPackagesByRegion(allPackages, region as 'all' | 'yangon' | 'mandalay' | 'maymyo' | 'other'),
    [allPackages, region]
  );
  const summary = summarizePackages(filtered);

  const regionLabel = (id: string) => REGIONS.find((r) => r.id === id)?.[isEn ? 'labelEn' : 'labelZh'] || id;

  const sortedStatusEntries = useMemo(
    () => Object.entries(summary.byStatus).sort((a, b) => b[1] - a[1]),
    [summary.byStatus]
  );
  const sortedRegionEntries = useMemo(
    () => Object.entries(summary.byRegion).sort((a, b) => b[1] - a[1]),
    [summary.byRegion]
  );

  const completionRate = summary.total > 0 ? Math.round((summary.delivered / summary.total) * 1000) / 10 : 0;

  const exportSummaryCsv = () => {
    const { start, end } = getRangeForPreset(preset, customStart, customEnd);
    const lines = [
      toCsvRow(['报表类型', '数据报表-汇总']),
      toCsvRow(['时间起', start]),
      toCsvRow(['时间止', end]),
      toCsvRow(['区域筛选', regionLabel(region)]),
      toCsvRow([]),
      toCsvRow(['总单量', summary.total]),
      toCsvRow(['已送达', summary.delivered]),
      toCsvRow(['运输中', summary.inTransit]),
      toCsvRow(['待取/待收', summary.pending]),
      toCsvRow(['送达占比(%)', completionRate]),
      toCsvRow(['COD 估算合计(MMK)', Math.round(summary.codTotalMmk)]),
      toCsvRow([]),
      toCsvRow(['充值笔数', recharge.count]),
      toCsvRow(['充值已完成', recharge.completed]),
      toCsvRow(['充值待审', recharge.pending]),
      toCsvRow(['充值拒绝', recharge.rejected]),
      toCsvRow(['充值入账金额(MMK)', Math.round(recharge.amountCompletedMmk)]),
      toCsvRow([]),
      toCsvRow(['状态', '件数']),
      ...sortedStatusEntries.map(([k, v]) => toCsvRow([k, v])),
      toCsvRow([]),
      toCsvRow(['区域', '件数']),
      ...sortedRegionEntries.map(([k, v]) => toCsvRow([k, v])),
    ];
    downloadText(`ml-reports-summary-${Date.now()}.csv`, lines.join('\n'));
  };

  const exportDetailCsv = () => {
    const head = toCsvRow([
      'id',
      'status',
      'region推断',
      'courier',
      'receiver_name',
      'receiver_phone',
      'price',
      'cod_amount',
      'created_at',
      'delivery_time',
    ]);
    const rows = filtered.map((p) =>
      toCsvRow([
        p.id,
        p.status,
        inferPackageRegion(p),
        p.courier,
        p.receiver_name,
        p.receiver_phone,
        p.price,
        p.cod_amount ?? '',
        p.created_at || p.create_time || '',
        p.delivery_time || '',
      ])
    );
    downloadText(`ml-reports-packages-${Date.now()}.csv`, [head, ...rows].join('\n'));
  };

  const t = isEn
    ? {
        title: 'Reports & export',
        subtitle: 'Order & recharge aggregates for the selected period — export CSV for Excel',
        hint: 'Region filter applies after loading; data is based on package created_at and recharge created_at in the range.',
        back: 'Dashboard',
        preset: 'Range',
        rangeHint: 'Active period',
        region: 'Region',
        customFrom: 'From',
        customTo: 'To',
        refresh: 'Refresh',
        loading: 'Loading…',
        sum: 'Export summary',
        detail: 'Export package lines',
        total: 'Orders',
        delivered: 'Delivered',
        transit: 'In transit',
        pending: 'Pending',
        cod: 'COD estimate',
        recharge: 'Recharges',
        rechargeSub: 'Completed / pending / rejected · credited MMK',
        statusTitle: 'Status mix',
        regionTitle: 'Region mix',
        footer: 'Packages in view (after region):',
        completion: 'Delivery rate',
      }
    : {
        title: '报表与导出',
        subtitle: '按时间段汇总运单与充值，一键导出 CSV，便于透视与对账',
        hint: '统计以运单 created_at、充值申请 created_at 落入时间范围为准；区域为二次筛选（含单号前缀推断）。',
        back: '控制台',
        preset: '统计范围',
        rangeHint: '当前区间',
        region: '区域',
        customFrom: '开始',
        customTo: '结束',
        refresh: '刷新数据',
        loading: '加载中…',
        sum: '导出汇总表',
        detail: '导出运单明细',
        total: '总单量',
        delivered: '已送达',
        transit: '运输中',
        pending: '待取/待收',
        cod: 'COD 估算',
        recharge: '充值（同周期）',
        rechargeSub: '完成 / 待审 / 拒绝 · 入账金额',
        statusTitle: '状态分布',
        regionTitle: '区域分布',
        footer: '当前区域条件下运单条数：',
        completion: '送达占比',
      };

  const chipBase = {
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    gap: 8,
    padding: '8px 12px',
    borderRadius: 10,
    fontSize: 13,
    border: '1px solid #e2e8f0',
    background: '#fff',
  };

  return (
    <div className="admin-page">
      <div style={{ maxWidth: 1320, margin: '0 auto' }}>
        <header className="admin-page-head">
          <div>
            <h1>📊 {t.title}</h1>
            <p>{t.subtitle}</p>
            <p>{t.hint}</p>
          </div>
          <div className="admin-page-actions">
            <button
              type="button"
              className="admin-shell__btn"
              onClick={() => navigate('/admin/dashboard')}
            >
              ← {t.back}
            </button>
            <button
              type="button"
              onClick={exportSummaryCsv}
              style={{
                padding: '10px 18px',
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(5,150,105,0.35)',
              }}
            >
              📋 {t.sum}
            </button>
            <button
              type="button"
              onClick={exportDetailCsv}
              disabled={!filtered.length}
              style={{
                padding: '10px 18px',
                borderRadius: 12,
                border: '1px solid rgba(147, 197, 253, 0.45)',
                background: filtered.length ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : 'rgba(255,255,255,0.1)',
                color: '#fff',
                fontWeight: 700,
                cursor: filtered.length ? 'pointer' : 'not-allowed',
                boxShadow: filtered.length ? '0 4px 14px rgba(37,99,235,0.3)' : 'none',
              }}
            >
              📦 {t.detail}
            </button>
          </div>
        </header>

        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: isMobile ? 14 : 18,
            marginBottom: 18,
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 14,
            alignItems: 'flex-end',
            position: 'relative',
          }}
        >
          {loading && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(15,23,42,0.06)',
                borderRadius: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2,
                pointerEvents: 'none',
                fontWeight: 700,
              }}
            >
              {t.loading}
            </div>
          )}
          <div style={{ flex: '1 1 220px', minWidth: 0 }}>
            <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 6, fontWeight: 600 }}>{t.rangeHint}</div>
            <div style={{ fontSize: isMobile ? 13 : 15, fontWeight: 700, opacity: 0.95 }}>{rangeLabel}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 6, fontWeight: 600 }}>{t.preset}</div>
            <select
              className="admin-select"
              value={preset}
              onChange={(e) => setPreset(e.target.value as DatePreset)}
            >
              <option value="today">{isEn ? 'Today' : '今日'}</option>
              <option value="7d">{isEn ? 'Last 7 days' : '近 7 天'}</option>
              <option value="30d">{isEn ? 'Last 30 days' : '近 30 天'}</option>
              <option value="custom">{isEn ? 'Custom' : '自定义'}</option>
            </select>
          </div>
          {preset === 'custom' && (
            <>
              <div>
                <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 6 }}>{t.customFrom}</div>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="admin-input"
                />
              </div>
              <div>
                <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 6 }}>{t.customTo}</div>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="admin-input"
                />
              </div>
            </>
          )}
          <div>
            <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 6, fontWeight: 600 }}>{t.region}</div>
            <select
              className="admin-select"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              style={{ minWidth: 140 }}
            >
              {REGIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {isEn ? r.labelEn : r.labelZh}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            style={{
              padding: '12px 22px',
              borderRadius: 12,
              border: 'none',
              background: loading ? 'rgba(255,255,255,0.12)' : 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
              color: '#fff',
              fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? t.loading : `🔄 ${t.refresh}`}
          </button>
        </div>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5, 1fr)',
            gap: 12,
            marginBottom: 16,
          }}
        >
          {(
            [
              [t.total, summary.total, '📦', 'rgba(96, 165, 250, 0.25)'],
              [t.delivered, summary.delivered, '✅', 'rgba(52, 211, 153, 0.25)'],
              [t.transit, summary.inTransit, '🛵', 'rgba(253, 224, 71, 0.2)'],
              [t.pending, summary.pending, '⏳', 'rgba(251, 146, 60, 0.22)'],
              [t.completion, `${completionRate}%`, '🎯', 'rgba(167, 139, 250, 0.22)'],
            ] as const
          ).map(([label, val, icon, tint]) => (
            <div
              key={String(label)}
              style={{
                background: '#fff',
                borderRadius: 12,
                padding: isMobile ? '12px' : '14px 16px',
                border: '1px solid #e2e8f0',
                boxShadow: `inset 0 0 0 1px ${tint}`,
              }}
            >
              <div style={{ fontSize: 18, marginBottom: 6 }}>{icon}</div>
              <div style={{ fontSize: 11, opacity: 0.78, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800 }}>{val}</div>
            </div>
          ))}
        </section>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1.05fr 1fr',
            gap: 14,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: isMobile ? 16 : 18,
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 12, fontSize: 15 }}>{t.cod} (MMK)</div>
            <div style={{ fontSize: isMobile ? 26 : 32, fontWeight: 800, color: '#059669', letterSpacing: '-0.02em' }}>
              {Math.round(summary.codTotalMmk).toLocaleString()}
            </div>
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.72 }}>{isEn ? 'Sum of COD amounts on loaded packages (estimate).' : '基于当前加载运单的 cod_amount 字段求和（估算）。'}</div>
          </div>
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: isMobile ? 16 : 18,
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 6, fontSize: 15 }}>{t.recharge}</div>
            <div style={{ fontSize: 11, opacity: 0.72, marginBottom: 12 }}>{t.rechargeSub}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, textAlign: 'center' }}>
              {[
                [recharge.count, isEn ? 'Total' : '笔数'],
                [recharge.completed, isEn ? 'OK' : '完成'],
                [recharge.pending, isEn ? 'Wait' : '待审'],
                [recharge.rejected, isEn ? 'No' : '拒绝'],
              ].map(([n, lab]) => (
            <div key={String(lab)} style={{ background: '#f8fafc', borderRadius: 12, padding: '10px 6px' }}>
                  <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 800 }}>{n as number}</div>
                  <div style={{ fontSize: 10, opacity: 0.78, marginTop: 4 }}>{lab}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, fontSize: 14, fontWeight: 700, color: '#fde68a' }}>
              {isEn ? 'Credited:' : '入账：'}{' '}
              {Math.round(recharge.amountCompletedMmk).toLocaleString()} MMK
            </div>
          </div>
        </section>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: 14,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: isMobile ? 16 : 18,
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 14, fontSize: 15 }}>{t.statusTitle}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {sortedStatusEntries.length === 0 ? (
                <span style={{ opacity: 0.75 }}>{isEn ? 'No data' : '暂无数据'}</span>
              ) : (
                sortedStatusEntries.map(([k, v]) => (
                  <span key={k} style={chipBase}>
                    <span style={{ fontWeight: 700 }}>{k}</span>
                    <span
                      style={{
                        background: '#f1f5f9',
                        borderRadius: 8,
                        padding: '2px 8px',
                        fontWeight: 800,
                      }}
                    >
                      {v}
                    </span>
                  </span>
                ))
              )}
            </div>
          </div>
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: isMobile ? 16 : 18,
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 14, fontSize: 15 }}>{t.regionTitle}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {sortedRegionEntries.length === 0 ? (
                <span style={{ opacity: 0.75 }}>{isEn ? 'No data' : '暂无数据'}</span>
              ) : (
                sortedRegionEntries.map(([k, v]) => (
                  <span key={k} style={chipBase}>
                    <span style={{ fontWeight: 700 }}>{regionLabel(k)}</span>
                    <span
                      style={{
                        background: '#f1f5f9',
                        borderRadius: 8,
                        padding: '2px 8px',
                        fontWeight: 800,
                      }}
                    >
                      {v}
                    </span>
                  </span>
                ))
              )}
            </div>
          </div>
        </section>

        <footer style={{ marginTop: 18, fontSize: 12, opacity: 0.72, lineHeight: 1.5 }}>
          {t.footer}{' '}
          <strong style={{ color: 'rgba(253,224,71,0.95)' }}>{filtered.length}</strong>
          {isEn ? ` · Region: ${regionLabel(region)}` : ` · 区域：${regionLabel(region)}`}
        </footer>
      </div>
    </div>
  );
};

export default AdminReportsPage;
