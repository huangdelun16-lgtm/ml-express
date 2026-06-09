import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ItemActionModal from '../components/ItemActionModal';
import ItemViewModal from '../components/ItemViewModal';
import PackExpressModal from '../components/PackExpressModal';
import PrintLabelModal from '../components/PrintLabelModal';
import { useAuth } from '../contexts/AuthContext';
import type { LabelPrintPayload } from '../services/printerService';
import {
  createPackedShipment,
  listItems,
  listPackableItems,
} from '../services/inventoryService';
import type { InventoryItem } from '../types/inventory';
import { stockUnitLabel } from '../utils/itemFieldFormat';

type Nav = {
  navigate: (name: string, params?: { itemId?: string }) => void;
};

export default function ItemsScreen({ navigation }: { navigation: Nav }) {
  const { operatorName } = useAuth();
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [packMode, setPackMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [packModalVisible, setPackModalVisible] = useState(false);
  const [actionItem, setActionItem] = useState<InventoryItem | null>(null);
  const [viewItemId, setViewItemId] = useState<string | null>(null);
  const [packPrintVisible, setPackPrintVisible] = useState(false);
  const [packPrintPayload, setPackPrintPayload] = useState<LabelPrintPayload | null>(null);
  const [packSuccessInfo, setPackSuccessInfo] = useState<{
    name: string;
    barcode: string;
    count: number;
  } | null>(null);

  const load = useCallback(async () => {
    setItems(packMode ? await listPackableItems(search) : await listItems(search));
  }, [search, packMode]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    void load();
    if (!packMode) setSelectedIds(new Set());
  }, [packMode]);

  const selectedItems = useMemo(
    () => items.filter((i) => selectedIds.has(i.id)),
    [items, selectedIds],
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitPackMode = () => {
    setPackMode(false);
    setSelectedIds(new Set());
    setPackModalVisible(false);
  };

  const openPackModal = () => {
    if (selectedIds.size === 0) {
      Alert.alert('提示', '请先勾选要打包的入库商品');
      return;
    }
    setPackModalVisible(true);
  };

  const handlePackSubmit = async (bundle: {
    barcode: string;
    name: string;
    spec: string;
    unit: string;
    weight: string;
    note: string;
  }) => {
    const packedCount = selectedIds.size;
    const { bundleItem } = await createPackedShipment({
      operator: operatorName ?? '工作人员',
      itemIds: [...selectedIds],
      bundle,
    });
    setPackSuccessInfo({
      name: bundleItem.name,
      barcode: bundleItem.barcode,
      count: packedCount,
    });
    setPackPrintPayload({
      name: bundleItem.name,
      barcode: bundleItem.barcode,
      spec: bundle.spec,
      unit: bundle.unit,
      weight: bundle.weight,
    });
    setPackPrintVisible(true);
  };

  const handlePackPrintDone = () => {
    setPackPrintVisible(false);
    setPackPrintPayload(null);
    const info = packSuccessInfo;
    setPackSuccessInfo(null);
    if (!info) return;
    Alert.alert(
      '打包成功',
      `快递包：${info.name}\n包装号：${info.barcode}\n已合并 ${info.count} 个商品`,
      [
        {
          text: '好的',
          onPress: () => {
            exitPackMode();
            void load();
          },
        },
      ],
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.toolbar}>
        <TextInput
          style={styles.search}
          placeholder={packMode ? '搜索客户名 / 目的地 / 商品' : '搜索客户名 / 目的地 / 商品名'}
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => load()}
          returnKeyType="search"
        />
        {!packMode ? (
          <Pressable style={styles.addBtn} onPress={() => navigation.navigate('ItemForm')}>
            <Text style={styles.addText}>+ 新建</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.actionRow}>
        {!packMode ? (
          <>
            <Pressable style={styles.packBtn} onPress={() => setPackMode(true)}>
              <Text style={styles.packBtnText}>📦 打包快递</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable style={styles.ghostBtn} onPress={exitPackMode}>
              <Text style={styles.ghostBtnText}>取消</Text>
            </Pressable>
            <Text style={styles.packHint}>勾选曾入库的商品，合并为一个快递包</Text>
            <Pressable
              style={[styles.packBtn, selectedIds.size === 0 && styles.packBtnDisabled]}
              onPress={openPackModal}
            >
              <Text style={styles.packBtnText}>
                下一步 ({selectedIds.size})
              </Text>
            </Pressable>
          </>
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {packMode
              ? '暂无可打包商品（需曾入库且库存 > 0）'
              : '暂无商品，可扫码入库自动建档或点「新建」'}
          </Text>
        }
        renderItem={({ item }) => {
          const selected = selectedIds.has(item.id);
          const meta = [item.spec, item.unit, item.weight].filter(Boolean).join(' · ');
          return (
            <Pressable
              style={[styles.row, packMode && selected && styles.rowSelected]}
              onPress={() => {
                if (packMode) toggleSelect(item.id);
                else setActionItem(item);
              }}
            >
              {packMode ? (
                <View style={[styles.check, selected && styles.checkOn]}>
                  <Text style={styles.checkMark}>{selected ? '✓' : ''}</Text>
                </View>
              ) : null}
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <View style={styles.cardMain}>
                    <Text style={styles.topLine} numberOfLines={1}>
                      <Text style={styles.customer}>{item.customer_name || '未登记客户'}</Text>
                      {item.destination ? (
                        <Text style={styles.destination}> · {item.destination}</Text>
                      ) : null}
                    </Text>
                    <Text style={styles.productName} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>
                  <View style={styles.qtyBox}>
                    <Text style={styles.qty}>{item.qty_on_hand}</Text>
                    <Text style={styles.unit}>{stockUnitLabel()}</Text>
                  </View>
                </View>

                <View style={styles.tagRow}>
                  {item.input_barcode ? (
                    <View style={styles.tagBlue}>
                      <Text style={styles.tagBlueLabel}>快递单</Text>
                      <Text style={styles.tagBlueValue} numberOfLines={1}>
                        {item.input_barcode}
                      </Text>
                    </View>
                  ) : null}
                  <View style={[styles.tagYellow, !item.input_barcode && styles.tagYellowFull]}>
                    <Text style={styles.tagYellowLabel}>入库</Text>
                    <Text style={styles.tagYellowValue} numberOfLines={1}>
                      {item.barcode}
                    </Text>
                  </View>
                </View>

                {meta ? (
                  <Text style={styles.meta} numberOfLines={1}>
                    {meta}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        }}
      />

      <ItemActionModal
        visible={!!actionItem}
        item={actionItem}
        onClose={() => setActionItem(null)}
        onView={() => {
          if (!actionItem) return;
          setViewItemId(actionItem.id);
          setActionItem(null);
        }}
        onEdit={() => {
          if (!actionItem) return;
          const id = actionItem.id;
          setActionItem(null);
          navigation.navigate('ItemForm', { itemId: id });
        }}
      />

      <ItemViewModal
        visible={!!viewItemId}
        itemId={viewItemId}
        onClose={() => setViewItemId(null)}
      />

      <PackExpressModal
        visible={packModalVisible}
        selectedItems={selectedItems}
        operatorName={operatorName ?? '工作人员'}
        onClose={() => setPackModalVisible(false)}
        onSubmit={handlePackSubmit}
      />

      <PrintLabelModal
        visible={packPrintVisible}
        payload={packPrintPayload}
        requirePrintBeforeDone
        onClose={() => {
          setPackPrintVisible(false);
          setPackPrintPayload(null);
          setPackSuccessInfo(null);
        }}
        onDone={handlePackPrintDone}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  toolbar: { flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 8 },
  search: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  addBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  addText: { color: '#fff', fontWeight: '800' },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  packBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  packBtnDisabled: { opacity: 0.5 },
  packBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  ghostBtn: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#475569',
  },
  ghostBtnText: { color: '#94a3b8', fontWeight: '700' },
  packHint: { flex: 1, color: '#64748b', fontSize: 12, minWidth: 120 },
  list: { paddingHorizontal: 12, paddingTop: 6, paddingBottom: 24 },
  empty: { color: '#94a3b8', textAlign: 'center', marginTop: 40, lineHeight: 22 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    marginBottom: 7,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  rowSelected: { borderColor: '#7c3aed', backgroundColor: '#1a1630' },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#475569',
    marginRight: 8,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  checkMark: { color: '#fff', fontWeight: '900', fontSize: 12 },
  cardBody: { flex: 1, minWidth: 0 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardMain: { flex: 1, minWidth: 0 },
  topLine: { fontSize: 12, lineHeight: 16 },
  customer: { color: '#7dd3fc', fontWeight: '800' },
  destination: { color: '#a5b4fc', fontWeight: '700' },
  productName: { color: '#f8fafc', fontSize: 15, fontWeight: '800', marginTop: 1, lineHeight: 19 },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 5,
  },
  tagBlue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    maxWidth: '100%',
    backgroundColor: 'rgba(56,189,248,0.1)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
  },
  tagBlueLabel: { color: '#38bdf8', fontSize: 10, fontWeight: '800' },
  tagBlueValue: {
    color: '#7dd3fc',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'monospace',
    flexShrink: 1,
  },
  tagYellow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    maxWidth: '100%',
    backgroundColor: 'rgba(251,191,36,0.1)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
  },
  tagYellowFull: { flex: 1 },
  tagYellowLabel: { color: '#fbbf24', fontSize: 10, fontWeight: '800' },
  tagYellowValue: {
    color: '#fde68a',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'monospace',
    flexShrink: 1,
  },
  meta: { color: '#64748b', fontSize: 11, marginTop: 4, fontFamily: 'monospace' },
  qtyBox: { alignItems: 'flex-end', minWidth: 34 },
  qty: { color: '#fbbf24', fontSize: 17, fontWeight: '900', lineHeight: 19 },
  unit: { color: '#94a3b8', fontSize: 10, marginTop: 0 },
});
