import React, { useEffect, useState } from 'react';
import {
  ProductVariant,
  createEmptyVariant,
  coerceEditorVariants,
} from '../utils/productVariants';

export type ProductVariantsEditorProps = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  variants: ProductVariant[];
  onChange: (variants: ProductVariant[]) => void;
  language?: 'zh' | 'en' | 'my';
  /** admin = 浅色店铺表单；merchant = 深色商品弹窗 */
  theme?: 'admin' | 'merchant';
};

const LABELS = {
  zh: {
    title: '商品规格',
    toggle: '启用多规格',
    toggleSub: '同商品不同规格，可设不同价格与库存',
    hint: '例如：A4 / A5 纸、S / M / L 码。顾客下单时需选择规格。',
    idleHint: '开启后可添加多个规格，列表价将显示为「最低价起」',
    examples: ['A4', 'A5', 'M码', 'L码'],
    name: '规格名称',
    price: '商品价格 (MMK)',
    stock: '库存',
    stockHint: '-1 表示无限',
    row: '规格',
    add: '添加规格',
    remove: '删除',
  },
  en: {
    title: 'Variants',
    toggle: 'Enable variants',
    toggleSub: 'Different specs can have different prices and stock',
    hint: 'e.g. A4/A5 paper, S/M/L sizes. Customers must pick a variant.',
    idleHint: 'When enabled, list price shows as "from lowest price".',
    examples: ['A4', 'A5', 'M', 'L'],
    name: 'Spec name',
    price: 'Price (MMK)',
    stock: 'Stock',
    stockHint: '-1 = unlimited',
    row: 'Variant',
    add: 'Add variant',
    remove: 'Remove',
  },
  my: {
    title: 'Variant',
    toggle: 'Variant ဖွင့်ရန်',
    toggleSub: 'Variant တစ်ခုချင်းစီ price/stock သီးသန့်',
    hint: 'ဥပမာ A4/A5၊ S/M/L',
    idleHint: 'ဖွင့်ပြီးနောက် variant ထည့်နိုင်သည်',
    examples: ['A4', 'A5', 'M', 'L'],
    name: 'Variant',
    price: 'Price',
    stock: 'Stock',
    stockHint: '-1 = ∞',
    row: 'Variant',
    add: 'Add',
    remove: 'Delete',
  },
};

export default function ProductVariantsEditor({
  enabled,
  onEnabledChange,
  variants,
  onChange,
  language = 'zh',
  theme = 'admin',
}: ProductVariantsEditorProps) {
  const t = LABELS[language] ?? LABELS.zh;
  const rows = coerceEditorVariants(variants);
  const rootClass = `pv-editor pv-editor--${theme}${enabled ? ' pv-editor--open' : ''}`;
  const [focusRowId, setFocusRowId] = useState<string | null>(null);

  useEffect(() => {
    if (!focusRowId) return;
    const el = document.getElementById(`pv-variant-name-${focusRowId}`);
    el?.focus();
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setFocusRowId(null);
  }, [focusRowId, rows.length]);

  const updateRow = (index: number, patch: Partial<ProductVariant>) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeRow = (index: number) => {
    onChange(rows.filter((_, i) => i !== index));
  };

  const addRow = () => {
    const next = createEmptyVariant(rows.length);
    onChange([...rows, next]);
    setFocusRowId(next.id);
  };

  const handleToggle = () => {
    const next = !enabled;
    onEnabledChange(next);
    if (next && rows.length === 0) {
      const first = createEmptyVariant(0);
      onChange([first]);
      setFocusRowId(first.id);
    }
  };

  return (
    <div className={rootClass}>
      <div className="pv-editor__head">
        <div className="pv-editor__head-text">
          <span className="pv-editor__icon" aria-hidden="true">
            🏷️
          </span>
          <div>
            <div className="pv-editor__title">{t.title}</div>
            <div className="pv-editor__subtitle">{t.toggleSub}</div>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          className={`pv-editor__switch${enabled ? ' pv-editor__switch--on' : ''}`}
          onClick={handleToggle}
        >
          <span className="pv-editor__switch-knob" />
          <span className="pv-editor__switch-label">{t.toggle}</span>
        </button>
      </div>

      {!enabled ? (
        <div className="pv-editor__idle">
          <p className="pv-editor__idle-text">{t.idleHint}</p>
          <div className="pv-editor__examples" aria-hidden="true">
            {t.examples.map((ex) => (
              <span key={ex} className="pv-editor__example-chip">
                {ex}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="pv-editor__body">
          <p className="pv-editor__hint">{t.hint}</p>
          <ul className="pv-editor__list">
            {rows.map((row, index) => (
              <li key={row.id} className="pv-editor__row">
                <div className="pv-editor__row-top">
                  <span className="pv-editor__row-badge">
                    {t.row} {index + 1}
                  </span>
                  <button
                    type="button"
                    className="pv-editor__row-remove"
                    onClick={() => removeRow(index)}
                    disabled={rows.length <= 1}
                    aria-label={t.remove}
                  >
                    {t.remove}
                  </button>
                </div>
                <div className="pv-editor__row-main">
                  <label className="pv-editor__field pv-editor__field--name">
                    <span className="pv-editor__field-label">{t.name}</span>
                    <input
                      id={`pv-variant-name-${row.id}`}
                      type="text"
                      className="pv-editor__input pv-editor__input--name"
                      value={row.name}
                      onChange={(e) => updateRow(index, { name: e.target.value })}
                      placeholder={language === 'zh' ? 'A4、M码' : 'A4, M'}
                    />
                  </label>
                  <label className="pv-editor__field pv-editor__field--price">
                    <span className="pv-editor__field-label">
                      {language === 'zh' ? '价格' : 'Price'}
                      <span className="pv-editor__required">*</span>
                    </span>
                    <input
                      type="number"
                      min="1"
                      className="pv-editor__input pv-editor__input--price"
                      value={row.price > 0 ? row.price : ''}
                      onChange={(e) =>
                        updateRow(index, { price: parseFloat(e.target.value) || 0 })
                      }
                      placeholder="5000"
                    />
                  </label>
                  <label className="pv-editor__field pv-editor__field--stock">
                    <span className="pv-editor__field-label">{t.stock}</span>
                    <input
                      type="number"
                      className="pv-editor__input pv-editor__input--stock"
                      value={row.stock}
                      onChange={(e) =>
                        updateRow(index, { stock: parseInt(e.target.value, 10) || 0 })
                      }
                      placeholder="-1"
                      title={t.stockHint}
                    />
                  </label>
                </div>
              </li>
            ))}
          </ul>
          <button type="button" className="pv-editor__add" onClick={addRow}>
            <span className="pv-editor__add-icon">+</span>
            {t.add}
          </button>
        </div>
      )}
    </div>
  );
}
