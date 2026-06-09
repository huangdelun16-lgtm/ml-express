import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ItemFormFields from '../components/ItemFormFields';
import PrintLabelModal from '../components/PrintLabelModal';
import { useItemFormState } from '../hooks/useItemFormState';
import { useAuth } from '../contexts/AuthContext';
import { cancelInventoryItem, getItemById, upsertItem } from '../services/inventoryService';
import { stockUnitLabel } from '../utils/itemFieldFormat';

type Route = { params?: { itemId?: string } };

export default function ItemFormScreen({
  route,
  navigation,
}: {
  route: Route;
  navigation: { goBack: () => void };
}) {
  const { operatorName } = useAuth();
  const itemId = route.params?.itemId;
  const isEdit = !!itemId;
  const form = useItemFormState();
  const [qtyOnHand, setQtyOnHand] = useState(0);
  const [loading, setLoading] = useState(false);
  const [printVisible, setPrintVisible] = useState(false);

  useEffect(() => {
    if (!itemId) return;
    (async () => {
      const item = await getItemById(itemId);
      if (!item) return;
      form.loadFromStored(item);
      setQtyOnHand(item.qty_on_hand);
    })();
  }, [itemId]);

  const save = async () => {
    if (!form.payload.barcode || !form.payload.name) {
      Alert.alert('提示', '条码和商品名称必填');
      return;
    }
    setLoading(true);
    try {
      await upsertItem({
        ...form.payload,
        id: itemId,
        min_qty: 0,
      });
      Alert.alert('已保存', form.payload.name, [{ text: '好的', onPress: () => navigation.goBack() }]);
    } catch (e: unknown) {
      Alert.alert('失败', e instanceof Error ? e.message : '请重试');
    } finally {
      setLoading(false);
    }
  };

  const openPrintLabel = () => {
    if (!form.payload.barcode || !form.payload.name) {
      Alert.alert('提示', '请先填写条码和商品名称');
      return;
    }
    setPrintVisible(true);
  };

  const cancelOrder = () => {
    if (!itemId) return;
    Alert.alert(
      '取消订单',
      '确定要取消此订单吗？删除后不可恢复。若为包裹，内含商品库存将退回。',
      [
        { text: '返回', style: 'cancel' },
        {
          text: '确定取消',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setLoading(true);
              try {
                await cancelInventoryItem(itemId, operatorName ?? '工作人员');
                Alert.alert('已取消', '订单已删除', [
                  { text: '好的', onPress: () => navigation.goBack() },
                ]);
              } catch (e: unknown) {
                Alert.alert('失败', e instanceof Error ? e.message : '请重试');
              } finally {
                setLoading(false);
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Text style={styles.title}>{isEdit ? '编辑商品' : '新建商品'}</Text>
          {isEdit ? (
            <View style={styles.stockBadge}>
              <Text style={styles.stockLabel}>当前库存</Text>
              <Text style={styles.stockValue}>
                {qtyOnHand} <Text style={styles.stockUnit}>{stockUnitLabel()}</Text>
              </Text>
            </View>
          ) : (
            <Text style={styles.subtitle}>填写条码与名称，规格参数只需改数字</Text>
          )}
        </View>

        <ItemFormFields form={form} barcodeEditable={!isEdit} />

        <View style={styles.actions}>
          <Pressable style={[styles.btn, loading && styles.btnDisabled]} onPress={save} disabled={loading}>
            <Text style={styles.btnText}>{loading ? '保存中…' : '保存商品'}</Text>
          </Pressable>
          <Pressable style={styles.btnGhost} onPress={openPrintLabel}>
            <Text style={styles.btnGhostText}>🖨 打印标签</Text>
          </Pressable>
          {isEdit ? (
            <Pressable
              style={[styles.btnDanger, loading && styles.btnDisabled]}
              onPress={cancelOrder}
              disabled={loading}
            >
              <Text style={styles.btnDangerText}>取消订单</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      <PrintLabelModal
        visible={printVisible}
        payload={printVisible ? form.payload : null}
        onClose={() => setPrintVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 16, paddingBottom: 48 },
  hero: { marginBottom: 20 },
  title: { color: '#f8fafc', fontSize: 24, fontWeight: '900' },
  subtitle: { color: '#94a3b8', marginTop: 8, fontSize: 14, lineHeight: 20 },
  stockBadge: {
    marginTop: 14,
    alignSelf: 'flex-start',
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  stockLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '700' },
  stockValue: { color: '#fbbf24', fontSize: 22, fontWeight: '900', marginTop: 2 },
  stockUnit: { color: '#fde68a', fontSize: 16 },
  actions: { gap: 10, marginTop: 8 },
  btn: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  btnGhost: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
    backgroundColor: '#1e293b',
  },
  btnGhostText: { color: '#e2e8f0', fontWeight: '700', fontSize: 15 },
  btnDanger: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.45)',
    backgroundColor: 'rgba(127,29,29,0.25)',
  },
  btnDangerText: { color: '#fca5a5', fontWeight: '800', fontSize: 15 },
});
