export type ProductImagePreset = {
  id: string;
  label: string;
  labelEn: string;
  width: number;
  height: number;
  /** auto = 保持原比例，仅限制最长边 */
  mode: 'fixed' | 'auto';
};

export type PrepareProductImageSettings = {
  presetId: string;
  quality: number;
  zoom: number;
  /** 原比例模式下的最长边上限（像素） */
  maxSide?: number;
};

export const MERCHANT_AUTO_UPLOAD_MAX_SIDE = 1000;
export const MERCHANT_AUTO_UPLOAD_TARGET_BYTES = 380_000;
export const MERCHANT_AUTO_UPLOAD_QUALITY = 0.68;

export const DEFAULT_PRODUCT_IMAGE_SETTINGS: PrepareProductImageSettings = {
  presetId: 'square',
  quality: 0.85,
  zoom: 1,
};

export const MERCHANT_AUTO_PRODUCT_IMAGE_SETTINGS: PrepareProductImageSettings = {
  presetId: 'auto',
  quality: MERCHANT_AUTO_UPLOAD_QUALITY,
  zoom: 1,
  maxSide: MERCHANT_AUTO_UPLOAD_MAX_SIDE,
};

export const PRODUCT_IMAGE_PRESETS: ProductImagePreset[] = [
  { id: 'square', label: '正方形 800×800（推荐主图）', labelEn: 'Square 800×800 (main)', width: 800, height: 800, mode: 'fixed' },
  { id: 'landscape', label: '横图 1200×900 (4:3)', labelEn: 'Landscape 4:3', width: 1200, height: 900, mode: 'fixed' },
  { id: 'portrait', label: '竖图 900×1200（推荐详细介绍）', labelEn: 'Portrait 3:4 (detail)', width: 900, height: 1200, mode: 'fixed' },
  { id: 'wide', label: '宽屏 1280×720 (16:9)', labelEn: 'Wide 16:9', width: 1280, height: 720, mode: 'fixed' },
  { id: 'auto', label: '原比例（最长边 1200px）', labelEn: 'Original ratio (max 1200px)', width: 1200, height: 1200, mode: 'auto' },
];

export function getProductImagePreset(presetId: string): ProductImagePreset {
  return PRODUCT_IMAGE_PRESETS.find((p) => p.id === presetId) ?? PRODUCT_IMAGE_PRESETS[0];
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('无法加载图片'));
    };
    image.src = objectUrl;
  });
}

function computeCoverCrop(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  zoom: number,
) {
  const safeZoom = Math.max(1, Math.min(2, zoom));
  const targetAspect = targetWidth / targetHeight;
  const sourceAspect = sourceWidth / sourceHeight;

  let cropWidth: number;
  let cropHeight: number;

  if (sourceAspect > targetAspect) {
    cropHeight = sourceHeight / safeZoom;
    cropWidth = cropHeight * targetAspect;
  } else {
    cropWidth = sourceWidth / safeZoom;
    cropHeight = cropWidth / targetAspect;
  }

  cropWidth = Math.min(sourceWidth, cropWidth);
  cropHeight = Math.min(sourceHeight, cropHeight);

  const cropX = Math.max(0, (sourceWidth - cropWidth) / 2);
  const cropY = Math.max(0, (sourceHeight - cropHeight) / 2);

  return { cropX, cropY, cropWidth, cropHeight };
}

function computeAutoSize(sourceWidth: number, sourceHeight: number, maxSide: number) {
  const longest = Math.max(sourceWidth, sourceHeight);
  if (longest <= maxSide) {
    return { width: sourceWidth, height: sourceHeight };
  }
  const ratio = maxSide / longest;
  return {
    width: Math.max(1, Math.round(sourceWidth * ratio)),
    height: Math.max(1, Math.round(sourceHeight * ratio)),
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('图片导出失败'));
      },
      'image/jpeg',
      quality,
    );
  });
}

export async function prepareProductImage(
  file: File,
  settings: PrepareProductImageSettings,
): Promise<File> {
  const preset = getProductImagePreset(settings.presetId);
  const quality = Math.max(0.5, Math.min(0.95, settings.quality));
  const image = await loadImageFromFile(file);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建画布');

  let outputWidth: number;
  let outputHeight: number;

  if (preset.mode === 'auto') {
    const maxSide = settings.maxSide ?? preset.width;
    const size = computeAutoSize(image.width, image.height, maxSide);
    outputWidth = size.width;
    outputHeight = size.height;
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    ctx.drawImage(image, 0, 0, outputWidth, outputHeight);
  } else {
    outputWidth = preset.width;
    outputHeight = preset.height;
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const { cropX, cropY, cropWidth, cropHeight } = computeCoverCrop(
      image.width,
      image.height,
      outputWidth,
      outputHeight,
      settings.zoom,
    );
    ctx.drawImage(
      image,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      outputWidth,
      outputHeight,
    );
  }

  const blob = await canvasToBlob(canvas, quality);
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'product';
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
}

export async function buildProductImagePreview(
  file: File,
  settings: PrepareProductImageSettings,
  maxPreviewSide = 420,
): Promise<{ dataUrl: string; width: number; height: number; estimatedBytes: number }> {
  const prepared = await prepareProductImage(file, settings);
  const image = await loadImageFromFile(prepared);

  const scale = Math.min(1, maxPreviewSide / Math.max(image.width, image.height));
  const previewWidth = Math.max(1, Math.round(image.width * scale));
  const previewHeight = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = previewWidth;
  canvas.height = previewHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建预览');

  ctx.drawImage(image, 0, 0, previewWidth, previewHeight);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.82);

  return {
    dataUrl,
    width: image.width,
    height: image.height,
    estimatedBytes: prepared.size,
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** 商家端：原比例 + 自动压缩（无需手动选规格/画质） */
export async function autoPrepareProductImageForUpload(file: File): Promise<File> {
  let quality = MERCHANT_AUTO_UPLOAD_QUALITY;
  let prepared = await prepareProductImage(file, {
    ...MERCHANT_AUTO_PRODUCT_IMAGE_SETTINGS,
    quality,
  });

  while (
    prepared.size > MERCHANT_AUTO_UPLOAD_TARGET_BYTES &&
    quality > 0.52
  ) {
    quality = Math.round((quality - 0.06) * 100) / 100;
    prepared = await prepareProductImage(file, {
      ...MERCHANT_AUTO_PRODUCT_IMAGE_SETTINGS,
      quality,
    });
  }

  return prepared;
}
