import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_RECEIPT_PAPER_WIDTH,
  isReceiptPaperWidthMm,
  RECEIPT_PAPER_SETTINGS_KEY,
  type ReceiptPaperWidthMm,
} from '../constants/receiptPaper';

export async function loadReceiptPaperWidth(): Promise<ReceiptPaperWidthMm> {
  const raw = await AsyncStorage.getItem(RECEIPT_PAPER_SETTINGS_KEY);
  if (raw == null) return DEFAULT_RECEIPT_PAPER_WIDTH;
  const parsed = Number(raw);
  if (isReceiptPaperWidthMm(parsed)) return parsed;
  return DEFAULT_RECEIPT_PAPER_WIDTH;
}

export async function saveReceiptPaperWidth(widthMm: ReceiptPaperWidthMm): Promise<void> {
  await AsyncStorage.setItem(RECEIPT_PAPER_SETTINGS_KEY, String(widthMm));
}
