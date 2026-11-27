import React, { useRef } from 'react';
import StorageImg from './StorageImg';
import { MAX_PRODUCT_GALLERY_IMAGES } from '../services/_shared/productReview';

type ProductPhotoGridProps = {
  urls: string[];
  uploading: boolean;
  language: string;
  onFiles: (files: File[]) => void;
  onRemove: (index: number) => void;
  onMakeCover: (index: number) => void;
};

export default function ProductPhotoGrid({
  urls,
  uploading,
  language,
  onFiles,
  onRemove,
  onMakeCover,
}: ProductPhotoGridProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const zh = language === 'zh';
  const full = urls.length >= MAX_PRODUCT_GALLERY_IMAGES;
  const coverLabel = language === 'zh' ? '封面' : language === 'my' ? 'မျက်နှာဖုံး' : 'Cover';
  const makeCoverLabel = language === 'zh' ? '设为封面' : language === 'my' ? 'မျက်နှာဖုံးလုပ်' : 'Set cover';
  const hint = zh
    ? `上传图片，最多 ${MAX_PRODUCT_GALLERY_IMAGES} 张（自动原比例压缩）`
    : `Up to ${MAX_PRODUCT_GALLERY_IMAGES} photos, auto compressed`;

  const openPicker = () => {
    if (full || uploading) return;
    inputRef.current?.click();
  };

  return (
    <div>
      {urls.length === 0 ? (
        <div
          className="merchant-product-modal__upload"
          onClick={openPicker}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') openPicker();
          }}
          role="button"
          tabIndex={0}
        >
          <span style={{ fontSize: '1.75rem', marginBottom: '0.35rem' }} aria-hidden>
            📸
          </span>
          <span className="merchant-product-modal__upload-hint">
            {uploading ? (zh ? '上传中...' : 'Uploading...') : hint}
          </span>
        </div>
      ) : (
        <div className="merchant-product-photo-grid">
          {urls.map((url, idx) => (
            <div key={`${url}-${idx}`} className="merchant-product-photo-tile">
              <StorageImg src={url} alt="" />
              <button
                type="button"
                className="merchant-product-photo-remove"
                onClick={() => onRemove(idx)}
                aria-label={zh ? '删除图片' : 'Remove photo'}
              >
                ×
              </button>
              {idx === 0 ? (
                <span className="merchant-product-photo-cover">{coverLabel}</span>
              ) : (
                <button
                  type="button"
                  className="merchant-product-photo-make-cover"
                  onClick={() => onMakeCover(idx)}
                >
                  {makeCoverLabel}
                </button>
              )}
            </div>
          ))}
          {full ? null : (
            <button
              type="button"
              className="merchant-product-photo-add"
              onClick={openPicker}
              disabled={uploading}
            >
              <span>{uploading ? '...' : '+'}</span>
              <span>{zh ? '添加' : 'Add'}</span>
            </button>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          e.target.value = '';
          if (files.length) onFiles(files);
        }}
      />
      {urls.length > 0 ? <p className="merchant-product-photo-hint">{hint}</p> : null}
    </div>
  );
}
