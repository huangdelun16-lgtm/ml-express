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

function LedgerEntryLine({
  entry,
  isEn,
}: {
  entry: FinanceLedgerEntryRow;
  isEn: boolean;
}) {
  const meta = CATEGORY_LABEL[entry.category] ?? CATEGORY_LABEL.stock_op;
  return (
    <div className="cbl-finance-entry">
      <div className="cbl-finance-entry__main">
        <div>
          <div className="cbl-finance-entry__title">{entry.itemName || entry.barcode}</div>
          <div className="cbl-finance-entry__sub">{entry.subtitle || entry.title}</div>
        </div>
        <div className="cbl-finance-entry__amount" style={{ color: meta.accent }}>
          {entry.amountDisplay}
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
}: {
  group: FinanceBreakdownGroup;
  isEn: boolean;
  amountPrefix?: string;
}) {
  return (
    <div className="cbl-finance-group">
      <div className="cbl-finance-group__head">
        <span className="cbl-finance-group__region">{group.label}</span>
        <span className="cbl-finance-group__stat">
          {group.count} {isEn ? 'items' : '件'}
        </span>
        <span className="cbl-finance-group__amount">
          {amountPrefix}{formatMmK(group.totalAmount)}
        </span>
      </div>
      <div className="cbl-finance-group__items">
        {group.items.map((entry) => (
          <LedgerEntryLine key={entry.id} entry={entry} isEn={isEn} />
        ))}
      </div>
    </div>
  );
}

const StoreFinanceDetailModal: React.FC<Props> = ({ open, onClose, store, mode, period }) => {
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
    if (mode === 'cod') return isEn ? `${base} · COD MMK` : `${base} · 到付MMK明细`;
    if (mode === 'collected') return isEn ? `${base} · Collected MMK` : `${base} · 已收金额MMK明细`;
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
                  ? 'Same rules as Inventory App「Movements」— cloud synced data.'
                  : '与 Inventory App「流水」页同源，基于云端同步数据。'
                : mode === 'transport'
                  ? isEn
                    ? 'Grouped by route. Amounts in MMK.'
                    : '按装车路线分组，金额单位为 MMK。'
                  : isEn
                    ? 'Grouped by origin station — agency collections are owed to that origin.'
                    : '按发站归属分组；「代 XX」款项需与该发站对账结算。'}
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
                <LedgerEntryLine key={entry.id} entry={entry} isEn={isEn} />
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
