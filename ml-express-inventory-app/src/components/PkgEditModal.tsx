import React, { useEffect } from 'react';
import {
  Alert,
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
import { showTaskSuccess } from '../utils/taskSuccessAlert';
import { updatePackedShipment } from '../services/inventoryService';
import type { PackedShipmentListRow } from '../types/inventory';

type Props = {
  visible: boolean;
  pack: PackedShipmentListRow | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function PkgEditModal({ visible, pack, onClose, onSaved }: Props) {
  const { store } = useAuth();
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

  const save = async () => {
    if (!pack) return;
    if (!form.payload.name.trim()) {
      Alert.alert('提示', '快递包名称必填');
      return;
    }
    setSaving(true);
    try {
      if (!store) throw new Error('未登录');
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
      showTaskSuccess('保存成功', '快递包信息已更新');
      onSaved();
      onClose();
    } catch (e: unknown) {
      Alert.alert('保存失败', e instanceof Error ? e.message : '请重试');
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
            <Text style={styles.cancel}>取消</Text>
          </Pressable>
          <Text style={styles.title}>编辑快递包</Text>
          <Pressable onPress={() => void save()} hitSlop={10} disabled={saving}>
            <Text style={[styles.save, saving && styles.saveDisabled]}>{saving ? '保存中…' : '保存'}</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.hint}>包装号创建后不可修改，仅可调整名称与规格参数。</Text>
          <ItemFormFields
            form={form}
            barcodeLabel="包装号"
            barcodeEditable={false}
            unitLocked
            unitHint="件数与打包时一致，不可修改"
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
