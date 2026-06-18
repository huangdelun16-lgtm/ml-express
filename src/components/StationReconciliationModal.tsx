import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../contexts/LanguageContext';
import {
  fetchStoreFinanceDetail,
  type FinanceLedgerEntryRow,
  type FinanceOriginAttributionGroup,
  type InventoryTransitStore,
  type ReconciliationEntryBucket,
  type StationReconciliationDetail,
} from '../services/inventoryConsoleService';
import '../styles/crossBorderLogistics.css';

type Props = {
  open: boolean;
  onClose: () => void;
  store: InventoryTransitStore | null;
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

function EntryLine({ entry, isEn }: { entry: FinanceLedgerEntryRow; isEn: boolean }) {
  return (
    <div className="cbl-reconcile-entry">
      <div className="cbl-reconcile-entry__main">
        <div>
          <div className="cbl-reconcile-entry__title">{entry.itemName || entry.barcode}</div>
          <div className="cbl-reconcile-entry__sub">{entry.subtitle || entry.title}</div>
        </div>
        <div className="cbl-reconcile-entry__amount">{entry.amountDisplay}</div>
      </div>
      <div className="cbl-reconcile-entry__meta">
        {entry.originLabel ? <span>{entry.originLabel}</span> : null}
        {entry.destination ? <span>→ {entry.destination}</span> : null}
        <span>{formatWhen(entry.occurredAt, isEn ? 'en' : 'zh')}</span>
        <span className="cbl-code">{entry.barcode}</span>
      </div>
    </div>
  );
}

function SectionBlock({
  title,
  hint,
  total,
  count,
  tone,
  defaultOpen,
  children,
}: {
  title: string;
  hint: string;
  total: number;
  count: number;
  tone?: 'in' | 'out' | 'warn' | 'neutral';
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <section className="cbl-reconcile-section">
      <button
        type="button"
        className="cbl-reconcile-section__head"
        onClick={() => setOpen((v) => !v)}
      >
        <div>
          <h3 className="cbl-reconcile-section__title">{title}</h3>
          <p className="cbl-reconcile-section__hint">{hint}</p>
        </div>
        <div className="cbl-reconcile-section__stat">
          <span className={`cbl-reconcile-amount cbl-reconcile-amount--${tone || 'neutral'}`}>
            {formatMmK(total)}
          </span>
          <span className="cbl-reconcile-section__count">{count} 条</span>
          <span className="cbl-reconcile-section__chevron">{open ? '▾' : '▸'}</span>
        </div>
      </button>
      {open && count > 0 ? (
        <div className="cbl-reconcile-section__body">{children}</div>
      ) : null}
    </section>
  );
}

function BucketEntries({
  bucket,
  isEn,
}: {
  bucket?: ReconciliationEntryBucket;
  isEn: boolean;
}) {
  if (!bucket?.items?.length) return null;
  return (
    <>
      {bucket.items.map((entry) => (
        <EntryLine key={entry.id} entry={entry} isEn={isEn} />
      ))}
    </>
  );
}

function OriginGroups({
  groups,
  isEn,
}: {
  groups: Array<FinanceOriginAttributionGroup & { items?: FinanceLedgerEntryRow[] }>;
  isEn: boolean;
}) {
  if (!groups.length) return null;
  return (
    <>
      {groups.map((group) => (
        <div key={group.originKey} className="cbl-reconcile-origin-group">
          <div className="cbl-reconcile-origin-group__head">
            <span className="cbl-reconcile-origin-group__label">{group.label}</span>
            <span className="cbl-reconcile-origin-group__stat">
              {group.count} 条 · {formatMmK(group.total)}
            </span>
          </div>
          {group.items?.map((entry) => (
            <EntryLine key={entry.id} entry={entry} isEn={isEn} />
          ))}
        </div>
      ))}
    </>
  );
}

const StationReconciliationModal: React.FC<Props> = ({ open, onClose, store }) => {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<StationReconciliationDetail | null>(null);

  useEffect(() => {
    if (!open || !store?.store_code) return;
    setLoading(true);
    setError(null);
    void fetchStoreFinanceDetail(store.store_code)
      .then((data) => setDetail(data.reconciliationDetail ?? null))
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : '加载失败');
        setDetail(null);
      })
      .finally(() => setLoading(false));
  }, [open, store?.store_code]);

  if (!open || !store) return null;

  const sections = detail?.sections;
  const r = detail;

  return createPortal(
    <div
      className="store-form-overlay cbl-create-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="cbl-pricing-modal cbl-reconcile-modal"
        role="dialog"
        aria-modal="true"
      >
        <header className="cbl-pricing-modal__head cbl-customer-modal__head">
          <div className="cbl-customer-modal__head-main">
            <div className="cbl-customer-modal__avatar" aria-hidden="true">账</div>
            <div>
              <h2 className="cbl-pricing-modal__title cbl-customer-modal__title">
                {store.store_code} · {store.store_name}
              </h2>
              <p className="cbl-customer-modal__phone">
                {isEn ? 'Station reconciliation statement' : '中转站对账单'}
              </p>
            </div>
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

        <div className="cbl-reconcile-body">
          {loading ? (
            <div className="cbl-customer-modal__loading">
              <span className="cbl-customer-modal__spinner" aria-hidden="true" />
              <span>{isEn ? 'Loading…' : '正在生成对账单…'}</span>
            </div>
          ) : r ? (
            <>
              <div className="cbl-reconcile-summary-grid">
                <div className="cbl-reconcile-summary-card cbl-reconcile-summary-card--inflow">
                  <span className="cbl-reconcile-summary-card__label">
                    {isEn ? 'Collected' : '已收'}
                  </span>
                  <strong>+{formatMmK(r.inflowTotal)}</strong>
                  <span className="cbl-reconcile-summary-card__mini">
                    {isEn ? 'Prepaid + signed here' : '预付 + 本站签收'}
                  </span>
                </div>
                <div className="cbl-reconcile-summary-card cbl-reconcile-summary-card--outflow">
                  <span className="cbl-reconcile-summary-card__label">
                    {isEn ? 'Unpaid transport' : '待支付'}
                  </span>
                  <strong>−{formatMmK(r.transportUnpaidTotal ?? r.outflowTotal)}</strong>
                  <span className="cbl-reconcile-summary-card__mini">
                    {isEn ? 'Unpaid truck fees' : '未付装车车费'}
                  </span>
                </div>
                <div className="cbl-reconcile-summary-card">
                  <span className="cbl-reconcile-summary-card__label">
                    {isEn ? 'Paid transport' : '已支付'}
                  </span>
                  <strong>{formatMmK(r.transportPaidTotal ?? 0)}</strong>
                  <span className="cbl-reconcile-summary-card__mini">
                    {isEn ? 'Settled truck fees' : '已结清车费'}
                  </span>
                </div>
                <div className="cbl-reconcile-summary-card">
                  <span className="cbl-reconcile-summary-card__label">
                    {isEn ? 'Pending' : '待入账'}
                  </span>
                  <strong>{formatMmK(r.pendingInflowTotal)}</strong>
                  <span className="cbl-reconcile-summary-card__mini">
                    {isEn ? 'To collect at this hub' : '本站待收订单款'}
                  </span>
                </div>
              </div>

              <p className="cbl-reconcile-intro">
                {isEn
                  ? 'Summary matches the transit table. Agency remit (section 4) is separate from transport payables.'
                  : '上方汇总与中转站表格一致。第四节「代转」需与发站单独结算，不计入待支付车费。'}
              </p>

              <SectionBlock
                title={isEn ? '1. Origin · prepaid received' : '一、本站发站 · 预付已收'}
                hint={
                  isEn
                    ? 'Orders registered and prepaid at this station — revenue stays here.'
                    : '本站入库并预付的订单，货款已在本站入账。'
                }
                total={r.originPrepaid}
                count={sections?.origin_prepaid?.count ?? 0}
                tone="in"
                defaultOpen
              >
                <BucketEntries bucket={sections?.origin_prepaid} isEn={isEn} />
              </SectionBlock>

              <SectionBlock
                title={isEn ? '2. Origin · COD in transit' : '二、本站发站 · 到付在途'}
                hint={
                  isEn
                    ? 'This station shipped COD — money not yet collected at final destination.'
                    : '本站发出到付单，钱还在目的站途中，本站尚未收到。'
                }
                total={r.originCodTransit}
                count={sections?.origin_cod_transit?.count ?? 0}
                tone="neutral"
              >
                <BucketEntries bucket={sections?.origin_cod_transit} isEn={isEn} />
              </SectionBlock>

              <SectionBlock
                title={isEn ? '3. Hub · pending collection' : '三、本站目的 · 待签收收款'}
                hint={
                  isEn
                    ? 'COD orders destined here, customer not signed yet.'
                    : '送达本站、客户尚未签收的到付（含其它站发出）。'
                }
                total={r.destPendingTotal}
                count={
                  (sections?.dest_pending_local?.count ?? 0) +
                  (sections?.dest_pending_agency?.count ?? 0)
                }
                tone="neutral"
              >
                <BucketEntries bucket={sections?.dest_pending_local} isEn={isEn} />
                <OriginGroups
                  groups={sections?.dest_pending_agency_by_origin ?? []}
                  isEn={isEn}
                />
              </SectionBlock>

              <SectionBlock
                title={isEn ? '4. Hub · agency collected (remit)' : '四、本站目的 · 代收应转给发站'}
                hint={
                  isEn
                    ? 'Collected at this hub for another origin — settle with that station.'
                    : '其它站发出、在本站签收收的款，应转给对应发站（如 MDY 代 MUSE 收 66,000）。'
                }
                total={r.destAgencyCollected}
                count={sections?.dest_agency_collected?.count ?? 0}
                tone="warn"
                defaultOpen
              >
                <OriginGroups
                  groups={sections?.dest_agency_collected_by_origin ?? []}
                  isEn={isEn}
                />
              </SectionBlock>

              <SectionBlock
                title={isEn ? '5. Hub · own orders signed' : '五、本站发站 · 在本站签收'}
                hint={
                  isEn
                    ? 'Orders originated here and signed at this hub.'
                    : '本站发出、最终在本站客户签收的到付（归属本站）。'
                }
                total={r.destLocalCollected}
                count={sections?.dest_local_collected?.count ?? 0}
                tone="in"
              >
                <BucketEntries bucket={sections?.dest_local_collected} isEn={isEn} />
              </SectionBlock>

              <SectionBlock
                title={isEn ? '6. Transport · unpaid' : '六、运输成本 · 待支付（运达站）'}
                hint={
                  isEn
                    ? 'Truck fees owed to origin — not yet marked paid in Inventory App.'
                    : '应向发站支付的装车车费，Inventory App 尚未登记「已支付」。'
                }
                total={r.transportUnpaidTotal ?? 0}
                count={
                  (sections?.transport_out?.count ?? 0) +
                  (sections?.transport_in_unpaid?.count ?? 0)
                }
                tone="out"
              >
                <BucketEntries bucket={sections?.transport_out} isEn={isEn} />
                <BucketEntries bucket={sections?.transport_in_unpaid} isEn={isEn} />
              </SectionBlock>

              <SectionBlock
                title={isEn ? '7. Transport · paid' : '七、运输成本 · 已支付'}
                hint={
                  isEn
                    ? 'Truck fees already settled with the origin station.'
                    : '已在 Inventory App 登记向发站支付的车费。'
                }
                total={r.transportPaidTotal ?? 0}
                count={
                  (sections?.transport_out_paid?.count ?? 0) +
                  (sections?.transport_in_paid?.count ?? 0)
                }
                tone="in"
              >
                <BucketEntries bucket={sections?.transport_out_paid} isEn={isEn} />
                <BucketEntries bucket={sections?.transport_in_paid} isEn={isEn} />
              </SectionBlock>
            </>
          ) : (
            <div className="cbl-empty">{isEn ? 'No reconciliation data.' : '暂无对账数据。'}</div>
          )}
        </div>

        <footer className="cbl-pricing-modal__foot cbl-customer-modal__foot">
          <span className="cbl-customer-modal__foot-hint">
            {isEn ? 'Amounts in MMK · from Inventory cloud ledger' : '金额单位 MMK · 数据来自 Inventory 云端流水'}
          </span>
          <button type="button" className="cbl-btn cbl-btn--primary" onClick={onClose}>
            {isEn ? 'Close' : '关闭'}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
};

export default StationReconciliationModal;
