import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useResponsive } from '../hooks/useResponsive';
import {
  buildDepositRecord,
  calcLineTotalRmb,
  calcProxyFee,
  exportProxyPurchaseExcel,
  getCustomerDepositTotal,
  isProxyPurchaseRowSettled,
  newDepositEntry,
  normalizeCustomerDepositStore,
  normalizeCustomerExchangeRateStore,
  normalizeCustomerProxyFeeStore,
  normalizeProxyPurchaseStatus,
  proxyPurchaseStatusLabel,
  resolveCustomerExchangeRate,
  resolveCustomerProxyFeePercent,
  rowHasExportContent,
  sumProxyPurchaseRowsRmb,
  type CustomerDepositEntry,
  type CustomerDepositStore,
  type CustomerExchangeRateStore,
  type CustomerProxyFeeStore,
  type ProxyPurchaseRow,
  type ProxyPurchaseStatus,
} from '../utils/proxyPurchaseExcel';
import { proxyPurchaseService } from '../services/supabase';
import { isAbortLikeError } from '../utils/fetchError';
import {
  describeProxyPurchaseCloudError,
  isProxyPurchaseTableMissingError,
} from '../utils/proxyPurchaseCloudError';

const STORAGE_KEY = 'ml_admin_proxy_purchase_draft_v1';
const SUMMARY_ALL_CUSTOMERS = '__all__';
const ROWS_PER_PAGE = 20;
const EXPORT_QUICK_PICK_LIMIT = 6;
const COL_ADDRESS_WIDTH = 76;
const COL_PLATFORM_WIDTH = 80;
const COL_PRODUCT_MIN_WIDTH = 280;
const PLATFORM_PRESETS = ['拼多多', '淘宝', '天猫', '京东', '1688', '抖音'];

function isSpecificSummaryCustomer(key: string | null): key is string {
  return key !== null && key !== SUMMARY_ALL_CUSTOMERS;
}

function buildRowSeedForCustomerContext(
  summaryCustomerKey: string | null,
  customerPhoneByName: ReadonlyMap<string, string>,
  seed?: Partial<ProxyPurchaseRow>,
): Partial<ProxyPurchaseRow> {
  if (!isSpecificSummaryCustomer(summaryCustomerKey)) return seed ?? {};
  return {
    ...seed,
    customerName: summaryCustomerKey,
    phone: seed?.phone ?? customerPhoneByName.get(summaryCustomerKey) ?? '',
  };
}

function insertRowForCustomerContext(
  prev: ProxyPurchaseRow[],
  row: ProxyPurchaseRow,
  summaryCustomerKey: string | null,
): ProxyPurchaseRow[] {
  if (!isSpecificSummaryCustomer(summaryCustomerKey)) {
    return [row, ...prev];
  }
  const insertAt = prev.findIndex((item) => item.customerName.trim() === summaryCustomerKey);
  if (insertAt < 0) return [row, ...prev];
  return [...prev.slice(0, insertAt), row, ...prev.slice(insertAt)];
}

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatFilterDateLabel(isoDate: string): string {
  if (!isoDate?.trim()) return '';
  const d = new Date(`${isoDate.trim()}T12:00:00`);
  if (!Number.isFinite(d.getTime())) return isoDate.trim();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function normalizeLoadedRow(row: Partial<ProxyPurchaseRow> & { id?: string }): ProxyPurchaseRow {
  return {
    ...newRow(),
    ...row,
    id: row.id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    status: normalizeProxyPurchaseStatus(row.status),
    settled: Boolean(row.settled),
    settledAt: row.settledAt?.trim() ?? '',
  };
}

function newRow(seed?: Partial<ProxyPurchaseRow>): ProxyPurchaseRow {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    customerName: seed?.customerName ?? '',
    orderDate: seed?.orderDate ?? todayIso(),
    address: seed?.address ?? '',
    phone: seed?.phone ?? '',
    platform: seed?.platform ?? '',
    productName: '',
    quantity: '',
    unitPrice: '',
    status: normalizeProxyPurchaseStatus(seed?.status),
    settled: false,
    settledAt: '',
  };
}

function parseNum(s: string): number {
  const n = parseFloat(String(s).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function rowHasContent(row: ProxyPurchaseRow): boolean {
  return rowHasExportContent(row);
}

type SummaryExportScope = 'settled' | 'open' | 'date';

function filterSummaryExportRows(
  rows: ProxyPurchaseRow[],
  customerKey: string,
  scope: SummaryExportScope,
  orderDate?: string,
): ProxyPurchaseRow[] {
  return rows.filter((row) => {
    if (!rowHasExportContent(row)) return false;
    if (row.customerName.trim() !== customerKey) return false;
    if (scope === 'settled') return isProxyPurchaseRowSettled(row);
    if (scope === 'open') return !isProxyPurchaseRowSettled(row);
    if (scope === 'date') {
      const date = orderDate?.trim();
      if (!date) return false;
      return row.orderDate.trim() === date;
    }
    return false;
  });
}

function formatSettledAt(iso: string | undefined, language: 'zh' | 'en' | 'my'): string {
  if (!iso?.trim()) return '';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso.trim();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (language === 'en') return `Settled ${date} ${time}`;
  if (language === 'my') return `${date} ${time}`;
  return `结清于 ${date} ${time}`;
}

type SavedDraft = {
  proxyFeePercent: string;
  exchangeRate: string;
  rows: ProxyPurchaseRow[];
  customerDeposits?: CustomerDepositStore;
  customerProxyFees?: CustomerProxyFeeStore;
  customerExchangeRates?: CustomerExchangeRateStore;
};

function loadDraft(): SavedDraft {
  if (typeof window === 'undefined') {
    return { proxyFeePercent: '5', exchangeRate: '595', rows: [newRow()] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { proxyFeePercent: '5', exchangeRate: '595', rows: [newRow()] };
    const parsed = JSON.parse(raw) as SavedDraft;
    if (!Array.isArray(parsed.rows) || parsed.rows.length === 0) {
      return {
        proxyFeePercent: parsed.proxyFeePercent || '5',
        exchangeRate: parsed.exchangeRate || '595',
        rows: [newRow()],
      };
    }
    return {
      proxyFeePercent: parsed.proxyFeePercent || '5',
      exchangeRate: parsed.exchangeRate || '595',
      rows: parsed.rows.map((r) => normalizeLoadedRow(r)),
      customerDeposits: normalizeCustomerDepositStore(parsed.customerDeposits),
      customerProxyFees: normalizeCustomerProxyFeeStore(parsed.customerProxyFees),
      customerExchangeRates: normalizeCustomerExchangeRateStore(parsed.customerExchangeRates),
    };
  } catch {
    return { proxyFeePercent: '5', exchangeRate: '595', rows: [newRow()] };
  }
}

const glassCard: React.CSSProperties = {
  borderRadius: 16,
  border: '1px solid rgba(148, 163, 184, 0.16)',
  background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.72) 0%, rgba(15, 23, 42, 0.55) 100%)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255,255,255,0.06)',
};

export type ProxyPurchasePageProps = {
  variant?: 'page' | 'embedded';
  onCloseEmbedded?: () => void;
};

const ProxyPurchasePage: React.FC<ProxyPurchasePageProps> = ({
  variant = 'page',
  onCloseEmbedded,
}) => {
  const navigate = useNavigate();
  const isEmbedded = variant === 'embedded';
  const { language } = useLanguage();
  const { isMobile } = useResponsive();

  const [proxyFeePercent, setProxyFeePercent] = useState('5');
  const [workspaceDefaultFee, setWorkspaceDefaultFee] = useState('5');
  const [workspaceDefaultRate, setWorkspaceDefaultRate] = useState('595');
  const [exchangeRate, setExchangeRate] = useState('595');
  const [rows, setRows] = useState<ProxyPurchaseRow[]>([newRow()]);
  const [customerDeposits, setCustomerDeposits] = useState<CustomerDepositStore>({});
  const [customerProxyFees, setCustomerProxyFees] = useState<CustomerProxyFeeStore>({});
  const [customerExchangeRates, setCustomerExchangeRates] = useState<CustomerExchangeRateStore>({});
  const [remittanceModalOpen, setRemittanceModalOpen] = useState(false);
  const [depositDraftDate, setDepositDraftDate] = useState(todayIso());
  const [depositDraftAmount, setDepositDraftAmount] = useState('');
  const [depositDraftNote, setDepositDraftNote] = useState('');
  const [editingDepositId, setEditingDepositId] = useState<string | null>(null);
  const [editDepositDraft, setEditDepositDraft] = useState<CustomerDepositEntry | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [savedPulse, setSavedPulse] = useState(false);
  const [cloudLoading, setCloudLoading] = useState(true);
  const [cloudErr, setCloudErr] = useState('');
  const [cloudReady, setCloudReady] = useState(false);
  const [cloudSyncDisabled, setCloudSyncDisabled] = useState(false);
  const [cloudRetrying, setCloudRetrying] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFilterCustomer, setExportFilterCustomer] = useState('');
  const [exportFilterDate, setExportFilterDate] = useState('');
  const [exportCustomerDropdownOpen, setExportCustomerDropdownOpen] = useState(false);
  const [listPage, setListPage] = useState(1);
  const [exportSelected, setExportSelected] = useState<Record<string, boolean>>({});
  const [settleFilter, setSettleFilter] = useState<'all' | 'open' | 'settled'>('all');
  const [summaryExportScope, setSummaryExportScope] = useState<SummaryExportScope>('settled');
  const [summaryExportDate, setSummaryExportDate] = useState('');
  const [summaryCustomerKey, setSummaryCustomerKey] = useState<string | null>(SUMMARY_ALL_CUSTOMERS);

  const currentOwner = useCallback(
    () =>
      (typeof window !== 'undefined' &&
        (sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser'))) ||
      '',
    [],
  );

  const syncToCloud = useCallback(
    async (payload: {
      proxyFeePercent: string;
      exchangeRate: string;
      rows: ProxyPurchaseRow[];
      customerDeposits: CustomerDepositStore;
      customerProxyFees: CustomerProxyFeeStore;
      customerExchangeRates: CustomerExchangeRateStore;
    }) => {
      await proxyPurchaseService.upsertWorkspace({
        proxy_fee_percent: payload.proxyFeePercent,
        exchange_rate: payload.exchangeRate,
        rows: payload.rows,
        customer_deposits: payload.customerDeposits,
        customer_proxy_fees: payload.customerProxyFees,
        customer_exchange_rates: payload.customerExchangeRates,
        updated_by: currentOwner(),
      });
    },
    [currentOwner],
  );

  const loadFromCloud = useCallback(async () => {
    const localDraft = loadDraft();
    const cloud = await proxyPurchaseService.getWorkspace();
    const localHasRows = localDraft.rows.some(rowHasContent);
    const cloudHasRows = (cloud?.rows ?? []).some(rowHasContent);

    if (cloudHasRows) {
      const defaultFee = cloud!.proxy_fee_percent || '5';
      const defaultRate = cloud!.exchange_rate || '595';
      setWorkspaceDefaultFee(defaultFee);
      setWorkspaceDefaultRate(defaultRate);
      setProxyFeePercent(defaultFee);
      setExchangeRate(defaultRate);
      setRows(cloud!.rows.length > 0 ? cloud!.rows.map((r) => normalizeLoadedRow(r)) : [newRow()]);
      setCustomerDeposits(normalizeCustomerDepositStore(cloud!.customer_deposits));
      setCustomerProxyFees(normalizeCustomerProxyFeeStore(cloud!.customer_proxy_fees));
      setCustomerExchangeRates(normalizeCustomerExchangeRateStore(cloud!.customer_exchange_rates));
    } else if (localHasRows) {
      setWorkspaceDefaultFee(localDraft.proxyFeePercent);
      setWorkspaceDefaultRate(localDraft.exchangeRate);
      setProxyFeePercent(localDraft.proxyFeePercent);
      setExchangeRate(localDraft.exchangeRate);
      setRows(localDraft.rows.map((r) => normalizeLoadedRow(r)));
      setCustomerDeposits(normalizeCustomerDepositStore(localDraft.customerDeposits));
      setCustomerProxyFees(normalizeCustomerProxyFeeStore(localDraft.customerProxyFees));
      setCustomerExchangeRates(normalizeCustomerExchangeRateStore(localDraft.customerExchangeRates));
      await syncToCloud({
        proxyFeePercent: localDraft.proxyFeePercent,
        exchangeRate: localDraft.exchangeRate,
        rows: localDraft.rows.map((r) => normalizeLoadedRow(r)),
        customerDeposits: normalizeCustomerDepositStore(localDraft.customerDeposits),
        customerProxyFees: normalizeCustomerProxyFeeStore(localDraft.customerProxyFees),
        customerExchangeRates: normalizeCustomerExchangeRateStore(localDraft.customerExchangeRates),
      });
    } else {
      setWorkspaceDefaultFee(localDraft.proxyFeePercent);
      setWorkspaceDefaultRate(localDraft.exchangeRate);
      setProxyFeePercent(localDraft.proxyFeePercent);
      setExchangeRate(localDraft.exchangeRate);
      setRows(localDraft.rows.map((r) => normalizeLoadedRow(r)));
      setCustomerDeposits(normalizeCustomerDepositStore(localDraft.customerDeposits));
      setCustomerProxyFees(normalizeCustomerProxyFeeStore(localDraft.customerProxyFees));
      setCustomerExchangeRates(normalizeCustomerExchangeRateStore(localDraft.customerExchangeRates));
    }
    setCloudErr('');
    setCloudSyncDisabled(false);
  }, [syncToCloud]);

  const retryCloudSync = useCallback(async () => {
    setCloudRetrying(true);
    setCloudErr('');
    try {
      await loadFromCloud();
      await syncToCloud({
        proxyFeePercent: workspaceDefaultFee,
        exchangeRate: workspaceDefaultRate,
        rows,
        customerDeposits,
        customerProxyFees,
        customerExchangeRates,
      });
      setSavedPulse(true);
      window.setTimeout(() => setSavedPulse(false), 1400);
    } catch (e) {
      if (isAbortLikeError(e)) return;
      console.error(e);
      setCloudSyncDisabled(isProxyPurchaseTableMissingError(e));
      setCloudErr(describeProxyPurchaseCloudError(e, language));
    } finally {
      setCloudRetrying(false);
    }
  }, [
    customerDeposits,
    customerExchangeRates,
    customerProxyFees,
    language,
    loadFromCloud,
    workspaceDefaultFee,
    workspaceDefaultRate,
    rows,
    syncToCloud,
  ]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setCloudLoading(true);
      setCloudErr('');
      try {
        await loadFromCloud();
        if (!cancelled) setCloudReady(true);
      } catch (e) {
        if (!cancelled && !isAbortLikeError(e)) {
          console.error(e);
        }
        if (!cancelled && !isAbortLikeError(e)) {
          const draft = loadDraft();
          setProxyFeePercent(draft.proxyFeePercent);
          setWorkspaceDefaultFee(draft.proxyFeePercent);
          setWorkspaceDefaultRate(draft.exchangeRate);
          setExchangeRate(draft.exchangeRate);
          setRows(draft.rows.map((r) => normalizeLoadedRow(r)));
          setCustomerDeposits(normalizeCustomerDepositStore(draft.customerDeposits));
          setCustomerProxyFees(normalizeCustomerProxyFeeStore(draft.customerProxyFees));
          setCustomerExchangeRates(normalizeCustomerExchangeRateStore(draft.customerExchangeRates));
          setCloudSyncDisabled(isProxyPurchaseTableMissingError(e));
          setCloudErr(describeProxyPurchaseCloudError(e, language));
          setCloudReady(true);
        }
      } finally {
        if (!cancelled) setCloudLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [language, loadFromCloud]);

  useEffect(() => {
    if (!cloudReady || cloudSyncDisabled) return undefined;
    let hideTimer: number | undefined;
    const saveTimer = window.setTimeout(() => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          proxyFeePercent: workspaceDefaultFee,
          exchangeRate: workspaceDefaultRate,
          rows,
          customerDeposits,
          customerProxyFees,
          customerExchangeRates,
        }),
      );
      void syncToCloud({
        proxyFeePercent: workspaceDefaultFee,
        exchangeRate: workspaceDefaultRate,
        rows,
        customerDeposits,
        customerProxyFees,
        customerExchangeRates,
      })
        .then(() => {
          setCloudErr('');
          setCloudSyncDisabled(false);
          setSavedPulse(true);
          hideTimer = window.setTimeout(() => setSavedPulse(false), 1400);
        })
        .catch((e) => {
          if (isAbortLikeError(e)) return;
          console.error(e);
          setCloudSyncDisabled(isProxyPurchaseTableMissingError(e));
          setCloudErr(describeProxyPurchaseCloudError(e, language));
        });
    }, 400);
    return () => {
      window.clearTimeout(saveTimer);
      if (hideTimer) window.clearTimeout(hideTimer);
    };
  }, [
    workspaceDefaultFee,
    workspaceDefaultRate,
    rows,
    customerDeposits,
    customerProxyFees,
    customerExchangeRates,
    cloudReady,
    cloudSyncDisabled,
    language,
    syncToCloud,
  ]);

  useEffect(() => {
    const styleId = 'proxy-purchase-page-styles';
    if (document.getElementById(styleId)) return undefined;
    const el = document.createElement('style');
    el.id = styleId;
    el.textContent = `
      .proxy-purchase-root input:focus-visible,
      .proxy-purchase-root button:focus-visible {
        outline: 2px solid rgba(45, 212, 191, 0.65);
        outline-offset: 2px;
      }
      .proxy-purchase-table-scroll::-webkit-scrollbar { height: 10px; }
      .proxy-purchase-table-scroll::-webkit-scrollbar-track {
        background: rgba(15, 23, 42, 0.45);
        border-radius: 8px;
      }
      .proxy-purchase-table-scroll::-webkit-scrollbar-thumb {
        background: rgba(94, 234, 212, 0.35);
        border-radius: 8px;
      }
      .proxy-purchase-row:hover { background: rgba(45, 212, 191, 0.06) !important; }
      .proxy-purchase-cell-input {
        width: 100%;
        box-sizing: border-box;
        padding: 7px 9px;
        border-radius: 9px;
        border: 1px solid transparent;
        background: rgba(15, 23, 42, 0.45);
        color: #f8fafc;
        font-size: 13px;
        outline: none;
        transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
      }
      .proxy-purchase-cell-input:hover {
        border-color: rgba(148, 163, 184, 0.28);
        background: rgba(15, 23, 42, 0.65);
      }
      .proxy-purchase-cell-input:focus {
        border-color: rgba(45, 212, 191, 0.55);
        background: rgba(15, 23, 42, 0.82);
        box-shadow: 0 0 0 3px rgba(45, 212, 191, 0.12);
      }
      .proxy-purchase-cell-input::placeholder { color: rgba(148, 163, 184, 0.55); }
      .proxy-purchase-cell-input[type="number"]::-webkit-outer-spin-button,
      .proxy-purchase-cell-input[type="number"]::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
      .proxy-purchase-cell-input[type="number"] {
        -moz-appearance: textfield;
        appearance: textfield;
      }
      .proxy-purchase-status-select {
        cursor: pointer;
        font-weight: 700;
        font-size: 12px;
        padding-right: 24px;
      }
      .proxy-purchase-status-select--pending {
        color: #fde68a;
        border-color: rgba(250, 204, 21, 0.35) !important;
        background: rgba(234, 179, 8, 0.12) !important;
      }
      .proxy-purchase-status-select--receive {
        color: #6ee7b7;
        border-color: rgba(52, 211, 153, 0.35) !important;
        background: rgba(16, 185, 129, 0.12) !important;
      }
      .proxy-purchase-row--settled {
        background: rgba(30, 58, 95, 0.28) !important;
      }
      .proxy-purchase-row--settled td {
        vertical-align: middle;
      }
      .proxy-purchase-readonly-cell {
        display: block;
        width: 100%;
        box-sizing: border-box;
        padding: 7px 9px;
        border-radius: 9px;
        border: 1px solid rgba(148, 163, 184, 0.12);
        background: rgba(51, 65, 85, 0.32);
        color: rgba(226, 232, 240, 0.92);
        font-size: 13px;
        cursor: default;
        user-select: text;
      }
      .proxy-purchase-readonly-cell--table {
        display: inline;
        width: auto;
        max-width: 100%;
        padding: 0;
        border: none;
        background: transparent;
        border-radius: 0;
        line-height: 1.35;
        word-break: break-word;
        overflow-wrap: anywhere;
      }
      .proxy-purchase-readonly-cell--customer {
        font-weight: 600;
        color: #f1f5f9;
        white-space: nowrap;
      }
      .proxy-purchase-row--settled .proxy-purchase-settled-badge {
        padding: 2px 6px;
        font-size: 10px;
      }
      .proxy-purchase-settled-badge {
        display: inline-flex;
        align-items: center;
        padding: 4px 8px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 800;
        color: #93c5fd;
        background: rgba(59, 130, 246, 0.16);
        border: 1px solid rgba(96, 165, 250, 0.28);
        white-space: nowrap;
      }
    `;
    document.head.appendChild(el);
    return () => el.remove();
  }, []);

  const feePctNum = parseNum(proxyFeePercent);
  const rateNum = parseNum(exchangeRate);

  const feeForCustomer = useCallback(
    (customerKey: string) =>
      resolveCustomerProxyFeePercent(customerKey, customerProxyFees, workspaceDefaultFee),
    [customerProxyFees, workspaceDefaultFee],
  );

  const rateForCustomer = useCallback(
    (customerKey: string) =>
      resolveCustomerExchangeRate(customerKey, customerExchangeRates, workspaceDefaultRate),
    [customerExchangeRates, workspaceDefaultRate],
  );

  const handleSummaryCustomerChange = useCallback(
    (customerKey: string) => {
      setSummaryCustomerKey(customerKey);
      if (customerKey === SUMMARY_ALL_CUSTOMERS) {
        setProxyFeePercent(workspaceDefaultFee);
        setExchangeRate(workspaceDefaultRate);
        return;
      }
      setProxyFeePercent(customerProxyFees[customerKey] ?? workspaceDefaultFee);
      setExchangeRate(customerExchangeRates[customerKey] ?? workspaceDefaultRate);
    },
    [customerExchangeRates, customerProxyFees, workspaceDefaultFee, workspaceDefaultRate],
  );

  const handleProxyFeePercentChange = useCallback(
    (value: string) => {
      setProxyFeePercent(value);
      if (isSpecificSummaryCustomer(summaryCustomerKey)) {
        setCustomerProxyFees((prev) => ({ ...prev, [summaryCustomerKey]: value }));
      }
    },
    [summaryCustomerKey],
  );

  const handleExchangeRateChange = useCallback(
    (value: string) => {
      setExchangeRate(value);
      if (isSpecificSummaryCustomer(summaryCustomerKey)) {
        setCustomerExchangeRates((prev) => ({ ...prev, [summaryCustomerKey]: value }));
      }
    },
    [summaryCustomerKey],
  );

  useEffect(() => {
    setExportSelected((prev) => {
      const next = { ...prev };
      rows.forEach((r) => {
        if (rowHasExportContent(r) && next[r.id] === undefined) {
          next[r.id] = true;
        }
      });
      Object.keys(next).forEach((id) => {
        if (!rows.some((r) => r.id === id)) delete next[id];
      });
      return next;
    });
  }, [rows]);

  const exportableRows = useMemo(() => rows.filter(rowHasExportContent), [rows]);

  /** 批量结清/撤销、全选等操作的当前范围（客户页仅该客户，总览页为全部） */
  const batchScopeRows = useMemo(() => {
    if (!isSpecificSummaryCustomer(summaryCustomerKey)) return exportableRows;
    return exportableRows.filter((r) => r.customerName.trim() === summaryCustomerKey);
  }, [exportableRows, summaryCustomerKey]);

  const batchSettleEligibleCount = useMemo(
    () =>
      batchScopeRows.filter((r) => exportSelected[r.id] && !isProxyPurchaseRowSettled(r)).length,
    [batchScopeRows, exportSelected],
  );

  const batchUnsettleEligibleCount = useMemo(
    () =>
      batchScopeRows.filter((r) => exportSelected[r.id] && isProxyPurchaseRowSettled(r)).length,
    [batchScopeRows, exportSelected],
  );

  const exportCustomerOptions = useMemo(() => {
    const counts = new Map<string, number>();
    exportableRows.forEach((r) => {
      const n = r.customerName.trim();
      if (n) counts.set(n, (counts.get(n) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0], 'zh-CN'))
      .map(([name, count]) => ({ name, count }));
  }, [exportableRows]);

  const exportDateOptions = useMemo(() => {
    const counts = new Map<string, number>();
    exportableRows.forEach((r) => {
      const d = r.orderDate.trim();
      if (d) counts.set(d, (counts.get(d) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, count]) => ({ date, count }));
  }, [exportableRows]);

  const exportCustomerSuggestions = useMemo(() => {
    const q = exportFilterCustomer.trim().toLowerCase();
    const list = q
      ? exportCustomerOptions.filter((item) => item.name.toLowerCase().includes(q))
      : exportCustomerOptions;
    return list.slice(0, 40);
  }, [exportCustomerOptions, exportFilterCustomer]);

  const filteredExportRows = useMemo(() => {
    let result = exportableRows;
    const q = exportFilterCustomer.trim().toLowerCase();
    if (q) {
      result = result.filter((r) => r.customerName.trim().toLowerCase().includes(q));
    }
    const dateQ = exportFilterDate.trim();
    if (dateQ) {
      result = result.filter((r) => r.orderDate.trim() === dateQ);
    }
    return result;
  }, [exportableRows, exportFilterCustomer, exportFilterDate]);

  useEffect(() => {
    if (exportModalOpen) {
      setExportFilterCustomer('');
      setExportFilterDate('');
      setExportCustomerDropdownOpen(false);
    }
  }, [exportModalOpen]);

  const selectedExportRows = useMemo(
    () => exportableRows.filter((r) => exportSelected[r.id]),
    [exportableRows, exportSelected],
  );

  const selectedExportTotalRmb = useMemo(() => {
    let total = 0;
    selectedExportRows.forEach((row) => {
      total += calcLineTotalRmb(parseNum(row.unitPrice), feeForCustomer(row.customerName.trim()));
    });
    return round2(total);
  }, [selectedExportRows, feeForCustomer]);

  const selectedExportTotalMmk = useMemo(() => {
    let total = 0;
    selectedExportRows.forEach((row) => {
      const rmb = calcLineTotalRmb(parseNum(row.unitPrice), feeForCustomer(row.customerName.trim()));
      total += Math.round(rmb * rateForCustomer(row.customerName.trim()));
    });
    return total;
  }, [selectedExportRows, feeForCustomer, rateForCustomer]);

  const allExportableSelected =
    filteredExportRows.length > 0 && filteredExportRows.every((r) => exportSelected[r.id]);

  const allBatchScopeSelected =
    batchScopeRows.length > 0 && batchScopeRows.every((r) => exportSelected[r.id]);

  const toggleExportRow = useCallback((id: string, checked?: boolean) => {
    setExportSelected((prev) => ({
      ...prev,
      [id]: checked ?? !prev[id],
    }));
  }, []);

  const selectAllExportable = useCallback(() => {
    setExportSelected((prev) => {
      const next = { ...prev };
      filteredExportRows.forEach((r) => {
        next[r.id] = true;
      });
      return next;
    });
  }, [filteredExportRows]);

  const selectNoneExportable = useCallback(() => {
    setExportSelected((prev) => {
      const next = { ...prev };
      filteredExportRows.forEach((r) => {
        next[r.id] = false;
      });
      return next;
    });
  }, [filteredExportRows]);

  const selectAllInBatchScope = useCallback(() => {
    setExportSelected((prev) => {
      const next = { ...prev };
      batchScopeRows.forEach((r) => {
        next[r.id] = true;
      });
      return next;
    });
  }, [batchScopeRows]);

  const selectNoneInBatchScope = useCallback(() => {
    setExportSelected((prev) => {
      const next = { ...prev };
      batchScopeRows.forEach((r) => {
        next[r.id] = false;
      });
      return next;
    });
  }, [batchScopeRows]);

  const selectFilteredCustomer = useCallback((customerName: string) => {
    setExportFilterCustomer(customerName);
    setExportCustomerDropdownOpen(false);
    setExportSelected((prev) => {
      const next = { ...prev };
      const key = customerName.trim().toLowerCase();
      exportableRows.forEach((r) => {
        if (r.customerName.trim().toLowerCase() === key) {
          next[r.id] = true;
        }
      });
      return next;
    });
  }, [exportableRows]);

  const handleExportDateChange = useCallback(
    (orderDate: string) => {
      setExportFilterDate(orderDate);
      if (!orderDate) return;
      setExportSelected((prev) => {
        const next = { ...prev };
        exportableRows.forEach((r) => {
          if (r.orderDate.trim() === orderDate) {
            next[r.id] = true;
          }
        });
        return next;
      });
    },
    [exportableRows],
  );

  const clearExportFilters = useCallback(() => {
    setExportFilterCustomer('');
    setExportFilterDate('');
    setExportCustomerDropdownOpen(false);
  }, []);

  const filledRowCount = exportableRows.length;

  const openBillingRows = useMemo(
    () => rows.filter((row) => !isProxyPurchaseRowSettled(row)),
    [rows],
  );

  const settleCounts = useMemo(
    () => ({
      all: rows.length,
      open: rows.filter((r) => !isProxyPurchaseRowSettled(r)).length,
      settled: rows.filter((r) => isProxyPurchaseRowSettled(r)).length,
    }),
    [rows],
  );

  const displayRows = useMemo(() => {
    let filtered = rows;
    if (settleFilter === 'open') filtered = filtered.filter((r) => !isProxyPurchaseRowSettled(r));
    else if (settleFilter === 'settled') filtered = filtered.filter((r) => isProxyPurchaseRowSettled(r));
    if (isSpecificSummaryCustomer(summaryCustomerKey)) {
      filtered = filtered.filter((r) => r.customerName.trim() === summaryCustomerKey);
    }
    return filtered;
  }, [rows, settleFilter, summaryCustomerKey]);

  useEffect(() => {
    setListPage(1);
  }, [summaryCustomerKey]);

  const listTotalPages = useMemo(
    () => Math.max(1, Math.ceil(displayRows.length / ROWS_PER_PAGE)),
    [displayRows.length],
  );

  const paginatedRows = useMemo(() => {
    const start = (listPage - 1) * ROWS_PER_PAGE;
    return displayRows.slice(start, start + ROWS_PER_PAGE);
  }, [displayRows, listPage]);

  useEffect(() => {
    setListPage((page) => Math.min(page, listTotalPages));
  }, [listTotalPages]);

  const customerRmbBreakdown = useMemo(() => {
    const byCustomer = new Map<string, number>();
    openBillingRows.forEach((row) => {
      const line = calcLineTotalRmb(parseNum(row.unitPrice), feeForCustomer(row.customerName.trim()));
      if (line <= 0) return;
      const key = row.customerName.trim();
      byCustomer.set(key, (byCustomer.get(key) ?? 0) + line);
    });
    return Array.from(byCustomer.entries())
      .map(([customerName, rmb]) => ({
        customerName,
        totalRmb: round2(rmb),
        totalMmk: Math.round(rmb * rateForCustomer(customerName)),
      }))
      .sort((a, b) => {
        if (!a.customerName) return 1;
        if (!b.customerName) return -1;
        return a.customerName.localeCompare(b.customerName, 'zh-CN');
      });
  }, [openBillingRows, feeForCustomer, rateForCustomer]);

  const customerDirectory = useMemo(() => {
    const amountByName = new Map(
      customerRmbBreakdown.map((item) => [item.customerName, item] as const),
    );
    const names = new Set<string>();
    openBillingRows.forEach((row) => names.add(row.customerName.trim()));
    Object.keys(customerDeposits).forEach((name) => names.add(name));
    Object.keys(customerProxyFees).forEach((name) => names.add(name));
    Object.keys(customerExchangeRates).forEach((name) => names.add(name));
    return Array.from(names)
      .sort((a, b) => {
        if (!a) return 1;
        if (!b) return -1;
        return a.localeCompare(b, 'zh-CN');
      })
      .map((customerName) => {
        const amounts = amountByName.get(customerName);
        return {
          customerName,
          shoppingRmb: amounts?.totalRmb ?? 0,
          shoppingMmk: amounts?.totalMmk ?? 0,
        };
      });
  }, [openBillingRows, customerRmbBreakdown, customerDeposits, customerProxyFees, customerExchangeRates]);

  const customerPhoneByName = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((row) => {
      const key = row.customerName.trim();
      const phone = row.phone.trim();
      if (phone) map.set(key, phone);
    });
    return map;
  }, [rows]);

  const selectedCustomerDepositOriginal = useMemo(() => {
    if (summaryCustomerKey === null) return 0;
    if (summaryCustomerKey === SUMMARY_ALL_CUSTOMERS) {
      return round2(
        Object.keys(customerDeposits).reduce(
          (sum, key) => sum + getCustomerDepositTotal(customerDeposits, key),
          0,
        ),
      );
    }
    return getCustomerDepositTotal(customerDeposits, summaryCustomerKey);
  }, [customerDeposits, summaryCustomerKey]);

  const selectedCustomerSettled = useMemo(() => {
    if (summaryCustomerKey === null) return 0;
    if (summaryCustomerKey === SUMMARY_ALL_CUSTOMERS) {
      return sumProxyPurchaseRowsRmb(rows, feeForCustomer, { settled: true });
    }
    return sumProxyPurchaseRowsRmb(rows, feeForCustomer, {
      customerKey: summaryCustomerKey,
      settled: true,
    });
  }, [rows, summaryCustomerKey, feeForCustomer]);

  const selectedCustomerDepositRemaining = useMemo(
    () => round2(selectedCustomerDepositOriginal - selectedCustomerSettled),
    [selectedCustomerDepositOriginal, selectedCustomerSettled],
  );

  const summaryExportRows = useMemo(() => {
    if (!isSpecificSummaryCustomer(summaryCustomerKey)) return [];
    return filterSummaryExportRows(rows, summaryCustomerKey, summaryExportScope, summaryExportDate);
  }, [rows, summaryCustomerKey, summaryExportScope, summaryExportDate]);

  const summaryExportTotalRmb = useMemo(() => {
    let total = 0;
    summaryExportRows.forEach((row) => {
      total += calcLineTotalRmb(parseNum(row.unitPrice), feeForCustomer(row.customerName.trim()));
    });
    return round2(total);
  }, [summaryExportRows, feeForCustomer]);

  const summaryExportDateOptions = useMemo(() => {
    if (!isSpecificSummaryCustomer(summaryCustomerKey)) return [];
    const dates = new Set<string>();
    rows.forEach((row) => {
      if (row.customerName.trim() !== summaryCustomerKey) return;
      if (!rowHasExportContent(row)) return;
      const d = row.orderDate.trim();
      if (d) dates.add(d);
    });
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  }, [rows, summaryCustomerKey]);

  const selectedCustomerBalance = selectedCustomerDepositRemaining;

  const selectedCustomerBalanceMmk = useMemo(() => {
    if (summaryCustomerKey === null) return 0;
    if (summaryCustomerKey === SUMMARY_ALL_CUSTOMERS) {
      const names = new Set<string>();
      Object.keys(customerDeposits).forEach((name) => names.add(name));
      rows.forEach((row) => {
        if (isProxyPurchaseRowSettled(row)) names.add(row.customerName.trim());
      });
      let total = 0;
      names.forEach((name) => {
        const deposit = getCustomerDepositTotal(customerDeposits, name);
        const settled = sumProxyPurchaseRowsRmb(rows, feeForCustomer, {
          customerKey: name,
          settled: true,
        });
        total += Math.round(round2(deposit - settled) * rateForCustomer(name));
      });
      return total;
    }
    return Math.round(selectedCustomerBalance * rateForCustomer(summaryCustomerKey));
  }, [
    customerDeposits,
    feeForCustomer,
    rows,
    rateForCustomer,
    selectedCustomerBalance,
    summaryCustomerKey,
  ]);

  useEffect(() => {
    if (summaryExportScope !== 'date') return;
    if (summaryExportDate && summaryExportDateOptions.includes(summaryExportDate)) return;
    setSummaryExportDate(summaryExportDateOptions[0] ?? '');
  }, [summaryExportScope, summaryExportDate, summaryExportDateOptions]);

  useEffect(() => {
    if (customerDirectory.length === 0) {
      setSummaryCustomerKey(null);
      return;
    }
    setSummaryCustomerKey((current) => {
      if (current === SUMMARY_ALL_CUSTOMERS) return SUMMARY_ALL_CUSTOMERS;
      if (current !== null && customerDirectory.some((item) => item.customerName === current)) {
        return current;
      }
      return SUMMARY_ALL_CUSTOMERS;
    });
  }, [customerDirectory]);

  useEffect(() => {
    if (!isSpecificSummaryCustomer(summaryCustomerKey)) return;
    setProxyFeePercent(customerProxyFees[summaryCustomerKey] ?? workspaceDefaultFee);
    setExchangeRate(customerExchangeRates[summaryCustomerKey] ?? workspaceDefaultRate);
  }, [summaryCustomerKey, customerProxyFees, customerExchangeRates, workspaceDefaultFee, workspaceDefaultRate]);

  const t =
    language === 'en'
      ? {
          kicker: 'ML Express · Admin',
          hubTitle: 'Metric management',
          draftsTabBtn: '📑 Import drafts',
          pricesTabBtn: '💲 Product prices',
          personalTabBtn: '🧾 Personal expenses',
          proxyTabBtn: '🛒 Proxy purchase',
          quoteTabBtn: '📋 Proxy quote sheet',
          title: 'Proxy purchase',
          subtitle: 'Record orders, tweak fee & rate live, export a polished Excel for your customer.',
          close: 'Close',
          back: 'Metric management',
          backMetric: 'Back to dashboard',
          proxyFee: 'Proxy fee',
          exchangeRate: 'Exchange rate',
          feeRateCardTitle: 'Fee & rate',
          combinedCardTitle: 'Customer settlement',
          feeLinkedHint: 'Linked to customer',
          rateLinkedHint: 'Linked to customer',
          addRow: 'Add row',
          duplicateRow: 'Duplicate last',
          clearAll: 'Clear all',
          exportExcel: 'Export Excel',
          colNo: '#',
          colCustomer: 'Customer',
          colDate: 'Date',
          colAddress: 'Address',
          colPlatform: 'Platform',
          colProduct: 'Product',
          colStatus: 'Status',
          statusPending: 'pending',
          statusReceived: 'receive',
          colQty: 'Qty',
          colUnitPrice: 'Unit ¥',
          colFee: 'Fee',
          colTotal: 'Total ¥',
          colActions: 'Actions',
          delete: 'Remove',
          totalRmb: 'Customer balance',
          totalRmbByCustomer: 'Per customer',
          customerDeposit: 'Deposit',
          customerSettled: 'Settled',
          depositOriginalTotal: 'Total deposited',
          depositSettledDeduct: 'Settled purchases',
          depositBalance: 'Deposit balance',
          customerShopping: 'Purchases',
          depositDate: 'Date',
          depositAmount: 'Amount',
          depositAdd: 'Add',
          depositNote: 'Details',
          depositEdit: 'Edit',
          depositSave: 'Save',
          depositDelete: 'Delete',
          depositCancel: 'Cancel',
          remittanceDetails: 'Remittance details',
          depositClickHint: 'View remittance details',
          depositEmpty: 'No remittance records yet.',
          depositAddEntry: 'Add remittance',
          depositAmountInvalid: 'Enter a valid deposit amount.',
          exportNoneCustomer: 'No rows to export for this customer.',
          exportNoneSettled: 'No settled orders to export for this customer.',
          exportNoneOpen: 'No open orders to export for this customer.',
          exportNoneDate: 'Pick a date, or no orders on that date.',
          summaryExportSettled: 'Settled',
          summaryExportOpen: 'Open',
          summaryExportByDate: '📅 Date',
          summaryPhone: 'Phone',
          summaryPhonePlaceholder: 'Customer phone',
          selectCustomer: 'Select customer',
          allCustomers: 'All',
          ordersForCustomer: 'Showing orders for {name}',
          grandTotalLabel: 'Balance',
          grandTotalHint: 'Deposit − settled',
          unnamedCustomer: '(No customer)',
          totalMmk: 'In MMK',
          rateHint: 'Shown in Excel footer',
          exportFail: 'Excel export failed. Please try again.',
          confirmClear: 'Delete all open orders? This cannot be undone.',
          confirmClearKeepSettled: 'Clear open orders only. {n} settled record(s) will be kept.',
          confirmDeleteRow: 'Confirm delete this order?',
          autoSaved: 'Cloud synced',
          rowCount: 'rows with data',
          scrollHint: 'Swipe horizontally to see all columns',
          groupCustomer: 'Customer',
          groupProduct: 'Product',
          groupPrice: 'Pricing',
          colExport: 'Export',
          selectAll: 'Select all',
          selectNone: 'Clear selection',
          exportSelected: 'selected for export',
          exportModalTitle: 'Export to Excel',
          exportModalSub: 'Choose which rows to include. Totals below reflect your selection only.',
          exportConfirm: 'Download Excel',
          exportCancel: 'Cancel',
          exportNone: 'Select at least one row with data to export.',
          exportFilterCustomer: 'Filter by customer',
          exportFilterPlaceholder: 'Type customer name…',
          exportFilterDate: 'Filter by date',
          exportFilterDatePlaceholder: 'Select order date…',
          exportFilterEmpty: 'No rows match the current filters.',
          exportFilterShowing: 'Showing',
          exportFilterAllCustomers: 'All customers',
          exportFilterAllDates: 'All dates',
          exportClearFilters: 'Clear filters',
          exportFilterOrders: 'orders',
          exportFilterNoMatch: 'No matching customer',
          exportSelectFiltered: 'Select filtered',
          pagePrev: 'Previous',
          pageNext: 'Next',
          settle: 'Settle',
          batchSettle: 'Batch settle',
          settledBadge: 'Settled',
          settledViewOnly: 'Settled — read only',
          confirmSettle: 'Mark this order as settled? The amount will be deducted from the customer deposit balance.',
          confirmBatchSettle: 'Settle selected open orders? Amounts will be deducted from the customer deposit balance.',
          noRowsToSettle: 'Select at least one unsettled order with data.',
          unsettle: 'Undo settle',
          unsettleShort: 'Undo',
          batchUnsettle: 'Undo batch settle',
          confirmUnsettle: 'Mark this order as unsettled again? It will count toward the RMB total.',
          confirmBatchUnsettle: 'Undo settlement for selected settled orders? They will count toward the RMB total again.',
          noRowsToUnsettle: 'Select at least one settled order.',
          confirmDeleteSettledRow: 'Delete this settled order? This cannot be undone.',
          filterAll: 'All',
          filterOpen: 'Open',
          filterSettled: 'Settled',
        }
      : language === 'my'
        ? {
            kicker: 'ML Express · Admin',
            hubTitle: 'မီတြခစီမံခန့်ခွဲမှု',
            draftsTabBtn: '📑 Drafts',
            pricesTabBtn: '💲 Prices',
            personalTabBtn: '🧾 Expenses',
            proxyTabBtn: '🛒 Proxy',
            quoteTabBtn: '📋 Quote sheet',
            title: 'ကြားခံဝယ်ယူမှု',
            subtitle: 'မှတ်တမ်းတင်ပြီး Excel တင်ပါ။',
            close: 'ပိတ်မည်',
            back: 'Metric hub',
            backMetric: 'Back to dashboard',
            proxyFee: 'ကြားခံကြေး',
            exchangeRate: 'ငွေလဲနှုန်း',
            feeRateCardTitle: 'Fee & rate',
            combinedCardTitle: 'Settlement',
            feeLinkedHint: 'Per customer',
            rateLinkedHint: 'Per customer',
            addRow: 'Add row',
            duplicateRow: 'Duplicate',
            clearAll: 'Clear',
            exportExcel: 'Excel',
            colNo: '#',
            colCustomer: 'Customer',
            colDate: 'Date',
            colAddress: 'Address',
            colPlatform: 'Platform',
            colProduct: 'Product',
            colStatus: 'Status',
            statusPending: 'pending',
            statusReceived: 'receive',
            colQty: 'Qty',
            colUnitPrice: 'Unit ¥',
            colFee: 'Fee',
            colTotal: 'Total ¥',
            colActions: 'Actions',
            delete: 'Remove',
            totalRmb: 'Balance',
            totalRmbByCustomer: 'Per customer',
            customerDeposit: 'Deposit',
            customerSettled: 'Settled',
            depositOriginalTotal: 'Total deposited',
            depositSettledDeduct: 'Settled purchases',
            depositBalance: 'Deposit balance',
            customerShopping: 'Purchases',
            depositDate: 'Date',
            depositAmount: 'Amount',
            depositAdd: 'Add',
            depositNote: 'Details',
            depositEdit: 'Edit',
            depositSave: 'Save',
            depositDelete: 'Delete',
            depositDeleteConfirm: 'Delete this record?',
            depositCancel: 'Cancel',
            remittanceDetails: 'Remittance',
            depositClickHint: 'View details',
            depositEmpty: 'No records.',
            depositAddEntry: 'Add',
            depositAmountInvalid: 'Enter amount.',
            exportNoneCustomer: 'No rows to export.',
            exportNoneSettled: 'No settled orders.',
            exportNoneOpen: 'No open orders.',
            exportNoneDate: 'Pick a date first.',
            summaryExportSettled: 'Settled',
            summaryExportOpen: 'Open',
            summaryExportByDate: '📅 Date',
            summaryPhone: 'Phone',
            summaryPhonePlaceholder: 'Phone number',
            selectCustomer: 'Customer',
            allCustomers: 'All',
            ordersForCustomer: 'Orders: {name}',
            grandTotalLabel: 'Balance',
          grandTotalHint: 'Deposit − settled',
            unnamedCustomer: '(No customer)',
            totalMmk: 'MMK',
            rateHint: 'Excel footer',
          exportFail: 'Export failed',
          confirmClear: 'Delete all open orders? This cannot be undone.',
          confirmClearKeepSettled: 'Clear open orders only. {n} settled record(s) will be kept.',
          confirmDeleteRow: 'Confirm delete this order?',
            autoSaved: 'Cloud synced',
            rowCount: 'rows',
            scrollHint: 'Swipe →',
            groupCustomer: 'Customer',
            groupProduct: 'Product',
            groupPrice: 'Price',
            colExport: 'Export',
            selectAll: 'All',
            selectNone: 'None',
            exportSelected: 'selected',
            exportModalTitle: 'Export Excel',
            exportModalSub: 'Choose rows',
            exportConfirm: 'Download',
            exportCancel: 'Cancel',
            exportNone: 'Select rows first',
            exportFilterCustomer: 'Filter customer',
            exportFilterPlaceholder: 'Customer name…',
            exportFilterDate: 'Filter date',
            exportFilterDatePlaceholder: 'Order date…',
            exportFilterEmpty: 'No match',
            exportFilterShowing: 'Showing',
            exportFilterAllCustomers: 'All customers',
            exportFilterAllDates: 'All dates',
            exportClearFilters: 'Clear filters',
            exportFilterOrders: 'orders',
            exportFilterNoMatch: 'No match',
            exportSelectFiltered: 'Select filtered',
            pagePrev: 'Prev',
            pageNext: 'Next',
            settle: 'Settle',
            batchSettle: 'Batch',
            settledBadge: 'Settled',
            settledViewOnly: 'Settled — read only',
            confirmSettle: 'Settle this order?',
            confirmBatchSettle: 'Batch settle selected?',
            noRowsToSettle: 'Select unsettled rows',
            unsettle: 'Undo',
            unsettleShort: 'Undo',
            batchUnsettle: 'Undo batch',
            confirmUnsettle: 'Undo settle?',
            confirmBatchUnsettle: 'Undo batch settle?',
            noRowsToUnsettle: 'Select settled rows',
            confirmDeleteSettledRow: 'Delete settled order?',
            filterAll: 'All',
            filterOpen: 'Open',
            filterSettled: 'Settled',
          }
        : {
            kicker: 'ML Express · Admin',
            hubTitle: '指标管理',
            draftsTabBtn: '📑 进口指标草稿',
            pricesTabBtn: '💲 商品价格',
            personalTabBtn: '🧾 个人开销',
            proxyTabBtn: '🛒 代购',
            quoteTabBtn: '📋 代购报价表',
            title: '代购清单',
            subtitle: '登记客户订单，代购费与汇率可随时调整，一键导出 Excel 发给客户。',
            close: '关闭',
            back: '指标管理',
            backMetric: '返回控制台',
            proxyFee: '代购费',
            exchangeRate: '汇率',
            feeRateCardTitle: '代购费 · 汇率',
            combinedCardTitle: '代购结算',
            feeLinkedHint: '随所选客户自动切换',
            rateLinkedHint: '随所选客户自动切换',
            addRow: '添加一行',
            duplicateRow: '复制上一行',
            clearAll: '清空',
            exportExcel: '导出 Excel',
            colNo: '序',
            colCustomer: '客户',
            colDate: '日期',
            colAddress: '地址',
            colPlatform: '平台',
            colProduct: '商品',
            colStatus: '状态',
            statusPending: 'pending',
            statusReceived: 'receive',
            colQty: '数量',
            colUnitPrice: '单价 ¥',
            colFee: '代购费',
            colTotal: '合计 ¥',
            colActions: '操作',
            delete: '删',
            totalRmb: '人民币合计',
            totalRmbByCustomer: '单客户结算',
            customerDeposit: '客户订金',
            customerSettled: '已结清',
            depositOriginalTotal: '累计订金',
            depositSettledDeduct: '已结清扣款',
            depositBalance: '订金余额',
            customerShopping: '客户购物',
            depositDate: '日期',
            depositAmount: '金额',
            depositAdd: '添加',
            depositNote: '来龙去脉',
            depositEdit: '编辑',
            depositSave: '保存',
            depositDelete: '删除',
            depositDeleteConfirm: '确认删除这条汇款记录？',
            depositCancel: '取消',
            remittanceDetails: '汇款详情',
            depositClickHint: '点击查看汇款详情',
            depositEmpty: '暂无汇款记录。',
            depositAddEntry: '添加汇款',
            depositAmountInvalid: '请填写有效的订金金额。',
            exportNoneCustomer: '当前客户没有可导出的订单。',
            exportNoneSettled: '当前客户没有可导出的已结清订单。',
            exportNoneOpen: '当前客户没有可导出的未结清订单。',
            exportNoneDate: '请选择日期，或该日期没有可导出订单。',
            summaryExportSettled: '已结清',
            summaryExportOpen: '未结清',
            summaryExportByDate: '📅日期',
            summaryPhone: '电话',
            summaryPhonePlaceholder: '填写客户电话',
            selectCustomer: '选择客户',
            allCustomers: '全部',
            ordersForCustomer: '仅显示 {name} 的订单',
            grandTotalLabel: '总合计',
            grandTotalHint: '订金 − 已结清',
            unnamedCustomer: '（未填客户）',
            totalMmk: '缅币约合',
            rateHint: '导出 Excel 时显示在底部',
            exportFail: 'Excel 导出失败，请重试。',
            confirmClear: '确认删除全部未结清订单？此操作不可恢复。',
            confirmClearKeepSettled: '将清空未结清订单，{n} 条已结清记录将保留。',
            confirmDeleteRow: '确认删除这条订单？',
            autoSaved: '已同步云端',
            rowCount: '条有效记录',
            scrollHint: '← 左右滑动查看全部列 →',
            groupCustomer: '客户信息',
            groupProduct: '商品信息',
            groupPrice: '金额',
            colExport: '导出',
            selectAll: '全选',
            selectNone: '全不选',
            exportSelected: '条已勾选导出',
            exportModalTitle: '导出 Excel',
            exportModalSub: '勾选需要发给客户的记录；下方合计仅统计已选行。',
            exportConfirm: '确认导出',
            exportCancel: '取消',
            exportNone: '请至少勾选一条有效记录后再导出。',
            exportFilterCustomer: '按客户筛选',
            exportFilterPlaceholder: '输入客户姓名，自动筛选订单…',
            exportFilterDate: '按日期筛选',
            exportFilterDatePlaceholder: '选择下单日期…',
            exportFilterEmpty: '没有匹配当前筛选条件的订单。',
            exportFilterShowing: '当前显示',
            exportFilterAllCustomers: '全部客户',
            exportFilterAllDates: '全部日期',
            exportClearFilters: '清除筛选',
            exportFilterOrders: '条',
            exportFilterNoMatch: '没有匹配的客户',
            exportSelectFiltered: '选中筛选结果',
            pagePrev: '上一页',
            pageNext: '下一页',
            settle: '结清',
            batchSettle: '批量结清',
            settledBadge: '已结清',
            settledViewOnly: '已结清，不可编辑',
            confirmSettle: '确认结清此订单？结清后将从客户订金余额中扣除对应金额。',
            confirmBatchSettle: '确认批量结清已勾选的未结清订单？结清后将从客户订金余额中扣除对应金额。',
            noRowsToSettle: '请先勾选至少一条未结清的有效订单。',
            unsettle: '撤销结清',
            unsettleShort: '撤销',
            batchUnsettle: '批量撤销结清',
            confirmUnsettle: '确认撤销此订单的结清状态？撤销后将恢复客户订金余额。',
            confirmBatchUnsettle: '确认批量撤销已勾选订单的结清状态？撤销后将恢复客户订金余额。',
            noRowsToUnsettle: '请先勾选至少一条已结清订单。',
            confirmDeleteSettledRow: '确认删除这条已结清订单？删除后无法恢复。',
            filterAll: '全部',
            filterOpen: '未结清',
            filterSettled: '已结清',
          };

  const currentDepositEntries = useMemo(() => {
    if (!isSpecificSummaryCustomer(summaryCustomerKey)) return [];
    return customerDeposits[summaryCustomerKey]?.entries ?? [];
  }, [customerDeposits, summaryCustomerKey]);

  const persistDepositEntries = useCallback(
    (customerKey: string, entries: CustomerDepositEntry[]) => {
      setCustomerDeposits((prev) => ({
        ...prev,
        [customerKey]: buildDepositRecord(entries),
      }));
    },
    [],
  );

  const openRemittanceModal = useCallback(() => {
    if (!isSpecificSummaryCustomer(summaryCustomerKey)) return;
    setDepositDraftDate(todayIso());
    setDepositDraftAmount('');
    setDepositDraftNote('');
    setEditingDepositId(null);
    setEditDepositDraft(null);
    setRemittanceModalOpen(true);
  }, [summaryCustomerKey]);

  const addCustomerDepositEntry = useCallback(() => {
    if (!isSpecificSummaryCustomer(summaryCustomerKey)) return;
    const amount = parseNum(depositDraftAmount);
    if (amount <= 0) {
      window.alert(t.depositAmountInvalid);
      return;
    }
    const entry = newDepositEntry({
      date: depositDraftDate.trim() || todayIso(),
      amount: amount.toFixed(2),
      note: depositDraftNote.trim(),
    });
    const entries = [...(customerDeposits[summaryCustomerKey]?.entries ?? []), entry];
    persistDepositEntries(summaryCustomerKey, entries);
    setDepositDraftAmount('');
    setDepositDraftNote('');
  }, [
    customerDeposits,
    depositDraftAmount,
    depositDraftDate,
    depositDraftNote,
    persistDepositEntries,
    summaryCustomerKey,
    t.depositAmountInvalid,
  ]);

  const startEditDepositEntry = useCallback((entry: CustomerDepositEntry) => {
    setEditingDepositId(entry.id);
    setEditDepositDraft({ ...entry });
  }, []);

  const saveEditDepositEntry = useCallback(() => {
    if (!isSpecificSummaryCustomer(summaryCustomerKey) || !editDepositDraft) return;
    const amount = parseNum(editDepositDraft.amount);
    if (amount <= 0) {
      window.alert(t.depositAmountInvalid);
      return;
    }
    const entries = (customerDeposits[summaryCustomerKey]?.entries ?? []).map((entry) =>
      entry.id === editDepositDraft.id
        ? {
            ...editDepositDraft,
            amount: amount.toFixed(2),
            note: editDepositDraft.note.trim(),
          }
        : entry,
    );
    persistDepositEntries(summaryCustomerKey, entries);
    setEditingDepositId(null);
    setEditDepositDraft(null);
  }, [
    customerDeposits,
    editDepositDraft,
    persistDepositEntries,
    summaryCustomerKey,
    t.depositAmountInvalid,
  ]);

  const deleteDepositEntry = useCallback(
    (entryId: string) => {
      if (!isSpecificSummaryCustomer(summaryCustomerKey)) return;
      if (!window.confirm(t.depositDeleteConfirm)) return;
      const entries = (customerDeposits[summaryCustomerKey]?.entries ?? []).filter(
        (entry) => entry.id !== entryId,
      );
      persistDepositEntries(summaryCustomerKey, entries);
      if (editingDepositId === entryId) {
        setEditingDepositId(null);
        setEditDepositDraft(null);
      }
    },
    [customerDeposits, editingDepositId, persistDepositEntries, summaryCustomerKey, t.depositDeleteConfirm],
  );

  const handleSummaryCustomerExport = useCallback(async () => {
    if (!isSpecificSummaryCustomer(summaryCustomerKey)) {
      window.alert(t.exportNoneCustomer);
      return;
    }
    if (summaryExportScope === 'date' && !summaryExportDate.trim()) {
      window.alert(t.exportNoneDate);
      return;
    }
    if (summaryExportRows.length === 0) {
      window.alert(
        summaryExportScope === 'settled'
          ? t.exportNoneSettled
          : summaryExportScope === 'open'
            ? t.exportNoneOpen
            : t.exportNoneDate,
      );
      return;
    }
    setExportBusy(true);
    try {
      const dateHint =
        summaryExportScope === 'date' && summaryExportDate.trim()
          ? summaryExportDate.trim()
          : summaryExportScope;
      await exportProxyPurchaseExcel({
        rows: summaryExportRows,
        proxyFeePercent: feeForCustomer(summaryCustomerKey),
        exchangeRate: rateForCustomer(summaryCustomerKey),
        filenameHint: `${summaryCustomerKey}_${dateHint}`,
      });
    } catch (err) {
      console.error(err);
      window.alert(t.exportFail);
    } finally {
      setExportBusy(false);
    }
  }, [
    summaryCustomerKey,
    summaryExportScope,
    summaryExportDate,
    summaryExportRows,
    feeForCustomer,
    rateForCustomer,
    t.exportFail,
    t.exportNoneCustomer,
    t.exportNoneDate,
    t.exportNoneOpen,
    t.exportNoneSettled,
  ]);

  const renderStatusSelect = (row: ProxyPurchaseRow) => {
    const status = normalizeProxyPurchaseStatus(row.status);
    if (isProxyPurchaseRowSettled(row)) {
      const lang = language === 'en' ? 'en' : language === 'my' ? 'my' : 'zh';
      const at = formatSettledAt(row.settledAt, lang);
      return (
        <span
          className="proxy-purchase-readonly-cell proxy-purchase-readonly-cell--table"
          title={at ? `${t.settledViewOnly} · ${at}` : t.settledViewOnly}
        >
          {proxyPurchaseStatusLabel(status, lang)}
        </span>
      );
    }
    return (
      <select
        className={`proxy-purchase-cell-input proxy-purchase-status-select ${
          status === 'receive'
            ? 'proxy-purchase-status-select--receive'
            : 'proxy-purchase-status-select--pending'
        }`}
        value={status}
        onChange={(e) =>
          updateRow(row.id, { status: e.target.value as ProxyPurchaseStatus })
        }
        title={t.colStatus}
      >
        <option value="pending">{t.statusPending}</option>
        <option value="receive">{t.statusReceived}</option>
      </select>
    );
  };

  const renderExportCheckbox = (row: ProxyPurchaseRow, size: 'sm' | 'md' = 'md') => {
    const canExport = rowHasExportContent(row);
    const checked = Boolean(exportSelected[row.id]);
    const box = size === 'sm' ? 16 : 18;
    return (
      <input
        type="checkbox"
        checked={checked}
        disabled={!canExport}
        onChange={(e) => toggleExportRow(row.id, e.target.checked)}
        title={canExport ? t.colExport : undefined}
        style={{
          width: box,
          height: box,
          accentColor: '#2dd4bf',
          cursor: canExport ? 'pointer' : 'not-allowed',
          opacity: canExport ? 1 : 0.35,
        }}
      />
    );
  };

  const updateRow = useCallback((id: string, patch: Partial<ProxyPurchaseRow>) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (isProxyPurchaseRowSettled(r)) return r;
        const next = { ...r, ...patch };
        if (patch.customerName !== undefined) {
          const key = patch.customerName.trim();
          const existingPhone = prev.find(
            (row) => row.id !== id && row.customerName.trim() === key && row.phone.trim(),
          )?.phone.trim();
          if (existingPhone) next.phone = existingPhone;
        }
        return next;
      }),
    );
  }, []);

  const updateSummaryCustomerPhone = useCallback((customerKey: string, phone: string) => {
    setRows((prev) =>
      prev.map((row) => (row.customerName.trim() === customerKey ? { ...row, phone } : row)),
    );
  }, []);

  const settleRow = useCallback(
    (id: string) => {
      const row = rows.find((r) => r.id === id);
      if (!row || !rowHasContent(row) || isProxyPurchaseRowSettled(row)) return;
      if (!window.confirm(t.confirmSettle)) return;
      const ts = new Date().toISOString();
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, settled: true, settledAt: ts } : r)),
      );
    },
    [rows, t.confirmSettle],
  );

  const batchSettleSelected = useCallback(() => {
    const scopeHint = isSpecificSummaryCustomer(summaryCustomerKey)
      ? `\n\n范围：仅客户「${summaryCustomerKey}」`
      : '';
    const targets = batchScopeRows.filter(
      (r) => exportSelected[r.id] && !isProxyPurchaseRowSettled(r),
    );
    if (targets.length === 0) {
      window.alert(t.noRowsToSettle);
      return;
    }
    if (!window.confirm(`${t.confirmBatchSettle}${scopeHint}`)) return;
    const ts = new Date().toISOString();
    const ids = new Set(targets.map((r) => r.id));
    setRows((prev) =>
      prev.map((r) => (ids.has(r.id) ? { ...r, settled: true, settledAt: ts } : r)),
    );
  }, [batchScopeRows, exportSelected, summaryCustomerKey, t.confirmBatchSettle, t.noRowsToSettle]);

  const unsettleRow = useCallback(
    (id: string) => {
      const row = rows.find((r) => r.id === id);
      if (!row || !isProxyPurchaseRowSettled(row)) return;
      if (!window.confirm(t.confirmUnsettle)) return;
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, settled: false, settledAt: '' } : r)),
      );
    },
    [rows, t.confirmUnsettle],
  );

  const batchUnsettleSelected = useCallback(() => {
    const scopeHint = isSpecificSummaryCustomer(summaryCustomerKey)
      ? `\n\n范围：仅客户「${summaryCustomerKey}」`
      : '';
    const targets = batchScopeRows.filter(
      (r) => exportSelected[r.id] && isProxyPurchaseRowSettled(r),
    );
    if (targets.length === 0) {
      window.alert(t.noRowsToUnsettle);
      return;
    }
    if (!window.confirm(`${t.confirmBatchUnsettle}${scopeHint}`)) return;
    const ids = new Set(targets.map((r) => r.id));
    setRows((prev) =>
      prev.map((r) => (ids.has(r.id) ? { ...r, settled: false, settledAt: '' } : r)),
    );
  }, [
    batchScopeRows,
    exportSelected,
    summaryCustomerKey,
    t.confirmBatchUnsettle,
    t.noRowsToUnsettle,
  ]);

  const clearAllRows = useCallback(() => {
    const settledRows = rows.filter((r) => isProxyPurchaseRowSettled(r));
    if (settledRows.length > 0) {
      if (!window.confirm(t.confirmClearKeepSettled.replace('{n}', String(settledRows.length)))) return;
      setRows([newRow(), ...settledRows]);
      setExportSelected((prev) => {
        const next: Record<string, boolean> = {};
        settledRows.forEach((r) => {
          if (prev[r.id]) next[r.id] = true;
        });
        return next;
      });
      return;
    }
    if (!window.confirm(t.confirmClear)) return;
    setRows([newRow()]);
    setExportSelected({});
  }, [rows, t.confirmClear, t.confirmClearKeepSettled]);

  const renderSettledBadge = (row: ProxyPurchaseRow) => {
    const lang = language === 'en' ? 'en' : language === 'my' ? 'my' : 'zh';
    const at = formatSettledAt(row.settledAt, lang);
    return (
      <span className="proxy-purchase-settled-badge" title={at ? `${t.settledViewOnly} · ${at}` : t.settledViewOnly}>
        {t.settledBadge}
      </span>
    );
  };

  const renderSettledReadonlyCell = (
    value: string,
    title: string,
    variant: 'table' | 'card' = 'table',
    emphasis?: 'customer',
  ) => (
    <span
      className={[
        'proxy-purchase-readonly-cell',
        variant === 'table' ? 'proxy-purchase-readonly-cell--table' : '',
        emphasis === 'customer' ? 'proxy-purchase-readonly-cell--customer' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      title={title}
    >
      {value || '—'}
    </span>
  );

  const renderEditableInput = (
    row: ProxyPurchaseRow,
    value: string,
    onChange: (next: string) => void,
    opts?: {
      type?: string;
      placeholder?: string;
      style?: React.CSSProperties;
      list?: string;
      min?: number;
      step?: number;
      readonlyVariant?: 'table' | 'card';
      readonlyEmphasis?: 'customer';
    },
  ) => {
    if (isProxyPurchaseRowSettled(row)) {
      const lang = language === 'en' ? 'en' : language === 'my' ? 'my' : 'zh';
      const at = formatSettledAt(row.settledAt, lang);
      return renderSettledReadonlyCell(
        value,
        at ? `${t.settledViewOnly} · ${at}` : t.settledViewOnly,
        opts?.readonlyVariant ?? 'table',
        opts?.readonlyEmphasis,
      );
    }
    return (
      <input
        className="proxy-purchase-cell-input"
        type={opts?.type}
        min={opts?.min}
        step={opts?.step}
        list={opts?.list}
        value={value}
        placeholder={opts?.placeholder}
        style={opts?.style}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  };

  const requestRemoveRow = useCallback(
    (id: string) => {
      const row = rows.find((r) => r.id === id);
      const confirmMsg =
        row && isProxyPurchaseRowSettled(row) ? t.confirmDeleteSettledRow : t.confirmDeleteRow;
      if (!window.confirm(confirmMsg)) return;
      setRows((prev) => (prev.length <= 1 ? [newRow()] : prev.filter((r) => r.id !== id)));
      setExportSelected((prev) => {
        if (prev[id] === undefined) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
    [rows, t.confirmDeleteRow, t.confirmDeleteSettledRow],
  );

  const renderDeleteRowButton = (row: ProxyPurchaseRow, size: 'sm' | 'md' = 'md') => {
    const dim = size === 'sm' ? 34 : 32;
    return (
      <button
        type="button"
        aria-label={t.delete}
        onClick={() => requestRemoveRow(row.id)}
        style={{
          width: dim,
          height: dim,
          borderRadius: size === 'sm' ? 10 : 9,
          border: '1px solid rgba(248, 113, 113, 0.32)',
          background: 'rgba(127, 29, 29, 0.2)',
          color: '#fca5a5',
          cursor: 'pointer',
          fontSize: size === 'sm' ? 16 : 17,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    );
  };

  const renderRowActions = (row: ProxyPurchaseRow) => {
    if (isProxyPurchaseRowSettled(row)) {
      return (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            flexWrap: 'nowrap',
            whiteSpace: 'nowrap',
          }}
        >
          {renderSettledBadge(row)}
          <button
            type="button"
            title={t.unsettle}
            onClick={() => unsettleRow(row.id)}
            style={{
              height: 26,
              padding: '0 8px',
              borderRadius: 8,
              border: '1px solid rgba(251, 191, 36, 0.35)',
              background: 'rgba(245, 158, 11, 0.18)',
              color: '#fcd34d',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 800,
              whiteSpace: 'nowrap',
            }}
          >
            {t.unsettleShort}
          </button>
          {renderDeleteRowButton(row, 'sm')}
        </div>
      );
    }
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <button
          type="button"
          title={t.settle}
          onClick={() => settleRow(row.id)}
          disabled={!rowHasContent(row)}
          style={{
            height: 32,
            padding: '0 10px',
            borderRadius: 9,
            border: '1px solid rgba(96, 165, 250, 0.35)',
            background: 'rgba(37, 99, 235, 0.22)',
            color: '#93c5fd',
            cursor: rowHasContent(row) ? 'pointer' : 'not-allowed',
            fontSize: 12,
            fontWeight: 800,
            opacity: rowHasContent(row) ? 1 : 0.45,
          }}
        >
          {t.settle}
        </button>
        {renderDeleteRowButton(row)}
      </div>
    );
  };

  const addRow = useCallback(
    (seed?: Partial<ProxyPurchaseRow>) => {
      setListPage(1);
      setRows((prev) => {
        const created = newRow(
          buildRowSeedForCustomerContext(summaryCustomerKey, customerPhoneByName, seed),
        );
        return insertRowForCustomerContext(prev, created, summaryCustomerKey);
      });
    },
    [summaryCustomerKey, customerPhoneByName],
  );

  const duplicateLastRow = useCallback(() => {
    setListPage(1);
    setRows((prev) => {
      const source = isSpecificSummaryCustomer(summaryCustomerKey)
        ? prev.find((row) => row.customerName.trim() === summaryCustomerKey)
        : prev[0];
      const created = source
        ? newRow({
            customerName: source.customerName,
            orderDate: source.orderDate,
            address: source.address,
            platform: source.platform,
            phone: source.phone,
          })
        : newRow(buildRowSeedForCustomerContext(summaryCustomerKey, customerPhoneByName));
      return insertRowForCustomerContext(prev, created, summaryCustomerKey);
    });
  }, [summaryCustomerKey, customerPhoneByName]);

  const handleExport = useCallback(async () => {
    if (exportableRows.length === 0) {
      window.alert(t.exportNone);
      return;
    }
    setExportModalOpen(true);
  }, [exportableRows.length, t.exportNone]);

  const confirmExport = useCallback(async () => {
    if (selectedExportRows.length === 0) {
      window.alert(t.exportNone);
      return;
    }
    setExportBusy(true);
    try {
      const firstCustomer = selectedExportRows.find((r) => r.customerName.trim())?.customerName.trim();
      const exportFee =
        selectedExportRows.length > 0
          ? feeForCustomer(selectedExportRows[0].customerName.trim())
          : feePctNum;
      const exportRate =
        selectedExportRows.length > 0
          ? rateForCustomer(selectedExportRows[0].customerName.trim())
          : rateNum;
      await exportProxyPurchaseExcel({
        rows: selectedExportRows,
        proxyFeePercent: exportFee,
        exchangeRate: exportRate,
        filenameHint: firstCustomer || 'supplier',
      });
      setExportModalOpen(false);
    } catch (err) {
      console.error(err);
      window.alert(t.exportFail);
    } finally {
      setExportBusy(false);
    }
  }, [selectedExportRows, feeForCustomer, rateForCustomer, feePctNum, rateNum, t.exportFail, t.exportNone]);

  const hubTabStyle = (active: boolean): React.CSSProperties => ({
    padding: '10px 18px',
    borderRadius: 12,
    border: active ? 'none' : '1px solid rgba(255,255,255,0.22)',
    background: active
      ? 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)'
      : 'rgba(255,255,255,0.06)',
    color: '#fff',
    cursor: active ? 'default' : 'pointer',
    fontWeight: active ? 700 : 600,
    fontSize: 13,
    boxShadow: active ? '0 6px 18px rgba(13, 148, 136, 0.35)' : 'none',
  });

  const feeColLabel = t.colFee;

  const presetChip = (active: boolean): React.CSSProperties => ({
    padding: '4px 10px',
    borderRadius: 999,
    border: active ? '1px solid rgba(45, 212, 191, 0.65)' : '1px solid rgba(148, 163, 184, 0.22)',
    background: active ? 'rgba(45, 212, 191, 0.18)' : 'rgba(15, 23, 42, 0.45)',
    color: active ? '#99f6e4' : 'rgba(226, 232, 240, 0.88)',
    cursor: 'pointer',
    fontSize: 12,
    fontWeight: 600,
    transition: 'all 0.15s',
  });

  const actionBtn = (
    label: string,
    onClick: () => void,
    tone: 'primary' | 'ghost' | 'danger' | 'success',
    disabled?: boolean,
  ) => {
    const tones: Record<typeof tone, React.CSSProperties> = {
      primary: {
        border: 'none',
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        color: '#fff',
        boxShadow: '0 6px 20px rgba(37, 99, 235, 0.28)',
      },
      success: {
        border: 'none',
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: '#fff',
        boxShadow: '0 6px 20px rgba(16, 185, 129, 0.28)',
      },
      ghost: {
        border: '1px solid rgba(148, 163, 184, 0.28)',
        background: 'rgba(255,255,255,0.06)',
        color: '#e2e8f0',
        boxShadow: 'none',
      },
      danger: {
        border: '1px solid rgba(248, 113, 113, 0.35)',
        background: 'rgba(127, 29, 29, 0.22)',
        color: '#fecaca',
        boxShadow: 'none',
      },
    };
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        style={{
          padding: isMobile ? '9px 14px' : '10px 16px',
          borderRadius: 11,
          cursor: disabled ? 'wait' : 'pointer',
          fontWeight: 700,
          fontSize: 13,
          opacity: disabled ? 0.7 : 1,
          ...tones[tone],
        }}
      >
        {label}
      </button>
    );
  };

  const renderCalcPill = (value: string, tone: 'fee' | 'total') => (
    <span
      style={{
        display: 'inline-block',
        minWidth: 56,
        padding: '5px 10px',
        borderRadius: 8,
        textAlign: 'right',
        fontWeight: tone === 'total' ? 800 : 600,
        fontSize: 13,
        fontVariantNumeric: 'tabular-nums',
        background:
          tone === 'total'
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.22), rgba(5, 150, 105, 0.12))'
            : 'linear-gradient(135deg, rgba(234, 179, 8, 0.18), rgba(202, 138, 4, 0.08))',
        color: tone === 'total' ? '#6ee7b7' : '#fde68a',
        border: `1px solid ${tone === 'total' ? 'rgba(52, 211, 153, 0.28)' : 'rgba(250, 204, 21, 0.22)'}`,
      }}
    >
      {value}
    </span>
  );

  const renderMobileCard = (row: ProxyPurchaseRow, idx: number) => {
    const unit = parseNum(row.unitPrice);
    const rowFeePct = feeForCustomer(row.customerName.trim());
    const fee = calcProxyFee(unit, rowFeePct);
    const total = calcLineTotalRmb(unit, rowFeePct);
    const settled = isProxyPurchaseRowSettled(row);
    return (
      <article
        key={row.id}
        className={settled ? 'proxy-purchase-row--settled' : undefined}
        style={{
          ...glassCard,
          padding: '14px 14px 12px',
          marginBottom: 12,
          border: settled ? '1px solid rgba(96, 165, 250, 0.28)' : glassCard.border,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, opacity: 0.85 }}>
            {renderExportCheckbox(row, 'sm')}
            {t.colExport}
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {settled ? renderSettledBadge(row) : null}
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(45, 212, 191, 0.15)',
                color: '#5eead4',
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              {idx + 1}
            </span>
            {renderDeleteRowButton(row, 'sm')}
          </div>
        </div>
        {!settled && rowHasContent(row) ? (
          <div style={{ marginBottom: 10 }}>
            <button type="button" onClick={() => settleRow(row.id)} style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid rgba(96, 165, 250, 0.35)',
              background: 'rgba(37, 99, 235, 0.22)',
              color: '#93c5fd',
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
            }}>
              {t.settle}
            </button>
          </div>
        ) : null}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label>
            <span style={{ fontSize: 11, opacity: 0.7, display: 'block', marginBottom: 4 }}>{t.colCustomer}</span>
            {renderEditableInput(row, row.customerName, (v) => updateRow(row.id, { customerName: v }), {
              placeholder: 'TSL',
              readonlyVariant: 'card',
              readonlyEmphasis: 'customer',
            })}
          </label>
          <label>
            <span style={{ fontSize: 11, opacity: 0.7, display: 'block', marginBottom: 4 }}>{t.colDate}</span>
            {renderEditableInput(row, row.orderDate, (v) => updateRow(row.id, { orderDate: v }), { type: 'date' })}
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            <span style={{ fontSize: 11, opacity: 0.7, display: 'block', marginBottom: 4 }}>{t.colProduct}</span>
            {renderEditableInput(row, row.productName, (v) => updateRow(row.id, { productName: v }))}
          </label>
          <label>
            <span style={{ fontSize: 11, opacity: 0.7, display: 'block', marginBottom: 4 }}>{t.colStatus}</span>
            {renderStatusSelect(row)}
          </label>
          <label>
            <span style={{ fontSize: 11, opacity: 0.7, display: 'block', marginBottom: 4 }}>{t.colPlatform}</span>
            {renderEditableInput(row, row.platform, (v) => updateRow(row.id, { platform: v }), { list: 'proxy-platform-list', placeholder: '拼多多' })}
          </label>
          <label>
            <span style={{ fontSize: 11, opacity: 0.7, display: 'block', marginBottom: 4 }}>{t.colQty}</span>
            {renderEditableInput(row, row.quantity, (v) => updateRow(row.id, { quantity: v }), { type: 'number', min: 0 })}
          </label>
          <label>
            <span style={{ fontSize: 11, opacity: 0.7, display: 'block', marginBottom: 4 }}>{t.colUnitPrice}</span>
            {renderEditableInput(row, row.unitPrice, (v) => updateRow(row.id, { unitPrice: v }), { type: 'number', min: 0, step: 0.01 })}
          </label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            {renderCalcPill(unit > 0 ? fee.toFixed(2) : '—', 'fee')}
            {renderCalcPill(unit > 0 ? total.toFixed(2) : '—', 'total')}
          </div>
        </div>
      </article>
    );
  };

  const renderListPagination = () => {
    if (displayRows.length <= ROWS_PER_PAGE) return null;
    const start = (listPage - 1) * ROWS_PER_PAGE + 1;
    const end = Math.min(listPage * ROWS_PER_PAGE, displayRows.length);
    const pageInfo =
      language === 'en'
        ? `Showing ${start}–${end} of ${displayRows.length}`
        : language === 'my'
          ? `${start}–${end} / ${displayRows.length}`
          : `第 ${start}–${end} 条，共 ${displayRows.length} 条`;

    return (
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginTop: 14,
          padding: '12px 14px',
          borderRadius: 12,
          background: 'rgba(15, 23, 42, 0.45)',
          border: '1px solid rgba(148, 163, 184, 0.14)',
        }}
      >
        <span style={{ fontSize: 12, opacity: 0.78 }}>{pageInfo}</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          {actionBtn(t.pagePrev, () => setListPage((p) => Math.max(1, p - 1)), 'ghost', listPage <= 1)}
          <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.85, minWidth: 56, textAlign: 'center' }}>
            {listPage} / {listTotalPages}
          </span>
          {actionBtn(
            t.pageNext,
            () => setListPage((p) => Math.min(listTotalPages, p + 1)),
            'ghost',
            listPage >= listTotalPages,
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className="proxy-purchase-root"
      style={{
        minHeight: isEmbedded ? undefined : '100vh',
        background: isEmbedded
          ? 'transparent'
          : 'linear-gradient(165deg, #0a0f1c 0%, #0f172a 28%, #134e4a 55%, #1e1b4b 100%)',
        padding: isEmbedded
          ? isMobile
            ? '12px 12px 20px'
            : '18px 20px 24px'
          : isMobile
            ? '14px 12px 96px'
            : '24px 20px 96px',
        color: '#fff',
        fontFamily:
          "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Segoe UI', system-ui, sans-serif",
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          pointerEvents: 'none',
          inset: 0,
          background:
            'radial-gradient(ellipse 70% 45% at 0% 0%, rgba(45, 212, 191, 0.14), transparent 55%), radial-gradient(ellipse 55% 40% at 100% 100%, rgba(59, 130, 246, 0.1), transparent 50%)',
        }}
      />

      <datalist id="proxy-platform-list">
        {PLATFORM_PRESETS.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>

      <div style={{ maxWidth: 1280, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
            marginBottom: 20,
            flexWrap: 'wrap',
            paddingBottom: 18,
            borderBottom: '1px solid rgba(148, 163, 184, 0.12)',
          }}
        >
          <div style={{ flex: '1 1 300px', minWidth: 0 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'rgba(148, 163, 184, 0.88)',
                marginBottom: 8,
              }}
            >
              {t.kicker}
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: isMobile ? '1.45rem' : '1.75rem',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                lineHeight: 1.15,
                background: 'linear-gradient(100deg, #f0fdfa 0%, #5eead4 40%, #bfdbfe 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              {isEmbedded ? t.title : t.hubTitle}
            </h2>
            {!isEmbedded ? (
              <div
                role="tablist"
                aria-label={t.hubTitle}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 10,
                  marginTop: 14,
                  marginBottom: 2,
                }}
              >
                <button type="button" style={hubTabStyle(false)} onClick={() => navigate('/admin/metric-management')}>
                  {t.draftsTabBtn}
                </button>
                <button
                  type="button"
                  style={hubTabStyle(false)}
                  onClick={() => navigate('/admin/metric-management?openPrice=1')}
                >
                  {t.pricesTabBtn}
                </button>
                <button
                  type="button"
                  style={hubTabStyle(false)}
                  onClick={() => navigate('/admin/metric-management?openPersonal=1')}
                >
                  {t.personalTabBtn}
                </button>
                <button type="button" style={hubTabStyle(true)} aria-selected>
                  {t.proxyTabBtn}
                </button>
                <button type="button" style={hubTabStyle(false)} onClick={() => navigate('/admin/proxy-quote')}>
                  {t.quoteTabBtn}
                </button>
              </div>
            ) : null}
            <div
              style={{
                margin: isEmbedded ? '10px 0 0' : '14px 0 0',
                fontSize: isMobile ? '1.05rem' : '1.15rem',
                fontWeight: 800,
                color: '#e2e8f0',
                display: isEmbedded ? 'none' : 'block',
              }}
            >
              {t.title}
            </div>
            <p style={{ margin: '10px 0 0', opacity: 0.88, fontSize: 13, lineHeight: 1.6, maxWidth: 640, color: 'rgba(226, 232, 240, 0.92)' }}>
              {t.subtitle}
            </p>
            {cloudLoading ? (
              <p style={{ margin: '10px 0 0', fontSize: 12, color: '#94a3b8' }}>
                {language === 'en' ? 'Loading cloud data…' : language === 'my' ? 'Cloud ဒေတာ ဖွင့်နေသည်…' : '正在从云端加载…'}
              </p>
            ) : null}
            {cloudErr ? (
              <div style={{ margin: '10px 0 0', maxWidth: 640 }}>
                <p
                  style={{
                    margin: 0,
                    padding: '10px 12px',
                    borderRadius: 10,
                    fontSize: 12,
                    lineHeight: 1.55,
                    color: '#fecaca',
                    background: 'rgba(127, 29, 29, 0.35)',
                    border: '1px solid rgba(248, 113, 113, 0.35)',
                  }}
                >
                  {cloudErr}
                </p>
                <button
                  type="button"
                  onClick={() => void retryCloudSync()}
                  disabled={cloudRetrying}
                  style={{
                    marginTop: 8,
                    padding: '8px 14px',
                    borderRadius: 10,
                    border: '1px solid rgba(248, 113, 113, 0.45)',
                    background: 'rgba(127, 29, 29, 0.25)',
                    color: '#fecaca',
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: cloudRetrying ? 'wait' : 'pointer',
                  }}
                >
                  {cloudRetrying
                    ? language === 'en'
                      ? 'Retrying…'
                      : language === 'my'
                        ? 'Retry…'
                        : '重试中…'
                    : language === 'en'
                      ? 'Retry sync'
                      : language === 'my'
                        ? 'Retry sync'
                        : '重试同步'}
                </button>
              </div>
            ) : null}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12, alignItems: 'center' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 11px',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 600,
                  background: 'rgba(30, 41, 59, 0.7)',
                  border: '1px solid rgba(94, 234, 212, 0.2)',
                  color: '#94a3b8',
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: savedPulse ? '#34d399' : '#64748b',
                    boxShadow: savedPulse ? '0 0 8px rgba(52, 211, 153, 0.8)' : 'none',
                    transition: 'all 0.3s',
                  }}
                />
                {t.autoSaved}
              </span>
              <span style={{ fontSize: 11, opacity: 0.65 }}>
                {filledRowCount} {t.rowCount} · {selectedExportRows.length} {t.exportSelected}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            {actionBtn(
              isEmbedded ? `✕ ${t.close}` : t.backMetric,
              () => (isEmbedded ? onCloseEmbedded?.() : navigate('/admin/dashboard')),
              'ghost',
            )}
          </div>
        </header>

        <section style={{ marginBottom: 12 }}>
          <div
            style={{
              ...glassCard,
              padding: '10px 12px',
              background: 'linear-gradient(135deg, rgba(30, 58, 95, 0.35) 0%, rgba(234, 179, 8, 0.08) 55%, rgba(16, 185, 129, 0.08) 100%)',
              border: '1px solid rgba(148, 163, 184, 0.2)',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, color: '#93c5fd', marginBottom: 8 }}>
              {t.combinedCardTitle}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'minmax(88px, 0.22fr) minmax(100px, 0.28fr) minmax(120px, 0.26fr) minmax(100px, 0.24fr)',
                gap: 8,
                alignItems: 'end',
                marginBottom: 8,
              }}
            >
              <label style={{ minWidth: 0 }}>
                <span style={{ fontSize: 10, opacity: 0.65, display: 'block', marginBottom: 3 }}>{t.selectCustomer}</span>
                <select
                  className="proxy-purchase-cell-input"
                  value={summaryCustomerKey ?? ''}
                  onChange={(e) => handleSummaryCustomerChange(e.target.value)}
                  disabled={customerDirectory.length === 0}
                  style={{ width: '100%', fontWeight: 700, fontSize: 12, padding: '6px 8px' }}
                >
                  {customerDirectory.length === 0 ? (
                    <option value="">—</option>
                  ) : (
                    <>
                      <option value={SUMMARY_ALL_CUSTOMERS}>{t.allCustomers}</option>
                      {customerDirectory.map((item) => (
                        <option key={item.customerName || '__unnamed__'} value={item.customerName}>
                          {item.customerName || t.unnamedCustomer}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </label>
              <label style={{ minWidth: 0 }}>
                <span style={{ fontSize: 10, opacity: 0.65, display: 'block', marginBottom: 3 }}>{t.summaryPhone}</span>
                <input
                  className="proxy-purchase-cell-input"
                  value={isSpecificSummaryCustomer(summaryCustomerKey) ? (customerPhoneByName.get(summaryCustomerKey) ?? '') : ''}
                  onChange={(e) => {
                    if (!isSpecificSummaryCustomer(summaryCustomerKey)) return;
                    updateSummaryCustomerPhone(summaryCustomerKey, e.target.value);
                  }}
                  disabled={!isSpecificSummaryCustomer(summaryCustomerKey)}
                  placeholder={t.summaryPhonePlaceholder}
                  style={{ width: '100%', fontSize: 12, padding: '6px 8px' }}
                />
              </label>
              <label style={{ minWidth: 0 }}>
                <span style={{ fontSize: 10, opacity: 0.65, display: 'block', marginBottom: 3 }}>
                  {t.proxyFee}
                  <span style={{ marginLeft: 4, opacity: 0.55 }}>({t.feeLinkedHint})</span>
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    className="proxy-purchase-cell-input"
                    type="number"
                    min={0}
                    step={0.1}
                    value={proxyFeePercent}
                    onChange={(e) => handleProxyFeePercentChange(e.target.value)}
                    disabled={!isSpecificSummaryCustomer(summaryCustomerKey)}
                    style={{ fontSize: 14, fontWeight: 800, textAlign: 'center', flex: 1, padding: '6px 8px' }}
                  />
                  <span style={{ fontSize: 12, opacity: 0.7 }}>%</span>
                </div>
              </label>
              <label style={{ minWidth: 0 }}>
                <span style={{ fontSize: 10, opacity: 0.65, display: 'block', marginBottom: 3 }}>
                  {t.exchangeRate}
                  <span style={{ marginLeft: 4, opacity: 0.55 }}>({t.rateLinkedHint})</span>
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 10, opacity: 0.65 }}>1¥=</span>
                  <input
                    className="proxy-purchase-cell-input"
                    type="number"
                    min={0}
                    step={1}
                    value={exchangeRate}
                    onChange={(e) => handleExchangeRateChange(e.target.value)}
                    disabled={!isSpecificSummaryCustomer(summaryCustomerKey)}
                    style={{ fontSize: 14, fontWeight: 800, textAlign: 'center', flex: 1, padding: '6px 8px' }}
                  />
                  <span style={{ fontSize: 10, opacity: 0.65 }}>MMK</span>
                </div>
              </label>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: 6,
                marginBottom: 8,
                fontSize: 12,
              }}
            >
              <button
                type="button"
                onClick={openRemittanceModal}
                disabled={!isSpecificSummaryCustomer(summaryCustomerKey)}
                title={t.depositClickHint}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 10px',
                  borderRadius: 10,
                  border: '1px solid rgba(96, 165, 250, 0.32)',
                  background: 'rgba(37, 99, 235, 0.16)',
                  color: '#dbeafe',
                  cursor: isSpecificSummaryCustomer(summaryCustomerKey) ? 'pointer' : 'not-allowed',
                  opacity: isSpecificSummaryCustomer(summaryCustomerKey) ? 1 : 0.5,
                }}
              >
                <span style={{ opacity: 0.85 }}>{t.customerDeposit}</span>
                <span style={{ fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: '#93c5fd' }}>
                  ¥{selectedCustomerDepositRemaining.toFixed(2)}{isSpecificSummaryCustomer(summaryCustomerKey) ? ' ›' : ''}
                </span>
              </button>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 10px',
                  borderRadius: 10,
                  border: '1px solid rgba(250, 204, 21, 0.22)',
                  background: 'rgba(234, 179, 8, 0.08)',
                }}
              >
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => void handleSummaryCustomerExport()}
                    disabled={
                      exportBusy ||
                      !isSpecificSummaryCustomer(summaryCustomerKey) ||
                      (summaryExportScope === 'date' && !summaryExportDate.trim()) ||
                      summaryExportRows.length === 0
                    }
                    style={{
                      padding: '3px 8px',
                      borderRadius: 8,
                      border: 'none',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 800,
                      cursor:
                        exportBusy ||
                        !isSpecificSummaryCustomer(summaryCustomerKey) ||
                        (summaryExportScope === 'date' && !summaryExportDate.trim()) ||
                        summaryExportRows.length === 0
                          ? 'not-allowed'
                          : 'pointer',
                      opacity:
                        exportBusy ||
                        !isSpecificSummaryCustomer(summaryCustomerKey) ||
                        (summaryExportScope === 'date' && !summaryExportDate.trim()) ||
                        summaryExportRows.length === 0
                          ? 0.55
                          : 1,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {exportBusy ? '…' : t.exportExcel}
                  </button>
                  <select
                    className="proxy-purchase-cell-input"
                    value={summaryExportScope}
                    onChange={(e) => {
                      const next = e.target.value as SummaryExportScope;
                      setSummaryExportScope(next);
                      if (next === 'date' && !summaryExportDate && summaryExportDateOptions[0]) {
                        setSummaryExportDate(summaryExportDateOptions[0]);
                      }
                    }}
                    disabled={!isSpecificSummaryCustomer(summaryCustomerKey)}
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '4px 6px',
                      minWidth: 72,
                      maxWidth: 110,
                      opacity: isSpecificSummaryCustomer(summaryCustomerKey) ? 1 : 0.55,
                    }}
                  >
                    <option value="settled">{t.summaryExportSettled}</option>
                    <option value="open">{t.summaryExportOpen}</option>
                    <option value="date">{t.summaryExportByDate}</option>
                  </select>
                  {summaryExportScope === 'date' ? (
                    <input
                      className="proxy-purchase-cell-input"
                      type="date"
                      value={summaryExportDate}
                      onChange={(e) => setSummaryExportDate(e.target.value)}
                      disabled={!isSpecificSummaryCustomer(summaryCustomerKey)}
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '4px 6px',
                        width: isMobile ? 118 : 128,
                        opacity: isSpecificSummaryCustomer(summaryCustomerKey) ? 1 : 0.55,
                      }}
                    />
                  ) : null}
                </div>
                <span style={{ fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: '#fde68a' }}>
                  ¥{summaryExportTotalRmb.toFixed(2)}
                </span>
              </div>
            </div>

            <div
              style={{
                paddingTop: 8,
                borderTop: '1px solid rgba(148, 163, 184, 0.18)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: 8,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 800, color: '#f8fafc' }}>
                {t.grandTotalLabel}
                <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 600, opacity: 0.55 }}>({t.grandTotalHint})</span>
              </span>
              <span
                style={{
                  fontSize: isMobile ? 20 : 22,
                  fontWeight: 900,
                  fontVariantNumeric: 'tabular-nums',
                  color: selectedCustomerBalance >= 0 ? '#6ee7b7' : '#fca5a5',
                }}
              >
                ¥{selectedCustomerBalance.toFixed(2)}
              </span>
            </div>
            {(isSpecificSummaryCustomer(summaryCustomerKey) ? rateNum > 0 : selectedCustomerBalanceMmk !== 0) ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4, fontSize: 11, opacity: 0.72 }}>
                <span>{t.totalMmk}</span>
                <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: selectedCustomerBalance >= 0 ? '#6ee7b7' : '#fca5a5' }}>
                  {selectedCustomerBalanceMmk.toLocaleString()}
                </span>
              </div>
            ) : null}
          </div>
        </section>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            marginBottom: 14,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {actionBtn(`+ ${t.addRow}`, () => addRow(), 'primary')}
            {actionBtn(`⎘ ${t.duplicateRow}`, duplicateLastRow, 'ghost')}
            {actionBtn(t.selectAll, selectAllInBatchScope, 'ghost')}
            {actionBtn(t.selectNone, selectNoneInBatchScope, 'ghost')}
            {actionBtn(t.batchSettle, batchSettleSelected, 'success', batchSettleEligibleCount === 0)}
            {actionBtn(t.batchUnsettle, batchUnsettleSelected, 'ghost', batchUnsettleEligibleCount === 0)}
            {actionBtn(t.clearAll, clearAllRows, 'danger')}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#6ee7b7',
                padding: '6px 12px',
                borderRadius: 999,
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(52, 211, 153, 0.25)',
              }}
            >
              导出合计 ¥{selectedExportTotalRmb.toFixed(2)} · {selectedExportTotalMmk.toLocaleString()} MMK
            </span>
            {!isMobile ? (
              <span style={{ fontSize: 12, opacity: 0.55 }}>{t.scrollHint}</span>
            ) : null}
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14, alignItems: 'center' }}>
          {(['all', 'open', 'settled'] as const).map((key) => (
            <button
              key={key}
              type="button"
              style={presetChip(settleFilter === key)}
              onClick={() => {
                setSettleFilter(key);
                setListPage(1);
              }}
            >
              {key === 'all' ? t.filterAll : key === 'open' ? t.filterOpen : t.filterSettled}
              {' '}({settleCounts[key]})
            </button>
          ))}
          {isSpecificSummaryCustomer(summaryCustomerKey) ? (
            <span style={{ fontSize: 12, opacity: 0.68, marginLeft: 4 }}>
              {t.ordersForCustomer.replace('{name}', summaryCustomerKey || t.unnamedCustomer)}
              {' · '}
              {displayRows.length}
            </span>
          ) : null}
        </div>

        {isMobile ? (
          <div>{paginatedRows.map((row, idx) => renderMobileCard(row, (listPage - 1) * ROWS_PER_PAGE + idx))}</div>
        ) : (
          <section style={{ ...glassCard, overflow: 'hidden', padding: 0 }}>
            <div
              className="proxy-purchase-table-scroll"
              style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}
            >
              <table style={{ width: '100%', minWidth: 1168, borderCollapse: 'separate', borderSpacing: 0, fontSize: 13 }}>
                <thead>
                  <tr>
                    <th colSpan={1} style={groupHeaderStyle('#94a3b8')}>{t.colExport}</th>
                    <th colSpan={4} style={groupHeaderStyle('#38bdf8')}>{t.groupCustomer}</th>
                    <th colSpan={3} style={groupHeaderStyle('#a78bfa')}>{t.groupProduct}</th>
                    <th colSpan={4} style={{ ...groupHeaderStyle('#34d399'), borderRight: 'none' }}>{t.groupPrice}</th>
                  </tr>
                  <tr style={{ background: 'linear-gradient(180deg, rgba(51, 65, 85, 0.95), rgba(30, 41, 59, 0.92))' }}>
                    <th
                      style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 2,
                        padding: '11px 8px',
                        textAlign: 'center',
                        width: 44,
                        borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
                        background: 'rgba(30, 41, 59, 0.98)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={allBatchScopeSelected}
                        onChange={(e) => (e.target.checked ? selectAllInBatchScope() : selectNoneInBatchScope())}
                        title={t.selectAll}
                        style={{ width: 16, height: 16, accentColor: '#2dd4bf', cursor: 'pointer' }}
                      />
                    </th>
                    {[
                      t.colNo,
                      t.colCustomer,
                      t.colDate,
                      t.colAddress,
                      t.colPlatform,
                      t.colProduct,
                      t.colStatus,
                      t.colQty,
                      t.colUnitPrice,
                      feeColLabel,
                      t.colTotal,
                      t.colActions,
                    ].map((label, i) => (
                      <th
                        key={`${label}-${i}`}
                        style={{
                          position: 'sticky',
                          top: 0,
                          zIndex: 2,
                          padding: '11px 8px',
                          textAlign: i >= 7 && i <= 10 ? 'right' : 'left',
                          fontWeight: 700,
                          fontSize: 12,
                          whiteSpace: 'nowrap',
                          color: 'rgba(226, 232, 240, 0.95)',
                          borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
                          background: 'rgba(30, 41, 59, 0.98)',
                          ...(i === 3
                            ? { width: COL_ADDRESS_WIDTH, maxWidth: COL_ADDRESS_WIDTH }
                            : i === 4
                              ? { width: COL_PLATFORM_WIDTH, maxWidth: COL_PLATFORM_WIDTH }
                              : i === 5
                                ? { minWidth: COL_PRODUCT_MIN_WIDTH, width: COL_PRODUCT_MIN_WIDTH }
                                : {}),
                        }}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((row, idx) => {
                    const globalIdx = (listPage - 1) * ROWS_PER_PAGE + idx;
                    const unit = parseNum(row.unitPrice);
                    const rowFeePct = feeForCustomer(row.customerName.trim());
                    const fee = calcProxyFee(unit, rowFeePct);
                    const total = calcLineTotalRmb(unit, rowFeePct);
                    const active = rowHasContent(row);
                    const settled = isProxyPurchaseRowSettled(row);
                    return (
                      <tr
                        key={row.id}
                        className={`proxy-purchase-row${settled ? ' proxy-purchase-row--settled' : ''}`}
                        style={{
                          borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
                          background: settled
                            ? 'rgba(30, 58, 95, 0.28)'
                            : active
                              ? globalIdx % 2 === 0
                                ? 'rgba(15, 23, 42, 0.35)'
                                : 'rgba(15, 23, 42, 0.18)'
                              : 'transparent',
                          transition: 'background 0.15s',
                          opacity: exportSelected[row.id] || !rowHasExportContent(row) ? 1 : 0.68,
                        }}
                      >
                        <td style={{ padding: '8px 6px', textAlign: 'center', width: 44 }}>
                          {renderExportCheckbox(row)}
                        </td>
                        <td style={{ padding: '8px 6px', textAlign: 'center', width: 40 }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              width: 26,
                              height: 26,
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: 7,
                              background: active ? 'rgba(45, 212, 191, 0.14)' : 'rgba(51, 65, 85, 0.5)',
                              color: active ? '#5eead4' : '#94a3b8',
                              fontWeight: 800,
                              fontSize: 12,
                            }}
                          >
                            {globalIdx + 1}
                          </span>
                        </td>
                        <td style={{ ...cellPad, minWidth: 140, maxWidth: 180 }}>
                          {renderEditableInput(row, row.customerName, (v) => updateRow(row.id, { customerName: v }), {
                            placeholder: 'TSL',
                            readonlyEmphasis: 'customer',
                          })}
                        </td>
                        <td style={cellPad}>{renderEditableInput(row, row.orderDate, (v) => updateRow(row.id, { orderDate: v }), { type: 'date' })}</td>
                        <td style={{ ...cellPad, width: COL_ADDRESS_WIDTH, maxWidth: COL_ADDRESS_WIDTH }}>{renderEditableInput(row, row.address, (v) => updateRow(row.id, { address: v }), { placeholder: 'RUILI' })}</td>
                        <td style={{ ...cellPad, width: COL_PLATFORM_WIDTH, maxWidth: COL_PLATFORM_WIDTH }}>{renderEditableInput(row, row.platform, (v) => updateRow(row.id, { platform: v }), { list: 'proxy-platform-list', placeholder: '拼多多' })}</td>
                        <td style={{ ...cellPad, minWidth: COL_PRODUCT_MIN_WIDTH, width: COL_PRODUCT_MIN_WIDTH }}>{renderEditableInput(row, row.productName, (v) => updateRow(row.id, { productName: v }))}</td>
                        <td style={{ ...cellPad, width: 96 }}>{renderStatusSelect(row)}</td>
                        <td style={{ ...cellPad, width: 72 }}>{renderEditableInput(row, row.quantity, (v) => updateRow(row.id, { quantity: v }), { type: 'number', min: 0, style: { textAlign: 'center' } })}</td>
                        <td style={{ ...cellPad, width: 96 }}>{renderEditableInput(row, row.unitPrice, (v) => updateRow(row.id, { unitPrice: v }), { type: 'number', min: 0, step: 0.01, style: { textAlign: 'right' } })}</td>
                        <td style={{ ...cellPad, textAlign: 'right' }}>{renderCalcPill(unit > 0 ? fee.toFixed(2) : '—', 'fee')}</td>
                        <td style={{ ...cellPad, textAlign: 'right' }}>{renderCalcPill(unit > 0 ? total.toFixed(2) : '—', 'total')}</td>
                        <td style={{ ...cellPad, minWidth: 118, textAlign: 'center' }}>
                          {renderRowActions(row)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {renderListPagination()}

        {isMobile ? (
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
            {actionBtn(`+ ${t.addRow}`, () => addRow(), 'primary')}
          </div>
        ) : null}
      </div>

      {remittanceModalOpen ? (
        <div
          role="presentation"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10040,
            background: 'rgba(2, 6, 23, 0.72)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isMobile ? 12 : 24,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setRemittanceModalOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t.remittanceDetails}
            style={{
              width: '100%',
              maxWidth: 560,
              maxHeight: isMobile ? '92vh' : '86vh',
              display: 'flex',
              flexDirection: 'column',
              ...glassCard,
              padding: isMobile ? '14px 12px' : '16px 16px 14px',
              boxShadow: '0 28px 80px rgba(0,0,0,0.45)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{t.remittanceDetails}</h3>
                <p style={{ margin: '4px 0 0', fontSize: 12, opacity: 0.72 }}>
                  {summaryCustomerKey || t.unnamedCustomer}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRemittanceModalOpen(false)}
                style={{
                  border: 'none',
                  background: 'rgba(148,163,184,0.12)',
                  color: '#e2e8f0',
                  borderRadius: 8,
                  width: 30,
                  height: 30,
                  cursor: 'pointer',
                  fontSize: 16,
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gap: 6,
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 10px',
                  borderRadius: 10,
                  background: 'rgba(30, 41, 59, 0.55)',
                  border: '1px solid rgba(148, 163, 184, 0.16)',
                }}
              >
                <span style={{ fontSize: 12, opacity: 0.85 }}>{t.depositOriginalTotal}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#e2e8f0', fontVariantNumeric: 'tabular-nums' }}>
                  ¥{selectedCustomerDepositOriginal.toFixed(2)}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 10px',
                  borderRadius: 10,
                  background: 'rgba(234, 179, 8, 0.08)',
                  border: '1px solid rgba(250, 204, 21, 0.22)',
                }}
              >
                <span style={{ fontSize: 12, opacity: 0.85 }}>{t.depositSettledDeduct}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#fde68a', fontVariantNumeric: 'tabular-nums' }}>
                  −¥{selectedCustomerSettled.toFixed(2)}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 10px',
                  borderRadius: 10,
                  background: 'rgba(37, 99, 235, 0.14)',
                  border: '1px solid rgba(96, 165, 250, 0.24)',
                }}
              >
                <span style={{ fontSize: 12, opacity: 0.85 }}>{t.depositBalance}</span>
                <span style={{ fontSize: 18, fontWeight: 900, color: '#93c5fd', fontVariantNumeric: 'tabular-nums' }}>
                  ¥{selectedCustomerDepositRemaining.toFixed(2)}
                </span>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', marginBottom: 10, paddingRight: 2 }}>
              {currentDepositEntries.length === 0 ? (
                <div style={{ fontSize: 12, opacity: 0.55, padding: '12px 4px' }}>{t.depositEmpty}</div>
              ) : (
                currentDepositEntries.map((entry) => {
                  const isEditing = editingDepositId === entry.id && editDepositDraft;
                  return (
                    <div
                      key={entry.id}
                      style={{
                        padding: '10px 10px',
                        marginBottom: 8,
                        borderRadius: 10,
                        border: '1px solid rgba(148, 163, 184, 0.16)',
                        background: 'rgba(15, 23, 42, 0.42)',
                      }}
                    >
                      {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <label style={{ fontSize: 11, opacity: 0.7 }}>
                              {t.depositDate}
                              <input
                                className="proxy-purchase-cell-input"
                                type="date"
                                value={editDepositDraft.date}
                                onChange={(e) => setEditDepositDraft({ ...editDepositDraft, date: e.target.value })}
                                style={{ width: '100%', marginTop: 4, fontSize: 12 }}
                              />
                            </label>
                            <label style={{ fontSize: 11, opacity: 0.7 }}>
                              {t.depositAmount}
                              <input
                                className="proxy-purchase-cell-input"
                                type="number"
                                min={0}
                                step={0.01}
                                value={editDepositDraft.amount}
                                onChange={(e) => setEditDepositDraft({ ...editDepositDraft, amount: e.target.value })}
                                style={{ width: '100%', marginTop: 4, fontSize: 12, textAlign: 'right' }}
                              />
                            </label>
                          </div>
                          <label style={{ fontSize: 11, opacity: 0.7 }}>
                            {t.depositNote}
                            <textarea
                              className="proxy-purchase-cell-input"
                              value={editDepositDraft.note}
                              onChange={(e) => setEditDepositDraft({ ...editDepositDraft, note: e.target.value })}
                              rows={2}
                              style={{ width: '100%', marginTop: 4, fontSize: 12, resize: 'vertical' }}
                            />
                          </label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {actionBtn(t.depositSave, saveEditDepositEntry, 'primary')}
                            {actionBtn(t.depositCancel, () => {
                              setEditingDepositId(null);
                              setEditDepositDraft(null);
                            }, 'ghost')}
                            {actionBtn(t.depositDelete, () => deleteDepositEntry(entry.id), 'danger')}
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                              <span style={{ fontSize: 12, opacity: 0.75 }}>{entry.date || '—'}</span>
                              <span style={{ fontSize: 14, fontWeight: 800, color: '#93c5fd', fontVariantNumeric: 'tabular-nums' }}>
                                ¥{parseNum(entry.amount).toFixed(2)}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, opacity: 0.88, lineHeight: 1.45, wordBreak: 'break-word' }}>
                              {entry.note?.trim() || '—'}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => startEditDepositEntry(entry)}
                            style={{
                              flexShrink: 0,
                              padding: '4px 10px',
                              borderRadius: 8,
                              border: '1px solid rgba(148, 163, 184, 0.28)',
                              background: 'rgba(255,255,255,0.06)',
                              color: '#e2e8f0',
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            {t.depositEdit}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div
              style={{
                paddingTop: 10,
                borderTop: '1px solid rgba(148, 163, 184, 0.16)',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, opacity: 0.88 }}>{t.depositAddEntry}</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <label style={{ fontSize: 11, opacity: 0.7 }}>
                  {t.depositDate}
                  <input
                    className="proxy-purchase-cell-input"
                    type="date"
                    value={depositDraftDate}
                    onChange={(e) => setDepositDraftDate(e.target.value)}
                    style={{ width: '100%', marginTop: 4, fontSize: 12 }}
                  />
                </label>
                <label style={{ fontSize: 11, opacity: 0.7 }}>
                  {t.depositAmount}
                  <input
                    className="proxy-purchase-cell-input"
                    type="number"
                    min={0}
                    step={0.01}
                    value={depositDraftAmount}
                    onChange={(e) => setDepositDraftAmount(e.target.value)}
                    placeholder="0.00"
                    style={{ width: '100%', marginTop: 4, fontSize: 12, textAlign: 'right' }}
                  />
                </label>
              </div>
              <label style={{ display: 'block', fontSize: 11, opacity: 0.7, marginBottom: 8 }}>
                {t.depositNote}
                <textarea
                  className="proxy-purchase-cell-input"
                  value={depositDraftNote}
                  onChange={(e) => setDepositDraftNote(e.target.value)}
                  rows={2}
                  placeholder={t.depositNote}
                  style={{ width: '100%', marginTop: 4, fontSize: 12, resize: 'vertical' }}
                />
              </label>
              {actionBtn(t.depositAdd, addCustomerDepositEntry, 'success')}
            </div>
          </div>
        </div>
      ) : null}

      {exportModalOpen ? (
        <div
          role="presentation"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10050,
            background: 'rgba(2, 6, 23, 0.72)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isMobile ? 12 : 24,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !exportBusy) setExportModalOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t.exportModalTitle}
            style={{
              width: '100%',
              maxWidth: 600,
              maxHeight: isMobile ? '92vh' : '88vh',
              display: 'flex',
              flexDirection: 'column',
              ...glassCard,
              padding: isMobile ? '18px 16px' : '22px 22px 18px',
              boxShadow: '0 28px 80px rgba(0,0,0,0.45)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800 }}>{t.exportModalTitle}</h3>
            <p style={{ margin: '0 0 14px', fontSize: 13, opacity: 0.82, lineHeight: 1.55 }}>{t.exportModalSub}</p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: 10,
                marginBottom: 8,
              }}
            >
              <label style={{ display: 'block', position: 'relative' }}>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, opacity: 0.88 }}>
                  {t.exportFilterCustomer}
                  {exportCustomerOptions.length > 0 ? (
                    <span style={{ marginLeft: 6, fontWeight: 600, opacity: 0.55 }}>
                      ({exportCustomerOptions.length})
                    </span>
                  ) : null}
                </span>
                <input
                  className="proxy-purchase-cell-input"
                  type="text"
                  value={exportFilterCustomer}
                  onChange={(e) => {
                    setExportFilterCustomer(e.target.value);
                    setExportCustomerDropdownOpen(true);
                  }}
                  onFocus={() => setExportCustomerDropdownOpen(true)}
                  onBlur={() => {
                    window.setTimeout(() => setExportCustomerDropdownOpen(false), 120);
                  }}
                  placeholder={t.exportFilterPlaceholder}
                  style={{ fontSize: 14 }}
                  autoComplete="off"
                />
                {exportCustomerDropdownOpen && exportCustomerOptions.length > 0 ? (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: 'calc(100% + 4px)',
                      zIndex: 2,
                      maxHeight: 220,
                      overflowY: 'auto',
                      borderRadius: 10,
                      border: '1px solid rgba(148, 163, 184, 0.22)',
                      background: 'rgba(15, 23, 42, 0.98)',
                      boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
                    }}
                  >
                    {exportCustomerSuggestions.length === 0 ? (
                      <div style={{ padding: '10px 12px', fontSize: 12, opacity: 0.65 }}>{t.exportFilterNoMatch}</div>
                    ) : (
                      exportCustomerSuggestions.map((item) => (
                        <button
                          key={item.name}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => selectFilteredCustomer(item.name)}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 10,
                            padding: '9px 12px',
                            border: 'none',
                            borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
                            background:
                              exportFilterCustomer.trim().toLowerCase() === item.name.toLowerCase()
                                ? 'rgba(45, 212, 191, 0.12)'
                                : 'transparent',
                            color: '#e2e8f0',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontSize: 13,
                          }}
                        >
                          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.name}
                          </span>
                          <span style={{ fontSize: 11, opacity: 0.65, flexShrink: 0 }}>
                            {item.count} {t.exportFilterOrders}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                ) : null}
              </label>
              <label style={{ display: 'block' }}>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, opacity: 0.88 }}>
                  {t.exportFilterDate}
                  {exportDateOptions.length > 0 ? (
                    <span style={{ marginLeft: 6, fontWeight: 600, opacity: 0.55 }}>
                      ({exportDateOptions.length})
                    </span>
                  ) : null}
                </span>
                <select
                  className="proxy-purchase-cell-input"
                  value={exportFilterDate}
                  onChange={(e) => handleExportDateChange(e.target.value)}
                  style={{ fontSize: 14, cursor: 'pointer' }}
                >
                  <option value="">{t.exportFilterAllDates}</option>
                  {exportDateOptions.map((item) => (
                    <option key={item.date} value={item.date}>
                      {formatFilterDateLabel(item.date)} ({item.count} {t.exportFilterOrders})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {exportCustomerOptions.length > 0 &&
            exportCustomerOptions.length <= EXPORT_QUICK_PICK_LIMIT ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {exportCustomerOptions.map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => selectFilteredCustomer(item.name)}
                    style={presetChip(exportFilterCustomer.trim().toLowerCase() === item.name.toLowerCase())}
                  >
                    {item.name} ({item.count})
                  </button>
                ))}
              </div>
            ) : null}

            {exportDateOptions.length > 0 && exportDateOptions.length <= EXPORT_QUICK_PICK_LIMIT ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {exportDateOptions.map((item) => (
                  <button
                    key={item.date}
                    type="button"
                    onClick={() => handleExportDateChange(item.date)}
                    style={presetChip(exportFilterDate.trim() === item.date)}
                  >
                    {formatFilterDateLabel(item.date)} ({item.count})
                  </button>
                ))}
              </div>
            ) : null}

            {exportFilterCustomer.trim() || exportFilterDate.trim() ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                {exportFilterCustomer.trim() ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 10px',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 600,
                      background: 'rgba(45, 212, 191, 0.12)',
                      border: '1px solid rgba(45, 212, 191, 0.28)',
                      color: '#99f6e4',
                    }}
                  >
                    {exportFilterCustomer.trim()}
                    <button
                      type="button"
                      onClick={() => setExportFilterCustomer('')}
                      aria-label={t.exportClearFilters}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: 'inherit',
                        cursor: 'pointer',
                        padding: 0,
                        lineHeight: 1,
                        fontSize: 14,
                      }}
                    >
                      ×
                    </button>
                  </span>
                ) : null}
                {exportFilterDate.trim() ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 10px',
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 600,
                      background: 'rgba(96, 165, 250, 0.12)',
                      border: '1px solid rgba(96, 165, 250, 0.28)',
                      color: '#bfdbfe',
                    }}
                  >
                    {formatFilterDateLabel(exportFilterDate)}
                    <button
                      type="button"
                      onClick={() => setExportFilterDate('')}
                      aria-label={t.exportClearFilters}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: 'inherit',
                        cursor: 'pointer',
                        padding: 0,
                        lineHeight: 1,
                        fontSize: 14,
                      }}
                    >
                      ×
                    </button>
                  </span>
                ) : null}
                {actionBtn(t.exportClearFilters, clearExportFilters, 'ghost')}
              </div>
            ) : null}

            <div style={{ fontSize: 11, opacity: 0.65, marginBottom: 8 }}>
              {t.exportFilterShowing} {filteredExportRows.length} / {exportableRows.length}
            </div>

            <div
              style={{
                flex: 1,
                minHeight: 120,
                maxHeight: isMobile ? 240 : 280,
                overflowY: 'auto',
                marginBottom: 14,
                borderRadius: 12,
                border: '1px solid rgba(148, 163, 184, 0.16)',
                background: 'rgba(15, 23, 42, 0.45)',
              }}
            >
              {exportableRows.length === 0 ? (
                <p style={{ margin: 0, padding: 16, fontSize: 13, opacity: 0.7 }}>{t.exportNone}</p>
              ) : filteredExportRows.length === 0 ? (
                <p style={{ margin: 0, padding: 16, fontSize: 13, opacity: 0.7 }}>{t.exportFilterEmpty}</p>
              ) : (
                filteredExportRows.map((row, idx) => {
                  const unit = parseNum(row.unitPrice);
                  const total = calcLineTotalRmb(unit, feeForCustomer(row.customerName.trim()));
                  const label =
                    [formatFilterDateLabel(row.orderDate), row.customerName, row.productName, row.platform]
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .join(' · ') || `#${idx + 1}`;
                  return (
                    <label
                      key={row.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '11px 14px',
                        borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                        cursor: 'pointer',
                        background: exportSelected[row.id] ? 'rgba(45, 212, 191, 0.08)' : 'transparent',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(exportSelected[row.id])}
                        onChange={(e) => toggleExportRow(row.id, e.target.checked)}
                        style={{ width: 16, height: 16, accentColor: '#2dd4bf' }}
                      />
                      <span style={{ flex: 1, fontSize: 13, lineHeight: 1.4 }}>{label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#6ee7b7' }}>
                        {unit > 0 ? `¥${total.toFixed(2)}` : '—'}
                      </span>
                    </label>
                  );
                })
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {actionBtn(t.selectAll, selectAllExportable, 'ghost')}
              {actionBtn(t.selectNone, selectNoneExportable, 'ghost')}
            </div>

            <div
              style={{
                padding: '12px 14px',
                borderRadius: 12,
                marginBottom: 16,
                background: 'rgba(234, 179, 8, 0.1)',
                border: '1px solid rgba(250, 204, 21, 0.22)',
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>
                {selectedExportRows.length} / {exportableRows.length} {t.exportSelected}
                {exportFilterCustomer.trim() || exportFilterDate.trim()
                  ? ` · ${t.exportFilterShowing} ${filteredExportRows.length}`
                  : ''}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>¥{selectedExportTotalRmb.toFixed(2)}</div>
              <div style={{ fontSize: 13, color: '#6ee7b7', marginTop: 4 }}>
                ≈ {selectedExportTotalMmk.toLocaleString()} MMK · 1 RMB = {rateNum.toLocaleString()} MMK
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-end' }}>
              {actionBtn(t.exportCancel, () => setExportModalOpen(false), 'ghost', exportBusy)}
              {actionBtn(exportBusy ? '…' : t.exportConfirm, () => void confirmExport(), 'success', exportBusy)}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const cellPad: React.CSSProperties = { padding: '7px 5px', verticalAlign: 'middle' };

function groupHeaderStyle(color: string): React.CSSProperties {
  return {
    padding: '7px 10px',
    textAlign: 'left',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color,
    background: 'rgba(15, 23, 42, 0.85)',
    borderBottom: '1px solid rgba(148, 163, 184, 0.12)',
    borderRight: '1px solid rgba(148, 163, 184, 0.08)',
  };
}

export default ProxyPurchasePage;
