export const SUPABASE_PAGE_SIZE = 500;
export const SUPABASE_MAX_PAGES = 80;

type PageResult<T> = {
  data: T[] | null;
  error: { message?: string } | null;
};

/**
 * Walk PostgREST `.range()` until a short page. Avoids silent `.limit(N)` truncation.
 */
export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  options?: { pageSize?: number; maxPages?: number },
): Promise<T[]> {
  const pageSize = options?.pageSize ?? SUPABASE_PAGE_SIZE;
  const maxPages = options?.maxPages ?? SUPABASE_MAX_PAGES;
  const rows: T[] = [];

  for (let page = 0; page < maxPages; page += 1) {
    const from = page * pageSize;
    const result = await fetchPage(from, from + pageSize - 1);
    if (result.error) {
      throw new Error(result.error.message || 'query failed');
    }
    const pageRows = result.data ?? [];
    rows.push(...pageRows);
    if (pageRows.length < pageSize) return rows;
  }

  throw new Error('LIST_PAGE_LIMIT');
}

export function chunkIds(ids: string[], chunkSize = 80): string[][] {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += chunkSize) {
    chunks.push(ids.slice(i, i + chunkSize));
  }
  return chunks;
}
