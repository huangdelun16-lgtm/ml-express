import React, { useState } from 'react';
import { rewritePublicStorageUrl } from '../utils/supabaseBrowserUrl';

function isPdfUrl(url: string) {
  return /\.pdf($|\?)/i.test(url);
}

export function merchantLicenseFileName(url: string, index: number) {
  try {
    const name = decodeURIComponent(url.split('/').pop()?.split('?')[0] || '');
    if (name && name.length > 2) return name;
  } catch {
    /* ignore */
  }
  return `document-${index + 1}`;
}

export default function MerchantLicenseDocCard({
  url,
  index,
  isEn,
  onOpen,
  label,
}: {
  url: string;
  index: number;
  isEn: boolean;
  onOpen: (previewUrl: string) => void;
  label?: string;
}) {
  const [failed, setFailed] = useState(false);
  const pdf = isPdfUrl(url);
  const name = merchantLicenseFileName(url, index);
  const previewUrl = rewritePublicStorageUrl(url);
  const displayName = label || name;

  return (
    <article className="merchant-apps-doc">
      {pdf ? (
        <a
          className="merchant-apps-doc__thumb"
          href={previewUrl}
          target="_blank"
          rel="noreferrer noopener"
        >
          <span className="merchant-apps-doc__pdf">PDF</span>
        </a>
      ) : failed ? (
        <div className="merchant-apps-doc__thumb merchant-apps-doc__thumb--failed">
          <span>{isEn ? 'Preview unavailable' : '无法预览'}</span>
        </div>
      ) : (
        <button
          type="button"
          className="merchant-apps-doc__thumb merchant-apps-doc__thumb--btn"
          onClick={() => onOpen(previewUrl)}
        >
          <img src={previewUrl} alt={displayName} loading="lazy" onError={() => setFailed(true)} />
        </button>
      )}
      <span className="merchant-apps-doc__label" title={displayName}>
        {displayName}
      </span>
      <div className="merchant-apps-doc__actions">
        <a href={previewUrl} target="_blank" rel="noreferrer noopener">
          {isEn ? 'Open' : '新窗口打开'}
        </a>
        <a href={previewUrl} download={name} target="_blank" rel="noreferrer noopener">
          {isEn ? 'Download original' : '下载原件'}
        </a>
      </div>
    </article>
  );
}
