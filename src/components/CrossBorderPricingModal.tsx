import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../contexts/LanguageContext';
import SecurityVerificationModal from './SecurityVerificationModal';
import { SystemSetting, systemSettingsService } from '../services/supabase';
import {
  CROSS_BORDER_ROUTE_HUBS,
  DEFAULT_PRICING_CUSTOMER_SCOPE,
  buildRouteMatrixPayload,
  customerHasRoutePricing,
  emptyRouteMatrix,
  mergeRouteMatrixFromDb,
  normalizeCustomerPricingCode,
  normalizeRouteHubCode,
  parseRouteMatrixForSave,
  parseRoutePerKgSettingsKey,
  routeHubDisplay,
  type PricingCustomerOption,
  type RouteMatrixValues,
} from '../utils/crossBorderRoutePricing';
import {
  cnyToMmk,
  formatCnyInput,
  mmkToCny,
  parseMmkPerCnyRate,
  pickMmkPerCnyRate,
} from '../utils/crossBorderFx';
import '../styles/adminSystemSettings.css';
import '../styles/crossBorderLogistics.css';

type Props = {
  open: boolean;
  onClose: () => void;
  customers?: PricingCustomerOption[];
  presetCustomerCode?: string;
  presetCustomerName?: string;
  lockCustomer?: boolean;
  focusDestination?: string;
  stacked?: boolean;
  onSaved?: () => void;
};

function convertMatrixUnits(
  matrix: RouteMatrixValues,
  fromRate: number | null,
  toRate: number | null,
): RouteMatrixValues {
  if (fromRate === toRate) return matrix;
  const next = emptyRouteMatrix();
  for (const origin of CROSS_BORDER_ROUTE_HUBS) {
    for (const dest of CROSS_BORDER_ROUTE_HUBS) {
      if (origin.code === dest.code) continue;
      const raw = matrix[origin.code]?.[dest.code] ?? '';
      const trimmed = String(raw).trim();
      if (!trimmed) {
        next[origin.code][dest.code] = '';
        continue;
      }
      const n = Number(trimmed);
      if (!Number.isFinite(n) || n < 0) {
        next[origin.code][dest.code] = raw;
        continue;
      }
      const mmk = fromRate ? cnyToMmk(n, fromRate) : n;
      if (mmk == null) {
        next[origin.code][dest.code] = raw;
        continue;
      }
      if (toRate) {
        const cny = mmkToCny(mmk, toRate);
        next[origin.code][dest.code] = cny == null ? String(mmk) : formatCnyInput(cny);
      } else {
        next[origin.code][dest.code] = String(mmk);
      }
    }
  }
  return next;
}

function cellBookedMmk(raw: string, rate: number | null): number | null {
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  if (!rate) return Math.round(n);
  return cnyToMmk(n, rate);
}

const CrossBorderPricingModal: React.FC<Props> = ({
  open,
  onClose,
  customers = [],
  presetCustomerCode,
  presetCustomerName,
  lockCustomer = false,
  focusDestination,
  stacked = false,
  onSaved,
}) => {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const [matrix, setMatrix] = useState<RouteMatrixValues>(() => emptyRouteMatrix());
  const [filterOrigin, setFilterOrigin] = useState<string>('ALL');
  const [selectedCustomer, setSelectedCustomer] = useState(DEFAULT_PRICING_CUSTOMER_SCOPE);
  const [usingDefaultPreview, setUsingDefaultPreview] = useState(false);
  const [loadedSettings, setLoadedSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [fxDraft, setFxDraft] = useState('');
  const displayRateRef = useRef<number | null>(null);

  const focusDestCode = normalizeRouteHubCode(focusDestination ?? '');

  const customerOptions = useMemo(() => {
    const preset = normalizeCustomerPricingCode(presetCustomerCode ?? '');
    const list = [...customers];
    if (preset && !list.some((row) => row.code === preset)) {
      list.unshift({ code: preset, name: String(presetCustomerName ?? '').trim() });
    }
    return list;
  }, [customers, presetCustomerCode, presetCustomerName]);

  const visibleDestinations = useMemo(
    () =>
      focusDestCode
        ? CROSS_BORDER_ROUTE_HUBS.filter((h) => h.code === focusDestCode)
        : CROSS_BORDER_ROUTE_HUBS,
    [focusDestCode],
  );

  const visibleOrigins = useMemo(() => {
    const origins =
      filterOrigin === 'ALL'
        ? CROSS_BORDER_ROUTE_HUBS
        : CROSS_BORDER_ROUTE_HUBS.filter((h) => h.code === filterOrigin);
    if (!focusDestCode) return origins;
    return origins.filter((h) => h.code !== focusDestCode);
  }, [filterOrigin, focusDestCode]);

  const configuredCount = useMemo(() => {
    let count = 0;
    for (const origin of visibleOrigins) {
      for (const dest of visibleDestinations) {
        if (origin.code === dest.code) continue;
        const raw = matrix[origin.code]?.[dest.code] ?? '';
        if (String(raw).trim()) count += 1;
      }
    }
    return count;
  }, [matrix, visibleOrigins, visibleDestinations]);

  const selectedCustomerMeta = useMemo(
    () => customerOptions.find((row) => row.code === selectedCustomer) ?? null,
    [customerOptions, selectedCustomer],
  );

  const configuredCustomerCodes = useMemo(() => {
    const codes = new Set<string>();
    for (const setting of loadedSettings) {
      const parsed = parseRoutePerKgSettingsKey(setting.settings_key);
      if (parsed?.customerCode) codes.add(parsed.customerCode);
    }
    return codes;
  }, [loadedSettings]);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await systemSettingsService.getAllSettings();
      setLoadedSettings(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setErrorMessage(
        isEn
          ? `Failed to load pricing.${msg ? ` ${msg}` : ''}`
          : `加载计费配置失败${msg ? `：${msg}` : '，请检查网络后重试。'}`,
      );
    } finally {
      setLoading(false);
    }
  }, [isEn]);

  useEffect(() => {
    if (!open) {
      setSelectedCustomer(DEFAULT_PRICING_CUSTOMER_SCOPE);
      setUsingDefaultPreview(false);
      setHasChanges(false);
      setFilterOrigin('ALL');
      return;
    }
    const preset = normalizeCustomerPricingCode(presetCustomerCode ?? '');
    setSelectedCustomer(preset || DEFAULT_PRICING_CUSTOMER_SCOPE);
    setFilterOrigin('ALL');
    void loadSettings();
  }, [open, loadSettings, presetCustomerCode]);

  useEffect(() => {
    if (!open) return;
    const customer = selectedCustomer || null;
    const hasOwn = customer ? customerHasRoutePricing(loadedSettings, customer) : true;
    const rate = pickMmkPerCnyRate(loadedSettings);
    setFxDraft(rate == null ? '' : String(rate));
    displayRateRef.current = rate;
    const mmkMatrix =
      customer && !hasOwn
        ? mergeRouteMatrixFromDb(loadedSettings)
        : mergeRouteMatrixFromDb(loadedSettings, customer);
    setUsingDefaultPreview(Boolean(customer && !hasOwn));
    setMatrix(convertMatrixUnits(mmkMatrix, null, rate));
    setHasChanges(false);
  }, [open, loadedSettings, selectedCustomer]);

  const handleCustomerChange = (next: string) => {
    if (next === selectedCustomer) return;
    if (hasChanges) {
      const ok = window.confirm(
        isEn
          ? 'Unsaved pricing for the current customer will be discarded. Switch anyway?'
          : '当前客户的计费尚未保存，切换将丢失未保存修改。确定切换？',
      );
      if (!ok) return;
    }
    setSelectedCustomer(next);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const displayRate = parseMmkPerCnyRate(fxDraft);

  const handleCellChange = (origin: string, dest: string, raw: string) => {
    setMatrix((prev) => ({
      ...prev,
      [origin]: {
        ...prev[origin],
        [dest]: raw,
      },
    }));
    setHasChanges(true);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const executeSave = async () => {
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const unitRate = displayRateRef.current;
      const mmkMatrix = convertMatrixUnits(matrix, unitRate, null);
      const parsed = parseRouteMatrixForSave(mmkMatrix);
      if (!parsed.ok) {
        setErrorMessage(isEn ? parsed.messageEn : parsed.message);
        return;
      }

      const payload = buildRouteMatrixPayload(
        mmkMatrix,
        selectedCustomer || null,
        focusDestCode ? { destinations: [focusDestCode] } : undefined,
      );
      const routeCount = payload.length;
      const result = await systemSettingsService.upsertSettings(payload);

      if (!result.ok) {
        setErrorMessage(
          isEn
            ? `Save failed.${result.error ? ` ${result.error}` : ' Check network and retry.'}`
            : `保存失败${result.error ? `：${result.error}` : '，请检查网络或稍后重试。'}`,
        );
        return;
      }

      const refreshed = await systemSettingsService.getAllSettings();
      setLoadedSettings(refreshed);
      const customer = selectedCustomer || null;
      const hasOwn = customer ? customerHasRoutePricing(refreshed, customer) : true;
      setUsingDefaultPreview(Boolean(customer && !hasOwn));
      const savedMmk =
        customer && !hasOwn
          ? mergeRouteMatrixFromDb(refreshed)
          : mergeRouteMatrixFromDb(refreshed, customer);
      setMatrix(convertMatrixUnits(savedMmk, null, displayRateRef.current));
      setHasChanges(false);
      const scopeLabel = selectedCustomer
        ? selectedCustomerMeta
          ? `${selectedCustomer}${selectedCustomerMeta.name ? ` · ${selectedCustomerMeta.name}` : ''}`
          : selectedCustomer
        : isEn
          ? 'default'
          : '默认';
      setSuccessMessage(
        isEn
          ? `Pricing saved for ${scopeLabel} (${routeCount} routes).`
          : `已保存 ${scopeLabel} 的路线计费（${routeCount} 条路线）。`,
      );
      onSaved?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setErrorMessage(
        isEn
          ? `Save failed.${msg ? ` ${msg}` : ''}`
          : `保存失败${msg ? `：${msg}` : '，请检查网络或稍后重试。'}`,
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    setShowVerificationModal(true);
  };

  if (!open) return null;

  return createPortal(
    <>
      <div
        className={`store-form-overlay cbl-create-overlay${stacked ? ' cbl-create-overlay--stacked' : ''}`}
        role="presentation"
        onClick={(e) => {
          if (e.target === e.currentTarget && !saving) onClose();
        }}
      >
        <div
          className={`cbl-pricing-modal cbl-pricing-modal--route-matrix${
            focusDestCode ? ' cbl-pricing-modal--dest-focus' : ''
          }`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cbl-pricing-title"
        >
          <header className="cbl-pricing-modal__head">
            <div>
              <h2 id="cbl-pricing-title" className="cbl-pricing-modal__title">
                {lockCustomer
                  ? isEn
                    ? 'Customer pricing'
                    : '客户定价'
                  : isEn
                    ? 'Cross-border pricing'
                    : '跨境计费'}
              </h2>
              <p className="cbl-pricing-modal__sub">
                {lockCustomer && focusDestCode
                  ? isEn
                    ? `Inbound quote to ${routeHubDisplay(focusDestCode)} in CNY/kg when a rate is set. Saved as MMK/kg for Inventory booking.`
                    : `进入 ${routeHubDisplay(focusDestCode)} 的报价按人民币/公斤填写（需先设汇率）。保存仍写入缅币/公斤，Inventory 入账公式不变。`
                  : isEn
                    ? 'Quote in CNY/kg when a headquarters rate is set. Saved as MMK/kg so Inventory booking stays in kyat.'
                    : '设好总部汇率后按人民币/公斤报价；保存仍写入现有缅币/公斤字段，Inventory 入账不变。'}
              </p>
            </div>
            <button
              type="button"
              className="cbl-pricing-modal__close"
              onClick={onClose}
              disabled={saving}
              aria-label={isEn ? 'Close' : '关闭'}
            >
              ✕
            </button>
          </header>

          {(errorMessage || successMessage) && (
            <div
              className={`cbl-pricing-modal__alert ${
                errorMessage ? 'cbl-pricing-modal__alert--error' : 'cbl-pricing-modal__alert--ok'
              }`}
            >
              {errorMessage || successMessage}
            </div>
          )}

          <div className="cbl-pricing-modal__toolbar">
            <label className="cbl-pricing-modal__filter cbl-pricing-modal__filter--customer">
              <span>{isEn ? 'Customer code' : '客户编码'}</span>
              {lockCustomer ? (
                <strong className="cbl-pricing-modal__customer-lock">
                  {selectedCustomer || '—'}
                  {selectedCustomerMeta?.name ? ` · ${selectedCustomerMeta.name}` : ''}
                </strong>
              ) : (
                <select
                  value={selectedCustomer}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  disabled={loading || saving}
                >
                  <option value={DEFAULT_PRICING_CUSTOMER_SCOPE}>
                    {isEn
                      ? 'Default (customers without their own rates)'
                      : '默认价格（未单独配置的客户）'}
                  </option>
                  {customerOptions.map((row) => {
                    const configured = configuredCustomerCodes.has(row.code);
                    const nameBit = row.name ? ` · ${row.name}` : '';
                    const flag = configured
                      ? isEn
                        ? ' · set'
                        : ' · 已配置'
                      : '';
                    return (
                      <option key={row.code} value={row.code}>
                        {row.code}
                        {nameBit}
                        {flag}
                      </option>
                    );
                  })}
                </select>
              )}
            </label>
            {focusDestCode ? (
              <span className="cbl-pricing-modal__stat">
                {isEn
                  ? `Showing routes into ${routeHubDisplay(focusDestCode)}`
                  : `仅显示进入 ${routeHubDisplay(focusDestCode)} 的路线`}
              </span>
            ) : (
              <label className="cbl-pricing-modal__filter">
                <span>{isEn ? 'Show routes from' : '仅显示发站'}</span>
                <select
                  value={filterOrigin}
                  onChange={(e) => setFilterOrigin(e.target.value)}
                  disabled={loading || saving}
                >
                  <option value="ALL">{isEn ? 'All origins' : '全部发站'}</option>
                  {CROSS_BORDER_ROUTE_HUBS.map((hub) => (
                    <option key={hub.code} value={hub.code}>
                      {hub.display}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="cbl-pricing-modal__filter cbl-pricing-modal__filter--fx">
              <span>{isEn ? '1 CNY =' : '1 人民币 ='}</span>
              <input
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={fxDraft}
                readOnly
                tabIndex={-1}
                disabled={loading || saving}
                placeholder={isEn ? 'MMK' : '缅币'}
                title={isEn ? 'Edit the rate on the Settings tab' : '请到设置页修改汇率'}
              />
              <span>{isEn ? 'MMK' : '缅币'}</span>
              <span className="cbl-pricing-modal__fx-hint">
                {isEn ? 'Edit in Settings' : '到设置页修改'}
              </span>
            </label>
            <span className="cbl-pricing-modal__stat">
              {isEn
                ? `${configuredCount} routes configured`
                : `已配置 ${configuredCount} 条路线`}
            </span>
          </div>

          <div className="sys-settings__section-banner sys-settings__section-banner--cross-border cbl-pricing-modal__banner">
            <h3>
              <span>🌏</span>{' '}
              {selectedCustomer
                ? isEn
                  ? `Route matrix · ${selectedCustomer}${
                      selectedCustomerMeta?.name ? ` · ${selectedCustomerMeta.name}` : ''
                    }`
                  : `路线单价矩阵 · ${selectedCustomer}${
                      selectedCustomerMeta?.name ? ` · ${selectedCustomerMeta.name}` : ''
                    }`
                : isEn
                  ? `Default route matrix (${displayRate ? 'CNY/kg' : 'MMK/kg'})`
                  : `默认路线单价矩阵 (${displayRate ? 'CNY/kg' : 'MMK/kg'})`}
            </h3>
            <p>
              {usingDefaultPreview ? (
                isEn ? (
                  <>
                    This customer has no custom rates yet. Showing the <strong>default</strong>{' '}
                    matrix as a starting point. Edit and save to make it this customer’s price.
                  </>
                ) : (
                  <>
                    该客户尚未单独定价，当前显示<strong>默认路线价</strong>方便修改。保存后即成为该客户专属价格；不保存则入库仍用默认价。
                  </>
                )
              ) : isEn ? (
                <>
                  Examples: <strong>RUILI → MDY</strong>, <strong>LSO → MDY</strong>,{' '}
                  <strong>YGN → POL</strong>. Reverse routes can differ. Leave blank if unused.
                  After save, re-open Inventory inbound step 3 to refresh.
                </>
              ) : (
                <>
                  例如：<strong>RUILI → MDY</strong>、<strong>LSO → MDY</strong>、
                  <strong>YGN → POL</strong> 可分别定价；往返价格可不同。未使用的路线可留空。
                  保存后请在 Inventory 重新进入入库第三步同步。
                </>
              )}
            </p>
          </div>

          {loading ? (
            <div className="cbl-pricing-modal__loading">
              {isEn ? 'Loading…' : '加载中…'}
            </div>
          ) : (
            <div className="cbl-pricing-modal__matrix-wrap">
              <table className="cbl-pricing-modal__matrix">
                <thead>
                  <tr>
                    <th className="cbl-pricing-modal__matrix-corner">
                      {isEn ? 'From \\ To' : '发站 \\ 终点'}
                    </th>
                    {visibleDestinations.map((dest) => (
                      <th key={dest.code} title={isEn ? dest.labelEn : dest.labelZh}>
                        {dest.display}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleOrigins.map((origin) => (
                    <tr
                      key={origin.code}
                      className={origin.code === 'RUI' ? 'cbl-pricing-modal__matrix-row--primary' : undefined}
                    >
                      <th className="cbl-pricing-modal__matrix-origin" title={isEn ? origin.labelEn : origin.labelZh}>
                        {origin.display}
                      </th>
                      {visibleDestinations.map((dest) => {
                        if (origin.code === dest.code) {
                          return (
                            <td key={dest.code} className="cbl-pricing-modal__matrix-self">
                              —
                            </td>
                          );
                        }
                        const cellValue = matrix[origin.code]?.[dest.code] ?? '';
                        const bookedMmk = cellBookedMmk(cellValue, displayRate);
                        return (
                          <td key={dest.code}>
                            <div className="cbl-pricing-modal__matrix-cell">
                              <input
                                className="cbl-pricing-modal__matrix-input"
                                type="number"
                                min={0}
                                step={displayRate ? 0.01 : 1}
                                inputMode="decimal"
                                value={cellValue}
                                onChange={(e) => handleCellChange(origin.code, dest.code, e.target.value)}
                                disabled={saving}
                                aria-label={`${routeHubDisplay(origin.code)} → ${routeHubDisplay(dest.code)}`}
                                placeholder="—"
                              />
                              {displayRate && bookedMmk != null ? (
                                <span className="cbl-pricing-modal__matrix-mmk">
                                  ≈ {bookedMmk.toLocaleString('en-US')} MMK
                                </span>
                              ) : null}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <footer className="cbl-pricing-modal__foot">
            <button
              type="button"
              className="cbl-btn cbl-btn--ghost cbl-pricing-modal__btn-ghost"
              onClick={onClose}
              disabled={saving}
            >
              {isEn ? 'Cancel' : '取消'}
            </button>
            <button
              type="button"
              className="cbl-btn cbl-btn--primary"
              onClick={handleSave}
              disabled={!hasChanges || saving || loading}
            >
              {saving ? (isEn ? 'Saving…' : '保存中…') : isEn ? 'Save' : '保存'}
            </button>
          </footer>
        </div>
      </div>

      <SecurityVerificationModal
        visible={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        onVerifySuccess={() => {
          setShowVerificationModal(false);
          void executeSave();
        }}
        title={isEn ? 'Verify pricing change' : '修改跨境计费验证'}
        description={
          isEn
            ? selectedCustomer
              ? `Changing pricing for ${selectedCustomer} affects Inventory inbound fees. Verify your admin password.`
              : 'Changing default route pricing affects Inventory inbound fees. Verify your admin password.'
            : selectedCustomer
              ? `修改客户 ${selectedCustomer} 的路线计费将影响 Inventory 入库费用，请验证管理员密码以确认。`
              : '修改默认路线计费将影响 Inventory 入库费用，请验证管理员密码以确认。'
        }
      />
    </>,
    document.body,
  );
};

export default CrossBorderPricingModal;
