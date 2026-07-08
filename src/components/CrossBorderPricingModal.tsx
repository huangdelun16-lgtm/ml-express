import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../contexts/LanguageContext';
import SecurityVerificationModal from './SecurityVerificationModal';
import { SystemSetting, systemSettingsService } from '../services/supabase';
import {
  CROSS_BORDER_ROUTE_HUBS,
  buildRouteMatrixPayload,
  emptyRouteMatrix,
  mergeRouteMatrixFromDb,
  parseRouteMatrixForSave,
  routeHubDisplay,
  type RouteMatrixValues,
} from '../utils/crossBorderRoutePricing';
import '../styles/adminSystemSettings.css';
import '../styles/crossBorderLogistics.css';

type Props = {
  open: boolean;
  onClose: () => void;
};

const CrossBorderPricingModal: React.FC<Props> = ({ open, onClose }) => {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const [matrix, setMatrix] = useState<RouteMatrixValues>(() => emptyRouteMatrix());
  const [filterOrigin, setFilterOrigin] = useState<string>('ALL');
  const [loadedSettings, setLoadedSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  const visibleOrigins = useMemo(
    () =>
      filterOrigin === 'ALL'
        ? CROSS_BORDER_ROUTE_HUBS
        : CROSS_BORDER_ROUTE_HUBS.filter((h) => h.code === filterOrigin),
    [filterOrigin],
  );

  const configuredCount = useMemo(() => {
    let count = 0;
    for (const origin of CROSS_BORDER_ROUTE_HUBS) {
      for (const dest of CROSS_BORDER_ROUTE_HUBS) {
        if (origin.code === dest.code) continue;
        const raw = matrix[origin.code]?.[dest.code] ?? '';
        if (String(raw).trim()) count += 1;
      }
    }
    return count;
  }, [matrix]);

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
    if (!open) return;
    void loadSettings();
  }, [open, loadSettings]);

  useEffect(() => {
    if (!open) return;
    setMatrix(mergeRouteMatrixFromDb(loadedSettings));
    setHasChanges(false);
  }, [open, loadedSettings]);

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
      const parsed = parseRouteMatrixForSave(matrix);
      if (!parsed.ok) {
        setErrorMessage(isEn ? parsed.messageEn : parsed.message);
        return;
      }

      const payload = buildRouteMatrixPayload(matrix);
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
      setMatrix(mergeRouteMatrixFromDb(refreshed));
      setHasChanges(false);
      setSuccessMessage(
        isEn
          ? `Route pricing saved (${payload.length} routes).`
          : `路线计费已保存（${payload.length} 条路线）。`,
      );
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
        className="store-form-overlay cbl-create-overlay"
        role="presentation"
        onClick={(e) => {
          if (e.target === e.currentTarget && !saving) onClose();
        }}
      >
        <div
          className="cbl-pricing-modal cbl-pricing-modal--route-matrix"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cbl-pricing-title"
        >
          <header className="cbl-pricing-modal__head">
            <div>
              <h2 id="cbl-pricing-title" className="cbl-pricing-modal__title">
                {isEn ? 'Cross-border pricing' : '跨境计费'}
              </h2>
              <p className="cbl-pricing-modal__sub">
                {isEn
                  ? 'Set per-kg rate (MMK/kg) for each origin → destination. Inventory inbound fee = rate × weight.'
                  : '按「发站 → 终点」配置每公斤单价 (MMK/kg)。Inventory 入库总费用 = 对应路线单价 × 重量。'}
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
            <span className="cbl-pricing-modal__stat">
              {isEn
                ? `${configuredCount} routes configured`
                : `已配置 ${configuredCount} 条路线`}
            </span>
          </div>

          <div className="sys-settings__section-banner sys-settings__section-banner--cross-border cbl-pricing-modal__banner">
            <h3>
              <span>🌏</span> {isEn ? 'Route matrix (MMK/kg)' : '路线单价矩阵 (MMK/kg)'}
            </h3>
            <p>
              {isEn ? (
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
                    {CROSS_BORDER_ROUTE_HUBS.map((dest) => (
                      <th key={dest.code} title={isEn ? dest.labelEn : dest.labelZh}>
                        {dest.display}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleOrigins.map((origin) => (
                    <tr key={origin.code}>
                      <th className="cbl-pricing-modal__matrix-origin" title={isEn ? origin.labelEn : origin.labelZh}>
                        {origin.display}
                      </th>
                      {CROSS_BORDER_ROUTE_HUBS.map((dest) => {
                        if (origin.code === dest.code) {
                          return (
                            <td key={dest.code} className="cbl-pricing-modal__matrix-self">
                              —
                            </td>
                          );
                        }
                        return (
                          <td key={dest.code}>
                            <input
                              className="cbl-pricing-modal__matrix-input"
                              type="number"
                              min={0}
                              step={1}
                              inputMode="numeric"
                              value={matrix[origin.code]?.[dest.code] ?? ''}
                              onChange={(e) => handleCellChange(origin.code, dest.code, e.target.value)}
                              disabled={saving}
                              aria-label={`${routeHubDisplay(origin.code)} → ${routeHubDisplay(dest.code)}`}
                              placeholder="—"
                            />
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
            ? 'Changing route pricing affects Inventory inbound fees. Verify your admin password.'
            : '修改路线计费将影响 Inventory 入库费用，请验证管理员密码以确认。'
        }
      />
    </>,
    document.body,
  );
};

export default CrossBorderPricingModal;
