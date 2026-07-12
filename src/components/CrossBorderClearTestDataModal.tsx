import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  clearInventoryTestData,
  INVENTORY_TEST_DATA_CONFIRM_PHRASE,
} from '../services/inventoryConsoleService';
import '../styles/crossBorderLogistics.css';

type Props = {
  open: boolean;
  onClose: () => void;
  onCleared: () => void;
  isEn: boolean;
};

const CrossBorderClearTestDataModal: React.FC<Props> = ({ open, onClose, onCleared, isEn }) => {
  const [password, setPassword] = useState('');
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setPassword('');
      setConfirmPhrase('');
      setAcknowledged(false);
      setError('');
      setBusy(false);
    }
  }, [open]);

  if (!open) return null;

  const t = isEn
    ? {
        title: 'Clear inventory test data',
        sub: 'Permanently removes all cross-border cloud data: express orders, packs, hub sign-off, in-transit tracking, ledger movements, and finance entries. Transit accounts are kept. Inventory App (APK/Expo) clears matching local data on next sync.',
        password: 'Your admin password',
        confirmLabel: 'Confirmation phrase',
        confirmHint: `Type exactly: ${INVENTORY_TEST_DATA_CONFIRM_PHRASE}`,
        ack: 'I understand this cannot be undone',
        cancel: 'Cancel',
        submit: 'Delete all test data',
        submitting: 'Deleting…',
        adminOnly: 'Admin role only',
      }
    : {
        title: '清空 Inventory 测试数据',
        sub: '将永久删除云端全部跨境数据：快递明细、包装、到站签收、在途追踪、流水、跨境会计（含手工账目）。不会删除中转站账号。各 Inventory App（APK/Expo）在「设置 → 立即同步」后会自动清理本机对应数据。',
        password: '当前 Admin 登录密码',
        confirmLabel: '确认短语',
        confirmHint: `请准确输入：${INVENTORY_TEST_DATA_CONFIRM_PHRASE}`,
        ack: '我已了解此操作不可恢复',
        cancel: '取消',
        submit: '确认清空',
        submitting: '清空中…',
        adminOnly: '仅 admin 账号可执行',
      };

  const phraseOk = confirmPhrase.trim() === INVENTORY_TEST_DATA_CONFIRM_PHRASE;
  const canSubmit = acknowledged && phraseOk && password.length >= 1 && !busy;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError('');
    try {
      await clearInventoryTestData(password, confirmPhrase.trim());
      onCleared();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : isEn ? 'Delete failed' : '清空失败');
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div
      className="store-form-overlay cbl-create-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        className="cbl-pricing-modal cbl-clear-test-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cbl-clear-test-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="cbl-pricing-modal__head">
          <div>
            <h2 id="cbl-clear-test-title" className="cbl-pricing-modal__title">
              {t.title}
            </h2>
            <p className="cbl-pricing-modal__sub">{t.sub}</p>
            <p className="cbl-clear-test-modal__warn">{t.adminOnly}</p>
          </div>
          <button
            type="button"
            className="cbl-pricing-modal__close"
            onClick={onClose}
            disabled={busy}
            aria-label={isEn ? 'Close' : '关闭'}
          >
            ✕
          </button>
        </header>

        <form className="cbl-manual-entry-form" onSubmit={(e) => void handleSubmit(e)}>
          <label className="cbl-manual-entry-field">
            <span>{t.password}</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
            />
          </label>

          <label className="cbl-manual-entry-field">
            <span>{t.confirmLabel}</span>
            <span className="cbl-clear-test-modal__hint">{t.confirmHint}</span>
            <input
              type="text"
              value={confirmPhrase}
              onChange={(e) => setConfirmPhrase(e.target.value)}
              disabled={busy}
              placeholder={INVENTORY_TEST_DATA_CONFIRM_PHRASE}
            />
          </label>

          <label className="cbl-clear-test-modal__ack">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              disabled={busy}
            />
            <span>{t.ack}</span>
          </label>

          {error ? (
            <div className="cbl-pricing-modal__alert cbl-pricing-modal__alert--error">{error}</div>
          ) : null}

          <footer className="cbl-pricing-modal__foot">
            <button type="button" className="cbl-btn cbl-btn--light" disabled={busy} onClick={onClose}>
              {t.cancel}
            </button>
            <button type="submit" className="cbl-btn cbl-btn--danger-solid" disabled={!canSubmit}>
              {busy ? t.submitting : t.submit}
            </button>
          </footer>
        </form>
      </div>
    </div>,
    document.body,
  );
};

export default CrossBorderClearTestDataModal;
