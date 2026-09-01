import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { createCrossBorderManualEntry } from '../services/inventoryConsoleService';
import '../styles/crossBorderLogistics.css';

type Kind = 'income' | 'expense';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  stores: Array<{ store_code: string; store_name: string }>;
};

function todayIsoDate(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const CrossBorderManualEntryModal: React.FC<Props> = ({ open, onClose, onSaved, stores }) => {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const [kind, setKind] = useState<Kind>('expense');
  const [entryDate, setEntryDate] = useState(todayIsoDate());
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [storeCode, setStoreCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setKind('expense');
    setEntryDate(todayIsoDate());
    setAmount('');
    setCategory('');
    setNote('');
    setStoreCode(stores[0]?.store_code || '');
    setError(null);
    setSubmitting(false);
  }, [open, stores]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = Number(amount.replace(/[^\d.]/g, ''));
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setError(isEn ? 'Enter a valid amount.' : '请填写大于 0 的金额。');
      return;
    }
    if (!entryDate.trim()) {
      setError(isEn ? 'Select a date.' : '请选择日期。');
      return;
    }
    if (!storeCode.trim()) {
      setError(isEn ? 'Select a station.' : '请选择中转站。');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createCrossBorderManualEntry({
        entry_date: entryDate.trim(),
        kind,
        amount: Math.round(numeric),
        category: category.trim(),
        note: note.trim(),
        store_code: storeCode.trim(),
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : isEn ? 'Save failed.' : '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="store-form-overlay cbl-create-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div
        className="cbl-pricing-modal cbl-manual-entry-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cbl-manual-entry-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="cbl-pricing-modal__head">
          <div>
            <h2 id="cbl-manual-entry-title" className="cbl-pricing-modal__title">
              {isEn ? 'Other income / expense' : '其它开销'}
            </h2>
            <p className="cbl-pricing-modal__sub">
              {isEn
                ? 'Record manual cross-border income or expense (MMK).'
                : '手工登记跨境物流相关的收入或支出（MMK）。'}
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

        <form className="cbl-manual-entry-form" onSubmit={(e) => void handleSubmit(e)}>
          <div className="cbl-manual-entry-kind">
            <button
              type="button"
              className={`cbl-manual-entry-kind__btn${kind === 'expense' ? ' cbl-manual-entry-kind__btn--on' : ''}`}
              onClick={() => setKind('expense')}
            >
              {isEn ? 'Expense' : '支出'}
            </button>
            <button
              type="button"
              className={`cbl-manual-entry-kind__btn cbl-manual-entry-kind__btn--income${kind === 'income' ? ' cbl-manual-entry-kind__btn--on' : ''}`}
              onClick={() => setKind('income')}
            >
              {isEn ? 'Income' : '收入'}
            </button>
          </div>

          <label className="cbl-manual-entry-field">
            <span>{isEn ? 'Station' : '中转站'}</span>
            <select value={storeCode} onChange={(e) => setStoreCode(e.target.value)} required>
              <option value="">{isEn ? 'Select station' : '请选择中转站'}</option>
              {stores.map((store) => (
                <option key={store.store_code} value={store.store_code}>
                  {store.store_code} · {store.store_name}
                </option>
              ))}
            </select>
          </label>

          <label className="cbl-manual-entry-field">
            <span>{isEn ? 'Date' : '日期'}</span>
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              required
            />
          </label>

          <label className="cbl-manual-entry-field">
            <span>{isEn ? 'Amount (MMK)' : '金额 (MMK)'}</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </label>

          <label className="cbl-manual-entry-field">
            <span>{isEn ? 'Category' : '分类'}</span>
            <input
              type="text"
              placeholder={isEn ? 'e.g. Office, fuel…' : '如：办公、燃油…'}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </label>

          <label className="cbl-manual-entry-field">
            <span>{isEn ? 'Note' : '备注'}</span>
            <textarea
              rows={3}
              placeholder={isEn ? 'Optional details' : '可选说明'}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>

          {error ? (
            <div className="cbl-pricing-modal__alert cbl-pricing-modal__alert--error">{error}</div>
          ) : null}

          <footer className="cbl-pricing-modal__foot">
            <button type="button" className="cbl-btn cbl-btn--light" onClick={onClose}>
              {isEn ? 'Cancel' : '取消'}
            </button>
            <button type="submit" className="cbl-btn cbl-btn--primary" disabled={submitting}>
              {submitting ? (isEn ? 'Saving…' : '保存中…') : isEn ? 'Save' : '保存'}
            </button>
          </footer>
        </form>
      </div>
    </div>,
    document.body,
  );
};

export default CrossBorderManualEntryModal;
