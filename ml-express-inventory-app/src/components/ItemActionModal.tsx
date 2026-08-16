import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import CopyableCodeRow from './CopyableCodeRow';
import { useTranslation } from '../i18n';
import type { InventoryItem, InventoryItemListRow } from '../types/inventory';
import { packDestinationFromBarcode } from '../utils/packageNumber';
import { resolveItemOrderNumber } from '../utils/itemOrderNumber';

type ItemRow = InventoryItem | InventoryItemListRow;

type Props = {
  visible: boolean;
  item: ItemRow | null;
  variant?: 'item' | 'pack';
  onClose: () => void;
  onView: () => void;
  onEdit: () => void;
  onPrint?: () => void;
  onSignDelivered?: () => void;
  canEdit?: boolean;
  canSignDelivered?: boolean;
};

export default function ItemActionModal({
  visible,
  item,
  variant = 'item',
  onClose,
  onView,
  onEdit,
  onPrint,
  onSignDelivered,
  canEdit = true,
  canSignDelivered = false,
}: Props) {
  const { t } = useTranslation();

  if (!item) return null;

  const isPack = variant === 'pack';
  const accent = isPack ? '#a855f7' : '#2563eb';
  const dest = isPack ? packDestinationFromBarcode(item.barcode) : '';
  const showSign = !isPack && canSignDelivered && onSignDelivered;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.accent, { backgroundColor: accent }]} />
          {isPack ? (
            <View style={styles.packTypeRow}>
              <Text style={styles.packTypeLabel}>{t.nav.pkg}</Text>
              {dest ? <Text style={styles.packDest}>→ {dest}</Text> : null}
            </View>
          ) : null}
          <Text style={styles.title} numberOfLines={2}>
            {isPack ? item.name : resolveItemOrderNumber(item)}
          </Text>
          {!isPack ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {item.customer_name || t.items.noCustomer}
              {item.destination ? ` · ${item.destination}` : ''}
            </Text>
          ) : null}

          {!isPack ? (
            <View style={styles.codeBlock}>
              <CopyableCodeRow
                label={t.items.expressNo}
                value={item.input_barcode ?? ''}
                copiedLabel={t.common.copied}
                tapHint={t.common.tapToCopy}
                variant="dark"
              />
              <CopyableCodeRow
                label={t.items.inbound}
                value={item.barcode}
                copiedLabel={t.common.copied}
                tapHint={t.common.tapToCopy}
                variant="dark"
              />
            </View>
          ) : (
            <CopyableCodeRow
              label={t.nav.pkg}
              value={item.barcode}
              copiedLabel={t.common.copied}
              tapHint={t.common.tapToCopy}
              variant="dark"
            />
          )}

          <View style={styles.btnRow}>
            <Pressable style={[styles.btnView, canEdit ? styles.btnHalf : styles.btnFull]} onPress={onView}>
              <Text style={styles.btnViewText}>{t.common.show}</Text>
            </Pressable>
            {canEdit ? (
              <Pressable
                style={[styles.btnEdit, isPack && styles.btnEditPack, styles.btnHalf]}
                onPress={onEdit}
              >
                <Text style={[styles.btnEditText, isPack && styles.btnEditTextPack]}>
                  {t.itemForm.editTitle}
                </Text>
              </Pressable>
            ) : null}
          </View>

          {!canEdit && !isPack ? (
            <View style={styles.readonlyHint}>
              <Text style={styles.readonlyHintText}>{t.items.cannotEditBody}</Text>
            </View>
          ) : null}

          <View style={styles.actionStack}>
            {showSign ? (
              <Pressable style={styles.btnSign} onPress={onSignDelivered}>
                <Text style={styles.btnSignText}>{t.common.signedMark}</Text>
              </Pressable>
            ) : null}

            {onPrint ? (
              <Pressable style={styles.btnPrint} onPress={onPrint}>
                <Text style={styles.btnPrintText}>{t.itemForm.printLabel}</Text>
              </Pressable>
            ) : null}
          </View>

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
  packTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 6,
  },
  packTypeLabel: {
    color: '#e9d5ff',
    fontSize: 11,
    fontWeight: '900',
    backgroundColor: 'rgba(168,85,247,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  packDest: { color: '#38bdf8', fontSize: 12, fontWeight: '700' },
  title: { color: '#f8fafc', fontSize: 18, fontWeight: '900' },
  barcode: {
    color: '#c4b5fd',
    fontSize: 14,
    fontWeight: '800',
    fontFamily: 'monospace',
    marginTop: 6,
    marginBottom: 16,
  },
  subtitle: { color: '#94a3b8', fontSize: 13, marginTop: 4, marginBottom: 10 },
  codeBlock: { marginBottom: 8 },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  btnHalf: { flex: 1 },
  btnFull: { flex: 1 },
  btnView: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnViewText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  btnEdit: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  btnEditPack: { borderColor: '#a855f7' },
  btnEditText: { color: '#e2e8f0', fontWeight: '800', fontSize: 16 },
  btnEditTextPack: { color: '#e9d5ff' },
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
  actionStack: {
    gap: 10,
    marginBottom: 10,
  },
  btnSign: {
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnSignText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  btnPrint: {
    backgroundColor: '#0284c7',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnPrintText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  btnCancel: { paddingVertical: 10, alignItems: 'center' },
  btnCancelText: { color: '#64748b', fontWeight: '700', fontSize: 15 },
});
