import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useResponsive } from '../hooks/useResponsive';
import type { CourierSalary } from '../services/supabase';
import {
  DatePreset,
  fetchCourierSalariesOverlappingRange,
  fetchRiderPerformanceBetween,
  getRangeForPreset,
  RiderStatRow,
  toCsvRow,
} from '../services/adminInsightsService';

function downloadText(filename: string, text: string) {
  const blob = new Blob(['\uFEFF', text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type SortKey = 'name' | 'throughput' | 'delivered' | 'alerts' | 'credit' | 'last';

const CourierPerformancePage: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { isMobile } = useResponsive();
  const [preset, setPreset] = useState<DatePreset>('7d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<RiderStatRow[]>([]);
  const [salaries, setSalaries] = useState<CourierSalary[]>([]);
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('throughput');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getRangeForPreset(preset, customStart, customEnd);
      const [perf, sal] = await Promise.all([
        fetchRiderPerformanceBetween(start, end),
        fetchCourierSalariesOverlappingRange(start, end),
      ]);
      setRows(perf);
      setSalaries(sal);
    } finally {
      setLoading(false);
    }
  }, [preset, customStart, customEnd]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.courierName.toLowerCase().includes(q) || (r.courierId || '').toLowerCase().includes(q)
    );
  }, [rows, query]);

  const salaryFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return salaries;
    return salaries.filter(
      (s) =>
        (s.courier_name || '').toLowerCase().includes(q) || (s.courier_id || '').toLowerCase().includes(q)
    );
  }, [salaries, query]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    const dir = sortDir === 'asc' ? 1 : -1;
    const num = (a: number | null | undefined, b: number | null | undefined, fallback = 0) => {
      const x = a ?? fallback;
      const y = b ?? fallback;
      return x === y ? 0 : x < y ? -1 : 1;
    };
    list.sort((a, b) => {
      switch (sortKey) {
        case 'name':
          return dir * a.courierName.localeCompare(b.courierName, 'zh-Hans');
        case 'delivered':
          return dir * num(a.delivered, b.delivered);
        case 'throughput':
          return dir * num(a.delivered + a.inProgress + a.pendingPickup, b.delivered + b.inProgress + b.pendingPickup);
        case 'alerts':
          return dir * num(a.alertCount, b.alertCount);
        case 'credit':
          return dir * num(a.creditScore, b.creditScore, -999);
        case 'last': {
          const ta = a.lastActive ? new Date(a.lastActive).getTime() : 0;
          const tb = b.lastActive ? new Date(b.lastActive).getTime() : 0;
          return dir * (ta === tb ? 0 : ta < tb ? -1 : 1);
        }
        default:
          return 0;
      }
    });
    return list;
  }, [filtered, sortKey, sortDir]);

  const stats = useMemo(() => {
    const riders = sorted.length;
    let delivered = 0;
    let alerts = 0;
    let throughput = 0;
    for (const r of sorted) {
      delivered += r.delivered;
      alerts += r.alertCount;
      throughput += r.delivered + r.inProgress + r.pendingPickup;
    }
    const netSalarySum = salaryFiltered.reduce((s, x) => s + (Number(x.net_salary) || 0), 0);
    return { riders, delivered, alerts, throughput, netSalarySum, salaryRows: salaryFiltered.length };
  }, [sorted, salaryFiltered]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  };

  const sortMark = (key: SortKey) => (sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '');

  const exportPerformanceCsv = () => {
    const head = toCsvRow([
      'courier_name',
      'courier_id',
      'delivered',
      'in_progress',
      'pending_pickup',
      'throughput',
      'alert_count',
      'credit_score',
      'last_active',
    ]);
    const lines = sorted.map((r) =>
      toCsvRow([
        r.courierName,
        r.courierId || '',
        r.delivered,
        r.inProgress,
        r.pendingPickup,
        r.delivered + r.inProgress + r.pendingPickup,
        r.alertCount,
        r.creditScore ?? '',
        r.lastActive ?? '',
      ])
    );
    downloadText(`ml-rider-performance-${Date.now()}.csv`, [head, ...lines].join('\n'));
  };

  const exportSalaryCsv = () => {
    if (!salaryFiltered.length) return;
    const head = toCsvRow([
      'id',
      'courier_id',
      'courier_name',
      'settlement_period',
      'period_start_date',
      'period_end_date',
      'base_salary',
      'km_fee',
      'delivery_bonus',
      'performance_bonus',
      'overtime_pay',
      'tip_amount',
      'deduction_amount',
      'total_deliveries',
      'total_km',
      'on_time_deliveries',
      'late_deliveries',
      'gross_salary',
      'net_salary',
      'status',
      'payment_method',
      'payment_reference',
      'payment_date',
      'notes',
      'admin_notes',
      'created_at',
    ]);
    const lines = salaryFiltered.map((s) =>
      toCsvRow([
        s.id ?? '',
        s.courier_id,
        s.courier_name,
        s.settlement_period,
        s.period_start_date,
        s.period_end_date,
        s.base_salary,
        s.km_fee,
        s.delivery_bonus,
        s.performance_bonus,
        s.overtime_pay,
        s.tip_amount,
        s.deduction_amount,
        s.total_deliveries,
        s.total_km,
        s.on_time_deliveries,
        s.late_deliveries,
        s.gross_salary,
        s.net_salary,
        s.status,
        s.payment_method ?? '',
        s.payment_reference ?? '',
        s.payment_date ?? '',
        s.notes ?? '',
        s.admin_notes ?? '',
        s.created_at ?? '',
      ])
    );
    downloadText(`ml-rider-salary-records-${Date.now()}.csv`, [head, ...lines].join('\n'));
  };

  const t =
    language === 'en'
      ? {
          title: 'Rider performance',
          subtitle: 'Delivery stats & salary records for the selected period',
          back: 'Dashboard',
          hint: 'KPI from packages and alerts; salary rows = payroll periods overlapping this range',
          exportPerf: 'Export KPI (CSV)',
          exportSalary: 'Export salary (CSV)',
          salaryHint: 'Payroll rows',
          range: 'Range',
          filterPh: 'Filter by name / ID…',
          refresh: 'Refresh',
          loading: 'Loading…',
          statsRiders: 'Riders',
          statsDelivered: 'Delivered',
          statsThroughput: 'Active parcels',
          statsAlerts: 'Alerts',
          statsSalary: 'Salary rows · net',
          name: 'Rider',
          del: 'Delivered',
          prog: 'En route',
          pend: 'Pickup',
          active: 'Active Σ',
          alerts: 'Alerts',
          score: 'Credit',
          last: 'Last seen',
          empty: 'No rider activity in this range',
          noSalary: 'No overlapping salary periods — widen range or check Finance',
        }
      : {
          title: '骑手绩效看板',
          subtitle: '配送表现 + 周期重叠的工资记录，支持对账与导出',
          back: '控制台',
          hint: '绩效来自所选时间内运单与配送警报；工资表为「结算周期」与下方时间范围有交集的记录（与财务管理中的工资单一致）',
          exportPerf: '导出绩效表',
          exportSalary: '导出工资记录表',
          salaryHint: '本范围工资记录',
          range: '统计范围',
          filterPh: '按骑手姓名或 ID 筛选…',
          refresh: '刷新',
          loading: '加载中…',
          statsRiders: '有单骑手',
          statsDelivered: '送达单量',
          statsThroughput: '在途+待取合计',
          statsAlerts: '警报合计',
          statsSalary: '工资记录 · 实发合计',
          name: '骑手',
          del: '已送达',
          prog: '运输中',
          pend: '待取件',
          active: '活跃单量',
          alerts: '警报',
          score: '信用分',
          last: '最近活跃',
          empty: '该范围内暂无骑手运单数据',
          noSalary: '本时间范围内没有重叠的工资结算周期，可扩大日期范围或在财务管理中核对工资单',
        };

  const thBg = 'rgb(15, 23, 42)';

  const thStyle: React.CSSProperties = {
    padding: isMobile ? '12px 10px' : '14px 16px',
    fontSize: isMobile ? 13 : 14,
    fontWeight: 600,
    letterSpacing: '0.01em',
    lineHeight: 1.45,
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    color: 'rgba(255,255,255,0.96)',
    borderBottom: '2px solid rgba(255,255,255,0.2)',
    verticalAlign: 'middle',
    textAlign: 'left',
    backgroundColor: thBg,
    position: 'sticky',
    top: 0,
    zIndex: 2,
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
    textRendering: 'optimizeLegibility',
  };

  const thStyleNum: React.CSSProperties = {
    ...thStyle,
    textAlign: 'right',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #0f172a 0%, #1e3a5f 38%, #2c5282 70%, #3b6fb8 100%)',
        padding: isMobile ? '14px 12px 96px' : '24px 20px 96px',
        color: '#fff',
        fontFamily:
          "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei UI', 'Microsoft YaHei', 'Noto Sans SC', 'Segoe UI', system-ui, sans-serif",
        boxSizing: 'border-box',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
      }}
    >
      <div style={{ maxWidth: 1320, margin: '0 auto' }}>
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
            marginBottom: 20,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.75, marginBottom: 6 }}>
              ML Express · Admin
            </div>
            <h1 style={{ margin: 0, fontSize: isMobile ? '1.45rem' : '1.85rem', fontWeight: 800, lineHeight: 1.2 }}>🚴 {t.title}</h1>
            <p style={{ margin: '10px 0 0', opacity: 0.9, fontSize: isMobile ? 13 : 14, maxWidth: 720, lineHeight: 1.5 }}>{t.subtitle}</p>
            <p style={{ margin: '8px 0 0', opacity: 0.72, fontSize: 12, maxWidth: 820, lineHeight: 1.45 }}>{t.hint}</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => navigate('/admin/dashboard')}
              style={{
                padding: '10px 18px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.35)',
                background: 'rgba(255,255,255,0.06)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              ← {t.back}
            </button>
            <button
              type="button"
              onClick={exportPerformanceCsv}
              disabled={!sorted.length}
              style={{
                padding: '10px 18px',
                borderRadius: 12,
                border: 'none',
                background: sorted.length ? 'linear-gradient(135deg, #059669 0%, #047857 100%)' : 'rgba(255,255,255,0.15)',
                color: '#fff',
                fontWeight: 700,
                cursor: sorted.length ? 'pointer' : 'not-allowed',
                boxShadow: sorted.length ? '0 4px 14px rgba(5,150,105,0.35)' : 'none',
              }}
            >
              {t.exportPerf}
            </button>
            <button
              type="button"
              onClick={exportSalaryCsv}
              disabled={!salaryFiltered.length}
              title={!salaryFiltered.length ? t.noSalary : undefined}
              style={{
                padding: '10px 18px',
                borderRadius: 12,
                border: '1px solid rgba(251, 191, 36, 0.45)',
                background: salaryFiltered.length
                  ? 'linear-gradient(135deg, rgba(180, 83, 9, 0.95) 0%, rgba(217, 119, 6, 0.92) 100%)'
                  : 'rgba(255,255,255,0.1)',
                color: '#fff',
                fontWeight: 700,
                cursor: salaryFiltered.length ? 'pointer' : 'not-allowed',
                boxShadow: salaryFiltered.length ? '0 4px 14px rgba(217, 119, 6, 0.3)' : 'none',
              }}
            >
              💰 {t.exportSalary}
            </button>
          </div>
        </header>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(5, 1fr)',
            gap: 12,
            marginBottom: 18,
          }}
        >
          {(
            [
              [t.statsRiders, stats.riders, '👤'],
              [t.statsDelivered, stats.delivered, '✅'],
              [t.statsThroughput, stats.throughput, '📦'],
              [t.statsAlerts, stats.alerts, '📡'],
              [
                t.statsSalary,
                `${stats.salaryRows} · ${Math.round(stats.netSalarySum).toLocaleString()} MMK`,
                '💵',
              ],
            ] as const
          ).map(([label, val, icon]) => (
            <div
              key={label}
              style={{
                background: 'rgba(255,255,255,0.08)',
                borderRadius: 16,
                padding: isMobile ? '12px 12px' : '14px 16px',
                border: '1px solid rgba(255,255,255,0.12)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
              <div style={{ fontSize: 11, opacity: 0.78, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: isMobile ? 17 : 20, fontWeight: 800, lineHeight: 1.2 }}>{val}</div>
            </div>
          ))}
        </section>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.45)',
            borderRadius: 18,
            padding: isMobile ? 14 : 18,
            marginBottom: 18,
            border: '1px solid rgba(255,255,255,0.12)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            alignItems: 'flex-end',
          }}
        >
          <div>
            <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 6, fontWeight: 600 }}>{t.range}</div>
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value as DatePreset)}
              style={{
                padding: '11px 14px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.22)',
                background: 'rgba(0,0,0,0.28)',
                color: '#fff',
                minWidth: 140,
              }}
            >
              <option value="today">今日</option>
              <option value="7d">近 7 天</option>
              <option value="30d">近 30 天</option>
              <option value="custom">自定义</option>
            </select>
          </div>
          {preset === 'custom' && (
            <>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                style={{ padding: 11, borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.95)', color: '#1e293b' }}
              />
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                style={{ padding: 11, borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.95)', color: '#1e293b' }}
              />
            </>
          )}
          <input
            placeholder={t.filterPh}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              minWidth: 200,
              padding: '12px 16px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.22)',
              background: 'rgba(0,0,0,0.22)',
              color: '#fff',
              fontSize: 14,
            }}
          />
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            style={{
              padding: '12px 22px',
              borderRadius: 12,
              border: 'none',
              background: loading ? 'rgba(255,255,255,0.12)' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#fff',
              fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? t.loading : `🔄 ${t.refresh}`}
          </button>
        </div>

        <div
          style={{
            borderRadius: 18,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(2, 6, 23, 0.35)',
            position: 'relative',
          }}
        >
          {loading && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(15,23,42,0.25)',
                zIndex: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              <span style={{ fontWeight: 700, opacity: 0.95 }}>{t.loading}</span>
            </div>
          )}
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'separate',
                borderSpacing: 0,
                minWidth: isMobile ? 640 : 880,
              }}
            >
              <thead>
                <tr>
                  <th style={thStyle} onClick={() => toggleSort('name')}>
                    {t.name}
                    <span style={{ marginLeft: 4, opacity: 0.9 }}>{sortMark('name')}</span>
                  </th>
                  <th style={thStyleNum} onClick={() => toggleSort('delivered')}>
                    {t.del}
                    <span style={{ marginLeft: 4, opacity: 0.9 }}>{sortMark('delivered')}</span>
                  </th>
                  <th style={thStyleNum} onClick={() => toggleSort('throughput')}>
                    {t.active}
                    <span style={{ marginLeft: 4, opacity: 0.9 }}>{sortMark('throughput')}</span>
                  </th>
                  <th style={thStyleNum}>{t.prog}</th>
                  <th style={thStyleNum}>{t.pend}</th>
                  <th style={thStyleNum} onClick={() => toggleSort('alerts')}>
                    {t.alerts}
                    <span style={{ marginLeft: 4, opacity: 0.9 }}>{sortMark('alerts')}</span>
                  </th>
                  <th style={thStyleNum} onClick={() => toggleSort('credit')}>
                    {t.score}
                    <span style={{ marginLeft: 4, opacity: 0.9 }}>{sortMark('credit')}</span>
                  </th>
                  <th style={thStyle} onClick={() => toggleSort('last')}>
                    {t.last}
                    <span style={{ marginLeft: 4, opacity: 0.9 }}>{sortMark('last')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => (
                  <tr
                    key={`${r.courierName}-${r.courierId || ''}`}
                    style={{
                      background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
                      borderTop: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <td style={{ padding: isMobile ? '10px 8px' : '12px 14px', fontWeight: 700, fontSize: isMobile ? 13 : 14 }}>
                      <div>{r.courierName}</div>
                      {r.courierId ? (
                        <div style={{ fontSize: 11, opacity: 0.65, fontWeight: 500, marginTop: 2 }}>{r.courierId}</div>
                      ) : null}
                    </td>
                    <td style={{ padding: isMobile ? '10px 8px' : '12px 14px', textAlign: 'right', fontWeight: 700, color: '#6ee7b7' }}>{r.delivered}</td>
                    <td style={{ padding: isMobile ? '10px 8px' : '12px 14px', textAlign: 'right', fontWeight: 800, color: '#fde68a' }}>
                      {r.delivered + r.inProgress + r.pendingPickup}
                    </td>
                    <td style={{ padding: isMobile ? '10px 8px' : '12px 14px', textAlign: 'right', opacity: 0.92 }}>{r.inProgress}</td>
                    <td style={{ padding: isMobile ? '10px 8px' : '12px 14px', textAlign: 'right', opacity: 0.92 }}>{r.pendingPickup}</td>
                    <td
                      style={{
                        padding: isMobile ? '10px 8px' : '12px 14px',
                        textAlign: 'right',
                        fontWeight: r.alertCount > 0 ? 700 : 400,
                        color: r.alertCount > 0 ? '#fca5a5' : 'inherit',
                      }}
                    >
                      {r.alertCount}
                    </td>
                    <td style={{ padding: isMobile ? '10px 8px' : '12px 14px', textAlign: 'right' }}>{r.creditScore ?? '—'}</td>
                    <td style={{ padding: isMobile ? '10px 8px' : '12px 14px', fontSize: isMobile ? 11 : 12, opacity: 0.88 }}>
                      {r.lastActive ? new Date(r.lastActive).toLocaleString(language === 'en' ? 'en-US' : 'zh-CN') : '—'}
                    </td>
                  </tr>
                ))}
                {!sorted.length && (
                  <tr>
                    <td colSpan={8} style={{ padding: 36, textAlign: 'center', opacity: 0.82, fontSize: 14 }}>
                      {loading ? t.loading : t.empty}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <footer style={{ marginTop: 16, fontSize: 12, opacity: 0.68, lineHeight: 1.5 }}>
          {t.salaryHint}: <strong style={{ color: 'rgba(253,224,71,0.95)' }}>{stats.salaryRows}</strong>
          {stats.salaryRows === 0 ? ` — ${t.noSalary}` : null}
        </footer>
      </div>
    </div>
  );
};

export default CourierPerformancePage;
