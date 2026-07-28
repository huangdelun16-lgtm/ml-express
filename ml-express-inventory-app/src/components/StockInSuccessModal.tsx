import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import BarcodeImage from './BarcodeImage';
import { useIosBlePrinterGate } from '../hooks/useIosBlePrinterGate';
import { resolvePrintError, useTranslation } from '../i18n';
import { printInboundBarcodeOnly } from '../services/printerService';

export type StockInSuccessData = {
  barcode: string;
  inputBarcode?: string;
  productName: string;
  inboundDateLabel: string;
  recipientName: string;
  destination: string;
  qty: number;
  spec?: string;
  weight?: string;
};

type Props = {
  visible: boolean;
  data: StockInSuccessData | null;
  onDone: () => void;
};

export default function StockInSuccessModal({ visible, data, onDone }: Props) {
  const { t } = useTranslation();
  const [printing, setPrinting] = useState(false);
  const { runWithBleGate, blePicker } = useIosBlePrinterGate({ presentation: 'overlay' });

  const printBarcode = async () => {
    if (!data?.barcode) return;
    setPrinting(true);
    await runWithBleGate(
      async () => {
        const ok = await printInboundBarcodeOnly(data.barcode, data.inputBarcode, {
          name: data.productName,
          destination: data.destination,
          customerName: data.recipientName,
        });
        if (!ok) {
          Alert.alert(t.common.tip, t.settings.printDisabled);
          return;
        }
        Alert.alert(t.settings.printSentTitle, t.settings.printSentBody);
      },
      {
        setBusy: setPrinting,
        onError: (e) => {
          Alert.alert(t.settings.printFailed, resolvePrintError(t, e));
        },
      },
    );
    setPrinting(false);
  };

  if (!data) return null;

  const meta = [data.spec, data.weight].filter(Boolean).join(' · ');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDone}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Text style={styles.icon}>✓</Text>
          </View>
          <Text style={styles.title}>{t.stockIn.inboundSuccess}</Text>
          <Text style={styles.summary}>+{data.qty}</Text>

          <View style={styles.infoBox}>
            <InfoRow label={t.forms.inboundDate} value={data.inboundDateLabel} />
            <InfoRow label={t.stockIn.finalDest} value={data.destination} />
            {meta ? (
              <InfoRow
                label={`${t.trackExpress.spec} / ${t.trackExpress.weight}`}
                value={meta}
              />
            ) : null}
          </View>

          <View style={styles.barcodeSection}>
            <BarcodeImage
              code={data.barcode}
              height={72}
              maxWidth={260}
              showCodeText
            />
          </View>

          <Pressable
            style={[styles.btnPrint, printing && styles.btnDisabled]}
            onPress={printBarcode}
            disabled={printing}
          >
            <Text style={styles.btnPrintText}>
              {printing ? t.items.printing : t.itemForm.printLabel}
            </Text>
          </Pressable>
          <Pressable style={styles.btnDone} onPress={onDone}>
            <Text style={styles.btnDoneText}>{t.nav.home}</Text>
          </Pressable>
        </View>
        {blePicker}
      </View>
    </Modal>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.78)',
    justifyContent: 'center',
    padding: 20,
    position: 'relative',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#334155',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(5,150,105,0.2)',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  icon: { color: '#6ee7b7', fontSize: 28, fontWeight: '900' },
  title: { color: '#6ee7b7', fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 10 },
  summary: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 14,
  },
  infoBox: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  infoRow: { flexDirection: 'row', gap: 10 },
  infoLabel: { color: '#64748b', fontSize: 12, fontWeight: '700', width: 78 },
  infoValue: { flex: 1, color: '#e2e8f0', fontSize: 13, fontWeight: '700' },
  inputCodeText: {
    color: '#0284c7',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: 10,
  },
  codeText: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'monospace',
    textAlign: 'center',
    letterSpacing: 1,
    marginTop: 10,
  },
  barcodeSection: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  btnPrint: {
    marginTop: 18,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.7 },
  btnPrintText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  btnDone: {
    marginTop: 10,
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDoneText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
