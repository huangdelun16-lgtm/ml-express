import { FC, Fragment, useEffect, useMemo, useState } from 'react';
import DualMoney, { formatMmK } from './DualMoney';
import { formatCnyAmount } from '../utils/crossBorderFx';
import {
  fetchExportCostRecords,
  saveAdminExportCost,
  voidAdminExportCost,
  type ExportCostRecord,
  type FinancePeriodParams,
  type InventoryTransitStore,
  type PendingExportBoard,
  type PendingExportLine,
} from '../services/inventoryConsoleService';

type Props = {
  isEn: boolean;
  period: FinancePeriodParams;
  stores: InventoryTransitStore[];
  rate: number | null;
  onTotal?: (totalCny: number | null) => void;
};

function exportCostMoney(row: ExportCostRecord) {
  const mmkSettle = String(row.pay_currency || '').toUpperCase() === 'MMK';
  const cny = mmkSettle ? 0 : Number(row.total_cny) || 0;
  const mmk = mmkSettle ? Math.round(Number(row.total_mmk) || 0) : 0;
  return <DualMoney cny={cny} mmk={mmk} rate={null} prefix={cny > 0 || mmk > 0 ? '−' : ''} />;
}

function exportCostBarAmount(value: number, kind: 'cny' | 'mmk'): string {
  const text = kind === 'cny' ? formatCnyAmount(value) : formatMmK(value);
  return value > 0 ? `−${text}` : text;
}

function money(value: number | string | null | undefined): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  const rounded = Math.round(n * 100) / 100;
  return rounded % 1 === 0
    ? rounded.toLocaleString('en-US')
    : rounded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function legLabel(code: string): string {
  const dest = String(code || '').trim().toUpperCase();
  if (dest === 'RUI' || dest === 'RUILI') return '瑞丽';
  if (dest === 'MSE' || dest === 'MUSE') return '木姐';
  if (dest === 'LSO') return '腊戌';
  return dest || '—';
}

function kindLabel(kind: string, isEn: boolean): string {
  if (kind === 'package') return isEn ? 'Multiple inbound' : '多个入库';
  if (kind === 'single') return isEn ? 'Single inbound' : '单个入库';
  return kind || '—';
}

function friendlyExportCostError(message: string, isEn: boolean): string {
  if (message === 'MISSING_EXPORT_COST_API') {
    return isEn
      ? 'Export cost records are not published yet. They will show here after the admin site is deployed.'
      : '出口成本记录还没发布到线上。部署后台之后，库存 App 里添加过的订单会显示在这里。';
  }
  if (/socket|tls|econn|timeout|fetch failed|disconnected|网络/i.test(message)) {
    return isEn ? 'Could not reach the server. Try again.' : '暂时连不上，请再试一次。';
  }
  return message || (isEn ? 'Could not load export costs' : '出口成本加载失败');
}

function exportCostFormError(
  input: { leg: string; currency: string; price: string; fx: string },
  isEn: boolean,
): string {
  if (!input.leg || !input.currency) {
    return isEn ? 'Choose the destination and the currency first.' : '请先选择运达和实付币种。';
  }
  if (input.price.trim() === '' || !Number.isFinite(Number(input.price)) || Number(input.price) < 0) {
    return isEn ? 'Enter the unit price. 0 can be saved.' : '请填写单价。填 0 也可以保存。';
  }
  if (input.currency === 'MMK' && (!input.fx.trim() || !Number.isFinite(Number(input.fx)) || Number(input.fx) <= 0)) {
    return isEn ? 'Enter the MMK per CNY rate.' : '实付缅币时请填写汇率。';
  }
  return '';
}

function whenLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('zh-CN', { hour12: false });
}

const ExportCostRecordsCard: FC<Props> = ({ isEn, period, stores, rate, onTotal }) => {
  const [rows, setRows] = useState<ExportCostRecord[]>([]);
  const [pending, setPending] = useState<PendingExportBoard | null>(null);
  const [pendingNote, setPendingNote] = useState('');
  const [totalCny, setTotalCny] = useState(0);
  const [totalMmk, setTotalMmk] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [retryTick, setRetryTick] = useState(0);
  const [openKey, setOpenKey] = useState('');
  const [leg, setLeg] = useState<'MSE' | 'LSO' | ''>('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState<'CNY' | 'MMK' | ''>('');
  const [fx, setFx] = useState('');
  const [savingKey, setSavingKey] = useState('');
  const [saveNotice, setSaveNotice] = useState<{ ok: boolean; title: string; text: string } | null>(null);
  const [voidTarget, setVoidTarget] = useState<ExportCostRecord | null>(null);
  const [voiding, setVoiding] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [batchLeg, setBatchLeg] = useState<'MSE' | 'LSO' | ''>('');
  const [batchPrice, setBatchPrice] = useState('');
  const [batchCurrency, setBatchCurrency] = useState<'CNY' | 'MMK' | ''>('');
  const [batchFx, setBatchFx] = useState('');
  const [batchSaving, setBatchSaving] = useState(false);
  const storeName = useMemo(() => {
    const map = new Map(
      stores.map((store) => [store.store_code.trim().toUpperCase(), store.store_name]),
    );
    return (code: string) => map.get(code.trim().toUpperCase()) || '';
  }, [stores]);

  useEffect(() => {
    if (rate && rate > 0) setBatchFx((current) => current || String(rate));
  }, [rate]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    if (!debouncedQuery) {
      setLoading(true);
      setError('');
    } else {
      setSearching(true);
    }
    void fetchExportCostRecords(period, debouncedQuery)
      .then((result) => {
        if (cancelled) return;
        setRows(result.rows);
        setPending(result.pending);
        setPendingNote(result.pendingNote);
        setTotalCny(result.totalCny);
        setTotalMmk(result.totalMmk);
        onTotal?.(result.totalCny);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : '';
        setRows([]);
        setPending(null);
        setPendingNote('');
        setTotalCny(0);
        setTotalMmk(0);
        onTotal?.(null);
        setError(friendlyExportCostError(message, isEn));
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setSearching(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [period, isEn, onTotal, retryTick, debouncedQuery]);

  const paidWeightKg = useMemo(
    () => rows.reduce((sum, row) => sum + (Number(row.weight_kg) || 0), 0),
    [rows],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [
        row.display_barcode,
        row.customer_name,
        row.final_destination,
        row.leg_destination,
        row.trip_number,
        row.pack_barcode,
        row.store_code,
        kindLabel(row.subject_kind, false),
      ]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [query, rows]);

  const pendingRows = useMemo(() => {
    if (!pending) return [];
    const q = query.trim().toLowerCase();
    const lines: Array<PendingExportLine & { kind: 'single' | 'package'; key: string }> = [
      ...pending.singles.map((row) => ({ ...row, kind: 'single' as const, key: `s:${row.id || row.barcode}` })),
      ...pending.packages.map((row) => ({ ...row, kind: 'package' as const, key: `p:${row.base}` })),
    ];
    if (!q) return lines;
    return lines.filter((row) =>
      [row.barcode, row.base, row.packBarcode, ...(row.orderBarcodes || []), row.customer, row.destination, row.tripNumber]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [pending, query]);

  const fillableKeys = useMemo(
    () => pendingRows.filter((row) => Number(row.weightKg) > 0).map((row) => row.key),
    [pendingRows],
  );
  const pickedKeys = useMemo(
    () => picked.filter((key) => fillableKeys.includes(key)),
    [picked, fillableKeys],
  );
  const allFillablePicked = fillableKeys.length > 0 && fillableKeys.every((key) => pickedKeys.includes(key));

  const saveBatch = () => {
    if (batchSaving || savingKey) return;
    const problem = exportCostFormError(
      { leg: batchLeg, currency: batchCurrency, price: batchPrice, fx: batchFx },
      isEn,
    );
    if (problem) {
      setSaveNotice({ ok: false, title: isEn ? 'Not saved' : '保存失败', text: problem });
      return;
    }
    const targets = pendingRows.filter((row) => pickedKeys.includes(row.key));
    if (targets.length === 0) {
      setSaveNotice({
        ok: false,
        title: isEn ? 'Not saved' : '保存失败',
        text: isEn ? 'Select the orders to fill.' : '请先勾选要填写的订单。',
      });
      return;
    }
    setBatchSaving(true);
    void (async () => {
      const failed: string[] = [];
      const done: string[] = [];
      for (const row of targets) {
        const subjectKey = row.kind === 'package' ? row.base || '' : row.id || '';
        const label = row.kind === 'package' ? row.base || row.barcode || row.key : row.barcode || row.key;
        if (!subjectKey) {
          failed.push(`${label}: ${isEn ? 'Missing order id' : '缺少单号'}`);
          continue;
        }
        try {
          await saveAdminExportCost({
            subjectKind: row.kind,
            subjectKey,
            displayBarcode: row.kind === 'package' ? row.base || '' : row.barcode || '',
            customerName: row.customer,
            finalDestination: row.destination,
            legDestination: batchLeg as 'MSE' | 'LSO',
            weightKg: Number(row.weightKg),
            unitPriceCny: Number(batchPrice),
            payCurrency: batchCurrency as 'CNY' | 'MMK',
            mmkPerCny: batchCurrency === 'MMK' ? Number(batchFx) : null,
            tripNumber: row.tripNumber,
            storeCode: row.ownerStoreCode,
            packBarcode: row.packBarcode,
          });
          done.push(row.key);
        } catch (err: unknown) {
          const raw = err instanceof Error ? err.message : '';
          failed.push(`${label}: ${raw ? friendlyExportCostError(raw, isEn) : isEn ? 'Save failed' : '保存失败'}`);
        }
      }
      setPicked((current) => current.filter((key) => !done.includes(key)));
      if (done.length > 0) setRetryTick((n) => n + 1);
      if (failed.length === 0) {
        setSaveNotice({
          ok: true,
          title: isEn ? 'Saved' : '保存成功',
          text: isEn
            ? `Saved export cost for ${done.length} orders.`
            : `已批量保存 ${done.length} 单的出口成本。`,
        });
      } else if (done.length === 0) {
        setSaveNotice({
          ok: false,
          title: isEn ? 'Not saved' : '保存失败',
          text: failed.slice(0, 5).join('\n'),
        });
      } else {
        setSaveNotice({
          ok: false,
          title: isEn ? 'Partly saved' : '部分保存',
          text: isEn
            ? `Saved ${done.length}. Failed ${failed.length}.\n${failed.slice(0, 5).join('\n')}`
            : `已保存 ${done.length} 单，失败 ${failed.length} 单。\n${failed.slice(0, 5).join('\n')}`,
        });
      }
      setBatchSaving(false);
    })();
  };

  const confirmVoid = () => {
    if (!voidTarget || voiding) return;
    const id = voidTarget.id;
    setVoiding(true);
    void voidAdminExportCost(id)
      .then(() => {
        setVoidTarget(null);
        setRetryTick((n) => n + 1);
        setSaveNotice({
          ok: true,
          title: isEn ? 'Voided' : '已作废',
          text: isEn
            ? 'This export cost left the period total. Fill it again from the list above.'
            : '这笔出口成本不再计入本期。可以在上面的待填里重新记一笔。',
        });
      })
      .catch((err: unknown) => {
        const raw = err instanceof Error ? err.message : '';
        setSaveNotice({
          ok: false,
          title: isEn ? 'Not voided' : '作废失败',
          text: raw || (isEn ? 'Could not void this row.' : '作废没有完成，请再试一次。'),
        });
      })
      .finally(() => setVoiding(false));
  };

  return (
    <section className="cbl-card cbl-export-cost">
      <div className="cbl-card__head">
        <div className="cbl-export-cost__heading">
          <h2 className="cbl-card__title">{isEn ? 'Export cost' : '出口成本'}</h2>
          <p className="cbl-card-hint cbl-card-hint--in-head">
            {isEn
              ? 'Unfilled orders are above. A saved row can be voided and filled again. The old amount leaves this period and is not edited.'
              : '还没填的单在上面。已保存的记录可以作废，作废后回到待填再记一笔。原来的金额不再计入，数字本身不会被改写。'}
          </p>
        </div>
        <input
          className="cbl-export-cost__search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={isEn ? 'Barcode, customer, trip, pack no.' : '搜单号、客户、车次、包装号'}
          aria-label={isEn ? 'Search export costs' : '搜索出口成本'}
        />
      </div>
      <div className="cbl-card__body">
        <div className="cbl-export-pending">
          <div className="cbl-export-pending__head">
            <h3 className="cbl-export-pending__title">{isEn ? 'Still to fill' : '待填出口成本'}</h3>
            <span className="cbl-dim">
              {pending
                ? isEn
                  ? `${pending.singleCount} orders · ${pending.packageCount} packs`
                  : `单个 ${pending.singleCount} · 包裹 ${pending.packageCount}`
                : pendingNote
                  ? pendingNote
                  : isEn
                    ? 'The unfilled list did not load.'
                    : '待填清单没有加载出来。'}
            </span>
          </div>
          {pending && fillableKeys.length > 0 ? (
            <div className="cbl-export-batch">
              <span className="cbl-export-batch__count">
                {isEn ? `${pickedKeys.length} selected` : `已选 ${pickedKeys.length} 单`}
              </span>
              <button
                type="button"
                className="cbl-btn cbl-btn--ghost cbl-btn--sm"
                onClick={() => setPicked(allFillablePicked ? [] : fillableKeys)}
              >
                {allFillablePicked ? (isEn ? 'Clear' : '取消全选') : (isEn ? 'Select fillable' : '全选可填')}
              </button>
              <label>
                {isEn ? 'Leg' : '运达'}
                <select value={batchLeg} onChange={(event) => setBatchLeg(event.target.value as 'MSE' | 'LSO' | '')}>
                  <option value="">{isEn ? 'Choose' : '请选择'}</option>
                  <option value="MSE">{isEn ? 'Muse' : '木姐'}</option>
                  <option value="LSO">{isEn ? 'Lashio' : '腊戌'}</option>
                </select>
              </label>
              <label>
                {isEn ? 'CNY / Kg' : '¥/Kg'}
                <input value={batchPrice} inputMode="decimal" onChange={(event) => setBatchPrice(event.target.value)} />
              </label>
              <label>
                {isEn ? 'Pay in' : '实付'}
                <select value={batchCurrency} onChange={(event) => setBatchCurrency(event.target.value as 'CNY' | 'MMK' | '')}>
                  <option value="">{isEn ? 'Choose' : '请选择'}</option>
                  <option value="CNY">{isEn ? 'CNY' : '人民币'}</option>
                  <option value="MMK">{isEn ? 'MMK' : '缅币'}</option>
                </select>
              </label>
              {batchCurrency === 'MMK' ? (
                <label>
                  {isEn ? 'MMK per CNY' : '汇率'}
                  <input value={batchFx} inputMode="decimal" onChange={(event) => setBatchFx(event.target.value)} />
                </label>
              ) : null}
              <button
                type="button"
                className="cbl-btn cbl-btn--primary cbl-btn--sm"
                disabled={batchSaving || Boolean(savingKey)}
                onClick={saveBatch}
              >
                {batchSaving ? (isEn ? 'Saving…' : '保存中…') : (isEn ? 'Save selected' : '批量保存')}
              </button>
            </div>
          ) : null}
          {pending && pendingRows.length > 0 ? (
            <div className="cbl-table-wrap">
              <table className="cbl-table cbl-table--expense cbl-table--export-pending">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        aria-label={isEn ? 'Select fillable orders' : '全选可填订单'}
                        checked={allFillablePicked}
                        onChange={() => setPicked(allFillablePicked ? [] : fillableKeys)}
                      />
                    </th>
                    <th>{isEn ? 'Type' : '类型'}</th>
                    <th>{isEn ? 'Order' : '单号'}</th>
                    <th>{isEn ? 'Pack no.' : '包装号'}</th>
                    <th>{isEn ? 'Customer' : '客户'}</th>
                    <th>{isEn ? 'Destination' : '目的地'}</th>
                    <th>{isEn ? 'Weight' : '重量'}</th>
                    <th>{isEn ? 'Trip' : '车次'}</th>
                    <th>{isEn ? 'Fill' : '填写'}</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRows.map((row) => {
                    const missingWeight = !(Number(row.weightKg) > 0);
                    const subjectKey = row.kind === 'package' ? row.base || '' : row.id || '';
                    const open = openKey === row.key;
                    return (
                      <Fragment key={row.key}>
                        <tr>
                          <td>
                            <input
                              type="checkbox"
                              aria-label={isEn ? 'Select order' : '选择订单'}
                              disabled={missingWeight || batchSaving}
                              checked={!missingWeight && pickedKeys.includes(row.key)}
                              onChange={() => {
                                if (missingWeight) return;
                                setPicked((current) =>
                                  current.includes(row.key)
                                    ? current.filter((key) => key !== row.key)
                                    : [...current, row.key],
                                );
                              }}
                            />
                          </td>
                          <td>{kindLabel(row.kind, isEn)}</td>
                          <td className="cbl-code">
                            {row.kind === 'package' ? row.base : row.barcode || '—'}
                            {row.kind === 'package' && row.orderBarcodes && row.orderBarcodes.length ? (
                              <div className="cbl-dim">{row.orderBarcodes.join(' · ')}</div>
                            ) : null}
                          </td>
                          <td className="cbl-code">{row.packBarcode || '—'}</td>
                          <td>{row.customer || '—'}</td>
                          <td>{row.destination || '—'}</td>
                          <td>
                            {money(row.weightKg)} Kg
                            {row.kind === 'package' && row.pieceCount ? (
                              <span className="cbl-dim"> · {row.pieceCount}</span>
                            ) : null}
                          </td>
                          <td>{row.tripNumber?.trim() || '—'}</td>
                          <td>
                            {missingWeight ? (
                              <span className="cbl-dim">{isEn ? 'No weight' : '缺重量'}</span>
                            ) : (
                              <button
                                type="button"
                                className="cbl-btn cbl-btn--primary cbl-btn--sm"
                                onClick={() => {
                                  if (open) {
                                    setOpenKey('');
                                    return;
                                  }
                                  setOpenKey(row.key);
                                  setLeg('');
                                  setPrice('');
                                  setCurrency('');
                                  setFx(rate && rate > 0 ? String(rate) : '');
                                }}
                              >
                                {open ? (isEn ? 'Close' : '收起') : (isEn ? 'Fill' : '填写')}
                              </button>
                            )}
                          </td>
                        </tr>
                        {open ? (
                          <tr>
                            <td colSpan={9}>
                              <div className="cbl-export-fill">
                                <label>
                                  {isEn ? 'Leg' : '运达'}
                                  <select value={leg} onChange={(event) => setLeg(event.target.value as 'MSE' | 'LSO' | '')}>
                                    <option value="">{isEn ? 'Choose' : '请选择'}</option>
                                    <option value="MSE">{isEn ? 'Muse' : '木姐'}</option>
                                    <option value="LSO">{isEn ? 'Lashio' : '腊戌'}</option>
                                  </select>
                                </label>
                                <label>
                                  {isEn ? 'CNY / Kg' : '¥/Kg'}
                                  <input value={price} inputMode="decimal" onChange={(event) => setPrice(event.target.value)} />
                                </label>
                                <label>
                                  {isEn ? 'Pay in' : '实付'}
                                  <select value={currency} onChange={(event) => setCurrency(event.target.value as 'CNY' | 'MMK' | '')}>
                                    <option value="">{isEn ? 'Choose' : '请选择'}</option>
                                    <option value="CNY">{isEn ? 'CNY' : '人民币'}</option>
                                    <option value="MMK">{isEn ? 'MMK' : '缅币'}</option>
                                  </select>
                                </label>
                                {currency === 'MMK' ? (
                                  <label>
                                    {isEn ? 'MMK per CNY' : '汇率'}
                                    <input value={fx} inputMode="decimal" onChange={(event) => setFx(event.target.value)} />
                                  </label>
                                ) : null}
                                <button
                                  type="button"
                                  className="cbl-btn cbl-btn--primary cbl-btn--sm"
                                  disabled={savingKey === row.key || batchSaving}
                                  onClick={() => {
                                    if (savingKey) return;
                                    const label = row.kind === 'package' ? row.base || row.barcode : row.barcode;
                                    if (!leg || !currency) {
                                      setSaveNotice({
                                        ok: false,
                                        title: isEn ? 'Not saved' : '保存失败',
                                        text: isEn ? 'Choose the destination and the currency first.' : '请先选择运达和实付币种。',
                                      });
                                      return;
                                    }
                                    if (price.trim() === '' || !Number.isFinite(Number(price)) || Number(price) < 0) {
                                      setSaveNotice({
                                        ok: false,
                                        title: isEn ? 'Not saved' : '保存失败',
                                        text: isEn ? 'Enter the unit price. 0 can be saved.' : '请填写单价。填 0 也可以保存。',
                                      });
                                      return;
                                    }
                                    if (currency === 'MMK' && (!fx.trim() || !Number.isFinite(Number(fx)) || Number(fx) <= 0)) {
                                      setSaveNotice({
                                        ok: false,
                                        title: isEn ? 'Not saved' : '保存失败',
                                        text: isEn ? 'Enter the MMK per CNY rate.' : '实付缅币时请填写汇率。',
                                      });
                                      return;
                                    }
                                    setSavingKey(row.key);
                                    void saveAdminExportCost({
                                      subjectKind: row.kind,
                                      subjectKey,
                                      displayBarcode: row.kind === 'package' ? row.base || '' : row.barcode || '',
                                      customerName: row.customer,
                                      finalDestination: row.destination,
                                      legDestination: leg,
                                      weightKg: Number(row.weightKg),
                                      unitPriceCny: Number(price),
                                      payCurrency: currency,
                                      mmkPerCny: currency === 'MMK' ? Number(fx) : null,
                                      tripNumber: row.tripNumber,
                                      storeCode: row.ownerStoreCode,
                                      packBarcode: row.packBarcode,
                                    })
                                      .then(() => {
                                        setOpenKey('');
                                        setRetryTick((n) => n + 1);
                                        setSaveNotice({
                                          ok: true,
                                          title: isEn ? 'Saved' : '保存成功',
                                          text: isEn
                                            ? `Export cost for ${label || 'this order'} is saved.`
                                            : `已保存${label ? ` ${label} ` : ''}的出口成本。`,
                                        });
                                      })
                                      .catch((err: unknown) => {
                                        const raw = err instanceof Error ? err.message : '';
                                        setSaveNotice({
                                          ok: false,
                                          title: isEn ? 'Not saved' : '保存失败',
                                          text: raw
                                            ? friendlyExportCostError(raw, isEn)
                                            : isEn
                                              ? 'Save failed. Try again.'
                                              : '保存失败，请再试一次。',
                                        });
                                      })
                                      .finally(() => setSavingKey(''));
                                  }}
                                >
                                  {savingKey === row.key ? (isEn ? 'Saving…' : '保存中…') : (isEn ? 'Save' : '保存')}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : pending ? (
            <p className="cbl-export-cost__empty">
              {query.trim() && (searching || query.trim() !== debouncedQuery)
                ? isEn
                  ? 'Searching stocked orders…'
                  : '正在已入库的订单里查找…'
                : query.trim()
                  ? isEn
                    ? 'No matching orders still need a cost.'
                    : '没有符合搜索的待填订单。'
                  : isEn
                    ? 'Every stocked order already has an export cost.'
                    : '已入库的订单和包裹都填过出口成本了。'}
            </p>
          ) : null}
          {pending?.truncated ? (
            <p className="cbl-dim">
              {isEn
                ? 'Only the first 400 of each list are shown.'
                : '单个和包裹各自只列出前 400 条。'}
            </p>
          ) : null}
        </div>
        <div className="cbl-export-cost__stats">
          <div className="cbl-export-cost__stat">
            <span className="cbl-export-cost__label">{isEn ? 'Orders' : '单数'}</span>
            <strong className="cbl-export-cost__figure">{loading ? '—' : rows.length}</strong>
          </div>
          <div className="cbl-export-cost__stat">
            <span className="cbl-export-cost__label">
              {isEn ? 'Weight' : '重量'}
              <span className="cbl-export-cost__ccy">Kg</span>
            </span>
            <strong className="cbl-export-cost__figure">{loading ? '—' : money(paidWeightKg)}</strong>
          </div>
          <div className="cbl-export-cost__stat">
            <span className="cbl-export-cost__label">
              {isEn ? 'CNY' : '人民币'}
              {isEn ? null : <span className="cbl-export-cost__ccy">CNY</span>}
            </span>
            <strong className="cbl-export-cost__figure">{loading ? '—' : exportCostBarAmount(totalCny, 'cny')}</strong>
          </div>
          <div className="cbl-export-cost__stat">
            <span className="cbl-export-cost__label">
              {isEn ? 'MMK' : '缅币'}
              {isEn ? null : <span className="cbl-export-cost__ccy">MMK</span>}
            </span>
            <strong className="cbl-export-cost__figure">{loading ? '—' : exportCostBarAmount(totalMmk, 'mmk')}</strong>
          </div>
        </div>
        {loading ? (
          <div className="cbl-export-cost__empty">{isEn ? 'Loading…' : '加载中…'}</div>
        ) : error ? (
          <div className="cbl-export-cost__empty">
            <p>{error}</p>
            <button type="button" className="cbl-btn cbl-btn--ghost cbl-btn--sm" onClick={() => setRetryTick((n) => n + 1)}>
              {isEn ? 'Try again' : '再试一次'}
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="cbl-export-cost__empty">
            {isEn ? 'No export cost has been added in this period.' : '这个时段还没有添加过出口成本。'}
          </div>
        ) : (
          <div className="cbl-table-wrap">
            <table className="cbl-table cbl-table--expense">
              <thead>
                <tr>
                  <th>{isEn ? 'Time' : '时间'}</th>
                  <th>{isEn ? 'Type' : '类型'}</th>
                  <th>{isEn ? 'Order' : '单号'}</th>
                  <th>{isEn ? 'Pack no.' : '包装号'}</th>
                  <th>{isEn ? 'Customer' : '客户'}</th>
                  <th>{isEn ? 'Route' : '路线'}</th>
                  <th>{isEn ? 'Weight' : '重量'}</th>
                  <th>{isEn ? 'Price / Kg' : '单价'}</th>
                  <th>{isEn ? 'Total' : '合计'}</th>
                  <th>{isEn ? 'Trip' : '车次'}</th>
                  <th>{isEn ? 'Station' : '站点'}</th>
                  <th>{isEn ? 'Void' : '作废'}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => {
                  const station = storeName(row.store_code);
                  return (
                    <tr key={row.id}>
                      <td className="cbl-dim">{whenLabel(row.created_at)}</td>
                      <td>{kindLabel(row.subject_kind, isEn)}</td>
                      <td className="cbl-code">{row.display_barcode || '—'}</td>
                      <td className="cbl-code">{row.pack_barcode?.trim() || '—'}</td>
                      <td>{row.customer_name || '—'}</td>
                      <td>
                        {legLabel(row.leg_origin || 'RUI')} → {legLabel(row.leg_destination)}
                        {row.final_destination ? (
                          <span className="cbl-dim"> · {row.final_destination}</span>
                        ) : null}
                      </td>
                      <td>{money(row.weight_kg)} Kg</td>
                      <td>¥{money(row.unit_price_cny)}</td>
                      <td className="cbl-finance-cell cbl-finance-cell--out">
                        {exportCostMoney(row)}
                      </td>
                      <td>{row.trip_number?.trim() || '—'}</td>
                      <td>
                        <span className="cbl-code">{row.store_code || '—'}</span>
                        {station ? <span className="cbl-dim"> · {station}</span> : null}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="cbl-btn cbl-btn--ghost cbl-btn--sm"
                          disabled={voiding}
                          onClick={() => setVoidTarget(row)}
                        >
                          {isEn ? 'Void' : '作废'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {voidTarget ? (
        <div className="admin-modal-scrim" role="presentation" onClick={() => { if (!voiding) setVoidTarget(null); }}>
          <div
            className="admin-modal cbl-export-notice"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <h2>{isEn ? 'Void this export cost?' : '作废这笔出口成本？'}</h2>
            <p>
              {isEn
                ? `${voidTarget.display_barcode || 'This order'} leaves the period total. The saved numbers stay as history and are not edited. You can fill it again.`
                : `${voidTarget.display_barcode || '这一单'}不再计入本期。原来的数字留着，不会被改写。之后可以重新记一笔。`}
            </p>
            <div className="admin-modal__actions">
              <button type="button" className="cbl-btn cbl-btn--ghost" disabled={voiding} onClick={() => setVoidTarget(null)}>
                {isEn ? 'Cancel' : '取消'}
              </button>
              <button type="button" className="cbl-btn cbl-btn--primary" disabled={voiding} onClick={confirmVoid}>
                {voiding ? (isEn ? 'Voiding…' : '作废中…') : isEn ? 'Void' : '作废'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {saveNotice ? (
        <div className="admin-modal-scrim" role="presentation" onClick={() => setSaveNotice(null)}>
          <div
            className="admin-modal cbl-export-notice"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cbl-export-notice-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="cbl-export-notice-title" className={saveNotice.ok ? 'is-ok' : 'is-bad'}>
              {saveNotice.title}
            </h2>
            <p>{saveNotice.text}</p>
            <div className="admin-modal__actions">
              <button type="button" className="cbl-btn cbl-btn--primary" onClick={() => setSaveNotice(null)}>
                {isEn ? 'OK' : '知道了'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default ExportCostRecordsCard;
