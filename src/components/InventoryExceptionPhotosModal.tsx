import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  closeInventoryException,
  type InventoryExceptionCloseStatus,
  type InventoryExceptionConsoleRow,
} from '../services/inventoryConsoleService';
import '../styles/crossBorderLogistics.css';

type Props = {
  open: boolean;
  row: InventoryExceptionConsoleRow | null;
  isEn: boolean;
  typeLabel: string;
  onClose: () => void;
  onClosed?: (row: InventoryExceptionConsoleRow) => void;
};

const InventoryExceptionPhotosModal: React.FC<Props> = ({
  open,
  row,
  isEn,
  typeLabel,
  onClose,
  onClosed,
}) => {
  const [enlargedUrl, setEnlargedUrl] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState('');
  const [busyStatus, setBusyStatus] = useState<InventoryExceptionCloseStatus | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setEnlargedUrl(null);
      setResolveNote('');
      setBusyStatus(null);
      setError('');
    }
  }, [open]);

  if (!open || !row) return null;

  const photos = row.photos ?? [];
  const barcode = row.express_barcode || row.item_barcode;
  const canClose = row.status === 'open';
  const busy = busyStatus != null;

  const handleCloseException = async (status: InventoryExceptionCloseStatus) => {
    if (!canClose || busy) return;
    setBusyStatus(status);
    setError('');
    try {
      const updated = await closeInventoryException({
        id: row.id,
        status,
        resolveNote,
      });
      onClosed?.(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : isEn ? 'Close failed' : '关单失败');
    } finally {
      setBusyStatus(null);
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
        className="cbl-pricing-modal cbl-exception-photos-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cbl-exception-photos-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="cbl-pricing-modal__head">
          <div>
            <h2 id="cbl-exception-photos-title" className="cbl-pricing-modal__title">
              {isEn ? 'Exception review' : '异常件处理'}
            </h2>
            <p className="cbl-pricing-modal__sub">
              {typeLabel}
              {barcode ? ` · ${barcode}` : ''}
              {row.reported_store_code ? ` · ${row.reported_store_code}` : ''}
            </p>
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

        <div className="cbl-exception-photos-modal__body">
          {row.note ? <p className="cbl-exception-photos-modal__note">{row.note}</p> : null}
          {photos.length === 0 ? (
            <div className="cbl-empty">
              {isEn ? 'No on-site photos were uploaded.' : '该异常件未上传现场照片。'}
            </div>
          ) : (
            <div className="cbl-exception-photos-grid">
              {photos.map((photo, index) => (
                <button
                  key={photo.id || `${photo.public_url}-${index}`}
                  type="button"
                  className="cbl-exception-photos-grid__item"
                  onClick={() => setEnlargedUrl(photo.public_url)}
                >
                  <img
                    src={photo.public_url}
                    alt={isEn ? `Exception photo ${index + 1}` : `现场照片 ${index + 1}`}
                  />
                </button>
              ))}
            </div>
          )}

          {canClose ? (
            <label className="cbl-exception-close-field">
              <span>{isEn ? 'HQ note (optional)' : '总部备注（可选）'}</span>
              <textarea
                rows={2}
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
                disabled={busy}
                placeholder={
                  isEn
                    ? 'Visible to station staff after close'
                    : '关单后站点 App 可见'
                }
              />
            </label>
          ) : null}

          {error ? (
            <div className="cbl-pricing-modal__alert cbl-pricing-modal__alert--error">{error}</div>
          ) : null}
        </div>

        {canClose ? (
          <footer className="cbl-pricing-modal__foot cbl-exception-close-foot">
            <button
              type="button"
              className="cbl-btn cbl-btn--danger-outline"
              disabled={busy}
              onClick={() => void handleCloseException('cancelled')}
            >
              {busyStatus === 'cancelled'
                ? isEn
                  ? 'Rejecting…'
                  : '驳回中…'
                : isEn
                  ? 'Reject'
                  : '驳回'}
            </button>
            <button
              type="button"
              className="cbl-btn cbl-btn--primary"
              disabled={busy}
              onClick={() => void handleCloseException('resolved')}
            >
              {busyStatus === 'resolved'
                ? isEn
                  ? 'Closing…'
                  : '关单中…'
                : isEn
                  ? 'Mark resolved'
                  : '关单'}
            </button>
          </footer>
        ) : null}
      </div>

      {enlargedUrl ? (
        <div
          className="cbl-exception-photo-lightbox"
          role="presentation"
          onClick={() => setEnlargedUrl(null)}
        >
          <img src={enlargedUrl} alt={isEn ? 'Exception photo' : '现场照片'} />
        </div>
      ) : null}
    </div>,
    document.body,
  );
};

export default InventoryExceptionPhotosModal;
