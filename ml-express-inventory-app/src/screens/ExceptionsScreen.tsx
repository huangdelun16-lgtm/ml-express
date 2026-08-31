import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import {
  formatTimeAgo,
  getExceptionStatusLabel,
  getExceptionTypeLabel,
  resolveAppError,
  useTranslation,
  fmt,
} from '../i18n';
import {
  listInventoryExceptions,
  resolveInventoryException,
} from '../services/inventoryExceptionService';
import type { InventoryExceptionRecord } from '../types/inventoryException';
import { canResolveInventoryException } from '../utils/inventoryException';
import { showTaskSuccess } from '../utils/taskSuccessAlert';
import { colors, radius, space } from '../theme';

type TabKey = 'open' | 'resolved';

export default function ExceptionsScreen() {
  const { t } = useTranslation();
  const { operatorName } = useAuth();
  const [tab, setTab] = useState<TabKey>('open');
  const [rows, setRows] = useState<InventoryExceptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<InventoryExceptionRecord | null>(null);
  const [resolveNote, setResolveNote] = useState('');
  const [resolving, setResolving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  const load = useCallback(async (force = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);
    try {
      const list = await listInventoryExceptions({
        status: tab,
        limit: 80,
      });
      setRows(list);
      setError('');
    } catch (e) {
      setError(resolveAppError(t, e) || t.exception.loadFailed);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab, t]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const tabs = useMemo(
    (): { key: TabKey; label: string }[] => [
      { key: 'open', label: t.exception.openTab },
      { key: 'resolved', label: t.exception.resolvedTab },
    ],
    [t],
  );

  const handleResolve = async () => {
    if (!selected || !canResolveInventoryException(selected.status)) return;
    setResolving(true);
    try {
      const updated = await resolveInventoryException({
        exceptionId: selected.id,
        operator: operatorName ?? t.common.operator,
        resolveNote,
      });
      showTaskSuccess(t.exception.resolveOk, selected.item_barcode);
      setSelected(updated);
      setResolveNote('');
      setRows((prev) => prev.filter((row) => row.id !== updated.id));
    } catch (e) {
      setError(resolveAppError(t, e));
    } finally {
      setResolving(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.tabRow}>
        {tabs.map((item) => {
          const active = tab === item.key;
          return (
            <Pressable
              key={item.key}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setTab(item.key)}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? (
        <ActivityIndicator color="#f59e0b" style={styles.loader} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#f59e0b" />
          }
          contentContainerStyle={rows.length === 0 ? styles.emptyWrap : styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {tab === 'open' ? t.exception.emptyOpen : t.exception.emptyResolved}
            </Text>
          }
          renderItem={({ item }) => {
            const when = formatTimeAgo(item.created_at, t);
            return (
              <Pressable style={styles.card} onPress={() => { setSelected(item); setResolveNote(''); }}>
                <View style={styles.cardTop}>
                  <Text style={styles.type}>{getExceptionTypeLabel(t, item.exception_type)}</Text>
                  <Text style={[styles.status, item.status === 'open' && styles.statusOpen]}>
                    {getExceptionStatusLabel(t, item.status)}
                  </Text>
                </View>
                <Text style={styles.barcode} numberOfLines={1}>
                  {item.express_barcode || item.item_barcode}
                </Text>
                <Text style={styles.note} numberOfLines={2}>{item.note}</Text>
                <Text style={styles.meta}>
                  {fmt(t.exception.reportedBy, {
                    store: item.reported_store_code,
                    operator: item.reported_operator,
                  })}
                  {' · '}
                  {when.primary}
                  {item.photos.length ? ` · ${item.photos.length}` : ''}
                </Text>
              </Pressable>
            );
          }}
        />
      )}

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.detailOverlay} onPress={() => setSelected(null)}>
          <Pressable style={styles.detailSheet} onPress={(e) => e.stopPropagation()}>
            {selected ? (
              <>
                <Text style={styles.detailTitle}>{getExceptionTypeLabel(t, selected.exception_type)}</Text>
                <Text style={styles.barcode}>{selected.express_barcode || selected.item_barcode}</Text>
                <Text style={styles.note}>{selected.note}</Text>
                {selected.qty_expected != null && selected.qty_actual != null ? (
                  <Text style={styles.meta}>
                    {fmt(t.exception.qtyLine, {
                      expected: selected.qty_expected,
                      actual: selected.qty_actual,
                    })}
                  </Text>
                ) : null}
                <Text style={styles.meta}>
                  {fmt(t.exception.reportedBy, {
                    store: selected.reported_store_code,
                    operator: selected.reported_operator,
                  })}
                </Text>
                <View style={styles.photoGrid}>
                  {selected.photos.map((photo) => (
                    <Pressable key={photo.id} onPress={() => setPreviewUrl(photo.public_url)}>
                      <Image source={{ uri: photo.public_url }} style={styles.thumb} />
                    </Pressable>
                  ))}
                </View>
                {canResolveInventoryException(selected.status) ? (
                  <>
                    <TextInput
                      style={styles.resolveInput}
                      value={resolveNote}
                      onChangeText={setResolveNote}
                      placeholder={t.exception.resolveNote}
                      placeholderTextColor="#64748b"
                    />
                    <Pressable
                      style={[styles.resolveBtn, resolving && styles.submitDisabled]}
                      onPress={() => void handleResolve()}
                      disabled={resolving}
                    >
                      <Text style={styles.resolveBtnText}>
                        {resolving ? t.exception.resolving : t.exception.resolve}
                      </Text>
                    </Pressable>
                  </>
                ) : null}
                <Pressable style={styles.cancel} onPress={() => setSelected(null)}>
                  <Text style={styles.cancelText}>{t.common.close}</Text>
                </Pressable>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!previewUrl} transparent animationType="fade" onRequestClose={() => setPreviewUrl('')}>
        <Pressable style={styles.previewOverlay} onPress={() => setPreviewUrl('')}>
          {previewUrl ? <Image source={{ uri: previewUrl }} style={styles.preview} resizeMode="contain" /> : null}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  tabRow: { flexDirection: 'row', gap: 8, padding: space.lg },
  tab: {
    flex: 1,
    borderRadius: radius.pill,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: 'rgba(245,158,11,0.18)', borderColor: '#f59e0b' },
  tabText: { color: colors.muted, fontWeight: '800' },
  tabTextActive: { color: '#fcd34d' },
  error: { color: '#fca5a5', paddingHorizontal: space.lg, marginBottom: 8 },
  loader: { marginTop: 40 },
  list: { paddingHorizontal: space.lg, paddingBottom: 32, gap: 10 },
  emptyWrap: { flexGrow: 1, justifyContent: 'center', padding: 32 },
  empty: { color: colors.muted, textAlign: 'center', fontWeight: '700' },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  type: { color: colors.text, fontWeight: '900', fontSize: 15 },
  status: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  statusOpen: { color: '#fbbf24' },
  barcode: { color: '#7dd3fc', fontFamily: 'monospace', fontWeight: '800', marginTop: 4 },
  note: { color: colors.textSecondary, marginTop: 6, lineHeight: 18 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 8 },
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.78)',
    justifyContent: 'flex-end',
  },
  detailSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    paddingBottom: 28,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  thumb: { width: 88, height: 88, borderRadius: 10, backgroundColor: colors.bgDeep },
  resolveInput: {
    marginTop: 12,
    backgroundColor: colors.bgDeep,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontWeight: '700',
  },
  resolveBtn: {
    marginTop: 12,
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  resolveBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  submitDisabled: { opacity: 0.5 },
  cancel: { paddingVertical: 12, alignItems: 'center' },
  cancelText: { color: colors.muted2, fontWeight: '700' },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  preview: { width: '100%', height: '80%' },
});
