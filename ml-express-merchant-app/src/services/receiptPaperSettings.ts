import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_RECEIPT_PAPER_WIDTH,
  RECEIPT_PAPER_SETTINGS_KEY,
  type ReceiptPaperWidthMm,
} from '../constants/receiptPaper';

export async function loadReceiptPaperWidth(): Promise<ReceiptPaperWidthMm> {
  const raw = await AsyncStorage.getItem(RECEIPT_PAPER_SETTINGS_KEY);
  if (raw === '58' || raw === '80') return Number(raw) as ReceiptPaperWidthMm;
  return DEFAULT_RECEIPT_PAPER_WIDTH;
}

export async function saveReceiptPaperWidth(widthMm: ReceiptPaperWidthMm): Promise<void> {
  await AsyncStorage.setItem(RECEIPT_PAPER_SETTINGS_KEY, String(widthMm));
}
