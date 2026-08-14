import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useResponsive } from '../hooks/useResponsive';
import { importMetricDraftService } from '../services/supabase';
import { isAbortLikeError } from '../utils/fetchError';
import {
  importMetricDbRowToSaved,
  type ImportMetricDraftSaved,
  type SavedLineItem,
} from './ImportMetricDraftsPage';
import { parseLicenceFile, type ParsedLicenceLine } from '../utils/importLicenceParse';
import { feedbackService } from '../services/FeedbackService';

type FlatRow = {
  rowKey: string;
  registerNo: string;
  hsCode: string;
  cargoDesc: string;
  unitCode: string;
  unitPrice: string;
  currency: string;
  source: string;
  updatedAt: string;
};

function isLineBlank(li: SavedLineItem): boolean {
  const noCargo = !li.cargoDesc?.trim() && !li.myanmarDesc?.trim();
  const noHs = !li.hsCode?.trim();
  const noQty = !li.quantity?.trim() || Number.parseFloat(String(li.quantity).replace(/,/g, '')) === 0;
  const noPrice = !li.unitPrice?.trim() || Number.parseFloat(String(li.unitPrice).replace(/,/g, '')) === 0;
  return noCargo && noHs && noQty && noPrice;
}

function flattenDraftsToRows(drafts: ImportMetricDraftSaved[]): FlatRow[] {
  const out: FlatRow[] = [];
  drafts.forEach((d) => {
    d.lineItems.forEach((li, idx) => {
      if (isLineBlank(li)) return;
      out.push({
        rowKey: `${d.id}_${idx}`,
        registerNo: d.registerNo?.trim() || '—',
        hsCode: li.hsCode?.trim() || '—',
        cargoDesc:
          li.cargoDesc?.trim() ||
          li.myanmarDesc?.trim() ||
          '—',
        unitCode: li.unitCode?.trim() || '—',
        unitPrice: li.unitPrice?.trim() || '—',
        currency: li.currency?.trim() || 'USD',
        source: `草稿${d.customerName?.trim() ? ` · ${d.customerName.trim()}` : ''}`,
        updatedAt: d.savedAt,
      });
    });
  });
  return out;
}

function formatRowTime(iso: string, locale: string): string {
  if (!iso) return '—';
  const t = new Date(iso);
  return Number.isFinite(t.getTime()) ? t.toLocaleString(locale) : '—';
}

function normalizeRegisterKey(s: string): string {
  return s.replace(/\s+/g, ' ').trim().toUpperCase().replace(/[.,;:]+$/g, '');
}

function collectRegisterKeys(rows: FlatRow[]): Set<string> {
  const out = new Set<string>();
  rows.forEach((r) => {
    const k = normalizeRegisterKey(r.registerNo);
    if (k && k !== '—') out.add(k);
  });
  return out;
}

function parsedToFlatRows(parsed: ParsedLicenceLine[]): FlatRow[] {
  const now = new Date().toISOString();
  return parsed.map((p, idx) => ({
    rowKey: `lic_${now}_${idx}_${Math.random().toString(36).slice(2, 9)}`,
    registerNo: p.registerNo?.trim() || '—',
    hsCode: p.hsCode?.trim() || '—',
    cargoDesc: p.cargoDesc?.trim() || '—',
    unitCode: p.unitCode?.trim() || '—',
    unitPrice: p.unitPrice?.trim() || '—',
    currency: p.currency?.trim() || 'USD',
    source: '证照解析',
    updatedAt: now,
  }));
}

export type ImportPriceListPageProps = {
  /** page：独立路由全屏；embedded：在指标管理弹层内展示 */
  variant?: 'page' | 'embedded';
  onCloseEmbedded?: () => void;
};

const ImportPriceListPage: React.FC<ImportPriceListPageProps> = ({
  variant = 'page',
  onCloseEmbedded,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const { isMobile } = useResponsive();
  const isEmbedded = variant === 'embedded';
  const [cargoFilter, setCargoFilter] = useState('');
  const [dbDrafts, setDbDrafts] = useState<ImportMetricDraftSaved[]>([]);
  const [licenceRows, setLicenceRows] = useState<FlatRow[]>([]);
  const [parseBusy, setParseBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const locale = language === 'en' ? 'en-US' : language === 'my' ? 'my-MM' : 'zh-CN';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await importMetricDraftService.listAll();
        if (cancelled) return;
        setDbDrafts(rows.map(importMetricDbRowToSaved));
      } catch (e) {
        if (cancelled || isAbortLikeError(e)) return;
        setDbDrafts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location.key, location.pathname, isEmbedded]);

  const t =
    language === 'en'
      ? {
          title: 'Import price list',
          subtitle:
            'Auto-aggregates saved cargo lines from «Import metric drafts». You may also upload IMPORT LICENCE as PDF/PNG; after parsing they merge with draft data. The same Register No. is not imported twice.',
          searchLabel: 'Cargo Description filter',
          searchPlaceholder: 'Type keywords to filter by English product name…',
          uploadNote:
            'PNG and PDF supported; PDF text extraction runs first, then first-page OCR if needed (loads recognition engine online).',
          count: (n: number) => `${n} row(s)`,
          uploadBtn: 'Upload & parse licence',
          parsing: 'Parsing…',
          parseFail: 'Could not parse this file. Try a clearer scan or PDF with selectable text.',
          parseEmpty: 'No line items were extracted. Please check layout and try again.',
          parseDup:
            'This Register No. is already in the table (draft or parsed). Duplicates are not imported again.',
          parseOk: (n: number) => `Imported ${n} row(s) from licence.`,
          colReg: 'REGISTER NO.',
          colHs: 'H.S CODE',
          colCargo: 'CARGO DESCRIPTION (filter above)',
          colUnit: 'UNIT CODE',
          colPrice: 'SET PRICE',
          colCur: 'Currency',
          colSrc: 'Source / Updated',
          empty:
            'No data. Save drafts with line items under «Import metric drafts», or use «Upload & parse licence» for IMPORT LICENCE.',
          back: 'Dashboard',
          close: 'Close',
          footerNote:
            'Blank product lines are omitted from draft summaries. Parsing quality depends on layout and clarity—please verify. Duplicate Register No. will show «already uploaded» and will not be written twice.',
        }
      : language === 'my'
        ? {
            title: 'သွင်းကုန်စျေးနှုန်းဇယား',
            subtitle:
              '「သွင်းကုန် မီတြိ မူကြမ်း」မှ သိမ်းထားသောကုန်ကြောင်းများကို အလိုအလျောက် စုသည်။ IMPORT LICENCE PDF/PNG လည်းတင်နိုင်သည်။ Register No. တူမထပ်သွင်း။',
            searchLabel: 'ကုန်ပစ္စည်းဖော်ပြချက် စစ်ထုတ်ရန်',
            searchPlaceholder: 'အင်္ဂလိပ်အမည်ဖြင့် ရှာရန်…',
            uploadNote: 'PNG၊ PDF — PDF စာဖတ်ပြီး မရရင် OCR (အင်တာနက် လိုအပ်)။',
            count: (n: number) => `စုစုပေါင်း ${n} ကြောင်း`,
            uploadBtn: 'လိုင်စင်တင်၍ ခွဲခြမ်းရန်',
            parsing: 'ခွဲခြမ်းနေသည်…',
            parseFail: 'ဖိုင်မဖတ်ရပါ။',
            parseEmpty: 'ကြောင်းမထွက်ပါ။',
            parseDup: 'Register No. ရှိပြီးသား — မထပ်သွင်းပါ။',
            parseOk: (n: number) => `လိုင်စင်မှ ${n} ကြောင်း ထည့်သွင်းပြီး။`,
            colReg: 'REGISTER NO.',
            colHs: 'H.S CODE',
            colCargo: 'CARGO DESCRIPTION',
            colUnit: 'UNIT CODE',
            colPrice: 'SET PRICE',
            colCur: 'ငွေကြေး',
            colSrc: 'ရင်းမြစ် / နောက်ဆုံးပြင်',
            empty: 'ဒေတာမရှိပါ။ မူကြမ်းသို့ မှတ်တမ်းသိမ်းပါ။',
            back: 'ဒါဘုတ်',
            close: 'ပိတ်မည်',
            footerNote:
              'အလွတ်ကြမ်းများမပါ။ ခွဲခြမ်းမှုကို လူသားစိစစ်ရန် လိုအပ်သည်။ Register No. တူပါက ထပ်မရေးပါ။',
          }
        : {
            title: '进口价格表',
            subtitle:
              '自动汇总「进口指标草稿」已保存的货物行；亦可上传 IMPORT LICENCE 的 PDF / PNG，解析后与草稿数据合并。同一 Register No. 不会重复导入。',
            searchLabel: '货物名称筛选 · Cargo Description',
            searchPlaceholder: '输入关键字，按英文品名快速查找…',
            uploadNote:
              '支持 PNG 与 PDF；PDF 会先抽取文字，失败时再对首页 OCR（需联网加载识别引擎）。',
            count: (n: number) => `共 ${n} 条`,
            uploadBtn: '上传证照解析',
            parsing: '正在解析…',
            parseFail: '解析失败，请换清晰的扫描件或可选中文字的 PDF。',
            parseEmpty: '未能识别出货品行，请核对版式后重试。',
            parseDup: '该 Register No. 已在表中（草稿或已解析证照），不会重复导入。',
            parseOk: (n: number) => `已从证照导入 ${n} 条。`,
            colReg: 'REGISTER NO.',
            colHs: 'H.S CODE',
            colCargo: 'CARGO DESCRIPTION（支持上方关键字筛选）',
            colUnit: 'UNIT CODE',
            colPrice: 'SET PRICE',
            colCur: '币种',
            colSrc: '来源 / 更新时间',
            empty:
              '暂无数据。请在「进口指标草稿」保存含明细的记录，或使用「上传证照解析」导入 IMPORT LICENCE。',
            back: '控制台',
            close: '关闭',
            footerNote:
              '说明：完全空白的商品行不会出现在草稿汇总中；证照解析依赖版式与清晰度，识别后请人工核对。若解析出的 Register No. 与表中已有记录相同，将提示「此单已上传」且不会重复写入。',
          };

  const draftRows = useMemo(() => flattenDraftsToRows(dbDrafts), [dbDrafts]);
  const allRows = useMemo(() => [...draftRows, ...licenceRows], [draftRows, licenceRows]);

  const blockedRegisterKeys = useMemo(() => {
    const s = collectRegisterKeys(draftRows);
    collectRegisterKeys(licenceRows).forEach((k) => s.add(k));
    return s;
  }, [draftRows, licenceRows]);

  const handleLicenceFile = async (file: File | undefined) => {
    if (!file) return;
    setParseBusy(true);
    try {
      const parsed = await parseLicenceFile(file);
      if (!parsed.length) {
        feedbackService.notify(t.parseEmpty);
        return;
      }
      const regKeys = new Set(
        parsed
          .map((p) => normalizeRegisterKey(p.registerNo))
          .filter((k) => k && k !== '—'),
      );
      for (const key of Array.from(regKeys)) {
        if (blockedRegisterKeys.has(key)) {
          feedbackService.notify(t.parseDup);
          return;
        }
      }
      const next = parsedToFlatRows(parsed);
      setLicenceRows((prev) => [...prev, ...next]);
      feedbackService.notify(t.parseOk(next.length));
    } catch {
      feedbackService.notify(t.parseFail);
    } finally {
      setParseBusy(false);
    }
  };

  const filteredRows = useMemo(() => {
    const q = cargoFilter.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter((r) => r.cargoDesc.toLowerCase().includes(q));
  }, [allRows, cargoFilter]);

  return (
    <div
      style={{
        minHeight: isEmbedded ? undefined : '100vh',
        background: isEmbedded
          ? 'transparent'
          : 'linear-gradient(160deg, #0f172a 0%, #1e3a5f 40%, #1a1740 100%)',
        padding: isEmbedded
          ? isMobile
            ? '8px 10px 20px'
            : '12px 16px 24px'
          : isMobile
            ? '14px 12px 96px'
            : '24px 20px 96px',
        color: '#f8fafc',
        fontFamily:
          "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Segoe UI', system-ui, sans-serif",
        boxSizing: 'border-box',
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,image/png,image/jpeg,application/pdf"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          const reset = () => {
            if (fileInputRef.current) fileInputRef.current.value = '';
          };
          void (async () => {
            await handleLicenceFile(f);
            reset();
          })();
        }}
      />

      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <header style={{ marginBottom: 22 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ flex: '1 1 320px', minWidth: 0 }}>
              <h1 style={{ margin: 0, fontSize: isMobile ? '1.42rem' : '1.85rem', fontWeight: 800 }}>{t.title}</h1>
              <p
                style={{
                  margin: '12px 0 0',
                  opacity: 0.88,
                  fontSize: isMobile ? 13 : 14,
                  lineHeight: 1.65,
                  maxWidth: 900,
                }}
              >
                {t.subtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={() => (isEmbedded ? onCloseEmbedded?.() : navigate('/admin/dashboard'))}
              style={{
                padding: '10px 18px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.28)',
                background: 'rgba(255,255,255,0.06)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              {isEmbedded ? `✕ ${t.close}` : `← ${t.back}`}
            </button>
          </div>
        </header>

        <section
          style={{
            background: 'rgba(15, 23, 42, 0.5)',
            borderRadius: 16,
            border: '1px solid rgba(148, 163, 184, 0.16)',
            padding: isMobile ? '14px 14px 16px' : '18px 20px 20px',
            marginBottom: 16,
          }}
        >
          <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, opacity: 0.92 }}>
            {t.searchLabel}
          </label>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              borderRadius: 12,
              border: '1px solid rgba(96, 165, 250, 0.28)',
              background: 'rgba(15, 23, 42, 0.65)',
              maxWidth: 560,
            }}
          >
            <input
              type="search"
              value={cargoFilter}
              onChange={(e) => setCargoFilter(e.target.value)}
              placeholder={t.searchPlaceholder}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                color: '#f1f5f9',
                fontSize: 14,
                outline: 'none',
                minWidth: 0,
              }}
            />
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 12, opacity: 0.68, lineHeight: 1.55 }}>{t.uploadNote}</p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              marginTop: 16,
              paddingTop: 14,
              borderTop: '1px solid rgba(148, 163, 184, 0.14)',
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: '#93c5fd' }}>{t.count(filteredRows.length)}</span>
            <button
              type="button"
              disabled={parseBusy}
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '10px 20px',
                borderRadius: 12,
                border: 'none',
                background: parseBusy
                  ? 'rgba(59, 130, 246, 0.45)'
                  : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: '#fff',
                cursor: parseBusy ? 'wait' : 'pointer',
                fontWeight: 700,
                fontSize: 14,
                boxShadow: parseBusy ? 'none' : '0 8px 24px rgba(37, 99, 235, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {parseBusy ? t.parsing : t.uploadBtn}
            </button>
          </div>
        </section>

        <section
          style={{
            background: 'rgba(15, 23, 42, 0.45)',
            borderRadius: 16,
            border: '1px solid rgba(148, 163, 184, 0.15)',
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 13,
                minWidth: 880,
              }}
            >
              <thead>
                <tr
                  style={{
                    background: 'rgba(30, 41, 59, 0.88)',
                    borderBottom: '1px solid rgba(148, 163, 184, 0.22)',
                  }}
                >
                  {[t.colReg, t.colHs, t.colCargo, t.colUnit, t.colPrice, t.colCur, t.colSrc].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left',
                        padding: '14px 14px',
                        fontWeight: 700,
                        letterSpacing: h === t.colReg ? '0.04em' : 'normal',
                        fontSize: h === t.colReg ? 12 : h === t.colHs ? 12 : 13,
                        color: 'rgba(248, 250, 252, 0.9)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        padding: '48px 20px',
                        textAlign: 'center',
                        color: 'rgba(226, 232, 240, 0.72)',
                        fontSize: 14,
                        lineHeight: 1.6,
                      }}
                    >
                      {t.empty}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r, i) => (
                    <tr
                      key={r.rowKey}
                      style={{
                        background: i % 2 === 0 ? 'rgba(15, 23, 42, 0.35)' : 'transparent',
                        borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                        verticalAlign: 'top',
                      }}
                    >
                      <td style={{ padding: '12px 14px', color: '#e2e8f0', whiteSpace: 'nowrap' }}>{r.registerNo}</td>
                      <td style={{ padding: '12px 14px', color: '#cbd5e1' }}>{r.hsCode}</td>
                      <td style={{ padding: '12px 14px', color: '#e2e8f0', maxWidth: 320, wordBreak: 'break-word' }}>
                        {r.cargoDesc}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#93c5fd', fontWeight: 600 }}>{r.unitCode}</td>
                      <td style={{ padding: '12px 14px', color: '#e2e8f0' }}>{r.unitPrice}</td>
                      <td style={{ padding: '12px 14px', color: '#a5b4fc' }}>{r.currency}</td>
                      <td style={{ padding: '12px 14px', color: 'rgba(203, 213, 225, 0.92)', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {r.source}
                        <br />
                        <span style={{ opacity: 0.75 }}>{formatRowTime(r.updatedAt, locale)}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <p
          style={{
            margin: '16px 0 0',
            fontSize: 12,
            opacity: 0.68,
            lineHeight: 1.65,
            maxWidth: 1020,
          }}
        >
          {t.footerNote}
        </p>
      </div>
    </div>
  );
};

export default ImportPriceListPage;
