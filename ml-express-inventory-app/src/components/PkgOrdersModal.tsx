import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import PackagingStockInBarcodeText from './PackagingStockInBarcodeText';
import { useTranslation } from '../i18n';
import type { PackedShipmentDetail } from '../types/inventory';
import { resolvePackOrderCount } from '../utils/itemFieldFormat';

type Props = {
  visible: boolean;
  pack: PackedShipmentDetail | null;
  onClose: () => void;
};

export default function PkgOrdersModal({ visible, pack, onClose }: Props) {
  const { t, fmt: format } = useTranslation();
  if (!pack) return null;

  const orderCount = resolvePackOrderCount(pack);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{t.forms.ordersInPack}</Text>
          <Text style={styles.packageNo} selectable>
            {pack.bundle_barcode}
          </Text>
          <Text style={styles.subtitle}>{format(t.forms.orderCount, { count: orderCount })}</Text>

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {pack.items.map((line, index) => (
              <View key={line.id} style={styles.orderRow}>
                <Text style={styles.orderIndex}>{index + 1}</Text>
                <View style={styles.orderBody}>
                  <Text style={styles.customerName} numberOfLines={1}>
                    {line.customer_name?.trim() || t.items.noCustomer}
                  </Text>
                  <Text style={styles.orderName} numberOfLines={2}>
                    {line.item_name}
                  </Text>
                  <View style={styles.codeRow}>
                    <View style={styles.tagBlue}>
                      <Text style={styles.tagBlueLabel}>{t.items.expressNo}</Text>
                      <Text style={styles.tagBlueValue} numberOfLines={1} selectable>
                        {line.input_barcode || '—'}
                      </Text>
                    </View>
                    <View style={styles.tagYellow}>
                      <Text style={styles.tagYellowLabel}>{t.forms.inboundSlip}</Text>
                      <PackagingStockInBarcodeText
                        barcode={line.item_barcode}
                        variant="list"
                        numberOfLines={1}
                        selectable
                      />
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>

          <Pressable style={styles.btn} onPress={onClose}>
            <Text style={styles.btnText}>{t.common.close}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: '80%',
  },
  title: { color: '#c4b5fd', fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  packageNo: {
    color: '#d8b4fe',
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'monospace',
    marginTop: 6,
  },
  subtitle: { color: '#94a3b8', fontSize: 13, marginTop: 4, marginBottom: 12 },
  list: { maxHeight: 360 },
  listContent: { gap: 8, paddingBottom: 4 },
  orderRow: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  orderIndex: {
    color: '#a855f7',
    fontSize: 14,
    fontWeight: '900',
    width: 18,
    textAlign: 'center',
    marginTop: 1,
  },
  orderBody: { flex: 1, minWidth: 0 },
  customerName: { color: '#7dd3fc', fontSize: 13, fontWeight: '800', marginBottom: 2 },
  orderName: { color: '#f8fafc', fontSize: 14, fontWeight: '800' },
  codeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 6,
  },
  tagBlue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    maxWidth: '100%',
    backgroundColor: 'rgba(56,189,248,0.1)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
  },
  tagBlueLabel: { color: '#38bdf8', fontSize: 10, fontWeight: '800' },
  tagBlueValue: {
    color: '#7dd3fc',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'monospace',
    flexShrink: 1,
  },
  tagYellow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    maxWidth: '100%',
    backgroundColor: 'rgba(251,191,36,0.1)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
  },
  tagYellowLabel: { color: '#fbbf24', fontSize: 10, fontWeight: '800' },
  tagYellowValue: {
    color: '#fde68a',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'monospace',
    flexShrink: 1,
  },
  btn: {
    marginTop: 14,
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
