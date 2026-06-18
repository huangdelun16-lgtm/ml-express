import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useResponsive } from '../hooks/useResponsive';
import { personalLedgerService, type PersonalLedgerRow } from '../services/supabase';

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseAmountInput(s: string): number {
  const n = parseFloat(String(s).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
}

/** 金额输入框：千分位；USD/CNY 保留至多两位小数 */
function formatLedgerAmountInput(raw: string, currency: string): string {
  const c = (currency || 'MMK').toUpperCase();
  const useDecimal = c === 'USD' || c === 'CNY';

  if (!useDecimal) {
    const d = raw.replace(/\D/g, '');
    if (!d) return '';
    const noLeading = d.replace(/^0+(?=\d)/, '') || '0';
    return noLeading.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  let s = raw.replace(/,/g, '').replace(/[^\d.]/g, '');
  const firstDot = s.indexOf('.');
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '');
  }
  const hasDot = s.includes('.');
  const [intPartRaw, fracRaw = ''] = s.split('.');
  let intDigits = intPartRaw.replace(/\D/g, '');
  if (intDigits.length > 1) intDigits = intDigits.replace(/^0+(?=\d)/, '');
  if (!intDigits && hasDot) intDigits = '0';
  const intComma = intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (!hasDot) return intComma;
  const frac = fracRaw.replace(/\D/g, '').slice(0, 2);
  return frac.length > 0 ? `${intComma}.${frac}` : `${intComma}.`;
}

function formatMoney(n: number, currency: string): string {
  const c = (currency || 'MMK').toUpperCase();
  if (c === 'USD') return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (c === 'CNY') return `¥${n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `${Math.round(n).toLocaleString()} MMK`;
}

function quickAmountPresets(currency: string): string[] {
  const c = (currency || 'MMK').toUpperCase();
  if (c === 'USD') return ['10', '50', '100', '500', '1000'];
  if (c === 'CNY') return ['50', '100', '200', '500', '1000'];
  return ['10000', '50000', '100000', '1000000', '10000000'];
}

function rowAmountToFormString(amount: string | number, currency: string): string {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return '';
  const c = (currency || 'MMK').toUpperCase();
  if (c === 'MMK') {
    return formatLedgerAmountInput(String(Math.round(n)), 'MMK');
  }
  return formatLedgerAmountInput(Number(n.toFixed(2)).toString(), c);
}

type LedgerCopy = {
  kicker: string;
  title: string;
  subtitle: string;
  back: string;
  income: string;
  expense: string;
  date: string;
  amount: string;
  currency: string;
  category: string;
  note: string;
  add: string;
  modalTitle: string;
  modalSub: string;
  cancel: string;
  saveEntry: string;
  saveEdit: string;
  modalTitleEdit: string;
  list: string;
  overview: string;
  empty: string;
  emptyHint: string;
  delete: string;
  edit: string;
  actionCol: string;
  confirmDel: string;
  loadFail: string;
  saveFail: string;
  totalIn: string;
  totalOut: string;
  balance: string;
  typeCol: string;
  quickAmount: string;
  previewLabel: string;
  typingAmount: string;
  saveShortcut: string;
  entryCount: string;
  close: string;
};

export type PersonalExpensePageProps = {
  variant?: 'page' | 'embedded';
  onCloseEmbedded?: () => void;
};

const PersonalExpensePage: React.FC<PersonalExpensePageProps> = ({
  variant = 'page',
  onCloseEmbedded,
}) => {
  const navigate = useNavigate();
  const isEmbedded = variant === 'embedded';
  const { language } = useLanguage();
  const { isMobile } = useResponsive();
  const owner =
    (typeof window !== 'undefined' &&
      (sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser'))) ||
    '';

  const [rows, setRows] = useState<PersonalLedgerRow[]>([]);
  const [loadErr, setLoadErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [kind, setKind] = useState<'income' | 'expense'>('expense');
  const [entryDate, setEntryDate] = useState(todayIso);
  const [amountStr, setAmountStr] = useState('');
  const [currency, setCurrency] = useState('MMK');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');

  const amountInputRef = useRef<HTMLInputElement | null>(null);

  const t: LedgerCopy =
    language === 'en'
      ? {
          kicker: 'ML EXPRESS · ADMIN',
          title: 'Personal ledger',
          subtitle: 'Record your own income and expenses. Data is tied to your login name.',
          back: 'Dashboard',
          close: 'Close',
          income: 'Income',
          expense: 'Expense',
          date: 'Date',
          amount: 'Amount',
          currency: 'Currency',
          category: 'Category',
          note: 'Note',
          add: 'Add entry',
          modalTitle: 'Quick entry',
          modalSub: 'Pick type → amount → save. You can edit the date anytime.',
          cancel: 'Cancel',
          saveEntry: 'Save',
          saveEdit: 'Save changes',
          modalTitleEdit: 'Edit entry',
          list: 'Entries',
          overview: 'Overview by currency',
          empty: 'No entries yet.',
          emptyHint: 'Tap «Add entry» to log your first income or expense.',
          delete: 'Delete',
          edit: 'Edit',
          actionCol: 'Actions',
          confirmDel: 'Delete this entry?',
          loadFail:
            'Could not load data. If the database is not migrated yet, run the SQL migration for personal_ledger_entries.',
          saveFail: 'Save failed.',
          totalIn: 'Total income',
          totalOut: 'Total expense',
          balance: 'Net',
          typeCol: 'Type',
          quickAmount: 'Quick fill',
          previewLabel: 'This entry',
          typingAmount: 'Enter an amount',
          saveShortcut: 'Enter — save · Esc — close',
          entryCount: 'records',
        }
      : language === 'my'
        ? {
            kicker: 'ML EXPRESS · ADMIN',
            title: 'ကုန်ကျငွေ မှတ်တမ်း',
            subtitle: 'အဝင်ငွေ၊ အထွက်ငွေ မှတ်ပါ။',
            back: 'ဒါဘုတ်',
            close: 'ပိတ်မည်',
            income: 'ဝင်ငွေ',
            expense: 'ကုန်ကျငွေ',
            date: 'နေ့စွဲ',
            amount: 'ပမာဏ',
            currency: 'ငွေကြေး',
            category: 'အမျိုးအစား',
            note: 'မှတ်ချက်',
            add: 'ထည့်ရန်',
            modalTitle: 'အမြန်မှတ်ရန်',
            modalSub: 'အမျိုးအစား ရွေး → ပမာဏ ထည့် → သိမ်းပါ။',
            cancel: 'ပိတ်ရန်',
            saveEntry: 'သိမ်းရန်',
            saveEdit: 'ပြင်ပြောင်းမှု သိမ်းရန်',
            modalTitleEdit: 'မှတ် ပြင်ရန်',
            list: 'စာရင်း',
            overview: 'ငွေကြေးအလိုက် အကျဉ်း',
            empty: 'မရှိသေးပါ။',
            emptyHint: '«ထည့်ရန်» နှိပ်ပါ။',
            delete: 'ဖျက်ရန်',
            edit: 'ပြင်ရန်',
            actionCol: 'လုပ်ဆောင်ချက်များ',
            confirmDel: 'ဖျက်မလား?',
            loadFail: 'မဖတ်နိုင်ပါ။',
            saveFail: 'သိမ်းမရပါ။',
            totalIn: 'ဝင်ငွေပေါင်း',
            totalOut: 'ထွက်ငွေပေါင်း',
            balance: 'ကျန်ငွေ',
            typeCol: 'အမျိုးအစား',
            quickAmount: 'အမြန်ထည့်',
            previewLabel: 'ဤမှတ်',
            typingAmount: 'ပမာဏ ထည့်ပါ',
            saveShortcut: 'Enter — သိမ်း',
            entryCount: 'မှတ်',
          }
        : {
            kicker: 'ML EXPRESS · ADMIN',
            title: '个人开销',
            subtitle: '记录您本人的收入与支出；数据按当前登录账号隔离保存。',
            back: '控制台',
            close: '关闭',
            income: '收入',
            expense: '支出',
            date: '日期',
            amount: '金额',
            currency: '币种',
            category: '类别',
            note: '备注',
            add: '记一笔',
            modalTitle: '记一笔',
            modalSub: '先选收入/支出 → 填金额 → 保存；可随时改日期与备注。',
            cancel: '取消',
            saveEntry: '保存记录',
            saveEdit: '保存修改',
            modalTitleEdit: '编辑记录',
            list: '流水明细',
            overview: '按币种收支概览',
            empty: '暂无记录',
            emptyHint: '点击右上角「记一笔」，记录第一笔收入或支出。',
            delete: '删除',
            edit: '编辑',
            actionCol: '操作',
            confirmDel: '确定删除该条记录？',
            loadFail: '加载失败。若数据库未执行迁移，请在 Supabase 运行 personal_ledger_entries 的 migration。',
            saveFail: '保存失败，请检查网络与表结构。',
            totalIn: '收入合计',
            totalOut: '支出合计',
            balance: '结余',
            typeCol: '类型',
            quickAmount: '常用金额',
            previewLabel: '本次预览',
            typingAmount: '请输入金额',
            saveShortcut: 'Enter 保存 · Esc 关闭 · 点击遮罩关闭',
            entryCount: '笔记录',
          };

  const reload = useCallback(async () => {
    if (!owner.trim()) {
      setRows([]);
      return;
    }
    setLoadErr('');
    try {
      const data = await personalLedgerService.listForOwner(owner.trim());
      setRows(data);
    } catch (e) {
      console.error(e);
      setLoadErr(t.loadFail);
      setRows([]);
    }
  }, [owner, t.loadFail]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!addModalOpen) return;
    const id = 'personal-ledger-modal-focus';
    if (!document.getElementById(id)) {
      const el = document.createElement('style');
      el.id = id;
      el.textContent = `
        #personal-ledger-modal input:focus-visible,
        #personal-ledger-modal select:focus-visible {
          outline: none;
          border-color: rgba(96, 165, 250, 0.95) !important;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.38);
        }
      `;
      document.head.appendChild(el);
    }
    const tmr = window.setTimeout(() => amountInputRef.current?.focus(), 80);
    return () => {
      window.clearTimeout(tmr);
    };
  }, [addModalOpen]);

  useEffect(() => {
    if (!addModalOpen) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) {
        e.preventDefault();
        e.stopPropagation();
        setEditingId(null);
        setAddModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [addModalOpen, busy]);

  const totals = useMemo(() => {
    const byCur: Record<string, { in: number; out: number }> = {};
    rows.forEach((r) => {
      const c = (r.currency || 'MMK').toUpperCase();
      const amt = Number(r.amount);
      if (!Number.isFinite(amt)) return;
      if (!byCur[c]) byCur[c] = { in: 0, out: 0 };
      if (r.kind === 'income') byCur[c].in += amt;
      else byCur[c].out += amt;
    });
    return byCur;
  }, [rows]);

  const entryCountLabel = useMemo(() => {
    const n = rows.length;
    if (language === 'en') return `${n} ${t.entryCount}`;
    if (language === 'my') return `${n} ${t.entryCount}`;
    return `共 ${n} ${t.entryCount}`;
  }, [rows.length, language, t.entryCount]);

  const handleSave = async () => {
    const amt = parseAmountInput(amountStr);
    if (amt <= 0) {
      window.alert(language === 'zh' ? '请输入大于 0 的金额' : 'Enter an amount greater than 0');
      amountInputRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      if (editingId) {
        const ok = await personalLedgerService.update(editingId, owner.trim(), {
          entry_date: entryDate,
          kind,
          amount: amt,
          currency: currency.toUpperCase(),
          category: category.trim(),
          note: note.trim(),
        });
        if (!ok) {
          window.alert(t.saveFail);
          return;
        }
      } else {
        const ok = await personalLedgerService.insert({
          owner_username: owner.trim(),
          entry_date: entryDate,
          kind,
          amount: amt,
          currency: currency.toUpperCase(),
          category: category.trim(),
          note: note.trim(),
        });
        if (!ok) {
          window.alert(t.saveFail);
          return;
        }
      }
      setAmountStr('');
      setCategory('');
      setNote('');
      setEditingId(null);
      setAddModalOpen(false);
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t.confirmDel)) return;
    const ok = await personalLedgerService.remove(id);
    if (ok) await reload();
  };

  const locale = language === 'en' ? 'en-US' : language === 'my' ? 'my-MM' : 'zh-CN';

  const openAddModal = () => {
    setEditingId(null);
    setKind('expense');
    setEntryDate(todayIso());
    setAmountStr('');
    setCurrency('MMK');
    setCategory('');
    setNote('');
    setAddModalOpen(true);
  };

  const openEditModal = (r: PersonalLedgerRow) => {
    const ymd = r.entry_date ? String(r.entry_date).slice(0, 10) : todayIso();
    setEditingId(r.id);
    setKind(r.kind);
    setEntryDate(/^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd : todayIso());
    setCurrency((r.currency || 'MMK').toUpperCase());
    setAmountStr(rowAmountToFormString(r.amount, r.currency));
    setCategory(r.category || '');
    setNote(r.note || '');
    setAddModalOpen(true);
  };

  const closeAddModal = () => {
    if (busy) return;
    setEditingId(null);
    setAddModalOpen(false);
  };

  const previewNum = parseAmountInput(amountStr);
  const previewText = previewNum > 0 ? formatMoney(previewNum, currency) : null;
  const presets = quickAmountPresets(currency);

  const inputBase: React.CSSProperties = {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 12,
    border: '1px solid rgba(100, 116, 139, 0.48)',
    background: 'rgba(15, 23, 42, 0.88)',
    color: '#f1f5f9',
    fontSize: 14,
    boxSizing: 'border-box',
  };

  return (
    <div
      style={{
        minHeight: isEmbedded ? undefined : '100vh',
        background: isEmbedded
          ? 'transparent'
          : 'linear-gradient(165deg, #0a0f1c 0%, #0f172a 28%, #172554 62%, #1e1b4b 100%)',
        padding: isEmbedded
          ? isMobile
            ? '10px 12px 24px'
            : '14px 18px 28px'
          : isMobile
            ? '16px 14px 100px'
            : '28px 24px 100px',
        color: '#f8fafc',
        fontFamily:
          "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Segoe UI', system-ui, sans-serif",
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      {!isEmbedded ? (
        <div
          aria-hidden
          style={{
            position: 'fixed',
            pointerEvents: 'none',
            inset: 0,
            background:
              'radial-gradient(ellipse 80% 50% at 10% -10%, rgba(59, 130, 246, 0.18), transparent 55%), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(139, 92, 246, 0.12), transparent 50%)',
            zIndex: 0,
          }}
        />
      ) : null}
      <div style={{ maxWidth: 1120, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <header
          style={{
            marginBottom: 26,
            padding: isMobile ? '18px 0 14px' : '22px 0 18px',
            borderBottom: '1px solid rgba(148, 163, 184, 0.12)',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start' }}>
            <div style={{ flex: '1 1 300px', minWidth: 0 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color: 'rgba(148, 163, 184, 0.9)',
                  marginBottom: 10,
                }}
              >
                {t.kicker}
              </div>
              <h1
                style={{
                  margin: 0,
                  fontSize: isMobile ? '1.55rem' : '2rem',
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  lineHeight: 1.2,
                  background: 'linear-gradient(100deg, #f8fafc 0%, #bfdbfe 45%, #e9d5ff 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                {t.title}
              </h1>
              <p
                style={{
                  margin: '12px 0 0',
                  opacity: 0.9,
                  fontSize: 14,
                  lineHeight: 1.65,
                  maxWidth: 640,
                  color: 'rgba(226, 232, 240, 0.92)',
                }}
              >
                {t.subtitle}
              </p>
              {owner ? (
                <div
                  style={{
                    marginTop: 14,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 12px',
                    borderRadius: 999,
                    background: 'rgba(30, 41, 59, 0.75)',
                    border: '1px solid rgba(96, 165, 250, 0.25)',
                    fontSize: 12,
                  }}
                >
                  <span style={{ opacity: 0.75 }}>{language === 'zh' ? '当前账号' : language === 'en' ? 'Signed in' : 'အကောင့်'}</span>
                  <strong style={{ color: '#93c5fd' }}>{owner}</strong>
                </div>
              ) : null}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignSelf: 'center' }}>
              <button
                type="button"
                onClick={openAddModal}
                style={{
                  padding: '12px 22px',
                  borderRadius: 14,
                  border: 'none',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 52%, #4f46e5 100%)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: 15,
                  boxShadow: '0 8px 28px rgba(37, 99, 235, 0.4)',
                }}
              >
                + {t.add}
              </button>
              <button
                type="button"
                onClick={() => (isEmbedded ? onCloseEmbedded?.() : navigate('/admin/dashboard'))}
                style={{
                  padding: '12px 18px',
                  borderRadius: 14,
                  border: '1px solid rgba(148, 163, 184, 0.35)',
                  background: 'rgba(15, 23, 42, 0.5)',
                  color: '#e2e8f0',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                {isEmbedded ? `✕ ${t.close}` : `← ${t.back}`}
              </button>
            </div>
          </div>
        </header>

        {loadErr ? (
          <div
            style={{
              padding: '14px 18px',
              borderRadius: 14,
              background: 'rgba(127, 29, 29, 0.38)',
              border: '1px solid rgba(248, 113, 113, 0.5)',
              marginBottom: 18,
              fontSize: 13,
            }}
          >
            {loadErr}
          </div>
        ) : null}

        <section style={{ marginBottom: 22 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'rgba(186, 230, 253, 0.85)',
              marginBottom: 12,
            }}
          >
            {t.overview}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 14,
            }}
          >
            {Object.keys(totals).length === 0 ? (
              <div
                style={{
                  padding: '28px 22px',
                  borderRadius: 18,
                  background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.55) 0%, rgba(15, 23, 42, 0.75) 100%)',
                  border: '1px dashed rgba(148, 163, 184, 0.28)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 40, marginBottom: 10, opacity: 0.9 }}>📒</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{t.empty}</div>
                <div style={{ fontSize: 13, opacity: 0.78, lineHeight: 1.55, maxWidth: 320, margin: '0 auto' }}>
                  {t.emptyHint}
                </div>
                <button
                  type="button"
                  onClick={openAddModal}
                  style={{
                    marginTop: 18,
                    padding: '10px 20px',
                    borderRadius: 12,
                    border: 'none',
                    background: 'rgba(59, 130, 246, 0.35)',
                    color: '#bfdbfe',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                >
                  + {t.add}
                </button>
              </div>
            ) : (
              Object.entries(totals).map(([cur, v]) => {
                const net = v.in - v.out;
                const positive = net >= 0;
                return (
                  <div
                    key={cur}
                    style={{
                      position: 'relative',
                      padding: '20px 20px 18px',
                      borderRadius: 18,
                      background: 'linear-gradient(155deg, rgba(30, 41, 59, 0.92) 0%, rgba(15, 23, 42, 0.75) 100%)',
                      border: '1px solid rgba(96, 165, 250, 0.22)',
                      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.22)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      aria-hidden
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 4,
                        borderRadius: '2px 0 0 2px',
                        background: positive
                          ? 'linear-gradient(180deg, #4ade80, #16a34a)'
                          : 'linear-gradient(180deg, #f87171, #dc2626)',
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          letterSpacing: '0.06em',
                          color: '#e2e8f0',
                          padding: '4px 10px',
                          borderRadius: 8,
                          background: 'rgba(51, 65, 85, 0.65)',
                          border: '1px solid rgba(148, 163, 184, 0.2)',
                        }}
                      >
                        {cur}
                      </span>
                      <span style={{ fontSize: 11, opacity: 0.65 }}>{positive ? '↑' : '↓'} {t.balance}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#86efac', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ opacity: 0.75, minWidth: 52 }}>{t.totalIn}</span>
                      <span style={{ fontWeight: 700 }}>{formatMoney(v.in, cur)}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#fca5a5', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ opacity: 0.75, minWidth: 52 }}>{t.totalOut}</span>
                      <span style={{ fontWeight: 700 }}>{formatMoney(v.out, cur)}</span>
                    </div>
                    <div
                      style={{
                        fontSize: 17,
                        fontWeight: 800,
                        color: positive ? '#bbf7d0' : '#fecaca',
                        paddingTop: 12,
                        borderTop: '1px solid rgba(148, 163, 184, 0.12)',
                      }}
                    >
                      {t.balance}：{formatMoney(net, cur)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section
          style={{
            background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.65) 0%, rgba(15, 23, 42, 0.4) 100%)',
            borderRadius: 20,
            border: '1px solid rgba(148, 163, 184, 0.14)',
            overflow: 'hidden',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.2)',
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(148, 163, 184, 0.12)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              background: 'rgba(30, 41, 59, 0.35)',
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 16 }}>{t.list}</div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                padding: '4px 11px',
                borderRadius: 999,
                background: 'rgba(59, 130, 246, 0.22)',
                color: '#bfdbfe',
                border: '1px solid rgba(96, 165, 250, 0.3)',
              }}
            >
              {entryCountLabel}
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 680 }}>
              <thead>
                <tr style={{ background: 'rgba(30, 41, 59, 0.95)' }}>
                  {[
                    t.date,
                    t.typeCol,
                    t.amount,
                    t.currency,
                    t.category,
                    t.note,
                    t.actionCol,
                  ].map((label) => (
                    <th
                      key={label}
                      style={{
                        textAlign: label === t.actionCol ? 'right' : 'left',
                        padding: '14px 16px',
                        fontWeight: 800,
                        fontSize: 12,
                        letterSpacing: '0.04em',
                        color: 'rgba(248, 250, 252, 0.92)',
                        borderBottom: '1px solid rgba(148, 163, 184, 0.18)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: 0, border: 'none' }}>
                      <div
                        style={{
                          padding: '40px 20px',
                          textAlign: 'center',
                          background: 'rgba(15, 23, 42, 0.35)',
                        }}
                      >
                        <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
                        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, opacity: 0.92 }}>{t.empty}</div>
                        <div style={{ fontSize: 13, opacity: 0.72, lineHeight: 1.55, maxWidth: 400, margin: '0 auto' }}>
                          {t.emptyHint}
                        </div>
                        <button
                          type="button"
                          onClick={openAddModal}
                          style={{
                            marginTop: 18,
                            padding: '10px 22px',
                            borderRadius: 12,
                            border: 'none',
                            background: 'rgba(59, 130, 246, 0.4)',
                            color: '#e0f2fe',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: 14,
                          }}
                        >
                          + {t.add}
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((r, idx) => (
                      <tr
                        key={r.id}
                        style={{
                          background: idx % 2 === 0 ? 'rgba(15, 23, 42, 0.42)' : 'rgba(15, 23, 42, 0.18)',
                          borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(59, 130, 246, 0.12)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLTableRowElement).style.background =
                            idx % 2 === 0 ? 'rgba(15, 23, 42, 0.42)' : 'rgba(15, 23, 42, 0.18)';
                        }}
                      >
                        <td style={{ padding: '13px 16px', whiteSpace: 'nowrap', color: '#e2e8f0' }}>
                          {r.entry_date ? new Date(`${r.entry_date}T12:00:00`).toLocaleDateString(locale) : '—'}
                        </td>
                        <td style={{ padding: '13px 16px' }}>
                          <span
                            style={{
                              padding: '4px 11px',
                              borderRadius: 999,
                              fontSize: 11,
                              fontWeight: 800,
                              letterSpacing: '0.02em',
                              background:
                                r.kind === 'income' ? 'rgba(74, 222, 128, 0.22)' : 'rgba(248, 113, 113, 0.22)',
                              color: r.kind === 'income' ? '#86efac' : '#fca5a5',
                              border: `1px solid ${r.kind === 'income' ? 'rgba(74,222,128,0.35)' : 'rgba(248,113,113,0.35)'}`,
                            }}
                          >
                            {r.kind === 'income' ? t.income : t.expense}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: '13px 16px',
                            fontWeight: 800,
                            textAlign: 'right',
                            fontVariantNumeric: 'tabular-nums',
                            color: '#f1f5f9',
                          }}
                        >
                          {formatMoney(Number(r.amount), r.currency)}
                        </td>
                        <td style={{ padding: '13px 16px', color: 'rgba(226, 232, 240, 0.9)' }}>{r.currency}</td>
                        <td style={{ padding: '13px 16px', color: 'rgba(226, 232, 240, 0.9)' }}>{r.category || '—'}</td>
                        <td style={{ padding: '13px 16px', maxWidth: 260, wordBreak: 'break-word', color: 'rgba(203, 213, 225, 0.95)' }}>
                          {r.note || '—'}
                        </td>
                        <td style={{ padding: '13px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={() => openEditModal(r)}
                              style={{
                                padding: '7px 13px',
                                borderRadius: 10,
                                border: '1px solid rgba(96, 165, 250, 0.45)',
                                background: 'rgba(37, 99, 235, 0.22)',
                                color: '#bfdbfe',
                                cursor: 'pointer',
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              {t.edit}
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDelete(r.id)}
                              style={{
                                padding: '7px 13px',
                                borderRadius: 10,
                                border: '1px solid rgba(248, 113, 113, 0.4)',
                                background: 'rgba(127, 29, 29, 0.28)',
                                color: '#fecaca',
                                cursor: 'pointer',
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              {t.delete}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {addModalOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="personal-ledger-add-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAddModal();
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1300,
            background: 'rgba(2, 8, 23, 0.82)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: isMobile ? '14px 10px 32px' : '52px 20px 48px',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <div
            id="personal-ledger-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 498,
              marginTop: isMobile ? 6 : 10,
              marginBottom: 28,
              background: 'linear-gradient(168deg, #0c1222 0%, #141c30 50%, #1a2744 100%)',
              borderRadius: 20,
              border: '1px solid rgba(96, 165, 250, 0.32)',
              boxShadow: '0 28px 80px rgba(0, 0, 0, 0.55)',
              color: '#f8fafc',
              fontFamily:
                "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Segoe UI', system-ui, sans-serif",
              boxSizing: 'border-box',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              aria-hidden
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 4,
                background: 'linear-gradient(180deg, #38bdf8 0%, #2563eb 100%)',
                opacity: 0.95,
              }}
            />
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 14,
                padding: '20px 22px 16px 26px',
                borderBottom: '1px solid rgba(148, 163, 184, 0.14)',
              }}
            >
              <div>
                <h2 id="personal-ledger-add-title" style={{ margin: 0, fontSize: 18, fontWeight: 800, lineHeight: 1.3 }}>
                  {editingId ? t.modalTitleEdit : t.modalTitle}
                </h2>
                <p style={{ margin: '8px 0 0', fontSize: 12, opacity: 0.78, lineHeight: 1.5, maxWidth: 380 }}>{t.modalSub}</p>
                <p style={{ margin: '8px 0 0', fontSize: 11, opacity: 0.58 }}>{t.saveShortcut}</p>
              </div>
              <button
                type="button"
                onClick={closeAddModal}
                disabled={busy}
                aria-label={t.cancel}
                style={{
                  flexShrink: 0,
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  border: '1px solid rgba(148, 163, 184, 0.35)',
                  background: 'rgba(15, 23, 42, 0.7)',
                  color: '#e2e8f0',
                  cursor: busy ? 'wait' : 'pointer',
                  fontSize: 22,
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>

            <form
              style={{ padding: isMobile ? '18px 18px 22px 22px' : '22px 24px 24px 28px' }}
              onSubmit={(e) => {
                e.preventDefault();
                if (!busy) void handleSave();
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: 14,
                  alignItems: 'start',
                }}
              >
                <div style={{ gridColumn: isMobile ? undefined : '1 / -1' }}>
                  <span style={{ display: 'block', fontSize: 12, marginBottom: 8, opacity: 0.82, fontWeight: 600 }}>
                    {t.typeCol}
                  </span>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 10,
                      padding: 4,
                      borderRadius: 14,
                      background: 'rgba(15, 23, 42, 0.85)',
                      border: '1px solid rgba(100, 116, 139, 0.35)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setKind('expense')}
                      style={{
                        padding: '11px 14px',
                        borderRadius: 11,
                        border: 'none',
                        fontWeight: 800,
                        fontSize: 14,
                        cursor: 'pointer',
                        transition: 'transform 0.12s ease',
                        background:
                          kind === 'expense'
                            ? 'linear-gradient(145deg, rgba(248,113,113,0.35) 0%, rgba(220,38,38,0.28) 100%)'
                            : 'transparent',
                        color: kind === 'expense' ? '#fecaca' : 'rgba(248, 250, 252, 0.55)',
                        boxShadow: kind === 'expense' ? 'inset 0 0 0 1px rgba(248,113,113,0.45)' : 'none',
                      }}
                    >
                      − {t.expense}
                    </button>
                    <button
                      type="button"
                      onClick={() => setKind('income')}
                      style={{
                        padding: '11px 14px',
                        borderRadius: 11,
                        border: 'none',
                        fontWeight: 800,
                        fontSize: 14,
                        cursor: 'pointer',
                        background:
                          kind === 'income'
                            ? 'linear-gradient(145deg, rgba(74,222,128,0.35) 0%, rgba(22,163,74,0.28) 100%)'
                            : 'transparent',
                        color: kind === 'income' ? '#bbf7d0' : 'rgba(248, 250, 252, 0.55)',
                        boxShadow: kind === 'income' ? 'inset 0 0 0 1px rgba(74,222,128,0.45)' : 'none',
                      }}
                    >
                      + {t.income}
                    </button>
                  </div>
                </div>

                <label style={{ display: 'block' }}>
                  <span style={{ display: 'block', fontSize: 12, marginBottom: 8, opacity: 0.82, fontWeight: 600 }}>
                    {t.date}
                  </span>
                  <input
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    style={{ ...inputBase, colorScheme: 'dark' }}
                  />
                </label>
                <label style={{ display: 'block' }}>
                  <span style={{ display: 'block', fontSize: 12, marginBottom: 8, opacity: 0.82, fontWeight: 600 }}>
                    {t.currency}
                  </span>
                  <select
                    value={currency}
                    onChange={(e) => {
                      const nextCur = e.target.value;
                      setCurrency(nextCur);
                      setAmountStr((prevAmt) => {
                        if (!prevAmt.trim()) return '';
                        const n = parseAmountInput(prevAmt);
                        if (nextCur === 'MMK') {
                          return formatLedgerAmountInput(String(Math.round(n)), 'MMK');
                        }
                        const base = Number(n.toFixed(2)).toString();
                        return formatLedgerAmountInput(base, nextCur);
                      });
                    }}
                    style={{ ...inputBase, cursor: 'pointer' }}
                  >
                    <option value="MMK">MMK · 缅币</option>
                    <option value="USD">USD · 美元</option>
                    <option value="CNY">CNY · 人民币</option>
                  </select>
                </label>

                <div style={{ gridColumn: isMobile ? undefined : '1 / -1' }}>
                  <span style={{ display: 'block', fontSize: 12, marginBottom: 8, opacity: 0.82, fontWeight: 600 }}>
                    {t.amount}
                  </span>
                  <input
                    ref={amountInputRef}
                    type="text"
                    name="amount"
                    autoComplete="off"
                    inputMode={currency === 'MMK' ? 'numeric' : 'decimal'}
                    value={amountStr}
                    onChange={(e) => setAmountStr(formatLedgerAmountInput(e.target.value, currency))}
                    placeholder={language === 'zh' ? '如 10,000,000' : 'e.g. 10,000,000'}
                    style={{
                      ...inputBase,
                      fontSize: 20,
                      fontWeight: 800,
                      textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums',
                      letterSpacing: '0.02em',
                      border: '1px solid rgba(96, 165, 250, 0.35)',
                      background: 'rgba(15, 23, 42, 0.95)',
                    }}
                  />
                  <div style={{ marginTop: 10 }}>
                    <span style={{ fontSize: 11, opacity: 0.65, marginBottom: 6, display: 'block' }}>{t.quickAmount}</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {presets.map((p) => {
                        const label = formatLedgerAmountInput(p, currency);
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setAmountStr(formatLedgerAmountInput(p, currency))}
                            style={{
                              padding: '6px 11px',
                              borderRadius: 999,
                              border: '1px solid rgba(96, 165, 250, 0.35)',
                              background: 'rgba(37, 99, 235, 0.18)',
                              color: '#bfdbfe',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    gridColumn: isMobile ? undefined : '1 / -1',
                    padding: '14px 16px',
                    borderRadius: 14,
                    background:
                      kind === 'income'
                        ? 'linear-gradient(135deg, rgba(22, 101, 52, 0.25) 0%, rgba(15, 23, 42, 0.6) 100%)'
                        : 'linear-gradient(135deg, rgba(127, 29, 29, 0.22) 0%, rgba(15, 23, 42, 0.6) 100%)',
                    border: `1px solid ${kind === 'income' ? 'rgba(74, 222, 128, 0.28)' : 'rgba(248, 113, 113, 0.28)'}`,
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', opacity: 0.75, marginBottom: 6 }}>
                    {t.previewLabel}
                  </div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 900,
                      fontVariantNumeric: 'tabular-nums',
                      color: kind === 'income' ? '#86efac' : '#fca5a5',
                      marginBottom: 6,
                    }}
                  >
                    {previewText ?? t.typingAmount}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.72 }}>
                    {entryDate} · {currency} · {kind === 'income' ? t.income : t.expense}
                  </div>
                </div>

                <label style={{ display: 'block', gridColumn: isMobile ? undefined : '1 / -1' }}>
                  <span style={{ display: 'block', fontSize: 12, marginBottom: 8, opacity: 0.82, fontWeight: 600 }}>
                    {t.category}
                  </span>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder={language === 'zh' ? '如：交通、餐饮、工资' : 'e.g. Transport, salary'}
                    style={inputBase}
                  />
                </label>
                <label style={{ display: 'block', gridColumn: isMobile ? undefined : '1 / -1' }}>
                  <span style={{ display: 'block', fontSize: 12, marginBottom: 8, opacity: 0.82, fontWeight: 600 }}>
                    {t.note}
                  </span>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={language === 'zh' ? '选填' : 'Optional'}
                    style={inputBase}
                  />
                </label>

                <div
                  style={{
                    gridColumn: isMobile ? undefined : '1 / -1',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 10,
                    justifyContent: 'flex-end',
                    marginTop: 6,
                    paddingTop: 16,
                    borderTop: '1px solid rgba(148, 163, 184, 0.12)',
                  }}
                >
                  <button
                    type="button"
                    disabled={busy}
                    onClick={closeAddModal}
                    style={{
                      padding: '12px 22px',
                      borderRadius: 14,
                      border: '1px solid rgba(148, 163, 184, 0.4)',
                      background: 'transparent',
                      color: '#e2e8f0',
                      fontWeight: 600,
                      cursor: busy ? 'wait' : 'pointer',
                      fontSize: 14,
                    }}
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    style={{
                      padding: '12px 26px',
                      borderRadius: 14,
                      border: 'none',
                      background: busy
                        ? 'rgba(59,130,246,0.45)'
                        : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 55%, #4f46e5 100%)',
                      color: '#fff',
                      fontWeight: 800,
                      cursor: busy ? 'wait' : 'pointer',
                      fontSize: 15,
                      boxShadow: busy ? 'none' : '0 10px 28px rgba(37, 99, 235, 0.4)',
                    }}
                  >
                    {busy ? '…' : editingId ? t.saveEdit : t.saveEntry}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default PersonalExpensePage;
