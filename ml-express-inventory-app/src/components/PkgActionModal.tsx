import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { PackedShipmentListRow } from '../types/inventory';
import { PACK_DISPLAY_LABEL, packStatusStyle } from '../utils/packDisplayStatus';

type Props = {
  visible: boolean;
  pack: PackedShipmentListRow | null;
  onClose: () => void;
  onEdit: () => void;
  onPrint: () => void;
  onViewOrders?: () => void;
  onResyncCloud?: () => void;
  canEdit?: boolean;
};

export default function PkgActionModal({
  visible,
  pack,
  onClose,
  onEdit,
  onPrint,
  onViewOrders,
  onResyncCloud,
  canEdit = true,
}: Props) {
  if (!pack) return null;

  const statusStyle = packStatusStyle(pack.display_status);
  const statusLabel = PACK_DISPLAY_LABEL[pack.display_status];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.accent, { backgroundColor: statusStyle.border }]} />
          <Text style={styles.title} numberOfLines={2}>
            {pack.bundle_name}
          </Text>
          <Text style={styles.barcode} numberOfLines={1}>
            {pack.bundle_barcode}
          </Text>
          <View style={styles.metaRow}>
            <View style={[styles.badge, { backgroundColor: statusStyle.badgeBg }]}>
              <Text style={[styles.badgeText, { color: statusStyle.badgeText }]}>{statusLabel}</Text>
            </View>
            <Text style={styles.countMeta}>{pack.items.length} 件</Text>
          </View>

          {canEdit ? (
            <Pressable style={styles.btnEdit} onPress={onEdit}>
              <Text style={styles.btnEditText}>编辑快递包</Text>
            </Pressable>
          ) : (
            <View style={styles.readonlyHint}>
              <Text style={styles.readonlyHintText}>
                该快递包由其他站点打包登记，本站仅可查看与打印
              </Text>
            </View>
          )}
          <Pressable style={styles.btnPrint} onPress={onPrint}>
            <Text style={styles.btnPrintText}>打印标签</Text>
          </Pressable>
          {onResyncCloud ? (
            <Pressable style={styles.btnResync} onPress={onResyncCloud}>
              <Text style={styles.btnResyncText}>补传云端（到站可扫码）</Text>
            </Pressable>
          ) : null}
          {onViewOrders && pack.items.length > 0 ? (
            <Pressable style={styles.btnOrders} onPress={onViewOrders}>
              <Text style={styles.btnOrdersText}>查看内含订单</Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.btnCancel} onPress={onClose}>
            <Text style={styles.btnCancelText}>关闭</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.78)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 30,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  accent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  title: { color: '#f8fafc', fontSize: 18, fontWeight: '900', marginTop: 4 },
  barcode: {
    color: '#c4b5fd',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'monospace',
    marginTop: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    marginBottom: 18,
  },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '900' },
  countMeta: { color: '#94a3b8', fontSize: 13, fontWeight: '700' },
  btnEdit: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#a855f7',
    marginBottom: 10,
  },
  btnEditText: { color: '#e9d5ff', fontWeight: '800', fontSize: 16 },
  readonlyHint: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#475569',
    marginBottom: 10,
  },
  readonlyHintText: { color: '#94a3b8', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  btnPrint: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnPrintText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  btnResync: {
    backgroundColor: '#0f766e',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnResyncText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  btnOrders: {
    backgroundColor: 'transparent',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
    marginBottom: 6,
  },
  btnOrdersText: { color: '#cbd5e1', fontWeight: '700', fontSize: 15 },
  btnCancel: { paddingVertical: 10, alignItems: 'center' },
  btnCancelText: { color: '#64748b', fontWeight: '700', fontSize: 15 },
});
