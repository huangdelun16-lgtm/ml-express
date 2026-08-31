import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { fmt, resolveAppError, useTranslation } from '../i18n';
import {
  enrichArrivalNotifyTarget,
  markItemArrivalNotified,
  openArrivalNotifyChannel,
  type ArrivalNotifyChannel,
} from '../services/arrivalNotifyService';
import type { ArrivalNotifyTarget } from '../utils/arrivalNotify';
import { buildArrivalNotifyMessage } from '../utils/arrivalNotify';

type Props = {
  visible: boolean;
  targets: ArrivalNotifyTarget[];
  onClose: () => void;
  onNotified?: (barcode: string) => void;
};

export default function ArrivalNotifySheet({ visible, targets, onClose, onNotified }: Props) {
  const { t, language } = useTranslation();
  const { store } = useAuth();
  const [rows, setRows] = useState<ArrivalNotifyTarget[]>([]);
  const [busyKey, setBusyKey] = useState('');
  const [error, setError] = useState('');
  const [marked, setMarked] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!visible) {
      setRows([]);
      setBusyKey('');
      setError('');
      setMarked(new Set());
      return;
    }
    setRows(targets);
    setBusyKey('');
    setError('');
    setMarked(new Set());
  }, [visible, targets]);

  const hubLabel = store?.storeName?.trim() || store?.hubCode || rows[0]?.hubCode || '';
  const isBatch = rows.length > 1;

  const preview = useMemo(() => {
    const first = rows[0];
    if (!first) return '';
    return buildArrivalNotifyMessage({
      language,
      hubLabel: first.storeName || hubLabel,
      barcode: first.barcode,
      expressBarcode: first.expressBarcode,
      recipientName: first.recipientName,
    });
  }, [rows, language, hubLabel]);

  const runChannel = async (target: ArrivalNotifyTarget, channel: ArrivalNotifyChannel) => {
    if (!store) return;
    const key = `${target.barcode}:${channel}`;
    setBusyKey(key);
    setError('');
    try {
      const enriched = await enrichArrivalNotifyTarget(target);
      if (!enriched.recipientPhone.trim()) {
        setError(t.common.noPhone);
        return;
      }
      const body = buildArrivalNotifyMessage({
        language,
        hubLabel: enriched.storeName || hubLabel,
        barcode: enriched.barcode,
        expressBarcode: enriched.expressBarcode,
        recipientName: enriched.recipientName,
      });
      const opened = await openArrivalNotifyChannel(channel, enriched.recipientPhone, body);
      if (channel === 'call') return;
      if (!opened) {
        setError(t.arrivalNotify.openFailed);
        return;
      }
      await markItemArrivalNotified(enriched.barcode, store);
      setMarked((prev) => new Set(prev).add(enriched.barcode));
      onNotified?.(enriched.barcode);
    } catch (e) {
      setError(resolveAppError(t, e));
    } finally {
      setBusyKey('');
    }
  };

  if (!visible || rows.length === 0) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>
            {isBatch
              ? fmt(t.arrivalNotify.batchTitle, { count: rows.length })
              : t.arrivalNotify.title}
          </Text>
          {isBatch ? <Text style={styles.hint}>{t.arrivalNotify.batchHint}</Text> : null}

          {!isBatch ? (
            <View style={styles.previewBox}>
              <Text style={styles.previewLabel}>{t.arrivalNotify.preview}</Text>
              <Text style={styles.previewBody}>{preview}</Text>
              <Text style={styles.phoneLine}>
                {rows[0].recipientName ? `${rows[0].recipientName} · ` : ''}
                {rows[0].recipientPhone || t.common.noPhone}
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {rows.map((row) => {
                const done = marked.has(row.barcode);
                return (
                  <View key={row.barcode} style={styles.row}>
                    <View style={styles.rowBody}>
                      <Text style={styles.rowName} numberOfLines={1}>
                        {row.recipientName || t.items.noCustomer}
                      </Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {row.barcode}
                        {row.recipientPhone ? ` · ${row.recipientPhone}` : ''}
                      </Text>
                    </View>
                    {done ? (
                      <Text style={styles.doneText}>{t.arrivalNotify.alreadyNotified}</Text>
                    ) : (
                      <View style={styles.rowActions}>
                        <Pressable
                          style={[styles.miniBtn, styles.waBtn, Boolean(busyKey) && styles.busy]}
                          onPress={() => void runChannel(row, 'whatsapp')}
                          disabled={Boolean(busyKey)}
                        >
                          <Text style={styles.miniBtnText}>{t.arrivalNotify.whatsapp}</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.miniBtn, styles.smsBtn, Boolean(busyKey) && styles.busy]}
                          onPress={() => void runChannel(row, 'sms')}
                          disabled={Boolean(busyKey)}
                        >
                          <Text style={styles.miniBtnText}>{t.arrivalNotify.sms}</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}

          {!isBatch ? (
            <View style={styles.actions}>
              <Pressable
                style={[styles.btn, styles.waBtn, Boolean(busyKey) && styles.busy]}
                onPress={() => void runChannel(rows[0], 'whatsapp')}
                disabled={Boolean(busyKey)}
              >
                {busyKey.endsWith(':whatsapp') ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.btnText}>{t.arrivalNotify.whatsapp}</Text>
                )}
              </Pressable>
              <Pressable
                style={[styles.btn, styles.smsBtn, Boolean(busyKey) && styles.busy]}
                onPress={() => void runChannel(rows[0], 'sms')}
                disabled={Boolean(busyKey)}
              >
                {busyKey.endsWith(':sms') ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.btnText}>{t.arrivalNotify.sms}</Text>
                )}
              </Pressable>
              <Pressable
                style={[styles.btn, styles.callBtn, Boolean(busyKey) && styles.busy]}
                onPress={() => void runChannel(rows[0], 'call')}
                disabled={Boolean(busyKey)}
              >
                <Text style={styles.btnText}>{t.arrivalNotify.call}</Text>
              </Pressable>
            </View>
          ) : null}

          {marked.has(rows[0]?.barcode) && !isBatch ? (
            <Text style={styles.markedHint}>{t.arrivalNotify.marked}</Text>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>{t.common.close}</Text>
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
    paddingTop: 14,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: '88%',
  },
  title: { color: '#f8fafc', fontSize: 16, fontWeight: '900' },
  hint: { color: '#94a3b8', fontSize: 12, lineHeight: 16, marginTop: 4 },
  previewBox: {
    marginTop: 10,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  previewLabel: { color: '#64748b', fontSize: 10, fontWeight: '800', marginBottom: 4 },
  previewBody: { color: '#e2e8f0', fontSize: 12, lineHeight: 17, fontWeight: '600' },
  phoneLine: { color: '#7dd3fc', fontSize: 11, fontWeight: '700', marginTop: 8 },
  list: { marginTop: 12, maxHeight: 360 },
  listContent: { gap: 8, paddingBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowName: { color: '#f8fafc', fontSize: 14, fontWeight: '800' },
  rowMeta: { color: '#94a3b8', fontSize: 11, fontWeight: '700', marginTop: 2, fontFamily: 'monospace' },
  rowActions: { gap: 6 },
  miniBtn: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 7,
    minWidth: 72,
    alignItems: 'center',
  },
  miniBtnText: { color: '#fff', fontWeight: '900', fontSize: 11 },
  doneText: { color: '#86efac', fontSize: 11, fontWeight: '900' },
  actions: { flexDirection: 'row', gap: 6, marginTop: 10 },
  btn: {
    flex: 1,
    borderRadius: 8,
    minHeight: 34,
    paddingVertical: 7,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  waBtn: { backgroundColor: '#16a34a' },
  smsBtn: { backgroundColor: '#0284c7' },
  callBtn: { backgroundColor: '#0f766e' },
  busy: { opacity: 0.6 },
  markedHint: { color: '#86efac', fontSize: 12, fontWeight: '800', marginTop: 8, textAlign: 'center' },
  error: { color: '#fca5a5', fontSize: 12, fontWeight: '700', marginTop: 8 },
  closeBtn: { paddingVertical: 8, alignItems: 'center', marginTop: 4 },
  closeText: { color: '#64748b', fontWeight: '700', fontSize: 13 },
});
