const KEY = 'ml_express_review_prompt_dismissed_order_ids';

export function getDismissedReviewOrderIdsWeb(): Set<string> {
  try {
    if (typeof localStorage === 'undefined') return new Set();
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set((arr as string[]).filter(Boolean));
  } catch {
    return new Set();
  }
}

export function addDismissedReviewOrderIdWeb(orderId: string): void {
  if (!orderId) return;
  try {
    if (typeof localStorage === 'undefined') return;
    const cur = getDismissedReviewOrderIdsWeb();
    cur.add(orderId);
    localStorage.setItem(KEY, JSON.stringify(Array.from(cur)));
  } catch {
    // ignore
  }
}

type Pkg = {
  id: string;
  status: string;
  delivery_time?: string;
  updated_at?: string;
  create_time?: string;
  created_at?: string;
};

export function pickUnratedDeliveredPackage(
  packages: Pkg[],
  reviewed: Set<string>,
  dismissed: Set<string>
): Pkg | null {
  const list = packages.filter(
    (o) =>
      (o.status === '已送达' || o.status === '已完成') &&
      !reviewed.has(o.id) &&
      !dismissed.has(o.id)
  );
  if (list.length === 0) return null;
  list.sort((a, b) => {
    const ta = new Date(
      a.delivery_time || a.updated_at || a.created_at || a.create_time || 0
    ).getTime();
    const tb = new Date(
      b.delivery_time || b.updated_at || b.created_at || b.create_time || 0
    ).getTime();
    return tb - ta;
  });
  return list[0] ?? null;
}
