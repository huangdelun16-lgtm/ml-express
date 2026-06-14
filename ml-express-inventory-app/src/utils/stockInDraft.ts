import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'stock_in_contact_draft';

export type StockInContactDraft = {
  recipientName: string;
  recipientPhone: string;
  destination: string;
  detailAddress: string;
  packaging: string;
};

const EMPTY_DRAFT: StockInContactDraft = {
  recipientName: '',
  recipientPhone: '',
  destination: '',
  detailAddress: '',
  packaging: '',
};

export async function loadStockInContactDraft(): Promise<StockInContactDraft> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) return { ...EMPTY_DRAFT, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...EMPTY_DRAFT };
}

export async function saveStockInContactDraft(draft: StockInContactDraft): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(draft));
}
