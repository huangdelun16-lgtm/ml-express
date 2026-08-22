import { describe, expect, it } from 'vitest';
import { chunkIds, fetchAllPages } from './supabasePager';

describe('fetchAllPages', () => {
  it('walks pages until a short result', async () => {
    const pages = [
      [1, 2, 3],
      [4, 5],
    ];
    const rows = await fetchAllPages<number>(
      async (from) => {
        const index = from === 0 ? 0 : 1;
        return { data: pages[index], error: null };
      },
      { pageSize: 3 },
    );
    expect(rows).toEqual([1, 2, 3, 4, 5]);
  });

  it('returns empty when the first page is empty', async () => {
    const rows = await fetchAllPages(async () => ({ data: [], error: null }), { pageSize: 10 });
    expect(rows).toEqual([]);
  });

  it('throws the page error message', async () => {
    await expect(
      fetchAllPages(async () => ({ data: null, error: { message: 'boom' } })),
    ).rejects.toThrow('boom');
  });

  it('throws when hitting the safety cap', async () => {
    await expect(
      fetchAllPages(async () => ({ data: [1, 2], error: null }), { pageSize: 2, maxPages: 2 }),
    ).rejects.toThrow('LIST_PAGE_LIMIT');
  });
});

describe('chunkIds', () => {
  it('splits ids into fixed chunks', () => {
    expect(chunkIds(['a', 'b', 'c', 'd'], 2)).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });
});
