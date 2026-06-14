import React, { useEffect, useMemo, useState } from 'react';
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
import InboundOrderFormBody from '../components/InboundOrderFormBody';
import OrderBarcodeModal, { type OrderBarcodeData } from '../components/OrderBarcodeModal';
import { useItemFormState } from '../hooks/useItemFormState';
import { useAuth } from '../contexts/AuthContext';
import { normalizePackDestination } from '../constants/destinationOptions';
import {
  cancelInventoryItem,
  getItemDetail,
  getItemFirstInboundDate,
  resolveItemOwnerStoreCode,
  updateItemInboundProfile,
  upsertItem,
} from '../services/inventoryService';
import {
  formatSpec,
  formatUnit,
  formatWeight,
  parseSpec,
  parseUnit,
  parseWeight,
} from '../utils/itemFieldFormat';
import { inboundOrderBarcodeData } from '../utils/orderBarcodeData';
import {
  formatInboundDateLabel,
  formatInboundDateYmd,
} from '../utils/stockInDate';
import { canEditOwnedRecord, editDeniedMessage } from '../utils/storeOwnership';
import { showTaskSuccess } from '../utils/taskSuccessAlert';

type Route = { params?: { itemId?: string } };

export default function ItemFormScreen({
  route,
  navigation,
}: {
  route: Route;
  navigation: { goBack: () => void };
}) {
  const { operatorName, store } = useAuth();
  const itemId = route.params?.itemId;
  const isEdit = !!itemId;
  const form = useItemFormState();
  const [loading, setLoading] = useState(false);
  const [orderBarcodeData, setOrderBarcodeData] = useState<OrderBarcodeData | null>(null);
  const [editable, setEditable] = useState(true);
  const [ownerCode, setOwnerCode] = useState('');

  const [productName, setProductName] = useState('');
  const [specL, setSpecL] = useState('');
  const [specW, setSpecW] = useState('');
  const [specH, setSpecH] = useState('');
  const [weightN, setWeightN] = useState('');
  const [packaging, setPackaging] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [destination, setDestination] = useState('');
  const [note, setNote] = useState('');
  const [inboundBarcode, setInboundBarcode] = useState('');
  const [unitN, setUnitN] = useState('1');
  const [qtyOnHand, setQtyOnHand] = useState(0);
  const [inboundDateLabel, setInboundDateLabel] = useState('');
  const [inboundDateYmd, setInboundDateYmd] = useState('');

  const specStr = useMemo(
    () => formatSpec({ l: specL, w: specW, h: specH }),
    [specL, specW, specH],
  );
  const weightStr = useMemo(() => formatWeight({ n: weightN }), [weightN]);

  useEffect(() => {
    if (!itemId) {
      setEditable(true);
      return;
    }
    (async () => {
      const detail = await getItemDetail(itemId);
      if (!detail) return;

      setProductName(detail.name);
      const spec = parseSpec(detail.spec);
      setSpecL(spec.l);
      setSpecW(spec.w);
      setSpecH(spec.h);
      setWeightN(parseWeight(detail.weight).n);
      setUnitN(parseUnit(detail.unit).n);
      setPackaging(detail.packaging);
      setRecipientName(detail.customer_name?.trim() ?? '');
      setRecipientPhone(detail.recipient_phone?.trim() ?? '');
      setDestination(normalizePackDestination(detail.destination ?? ''));
      setNote(detail.note);
      setInboundBarcode(detail.barcode);
      setQtyOnHand(detail.qty_on_hand);

      const inboundDate = await getItemFirstInboundDate(itemId);
      if (inboundDate) {
        setInboundDateLabel(formatInboundDateLabel(inboundDate));
        setInboundDateYmd(formatInboundDateYmd(inboundDate));
      }

      const ownerKey = await resolveItemOwnerStoreCode(itemId);
      setOwnerCode(ownerKey);
      setEditable(!store || canEditOwnedRecord(store, ownerKey));
    })();
  }, [itemId, store?.storeCode]);

  const saveNew = async () => {
    if (!form.payload.barcode || !form.payload.name) {
      Alert.alert('提示', '条码和商品名称必填');
      return;
    }
    setLoading(true);
    try {
      if (!store) throw new Error('未登录');
      await upsertItem(
        { ...form.payload, id: itemId, min_qty: 0 },
        { actingStore: store },
      );
      showTaskSuccess('保存成功', form.payload.name, () => navigation.goBack());
    } catch (e: unknown) {
      Alert.alert('失败', e instanceof Error ? e.message : '请重试');
    } finally {
      setLoading(false);
    }
  };

  const saveEdit = async () => {
    if (!itemId || !store) return;
    if (!recipientName.trim()) {
      Alert.alert('提示', '请填写姓名');
      return;
    }
    if (!destination.trim()) {
      Alert.alert('提示', '请选择最终目的地');
      return;
    }
    if (!productName.trim()) {
      Alert.alert('提示', '请填写商品名称');
      return;
    }
    if (!packaging) {
      Alert.alert('提示', '请选择商品包装');
      return;
    }

    setLoading(true);
    try {
      const unit = formatUnit({ n: unitN });
      await updateItemInboundProfile(
        itemId,
        {
          name: productName.trim(),
          spec: specStr,
          unit,
          weight: weightStr,
          note: note.trim(),
          packaging,
          recipientName: recipientName.trim(),
          recipientPhone: recipientPhone.trim(),
          destination: destination.trim(),
        },
        store,
      );
      showTaskSuccess('保存成功', productName.trim(), () => navigation.goBack());
    } catch (e: unknown) {
      Alert.alert('失败', e instanceof Error ? e.message : '请重试');
    } finally {
      setLoading(false);
    }
  };

  const openPrintLabel = () => {
    const name = isEdit ? productName : form.payload.name;
    const barcode = isEdit ? inboundBarcode : form.payload.barcode;
    if (!barcode || !name) {
      Alert.alert('提示', '请先填写条码和商品名称');
      return;
    }
    setOrderBarcodeData(
      inboundOrderBarcodeData({
        name,
        barcode,
        destination: destination || undefined,
        customerName: recipientName || undefined,
      }),
    );
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
                if (!store) throw new Error('未登录');
                await cancelInventoryItem(itemId, operatorName ?? '工作人员', store);
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
          <Text style={styles.subtitle}>
            {isEdit
              ? '字段与入库页一致，可修改商品与收发资料'
              : '填写条码与名称，规格参数只需改数字'}
          </Text>
        </View>

        {isEdit && !editable ? (
          <View style={styles.readonlyBanner}>
            <Text style={styles.readonlyBannerText}>{editDeniedMessage(ownerCode)}</Text>
          </View>
        ) : null}

        {isEdit ? (
          <InboundOrderFormBody
            mode="edit"
            editable={editable}
            values={{
              productName,
              specL,
              specW,
              specH,
              weightN,
              packaging,
              recipientName,
              recipientPhone,
              destination,
              note,
            }}
            specStr={specStr}
            weightStr={weightStr}
            onProductNameChange={setProductName}
            onSpecChange={({ l, w, h }) => {
              setSpecL(l);
              setSpecW(w);
              setSpecH(h);
            }}
            onWeightChange={setWeightN}
            onPackagingChange={setPackaging}
            onRecipientNameChange={setRecipientName}
            onRecipientPhoneChange={setRecipientPhone}
            onDestinationChange={setDestination}
            onNoteChange={setNote}
            barcodeText={inboundBarcode || '—'}
            inboundDateLabel={inboundDateLabel || undefined}
            inboundDateYmd={inboundDateYmd || undefined}
            qtyOnHand={qtyOnHand}
          />
        ) : (
          <ItemFormFields form={form} barcodeEditable={!isEdit} />
        )}

        <View style={styles.actions}>
          {(!isEdit || editable) ? (
            <Pressable
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={() => void (isEdit ? saveEdit() : saveNew())}
              disabled={loading}
            >
              <Text style={styles.btnText}>{loading ? '保存中…' : '保存商品'}</Text>
            </Pressable>
          ) : null}
          <Pressable style={styles.btnGhost} onPress={openPrintLabel}>
            <Text style={styles.btnGhostText}>🖨 打印标签</Text>
          </Pressable>
          {isEdit && editable ? (
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

      <OrderBarcodeModal
        visible={!!orderBarcodeData}
        data={orderBarcodeData}
        onClose={() => setOrderBarcodeData(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 16, paddingBottom: 48 },
  hero: { marginBottom: 18 },
  title: { color: '#f8fafc', fontSize: 24, fontWeight: '900' },
  subtitle: { color: '#94a3b8', marginTop: 8, fontSize: 14, lineHeight: 20 },
  readonlyBanner: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#475569',
  },
  readonlyBannerText: { color: '#94a3b8', fontSize: 13, lineHeight: 20 },
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
