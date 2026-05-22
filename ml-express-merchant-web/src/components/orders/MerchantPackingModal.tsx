import React, { useMemo } from 'react';
import type { getPackingModalModel } from '../../utils/parseOrderPackingItems';
import type { MerchantLanguage } from '../../constants/merchantOrderStatus';
import './merchantOrderModals.css';

type PackingModalModel = ReturnType<typeof getPackingModalModel>;

export interface MerchantPackingModalProps {
  open: boolean;
  order: any;
  language: MerchantLanguage;
  packageIdLabel: string;
  model: PackingModalModel | null;
  checkedItems: Record<string, boolean>;
  actionLoading: boolean;
  canComplete: boolean;
  onClose: () => void;
  onToggleItem: (itemId: string) => void;
  onComplete: () => void;
}

function getCopy(language: MerchantLanguage) {
  if (language === 'en') {
    return {
      title: 'Order Packing',
      checklist: 'Checklist',
      colItem: 'Item',
      colQty: 'Qty',
      colUnit: 'Unit',
      colSub: 'Line total',
      pieces: 'pcs',
      confirmReady: 'Confirm all items ready',
      totalPieces: 'Total pieces',
      itemsTotal: 'Items total',
      customerNote: 'Customer note',
      complete: 'Confirm packing done',
      footerHint: 'Ensure every item is packed securely',
      close: 'Close',
      formula: (unit: string, qty: number, total: string) =>
        `${unit} × ${qty} = ${total} MMK`,
    };
  }
  if (language === 'my') {
    return {
      title: 'အော်ဒါထုပ်ပိုးနေသည်',
      checklist: 'ပစ္စည်းစာရင်းစစ်ဆေးရန်',
      colItem: 'ပစ္စည်း',
      colQty: 'အရေအတွက်',
      colUnit: 'တစ်ခုဈေး',
      colSub: 'စုစုပေါင်း',
      pieces: 'ခု',
      confirmReady: 'ပစ္စည်းအားလုံး ပြင်ဆင်ပြီးပါပြီ',
      totalPieces: 'စုစုပေါင်းအရေအတွက်',
      itemsTotal: 'ပစ္စည်းစုစုပေါင်း',
      customerNote: 'ဖောက်သည်မှတ်ချက်',
      complete: 'ထုပ်ပိုးပြီးကြောင်း အတည်ပြုပါ',
      footerHint: 'ပစ္စည်းအားလုံး မှန်ကန်စွာ ထုပ်ပိုးထားကြောင်း သေချာပါစေ',
      close: 'ပိတ်ရန်',
      formula: (unit: string, qty: number, total: string) =>
        `${unit} × ${qty} = ${total} MMK`,
    };
  }
  return {
    title: '订单打包中',
    checklist: '核对商品清单',
    colItem: '商品',
    colQty: '数量',
    colUnit: '单价',
    colSub: '小计',
    pieces: '件',
    confirmReady: '确认商品已备齐',
    totalPieces: '总件数',
    itemsTotal: '商品合计',
    customerNote: '客户备注',
    complete: '确认打包完成',
    footerHint: '请确保所有商品已备齐并打包好',
    close: '关闭',
    formula: (unit: string, qty: number, total: string) =>
      `${unit} × ${qty} = ${total} MMK`,
  };
}

function formatMmk(value: number | undefined | null): string {
  if (value == null) return '—';
  return value.toLocaleString();
}

const MerchantPackingModal: React.FC<MerchantPackingModalProps> = ({
  open,
  order,
  language,
  packageIdLabel,
  model,
  checkedItems,
  actionLoading,
  canComplete,
  onClose,
  onToggleItem,
  onComplete,
}) => {
  const copy = useMemo(() => getCopy(language), [language]);

  if (!open || !order) return null;

  const displayTotal =
    model?.summaryTotal ?? model?.computedLineSum ?? null;

  return (
    <div className="merchant-modal-overlay merchant-packing-overlay" onClick={onClose}>
      <div className="merchant-packing-panel" onClick={(e) => e.stopPropagation()}>
        <header className="merchant-packing-header">
          <button
            type="button"
            className="merchant-packing-header__close"
            onClick={onClose}
            aria-label={copy.close}
            title={copy.close}
          >
            ×
          </button>
          <div className="merchant-packing-header__emoji" aria-hidden>
            📦
          </div>
          <h2 className="merchant-packing-header__title">{copy.title}</h2>
          <p className="merchant-packing-header__id">
            {packageIdLabel}: {order.id}
          </p>
        </header>

        <div className="merchant-packing-body">
          <h3 className="merchant-packing-section-title">📋 {copy.checklist}</h3>

          {model && model.lineCount === 0 ? (
            <label className="merchant-packing-empty">
              <input
                type="checkbox"
                checked={!!checkedItems.default}
                onChange={() => onToggleItem('default')}
                style={{ width: 22, height: 22 }}
              />
              <span style={{ fontWeight: 800, color: '#1e293b' }}>{copy.confirmReady}</span>
            </label>
          ) : (
            <div className="merchant-packing-checklist">
              <div className="merchant-packing-table-head">
                <span className="merchant-packing-table-head__label" aria-hidden />
                <span className="merchant-packing-table-head__label">{copy.colItem}</span>
                <div className="merchant-packing-table-head__metrics">
                  <span className="merchant-packing-table-head__label">{copy.colQty}</span>
                  <span className="merchant-packing-table-head__label">{copy.colUnit}</span>
                  <span className="merchant-packing-table-head__label">{copy.colSub}</span>
                </div>
              </div>

              {model?.rows.map((row, index) => {
                const itemKey = `item-${index}`;
                const checked = !!checkedItems[itemKey];
                const unitStr = formatMmk(row.unitPrice);
                const lineStr = formatMmk(row.lineTotal);

                return (
                  <div
                    key={`${row.name}-${index}`}
                    role="button"
                    tabIndex={0}
                    className={`merchant-packing-row${checked ? ' merchant-packing-row--checked' : ''}`}
                    onClick={() => onToggleItem(itemKey)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onToggleItem(itemKey);
                      }
                    }}
                  >
                    <div className="merchant-packing-row__check" aria-hidden>
                      {checked ? '✓' : ''}
                    </div>

                    <div className="merchant-packing-row__info">
                      <span className="merchant-packing-row__name">{row.name}</span>
                      {row.unitPrice != null && row.lineTotal != null ? (
                        <span className="merchant-packing-row__formula">
                          {copy.formula(unitStr, row.qty, lineStr)}
                        </span>
                      ) : (
                        <span className="merchant-packing-row__formula">
                          {language === 'zh'
                            ? `共 ${row.qty} ${copy.pieces}`
                            : `${row.qty} ${copy.pieces}`}
                        </span>
                      )}
                    </div>

                    <div className="merchant-packing-row__metrics">
                      <span className="merchant-packing-row__qty">
                        {row.qty}
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, marginLeft: 2 }}>
                          {copy.pieces}
                        </span>
                      </span>
                      <span className="merchant-packing-row__unit">{unitStr}</span>
                      <span className="merchant-packing-row__line-total">{lineStr}</span>
                    </div>
                  </div>
                );
              })}

              {model && model.lineCount > 0 ? (
                <div className="merchant-packing-summary">
                  <p className="merchant-packing-summary__title">
                    {language === 'zh' ? '汇总' : language === 'en' ? 'Summary' : 'စုစုပေါင်း'}
                  </p>
                  <div className="merchant-packing-summary__grid">
                    <div className="merchant-packing-summary__card">
                      <span className="merchant-packing-summary__card-label">
                        {copy.totalPieces}
                      </span>
                      <span className="merchant-packing-summary__card-value">
                        {model.totalQty}{' '}
                        <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>
                          {copy.pieces}
                        </span>
                      </span>
                      <span className="merchant-packing-summary__card-sub">
                        {model.rows
                          .map((r) => `${r.name} ×${r.qty}`)
                          .join(language === 'zh' ? ' · ' : ' · ')}
                      </span>
                    </div>
                    <div className="merchant-packing-summary__card">
                      <span className="merchant-packing-summary__card-label">
                        {copy.itemsTotal}
                      </span>
                      <span className="merchant-packing-summary__card-value merchant-packing-summary__card-value--amount">
                        {displayTotal != null ? `${formatMmk(displayTotal)} MMK` : '—'}
                      </span>
                      {model.declaredItemTotal != null &&
                      model.computedLineSum != null &&
                      model.declaredItemTotal !== model.computedLineSum ? (
                        <span className="merchant-packing-summary__card-sub">
                          {language === 'zh'
                            ? '以订单标注金额为准'
                            : 'Order declared amount applies'}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {model?.customerNote ? (
            <div className="merchant-packing-note">
              <h4 className="merchant-packing-note__title">💡 {copy.customerNote}</h4>
              <p className="merchant-packing-note__body">{model.customerNote}</p>
            </div>
          ) : null}
        </div>

        <footer className="merchant-packing-footer">
          <button
            type="button"
            className="merchant-packing-complete-btn"
            onClick={onComplete}
            disabled={actionLoading || !canComplete}
          >
            {actionLoading ? '...' : copy.complete}
          </button>
          <p className="merchant-packing-footer__hint">{copy.footerHint}</p>
        </footer>
      </div>
    </div>
  );
};

export default MerchantPackingModal;
