import {
  fileToBase64,
  KEEP_ORIGINAL_MAX_BYTES,
  LICENSE_MAX_EDGE,
  lookupMerchantApplication,
  MERCHANT_APPLY_STATUS_PATH,
  MERCHANT_APPLY_UPLOAD_PATH,
  prepareMerchantApplyFile,
  shouldKeepOriginalImage,
  uploadMerchantApplyDocument,
} from './merchantApplyUpload';

function tinyPdf(): File {
  const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
  return new File([bytes], 'license.pdf', { type: 'application/pdf' });
}

describe('merchantApplyUpload', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reads a blob as base64 without the data-url prefix', async () => {
    const blob = new Blob(['hello'], { type: 'text/plain' });
    const base64 = await fileToBase64(blob);
    expect(base64).toBe(btoa('hello'));
    expect(base64.includes(',')).toBe(false);
  });

  it('prepares a PDF under the size cap', async () => {
    const prepared = await prepareMerchantApplyFile(tinyPdf());
    expect(prepared.contentType).toBe('application/pdf');
    expect(prepared.fileName).toBe('license.pdf');
    expect(prepared.base64.length).toBeGreaterThan(0);
  });

  it('keeps small readable photos without forcing JPEG compression', () => {
    expect(
      shouldKeepOriginalImage({
        byteLength: 400_000,
        maxEdge: 2000,
        contentType: 'image/jpeg',
      }),
    ).toBe(true);
    expect(
      shouldKeepOriginalImage({
        byteLength: KEEP_ORIGINAL_MAX_BYTES + 1,
        maxEdge: 1200,
        contentType: 'image/png',
      }),
    ).toBe(false);
    expect(
      shouldKeepOriginalImage({
        byteLength: 800_000,
        maxEdge: LICENSE_MAX_EDGE + 1,
        contentType: 'image/jpeg',
      }),
    ).toBe(false);
  });

  it('does not canvas-compress a small jpeg under 2560px', async () => {
    const previousBitmap = global.createImageBitmap;
    const createElement = jest.spyOn(document, 'createElement');
    const close = jest.fn();
    global.createImageBitmap = jest.fn().mockResolvedValue({
      width: 1200,
      height: 800,
      close,
    });
    try {
      const file = new File([new Uint8Array(48_000)], 'id.jpg', { type: 'image/jpeg' });
      const prepared = await prepareMerchantApplyFile(file);
      expect(prepared.contentType).toBe('image/jpeg');
      expect(prepared.fileName).toBe('id.jpg');
      expect(createElement).not.toHaveBeenCalledWith('canvas');
      expect(close).toHaveBeenCalled();
    } finally {
      global.createImageBitmap = previousBitmap;
    }
  });

  it('rejects an oversized PDF', async () => {
    const huge = new File([new Uint8Array(4 * 1024 * 1024)], 'big.pdf', {
      type: 'application/pdf',
    });
    await expect(prepareMerchantApplyFile(huge)).rejects.toThrow('PDF_TOO_LARGE');
  });

  it('uploads one prepared document and returns the public url', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, url: 'https://cdn.example/a.jpg', fileName: 'a.jpg' }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await uploadMerchantApplyDocument(tinyPdf());
    expect(result.url).toBe('https://cdn.example/a.jpg');
    expect(fetchMock).toHaveBeenCalledWith(
      MERCHANT_APPLY_UPLOAD_PATH,
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.contentType).toBe('application/pdf');
    expect(body.base64).toBeTruthy();
  });

  it('looks up an application by phone', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        applicationId: 'app-1',
        status: 'pending',
        store_name: '夜市小馆',
        created_at: '2026-09-03T00:00:00.000Z',
        review_notes: null,
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const row = await lookupMerchantApplication('09123456789');
    expect(row.status).toBe('pending');
    expect(fetchMock).toHaveBeenCalledWith(
      MERCHANT_APPLY_STATUS_PATH,
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
