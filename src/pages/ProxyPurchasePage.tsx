import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useResponsive } from '../hooks/useResponsive';
import {
  calcLineTotalRmb,
  calcProxyFee,
  exportProxyPurchaseExcel,
  normalizeProxyPurchaseStatus,
  proxyPurchaseStatusLabel,
  rowHasExportContent,
  type ProxyPurchaseRow,
  type ProxyPurchaseStatus,
} from '../utils/proxyPurchaseExcel';
import { proxyPurchaseService } from '../services/supabase';
import {
  describeProxyPurchaseCloudError,
  isProxyPurchaseTableMissingError,
} from '../utils/proxyPurchaseCloudError';

const STORAGE_KEY = 'ml_admin_proxy_purchase_draft_v1';
const FEE_PRESETS = [3, 5, 8, 10];
const ROWS_PER_PAGE = 20;
const EXPORT_QUICK_PICK_LIMIT = 6;
const COL_ADDRESS_WIDTH = 76;
const COL_PLATFORM_WIDTH = 80;
const COL_PRODUCT_MIN_WIDTH = 280;
const PLATFORM_PRESETS = ['拼多多', '淘宝', '天猫', '京东', '1688', '抖音'];

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

type SavedDraft = {
  proxyFeePercent: string;
  exchangeRate: string;
  rows: ProxyPurchaseRow[];
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
  const [exchangeRate, setExchangeRate] = useState('595');
  const [rows, setRows] = useState<ProxyPurchaseRow[]>([newRow()]);
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

  const currentOwner = useCallback(
    () =>
      (typeof window !== 'undefined' &&
        (sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser'))) ||
      '',
    [],
  );

  const syncToCloud = useCallback(
    async (payload: { proxyFeePercent: string; exchangeRate: string; rows: ProxyPurchaseRow[] }) => {
      await proxyPurchaseService.upsertWorkspace({
        proxy_fee_percent: payload.proxyFeePercent,
        exchange_rate: payload.exchangeRate,
        rows: payload.rows,
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
      setProxyFeePercent(cloud!.proxy_fee_percent || '5');
      setExchangeRate(cloud!.exchange_rate || '595');
      setRows(cloud!.rows.length > 0 ? cloud!.rows.map((r) => normalizeLoadedRow(r)) : [newRow()]);
    } else if (localHasRows) {
      setProxyFeePercent(localDraft.proxyFeePercent);
      setExchangeRate(localDraft.exchangeRate);
      setRows(localDraft.rows.map((r) => normalizeLoadedRow(r)));
      await syncToCloud({
        proxyFeePercent: localDraft.proxyFeePercent,
        exchangeRate: localDraft.exchangeRate,
        rows: localDraft.rows.map((r) => normalizeLoadedRow(r)),
      });
    } else {
      setProxyFeePercent(localDraft.proxyFeePercent);
      setExchangeRate(localDraft.exchangeRate);
      setRows(localDraft.rows.map((r) => normalizeLoadedRow(r)));
    }
    setCloudErr('');
    setCloudSyncDisabled(false);
  }, [syncToCloud]);

  const retryCloudSync = useCallback(async () => {
    setCloudRetrying(true);
    setCloudErr('');
    try {
      await loadFromCloud();
      await syncToCloud({ proxyFeePercent, exchangeRate, rows });
      setSavedPulse(true);
      window.setTimeout(() => setSavedPulse(false), 1400);
    } catch (e) {
      console.error(e);
      setCloudSyncDisabled(isProxyPurchaseTableMissingError(e));
      setCloudErr(describeProxyPurchaseCloudError(e, language));
    } finally {
      setCloudRetrying(false);
    }
  }, [exchangeRate, language, loadFromCloud, proxyFeePercent, rows, syncToCloud]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setCloudLoading(true);
      setCloudErr('');
      try {
        await loadFromCloud();
        if (!cancelled) setCloudReady(true);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          const draft = loadDraft();
          setProxyFeePercent(draft.proxyFeePercent);
          setExchangeRate(draft.exchangeRate);
          setRows(draft.rows.map((r) => normalizeLoadedRow(r)));
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
        JSON.stringify({ proxyFeePercent, exchangeRate, rows }),
      );
      void syncToCloud({ proxyFeePercent, exchangeRate, rows })
        .then(() => {
          setCloudErr('');
          setCloudSyncDisabled(false);
          setSavedPulse(true);
          hideTimer = window.setTimeout(() => setSavedPulse(false), 1400);
        })
        .catch((e) => {
          console.error(e);
          setCloudSyncDisabled(isProxyPurchaseTableMissingError(e));
          setCloudErr(describeProxyPurchaseCloudError(e, language));
        });
    }, 400);
    return () => {
      window.clearTimeout(saveTimer);
      if (hideTimer) window.clearTimeout(hideTimer);
    };
  }, [proxyFeePercent, exchangeRate, rows, cloudReady, cloudSyncDisabled, language, syncToCloud]);

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
    `;
    document.head.appendChild(el);
    return () => el.remove();
  }, []);

  const feePctNum = parseNum(proxyFeePercent);
  const rateNum = parseNum(exchangeRate);

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
      total += calcLineTotalRmb(parseNum(row.unitPrice), feePctNum);
    });
    return round2(total);
  }, [selectedExportRows, feePctNum]);

  const selectedExportTotalMmk = useMemo(
    () => Math.round(selectedExportTotalRmb * rateNum),
    [selectedExportTotalRmb, rateNum],
  );

  const allExportableSelected =
    filteredExportRows.length > 0 && filteredExportRows.every((r) => exportSelected[r.id]);

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

  const listTotalPages = useMemo(
    () => Math.max(1, Math.ceil(rows.length / ROWS_PER_PAGE)),
    [rows.length],
  );

  const paginatedRows = useMemo(() => {
    const start = (listPage - 1) * ROWS_PER_PAGE;
    return rows.slice(start, start + ROWS_PER_PAGE);
  }, [rows, listPage]);

  useEffect(() => {
    setListPage((page) => Math.min(page, listTotalPages));
  }, [listTotalPages]);

  const { grandTotalRmb, grandTotalMmk } = useMemo(() => {
    let total = 0;
    rows.forEach((row) => {
      const unit = parseNum(row.unitPrice);
      total += calcLineTotalRmb(unit, feePctNum);
    });
    return {
      grandTotalRmb: round2(total),
      grandTotalMmk: Math.round(total * rateNum),
    };
  }, [rows, feePctNum, rateNum]);

  const t =
    language === 'en'
      ? {
          kicker: 'ML Express · Admin',
          hubTitle: 'Metric management',
          draftsTabBtn: '📑 Import drafts',
          pricesTabBtn: '💲 Product prices',
          personalTabBtn: '🧾 Personal expenses',
          proxyTabBtn: '🛒 Proxy purchase',
          title: 'Proxy purchase',
          subtitle: 'Record orders, tweak fee & rate live, export a polished Excel for your customer.',
          close: 'Close',
          back: 'Metric management',
          backMetric: '← Metric hub',
          proxyFee: 'Proxy fee',
          exchangeRate: 'Exchange rate',
          addRow: 'Add row',
          duplicateRow: 'Duplicate last',
          clearAll: 'Clear all',
          exportExcel: 'Export Excel',
          colNo: '#',
          colCustomer: 'Customer',
          colDate: 'Date',
          colAddress: 'Address',
          colPhone: 'Phone',
          colPlatform: 'Platform',
          colProduct: 'Product',
          colStatus: 'Status',
          statusPending: 'pending',
          statusReceived: 'receive',
          colQty: 'Qty',
          colUnitPrice: 'Unit ¥',
          colFee: 'Fee',
          colTotal: 'Total ¥',
          colActions: '',
          delete: 'Remove',
          totalRmb: 'Grand total',
          totalMmk: 'In MMK',
          rateHint: 'Shown in Excel footer',
          exportFail: 'Excel export failed. Please try again.',
          confirmClear: 'Confirm delete all rows? This cannot be undone.',
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
        }
      : language === 'my'
        ? {
            kicker: 'ML Express · Admin',
            hubTitle: 'မီတြခစီမံခန့်ခွဲမှု',
            draftsTabBtn: '📑 Drafts',
            pricesTabBtn: '💲 Prices',
            personalTabBtn: '🧾 Expenses',
            proxyTabBtn: '🛒 Proxy',
            title: 'ကြားခံဝယ်ယူမှု',
            subtitle: 'မှတ်တမ်းတင်ပြီး Excel တင်ပါ။',
            close: 'ပိတ်မည်',
            back: 'Metric hub',
            backMetric: '← Metric hub',
            proxyFee: 'ကြားခံကြေး',
            exchangeRate: 'ငွေလဲနှုန်း',
            addRow: 'Add row',
            duplicateRow: 'Duplicate',
            clearAll: 'Clear',
            exportExcel: 'Excel',
            colNo: '#',
            colCustomer: 'Customer',
            colDate: 'Date',
            colAddress: 'Address',
            colPhone: 'Phone',
            colPlatform: 'Platform',
            colProduct: 'Product',
            colStatus: 'Status',
            statusPending: 'pending',
            statusReceived: 'receive',
            colQty: 'Qty',
            colUnitPrice: 'Unit ¥',
            colFee: 'Fee',
            colTotal: 'Total ¥',
            colActions: '',
            delete: 'Remove',
            totalRmb: 'Total',
            totalMmk: 'MMK',
            rateHint: 'Excel footer',
            exportFail: 'Export failed',
            confirmClear: 'Confirm delete all rows?',
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
          }
        : {
            kicker: 'ML Express · Admin',
            hubTitle: '指标管理',
            draftsTabBtn: '📑 进口指标草稿',
            pricesTabBtn: '💲 商品价格',
            personalTabBtn: '🧾 个人开销',
            proxyTabBtn: '🛒 代购',
            title: '代购清单',
            subtitle: '登记客户订单，代购费与汇率可随时调整，一键导出 Excel 发给客户。',
            close: '关闭',
            back: '指标管理',
            backMetric: '← 返回指标管理',
            proxyFee: '代购费',
            exchangeRate: '汇率',
            addRow: '添加一行',
            duplicateRow: '复制上一行',
            clearAll: '清空',
            exportExcel: '导出 Excel',
            colNo: '序',
            colCustomer: '客户',
            colDate: '日期',
            colAddress: '地址',
            colPhone: '电话',
            colPlatform: '平台',
            colProduct: '商品',
            colStatus: '状态',
            statusPending: 'pending',
            statusReceived: 'receive',
            colQty: '数量',
            colUnitPrice: '单价 ¥',
            colFee: '代购费',
            colTotal: '合计 ¥',
            colActions: '',
            delete: '删',
            totalRmb: '人民币合计',
            totalMmk: '缅币约合',
            rateHint: '导出 Excel 时显示在底部',
            exportFail: 'Excel 导出失败，请重试。',
            confirmClear: '确认删除全部订单？此操作不可恢复。',
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
          };

  const renderStatusSelect = (row: ProxyPurchaseRow) => {
    const status = normalizeProxyPurchaseStatus(row.status);
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
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const requestRemoveRow = useCallback(
    (id: string) => {
      if (!window.confirm(t.confirmDeleteRow)) return;
      setRows((prev) => (prev.length <= 1 ? [newRow()] : prev.filter((r) => r.id !== id)));
    },
    [t.confirmDeleteRow],
  );

  const addRow = useCallback((seed?: Partial<ProxyPurchaseRow>) => {
    setListPage(1);
    setRows((prev) => [newRow(seed), ...prev]);
  }, []);

  const duplicateLastRow = useCallback(() => {
    setListPage(1);
    setRows((prev) => {
      const source = prev[0];
      if (!source) return prev;
      return [
        newRow({
          customerName: source.customerName,
          orderDate: source.orderDate,
          address: source.address,
          phone: source.phone,
          platform: source.platform,
        }),
        ...prev,
      ];
    });
  }, []);

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
      await exportProxyPurchaseExcel({
        rows: selectedExportRows,
        proxyFeePercent: feePctNum,
        exchangeRate: rateNum,
        filenameHint: firstCustomer || 'supplier',
      });
      setExportModalOpen(false);
    } catch (err) {
      console.error(err);
      window.alert(t.exportFail);
    } finally {
      setExportBusy(false);
    }
  }, [selectedExportRows, feePctNum, rateNum, t.exportFail, t.exportNone]);

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

  const feeColLabel = `${t.colFee} ${feePctNum || 0}%`;

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
    const fee = calcProxyFee(unit, feePctNum);
    const total = calcLineTotalRmb(unit, feePctNum);
    return (
      <article
        key={row.id}
        style={{
          ...glassCard,
          padding: '14px 14px 12px',
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, opacity: 0.85 }}>
            {renderExportCheckbox(row, 'sm')}
            {t.colExport}
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
            <button
            type="button"
            onClick={() => requestRemoveRow(row.id)}
            aria-label={t.delete}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              border: '1px solid rgba(248, 113, 113, 0.35)',
              background: 'rgba(127, 29, 29, 0.25)',
              color: '#fca5a5',
              cursor: 'pointer',
              fontSize: 16,
            }}
          >
            ×
          </button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <label>
            <span style={{ fontSize: 11, opacity: 0.7, display: 'block', marginBottom: 4 }}>{t.colCustomer}</span>
            <input className="proxy-purchase-cell-input" value={row.customerName} onChange={(e) => updateRow(row.id, { customerName: e.target.value })} />
          </label>
          <label>
            <span style={{ fontSize: 11, opacity: 0.7, display: 'block', marginBottom: 4 }}>{t.colDate}</span>
            <input className="proxy-purchase-cell-input" type="date" value={row.orderDate} onChange={(e) => updateRow(row.id, { orderDate: e.target.value })} />
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            <span style={{ fontSize: 11, opacity: 0.7, display: 'block', marginBottom: 4 }}>{t.colProduct}</span>
            <input className="proxy-purchase-cell-input" value={row.productName} onChange={(e) => updateRow(row.id, { productName: e.target.value })} />
          </label>
          <label>
            <span style={{ fontSize: 11, opacity: 0.7, display: 'block', marginBottom: 4 }}>{t.colStatus}</span>
            {renderStatusSelect(row)}
          </label>
          <label>
            <span style={{ fontSize: 11, opacity: 0.7, display: 'block', marginBottom: 4 }}>{t.colPlatform}</span>
            <input className="proxy-purchase-cell-input" list="proxy-platform-list" value={row.platform} onChange={(e) => updateRow(row.id, { platform: e.target.value })} placeholder="拼多多" />
          </label>
          <label>
            <span style={{ fontSize: 11, opacity: 0.7, display: 'block', marginBottom: 4 }}>{t.colQty}</span>
            <input className="proxy-purchase-cell-input" type="number" min={0} value={row.quantity} onChange={(e) => updateRow(row.id, { quantity: e.target.value })} />
          </label>
          <label>
            <span style={{ fontSize: 11, opacity: 0.7, display: 'block', marginBottom: 4 }}>{t.colUnitPrice}</span>
            <input className="proxy-purchase-cell-input" type="number" min={0} step={0.01} value={row.unitPrice} onChange={(e) => updateRow(row.id, { unitPrice: e.target.value })} />
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
    if (rows.length <= ROWS_PER_PAGE) return null;
    const start = (listPage - 1) * ROWS_PER_PAGE + 1;
    const end = Math.min(listPage * ROWS_PER_PAGE, rows.length);
    const pageInfo =
      language === 'en'
        ? `Showing ${start}–${end} of ${rows.length}`
        : language === 'my'
          ? `${start}–${end} / ${rows.length}`
          : `第 ${start}–${end} 条，共 ${rows.length} 条`;

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
              exportBusy ? '…' : `📥 ${t.exportExcel}`,
              () => void handleExport(),
              'success',
              exportBusy,
            )}
            {actionBtn(
              isEmbedded ? `✕ ${t.close}` : t.backMetric,
              () => (isEmbedded ? onCloseEmbedded?.() : navigate('/admin/metric-management')),
              'ghost',
            )}
          </div>
        </header>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1.15fr',
            gap: 14,
            marginBottom: 16,
          }}
        >
          <div style={{ ...glassCard, padding: '16px 16px 14px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fde68a', marginBottom: 10, letterSpacing: '0.04em' }}>
              {t.proxyFee}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                className="proxy-purchase-cell-input"
                type="number"
                min={0}
                step={0.1}
                value={proxyFeePercent}
                onChange={(e) => setProxyFeePercent(e.target.value)}
                style={{ fontSize: 22, fontWeight: 800, textAlign: 'center', flex: 1 }}
              />
              <span style={{ fontSize: 18, fontWeight: 700, opacity: 0.75 }}>%</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {FEE_PRESETS.map((p) => (
                <button key={p} type="button" style={presetChip(Math.abs(feePctNum - p) < 0.01)} onClick={() => setProxyFeePercent(String(p))}>
                  {p}%
                </button>
              ))}
            </div>
          </div>

          <div style={{ ...glassCard, padding: '16px 16px 14px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#93c5fd', marginBottom: 10, letterSpacing: '0.04em' }}>
              {t.exchangeRate}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, opacity: 0.75 }}>1 RMB =</span>
              <input
                className="proxy-purchase-cell-input"
                type="number"
                min={0}
                step={1}
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
                style={{ fontSize: 22, fontWeight: 800, textAlign: 'center', width: 100, flex: '1 1 80px' }}
              />
              <span style={{ fontSize: 13, opacity: 0.75 }}>MMK</span>
            </div>
            <div style={{ fontSize: 11, opacity: 0.55, marginTop: 8 }}>{t.rateHint}</div>
          </div>

          <div
            style={{
              ...glassCard,
              padding: '16px 18px',
              background:
                'linear-gradient(135deg, rgba(234, 179, 8, 0.12) 0%, rgba(16, 185, 129, 0.1) 100%)',
              border: '1px solid rgba(250, 204, 21, 0.22)',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(253, 224, 71, 0.95)', marginBottom: 8 }}>
              {t.totalRmb}
            </div>
            <div style={{ fontSize: isMobile ? 28 : 32, fontWeight: 900, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
              ¥{grandTotalRmb.toFixed(2)}
            </div>
            <div
              style={{
                marginTop: 10,
                paddingTop: 10,
                borderTop: '1px solid rgba(148, 163, 184, 0.15)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: 8,
              }}
            >
              <span style={{ fontSize: 12, opacity: 0.75 }}>{t.totalMmk}</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#6ee7b7', fontVariantNumeric: 'tabular-nums' }}>
                {grandTotalMmk.toLocaleString()}
              </span>
            </div>
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
            {actionBtn(t.selectAll, selectAllExportable, 'ghost')}
            {actionBtn(t.selectNone, selectNoneExportable, 'ghost')}
            {actionBtn(t.clearAll, () => {
              if (!window.confirm(t.confirmClear)) return;
              setRows([newRow()]);
              setExportSelected({});
            }, 'danger')}
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

        {isMobile ? (
          <div>{paginatedRows.map((row, idx) => renderMobileCard(row, (listPage - 1) * ROWS_PER_PAGE + idx))}</div>
        ) : (
          <section style={{ ...glassCard, overflow: 'hidden', padding: 0 }}>
            <div
              className="proxy-purchase-table-scroll"
              style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}
            >
              <table style={{ width: '100%', minWidth: 1276, borderCollapse: 'separate', borderSpacing: 0, fontSize: 13 }}>
                <thead>
                  <tr>
                    <th colSpan={1} style={groupHeaderStyle('#94a3b8')}>{t.colExport}</th>
                    <th colSpan={5} style={groupHeaderStyle('#38bdf8')}>{t.groupCustomer}</th>
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
                        checked={allExportableSelected}
                        onChange={(e) => (e.target.checked ? selectAllExportable() : selectNoneExportable())}
                        title={t.selectAll}
                        style={{ width: 16, height: 16, accentColor: '#2dd4bf', cursor: 'pointer' }}
                      />
                    </th>
                    {[
                      t.colNo,
                      t.colCustomer,
                      t.colDate,
                      t.colAddress,
                      t.colPhone,
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
                          textAlign: i >= 9 && i <= 11 ? 'right' : 'left',
                          fontWeight: 700,
                          fontSize: 12,
                          whiteSpace: 'nowrap',
                          color: 'rgba(226, 232, 240, 0.95)',
                          borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
                          background: 'rgba(30, 41, 59, 0.98)',
                          ...(i === 3
                            ? { width: COL_ADDRESS_WIDTH, maxWidth: COL_ADDRESS_WIDTH }
                            : i === 5
                              ? { width: COL_PLATFORM_WIDTH, maxWidth: COL_PLATFORM_WIDTH }
                              : i === 6
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
                    const fee = calcProxyFee(unit, feePctNum);
                    const total = calcLineTotalRmb(unit, feePctNum);
                    const active = rowHasContent(row);
                    return (
                      <tr
                        key={row.id}
                        className="proxy-purchase-row"
                        style={{
                          borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
                          background: active
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
                        <td style={cellPad}><input className="proxy-purchase-cell-input" value={row.customerName} onChange={(e) => updateRow(row.id, { customerName: e.target.value })} placeholder="TSL" /></td>
                        <td style={cellPad}><input className="proxy-purchase-cell-input" type="date" value={row.orderDate} onChange={(e) => updateRow(row.id, { orderDate: e.target.value })} /></td>
                        <td style={{ ...cellPad, width: COL_ADDRESS_WIDTH, maxWidth: COL_ADDRESS_WIDTH }}><input className="proxy-purchase-cell-input" value={row.address} onChange={(e) => updateRow(row.id, { address: e.target.value })} placeholder="RUILI" /></td>
                        <td style={cellPad}><input className="proxy-purchase-cell-input" value={row.phone} onChange={(e) => updateRow(row.id, { phone: e.target.value })} /></td>
                        <td style={{ ...cellPad, width: COL_PLATFORM_WIDTH, maxWidth: COL_PLATFORM_WIDTH }}><input className="proxy-purchase-cell-input" list="proxy-platform-list" value={row.platform} onChange={(e) => updateRow(row.id, { platform: e.target.value })} placeholder="拼多多" /></td>
                        <td style={{ ...cellPad, minWidth: COL_PRODUCT_MIN_WIDTH, width: COL_PRODUCT_MIN_WIDTH }}><input className="proxy-purchase-cell-input" value={row.productName} onChange={(e) => updateRow(row.id, { productName: e.target.value })} /></td>
                        <td style={{ ...cellPad, width: 96 }}>{renderStatusSelect(row)}</td>
                        <td style={{ ...cellPad, width: 72 }}><input className="proxy-purchase-cell-input" type="number" min={0} value={row.quantity} onChange={(e) => updateRow(row.id, { quantity: e.target.value })} style={{ textAlign: 'center' }} /></td>
                        <td style={{ ...cellPad, width: 96 }}><input className="proxy-purchase-cell-input" type="number" min={0} step={0.01} value={row.unitPrice} onChange={(e) => updateRow(row.id, { unitPrice: e.target.value })} style={{ textAlign: 'right' }} /></td>
                        <td style={{ ...cellPad, textAlign: 'right' }}>{renderCalcPill(unit > 0 ? fee.toFixed(2) : '—', 'fee')}</td>
                        <td style={{ ...cellPad, textAlign: 'right' }}>{renderCalcPill(unit > 0 ? total.toFixed(2) : '—', 'total')}</td>
                        <td style={{ ...cellPad, width: 44, textAlign: 'center' }}>
                          <button
                            type="button"
                            aria-label={t.delete}
                            onClick={() => requestRemoveRow(row.id)}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 9,
                              border: '1px solid rgba(248, 113, 113, 0.32)',
                              background: 'rgba(127, 29, 29, 0.2)',
                              color: '#fca5a5',
                              cursor: 'pointer',
                              fontSize: 17,
                              lineHeight: 1,
                            }}
                          >
                            ×
                          </button>
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
                  const total = calcLineTotalRmb(unit, feePctNum);
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
