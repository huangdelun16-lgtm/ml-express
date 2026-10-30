import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import PackagingStockInBarcodeText from './PackagingStockInBarcodeText';
import { useTranslation } from '../i18n';
import type { PackedShipmentDetail } from '../types/inventory';
import { resolvePackOrderCount } from '../utils/itemFieldFormat';
import { resolveItemOrderNumber, resolveItemProductSubtitle } from '../utils/itemOrderNumber';

type Props = {
  visible: boolean;
  pack: PackedShipmentDetail | null;
  onClose: () => void;
};

export default function PkgOrdersModal({ visible, pack, onClose }: Props) {
  const { t, fmt: format } = useTranslation();
  const { height: windowHeight } = useWindowDimensions();
  const [openId, setOpenId] = useState<string | null>(null);
  useEffect(() => {
    setOpenId(null);
  }, [pack?.id, visible]);
  if (!pack) return null;

  const orderCount = resolvePackOrderCount(pack);
  const lines = pack.items;
  const sheetHeight = Math.round(windowHeight * 0.86);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t.common.close} />
        <View style={[styles.card, { maxHeight: sheetHeight, height: lines.length > 8 ? sheetHeight : undefined }]}>
          <Text style={styles.title}>{t.forms.ordersInPack}</Text>
          <Text style={styles.packageNo} selectable>
            {pack.bundle_barcode}
          </Text>
          <Text style={styles.subtitle}>{format(t.forms.orderCount, { count: orderCount })}</Text>

          <ScrollView
            style={lines.length > 8 ? styles.listFill : undefined}
            contentContainerStyle={styles.listContent}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
          >
            {lines.map((line, index) => {
              const orderNumber = resolveItemOrderNumber(line);
              const productSubtitle = resolveItemProductSubtitle(line);
              const open = openId === line.id;
              const customer = line.customer_name?.trim() ?? '';
              return (
                <View key={line.id} style={styles.orderBlock}>
                  <Pressable
                    style={styles.orderRow}
                    onPress={() => setOpenId(open ? null : line.id)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                  >
                    <Text style={styles.orderIndex}>{index + 1}</Text>
                    <Text style={styles.orderName} numberOfLines={1}>
                      {orderNumber}
                    </Text>
                    {customer ? (
                      <Text style={styles.customerName} numberOfLines={1}>
                        {customer}
                      </Text>
                    ) : null}
                    <Text style={styles.chevron}>{open ? '▴' : '▾'}</Text>
                  </Pressable>
                  {open ? (
                    <View style={styles.detail}>
                      {productSubtitle ? (
                        <Text style={styles.productSubtitle} numberOfLines={1}>
                          {productSubtitle}
                        </Text>
                      ) : null}
                      <View style={styles.codeRow}>
                        <View style={styles.tagBlue}>
                          <Text style={styles.tagBlueLabel}>{t.items.expressNo}</Text>
                          <Text style={styles.tagBlueValue} numberOfLines={1} selectable>
                            {line.input_barcode || orderNumber || '—'}
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
                  ) : null}
                </View>
              );
            })}
          </ScrollView>

          <Pressable style={styles.btn} onPress={onClose}>
            <Text style={styles.btnText}>{t.common.close}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(15,23,42,0.75)',
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
    width: '100%',
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
  listFill: { flex: 1 },
  listContent: { gap: 6, paddingBottom: 4 },
  orderBlock: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  orderIndex: {
    color: '#a855f7',
    fontSize: 13,
    fontWeight: '900',
    width: 22,
    textAlign: 'center',
  },
  orderName: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'monospace',
    flex: 1,
  },
  customerName: { color: '#7dd3fc', fontSize: 12, fontWeight: '800', maxWidth: 88 },
  chevron: { color: '#94a3b8', fontSize: 12, fontWeight: '800' },
  detail: { paddingHorizontal: 10, paddingBottom: 10, gap: 6 },
  productSubtitle: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
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
