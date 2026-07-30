import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCode from 'react-native-qrcode-svg';
import {
  RECEIPT_PAPER_PRESETS,
  type ReceiptPaperWidthMm,
} from '../constants/receiptPaper';
import { getScanPrinterStrings } from '../i18n/scanPrinterStrings';
import { printerService } from '../services/PrinterService';
import {
  loadReceiptPaperWidth,
  saveReceiptPaperWidth,
} from '../services/receiptPaperSettings';
import ReceiptPaperSizePicker from './ReceiptPaperSizePicker';
import {
  computeReceiptTotals,
  createSampleReceiptData,
  type MerchantReceiptData,
} from '../utils/merchantReceiptTemplate';
import {
  orderToMerchantReceipt,
  type OrderPrintSource,
} from '../utils/orderToMerchantReceipt';
import { itemLabelForEscPos, paymentTextForEscPos } from '../utils/escposText';
import { buildReceiptItemDisplays } from '../utils/receiptItemFormat';

type Props = {
  visible: boolean;
  language: string;
  onClose: () => void;
  order?: OrderPrintSource | null;
  productPriceMap?: Record<string, number>;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function resolvePrintError(strings: ReturnType<typeof getScanPrinterStrings>, error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error ?? '');
  if (msg === 'BLE_PRINTER_NOT_CONNECTED') return strings.printPreviewBleNotConnected;
  if (msg === 'BLE_WRITE_CHAR_NOT_FOUND') return strings.printPreviewBleWriteFailed;
  return strings.printPreviewFailed;
}

export default function ReceiptPrintPreviewModal({
  visible,
  language,
  onClose,
  order = null,
  productPriceMap,
}: Props) {
  const strings = getScanPrinterStrings(language);
  const isOrderMode = Boolean(order);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [receipt, setReceipt] = useState<MerchantReceiptData | null>(null);
  const [paperWidth, setPaperWidth] = useState<ReceiptPaperWidthMm>(58);

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;
    setLoading(true);

    void (async () => {
      const savedPaper = await loadReceiptPaperWidth();
      if (cancelled) return;
      setPaperWidth(savedPaper);

      if (order) {
        setReceipt(orderToMerchantReceipt(order, productPriceMap));
        setLoading(false);
        return;
      }

      const [storeName, storePhone] = await Promise.all([
        AsyncStorage.getItem('userName'),
        AsyncStorage.getItem('userPhone'),
      ]);
      if (cancelled) return;
      setReceipt(
        createSampleReceiptData({
          storeName: storeName || undefined,
          storePhone: storePhone || undefined,
        }),
      );
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, order, productPriceMap]);

  const paperPreset = RECEIPT_PAPER_PRESETS[paperWidth];
  const totals = useMemo(
    () => (receipt ? computeReceiptTotals(receipt) : null),
    [receipt],
  );

  const paymentDisplay = useMemo(() => {
    if (!receipt || !totals) return '';
    if (isOrderMode) return paymentTextForEscPos(receipt.paymentMethod);
    return totals.paymentText;
  }, [receipt, totals, isOrderMode]);

  const itemDisplays = useMemo(() => {
    if (!receipt) return [];
    const labelFn = isOrderMode ? itemLabelForEscPos : undefined;
    return buildReceiptItemDisplays(receipt.items, labelFn);
  }, [receipt, isOrderMode]);

  const handlePaperChange = (width: ReceiptPaperWidthMm) => {
    setPaperWidth(width);
    void saveReceiptPaperWidth(width);
  };

  const handlePrint = () => {
    if (!receipt || printing) return;

    setPrinting(true);
    void (async () => {
      try {
        const settings = await printerService.getSettings();
        if (!settings.enabled || settings.type !== 'bluetooth') {
          Alert.alert(strings.printPreviewTitle, strings.printPreviewNotEnabled);
          return;
        }

        await saveReceiptPaperWidth(paperWidth);
        const ok = await printerService.printMerchantReceipt(receipt);
        if (!ok) {
          Alert.alert(strings.printPreviewTitle, strings.printPreviewNotEnabled);
          return;
        }
        Alert.alert(strings.printPreviewTitle, strings.printPreviewSent);
        if (isOrderMode) onClose();
      } catch (error) {
        Alert.alert(strings.printPreviewTitle, resolvePrintError(strings, error));
      } finally {
        setPrinting(false);
      }
    })();
  };

  if (!visible) return null;

  const hintText = isOrderMode ? strings.printPreviewOrderHint : strings.printPreviewHint;
  const printBtnText = isOrderMode ? strings.printPreviewConfirmPrint : strings.printPreviewPrint;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{strings.printPreviewTitle}</Text>
          <Text style={styles.hint}>{hintText}</Text>
          {isOrderMode ? (
            <Text style={styles.escPosNote}>{strings.printPreviewEscPosNote}</Text>
          ) : null}

          <ReceiptPaperSizePicker
            language={language}
            value={paperWidth}
            onChange={handlePaperChange}
            sectionLabel={strings.printPreviewPaperSize}
            hint={`${strings.printPreviewPaperHint} ${strings.printPreviewPaperWifiHint}`}
          />

          {loading || !receipt || !totals ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#38bdf8" />
            </View>
          ) : (
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
              <View style={[styles.ticket, { maxWidth: paperPreset.previewWidth, alignSelf: 'center' }]}>
                {receipt.isSample ? (
                  <Text style={styles.sampleBanner}>{strings.printPreviewSample}</Text>
                ) : null}

                <Text style={styles.brand}>MARKET LINK EXPRESS</Text>
                <Text style={styles.subtitle}>{strings.printPreviewMerchantCopy}</Text>
                <Text style={styles.orderNo}>#{receipt.orderId.slice(-5)}</Text>

                <View style={styles.divider} />
                <Row
                  label={strings.printPreviewCreatedAt}
                  value={new Date(receipt.createdAt).toLocaleString()}
                />
                <Row label={strings.printPreviewOrderId} value={receipt.orderId} />

                <View style={styles.divider} />
                <Row label={strings.printPreviewStore} value={receipt.senderName} />
                <Row label={strings.printPreviewPhone} value={receipt.senderPhone} />

                <View style={styles.divider} />
                <Row label={strings.printPreviewReceiver} value={receipt.receiverName} />
                <Row label={strings.printPreviewPhone} value={receipt.receiverPhone} />
                <Row label={strings.printPreviewAddress} value={receipt.receiverAddress} />

                <View style={styles.divider} />
                <Row label={strings.printPreviewPayment} value={paymentDisplay} />

                {itemDisplays.map((display, index) => (
                  <View key={`${display.lineText}-${index}`} style={styles.itemRow}>
                    <Text style={styles.itemLabel}>{display.lineText}</Text>
                    <Text style={[styles.itemPrice, display.isSummary && styles.itemPriceSummary]}>
                      {display.amountText === '-' ? '—' : display.amountText}
                    </Text>
                  </View>
                ))}

                <Row
                  label={strings.printPreviewDeliveryFee}
                  value={`${receipt.deliveryFee.toLocaleString()} MMK`}
                />
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>{strings.printPreviewTotal}</Text>
                  <Text style={styles.totalValue}>{`${totals.totalFee.toLocaleString()} MMK`}</Text>
                </View>

                {receipt.notes ? (
                  <View style={styles.noteBox}>
                    <Text style={styles.noteLabel}>{strings.printPreviewNotes}</Text>
                    <Text style={styles.noteText}>{receipt.notes}</Text>
                  </View>
                ) : null}

                <View style={styles.qrBox}>
                  <QRCode value={receipt.orderId} size={paperWidth === 58 ? 96 : 120} />
                  <Text style={styles.qrHint}>{strings.printPreviewQrHint}</Text>
                </View>

                <Text style={styles.footer}>{strings.printPreviewFooter}</Text>
              </View>
            </ScrollView>
          )}

          <View style={styles.actions}>
            <Pressable
              style={[styles.primaryBtn, (printing || loading) && styles.btnDisabled]}
              onPress={handlePrint}
              disabled={printing || loading || !receipt}
            >
              <Text style={styles.primaryBtnText}>
                {printing ? strings.printPreviewPrinting : printBtnText}
              </Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={onClose}>
              <Text style={styles.secondaryBtnText}>{strings.close}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.82)',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: '92%',
  },
  title: {
    color: '#7dd3fc',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
  },
  hint: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 6,
  },
  escPosNote: {
    color: '#fbbf24',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginBottom: 10,
    paddingHorizontal: 8,
  },
  paperSection: {
    marginBottom: 12,
    gap: 8,
  },
  paperLabel: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  paperRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  paperChip: {
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#475569',
    backgroundColor: '#0f172a',
  },
  paperChipActive: {
    borderColor: '#38bdf8',
    backgroundColor: '#0c4a6e',
  },
  paperChipText: {
    color: '#94a3b8',
    fontWeight: '700',
    fontSize: 12,
  },
  paperChipTextActive: {
    color: '#e0f2fe',
  },
  paperHint: {
    color: '#64748b',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  loadingBox: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    maxHeight: 380,
    marginBottom: 12,
  },
  ticket: {
    width: '100%',
    backgroundColor: '#fffef7',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sampleBanner: {
    textAlign: 'center',
    color: '#b45309',
    fontWeight: '800',
    fontSize: 11,
    marginBottom: 8,
  },
  brand: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 12,
    color: '#4b5563',
    marginTop: 2,
  },
  orderNo: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
    marginVertical: 10,
  },
  divider: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#d1d5db',
    marginVertical: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginVertical: 3,
  },
  rowLabel: {
    color: '#6b7280',
    fontSize: 12,
    flexShrink: 0,
  },
  rowValue: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginVertical: 4,
  },
  itemLabel: {
    flex: 1,
    color: '#111827',
    fontSize: 13,
  },
  itemPrice: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
    minWidth: 48,
    textAlign: 'right',
  },
  itemPriceSummary: {
    fontWeight: '900',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 2,
    borderTopColor: '#111827',
    marginTop: 8,
    paddingTop: 8,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
  },
  noteBox: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  noteLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#374151',
    marginBottom: 4,
  },
  noteText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#dc2626',
  },
  qrBox: {
    alignItems: 'center',
    marginTop: 14,
    gap: 6,
  },
  qrHint: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: '#6b7280',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  actions: {
    gap: 8,
  },
  primaryBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 15,
  },
  secondaryBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  secondaryBtnText: {
    color: '#e2e8f0',
    fontWeight: '800',
    fontSize: 14,
  },
  btnDisabled: {
    opacity: 0.55,
  },
});
