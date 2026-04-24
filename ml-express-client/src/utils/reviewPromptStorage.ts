import AsyncStorage from '@react-native-async-storage/async-storage';

export const REVIEW_PROMPT_DISMISSED_KEY = 'ml_express_review_prompt_dismissed_order_ids';

export async function getDismissedReviewOrderIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(REVIEW_PROMPT_DISMISSED_KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set((arr as string[]).filter(Boolean));
  } catch {
    return new Set();
  }
}

export async function addDismissedReviewOrderId(orderId: string): Promise<void> {
  if (!orderId) return;
  try {
    const cur = await getDismissedReviewOrderIds();
    cur.add(orderId);
    await AsyncStorage.setItem(REVIEW_PROMPT_DISMISSED_KEY, JSON.stringify(Array.from(cur)));
  } catch {
    // ignore
  }
}

type OrderLike = {
  id: string;
  status: string;
  delivery_time?: string;
  updated_at?: string;
  created_at?: string;
};

export function pickUnratedDeliveredOrder(
  orders: OrderLike[],
  reviewed: Set<string>,
  dismissed: Set<string>
): OrderLike | null {
  const list = orders.filter(
    (o) =>
      (o.status === '已送达' || o.status === '已完成') &&
      !reviewed.has(o.id) &&
      !dismissed.has(o.id)
  );
  if (list.length === 0) return null;
  list.sort((a, b) => {
    const ta = new Date(a.delivery_time || a.updated_at || a.created_at || 0).getTime();
    const tb = new Date(b.delivery_time || b.updated_at || b.created_at || 0).getTime();
    return tb - ta;
  });
  return list[0] ?? null;
}
