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
} from '../services/adminInsightsService';
import { downloadAdminExcel } from '../utils/adminExcelExport';

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

  const exportPerformanceExcel = () => {
    void downloadAdminExcel(`ml-rider-performance-${Date.now()}.xlsx`, [
      {
        name: 'KPI',
        title: 'MARKET LINK · Rider KPI',
        columns: [
          { header: 'courier_name', width: 16 },
          { header: 'courier_id', width: 16 },
          { header: 'delivered', width: 12, align: 'right' },
          { header: 'in_progress', width: 12, align: 'right' },
          { header: 'pending_pickup', width: 14, align: 'right' },
          { header: 'throughput', width: 12, align: 'right' },
          { header: 'alert_count', width: 12, align: 'right' },
          { header: 'credit_score', width: 12, align: 'right' },
          { header: 'last_active', width: 20 },
        ],
        rows: sorted.map((r) => [
          r.courierName,
          r.courierId || '',
          r.delivered,
          r.inProgress,
          r.pendingPickup,
          r.delivered + r.inProgress + r.pendingPickup,
          r.alertCount,
          r.creditScore ?? '',
          r.lastActive ?? '',
        ]),
      },
    ]);
  };

  const exportSalaryExcel = () => {
    if (!salaryFiltered.length) return;
    void downloadAdminExcel(`ml-rider-salary-records-${Date.now()}.xlsx`, [
      {
        name: 'Salary',
        title: 'MARKET LINK · Rider salary',
        columns: [
          { header: 'id', width: 14 },
          { header: 'courier_id', width: 14 },
          { header: 'courier_name', width: 16 },
          { header: 'settlement_period', width: 16 },
          { header: 'period_start_date', width: 14 },
          { header: 'period_end_date', width: 14 },
          { header: 'base_salary', width: 12, align: 'right' },
          { header: 'km_fee', width: 12, align: 'right' },
          { header: 'delivery_bonus', width: 14, align: 'right' },
          { header: 'performance_bonus', width: 16, align: 'right' },
          { header: 'overtime_pay', width: 12, align: 'right' },
          { header: 'tip_amount', width: 12, align: 'right' },
          { header: 'deduction_amount', width: 14, align: 'right' },
          { header: 'total_deliveries', width: 14, align: 'right' },
          { header: 'total_km', width: 12, align: 'right' },
          { header: 'on_time_deliveries', width: 16, align: 'right' },
          { header: 'late_deliveries', width: 14, align: 'right' },
          { header: 'gross_salary', width: 12, align: 'right' },
          { header: 'net_salary', width: 12, align: 'right' },
          { header: 'status', width: 12 },
          { header: 'payment_method', width: 14 },
          { header: 'payment_reference', width: 16 },
          { header: 'payment_date', width: 14 },
          { header: 'notes', width: 20 },
          { header: 'admin_notes', width: 20 },
          { header: 'created_at', width: 20 },
        ],
        rows: salaryFiltered.map((s) => [
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
        ]),
      },
    ]);
  };

  const t =
    language === 'en'
      ? {
          title: 'Rider performance',
          subtitle: 'Delivery stats & salary records for the selected period',
          back: 'Dashboard',
          hint: 'KPI from packages and alerts; salary rows = payroll periods overlapping this range',
          exportPerf: 'Export KPI (Excel)',
          exportSalary: 'Export salary (Excel)',
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

  const thBg = '#f8fafc';

  const thStyle: React.CSSProperties = {
    padding: isMobile ? '12px 10px' : '14px 16px',
    fontSize: isMobile ? 13 : 14,
    fontWeight: 600,
    letterSpacing: '0.01em',
    lineHeight: 1.45,
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    color: '#334155',
    borderBottom: '2px solid #e2e8f0',
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
    <div className="admin-page">
      <div style={{ maxWidth: 1320, margin: '0 auto' }}>
        <header className="admin-page-head">
          <div>
            <h1>🚴 {t.title}</h1>
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
              onClick={exportPerformanceExcel}
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
              onClick={exportSalaryExcel}
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
                background: '#fff',
                borderRadius: 12,
                padding: isMobile ? '12px 12px' : '14px 16px',
                border: '1px solid #e2e8f0',
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
            background: '#fff',
            borderRadius: 12,
            padding: isMobile ? 14 : 18,
            marginBottom: 18,
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            alignItems: 'flex-end',
          }}
        >
          <div>
            <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 6, fontWeight: 600 }}>{t.range}</div>
            <select
              className="admin-select"
              value={preset}
              onChange={(e) => setPreset(e.target.value as DatePreset)}
              style={{ minWidth: 140 }}
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
            className="admin-input"
            placeholder={t.filterPh}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ flex: 1, minWidth: 200 }}
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
            borderRadius: 12,
            overflow: 'hidden',
            border: '1px solid #e2e8f0',
            background: '#fff',
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
                      background: i % 2 === 0 ? '#fff' : '#f8fafc',
                      borderTop: '1px solid #e2e8f0',
                    }}
                  >
                    <td style={{ padding: isMobile ? '10px 8px' : '12px 14px', fontWeight: 700, fontSize: isMobile ? 13 : 14 }}>
                      <div>{r.courierName}</div>
                      {r.courierId ? (
                        <div style={{ fontSize: 11, opacity: 0.65, fontWeight: 500, marginTop: 2 }}>{r.courierId}</div>
                      ) : null}
                    </td>
                    <td style={{ padding: isMobile ? '10px 8px' : '12px 14px', textAlign: 'right', fontWeight: 700, color: '#059669' }}>{r.delivered}</td>
                    <td style={{ padding: isMobile ? '10px 8px' : '12px 14px', textAlign: 'right', fontWeight: 800, color: '#d97706' }}>
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
