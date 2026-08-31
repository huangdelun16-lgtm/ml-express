import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { InventoryExceptionConsoleRow } from '../services/inventoryConsoleService';
import '../styles/crossBorderLogistics.css';

type Props = {
  open: boolean;
  row: InventoryExceptionConsoleRow | null;
  isEn: boolean;
  typeLabel: string;
  onClose: () => void;
};

const InventoryExceptionPhotosModal: React.FC<Props> = ({
  open,
  row,
  isEn,
  typeLabel,
  onClose,
}) => {
  const [enlargedUrl, setEnlargedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) setEnlargedUrl(null);
  }, [open]);

  if (!open || !row) return null;

  const photos = row.photos ?? [];
  const barcode = row.express_barcode || row.item_barcode;

  return createPortal(
    <div
      className="store-form-overlay cbl-create-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
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
              {isEn ? 'Exception photos' : '异常件现场照片'}
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
        </div>
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
