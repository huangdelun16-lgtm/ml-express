export const CBL_PAGE_TABS = [
  'overview',
  'finance',
  'customers',
  'transport',
  'settings',
] as const;

export type CblPageTab = (typeof CBL_PAGE_TABS)[number];

export function parseCblPageTab(raw: string | null | undefined): CblPageTab {
  const value = String(raw || '').trim();
  return (CBL_PAGE_TABS as readonly string[]).includes(value) ? (value as CblPageTab) : 'overview';
}

export function withCblPageTab(current: URLSearchParams, tab: CblPageTab): URLSearchParams {
  const next = new URLSearchParams(current);
  if (tab === 'overview') next.delete('tab');
  else next.set('tab', tab);
  return next;
}
