import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { PackedShipmentDetail } from '../types/inventory';

type Props = {
  visible: boolean;
  pack: PackedShipmentDetail | null;
  onClose: () => void;
};

export default function PkgOrdersModal({ visible, pack, onClose }: Props) {
  if (!pack) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>内含订单</Text>
          <Text style={styles.packageNo} selectable>
            {pack.bundle_barcode}
          </Text>
          <Text style={styles.subtitle}>共 {pack.items.length} 个订单</Text>

          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {pack.items.map((line, index) => (
              <View key={line.id} style={styles.orderRow}>
                <Text style={styles.orderIndex}>{index + 1}</Text>
                <View style={styles.orderBody}>
                  <Text style={styles.orderName} numberOfLines={2}>
                    {line.item_name}
                  </Text>
                  <Text style={styles.orderCode} selectable>
                    入库 {line.item_barcode}
                  </Text>
                  {line.input_barcode ? (
                    <Text style={styles.orderExpress} selectable>
                      快递单 {line.input_barcode}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </ScrollView>

          <Pressable style={styles.btn} onPress={onClose}>
            <Text style={styles.btnText}>关闭</Text>
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
  orderName: { color: '#f8fafc', fontSize: 14, fontWeight: '800' },
  orderCode: {
    color: '#fde68a',
    fontSize: 12,
    fontFamily: 'monospace',
    marginTop: 4,
    fontWeight: '700',
  },
  orderExpress: {
    color: '#7dd3fc',
    fontSize: 12,
    fontFamily: 'monospace',
    marginTop: 2,
    fontWeight: '700',
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
