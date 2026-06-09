import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import PkgOrdersModal from '../components/PkgOrdersModal';
import { listPackedShipments } from '../services/inventoryService';
import type { PackedShipmentDetail } from '../types/inventory';

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isPkgBarcode(code: string): boolean {
  return code.trim().toUpperCase().startsWith('PKG');
}

export default function PkgScreen() {
  const [search, setSearch] = useState('');
  const [packs, setPacks] = useState<PackedShipmentDetail[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [ordersPack, setOrdersPack] = useState<PackedShipmentDetail | null>(null);

  const load = useCallback(async () => {
    setPacks(await listPackedShipments(search));
  }, [search]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    void load();
  }, [search]);

  return (
    <View style={styles.root}>
      <TextInput
        style={styles.search}
        placeholder="搜索包裹名 / 包装号 / 打包人"
        placeholderTextColor="#64748b"
        value={search}
        onChangeText={setSearch}
        onSubmitEditing={() => void load()}
        returnKeyType="search"
      />

      <FlatList
        data={packs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={packs.length === 0 ? styles.emptyList : styles.list}
        onRefresh={async () => {
          setRefreshing(true);
          await load();
          setRefreshing(false);
        }}
        refreshing={refreshing}
        ListEmptyComponent={
          <Text style={styles.empty}>
            暂无包裹{'\n'}在商品库「打包快递」确认打包后会出现在这里
          </Text>
        }
        renderItem={({ item }) => {
          const pkgClickable = isPkgBarcode(item.bundle_barcode);
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.packName} numberOfLines={2}>
                  {item.bundle_name}
                </Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{item.items.length}</Text>
                  <Text style={styles.countUnit}>件</Text>
                </View>
              </View>

              {pkgClickable ? (
                <Pressable
                  style={({ pressed }) => [styles.barcodePill, pressed && styles.barcodePillPressed]}
                  onPress={() => setOrdersPack(item)}
                >
                  <Text style={styles.barcodeValue} numberOfLines={1}>
                    {item.bundle_barcode}
                  </Text>
                  <Text style={styles.barcodeHint}>点击查看内含订单</Text>
                </Pressable>
              ) : (
                <View style={styles.barcodePill}>
                  <Text style={styles.barcodeValue} numberOfLines={1}>
                    {item.bundle_barcode}
                  </Text>
                </View>
              )}

              {(item.spec || item.unit || item.weight) ? (
                <Text style={styles.meta}>
                  {[item.spec, item.unit, item.weight].filter(Boolean).join(' · ')}
                </Text>
              ) : null}

              <View style={styles.noteBox}>
                <Text style={styles.noteLabel}>备注</Text>
                <View style={styles.noteRow}>
                  <Text style={styles.noteText}>打包人：{item.operator || '—'}</Text>
                  <Text style={styles.noteSep}>·</Text>
                  <Text style={styles.noteText}>包含 {item.items.length} 件</Text>
                </View>
              </View>

              <Text style={styles.footer}>{formatTime(item.created_at)}</Text>
            </View>
          );
        }}
      />

      <PkgOrdersModal
        visible={!!ordersPack}
        pack={ordersPack}
        onClose={() => setOrdersPack(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  search: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
  },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  emptyList: { flexGrow: 1, paddingHorizontal: 16, paddingBottom: 24 },
  empty: {
    color: '#64748b',
    textAlign: 'center',
    marginTop: 48,
    lineHeight: 22,
    fontSize: 14,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#a855f7',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  packName: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
  },
  countBadge: { alignItems: 'center', minWidth: 36 },
  countText: { color: '#c4b5fd', fontSize: 20, fontWeight: '900' },
  countUnit: { color: '#94a3b8', fontSize: 10, fontWeight: '700' },
  barcodePill: {
    marginTop: 10,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(168,85,247,0.12)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.35)',
  },
  barcodePillPressed: {
    backgroundColor: 'rgba(168,85,247,0.22)',
    borderColor: 'rgba(168,85,247,0.55)',
  },
  barcodeValue: {
    color: '#d8b4fe',
    fontSize: 14,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  barcodeHint: {
    color: '#a78bfa',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  meta: { color: '#94a3b8', fontSize: 12, marginTop: 8, fontFamily: 'monospace' },
  noteBox: {
    marginTop: 10,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  noteLabel: { color: '#64748b', fontSize: 11, fontWeight: '800', marginBottom: 6 },
  noteRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  noteText: { color: '#cbd5e1', fontSize: 13, fontWeight: '600' },
  noteSep: { color: '#475569', fontSize: 13 },
  footer: { color: '#64748b', fontSize: 11, marginTop: 10, fontWeight: '600' },
});
