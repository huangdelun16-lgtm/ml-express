import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { listMovements } from '../services/inventoryService';
import type { StockMovement } from '../types/inventory';

const TYPE_LABEL: Record<StockMovement['type'], { text: string; color: string }> = {
  in: { text: '入库', color: '#059669' },
  out: { text: '出库', color: '#dc2626' },
  adjust: { text: '调整', color: '#7c3aed' },
};

export default function MovementsScreen() {
  const [rows, setRows] = useState<StockMovement[]>([]);

  useFocusEffect(
    useCallback(() => {
      void listMovements(200).then(setRows);
    }, []),
  );

  return (
    <View style={styles.root}>
      <FlatList
        data={rows}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>暂无流水记录</Text>}
        renderItem={({ item }) => {
          const tag = TYPE_LABEL[item.type];
          const time = new Date(item.created_at).toLocaleString('zh-CN');
          return (
            <View style={styles.row}>
              <View style={styles.rowTop}>
                <Text style={[styles.badge, { backgroundColor: tag.color }]}>{tag.text}</Text>
                <Text style={styles.qty}>
                  {item.type === 'out' ? '-' : '+'}{item.qty}
                </Text>
              </View>
              <Text style={styles.name}>{item.item_name}</Text>
              <Text style={styles.meta}>
                {item.barcode} · {item.qty_before} → {item.qty_after}
              </Text>
              <Text style={styles.meta}>{item.operator} · {time}</Text>
              {item.type === 'in' && (item.recipient_name || item.destination || item.packaging) ? (
                <Text style={styles.contact}>
                  {item.recipient_name ? `👤 ${item.recipient_name}` : ''}
                  {item.recipient_phone ? ` · ${item.recipient_phone}` : ''}
                  {item.packaging ? `\n📦 ${item.packaging}` : ''}
                  {item.destination ? `\n📍 ${item.destination}` : ''}
                </Text>
              ) : null}
              {item.note ? <Text style={styles.note}>{item.note}</Text> : null}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  list: { padding: 16, paddingBottom: 32 },
  empty: { color: '#94a3b8', textAlign: 'center', marginTop: 40 },
  row: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  badge: { color: '#fff', fontSize: 12, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
  qty: { color: '#fbbf24', fontSize: 18, fontWeight: '900' },
  name: { color: '#f8fafc', fontSize: 16, fontWeight: '800' },
  meta: { color: '#94a3b8', fontSize: 12, marginTop: 4, fontFamily: 'monospace' },
  contact: { color: '#7dd3fc', fontSize: 13, marginTop: 6, lineHeight: 18 },
  note: { color: '#cbd5e1', fontSize: 13, marginTop: 6, fontStyle: 'italic' },
});
