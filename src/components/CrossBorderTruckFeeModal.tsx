import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../contexts/LanguageContext';
import SecurityVerificationModal from './SecurityVerificationModal';
import { systemSettingsService } from '../services/supabase';
import {
  TRUCK_FEE_HUBS,
  TRUCK_FEE_KEY_PREFIX,
  planTruckFeeSave,
  truckFeeDraftFromSettings,
  type TruckFeeDraft,
} from '../utils/inventoryTruckRouteSettings';
import '../styles/adminSystemSettings.css';
import '../styles/crossBorderLogistics.css';

type Props = {
  open: boolean;
  onClose: () => void;
};

const CrossBorderTruckFeeModal: React.FC<Props> = ({ open, onClose }) => {
  const { language } = useLanguage();
  const isEn = language === 'en';
  const [origin, setOrigin] = useState(TRUCK_FEE_HUBS[0].code);
  const [draft, setDraft] = useState<TruckFeeDraft>({});
  const [savedKeys, setSavedKeys] = useState<string[]>([]);
  const [baseline, setBaseline] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const rows = await systemSettingsService.getSettingsByKeyPrefix(TRUCK_FEE_KEY_PREFIX);
      const next = truckFeeDraftFromSettings(rows);
      setDraft(next.draft);
      setSavedKeys(next.keys);
      setBaseline(JSON.stringify(next.draft));
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setErrorMessage(
        isEn
          ? `Failed to load truck fees.${msg ? ` ${msg}` : ''}`
          : `加载装车车费失败${msg ? `：${msg}` : '，请检查网络后重试。'}`,
      );
    } finally {
      setLoading(false);
    }
  }, [isEn]);

  useEffect(() => {
    if (!open) {
      setSuccessMessage(null);
      setErrorMessage(null);
      return;
    }
    void load();
  }, [open, load]);

  const destinations = useMemo(
    () => TRUCK_FEE_HUBS.filter((hub) => hub.code !== origin),
    [origin],
  );
  const hasChanges = JSON.stringify(draft) !== baseline;
  const filledCount = useMemo(() => {
    let count = 0;
    for (const from of TRUCK_FEE_HUBS) {
      for (const to of TRUCK_FEE_HUBS) {
        if (from.code === to.code) continue;
        if (String(draft[from.code]?.[to.code] ?? '').trim()) count += 1;
      }
    }
    return count;
  }, [draft]);

  const executeSave = async () => {
    const plan = planTruckFeeSave(draft, savedKeys);
    if (!plan.ok) {
      setErrorMessage(isEn ? plan.messageEn : plan.message);
      return;
    }
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const payload = plan.upserts.flatMap((row) =>
        row.keys.map((key) => ({
          category: 'inventory',
          settings_key: key,
          settings_value: row.amount,
          description: `${row.origin} → ${row.destination} truck fee (MMK)`,
          updated_by: 'admin-dashboard',
        })),
      );
      if (payload.length) {
        const saved = await systemSettingsService.upsertSettings(payload);
        if (!saved.ok) {
          setErrorMessage(
            isEn
              ? `Save failed.${saved.error ? ` ${saved.error}` : ''}`
              : `保存失败${saved.error ? `：${saved.error}` : ''}`,
          );
          return;
        }
      }
      if (plan.deleteKeys.length) {
        const removed = await systemSettingsService.deleteSettingsByKeys(plan.deleteKeys);
        if (!removed.ok) {
          setErrorMessage(
            isEn
              ? `Saved new fees, but clearing old routes failed.${removed.error ? ` ${removed.error}` : ''}`
              : `新车费已保存，但清空旧路线失败${removed.error ? `：${removed.error}` : ''}`,
          );
          return;
        }
      }
      await load();
      setSuccessMessage(isEn ? 'Truck fees saved. Inventory will use them on the next load.' : '装车车费已保存。库存 App 下次装车会读到。');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <>
      <div
        className="store-form-overlay cbl-create-overlay"
        role="presentation"
        onClick={(event) => {
          if (event.target === event.currentTarget && !saving) onClose();
        }}
      >
        <div
          className="cbl-pricing-modal cbl-pricing-modal--dest-focus"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cbl-truck-fee-title"
        >
          <header className="cbl-pricing-modal__head">
            <div>
              <h2 id="cbl-truck-fee-title" className="cbl-pricing-modal__title">
                {isEn ? 'Truck route fees' : '装车车费'}
              </h2>
              <p className="cbl-pricing-modal__sub">
                {isEn
                  ? 'MMK per truck load. Inventory fills this when a station loads a truck. Leave blank if that route has no fixed fee. 0 means free.'
                  : '每车缅币。库存装车时会自动带出。留空表示这条路线不固定车费，填 0 表示免费。'}
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
          <div className="cbl-pricing-modal__toolbar">
            <label className="cbl-pricing-modal__filter">
              <span>{isEn ? 'From' : '发站'}</span>
              <select value={origin} onChange={(event) => setOrigin(event.target.value)} disabled={loading || saving}>
                {TRUCK_FEE_HUBS.map((hub) => (
                  <option key={hub.code} value={hub.code}>
                    {isEn ? hub.labelEn : hub.labelZh} · {hub.code}
                  </option>
                ))}
              </select>
            </label>
            <span className="cbl-pricing-modal__stat">
              {isEn ? `${filledCount} routes set` : `已设置 ${filledCount} 条`}
            </span>
          </div>
          {(errorMessage || successMessage) && (
            <p
              className={`cbl-pricing-modal__alert ${
                errorMessage ? 'cbl-pricing-modal__alert--error' : 'cbl-pricing-modal__alert--ok'
              }`}
            >
              {errorMessage || successMessage}
            </p>
          )}
          <div className="cbl-pricing-modal__matrix-wrap">
            {loading ? (
              <p className="cbl-pricing-modal__loading">{isEn ? 'Loading…' : '加载中…'}</p>
            ) : (
              <div className="cbl-truck-fee-list">
                {destinations.map((dest) => (
                  <label key={dest.code} className="cbl-truck-fee-row">
                    <span>
                      {isEn ? dest.labelEn : dest.labelZh}
                      <small>{dest.code}</small>
                    </span>
                    <input
                      inputMode="decimal"
                      value={draft[origin]?.[dest.code] ?? ''}
                      placeholder={isEn ? 'MMK' : '缅币'}
                      disabled={saving}
                      onChange={(event) => {
                        const value = event.target.value;
                        setDraft((prev) => ({
                          ...prev,
                          [origin]: { ...prev[origin], [dest.code]: value },
                        }));
                        setSuccessMessage(null);
                        setErrorMessage(null);
                      }}
                    />
                  </label>
                ))}
              </div>
            )}
          </div>
          <footer className="cbl-pricing-modal__foot">
            <button type="button" className="cbl-btn" onClick={onClose} disabled={saving}>
              {isEn ? 'Close' : '关闭'}
            </button>
            <button
              type="button"
              className="cbl-btn cbl-btn--primary"
              disabled={!hasChanges || saving || loading}
              onClick={() => setShowVerificationModal(true)}
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
      />
    </>,
    document.body,
  );
};

export default CrossBorderTruckFeeModal;
