import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  clearInventoryTrip,
  previewInventoryTripClear,
  type InventoryTripClearPreview,
} from '../services/inventoryConsoleService';

type Props = {
  open: boolean;
  onClose: () => void;
  onCleared: (message: string) => void;
  isEn: boolean;
};

const CrossBorderClearTripModal: React.FC<Props> = ({ open, onClose, onCleared, isEn }) => {
  const [tripNumber, setTripNumber] = useState('');
  const [confirmTripNumber, setConfirmTripNumber] = useState('');
  const [password, setPassword] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [preview, setPreview] = useState<InventoryTripClearPreview | null>(null);
  const [previewTrip, setPreviewTrip] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setTripNumber('');
      setConfirmTripNumber('');
      setPassword('');
      setAcknowledged(false);
      setPreview(null);
      setPreviewTrip('');
      setBusy(false);
      setError('');
    }
  }, [open]);

  if (!open) return null;

  const t = isEn
    ? {
        title: 'Clear one truck trip',
        sub: 'Deletes the packs on this trip, every order inside those packs, their inbound records, and this trip’s truck-fee payment. Orders on any other trip stay.',
        trip: 'Trip number',
        tripHint: 'Example: MSE0007',
        lookup: 'Preview',
        looking: 'Looking up…',
        empty: 'No packs found for this trip.',
        packs: 'Packs',
        orders: 'Orders',
        kept: 'Left in place because they are already on another trip',
        password: 'Your admin password',
        confirm: 'Type the trip number again',
        ack: 'I understand only this trip is deleted and it cannot be undone',
        cancel: 'Cancel',
        submit: 'Delete this trip',
        submitting: 'Deleting…',
        adminOnly: 'Admin role only',
      }
    : {
        title: '清空指定车次',
        sub: '只删除这一车次上的包装、包里的全部订单、这些订单的入库记录，以及这一趟的车费付款。其他车次上的订单不会动。',
        trip: '车次号',
        tripHint: '例如 MSE0007',
        lookup: '查看这趟车',
        looking: '查询中…',
        empty: '没有找到这个车次。',
        packs: '包装',
        orders: '订单',
        kept: '已装到其他车次，因此保留',
        password: '当前 Admin 登录密码',
        confirm: '再输入一次车次号',
        ack: '我已了解只删除这一车次，且不可恢复',
        cancel: '取消',
        submit: '确认清空这一车次',
        submitting: '清空中…',
        adminOnly: '仅 admin 账号可执行',
      };

  const typedTrip = tripNumber.trim().toUpperCase();
  const previewMatches = Boolean(preview && previewTrip === typedTrip && preview.packCount > 0);
  const canSubmit =
    previewMatches &&
    acknowledged &&
    password.length >= 1 &&
    confirmTripNumber.trim().toUpperCase() === typedTrip &&
    !busy;

  const handlePreview = async () => {
    setBusy(true);
    setError('');
    setPreview(null);
    setPreviewTrip('');
    try {
      const result = await previewInventoryTripClear(tripNumber);
      setPreview(result);
      setPreviewTrip(result.tripNumber);
    } catch (err) {
      setError(err instanceof Error ? err.message : isEn ? 'Lookup failed' : '查询失败');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || !preview) return;
    setBusy(true);
    setError('');
    try {
      const result = await clearInventoryTrip(preview.tripNumber, password, confirmTripNumber);
      onCleared(result.message || (isEn ? `Trip ${preview.tripNumber} cleared.` : `车次 ${preview.tripNumber} 已清空。`));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : isEn ? 'Delete failed' : '清空失败');
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div
      className="store-form-overlay cbl-create-overlay cbl-create-overlay--dialog"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        className="cbl-pricing-modal cbl-clear-test-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cbl-clear-trip-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="cbl-pricing-modal__head">
          <div>
            <h2 id="cbl-clear-trip-title" className="cbl-pricing-modal__title">
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

        <form className="cbl-manual-entry-form" onSubmit={(event) => void handleSubmit(event)}>
          <label className="cbl-manual-entry-field">
            <span>{t.trip}</span>
            <span className="cbl-clear-test-modal__hint">{t.tripHint}</span>
            <input
              type="text"
              value={tripNumber}
              onChange={(event) => {
                setTripNumber(event.target.value.toUpperCase());
                setPreview(null);
                setPreviewTrip('');
                setError('');
              }}
              disabled={busy}
              placeholder="MSE0007"
              autoCapitalize="characters"
            />
          </label>
          <div className="cbl-pricing-modal__foot">
            <button
              type="button"
              className="cbl-btn"
              disabled={busy || typedTrip.length < 7}
              onClick={() => void handlePreview()}
            >
              {busy && !preview ? t.looking : t.lookup}
            </button>
          </div>

          {preview && previewTrip === typedTrip ? (
            preview.packCount > 0 ? (
              <div className="cbl-clear-trip-preview">
                <strong>
                  {preview.tripNumber} · {t.packs} {preview.packCount} · {t.orders} {preview.orderCount}
                </strong>
                <ul>
                  {preview.packs.map((pack) => (
                    <li key={pack.packBarcode}>
                      {pack.packBarcode}
                      {pack.route ? ` · ${pack.route}` : ''}
                      {pack.itemCount ? ` · ${pack.itemCount}` : ''}
                    </li>
                  ))}
                </ul>
                {preview.orderSamples.length ? <p>{preview.orderSamples.join('、')}</p> : null}
                {preview.keptOnOtherTrip > 0 ? (
                  <p>
                    {t.kept}: {preview.keptOnOtherTrip}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="cbl-pricing-modal__alert cbl-pricing-modal__alert--error">{t.empty}</div>
            )
          ) : null}

          {previewMatches ? (
            <>
              <label className="cbl-manual-entry-field">
                <span>{t.password}</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={busy}
                />
              </label>
              <label className="cbl-manual-entry-field">
                <span>{t.confirm}</span>
                <input
                  type="text"
                  value={confirmTripNumber}
                  onChange={(event) => setConfirmTripNumber(event.target.value.toUpperCase())}
                  disabled={busy}
                  placeholder={preview?.tripNumber}
                />
              </label>
              <label className="cbl-clear-test-modal__ack">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(event) => setAcknowledged(event.target.checked)}
                  disabled={busy}
                />
                <span>{t.ack}</span>
              </label>
            </>
          ) : null}

          {error ? (
            <div className="cbl-pricing-modal__alert cbl-pricing-modal__alert--error">{error}</div>
          ) : null}

          <footer className="cbl-pricing-modal__foot">
            <button type="button" className="cbl-btn cbl-btn--light" disabled={busy} onClick={onClose}>
              {t.cancel}
            </button>
            <button type="submit" className="cbl-btn cbl-btn--danger-solid" disabled={!canSubmit}>
              {busy && previewMatches ? t.submitting : t.submit}
            </button>
          </footer>
        </form>
      </div>
    </div>,
    document.body,
  );
};

export default CrossBorderClearTripModal;
