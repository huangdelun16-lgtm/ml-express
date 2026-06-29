import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../contexts/LanguageContext';
import SecurityVerificationModal from './SecurityVerificationModal';
import { SystemSetting, systemSettingsService } from '../services/supabase';
import {
  CROSS_BORDER_PRICING_FIELDS,
  CROSS_BORDER_PRICING_REGIONS,
  buildCrossBorderPricingPayload,
  defaultCrossBorderPricingValues,
  mergeCrossBorderSettingsFromDb,
  regionDisplayName,
  type CrossBorderPricingFieldKey,
} from '../utils/crossBorderPricingSettings';
import '../styles/adminSystemSettings.css';
import '../styles/crossBorderLogistics.css';

type Props = {
  open: boolean;
  onClose: () => void;
};

const CrossBorderPricingModal: React.FC<Props> = ({ open, onClose }) => {
  const { language } = useLanguage();
  const isEn = language === 'en';

  const [selectedRegion, setSelectedRegion] = useState('mandalay');
  const [values, setValues] = useState(defaultCrossBorderPricingValues());
  const [loadedSettings, setLoadedSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

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
    if (!open || loadedSettings.length === 0) return;
    setValues(mergeCrossBorderSettingsFromDb(loadedSettings, selectedRegion));
    setHasChanges(false);
  }, [open, selectedRegion, loadedSettings]);

  const handleValueChange = (key: CrossBorderPricingFieldKey, raw: string) => {
    setValues((prev) => ({ ...prev, [key]: raw as unknown as number }));
    setHasChanges(true);
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const executeSave = async () => {
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const parsed = defaultCrossBorderPricingValues();
      for (const def of CROSS_BORDER_PRICING_FIELDS) {
        const numeric = Number(values[def.key]);
        if (!Number.isFinite(numeric)) {
          setErrorMessage(
            isEn
              ? `"${def.labelEn}" must be a number.`
              : `字段「${def.label}」需要填写数字。`,
          );
          return;
        }
        parsed[def.key] = numeric;
      }

      const payload = buildCrossBorderPricingPayload(parsed, selectedRegion);
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
      setValues(mergeCrossBorderSettingsFromDb(refreshed, selectedRegion));
      setHasChanges(false);
      setSuccessMessage(isEn ? 'Pricing saved.' : '跨境计费已保存。');
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
          className="cbl-pricing-modal"
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
                  ? 'Inventory App inbound fee rules by region.'
                  : '按领区配置 Inventory App 入库「费用计算」总费用。'}
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

          <div className="cbl-pricing-modal__region">
            <label htmlFor="cbl-pricing-region">
              {isEn ? 'Pricing region' : '计费领区'}
            </label>
            <select
              id="cbl-pricing-region"
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              disabled={loading || saving}
            >
              {CROSS_BORDER_PRICING_REGIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {isEn ? r.nameEn : r.name} ({r.prefix})
                </option>
              ))}
            </select>
          </div>

          <div className="sys-settings__section-banner sys-settings__section-banner--cross-border cbl-pricing-modal__banner">
            <h3>
              <span>🌏</span> {isEn ? 'Cross-border logistics' : '跨境物流'}
            </h3>
            <p>
              {isEn ? (
                <>
                  Controls the <strong>total fee</strong> in Inventory inbound step 3 (not local
                  errand pricing). Region:{' '}
                  <strong>{regionDisplayName(selectedRegion, true)}</strong>. Pull to refresh in
                  App or re-enter inbound step 3 after save.
                </>
              ) : (
                <>
                  控制 Inventory App 入库页「费用计算」中的<strong>总费用</strong>（与同城跑腿计费无关）。
                  当前领区：
                  <strong> {regionDisplayName(selectedRegion)}</strong>
                  。保存后 App 下拉同步或重新进入入库第三步即可生效。
                </>
              )}
            </p>
          </div>

          {loading ? (
            <div className="cbl-pricing-modal__loading">
              {isEn ? 'Loading…' : '加载中…'}
            </div>
          ) : (
            <div className="cbl-pricing-modal__grid">
              {CROSS_BORDER_PRICING_FIELDS.map((def) => (
                <div key={def.key} className="sys-settings__card">
                  <div className="sys-settings__card-head">
                    <div>
                      <h3 className="sys-settings__card-title">
                        {isEn ? def.labelEn : def.label}
                      </h3>
                      <p className="sys-settings__card-desc">
                        {isEn ? def.descriptionEn : def.description}
                      </p>
                    </div>
                    <div className="sys-settings__suffix">
                      {isEn ? def.suffixEn ?? def.suffix : def.suffix}
                    </div>
                  </div>
                  <input
                    className="sys-settings__input"
                    type="number"
                    value={String(values[def.key] ?? '')}
                    onChange={(e) => handleValueChange(def.key, e.target.value)}
                    disabled={saving}
                  />
                  {(def.helpText || def.helpTextEn) && (
                    <div className="sys-settings__help">
                      <span>💡</span>
                      <span>{isEn ? def.helpTextEn ?? def.helpText : def.helpText}</span>
                    </div>
                  )}
                </div>
              ))}
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
            ? 'Changing cross-border pricing affects Inventory inbound fees. Verify your admin password.'
            : '修改跨境计费将影响 Inventory 入库费用，请验证管理员密码以确认。'
        }
      />
    </>,
    document.body,
  );
};

export default CrossBorderPricingModal;
