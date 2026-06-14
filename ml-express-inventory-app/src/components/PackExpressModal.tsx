import React, { useEffect, useMemo } from 'react';
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
import DestinationPickerField from './DestinationPickerField';
import ItemFormFields from './ItemFormFields';
import { PACK_DESTINATION_OPTIONS } from '../constants/destinationOptions';
import { useItemFormState } from '../hooks/useItemFormState';
import { generatePackageNumber } from '../services/inventoryService';
import type { InventoryStoreSession } from '../services/authService';
import type { InventoryItem } from '../types/inventory';
import { extractDestinationCode } from '../utils/inboundBarcode';
import { aggregatePackSpecFromItems, sumPackageWeightsKg } from '../utils/itemFieldFormat';
import {
  isPackContentLockedForStore,
  packContentLockHint,
} from '../utils/storeOwnership';

type Props = {
  visible: boolean;
  selectedItems: InventoryItem[];
  operatorName: string;
  store: InventoryStoreSession | null;
  onClose: () => void;
  onSubmit: (payload: {
    barcode: string;
    name: string;
    spec: string;
    unit: string;
    weight: string;
    note: string;
  }) => Promise<void>;
};

function formatPackNote(items: InventoryItem[], operatorName: string): string {
  return `打包人：${operatorName}\n包含 ${items.length} 件`;
}

function guessDestination(items: InventoryItem[]): string {
  for (const item of items) {
    const raw = item.destination?.trim();
    if (!raw) continue;
    const code = extractDestinationCode(raw);
    if ((PACK_DESTINATION_OPTIONS as readonly string[]).includes(code)) return code;
  }
  return '';
}

export default function PackExpressModal({
  visible,
  selectedItems,
  operatorName,
  store,
  onClose,
  onSubmit,
}: Props) {
  const form = useItemFormState();
  const [loading, setLoading] = React.useState(false);
  const [destination, setDestination] = React.useState('');
  const selectedKey = useMemo(
    () => selectedItems.map((i) => i.id).join(','),
    [selectedItems],
  );
  const packSpec = useMemo(
    () => aggregatePackSpecFromItems(selectedItems),
    [selectedItems],
  );
  const totalWeightN = useMemo(
    () => sumPackageWeightsKg(selectedItems.map((i) => i.weight)),
    [selectedItems],
  );
  const bundleContentLocked = useMemo(
    () => (store ? isPackContentLockedForStore(store, selectedItems) : false),
    [store, selectedItems],
  );
  const contentLockHint = useMemo(
    () => (store && bundleContentLocked ? packContentLockHint(store, selectedItems) : undefined),
    [store, bundleContentLocked, selectedItems],
  );
  const autoFillHint = bundleContentLocked
    ? contentLockHint
    : '已从已选订单入库登记自动汇总规格与重量';

  useEffect(() => {
    if (!visible || selectedItems.length === 0) return;
    setDestination(guessDestination(selectedItems));
    form.setSpecL(packSpec.l);
    form.setSpecW(packSpec.w);
    form.setSpecH(packSpec.h);
    form.setWeightN(totalWeightN);
  }, [visible, selectedKey, totalWeightN, packSpec]);

  useEffect(() => {
    if (!visible || selectedItems.length === 0 || !destination) return;
    let cancelled = false;

    void (async () => {
      try {
        const packageNo = await generatePackageNumber(destination, selectedItems.length);
        if (cancelled) return;
        const names = selectedItems.map((i) => i.name).slice(0, 3).join('、');
        const suffix = selectedItems.length > 3 ? ` 等${selectedItems.length}件` : '';
        const packCount = String(Math.max(1, selectedItems.length));
        form.reset({
          barcode: packageNo,
          name: `快递包-${names}${suffix}`,
          specL: packSpec.l,
          specW: packSpec.w,
          specH: packSpec.h,
          unitN: packCount,
          weightN: totalWeightN,
          note: formatPackNote(selectedItems, operatorName),
        });
      } catch (e: unknown) {
        if (!cancelled) {
          Alert.alert('提示', e instanceof Error ? e.message : '无法生成包装号');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, selectedKey, operatorName, destination, totalWeightN, packSpec]);

  const save = async () => {
    if (!destination) {
      Alert.alert('提示', '请选择目的地');
      return;
    }
    if (!form.payload.barcode || !form.payload.name) {
      Alert.alert('提示', '包装号和名称必填');
      return;
    }
    setLoading(true);
    try {
      await onSubmit(form.payload);
      onClose();
    } catch (e: unknown) {
      Alert.alert('打包失败', e instanceof Error ? e.message : '请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.cancel}>取消</Text>
          </Pressable>
          <Text style={styles.headerTitle}>打包快递</Text>
          <View style={{ width: 48 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.subtitle}>填写快递包裹信息（与新建商品相同）</Text>

          <View style={styles.selectedBox}>
            <Text style={styles.selectedTitle}>已选 {selectedItems.length} 个入库商品</Text>
            {selectedItems.map((item) => (
              <Text key={item.id} style={styles.selectedLine}>
                · {item.customer_name ? `${item.customer_name} · ` : ''}
                {item.destination ? `[${extractDestinationCode(item.destination)}] ` : ''}
                {item.name}
              </Text>
            ))}
          </View>

          <View style={styles.formSection}>
            <DestinationPickerField value={destination} onChange={setDestination} />
          </View>

          <ItemFormFields
            form={form}
            barcodeLabel="包装号 *"
            barcodeEditable={false}
            barcodeHint="PKG + 年份 + 目的地 + 件数 + 流水号（如 PKG26YGN20001）"
            unitLocked
            unitHint={`已选 ${selectedItems.length} 个包裹，自动填写 ${selectedItems.length} Pcs`}
            specLocked={bundleContentLocked}
            weightLocked={bundleContentLocked}
            specHint={autoFillHint}
            weightHint={autoFillHint}
          />

          <Pressable style={[styles.btn, loading && styles.btnDisabled]} onPress={save} disabled={loading}>
            <Text style={styles.btnText}>{loading ? '打包中…' : '确认打包'}</Text>
          </Pressable>
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
    paddingTop: Platform.OS === 'ios' ? 16 : 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  cancel: { color: '#60a5fa', fontWeight: '700', fontSize: 16, width: 48 },
  headerTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '800' },
  content: { padding: 16, paddingBottom: 40 },
  subtitle: { color: '#94a3b8', fontSize: 14, marginBottom: 14, lineHeight: 20 },
  selectedBox: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#7c3aed',
  },
  selectedTitle: { color: '#c4b5fd', fontWeight: '800', marginBottom: 8 },
  selectedLine: { color: '#cbd5e1', fontSize: 13, marginTop: 4 },
  formSection: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  btn: {
    backgroundColor: '#7c3aed',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
