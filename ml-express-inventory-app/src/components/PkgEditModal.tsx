import React, { useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ItemFormFields from './ItemFormFields';
import { useItemFormState } from '../hooks/useItemFormState';
import { useAuth } from '../contexts/AuthContext';
import { resolveAppError, useTranslation } from '../i18n';
import { showTaskSuccess } from '../utils/taskSuccessAlert';
import { updatePackedShipment } from '../services/inventoryService';
import { feedbackService } from '../services/FeedbackService';
import type { PackedShipmentListRow } from '../types/inventory';
import {
  isPackContentLockedForStore,
  packContentLockHint,
} from '../utils/storeOwnership';

type Props = {
  visible: boolean;
  pack: PackedShipmentListRow | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function PkgEditModal({ visible, pack, onClose, onSaved }: Props) {
  const { store } = useAuth();
  const { t } = useTranslation();
  const form = useItemFormState();
  const [saving, setSaving] = React.useState(false);

  useEffect(() => {
    if (!visible || !pack) return;
    form.loadFromStored({
      barcode: pack.bundle_barcode,
      name: pack.bundle_name,
      spec: pack.spec,
      unit: pack.unit,
      weight: pack.weight,
      note: pack.note,
    });
  }, [visible, pack?.id]);

  const packItems = pack?.items ?? [];
  const packItemRefs = packItems.map((item) => ({
    owner_store_code: item.owner_store_code,
    barcode: item.item_barcode,
    destination: item.destination,
  }));
  const contentLocked =
    !!store && packItemRefs.length > 0 && isPackContentLockedForStore(store, packItemRefs);
  const contentLockHint =
    store && contentLocked ? packContentLockHint(store, packItemRefs) : undefined;

  const save = async () => {
    if (!pack) return;
    if (!form.payload.name.trim()) {
      feedbackService.notify(t.common.tip, t.itemForm.alertName);
      return;
    }
    setSaving(true);
    try {
      if (!store) throw new Error(t.common.notLoggedIn);
      await updatePackedShipment(
        pack.id,
        {
          bundle_name: form.payload.name,
          spec: form.payload.spec,
          unit: form.payload.unit,
          weight: form.payload.weight,
        },
        store,
      );
      showTaskSuccess(t.itemForm.saveSuccess, pack.bundle_barcode);
      onSaved();
      onClose();
    } catch (e: unknown) {
      feedbackService.notify(t.common.fail, resolveAppError(t, e));
    } finally {
      setSaving(false);
    }
  };

  if (!pack) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.cancel}>{t.common.cancel}</Text>
          </Pressable>
          <Text style={styles.title}>{t.itemForm.editTitle}</Text>
          <Pressable onPress={() => void save()} hitSlop={10} disabled={saving}>
            <Text style={[styles.save, saving && styles.saveDisabled]}>
              {saving ? t.itemForm.saving : t.common.save}
            </Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.hint}>{t.itemForm.alertBarcode}</Text>
          <ItemFormFields
            form={form}
            barcodeLabel={t.items.packNo}
            barcodeEditable={false}
            unitLocked
            unitHint={t.stockOut.packUnit}
            specLocked={contentLocked}
            weightLocked={contentLocked}
            specHint={contentLockHint}
            weightHint={contentLockHint}
            showPreview
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  cancel: { color: '#94a3b8', fontSize: 16, fontWeight: '600' },
  title: { color: '#f8fafc', fontSize: 17, fontWeight: '800' },
  save: { color: '#a855f7', fontSize: 16, fontWeight: '800' },
  saveDisabled: { opacity: 0.5 },
  body: { padding: 16, paddingBottom: 40 },
  hint: { color: '#64748b', fontSize: 13, lineHeight: 20, marginBottom: 16 },
});
