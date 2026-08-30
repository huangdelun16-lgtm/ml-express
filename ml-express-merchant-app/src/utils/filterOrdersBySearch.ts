export interface MerchantOrderSearchable {
  id?: string;
  sender_name?: string | null;
  sender_phone?: string | null;
  sender_address?: string | null;
  receiver_name?: string | null;
  receiver_phone?: string | null;
  receiver_address?: string | null;
}

function normalizeSearchValue(value: string | null | undefined): string {
  return String(value ?? '').trim().toLowerCase();
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

/** 与商家 Web filterOrdersBySearch 口径一致：单号 / 电话 / 姓名 / 地址 */
export function filterOrdersBySearch<T extends MerchantOrderSearchable>(
  orders: T[],
  query: string,
): T[] {
  const q = normalizeSearchValue(query);
  if (!q) return [...orders];
  const qDigits = digitsOnly(q);
  return orders.filter((order) => {
    const haystack = [
      order.id,
      order.sender_name,
      order.sender_phone,
      order.sender_address,
      order.receiver_name,
      order.receiver_phone,
      order.receiver_address,
    ].map(normalizeSearchValue);
    if (haystack.some((field) => field.includes(q))) return true;
    if (qDigits.length >= 3) {
      const phoneHaystack = [order.id, order.sender_phone, order.receiver_phone].map(
        (field) => digitsOnly(normalizeSearchValue(field)),
      );
      return phoneHaystack.some((field) => field.includes(qDigits));
    }
    return false;
  });
}
