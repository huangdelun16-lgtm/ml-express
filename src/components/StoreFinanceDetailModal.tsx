import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../contexts/LanguageContext';
import {
  fetchStoreFinanceDetail,
  type FinanceBreakdownGroup,
  type FinanceLedgerEntryRow,
  type InventoryTransitStore,
  type StoreFinanceDetailMode,
  type FinancePeriodParams,
} from '../services/inventoryConsoleService';
import DualMoney from './DualMoney';
import {
  displayRateForCustomerCategory,
  isCustomerLedgerCategory,
  isSettledCustomerCategory,
  resolveCustomerFeeCny,
} from '../utils/crossBorderFx';
import '../styles/crossBorderLogistics.css';

const CATEGORY_LABEL: Record<string, { zh: string; en: string; accent: string }> = {
  order_income_cod: { zh: '到付', en: 'COD', accent: '#059669' },
  order_prepaid: { zh: '预付', en: 'Prepaid', accent: '#2563eb' },
  order_collected: { zh: '已签收', en: 'Collected', accent: '#2563eb' },
  transport_cost: { zh: '运输', en: 'Transport', accent: '#dc2626' },
  stock_op: { zh: '库存', en: 'Stock', accent: '#64748b' },
  manual_income: { zh: '其它收入', en: 'Other income', accent: '#059669' },
  manual_expense: { zh: '其它支出', en: 'Other expense', accent: '#dc2626' },
  agency_remit: { zh: '代转汇款', en: 'Agency remit', accent: '#d97706' },
};

type Props = {
  open: boolean;
  onClose: () => void;
  store: InventoryTransitStore | null;
  mode: StoreFinanceDetailMode;
  period?: FinancePeriodParams | null;
  fxRate?: number | null;
};

function formatMmK(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

function formatWhen(iso: string, lang: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(lang === 'en' ? 'en-US' : 'zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function incomePrefix(category: string): string {
  if (category === 'manual_expense' || category === 'transport_cost' || category === 'agency_remit') {
    return '−';
  }
  if (isCustomerLedgerCategory(category)) return '+';
  return '';
}

function blendGroupCny(group: FinanceBreakdownGroup, liveRate: number | null, mode: StoreFinanceDetailMode): number | null {
  if (mode === 'transport') return null;
  if (mode === 'cod') {
    return resolveCustomerFeeCny({
      category: 'order_income_cod',
      mmk: group.totalAmount,
      liveRate,
    });
  }
  let total = 0;
  for (const item of group.items) {
    const mmk = Number(item.amount) || 0;
    if (mmk <= 0) continue;
    const cny = resolveCustomerFeeCny({
      category: item.category,
      mmk,
      lockedRate: item.fxMmkPerCny,
      paidCny: item.paidCny,
      liveRate: null,
    });
    if (cny == null) return null;
    total += cny;
  }
  return total;
}

function LedgerEntryLine({
  entry,
  isEn,
  liveRate,
}: {
  entry: FinanceLedgerEntryRow;
  isEn: boolean;
  liveRate: number | null;
}) {
  const meta = CATEGORY_LABEL[entry.category] ?? CATEGORY_LABEL.stock_op;
  const customerRow = isCustomerLedgerCategory(entry.category) && entry.amount != null;
  const displayRate = customerRow
    ? displayRateForCustomerCategory(entry.category, entry.fxMmkPerCny, liveRate)
    : null;
  const paidCny = entry.paidCny != null && entry.paidCny > 0 ? entry.paidCny : undefined;
  const settled = isSettledCustomerCategory(entry.category);
  const usedLock = Boolean(customerRow && settled && (displayRate != null || paidCny != null));
  const legacySigned = Boolean(customerRow && settled && (entry.amount ?? 0) > 0 && !usedLock);

  return (
    <div className="cbl-finance-entry">
      <div className="cbl-finance-entry__main">
        <div>
          <div className="cbl-finance-entry__title">{entry.itemName || entry.barcode}</div>
          <div className="cbl-finance-entry__sub">{entry.subtitle || entry.title}</div>
        </div>
        <div className="cbl-finance-entry__amount" style={{ color: meta.accent }}>
          {customerRow ? (
            <DualMoney
              mmk={entry.amount}
              rate={displayRate}
              cny={paidCny}
              prefix={incomePrefix(entry.category)}
            />
          ) : (
            entry.amountDisplay
          )}
          {usedLock ? (
            <span className="cbl-fx-lock-hint">{isEn ? 'Locked FX' : '锁定汇率'}</span>
          ) : null}
          {legacySigned ? (
            <span className="cbl-fx-lock-hint">{isEn ? 'MMK only' : '旧单无锁'}</span>
          ) : null}
        </div>
      </div>
      <div className="cbl-finance-entry__meta">
        <span className="cbl-finance-entry__tag" style={{ color: meta.accent }}>
          {isEn ? meta.en : meta.zh}
        </span>
        {entry.destination ? <span>→ {entry.destination}</span> : null}
        <span>{formatWhen(entry.occurredAt, isEn ? 'en' : 'zh')}</span>
        <span className="cbl-code">{entry.barcode}</span>
      </div>
    </div>
  );
}

function BreakdownGroupBlock({
  group,
  isEn,
  amountPrefix,
  liveRate,
  mode,
}: {
  group: FinanceBreakdownGroup;
  isEn: boolean;
  amountPrefix?: string;
  liveRate: number | null;
  mode: StoreFinanceDetailMode;
}) {
  const groupCny = blendGroupCny(group, liveRate, mode);
  return (
    <div className="cbl-finance-group">
      <div className="cbl-finance-group__head">
        <span className="cbl-finance-group__region">{group.label}</span>
        <span className="cbl-finance-group__stat">
          {group.count} {isEn ? 'items' : '件'}
        </span>
        <span className="cbl-finance-group__amount">
          {mode === 'transport' ? (
            <>
              {amountPrefix}
              {formatMmK(group.totalAmount)}
            </>
          ) : (
            <DualMoney
              mmk={group.totalAmount}
              rate={mode === 'cod' ? liveRate : null}
              cny={mode === 'collected' ? groupCny : undefined}
              prefix={amountPrefix}
            />
          )}
        </span>
      </div>
      <div className="cbl-finance-group__items">
        {group.items.map((entry) => (
          <LedgerEntryLine key={entry.id} entry={entry} isEn={isEn} liveRate={liveRate} />
        ))}
      </div>
    </div>
  );
}

const StoreFinanceDetailModal: React.FC<Props> = ({
  open,
  onClose,
  store,
  mode,
  period,
  fxRate = null,
}) => {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<FinanceLedgerEntryRow[]>([]);
  const [breakdown, setBreakdown] = useState<{
    cod: FinanceBreakdownGroup[];
    collected: FinanceBreakdownGroup[];
    transport: FinanceBreakdownGroup[];
  } | null>(null);

  useEffect(() => {
    if (!open || !store?.store_code) return;
    setLoading(true);
    setError(null);
    void fetchStoreFinanceDetail(store.store_code, period)
      .then((data) => {
        setEntries(data.entries);
        setBreakdown(data.breakdown);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : '加载失败');
        setEntries([]);
        setBreakdown(null);
      })
      .finally(() => setLoading(false));
  }, [open, store?.store_code, period?.period, period?.date, period?.from, period?.to]);

  const title = useMemo(() => {
    if (!store) return '';
    const base = `${store.store_code} · ${store.store_name}`;
    if (mode === 'ledger') return isEn ? `${base} · Ledger` : `${base} · 财务流水`;
    if (mode === 'cod') return isEn ? `${base} · COD pending` : `${base} · 到付待收明细`;
    if (mode === 'collected') return isEn ? `${base} · Collected` : `${base} · 已收明细`;
    return isEn ? `${base} · Transport MMK` : `${base} · 运输成本MMK明细`;
  }, [store, mode, isEn]);

  const breakdownGroups = useMemo(() => {
    if (!breakdown) return [];
    if (mode === 'cod') return breakdown.cod;
    if (mode === 'collected') return breakdown.collected;
    if (mode === 'transport') return breakdown.transport;
    return [];
  }, [breakdown, mode]);

  if (!open || !store) return null;

  return createPortal(
    <div
      className="store-form-overlay cbl-create-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="cbl-pricing-modal cbl-finance-detail-modal" role="dialog" aria-modal="true">
        <header className="cbl-pricing-modal__head">
          <div>
            <h2 className="cbl-pricing-modal__title">{title}</h2>
            <p className="cbl-pricing-modal__sub">
              {mode === 'ledger'
                ? isEn
                  ? 'Same rules as Inventory App「Movements」— cloud synced data. Pending uses live FX; collected uses the locked rate.'
                  : '与 Inventory App「流水」页同源。待入账用活汇率，已收用签收锁定汇率。'
                : mode === 'transport'
                  ? isEn
                    ? 'Grouped by route. Truck fees stay in MMK.'
                    : '按装车路线分组，车费只记缅币。'
                  : isEn
                    ? 'Grouped by origin. Pending uses live FX; collected uses the locked rate (legacy unsigned stays MMK).'
                    : '按发站归属分组。待入账用活汇率，已收用锁定汇率；旧单无锁只显示缅币。'}
            </p>
          </div>
          <button
            type="button"
            className="cbl-pricing-modal__close"
            onClick={onClose}
            aria-label={isEn ? 'Close' : '关闭'}
          >
            ✕
          </button>
        </header>

        {error ? (
          <div className="cbl-pricing-modal__alert cbl-pricing-modal__alert--error">{error}</div>
        ) : null}

        <div className="cbl-finance-detail-body">
          {loading ? (
            <div className="cbl-pricing-modal__loading">{isEn ? 'Loading…' : '加载中…'}</div>
          ) : mode === 'ledger' ? (
            entries.length ? (
              entries.map((entry) => (
                <LedgerEntryLine key={entry.id} entry={entry} isEn={isEn} liveRate={fxRate} />
              ))
            ) : (
              <div className="cbl-empty">{isEn ? 'No ledger entries.' : '暂无流水记录。'}</div>
            )
          ) : breakdownGroups.length ? (
            breakdownGroups.map((group) => (
              <BreakdownGroupBlock
                key={group.label}
                group={group}
                isEn={isEn}
                liveRate={fxRate}
                mode={mode}
                amountPrefix={mode === 'transport' ? '−' : mode === 'cod' ? '+' : ''}
              />
            ))
          ) : (
            <div className="cbl-empty">
              {isEn ? 'No items for this category.' : '该类别下暂无明细。'}
            </div>
          )}
        </div>

        <footer className="cbl-pricing-modal__foot">
          <button
            type="button"
            className="cbl-btn cbl-btn--primary"
            onClick={onClose}
          >
            {isEn ? 'Close' : '关闭'}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
};

export default StoreFinanceDetailModal;
