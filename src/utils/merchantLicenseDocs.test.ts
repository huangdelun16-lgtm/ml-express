import {
  applicationMatchesStore,
  pickLicenseUrlsForStore,
  uniqueLicenseDocumentUrls,
} from './merchantLicenseDocs';

const store = {
  id: 'ce097a5f-abd4-4935-9dc7-aa107eb1e74d',
  store_code: 'MDY004',
  phone: '09-123456789',
  store_name: 'Yes I Do',
};

describe('merchantLicenseDocs', () => {
  it('keeps unique urls in upload order', () => {
    expect(
      uniqueLicenseDocumentUrls([
        'https://example.com/a.jpg',
        ' https://example.com/a.jpg ',
        'https://example.com/b.jpg',
        '',
      ]),
    ).toEqual(['https://example.com/a.jpg', 'https://example.com/b.jpg']);
  });

  it('matches by created store id first', () => {
    expect(
      applicationMatchesStore({ created_store_id: store.id }, store),
    ).toBe(true);
    expect(
      applicationMatchesStore({ created_store_id: 'other' }, store),
    ).toBe(false);
  });

  it('picks the approved application documents and ignores nearby stores', () => {
    expect(
      pickLicenseUrlsForStore(
        [
          {
            created_store_id: '84e7f9b3-cec0-4606-82a7-f7b7a500107b',
            store_name: 'MARKET LINK EXPRESS',
            license_document_urls: ['https://example.com/other.jpg'],
          },
          {
            created_store_id: store.id,
            status: 'approved',
            created_at: '2026-09-03T08:58:00.000Z',
            license_document_urls: [
              'https://example.com/one.jpg',
              'https://example.com/two.jpg',
            ],
          },
        ],
        store,
      ),
    ).toEqual(['https://example.com/one.jpg', 'https://example.com/two.jpg']);
  });
});
