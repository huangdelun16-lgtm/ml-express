/** Raw PDF must stay under Netlify's ~6MB JSON body after base64 (~33% growth). */
export const MAX_PDF_BYTES = Math.floor(3.5 * 1024 * 1024);
export const MAX_IMAGE_SOURCE_BYTES = 5 * 1024 * 1024;
export const MAX_UPLOAD_PAYLOAD_BYTES = Math.floor(3.5 * 1024 * 1024);
/** Keep the original photo when it is already small enough to stay readable. */
export const KEEP_ORIGINAL_MAX_BYTES = 2 * 1024 * 1024;
export const LICENSE_MAX_EDGE = 2560;
export const MERCHANT_APPLY_UPLOAD_PATH = '/.netlify/functions/merchant-apply-upload';
export const MERCHANT_APPLY_STATUS_PATH = '/.netlify/functions/merchant-apply-status';

const KEEP_ORIGINAL_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/pjpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export type PreparedUpload = {
  fileName: string;
  contentType: string;
  base64: string;
  byteLength: number;
};

export type UploadResult = {
  url: string;
  fileName: string;
};

export type PublicApplicationStatus = {
  applicationId: string;
  status: string;
  store_name: string;
  created_at: string;
  review_notes: string | null;
};

export function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = () => reject(new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

export function shouldKeepOriginalImage(input: {
  byteLength: number;
  maxEdge: number;
  contentType: string;
}): boolean {
  if (!KEEP_ORIGINAL_TYPES.has(String(input.contentType || '').toLowerCase())) return false;
  if (input.byteLength > KEEP_ORIGINAL_MAX_BYTES) return false;
  if (input.byteLength > MAX_UPLOAD_PAYLOAD_BYTES) return false;
  return input.maxEdge <= LICENSE_MAX_EDGE;
}

function blobToJpeg(
  source: CanvasImageSource,
  width: number,
  height: number,
  quality: number,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('canvas unavailable'));
  ctx.drawImage(source, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('compress failed'))),
      'image/jpeg',
      quality,
    );
  });
}

async function asOriginalUpload(file: File): Promise<PreparedUpload> {
  return {
    fileName: file.name || 'license.jpg',
    contentType: file.type || 'image/jpeg',
    base64: await fileToBase64(file),
    byteLength: file.size,
  };
}

async function compressImageFile(file: File): Promise<PreparedUpload> {
  if (typeof createImageBitmap !== 'function') {
    if (file.size > MAX_UPLOAD_PAYLOAD_BYTES) {
      throw new Error('IMAGE_TOO_LARGE');
    }
    return asOriginalUpload(file);
  }

  const bitmap = await createImageBitmap(file);
  const maxEdge = Math.max(bitmap.width, bitmap.height);
  if (
    shouldKeepOriginalImage({
      byteLength: file.size,
      maxEdge,
      contentType: file.type,
    })
  ) {
    bitmap.close?.();
    return asOriginalUpload(file);
  }

  const scale = Math.min(1, LICENSE_MAX_EDGE / maxEdge);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  let quality = 0.92;
  let blob = await blobToJpeg(bitmap, width, height, quality);
  if (blob.size > MAX_UPLOAD_PAYLOAD_BYTES) {
    quality = 0.84;
    blob = await blobToJpeg(bitmap, width, height, quality);
  }
  bitmap.close?.();

  if (blob.size > MAX_UPLOAD_PAYLOAD_BYTES) {
    throw new Error('IMAGE_TOO_LARGE');
  }

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'license';
  return {
    fileName: `${baseName}.jpg`,
    contentType: 'image/jpeg',
    base64: await fileToBase64(blob),
    byteLength: blob.size,
  };
}

export async function prepareMerchantApplyFile(file: File): Promise<PreparedUpload> {
  const isPdf = file.type === 'application/pdf';
  const isImage = file.type.startsWith('image/');
  if (!isPdf && !isImage) throw new Error('UNSUPPORTED_TYPE');

  if (isPdf) {
    if (file.size > MAX_PDF_BYTES) throw new Error('PDF_TOO_LARGE');
    return {
      fileName: file.name || 'document.pdf',
      contentType: 'application/pdf',
      base64: await fileToBase64(file),
      byteLength: file.size,
    };
  }

  if (file.size > MAX_IMAGE_SOURCE_BYTES) throw new Error('IMAGE_TOO_LARGE');
  return compressImageFile(file);
}

export async function uploadMerchantApplyDocument(file: File): Promise<UploadResult> {
  const prepared = await prepareMerchantApplyFile(file);
  const response = await fetch(MERCHANT_APPLY_UPLOAD_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: prepared.fileName,
      contentType: prepared.contentType,
      base64: prepared.base64,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok || !payload.url) {
    throw new Error(payload.error || 'UPLOAD_FAILED');
  }
  return {
    url: String(payload.url),
    fileName: String(payload.fileName || prepared.fileName),
  };
}

export async function lookupMerchantApplication(
  phone: string,
  applicationId?: string,
): Promise<PublicApplicationStatus> {
  const response = await fetch(MERCHANT_APPLY_STATUS_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone,
      applicationId: applicationId || undefined,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || 'LOOKUP_FAILED');
  }
  return {
    applicationId: String(payload.applicationId || ''),
    status: String(payload.status || ''),
    store_name: String(payload.store_name || ''),
    created_at: String(payload.created_at || ''),
    review_notes: payload.review_notes ? String(payload.review_notes) : null,
  };
}
