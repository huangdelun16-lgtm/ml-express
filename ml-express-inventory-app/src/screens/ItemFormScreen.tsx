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
import { useItemFormState } from '../hooks/useItemFormState';
import { useAuth } from '../contexts/AuthContext';
import { normalizePackDestination } from '../constants/destinationOptions';
import {
  cancelInventoryItem,
  canEditItemCustomerProfileForStore,
  getItemDetail,
  getItemFirstInboundDate,
  resolveItemOwnerStoreCode,
  updateItemInboundProfile,
  upsertItem,
} from '../services/inventoryService';
import { feedbackService } from '../services/FeedbackService';
import {
  formatSpec,
  formatUnit,
  formatWeight,
  parseSpec,
  parseUnit,
  parseWeight,
} from '../utils/itemFieldFormat';
import {
  formatInboundDateLabel,
  formatInboundDateYmd,
} from '../utils/stockInDate';
import { getItemCustomerProfileEditDeniedMessage, resolveAppError, useTranslation } from '../i18n';
import { canEditOwnedRecord } from '../utils/storeOwnership';
import { showTaskSuccess } from '../utils/taskSuccessAlert';

type Route = { params?: { itemId?: string } };

export default function ItemFormScreen({
  route,
  navigation,
}: {
  route: Route;
  navigation: { goBack: () => void };
}) {
  const { operatorName, store, hubCode } = useAuth();
  const { t } = useTranslation();
  const itemId = route.params?.itemId;
  const isEdit = !!itemId;
  const form = useItemFormState();
  const [loading, setLoading] = useState(false);
  const [editable, setEditable] = useState(true);
  const [ownerCode, setOwnerCode] = useState('');
  const [editItemRef, setEditItemRef] = useState<{
    barcode: string;
    owner_store_code?: string;
    destination?: string;
    final_destination?: string;
    hub_arrived_at?: string;
    hub_arrived?: boolean;
    customer_signed_at?: string;
  } | null>(null);

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
      setEditItemRef({
        barcode: detail.barcode,
        owner_store_code: ownerKey,
        destination: detail.destination,
        final_destination: detail.final_destination,
        hub_arrived_at: detail.hub_arrived_at,
        customer_signed_at: detail.customer_signed_at,
      });
      if (store) {
        const ok = await canEditItemCustomerProfileForStore(store, itemId, hubCode ?? undefined);
        setEditable(ok);
      } else {
        setEditable(true);
      }
    })();
  }, [itemId, store?.storeCode, hubCode]);

  const saveNew = async () => {
    if (!form.payload.barcode || !form.payload.name) {
      feedbackService.notify(t.common.tip, `${t.itemForm.alertBarcode} / ${t.itemForm.alertName}`);
      return;
    }
    setLoading(true);
    try {
      if (!store) throw new Error(t.common.notLoggedIn);
      await upsertItem(
        { ...form.payload, id: itemId, min_qty: 0 },
        { actingStore: store },
      );
      showTaskSuccess(t.itemForm.saveSuccess, form.payload.name, () => navigation.goBack());
    } catch (e: unknown) {
      feedbackService.notify(t.common.fail, resolveAppError(t, e));
    } finally {
      setLoading(false);
    }
  };

  const saveEdit = async () => {
    if (!itemId || !store) return;
    if (!recipientName.trim()) {
      feedbackService.notify(t.common.tip, t.itemForm.alertCustomer);
      return;
    }
    if (!destination.trim()) {
      feedbackService.notify(t.common.tip, t.itemForm.alertDestination);
      return;
    }
    if (!productName.trim()) {
      feedbackService.notify(t.common.tip, t.itemForm.alertName);
      return;
    }
    if (!packaging) {
      feedbackService.notify(t.common.tip, t.itemForm.alertPackaging);
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
        hubCode ?? undefined,
      );
      showTaskSuccess(t.itemForm.saveSuccess, productName.trim(), () => navigation.goBack());
    } catch (e: unknown) {
      feedbackService.notify(t.common.fail, resolveAppError(t, e));
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = () => {
    if (!itemId) return;
    Alert.alert(
      t.itemForm.cancelOrderTitle,
      t.itemForm.cancelOrderBody,
      [
        { text: t.itemForm.cancelOrderBack, style: 'cancel' },
        {
          text: t.itemForm.cancelOrderConfirm,
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setLoading(true);
              try {
                if (!store) throw new Error(t.common.notLoggedIn);
                await cancelInventoryItem(itemId, operatorName ?? t.common.operator, store);
                showTaskSuccess(t.itemForm.cancelOrderDone, undefined, () => navigation.goBack());
              } catch (e: unknown) {
                feedbackService.notify(t.common.fail, resolveAppError(t, e));
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
          <Text style={styles.title}>{isEdit ? t.itemForm.editTitle : t.itemForm.newTitle}</Text>
          <Text style={styles.subtitle}>
            {isEdit ? t.itemForm.specSection : t.itemForm.basicInfo}
          </Text>
        </View>

        {isEdit && !editable ? (
          <View style={styles.readonlyBanner}>
            <Text style={styles.readonlyBannerText}>
              {getItemCustomerProfileEditDeniedMessage(
                t,
                editItemRef ?? { barcode: inboundBarcode, owner_store_code: ownerCode },
                store,
                hubCode ?? undefined,
              )}
            </Text>
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
              <Text style={styles.btnText}>{loading ? t.itemForm.saving : t.itemForm.save}</Text>
            </Pressable>
          ) : null}
          {isEdit && editable ? (
            <Pressable
              style={[styles.btnDanger, loading && styles.btnDisabled]}
              onPress={cancelOrder}
              disabled={loading}
            >
              <Text style={styles.btnDangerText}>{t.itemForm.cancelOrder}</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
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
