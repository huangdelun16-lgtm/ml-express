import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useResponsive } from '../hooks/useResponsive';
import {
  exportProxyQuoteExcel,
  rowHasQuoteContent,
  type ProxyQuoteRow,
} from '../utils/proxyQuoteExcel';

const STORAGE_KEY = 'ml_admin_proxy_quote_v1';

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function newRow(seed?: Partial<ProxyQuoteRow>): ProxyQuoteRow {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    quoteDate: seed?.quoteDate ?? todayIso(),
    productName: seed?.productName ?? '',
    productImageDataUrl: seed?.productImageDataUrl ?? '',
    productImageName: seed?.productImageName ?? '',
    quantity: seed?.quantity ?? '',
    unitPrice: seed?.unitPrice ?? '',
  };
}

type SavedDraft = {
  customerName: string;
  note: string;
  rows: ProxyQuoteRow[];
};

function loadDraft(): SavedDraft {
  if (typeof window === 'undefined') {
    return { customerName: '', note: '', rows: [newRow()] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { customerName: '', note: '', rows: [newRow()] };
    const parsed = JSON.parse(raw) as SavedDraft;
    const rows = Array.isArray(parsed.rows) && parsed.rows.length > 0
      ? parsed.rows.map((r) => newRow(r))
      : [newRow()];
    return {
      customerName: parsed.customerName ?? '',
      note: parsed.note ?? '',
      rows,
    };
  } catch {
    return { customerName: '', note: '', rows: [newRow()] };
  }
}

function saveDraft(draft: SavedDraft): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch (e) {
    console.warn('[proxy-quote] save draft failed', e);
  }
}

const DRAFT_SAVE_MS = 500;
const ROW_FIELD_SYNC_MS = 280;

type ProxyQuoteTableRowProps = {
  row: ProxyQuoteRow;
  index: number;
  rowCount: number;
  isDragging: boolean;
  isDropTarget: boolean;
  editingSeqId: string | null;
  editingSeqValue: string;
  colProduct: string;
  uploadImage: string;
  clearImage: string;
  deleteLabel: string;
  dragHandle: string;
  jumpSeq: string;
  onUpdateRow: (id: string, patch: Partial<ProxyQuoteRow>) => void;
  onRowDraft: (id: string, patch: Partial<ProxyQuoteRow>) => void;
  onDeleteRow: (id: string) => void;
  onImagePick: (rowId: string, file: File | null) => void;
  onDragStart: (rowId: string, event: React.DragEvent) => void;
  onDragEnd: () => void;
  onDragOver: (rowId: string, event: React.DragEvent) => void;
  onDragLeave: (rowId: string) => void;
  onDrop: (rowId: string, event: React.DragEvent) => void;
  onSeqEditStart: (rowId: string, currentIndex: number) => void;
  onSeqEditChange: (value: string) => void;
  onSeqEditCommit: (rowId: string, raw: string) => void;
  onSeqEditCancel: () => void;
};

const ProxyQuoteTableRow = React.memo(function ProxyQuoteTableRow({
  row,
  index,
  rowCount,
  isDragging,
  isDropTarget,
  editingSeqId,
  editingSeqValue,
  colProduct,
  uploadImage,
  clearImage,
  deleteLabel,
  dragHandle,
  jumpSeq,
  onUpdateRow,
  onRowDraft,
  onDeleteRow,
  onImagePick,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onSeqEditStart,
  onSeqEditChange,
  onSeqEditCommit,
  onSeqEditCancel,
}: ProxyQuoteTableRowProps) {
  const [productName, setProductName] = useState(row.productName);
  const [quantity, setQuantity] = useState(row.quantity);
  const [unitPrice, setUnitPrice] = useState(row.unitPrice);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPatchRef = useRef<Partial<ProxyQuoteRow>>({});

  useEffect(() => {
    setProductName(row.productName);
    setQuantity(row.quantity);
    setUnitPrice(row.unitPrice);
  }, [row.id, row.productName, row.quantity, row.unitPrice]);

  const flushFieldSync = useCallback(() => {
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
      syncTimerRef.current = null;
    }
    const patch = pendingPatchRef.current;
    pendingPatchRef.current = {};
    if (Object.keys(patch).length > 0) {
      onUpdateRow(row.id, patch);
    }
  }, [onUpdateRow, row.id]);

  const scheduleFieldSync = useCallback(
    (patch: Partial<ProxyQuoteRow>) => {
      onRowDraft(row.id, patch);
      pendingPatchRef.current = { ...pendingPatchRef.current, ...patch };
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(flushFieldSync, ROW_FIELD_SYNC_MS);
    },
    [flushFieldSync, onRowDraft, row.id],
  );

  useEffect(() => {
    return () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
      const patch = pendingPatchRef.current;
      pendingPatchRef.current = {};
      if (Object.keys(patch).length > 0) {
        onUpdateRow(row.id, patch);
      }
    };
  }, [onUpdateRow, row.id]);

  const lineTotal = round2(parseNum(quantity) * parseNum(unitPrice));

  return (
    <tr
      className={[
        isDragging ? 'proxy-quote-row-dragging' : '',
        isDropTarget ? 'proxy-quote-row-drop-target' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ borderTop: '1px solid rgba(148,163,184,0.12)' }}
      onDragOver={(e) => onDragOver(row.id, e)}
      onDragLeave={() => onDragLeave(row.id)}
      onDrop={(e) => onDrop(row.id, e)}
    >
      <td style={{ padding: '8px 4px', textAlign: 'center' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          <span
            className="proxy-quote-drag-handle"
            draggable
            title={dragHandle}
            aria-label={dragHandle}
            onDragStart={(e) => onDragStart(row.id, e)}
            onDragEnd={onDragEnd}
          >
            ⠿
          </span>
          {editingSeqId === row.id ? (
            <input
              className="proxy-quote-seq-input"
              type="number"
              min={1}
              max={rowCount}
              value={editingSeqValue}
              autoFocus
              aria-label={jumpSeq}
              onChange={(e) => onSeqEditChange(e.target.value)}
              onBlur={() => onSeqEditCommit(row.id, editingSeqValue)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onSeqEditCommit(row.id, editingSeqValue);
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  onSeqEditCancel();
                }
              }}
            />
          ) : (
            <button
              type="button"
              className="proxy-quote-seq-num"
              title={jumpSeq}
              aria-label={jumpSeq}
              onClick={() => onSeqEditStart(row.id, index)}
            >
              {index + 1}
            </button>
          )}
        </div>
      </td>
      <td style={{ padding: '8px 6px' }}>
        <input
          className="proxy-purchase-cell-input"
          type="date"
          value={row.quoteDate}
          onChange={(e) => onUpdateRow(row.id, { quoteDate: e.target.value })}
          style={{ padding: '6px 4px', fontSize: 12 }}
        />
      </td>
      <td style={{ padding: '8px 10px 8px 6px' }}>
        <input
          className="proxy-purchase-cell-input proxy-quote-product-input"
          value={productName}
          onChange={(e) => {
            const value = e.target.value;
            setProductName(value);
            scheduleFieldSync({ productName: value });
          }}
          onBlur={flushFieldSync}
          placeholder={colProduct}
        />
      </td>
      <td style={{ padding: '8px 4px', textAlign: 'center' }}>
        {row.productImageDataUrl ? (
          <img
            src={row.productImageDataUrl}
            alt=""
            style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, marginBottom: 6 }}
          />
        ) : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ cursor: 'pointer' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '5px 8px',
                borderRadius: 8,
                background: 'rgba(59,130,246,0.25)',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {uploadImage}
            </span>
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                e.target.value = '';
                void onImagePick(row.id, file);
              }}
            />
          </label>
          {row.productImageDataUrl ? (
            <button
              type="button"
              onClick={() => onUpdateRow(row.id, { productImageDataUrl: '', productImageName: '' })}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#fca5a5',
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              {clearImage}
            </button>
          ) : null}
        </div>
      </td>
      <td style={{ padding: '8px 4px' }}>
        <input
          className="proxy-purchase-cell-input proxy-quote-qty-input"
          inputMode="decimal"
          value={quantity}
          onChange={(e) => {
            const value = e.target.value;
            setQuantity(value);
            scheduleFieldSync({ quantity: value });
          }}
          onBlur={flushFieldSync}
        />
      </td>
      <td style={{ padding: '8px 4px' }}>
        <input
          className="proxy-purchase-cell-input proxy-quote-price-input"
          inputMode="decimal"
          value={unitPrice}
          onChange={(e) => {
            const value = e.target.value;
            setUnitPrice(value);
            scheduleFieldSync({ unitPrice: value });
          }}
          onBlur={flushFieldSync}
        />
      </td>
      <td
        style={{
          padding: '8px 8px 8px 4px',
          textAlign: 'right',
          fontWeight: 800,
          fontVariantNumeric: 'tabular-nums',
          fontSize: 13,
          whiteSpace: 'nowrap',
        }}
      >
        {lineTotal > 0 ? lineTotal.toFixed(2) : '—'}
      </td>
      <td style={{ padding: '8px 4px', textAlign: 'center' }}>
        <button
          type="button"
          onClick={() => onDeleteRow(row.id)}
          style={{
            padding: '5px 8px',
            borderRadius: 8,
            border: '1px solid rgba(248,113,113,0.35)',
            background: 'rgba(127,29,29,0.25)',
            color: '#fecaca',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          {deleteLabel}
        </button>
      </td>
    </tr>
  );
});

function parseNum(s: string): number {
  const n = parseFloat(String(s).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

async function readImageFile(file: File): Promise<{ dataUrl: string; name: string }> {
  if (!file.type.startsWith('image/')) throw new Error('not image');
  if (file.size > 3 * 1024 * 1024) throw new Error('too large');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '');
      if (!dataUrl.startsWith('data:image/')) {
        reject(new Error('bad image'));
        return;
      }
      resolve({ dataUrl, name: file.name });
    };
    reader.onerror = () => reject(new Error('read fail'));
    reader.readAsDataURL(file);
  });
}

const ProxyQuotePage: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { isMobile } = useResponsive();
  const [customerName, setCustomerName] = useState('');
  const [note, setNote] = useState('');
  const [rows, setRows] = useState<ProxyQuoteRow[]>([newRow()]);
  const [exportBusy, setExportBusy] = useState(false);
  const [dragRowId, setDragRowId] = useState<string | null>(null);
  const [dropRowId, setDropRowId] = useState<string | null>(null);
  const [editingSeqId, setEditingSeqId] = useState<string | null>(null);
  const [editingSeqValue, setEditingSeqValue] = useState('');

  useEffect(() => {
    const draft = loadDraft();
    setCustomerName(draft.customerName);
    setNote(draft.note);
    setRows(draft.rows);
  }, []);

  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const rowDraftPatchesRef = useRef<Map<string, Partial<ProxyQuoteRow>>>(new Map());

  useEffect(() => {
    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    draftSaveTimerRef.current = setTimeout(() => {
      saveDraft({ customerName, note, rows });
    }, DRAFT_SAVE_MS);
    return () => {
      if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    };
  }, [customerName, note, rows]);

  useEffect(() => {
    return () => {
      saveDraft({ customerName, note, rows: rowsRef.current });
    };
  }, [customerName, note]);

  useEffect(() => {
    const styleId = 'proxy-quote-page-styles';
    if (document.getElementById(styleId)) return;
    const el = document.createElement('style');
    el.id = styleId;
    el.textContent = `
      .proxy-purchase-root input:focus-visible,
      .proxy-purchase-root button:focus-visible {
        outline: 2px solid rgba(45, 212, 191, 0.85);
        outline-offset: 2px;
      }
      .proxy-purchase-table-scroll::-webkit-scrollbar { height: 10px; }
      .proxy-purchase-table-scroll::-webkit-scrollbar-track {
        background: rgba(15, 23, 42, 0.5);
        border-radius: 999px;
      }
      .proxy-purchase-table-scroll::-webkit-scrollbar-thumb {
        background: rgba(45, 212, 191, 0.45);
        border-radius: 999px;
      }
      .proxy-purchase-cell-input {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid rgba(148, 163, 184, 0.22);
        border-radius: 8px;
        padding: 7px 9px;
        background: rgba(15, 23, 42, 0.55);
        color: #f8fafc;
        font-size: 13px;
      }
      .proxy-purchase-cell-input:focus {
        border-color: rgba(45, 212, 191, 0.55);
        background: rgba(15, 23, 42, 0.82);
      }
      .proxy-quote-product-input {
        min-width: 0;
      }
      .proxy-quote-qty-input {
        max-width: 100%;
        padding: 7px 4px;
        text-align: center;
        font-variant-numeric: tabular-nums;
      }
      .proxy-quote-price-input {
        max-width: 100%;
        padding: 7px 6px;
        text-align: right;
        font-variant-numeric: tabular-nums;
      }
      .proxy-quote-table {
        table-layout: fixed;
        width: 100%;
      }
      .proxy-quote-table th,
      .proxy-quote-table td {
        overflow: hidden;
        vertical-align: middle;
      }
      .proxy-quote-drag-handle {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        border-radius: 6px;
        border: 1px solid rgba(148, 163, 184, 0.28);
        background: rgba(15, 23, 42, 0.65);
        color: #94a3b8;
        font-size: 13px;
        line-height: 1;
        cursor: grab;
        user-select: none;
        touch-action: none;
      }
      .proxy-quote-drag-handle:active {
        cursor: grabbing;
        border-color: rgba(45, 212, 191, 0.55);
        color: #99f6e4;
      }
      .proxy-quote-seq-num {
        min-width: 18px;
        padding: 0;
        border: none;
        background: transparent;
        color: #e2e8f0;
        font-size: 12px;
        font-weight: 800;
        line-height: 1.2;
        cursor: pointer;
        font-variant-numeric: tabular-nums;
      }
      .proxy-quote-seq-num:hover {
        color: #99f6e4;
      }
      .proxy-quote-seq-input {
        width: 36px;
        box-sizing: border-box;
        border: 1px solid rgba(45, 212, 191, 0.65);
        border-radius: 6px;
        padding: 2px 4px;
        background: rgba(15, 23, 42, 0.92);
        color: #f8fafc;
        font-size: 12px;
        font-weight: 800;
        text-align: center;
      }
      .proxy-quote-row-dragging {
        opacity: 0.42;
      }
      .proxy-quote-row-drop-target {
        box-shadow: inset 0 3px 0 #2dd4bf;
        background: rgba(45, 212, 191, 0.08);
      }
    `;
    document.head.appendChild(el);
    return () => {
      document.getElementById(styleId)?.remove();
    };
  }, []);

  const t = useMemo(
    () =>
      language === 'en'
        ? {
            kicker: 'ML Express · Admin',
            hubTitle: 'Metric management',
            draftsTabBtn: '📑 Import metric drafts',
            pricesTabBtn: '💲 Product prices',
            personalTabBtn: '🧾 Personal expenses',
            proxyTabBtn: '🛒 Proxy purchase',
            quoteTabBtn: '📋 Proxy quote sheet',
            title: 'Proxy purchase quote',
            subtitle: 'Build a customer quote table with photos, quantities and prices, then export Excel.',
            customer: 'Customer name',
            customerPh: 'For Excel header / filename',
            note: 'Remarks',
            notePh: 'Optional note on exported sheet',
            addRow: 'Add row',
            exportExcel: 'Export Excel',
            backMetric: 'Back to dashboard',
            colNo: '#',
            colDate: 'Date',
            colProduct: 'Product',
            colImage: 'Image',
            colQty: 'Qty',
            colPrice: 'Unit ¥',
            colTotal: 'Line ¥',
            colActions: 'Actions',
            uploadImage: 'Upload',
            clearImage: 'Clear',
            delete: 'Delete',
            exportNone: 'Add at least one product row before export.',
            exportFail: 'Excel export failed. Please retry.',
            imageTooLarge: 'Image must be under 3 MB.',
            imageFail: 'Could not read image.',
            total: 'Total ¥',
            rowCount: 'rows',
            dragHandle: 'Drag to reorder',
            jumpSeq: 'Click row # to jump',
            reorderTip: 'Drag ⠿ to reorder · click # to jump',
            clearAll: 'Clear all',
            confirmClearAll: 'Clear all rows, customer name and remarks? This cannot be undone.',
          }
        : language === 'my'
          ? {
              kicker: 'ML Express · Admin',
              hubTitle: 'မီတြခစီမံခန့်ခွဲမှု',
              draftsTabBtn: '📑 သွင်းကုန် မီတြိ မူကြမ်း',
              pricesTabBtn: '💲 ကုန်စျေးနှုန်း',
              personalTabBtn: '🧾 ကိုယ်ပိုင်ကုန်ကျစရိတ်',
              proxyTabBtn: '🛒 ကြားခံဝယ်ယူမှု',
              quoteTabBtn: '📋 Quote sheet',
              title: 'Proxy quote',
              subtitle: 'Customer quote table + Excel export.',
              customer: 'Customer',
              customerPh: 'Excel header',
              note: 'Note',
              notePh: 'Optional',
              addRow: 'Add row',
              exportExcel: 'Export Excel',
              backMetric: 'Back to dashboard',
              colNo: '#',
              colDate: 'Date',
              colProduct: 'Product',
              colImage: 'Image',
              colQty: 'Qty',
              colPrice: 'Unit ¥',
              colTotal: 'Line ¥',
              colActions: 'Actions',
              uploadImage: 'Upload',
              clearImage: 'Clear',
              delete: 'Delete',
              exportNone: 'Add rows first.',
              exportFail: 'Export failed.',
              imageTooLarge: 'Max 3 MB.',
              imageFail: 'Image error.',
              total: 'Total ¥',
              rowCount: 'rows',
              dragHandle: 'Drag',
              jumpSeq: 'Click # to jump',
              reorderTip: 'Drag ⠿ · click # to jump',
              clearAll: 'Clear all',
              confirmClearAll: 'Clear everything?',
            }
          : {
              kicker: 'ML Express · Admin',
              hubTitle: '指标管理',
              draftsTabBtn: '📑 进口指标草稿',
              pricesTabBtn: '💲 商品价格',
              personalTabBtn: '🧾 个人开销',
              proxyTabBtn: '🛒 代购',
              quoteTabBtn: '📋 代购报价表',
              title: '代购报价表',
              subtitle: '登记给客户看的代购报价：日期、货物名称、产品图片、个数、价格，一键导出 Excel。',
              customer: '客户名称',
              customerPh: '显示在 Excel 表头与文件名',
              note: '备注',
              notePh: '可选，会显示在导出表格副标题',
              addRow: '添加一行',
              exportExcel: '导出 Excel',
              backMetric: '返回控制台',
              colNo: '序',
              colDate: '日期',
              colProduct: '货物名称',
              colImage: '产品图片',
              colQty: '个数',
              colPrice: '单价 ¥',
              colTotal: '小计 ¥',
              colActions: '操作',
              uploadImage: '上传图片',
              clearImage: '清除',
              delete: '删除',
              exportNone: '请至少填写一行货物后再导出。',
              exportFail: 'Excel 导出失败，请重试。',
              imageTooLarge: '图片不能超过 3 MB。',
              imageFail: '无法读取图片，请换一张试试。',
              total: '合计 ¥',
              rowCount: '条',
              dragHandle: '按住拖动排序',
              jumpSeq: '点击序号可跳转到指定行',
              reorderTip: '拖动 ⠿ 任意排序 · 点击序号输入目标行号',
              clearAll: '全部清理',
              confirmClearAll: '确认清空全部报价行、客户名称和备注？此操作不可恢复。',
            },
    [language],
  );

  const getMergedRows = useCallback(
    () =>
      rowsRef.current.map((row) => {
        const patch = rowDraftPatchesRef.current.get(row.id);
        return patch ? { ...row, ...patch } : row;
      }),
    [],
  );

  const exportableRows = useMemo(() => getMergedRows().filter(rowHasQuoteContent), [rows, getMergedRows]);
  const grandTotal = useMemo(
    () => round2(exportableRows.reduce((sum, row) => sum + parseNum(row.quantity) * parseNum(row.unitPrice), 0)),
    [exportableRows],
  );

  const hubTabStyle = (active: boolean): React.CSSProperties => ({
    padding: '10px 18px',
    borderRadius: 12,
    border: active ? 'none' : '1px solid rgba(255,255,255,0.22)',
    background: active
      ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)'
      : 'rgba(255,255,255,0.06)',
    color: '#fff',
    cursor: active ? 'default' : 'pointer',
    fontWeight: active ? 700 : 600,
    fontSize: 13,
    boxShadow: active ? '0 6px 18px rgba(217, 119, 6, 0.35)' : 'none',
  });

  const updateRow = useCallback((id: string, patch: Partial<ProxyQuoteRow>) => {
    rowDraftPatchesRef.current.delete(id);
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }, []);

  const noteRowDraft = useCallback((id: string, patch: Partial<ProxyQuoteRow>) => {
    const prev = rowDraftPatchesRef.current.get(id) ?? {};
    rowDraftPatchesRef.current.set(id, { ...prev, ...patch });
  }, []);

  const deleteRow = useCallback((id: string) => {
    setRows((prev) => {
      const next = prev.filter((row) => row.id !== id);
      return next.length > 0 ? next : [newRow()];
    });
  }, []);

  const addRow = useCallback(() => {
    setRows((prev) => [newRow({ quoteDate: prev[0]?.quoteDate ?? todayIso() }), ...prev]);
  }, []);

  const moveRowToIndex = useCallback((id: string, targetIndex: number) => {
    setRows((prev) => {
      const fromIndex = prev.findIndex((row) => row.id === id);
      if (fromIndex < 0) return prev;
      const clamped = Math.max(0, Math.min(targetIndex, prev.length - 1));
      if (fromIndex === clamped) return prev;
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(clamped, 0, item);
      return next;
    });
  }, []);

  const reorderRows = useCallback((fromId: string, toId: string) => {
    if (fromId === toId) return;
    setRows((prev) => {
      const fromIndex = prev.findIndex((row) => row.id === fromId);
      const toIndex = prev.findIndex((row) => row.id === toId);
      if (fromIndex < 0 || toIndex < 0) return prev;
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  }, []);

  const commitSeqJump = useCallback(
    (rowId: string, raw: string) => {
      const target = parseInt(raw.trim(), 10);
      if (Number.isFinite(target) && target >= 1 && target <= rowsRef.current.length) {
        moveRowToIndex(rowId, target - 1);
      }
      setEditingSeqId(null);
      setEditingSeqValue('');
    },
    [moveRowToIndex],
  );

  const handleSeqEditStart = useCallback((rowId: string, currentIndex: number) => {
    setEditingSeqId(rowId);
    setEditingSeqValue(String(currentIndex + 1));
  }, []);

  const handleSeqEditCancel = useCallback(() => {
    setEditingSeqId(null);
    setEditingSeqValue('');
  }, []);

  const handleRowDragLeave = useCallback((rowId: string) => {
    setDropRowId((prev) => (prev === rowId ? null : prev));
  }, []);

  const handleRowDragStart = useCallback((rowId: string, event: React.DragEvent) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', rowId);
    setDragRowId(rowId);
  }, []);

  const handleRowDragEnd = useCallback(() => {
    setDragRowId(null);
    setDropRowId(null);
  }, []);

  const handleRowDragOver = useCallback((rowId: string, event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropRowId(rowId);
  }, []);

  const handleRowDrop = useCallback(
    (rowId: string, event: React.DragEvent) => {
      event.preventDefault();
      const fromId = event.dataTransfer.getData('text/plain');
      if (fromId) reorderRows(fromId, rowId);
      setDragRowId(null);
      setDropRowId(null);
    },
    [reorderRows],
  );

  const handleClearAll = useCallback(() => {
    if (!window.confirm(t.confirmClearAll)) return;
    rowDraftPatchesRef.current.clear();
    setCustomerName('');
    setNote('');
    setRows([newRow()]);
  }, [t.confirmClearAll]);

  const waitForPendingRowSync = useCallback(
    () =>
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, ROW_FIELD_SYNC_MS + 30);
      }),
    [],
  );

  const handleImagePick = useCallback(
    async (rowId: string, file: File | null) => {
      if (!file) return;
      try {
        const { dataUrl, name } = await readImageFile(file);
        updateRow(rowId, { productImageDataUrl: dataUrl, productImageName: name });
      } catch (e: unknown) {
        const msg = e instanceof Error && e.message === 'too large' ? t.imageTooLarge : t.imageFail;
        window.alert(msg);
      }
    },
    [t.imageFail, t.imageTooLarge, updateRow],
  );

  const handleExport = useCallback(async () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    await waitForPendingRowSync();
    const mergedRows = getMergedRows();
    const rowsToExport = mergedRows.filter(rowHasQuoteContent);
    if (rowsToExport.length === 0) {
      window.alert(t.exportNone);
      return;
    }
    setExportBusy(true);
    try {
      await exportProxyQuoteExcel({
        rows: rowsToExport,
        customerName: customerName.trim() || '客户',
        note: note.trim(),
      });
    } catch (e) {
      console.error(e);
      window.alert(t.exportFail);
    } finally {
      setExportBusy(false);
    }
  }, [customerName, getMergedRows, note, t.exportFail, t.exportNone, waitForPendingRowSync]);

  return (
    <div
      className="proxy-purchase-root"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(165deg, #0a0f1c 0%, #0f172a 28%, #134e4a 55%, #1e1b4b 100%)',
        padding: isMobile ? '14px 12px 96px' : '24px 20px 96px',
        color: '#fff',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      <div style={{ maxWidth: 1180, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
            marginBottom: 18,
            flexWrap: 'wrap',
            paddingBottom: 16,
            borderBottom: '1px solid rgba(148,163,184,0.12)',
          }}
        >
          <div style={{ flex: '1 1 300px', minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(148,163,184,0.88)' }}>
              {t.kicker}
            </div>
            <h2 style={{ margin: '8px 0 0', fontSize: isMobile ? '1.45rem' : '1.75rem', fontWeight: 800, color: '#f0fdfa' }}>
              {t.hubTitle}
            </h2>
            <div role="tablist" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
              <button type="button" style={hubTabStyle(false)} onClick={() => navigate('/admin/metric-management')}>
                {t.draftsTabBtn}
              </button>
              <button type="button" style={hubTabStyle(false)} onClick={() => navigate('/admin/metric-management?openPrice=1')}>
                {t.pricesTabBtn}
              </button>
              <button type="button" style={hubTabStyle(false)} onClick={() => navigate('/admin/metric-management?openPersonal=1')}>
                {t.personalTabBtn}
              </button>
              <button type="button" style={hubTabStyle(false)} onClick={() => navigate('/admin/proxy-purchase')}>
                {t.proxyTabBtn}
              </button>
              <button type="button" style={hubTabStyle(true)} aria-selected>
                {t.quoteTabBtn}
              </button>
            </div>
            <div style={{ marginTop: 14, fontSize: '1.1rem', fontWeight: 800 }}>{t.title}</div>
            <p style={{ margin: '8px 0 0', opacity: 0.88, fontSize: 13, lineHeight: 1.6, maxWidth: 720 }}>{t.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/admin/dashboard')}
            style={{
              flexShrink: 0,
              padding: '10px 16px',
              borderRadius: 11,
              border: '1px solid rgba(148,163,184,0.28)',
              background: 'rgba(255,255,255,0.06)',
              color: '#e2e8f0',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: 13,
              whiteSpace: 'nowrap',
            }}
          >
            {t.backMetric}
          </button>
        </header>

        <section
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 16,
            alignItems: 'flex-end',
          }}
        >
          <label style={{ display: 'block', flex: '1 1 220px', minWidth: 180 }}>
            <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.85 }}>{t.customer}</span>
            <input
              className="proxy-purchase-cell-input"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={t.customerPh}
              style={{ marginTop: 6 }}
            />
          </label>
          <label style={{ display: 'block', flex: '1 1 220px', minWidth: 180 }}>
            <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.85 }}>{t.note}</span>
            <input
              className="proxy-purchase-cell-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t.notePh}
              style={{ marginTop: 6 }}
            />
          </label>
          <button
            type="button"
            onClick={addRow}
            style={{
              padding: '10px 16px',
              borderRadius: 11,
              border: 'none',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: '#fff',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            + {t.addRow}
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            style={{
              padding: '10px 16px',
              borderRadius: 11,
              border: '1px solid rgba(248,113,113,0.35)',
              background: 'rgba(127,29,29,0.22)',
              color: '#fecaca',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            {t.clearAll}
          </button>
          <button
            type="button"
            disabled={exportBusy}
            onClick={() => void handleExport()}
            style={{
              padding: '10px 16px',
              borderRadius: 11,
              border: 'none',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#fff',
              fontWeight: 800,
              cursor: exportBusy ? 'wait' : 'pointer',
              opacity: exportBusy ? 0.75 : 1,
            }}
          >
            {exportBusy ? '…' : t.exportExcel}
          </button>
        </section>

        <div
          style={{
            marginBottom: 10,
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            fontSize: 13,
            color: '#cbd5e1',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span>
              {exportableRows.length} {t.rowCount}
            </span>
            <span style={{ fontSize: 12, opacity: 0.78 }}>{t.reorderTip}</span>
          </div>
          <span style={{ fontWeight: 800, color: '#6ee7b7' }}>
            {t.total}: {grandTotal.toFixed(2)}
          </span>
        </div>

        <div
          className="proxy-purchase-table-scroll"
          style={{ overflowX: 'auto', borderRadius: 14, border: '1px solid rgba(148,163,184,0.18)' }}
        >
          <table
            className="proxy-quote-table"
            style={{ minWidth: 960, borderCollapse: 'collapse', background: 'rgba(15,23,42,0.72)' }}
          >
            <colgroup>
              <col style={{ width: 58 }} />
              <col style={{ width: 118 }} />
              <col />
              <col style={{ width: 104 }} />
              <col style={{ width: 62 }} />
              <col style={{ width: 76 }} />
              <col style={{ width: 82 }} />
              <col style={{ width: 68 }} />
            </colgroup>
            <thead>
              <tr style={{ background: 'rgba(15,118,110,0.35)' }}>
                {[
                  { key: 'no', label: t.colNo, align: 'center' as const },
                  { key: 'date', label: t.colDate, align: 'center' as const },
                  { key: 'product', label: t.colProduct, align: 'left' as const },
                  { key: 'image', label: t.colImage, align: 'center' as const },
                  { key: 'qty', label: t.colQty, align: 'center' as const },
                  { key: 'price', label: t.colPrice, align: 'right' as const },
                  { key: 'total', label: t.colTotal, align: 'right' as const },
                  { key: 'actions', label: t.colActions, align: 'center' as const },
                ].map(({ key, label, align }) => (
                  <th
                    key={key}
                    style={{
                      padding: '10px 8px',
                      fontSize: 12,
                      textAlign: align,
                      fontWeight: 800,
                      whiteSpace: key === 'qty' || key === 'price' ? 'nowrap' : undefined,
                    }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <ProxyQuoteTableRow
                  key={row.id}
                  row={row}
                  index={idx}
                  rowCount={rows.length}
                  isDragging={dragRowId === row.id}
                  isDropTarget={dropRowId === row.id && dragRowId !== row.id}
                  editingSeqId={editingSeqId}
                  editingSeqValue={editingSeqValue}
                  colProduct={t.colProduct}
                  uploadImage={t.uploadImage}
                  clearImage={t.clearImage}
                  deleteLabel={t.delete}
                  dragHandle={t.dragHandle}
                  jumpSeq={t.jumpSeq}
                  onUpdateRow={updateRow}
                  onRowDraft={noteRowDraft}
                  onDeleteRow={deleteRow}
                  onImagePick={handleImagePick}
                  onDragStart={handleRowDragStart}
                  onDragEnd={handleRowDragEnd}
                  onDragOver={handleRowDragOver}
                  onDragLeave={handleRowDragLeave}
                  onDrop={handleRowDrop}
                  onSeqEditStart={handleSeqEditStart}
                  onSeqEditChange={setEditingSeqValue}
                  onSeqEditCommit={commitSeqJump}
                  onSeqEditCancel={handleSeqEditCancel}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProxyQuotePage;
