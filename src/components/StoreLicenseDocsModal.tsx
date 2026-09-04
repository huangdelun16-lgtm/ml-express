import React, { useState } from 'react';
import MerchantLicenseDocCard from './MerchantLicenseDocCard';
import { rewritePublicStorageUrl } from '../utils/supabaseBrowserUrl';

export default function StoreLicenseDocsModal({
  storeName,
  urls,
  loading,
  error,
  isEn,
  onClose,
}: {
  storeName: string;
  urls: string[];
  loading: boolean;
  error: string | null;
  isEn: boolean;
  onClose: () => void;
}) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  return (
    <>
      <div
        className="merchant-apps-modal-overlay"
        role="presentation"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className="merchant-apps-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="store-license-docs-title"
          style={{ width: 'min(720px, 100%)', maxHeight: 'min(88vh, 820px)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <header className="merchant-apps-modal__head">
            <div className="merchant-apps-modal__head-main">
              <div className="merchant-apps-modal__title-row">
                <h2 id="store-license-docs-title" className="merchant-apps-modal__title">
                  {isEn ? 'Onboarding documents' : '入驻证件'}
                </h2>
              </div>
              <div className="merchant-apps-modal__meta">
                <span>{storeName}</span>
                {!loading && !error && (
                  <span>
                    {isEn
                      ? `${urls.length} file${urls.length === 1 ? '' : 's'}`
                      : `共 ${urls.length} 张`}
                  </span>
                )}
              </div>
            </div>
            <button type="button" className="merchant-apps-modal__close" onClick={onClose} aria-label={isEn ? 'Close' : '关闭'}>
              ×
            </button>
          </header>
          <div className="merchant-apps-modal__body">
            {loading && (
              <p className="merchant-apps-docs-hint">{isEn ? 'Loading documents…' : '正在加载证件…'}</p>
            )}
            {!loading && error && (
              <p className="merchant-apps-docs-hint" role="alert">{error}</p>
            )}
            {!loading && !error && urls.length === 0 && (
              <p className="merchant-apps-docs-hint">
                {isEn
                  ? 'This store has no onboarding documents on file.'
                  : '该店铺没有入驻时上传的证件。'}
              </p>
            )}
            {!loading && !error && urls.length > 0 && (
              <div className="merchant-apps-docs">
                {urls.map((url, index) => (
                  <MerchantLicenseDocCard
                    key={`${url}-${index}`}
                    url={url}
                    index={index}
                    isEn={isEn}
                    label={isEn ? `Document ${index + 1}` : `证件 ${index + 1}`}
                    onOpen={setLightboxUrl}
                  />
                ))}
              </div>
            )}
          </div>
          <footer className="merchant-apps-modal__foot">
            <button type="button" className="merchant-apps-btn merchant-apps-btn--ghost" onClick={onClose}>
              {isEn ? 'Close' : '关闭'}
            </button>
          </footer>
        </div>
      </div>
      {lightboxUrl && (
        <div
          className="merchant-apps-lightbox"
          role="presentation"
          onClick={() => setLightboxUrl(null)}
        >
          <img src={rewritePublicStorageUrl(lightboxUrl)} alt="" />
        </div>
      )}
    </>
  );
}
