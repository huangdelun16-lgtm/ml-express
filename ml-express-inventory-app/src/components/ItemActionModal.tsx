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
  onNotifyCustomer?: () => void;
  onReportException?: () => void;
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
  onNotifyCustomer,
  onReportException,
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
                compact
              />
              <CopyableCodeRow
                label={t.items.inbound}
                value={item.barcode}
                copiedLabel={t.common.copied}
                tapHint={t.common.tapToCopy}
                variant="dark"
                compact
              />
            </View>
          ) : (
            <CopyableCodeRow
              label={t.nav.pkg}
              value={item.barcode}
              copiedLabel={t.common.copied}
              tapHint={t.common.tapToCopy}
              variant="dark"
              compact
            />
          )}

          <View style={styles.actionGrid}>
            <Pressable style={[styles.chip, styles.chipView]} onPress={onView}>
              <Text style={styles.chipText}>{t.common.show}</Text>
            </Pressable>
            {canEdit ? (
              <Pressable
                style={[styles.chip, styles.chipEdit, isPack && styles.chipEditPack]}
                onPress={onEdit}
              >
                <Text style={[styles.chipText, styles.chipTextMuted, isPack && styles.chipTextPack]}>
                  {t.itemForm.editTitle}
                </Text>
              </Pressable>
            ) : null}

            {showSign && onNotifyCustomer ? (
              <Pressable style={[styles.chip, styles.chipNotify]} onPress={onNotifyCustomer}>
                <Text style={styles.chipText}>{t.arrivalNotify.notifyCustomer}</Text>
              </Pressable>
            ) : null}

            {showSign ? (
              <Pressable style={[styles.chip, styles.chipSign]} onPress={onSignDelivered}>
                <Text style={styles.chipText}>{t.common.signedMark}</Text>
              </Pressable>
            ) : null}

            {onPrint ? (
              <Pressable style={[styles.chip, styles.chipPrint]} onPress={onPrint}>
                <Text style={styles.chipText}>{t.itemForm.printLabel}</Text>
              </Pressable>
            ) : null}

            {!isPack && onReportException ? (
              <Pressable style={[styles.chip, styles.chipException]} onPress={onReportException}>
                <Text style={styles.chipText}>{t.exception.report}</Text>
              </Pressable>
            ) : null}
          </View>

          {!canEdit && !isPack ? (
            <Text style={styles.readonlyHint}>{t.items.cannotEditBody}</Text>
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
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 18,
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
  title: { color: '#f8fafc', fontSize: 16, fontWeight: '900' },
  subtitle: { color: '#94a3b8', fontSize: 12, marginTop: 2, marginBottom: 8 },
  codeBlock: { marginBottom: 6 },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  chip: {
    flexGrow: 1,
    flexBasis: '47%',
    minHeight: 34,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  chipTextMuted: { color: '#e2e8f0' },
  chipTextPack: { color: '#e9d5ff' },
  chipView: { backgroundColor: '#2563eb' },
  chipEdit: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#475569',
  },
  chipEditPack: { borderColor: '#a855f7' },
  chipNotify: { backgroundColor: '#16a34a' },
  chipSign: { backgroundColor: '#059669' },
  chipPrint: { backgroundColor: '#0284c7' },
  chipException: { backgroundColor: '#b45309' },
  readonlyHint: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 2,
  },
  btnCancel: { paddingVertical: 8, alignItems: 'center' },
  btnCancelText: { color: '#64748b', fontWeight: '700', fontSize: 13 },
});
