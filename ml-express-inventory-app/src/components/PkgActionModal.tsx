import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { fmt, getPackStatusLabel, useTranslation } from '../i18n';
import type { PackedShipmentListRow } from '../types/inventory';
import { regionDisplayLabel } from '../constants/destinationOptions';
import { packStatusStyle } from '../utils/packDisplayStatus';
import { resolvePackOrderCount, stockUnitLabel } from '../utils/itemFieldFormat';

type Props = {
  visible: boolean;
  pack: PackedShipmentListRow | null;
  onClose: () => void;
  onEdit: () => void;
  onPrint: () => void;
  onViewOrders?: () => void;
  onResyncCloud?: () => void;
  onUnpack?: () => void;
  canEdit?: boolean;
  canUnpack?: boolean;
  unpacking?: boolean;
};

export default function PkgActionModal({
  visible,
  pack,
  onClose,
  onEdit,
  onPrint,
  onViewOrders,
  onResyncCloud,
  onUnpack,
  canEdit = true,
  canUnpack = false,
  unpacking = false,
}: Props) {
  const { t, fmt, language } = useTranslation();

  if (!pack) return null;

  const statusStyle = packStatusStyle(pack.display_status);
  const statusLabel = getPackStatusLabel(language, pack.display_status);
  const orderCount = resolvePackOrderCount(pack);

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
            <Text style={styles.countMeta}>{orderCount} {stockUnitLabel()}</Text>
          </View>
          {pack.loaded && pack.transport_fee?.trim() ? (
            <Text style={styles.feeMeta}>
              {t.pkg.transportFee} {pack.transport_fee} MMK
              {pack.truck_leg_destination
                ? ` · ${fmt(t.pkg.legPrefix, { dest: regionDisplayLabel(pack.truck_leg_destination) })}`
                : ''}
            </Text>
          ) : null}

          {canEdit || (onViewOrders && orderCount > 0) ? (
            <View style={styles.dualBtnRow}>
              {canEdit ? (
                <Pressable style={[styles.dualBtn, styles.dualBtnEdit]} onPress={onEdit}>
                  <Text style={styles.btnEditText}>{t.itemForm.editTitle}</Text>
                </Pressable>
              ) : null}
              {onViewOrders && orderCount > 0 ? (
                <Pressable
                  style={[styles.dualBtn, styles.dualBtnOrders, !canEdit && styles.dualBtnFull]}
                  onPress={onViewOrders}
                >
                  <Text style={styles.btnOrdersText}>{t.hubReceive.modalTitle}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <View style={styles.readonlyHint}>
              <Text style={styles.readonlyHintText}>{t.items.cannotEditBody}</Text>
            </View>
          )}
          {canUnpack && onUnpack ? (
            <Pressable
              style={[styles.btnUnpack, unpacking && styles.btnBusy]}
              onPress={onUnpack}
              disabled={unpacking}
            >
              <Text style={styles.btnUnpackText}>
                {unpacking ? t.common.processing : t.pkg.unpackTitle}
              </Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.btnPrint} onPress={onPrint}>
            <Text style={styles.btnPrintText}>{t.itemForm.printLabel}</Text>
          </Pressable>
          {onResyncCloud ? (
            <Pressable style={styles.btnResync} onPress={onResyncCloud}>
              <Text style={styles.btnResyncText}>{t.pkg.resyncSuccess}</Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.btnCancel} onPress={onClose}>
            <Text style={styles.btnCancelText}>{t.common.close}</Text>
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
  feeMeta: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 14,
  },
  dualBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  dualBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    minWidth: 0,
  },
  dualBtnFull: { flex: 1 },
  dualBtnEdit: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#a855f7',
  },
  dualBtnOrders: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#475569',
  },
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
  btnUnpack: {
    backgroundColor: 'transparent',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  btnUnpackText: { color: '#f87171', fontWeight: '800', fontSize: 15 },
  btnBusy: { opacity: 0.6 },
  btnOrdersText: { color: '#cbd5e1', fontWeight: '700', fontSize: 14 },
  btnCancel: { paddingVertical: 10, alignItems: 'center' },
  btnCancelText: { color: '#64748b', fontWeight: '700', fontSize: 15 },
});
