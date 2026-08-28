import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useResponsive } from '../hooks/useResponsive';
import { packageService, deliveryStoreService, Package, DeliveryStore } from '../services/supabase';

function escapeCsvCell(v: unknown): string {
  const s = v == null ? '' : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsvRow(cells: unknown[]): string {
  return cells.map(escapeCsvCell).join(',');
}

function downloadCsv(filename: string, lines: string[]) {
  const body = `\uFEFF${lines.join('\r\n')}`;
  const blob = new Blob([body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type DatePreset = 'today' | '7d' | '30d' | 'all' | 'custom';

function getRangeBounds(
  preset: DatePreset,
  customStart: string,
  customEnd: string,
): { start: Date | null; end: Date | null } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  if (preset === 'all') return { start: null, end: null };

  if (preset === 'custom') {
    if (!customStart?.trim() || !customEnd?.trim()) return { start: null, end: null };
    const s = new Date(customStart);
    s.setHours(0, 0, 0, 0);
    const e = new Date(customEnd);
    e.setHours(23, 59, 59, 999);
    return { start: s, end: e };
  }

  const start = new Date();
  if (preset === 'today') {
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }
  if (preset === '7d') {
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }
  start.setDate(start.getDate() - 30);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function packageCreatedTime(p: Package): number {
  const raw = p.created_at || p.create_time;
  if (!raw) return 0;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : 0;
}

function inTimeRange(p: Package, start: Date | null, end: Date | null): boolean {
  if (!start && !end) return true;
  const t = packageCreatedTime(p);
  if (!t) return false;
  if (start && t < start.getTime()) return false;
  if (end && t > end.getTime()) return false;
  return true;
}

const MerchantReconciliationExportPage: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { isMobile } = useResponsive();

  const [preset, setPreset] = useState<DatePreset>('7d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [storeId, setStoreId] = useState<string>(''); // '' = 全部店铺
  const [statusFilter, setStatusFilter] = useState<string>('all'); // all | 已送达 | exclude_cancel
  const [stores, setStores] = useState<DeliveryStore[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pkgData, storeData] = await Promise.all([
        packageService.getAllPackages(),
        deliveryStoreService.getAllStores(),
      ]);
      setPackages(pkgData);
      setStores(storeData || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const { start, end } = useMemo(
    () => getRangeBounds(preset, customStart, customEnd),
    [preset, customStart, customEnd],
  );

  const merchantPackages = useMemo(() => {
    return packages.filter((p) => !!p.delivery_store_id);
  }, [packages]);

  const filtered = useMemo(() => {
    let list = merchantPackages.filter((p) => inTimeRange(p, start, end));
    if (storeId) {
      list = list.filter((p) => p.delivery_store_id === storeId);
    }
    if (statusFilter === '已送达') {
      list = list.filter((p) => p.status === '已送达' || p.status === '已完成');
    } else if (statusFilter === 'exclude_cancel') {
      list = list.filter((p) => p.status !== '已取消');
    }
    return list;
  }, [merchantPackages, start, end, storeId, statusFilter]);

  const t =
    language === 'en'
      ? {
          title: 'Merchant reconciliation (CSV)',
          subtitle: 'Export store-linked orders for settlement with merchants. UTF-8 CSV for Excel.',
          back: 'Dashboard',
          hint: 'Only orders with a linked delivery store are included. Adjust date range and store, then export.',
          range: 'Created date',
          store: 'Store',
          allStores: 'All stores',
          status: 'Status filter',
          statusAll: 'All statuses',
          statusDelivered: 'Delivered only',
          statusNoCancel: 'Exclude cancelled',
          refresh: 'Refresh',
          loading: 'Loading…',
          export: 'Export CSV',
          count: 'Rows',
          empty: 'No store-linked orders in this range',
          cols: {
            id: 'order_id',
            storeId: 'store_id',
            storeName: 'store_name',
            created: 'created_at',
            updated: 'updated_at',
            status: 'status',
            sender: 'sender_name',
            senderPhone: 'sender_phone',
            senderAddr: 'sender_address',
            receiver: 'receiver_name',
            receiverPhone: 'receiver_phone',
            receiverAddr: 'receiver_address',
            courier: 'courier',
            speed: 'delivery_speed',
            scheduled: 'scheduled_delivery_time',
            price: 'price',
            storeFee: 'store_fee',
            deliveryFee: 'delivery_fee',
            cod: 'cod_amount',
            pay: 'payment_method',
            pickup: 'pickup_time',
            delivery: 'delivery_time',
            recvCode: 'store_receive_code',
            sendCode: 'sender_code',
          },
        }
      : {
          title: '商家对账',
          subtitle: '导出与快递店/商家关联的运单明细，便于线下对账与结算；CSV 为 UTF-8（含 BOM），可用 Excel 直接打开。',
          back: '控制台',
          hint: '仅包含已关联「送达店铺」的订单。请选择时间范围与店铺后导出。',
          range: '下单时间',
          store: '店铺',
          allStores: '全部门店',
          status: '状态筛选',
          statusAll: '全部状态',
          statusDelivered: '仅已送达',
          statusNoCancel: '排除已取消',
          refresh: '刷新',
          loading: '加载中…',
          export: '导出 CSV',
          count: '条数',
          empty: '该条件下没有可导出的商家关联订单',
          cols: {
            id: '订单号',
            storeId: '店铺ID',
            storeName: '店铺名称',
            created: '创建时间',
            updated: '更新时间',
            status: '状态',
            sender: '寄件人',
            senderPhone: '寄件电话',
            senderAddr: '寄件地址',
            receiver: '收件人',
            receiverPhone: '收件电话',
            receiverAddr: '收件地址',
            courier: '骑手',
            speed: '配送选项',
            scheduled: '预约/定时送达',
            price: '订单金额',
            storeFee: '店铺待付款',
            deliveryFee: '跑腿费',
            cod: '代收款',
            pay: '支付方式',
            pickup: '取件时间',
            delivery: '送达时间',
            recvCode: '店铺收件码',
            sendCode: '寄件码',
          },
        };

  const runExport = () => {
    if (!filtered.length) return;
    const head = toCsvRow([
      t.cols.id,
      t.cols.storeId,
      t.cols.storeName,
      t.cols.created,
      t.cols.updated,
      t.cols.status,
      t.cols.sender,
      t.cols.senderPhone,
      t.cols.senderAddr,
      t.cols.receiver,
      t.cols.receiverPhone,
      t.cols.receiverAddr,
      t.cols.courier,
      t.cols.speed,
      t.cols.scheduled,
      t.cols.price,
      t.cols.storeFee,
      t.cols.deliveryFee,
      t.cols.cod,
      t.cols.pay,
      t.cols.pickup,
      t.cols.delivery,
      t.cols.recvCode,
      t.cols.sendCode,
    ]);
    const lines = filtered.map((p) =>
      toCsvRow([
        p.id,
        p.delivery_store_id ?? '',
        p.delivery_store_name ?? '',
        p.created_at || p.create_time || '',
        p.updated_at ?? '',
        p.status,
        p.sender_name,
        p.sender_phone,
        p.sender_address,
        p.receiver_name,
        p.receiver_phone,
        p.receiver_address,
        p.courier ?? '',
        p.delivery_speed ?? '',
        p.scheduled_delivery_time ?? '',
        p.price ?? '',
        p.store_fee ?? '',
        p.delivery_fee ?? '',
        p.cod_amount ?? '',
        p.payment_method ?? '',
        p.pickup_time ?? '',
        p.delivery_time ?? '',
        p.store_receive_code ?? '',
        p.sender_code ?? '',
      ]),
    );
    const fname =
      language === 'en'
        ? `ml-merchant-reconciliation-${Date.now()}.csv`
        : `商家对账明细-${Date.now()}.csv`;
    downloadCsv(fname, [head, ...lines]);
  };

  return (
    <div className="admin-page">
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <header className="admin-page-head">
          <div>
            <h1>📋 {t.title}</h1>
            <p>{t.subtitle}</p>
            <p>{t.hint}</p>
          </div>
          <button
            type="button"
            className="admin-shell__btn"
            onClick={() => navigate('/admin/dashboard')}
          >
            ← {t.back}
          </button>
        </header>

        <section
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: isMobile ? 14 : 20,
            border: '1px solid #e2e8f0',
            display: 'grid',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 6, fontWeight: 600 }}>{t.range}</div>
              <select
                value={preset}
                onChange={(e) => setPreset(e.target.value as DatePreset)}
                  className="admin-select"
                  style={{ minWidth: 140 }}
              >
                <option value="today">{language === 'en' ? 'Today' : '今日'}</option>
                <option value="7d">{language === 'en' ? 'Last 7 days' : '近 7 天'}</option>
                <option value="30d">{language === 'en' ? 'Last 30 days' : '近 30 天'}</option>
                <option value="all">{language === 'en' ? 'All time' : '全部时间'}</option>
                <option value="custom">{language === 'en' ? 'Custom' : '自定义'}</option>
              </select>
            </div>
            {preset === 'custom' && (
              <>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  style={{
                    padding: 11,
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.95)',
                    color: '#1e293b',
                  }}
                />
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  style={{
                    padding: 11,
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.95)',
                    color: '#1e293b',
                  }}
                />
              </>
            )}
            <div>
              <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 6, fontWeight: 600 }}>{t.store}</div>
              <select
                className="admin-select"
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                style={{ minWidth: 200, maxWidth: 320 }}
              >
                <option value="">{t.allStores}</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id || ''}>
                    {(s.store_name || '').slice(0, 40)}
                    {s.store_code ? ` (${s.store_code})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 6, fontWeight: 600 }}>{t.status}</div>
              <select
                className="admin-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ minWidth: 160 }}
              >
                <option value="all">{t.statusAll}</option>
                <option value="已送达">{t.statusDelivered}</option>
                <option value="exclude_cancel">{t.statusNoCancel}</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              style={{
                padding: '12px 20px',
                borderRadius: 12,
                border: 'none',
                background: loading ? 'rgba(255,255,255,0.15)' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: '#fff',
                fontWeight: 700,
                cursor: loading ? 'wait' : 'pointer',
              }}
            >
              {loading ? t.loading : `🔄 ${t.refresh}`}
            </button>
            <button
              type="button"
              onClick={runExport}
              disabled={!filtered.length || loading}
              style={{
                padding: '12px 22px',
                borderRadius: 12,
                border: 'none',
                background:
                  filtered.length && !loading
                    ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                    : 'rgba(255,255,255,0.15)',
                color: '#fff',
                fontWeight: 800,
                cursor: filtered.length && !loading ? 'pointer' : 'not-allowed',
                boxShadow: filtered.length ? '0 4px 14px rgba(5,150,105,0.35)' : 'none',
              }}
            >
              ⬇ {t.export}
            </button>
          </div>
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 12,
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            {t.count}: <span style={{ color: '#1677ff' }}>{filtered.length}</span>
            {merchantPackages.length !== packages.length ? (
              <span style={{ marginLeft: 12, opacity: 0.75, fontWeight: 500, fontSize: 12 }}>
                （{language === 'en' ? 'Store-linked in system' : '系统中商家关联单'} {merchantPackages.length}）
              </span>
            ) : null}
            {!filtered.length && !loading ? (
              <div style={{ marginTop: 8, fontWeight: 500, opacity: 0.85, fontSize: 13 }}>{t.empty}</div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
};

export default MerchantReconciliationExportPage;
