import { useEffect, useMemo, useRef, useState } from 'react';
import { systemSettingsService } from '../services/supabase';
import { CROSS_BORDER_HUBS } from '../utils/crossBorderHubs';
import {
  CROSS_BORDER_FX_HISTORY_SETTINGS_KEY,
  formatCnyInput,
  parseCrossBorderFxHistory,
  pickMmkPerCnyRate,
  type CrossBorderFxHistoryEntry,
} from '../utils/crossBorderFx';
import {
  normalizeRouteHubCode,
  resolveRouteUnitQuote,
  type RouteRateSetting,
} from '../utils/crossBorderRoutePricing';
import { yangonTodayYmd } from '../utils/yangonFinancePeriod';
import { preferredChargeBasis, sanitizeDecimalInput, volumetricFormula, volumetricWeightKg } from '../utils/volumetricWeight';
import {
  fetchCrossBorderRegisteredCustomers,
  submitCrossBorderStockIn,
  type CrossBorderRegisteredCustomer,
  type InventoryTransitStore,
} from '../services/inventoryConsoleService';

type Pay = 'cod' | 'prepaid';
type ChargeBasis = 'volume' | 'weight';
type Mode = 'single' | 'batch';

type Line = { key: string; expressCode: string; name: string; qty: string };

type Props = {
  stores: InventoryTransitStore[];
  isEn: boolean;
};

function newLine(): Line {
  return { key: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, expressCode: '', name: '', qty: '1' };
}

export default function CrossBorderInboundPanel({ stores, isEn }: Props) {
  const activeStores = useMemo(
    () => stores.filter((store) => (store.status || 'active') === 'active'),
    [stores],
  );
  const [mode] = useState<Mode>('single');
  const [heldOrders, setHeldOrders] = useState<Array<{
    key: string;
    expressCode: string;
    itemName: string;
    spec: string;
    weightKg: string;
    qty: number;
    quoteCny: string;
    quoteManual: boolean;
    chargeBasis: ChargeBasis;
    recipientName: string;
    recipientPhone: string;
    customerCode: string;
    destination: string;
    detailAddress: string;
    note: string;
    pay: 'cod' | 'prepaid';
  }>>([]);
  const [storeId, setStoreId] = useState('');
  const [customers, setCustomers] = useState<CrossBorderRegisteredCustomer[]>([]);
  const [customerCode, setCustomerCode] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [destination, setDestination] = useState('MDY');
  const [detailAddress, setDetailAddress] = useState('');
  const [inboundDate, setInboundDate] = useState(yangonTodayYmd());
  const [expressCode, setExpressCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [specL, setSpecL] = useState('');
  const [specW, setSpecW] = useState('');
  const [specH, setSpecH] = useState('');
  const [qty, setQty] = useState('1');
  const [quoteCny, setQuoteCny] = useState('');
  const [quoteManual, setQuoteManual] = useState(false);
  const [quoteHint, setQuoteHint] = useState('');
  const [routeSettings, setRouteSettings] = useState<RouteRateSetting[]>([]);
  const [fxHistory, setFxHistory] = useState<CrossBorderFxHistoryEntry[]>([]);
  const [liveRate, setLiveRate] = useState<number | null>(null);
  const [chargeBasis, setChargeBasis] = useState<ChargeBasis>('weight');
  const [chargeManual, setChargeManual] = useState(false);
  const [pay, setPay] = useState<Pay | ''>('');
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanDraft, setScanDraft] = useState('');
  const expressRef = useRef<HTMLInputElement>(null);
  const batchScanRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ barcode: string; lineBarcodes: string[] } | null>(null);

  useEffect(() => {
    if (storeId || activeStores.length === 0) return;
    const ruili = activeStores.find((store) => store.store_code.trim().toUpperCase() === 'RUILI001');
    setStoreId((ruili ?? activeStores[0]).id);
  }, [activeStores, storeId]);

  useEffect(() => {
    let cancelled = false;
    void fetchCrossBorderRegisteredCustomers()
      .then((rows) => {
        if (!cancelled) setCustomers(rows.filter((row) => row.status !== 'inactive'));
      })
      .catch(() => {
        if (!cancelled) setCustomers([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const match = useMemo(() => {
    const code = customerCode.trim().toUpperCase();
    if (!code) return null;
    return customers.find((row) => row.customer_code.trim().toUpperCase() === code) ?? null;
  }, [customerCode, customers]);

  const applyCustomer = (row: CrossBorderRegisteredCustomer) => {
    setRecipientName(row.customer_name);
    setRecipientPhone(row.phone);
    const area = row.delivery_area_code.trim().toUpperCase();
    const hub =
      CROSS_BORDER_HUBS.find((item) => item.regionId === row.delivery_region_id) ||
      CROSS_BORDER_HUBS.find((item) => item.hubCode === area || item.prefix === area);
    if (hub) setDestination(hub.hubCode);
    setDetailAddress(row.address_notes || '');
  };

  useEffect(() => {
    if (!match) return;
    applyCustomer(match);
  }, [match]);

  useEffect(() => {
    let cancelled = false;
    void systemSettingsService
      .getSettingsByKeyPrefix('pricing.cross_border.')
      .then((rows) => {
        if (cancelled) return;
        setRouteSettings(rows);
        setLiveRate(pickMmkPerCnyRate(rows));
        const historyRow = rows.find((row) => row.settings_key === CROSS_BORDER_FX_HISTORY_SETTINGS_KEY);
        setFxHistory(parseCrossBorderFxHistory(historyRow?.settings_value));
      })
      .catch(() => {
        if (!cancelled) {
          setRouteSettings([]);
          setLiveRate(null);
          setFxHistory([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const volumetricKg = useMemo(
    () => volumetricWeightKg(specL, specW, specH),
    [specL, specW, specH],
  );
  const chargeKg = chargeBasis === 'volume' ? volumetricKg ?? 0 : Number(weightKg) || 0;
  const autoBasis = preferredChargeBasis(volumetricKg, Number(weightKg) || 0);
  const chargeHint = chargeManual
    ? isEn
      ? 'Chosen by hand. Editing size or weight compares again.'
      : '已手动选择。改尺寸或重量后会重新比较'
    : autoBasis === 'volume'
      ? isEn
        ? 'Volume is heavier, selected automatically.'
        : '体积重量更大，已自动选用'
      : autoBasis === 'weight'
        ? isEn
          ? 'Charging by actual weight.'
          : '按实际重量收费'
        : '';

  useEffect(() => {
    if (chargeManual) return;
    if (!autoBasis || autoBasis === chargeBasis) return;
    setQuoteManual(false);
    setChargeBasis(autoBasis);
  }, [chargeManual, autoBasis, chargeBasis]);

  useEffect(() => {
    if (quoteManual || !pay) return;
    const weight = chargeKg;
    const store = activeStores.find((item) => item.id === storeId);
    const origin = normalizeRouteHubCode(store?.store_code || '');
    const dest = normalizeRouteHubCode(destination);
    if (!origin || !dest || !(weight > 0)) {
      setQuoteHint(
        chargeBasis === 'volume' && origin && dest
          ? isEn
            ? 'Enter length, width and height to charge by volume.'
            : '按体积重量收费时，请先填写长、宽、高。'
          : '',
      );
      if (!(weight > 0)) setQuoteCny('');
      return;
    }
    const unit = resolveRouteUnitQuote({
      settings: routeSettings,
      origin,
      destination: dest,
      customerCode,
      history: fxHistory,
      liveRate,
    });
    if (unit.cnyPerKg == null) {
      setQuoteCny('');
      setQuoteHint(isEn ? 'This route has no CNY price yet.' : '这条路线还没有人民币单价。');
      return;
    }
    setQuoteCny(formatCnyInput(unit.cnyPerKg * weight));
    setQuoteHint(
      `${origin} → ${dest} ¥${formatCnyInput(unit.cnyPerKg)}/kg × ${weight} kg`,
    );
  }, [
    quoteManual,
    pay,
    chargeKg,
    chargeBasis,
    weightKg,
    storeId,
    destination,
    customerCode,
    routeSettings,
    fxHistory,
    liveRate,
    activeStores,
    isEn,
  ]);

  const submit = async () => {
    setError('');
    setResult(null);
    if (!pay) {
      setError(isEn ? 'Choose COD or prepaid.' : '请选择到付或预付。');
      return;
    }
    const basis: ChargeBasis = !chargeManual && autoBasis ? autoBasis : chargeBasis;
    const kg = basis === 'volume' ? volumetricKg ?? 0 : Number(weightKg) || 0;
    const spec = [specL, specW, specH].some((part) => part.trim())
      ? `${specL.trim() || '0'} x ${specW.trim() || '0'} x ${specH.trim() || '0'} cm`
      : '';
    let quote = quoteCny.trim();
    if (!quoteManual) {
      const store = activeStores.find((item) => item.id === storeId);
      const origin = normalizeRouteHubCode(store?.store_code || '');
      const dest = normalizeRouteHubCode(destination);
      const unit = origin && dest
        ? resolveRouteUnitQuote({
            settings: routeSettings,
            origin,
            destination: dest,
            customerCode,
            history: fxHistory,
            liveRate,
          })
        : { cnyPerKg: null };
      quote = unit.cnyPerKg != null && kg > 0 ? formatCnyInput(unit.cnyPerKg * kg) : '';
    }
    if (basis === 'volume' && !(volumetricKg && volumetricKg > 0)) {
      setError(isEn ? 'Enter length, width and height to charge by volume.' : '按体积重量收费时，请先填写长、宽、高。');
      return;
    }
    setSaving(true);
    try {
      const saved = await submitCrossBorderStockIn({
        mode,
        storeId,
        destination,
        recipientName,
        recipientPhone,
        customerCode,
        inboundDate,
        quoteCny: quote,
        quoteManual,
        chargeBasis: basis,
        pay,
        note,
        detailAddress,
        weightKg,
        spec,
        qty: Number(qty) || 1,
        expressCode,
        itemName,
        lines: lines.map((line) => ({
          expressCode: line.expressCode,
          name: line.name,
          qty: Number(line.qty) || 1,
        })),
      });
      setResult({ barcode: saved.barcode, lineBarcodes: saved.lineBarcodes || [] });
      setExpressCode('');
      setItemName('');
      setWeightKg('');
      setSpecL('');
      setSpecW('');
      setSpecH('');
      setQuoteCny('');
      setChargeBasis('weight');
      setChargeManual(false);
      setNote('');
      setLines([newLine()]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : isEn ? 'Stock-in failed' : '入库失败');
    } finally {
      setSaving(false);
    }
  };

  const currentOrderSnapshot = () => {
    if (!pay) {
      setError(isEn ? 'Choose COD or prepaid.' : '请选择到付或预付。');
      return null;
    }
    const basis: ChargeBasis = !chargeManual && autoBasis ? autoBasis : chargeBasis;
    if (basis === 'volume' && !(volumetricKg && volumetricKg > 0)) {
      setError(isEn ? 'Enter length, width and height to charge by volume.' : '按体积重量收费时，请先填写长、宽、高。');
      return null;
    }
    const weightN = Number(weightKg);
    if (!weightKg.trim() || !Number.isFinite(weightN) || weightN <= 0) {
      setError(isEn ? 'Enter the weight.' : '请填写重量。');
      return null;
    }
    if (!destination.trim() || !recipientName.trim() || !recipientPhone.trim()) {
      setError(isEn ? 'Customer, phone and destination are required.' : '请填写客户、电话和目的地。');
      return null;
    }
    const spec = [specL, specW, specH].some((part) => part.trim())
      ? `${specL.trim() || '0'} x ${specW.trim() || '0'} x ${specH.trim() || '0'} cm`
      : '';
    return {
      key: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      expressCode: expressCode.trim(),
      itemName: itemName.trim(),
      spec,
      weightKg: weightKg.trim(),
      qty: Number(qty) || 1,
      quoteCny: quoteCny.trim(),
      quoteManual,
      chargeBasis: basis,
      recipientName: recipientName.trim(),
      recipientPhone: recipientPhone.trim(),
      customerCode: customerCode.trim(),
      destination: destination.trim(),
      detailAddress: detailAddress.trim(),
      note: note.trim(),
      pay,
    };
  };

  const holdAndContinue = () => {
    const order = currentOrderSnapshot();
    if (!order) return;
    setError('');
    setHeldOrders((prev) => [...prev, order]);
    setExpressCode('');
    setItemName('');
    setWeightKg('');
    setSpecL('');
    setSpecW('');
    setSpecH('');
    setQuoteCny('');
    setQuoteManual(false);
    setChargeBasis('weight');
    setChargeManual(false);
    setNote('');
    setQty('1');
  };

  const packTogether = async () => {
    const current = currentOrderSnapshot();
    if (!current) return;
    const orders = [...heldOrders, current];
    if (orders.length < 2) {
      setError(isEn ? 'Add at least one more order before packing.' : '至少再加一单才能打包。');
      return;
    }
    setSaving(true);
    setError('');
    setResult(null);
    try {
      const saved = await submitCrossBorderStockIn({
        mode: 'bundle_singles',
        storeId,
        destination: current.destination,
        recipientName: current.recipientName,
        recipientPhone: current.recipientPhone,
        customerCode: current.customerCode,
        inboundDate,
        pay: current.pay,
        orders: orders.map((order) => ({
          expressCode: order.expressCode,
          itemName: order.itemName,
          spec: order.spec,
          weightKg: order.weightKg,
          qty: order.qty,
          quoteCny: order.quoteCny,
          quoteManual: order.quoteManual,
          chargeBasis: order.chargeBasis,
          recipientName: order.recipientName,
          recipientPhone: order.recipientPhone,
          customerCode: order.customerCode,
          destination: order.destination,
          detailAddress: order.detailAddress,
          note: order.note,
        })),
      });
      setResult({ barcode: saved.barcode, lineBarcodes: saved.lineBarcodes || [] });
      setHeldOrders([]);
      setExpressCode('');
      setItemName('');
      setWeightKg('');
      setSpecL('');
      setSpecW('');
      setSpecH('');
      setQuoteCny('');
      setQuoteManual(false);
      setChargeBasis('weight');
      setChargeManual(false);
      setNote('');
      setQty('1');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : isEn ? 'Stock-in failed' : '入库失败');
    } finally {
      setSaving(false);
    }
  };

  const dateLabel = (() => {
    const [year, month, day] = inboundDate.split('-');
    if (!year || !month || !day) return '';
    return `${year}年${Number(month)}月${Number(day)}日`;
  })();

  return (
    <section className="cbl-card cbl-inbound-card">
      <div className="cbl-card__head">
        <div>
          <h2 className="cbl-card__title">{isEn ? 'Inbound' : '入库'}</h2>
          <p className="cbl-inbound-lead">
            {isEn
              ? 'Fill one order, then scan the next. Pack them under one package number when you are ready. Each order keeps its own size, weight and fee.'
              : '先填好一单，再扫下一单。最后打成一个包装号。每一单仍用自己的尺寸、重量和费用。'}
          </p>
        </div>
      </div>
      <div className="cbl-inbound">
        <section className="cbl-inbound-block">
          <h3>{isEn ? 'Origin' : '从哪发出'}</h3>
          <div className="cbl-inbound-grid cbl-inbound-grid--2">
            <label className="cbl-inbound-field">
              <span>{isEn ? 'Station' : '发出站点'}</span>
              <select value={storeId} onChange={(event) => setStoreId(event.target.value)}>
                {activeStores.length === 0 ? <option value="">{isEn ? 'No station' : '没有站点'}</option> : null}
                {activeStores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.store_name} ({store.store_code})
                  </option>
                ))}
              </select>
            </label>
            <label className="cbl-inbound-field">
              <span>{isEn ? 'Date' : '入库日期'}{dateLabel ? ` · ${dateLabel}` : ''}</span>
              <input type="date" lang="zh-CN" value={inboundDate} onChange={(event) => setInboundDate(event.target.value)} />
            </label>
          </div>
        </section>

        <section className="cbl-inbound-block">
          <h3>{isEn ? 'Customer' : '客户'}</h3>
          <div className="cbl-inbound-grid">
            <label className="cbl-inbound-field">
              <span>{isEn ? 'Customer code' : '客户编码'}</span>
              <input
                value={customerCode}
                onChange={(event) => setCustomerCode(event.target.value.toUpperCase())}
                placeholder={isEn ? 'Code' : '编码'}
                list="cbl-inbound-customers"
              />
              <datalist id="cbl-inbound-customers">
                {customers.slice(0, 80).map((row) => (
                  <option key={row.id} value={row.customer_code}>
                    {row.customer_name}
                  </option>
                ))}
              </datalist>
            </label>
            <label className="cbl-inbound-field">
              <span>{isEn ? 'Name' : '客户姓名'}</span>
              <input value={recipientName} onChange={(event) => setRecipientName(event.target.value)} placeholder={isEn ? 'Name' : '姓名'} />
            </label>
            <label className="cbl-inbound-field">
              <span>{isEn ? 'Phone' : '手机号码'}</span>
              <input value={recipientPhone} onChange={(event) => setRecipientPhone(event.target.value)} placeholder="09" />
            </label>
            <label className="cbl-inbound-field">
              <span>{isEn ? 'Destination' : '目的地'}</span>
              <select value={destination} onChange={(event) => setDestination(event.target.value)}>
                {CROSS_BORDER_HUBS.map((hub) => (
                  <option key={hub.hubCode} value={hub.hubCode}>
                    {isEn ? hub.nameEn : hub.nameZh} ({hub.hubCode})
                  </option>
                ))}
              </select>
            </label>
            <label className="cbl-inbound-field cbl-inbound-span-2">
              <span>{isEn ? 'Address' : '详细地址'}</span>
              <input value={detailAddress} onChange={(event) => setDetailAddress(event.target.value)} placeholder={isEn ? 'Optional' : '选填'} />
            </label>
            <p className={`cbl-inbound-match cbl-inbound-span-2${match ? '' : ' is-empty'}`}>
              {match
                ? `${isEn ? 'Filled' : '已带入'} ${match.customer_name} · ${match.phone}`
                : customerCode.trim()
                  ? isEn
                    ? 'No customer uses this code.'
                    : '没有这个编码的客户。'
                  : isEn
                    ? 'A code fills name and phone.'
                    : '编码会带出姓名和电话'}
            </p>
          </div>
        </section>

        <section className="cbl-inbound-block">
          <h3>{isEn ? 'Goods and fee' : '货物和费用'}</h3>
          {mode === 'single' ? (
            <div className="cbl-inbound-grid">
              <label className="cbl-inbound-field cbl-inbound-span-2">
                <span>{isEn ? 'Express no.' : '快递单号'}</span>
                <div className={`cbl-inbound-scan${scanning ? ' is-on' : ''}`}>
                  <input
                    ref={expressRef}
                    value={expressCode}
                    onChange={(event) => setExpressCode(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter') return;
                      event.preventDefault();
                      setExpressCode((value) => value.trim());
                      setScanning(false);
                    }}
                    placeholder={scanning ? (isEn ? 'Scan now' : '请扫条码') : isEn ? 'Tracking no.' : '单号或扫码'}
                  />
                  <button
                    type="button"
                    className={`cbl-btn cbl-btn--sm${scanning ? ' cbl-btn--primary' : ' cbl-btn--light'}`}
                    onClick={() => {
                      if (scanning) {
                        setScanning(false);
                        return;
                      }
                      setScanning(true);
                      expressRef.current?.focus();
                      expressRef.current?.select();
                    }}
                  >
                    {scanning ? (isEn ? 'Waiting' : '等待扫码') : isEn ? 'Scan' : '扫码'}
                  </button>
                </div>
                {scanning ? (
                  <p className="cbl-inbound-scan-tip">
                    {isEn
                      ? 'Plug in the scanner, then press its trigger on the label. The number fills in on the left.'
                      : '扫码枪插上后，对着快递单条码按一下。单号会填进左边。'}
                  </p>
                ) : null}
              </label>
              <label className="cbl-inbound-field">
                <span>{isEn ? 'Pieces' : '件数'}</span>
                <input value={qty} onChange={(event) => setQty(event.target.value)} inputMode="numeric" />
              </label>
              <label className="cbl-inbound-field">
                <span>{isEn ? 'Item name' : '货名'}</span>
                <input value={itemName} onChange={(event) => setItemName(event.target.value)} placeholder={isEn ? 'Optional' : '选填'} />
              </label>
            </div>
          ) : (
            <div className="cbl-inbound-lines">
              <div className={`cbl-inbound-scan${scanning ? ' is-on' : ''}`}>
                <input
                  ref={batchScanRef}
                  value={scanDraft}
                  onChange={(event) => setScanDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') return;
                    event.preventDefault();
                    const code = scanDraft.trim();
                    if (!code) return;
                    const duplicated = lines.some((line) => line.expressCode.trim().toUpperCase() === code.toUpperCase());
                    if (duplicated) {
                      setError(isEn ? `${code} is already in this package.` : `${code} 已经在这个包里。`);
                      setScanDraft('');
                      window.setTimeout(() => batchScanRef.current?.focus(), 0);
                      return;
                    }
                    setError('');
                    setLines((prev) => {
                      const empty = prev.findIndex((line) => !line.expressCode.trim());
                      if (empty >= 0) {
                        return prev.map((line, index) => (index === empty ? { ...line, expressCode: code } : line));
                      }
                      return [...prev, { ...newLine(), expressCode: code }];
                    });
                    setScanDraft('');
                    window.setTimeout(() => batchScanRef.current?.focus(), 0);
                  }}
                  placeholder={scanning ? (isEn ? 'Scan the next label' : '请扫下一张') : isEn ? 'Scan or type an express no.' : '扫码或输入快递单号'}
                />
                <button
                  type="button"
                  className={`cbl-btn cbl-btn--sm${scanning ? ' cbl-btn--primary' : ' cbl-btn--light'}`}
                  onClick={() => {
                    if (scanning) {
                      setScanning(false);
                      return;
                    }
                    setScanning(true);
                    batchScanRef.current?.focus();
                    batchScanRef.current?.select();
                  }}
                >
                  {scanning ? (isEn ? 'Waiting' : '等待扫码') : isEn ? 'Scan' : '扫码'}
                </button>
              </div>
              {scanning ? (
                <p className="cbl-inbound-scan-tip">
                  {isEn
                    ? 'Plug in the scanner and scan each label. Each scan adds one line.'
                    : '扫码枪插上后，每扫一张就加一行。'}
                </p>
              ) : null}
              <div className="cbl-inbound-lines__head">
                <strong>
                  {isEn
                    ? `${lines.filter((line) => line.expressCode.trim()).length} orders · ${lines.reduce((sum, line) => sum + (Number(line.qty) || 0), 0)} pcs`
                    : `已录入 ${lines.filter((line) => line.expressCode.trim()).length} 单 · 共 ${lines.reduce((sum, line) => sum + (Number(line.qty) || 0), 0)} 件`}
                </strong>
                <button type="button" className="cbl-btn cbl-btn--sm cbl-btn--light" onClick={() => setLines((prev) => [...prev, newLine()])}>
                  {isEn ? 'Add one' : '再加一件'}
                </button>
              </div>
              <div className="cbl-inbound-line cbl-inbound-line--head" aria-hidden="true">
                <span />
                <span>{isEn ? 'Express no.' : '快递单号'}</span>
                <span>{isEn ? 'Item' : '货名'}</span>
                <span>{isEn ? 'Pcs' : '件数'}</span>
                <span />
              </div>
              {lines.map((line, index) => (
                <div className="cbl-inbound-line" key={line.key}>
                  <em>{index + 1}</em>
                  <input
                    value={line.expressCode}
                    placeholder={isEn ? 'Express no.' : '快递单号'}
                    onChange={(event) =>
                      setLines((prev) => prev.map((item) => (item.key === line.key ? { ...item, expressCode: event.target.value } : item)))
                    }
                  />
                  <input
                    value={line.name}
                    placeholder={isEn ? 'Optional' : '选填'}
                    onChange={(event) =>
                      setLines((prev) => prev.map((item) => (item.key === line.key ? { ...item, name: event.target.value } : item)))
                    }
                  />
                  <input
                    value={line.qty}
                    inputMode="numeric"
                    aria-label={isEn ? 'Pieces' : '件数'}
                    onChange={(event) =>
                      setLines((prev) => prev.map((item) => (item.key === line.key ? { ...item, qty: event.target.value } : item)))
                    }
                  />
                  <button
                    type="button"
                    className="cbl-btn cbl-btn--sm cbl-btn--light"
                    disabled={lines.length === 1}
                    onClick={() => setLines((prev) => prev.filter((item) => item.key !== line.key))}
                  >
                    {isEn ? 'Remove' : '去掉'}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="cbl-inbound-grid">
            <label className="cbl-inbound-field">
              <span>{isEn ? 'Length' : '长'}</span>
              <div className="cbl-inbound-affix">
                <input value={specL} onChange={(event) => { setChargeManual(false); setSpecL(sanitizeDecimalInput(event.target.value)); }} inputMode="decimal" placeholder="0" />
                <b>cm</b>
              </div>
            </label>
            <label className="cbl-inbound-field">
              <span>{isEn ? 'Width' : '宽'}</span>
              <div className="cbl-inbound-affix">
                <input value={specW} onChange={(event) => { setChargeManual(false); setSpecW(sanitizeDecimalInput(event.target.value)); }} inputMode="decimal" placeholder="0" />
                <b>cm</b>
              </div>
            </label>
            <label className="cbl-inbound-field">
              <span>{isEn ? 'Height' : '高'}</span>
              <div className="cbl-inbound-affix">
                <input value={specH} onChange={(event) => { setChargeManual(false); setSpecH(sanitizeDecimalInput(event.target.value)); }} inputMode="decimal" placeholder="0" />
                <b>cm</b>
              </div>
            </label>
            <div className="cbl-inbound-field">
              <span>{isEn ? 'Volumetric weight' : '体积重量'}</span>
              <div className={`cbl-inbound-volume${volumetricKg ? '' : ' is-empty'}`}>
                <strong>{volumetricKg ? `${volumetricKg} Kg` : '—'}</strong>
              </div>
              <em>
                {mode === 'batch'
                  ? isEn
                    ? 'One size for the whole package. Compared with the package weight.'
                    : '按这一包的长宽高算一次。比整包重量大就按体积重量收这一笔。'
                  : volumetricFormula(specL, specW, specH) ||
                    (isEn ? 'Enter length, width and height' : '填完长、宽、高后自动算出')}
                {mode === 'batch' && volumetricFormula(specL, specW, specH)
                  ? ` · ${volumetricFormula(specL, specW, specH)}`
                  : ''}
              </em>
            </div>
          </div>
          <div className="cbl-inbound-grid cbl-inbound-fee">
            <label className="cbl-inbound-field">
              <span>{mode === 'single' ? (isEn ? 'Weight' : '重量') : isEn ? 'Package weight' : '整包重量'}</span>
              <div className="cbl-inbound-affix">
                <input value={weightKg} onChange={(event) => { setChargeManual(false); setWeightKg(sanitizeDecimalInput(event.target.value)); }} inputMode="decimal" placeholder="0" />
                <b>Kg</b>
              </div>
            </label>
            <div className="cbl-inbound-field">
              <span>{isEn ? 'Charge by' : '收费方式'}</span>
              <div className="cbl-inbound-choice">
                <button
                  type="button"
                  className={`cbl-btn cbl-btn--sm${chargeBasis === 'volume' ? ' cbl-btn--primary' : ' cbl-btn--light'}`}
                  onClick={() => {
                    setQuoteManual(false);
                    setChargeManual(true);
                    setChargeBasis('volume');
                  }}
                >
                  {isEn ? 'Volume' : '体积重量'}
                </button>
                <button
                  type="button"
                  className={`cbl-btn cbl-btn--sm${chargeBasis === 'weight' ? ' cbl-btn--primary' : ' cbl-btn--light'}`}
                  onClick={() => {
                    setQuoteManual(false);
                    setChargeManual(true);
                    setChargeBasis('weight');
                  }}
                >
                  {isEn ? 'Weight' : '重量'}
                </button>
              </div>
              {chargeHint ? <em>{chargeHint}</em> : null}
            </div>
            <div className="cbl-inbound-field">
              <span>{isEn ? 'Payment' : '付款'}</span>
              <div className="cbl-inbound-choice">
                <button
                  type="button"
                  className={`cbl-btn cbl-btn--sm${pay === 'cod' ? ' cbl-btn--primary' : ' cbl-btn--light'}`}
                  onClick={() => {
                    setQuoteManual(false);
                    setPay('cod');
                  }}
                >
                  {isEn ? 'COD' : '到付'}
                </button>
                <button
                  type="button"
                  className={`cbl-btn cbl-btn--sm${pay === 'prepaid' ? ' cbl-btn--primary' : ' cbl-btn--light'}`}
                  onClick={() => {
                    setQuoteManual(false);
                    setPay('prepaid');
                  }}
                >
                  {isEn ? 'Prepaid' : '预付'}
                </button>
              </div>
            </div>
            <label className="cbl-inbound-field">
              <span>{isEn ? 'Quote' : '报价'}</span>
              <div className="cbl-inbound-affix">
                <b>CNY</b>
                <input
                  value={quoteCny}
                  onChange={(event) => {
                    setQuoteManual(true);
                    setQuoteCny(sanitizeDecimalInput(event.target.value));
                  }}
                  inputMode="decimal"
                  placeholder={pay ? '0' : isEn ? 'After payment' : '选付款后算出'}
                />
              </div>
              {quoteHint ? <em>{quoteHint}</em> : null}
            </label>
            <label className="cbl-inbound-field cbl-inbound-span-4">
              <span>{isEn ? 'Note' : '备注'}</span>
              <input value={note} onChange={(event) => setNote(event.target.value)} placeholder={isEn ? 'Optional' : '选填'} />
            </label>
          </div>
        </section>

        {error ? <p className="cbl-alert cbl-alert--error">{error}</p> : null}
        {result ? (
          <p className="cbl-inbound-result">
            {result.lineBarcodes.length > 1
              ? isEn
                ? `Package ${result.barcode}. ${result.lineBarcodes.length} orders, each with its own fee.`
                : `已打包。包装号 ${result.barcode}，里面 ${result.lineBarcodes.length} 单，费用各算各的。`
              : isEn
                ? `Stocked in. Barcode ${result.barcode}`
                : `已入库。条码 ${result.barcode}`}
          </p>
        ) : null}

        {heldOrders.length > 0 ? (
          <p className="cbl-inbound-result">
            {isEn
              ? `${heldOrders.length} order(s) filled, not saved yet.`
              : `已填 ${heldOrders.length} 单，还没入库。`}
            {heldOrders.map((order, index) => ` ${index + 1}.${order.expressCode || order.itemName || order.weightKg}`)}
          </p>
        ) : null}

        <div className="cbl-inbound-foot">
          <button type="button" className="cbl-btn cbl-btn--light" disabled={saving || !storeId} onClick={holdAndContinue}>
            {isEn ? 'Scan another' : '再录一单'}
          </button>
          {heldOrders.length > 0 ? (
            <button type="button" className="cbl-btn cbl-btn--primary" disabled={saving || !storeId} onClick={() => void packTogether()}>
              {saving ? (isEn ? 'Saving…' : '正在入库…') : isEn ? 'Pack together' : '打成一包'}
            </button>
          ) : (
            <button type="button" className="cbl-btn cbl-btn--primary" disabled={saving || !storeId} onClick={() => void submit()}>
              {saving ? (isEn ? 'Saving…' : '正在入库…') : isEn ? 'Confirm inbound' : '确认入库'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
