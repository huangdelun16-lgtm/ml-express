export type ChatMessage = {
  id: string;
  order_id: string;
  sender_id: string;
  sender_type: 'customer' | 'rider' | 'merchant' | 'admin';
  message: string;
  image_url?: string;
  is_read: boolean;
  created_at: string;
};

/** Replace optimistic temp-* rows when the real REST row arrives. */
export function mergeIncomingMessages(
  prev: ChatMessage[],
  incoming: ChatMessage[],
): ChatMessage[] {
  let changed = false;
  const next = [...prev];
  const byId = new Set(next.map((m) => m.id));

  for (const msg of incoming) {
    if (!msg?.id || byId.has(msg.id)) continue;

    const tempIdx = next.findIndex(
      (m) =>
        String(m.id).startsWith('temp-') &&
        m.sender_id === msg.sender_id &&
        m.message === msg.message,
    );
    if (tempIdx >= 0) {
      next[tempIdx] = msg;
      byId.add(msg.id);
      changed = true;
      continue;
    }

    next.push(msg);
    byId.add(msg.id);
    changed = true;
  }

  return changed ? next : prev;
}

export function unreadCountsFromRows(
  rows: Array<{ order_id?: string }> | null | undefined,
): Record<string, number> {
  const counts: Record<string, number> = {};
  (rows || []).forEach((msg) => {
    if (!msg?.order_id) return;
    counts[msg.order_id] = (counts[msg.order_id] || 0) + 1;
  });
  return counts;
}
