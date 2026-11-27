import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from '../i18n';
import { feedbackService } from '../services/FeedbackService';
import {
  fillTripTransportFee,
  listDestinationUnpaidTrips,
  listOriginFeeTripsForStore,
  markHubTransportFeePaid,
  type UnpaidTripFee,
} from '../services/hubTransportFeeService';
import type { InventoryStoreSession } from '../services/authService';
import type { OriginFeeTrip } from '../utils/tripTransportFee';
import { resolveAppError } from '../i18n';

type Props = {
  visible: boolean;
  mode: 'fill' | 'pay';
  store: InventoryStoreSession | null;
  hubCode: string;
  operator: string;
  onClose: () => void;
};

export default function TripFeeWorkModal({ visible, mode, store, hubCode, operator, onClose }: Props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fillRows, setFillRows] = useState<OriginFeeTrip[]>([]);
  const [payRows, setPayRows] = useState<UnpaidTripFee[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [feeDraft, setFeeDraft] = useState('');
  const [activeFill, setActiveFill] = useState<OriginFeeTrip | null>(null);

  useEffect(() => {
    if (!visible || !store) return;
    let cancelled = false;
    setLoading(true);
    setPicked([]);
    setActiveFill(null);
    void (async () => {
      try {
        if (mode === 'fill') {
          const rows = await listOriginFeeTripsForStore(store.storeCode);
          if (!cancelled) setFillRows(rows);
        } else {
          const rows = await listDestinationUnpaidTrips(hubCode);
          if (!cancelled) setPayRows(rows);
        }
      } catch (error: unknown) {
        if (!cancelled) feedbackService.notify(t.common.fail, resolveAppError(t, error));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, mode, store, hubCode, t]);

  const statusLabel = (status: OriginFeeTrip['status']) => {
    if (status === 'signed') return '已签收';
    if (status === 'arrived') return '已到站';
    return '在途';
  };

  const paySelected = async () => {
    if (!store || picked.length === 0 || saving) return;
    setSaving(true);
    try {
      for (const barcode of picked) {
        const row = payRows.find((item) => item.primaryPackBarcode === barcode);
        if (!row) continue;
        await markHubTransportFeePaid({
          packBarcode: row.primaryPackBarcode,
          fee: String(row.fee),
          legDestination: row.destination || hubCode,
          originStoreCode: store.storeCode,
          operator,
          store,
        });
      }
      setPayRows((rows) => rows.filter((row) => !picked.includes(row.primaryPackBarcode)));
      setPicked([]);
    } catch (error: unknown) {
      feedbackService.notify(t.common.fail, resolveAppError(t, error));
    } finally {
      setSaving(false);
    }
  };

  const saveFill = async () => {
    if (!activeFill || saving) return;
    setSaving(true);
    try {
      await fillTripTransportFee({ packBarcode: activeFill.primaryPackBarcode, fee: feeDraft });
      setFillRows((rows) => rows.filter((row) => row.key !== activeFill.key));
      setActiveFill(null);
      setFeeDraft('');
    } catch (error: unknown) {
      feedbackService.notify(t.common.fail, resolveAppError(t, error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>
            {mode === 'fill' ? t.home.todoFillTripFee : `支付 ${picked.length || payRows.length} 个车次的车费`}
          </Text>
          {loading ? <ActivityIndicator color="#67e8f9" /> : null}
          <ScrollView style={styles.list}>
            {mode === 'fill'
              ? fillRows.map((row) => (
                  <Pressable key={row.key} style={styles.row} onPress={() => { setActiveFill(row); setFeeDraft(''); }}>
                    <Text style={styles.trip}>{row.tripNumber || row.primaryPackBarcode}</Text>
                    <Text style={styles.meta}>{row.destination} · {row.packCount} 包 · {statusLabel(row.status)}</Text>
                    {row.urgent ? <Text style={styles.urgent}>请马上补车费</Text> : <Text style={styles.meta}>还在途，可稍后补</Text>}
                  </Pressable>
                ))
              : payRows.map((row) => {
                  const on = picked.includes(row.primaryPackBarcode);
                  return (
                    <Pressable
                      key={row.primaryPackBarcode}
                      style={styles.row}
                      onPress={() =>
                        setPicked((current) =>
                          on ? current.filter((code) => code !== row.primaryPackBarcode) : [...current, row.primaryPackBarcode],
                        )
                      }
                    >
                      <Text style={styles.trip}>{on ? '☑' : '☐'} {row.tripNumber || row.primaryPackBarcode}</Text>
                      <Text style={styles.meta}>{row.packCount} 包 · {row.fee} MMK</Text>
                    </Pressable>
                  );
                })}
          </ScrollView>
          {activeFill ? (
            <View>
              <Text style={styles.meta}>{t.pkg.fillFeeHint}</Text>
              <TextInput
                style={styles.input}
                value={feeDraft}
                onChangeText={setFeeDraft}
                keyboardType="decimal-pad"
                placeholder="MMK"
                placeholderTextColor="#94a3b8"
              />
              <Pressable style={styles.save} onPress={() => void saveFill()} disabled={saving}>
                <Text style={styles.saveText}>{saving ? t.common.processing : t.pkg.fillFee}</Text>
              </Pressable>
            </View>
          ) : null}
          {mode === 'pay' ? (
            <Pressable style={styles.save} onPress={() => void paySelected()} disabled={saving || picked.length === 0}>
              <Text style={styles.saveText}>
                {saving ? t.common.processing : `支付 ${picked.length} 个车次`}
              </Text>
            </Pressable>
          ) : null}
          <Pressable onPress={onClose}>
            <Text style={styles.close}>{t.common.close}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.78)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '86%', backgroundColor: '#0f172a', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, gap: 10 },
  title: { color: '#f8fafc', fontSize: 18, fontWeight: '800' },
  list: { maxHeight: 360 },
  row: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  trip: { color: '#f8fafc', fontWeight: '800' },
  meta: { color: '#94a3b8', marginTop: 2 },
  urgent: { color: '#fb7185', fontWeight: '800', marginTop: 4 },
  input: { backgroundColor: '#1e293b', color: '#f8fafc', borderRadius: 12, padding: 12 },
  save: { backgroundColor: '#0891b2', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '800' },
  close: { color: '#cbd5e1', textAlign: 'center', paddingVertical: 8 },
});
