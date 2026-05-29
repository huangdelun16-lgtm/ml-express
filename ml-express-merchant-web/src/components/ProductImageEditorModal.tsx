import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DEFAULT_PRODUCT_IMAGE_SETTINGS,
  PRODUCT_IMAGE_PRESETS,
  PrepareProductImageSettings,
  buildProductImagePreview,
  formatFileSize,
  prepareProductImage,
} from '../utils/productImagePrepare';
import '../styles/productImageEditor.css';

type ProductImageEditorModalProps = {
  file: File | null;
  defaultPresetId?: string;
  language?: 'zh' | 'en';
  theme?: 'light' | 'dark';
  onCancel: () => void;
  onConfirm: (file: File, settings: PrepareProductImageSettings) => void | Promise<void>;
};

const ProductImageEditorModal: React.FC<ProductImageEditorModalProps> = ({
  file,
  defaultPresetId = 'square',
  language = 'zh',
  theme = 'light',
  onCancel,
  onConfirm,
}) => {
  const isZh = language === 'zh';
  const [settings, setSettings] = useState<PrepareProductImageSettings>({
    ...DEFAULT_PRODUCT_IMAGE_SETTINGS,
    presetId: defaultPresetId,
  });
  const [previewUrl, setPreviewUrl] = useState('');
  const [outputSize, setOutputSize] = useState({ width: 0, height: 0 });
  const [originalSize, setOriginalSize] = useState({ width: 0, height: 0, bytes: 0 });
  const [estimatedBytes, setEstimatedBytes] = useState(0);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return;
    setSettings({
      ...DEFAULT_PRODUCT_IMAGE_SETTINGS,
      presetId: defaultPresetId,
    });
    setOriginalSize({ width: 0, height: 0, bytes: file.size });
    setError(null);
  }, [file, defaultPresetId]);

  const refreshPreview = useCallback(async () => {
    if (!file) return;
    setIsPreviewLoading(true);
    setError(null);
    try {
      const img = await createImageMeta(file);
      setOriginalSize({ width: img.width, height: img.height, bytes: file.size });
      const preview = await buildProductImagePreview(file, settings);
      setPreviewUrl(preview.dataUrl);
      setOutputSize({ width: preview.width, height: preview.height });
      setEstimatedBytes(preview.estimatedBytes);
    } catch (e) {
      console.error(e);
      setError(isZh ? '预览生成失败，请换一张图片重试' : 'Preview failed');
    } finally {
      setIsPreviewLoading(false);
    }
  }, [file, settings, isZh]);

  useEffect(() => {
    if (!file) return;
    const timer = window.setTimeout(() => {
      refreshPreview();
    }, 120);
    return () => window.clearTimeout(timer);
  }, [file, settings, refreshPreview]);

  useEffect(() => {
    if (!file) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [file]);

  if (!file) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const prepared = await prepareProductImage(file, settings);
      await onConfirm(prepared, settings);
    } catch (e) {
      console.error(e);
      setError(isZh ? '图片处理失败，请重试' : 'Processing failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const preset = PRODUCT_IMAGE_PRESETS.find((p) => p.id === settings.presetId) ?? PRODUCT_IMAGE_PRESETS[0];
  const showZoom = preset.mode === 'fixed';

  return createPortal(
    <div
      className={`product-image-editor-overlay product-image-editor-overlay--${theme}`}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onCancel();
      }}
    >
      <div
        className={`product-image-editor product-image-editor--${theme}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-image-editor-title"
      >
        <div className="product-image-editor__head">
          <div>
            <h2 id="product-image-editor-title" className="product-image-editor__title">
              {isZh ? '调整商品图片' : 'Adjust product image'}
            </h2>
            <p className="product-image-editor__sub">
              {isZh
                ? '主图建议正方形 800×800；详细介绍建议竖图 3:4。客户端现已完整显示（不裁切）。'
                : 'Use square 800×800 for main image; portrait 3:4 for detail scroll. Client shows full image.'}
            </p>
          </div>
          <button
            type="button"
            className="product-image-editor__close"
            onClick={onCancel}
            disabled={isSubmitting}
            aria-label={isZh ? '关闭' : 'Close'}
          >
            ×
          </button>
        </div>

        <div className="product-image-editor__body">
          <div className="product-image-editor__preview-wrap">
            <div className="product-image-editor__preview">
              {isPreviewLoading ? (
                <div className="product-image-editor__preview-loading">
                  {isZh ? '生成预览中…' : 'Generating preview…'}
                </div>
              ) : previewUrl ? (
                <img src={previewUrl} alt="" />
              ) : (
                <div className="product-image-editor__preview-loading">{isZh ? '暂无预览' : 'No preview'}</div>
              )}
            </div>
            <div className="product-image-editor__meta">
              <span>
                {isZh ? '原图' : 'Original'}:{' '}
                {originalSize.width > 0
                  ? `${originalSize.width}×${originalSize.height} · ${formatFileSize(originalSize.bytes)}`
                  : formatFileSize(file.size)}
              </span>
              <span>
                {isZh ? '输出' : 'Output'}: {outputSize.width}×{outputSize.height}
                {estimatedBytes > 0 ? ` · ${formatFileSize(estimatedBytes)}` : ''}
              </span>
            </div>
          </div>

          <div className="product-image-editor__controls">
            <div className="product-image-editor__field">
              <label>{isZh ? '图片规格' : 'Size preset'}</label>
              <div className="product-image-editor__presets">
                {PRODUCT_IMAGE_PRESETS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`product-image-editor__preset${settings.presetId === item.id ? ' is-active' : ''}`}
                    onClick={() => setSettings((prev) => ({ ...prev, presetId: item.id }))}
                  >
                    {isZh ? item.label : item.labelEn}
                  </button>
                ))}
              </div>
            </div>

            {showZoom && (
              <div className="product-image-editor__field">
                <label htmlFor="product-image-zoom">
                  {isZh ? '裁剪缩放' : 'Crop zoom'} ({settings.zoom.toFixed(1)}×)
                </label>
                <input
                  id="product-image-zoom"
                  type="range"
                  min={1}
                  max={2}
                  step={0.05}
                  value={settings.zoom}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, zoom: Number(e.target.value) }))
                  }
                />
                <p className="product-image-editor__hint">
                  {isZh ? '放大可裁切画面中心区域，适合突出商品主体' : 'Zoom in to crop the center area'}
                </p>
              </div>
            )}

            <div className="product-image-editor__field">
              <label htmlFor="product-image-quality">
                {isZh ? '压缩画质' : 'Quality'} ({Math.round(settings.quality * 100)}%)
              </label>
              <input
                id="product-image-quality"
                type="range"
                min={0.6}
                max={0.95}
                step={0.01}
                value={settings.quality}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, quality: Number(e.target.value) }))
                }
              />
              <p className="product-image-editor__hint">
                {isZh ? '画质越高文件越大，建议 80%–90%' : 'Higher quality = larger file. 80–90% recommended.'}
              </p>
            </div>

            {error && (
              <div className="product-image-editor__error" role="alert">
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="product-image-editor__foot">
          <button
            type="button"
            className="product-image-editor__btn product-image-editor__btn--ghost"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {isZh ? '取消' : 'Cancel'}
          </button>
          <button
            type="button"
            className="product-image-editor__btn product-image-editor__btn--primary"
            onClick={handleConfirm}
            disabled={isSubmitting || isPreviewLoading}
          >
            {isSubmitting
              ? isZh
                ? '处理中…'
                : 'Processing…'
              : isZh
                ? '确认并上传'
                : 'Confirm & upload'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

function createImageMeta(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: image.width, height: image.height });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('load failed'));
    };
    image.src = objectUrl;
  });
}

export default ProductImageEditorModal;
