import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { Button, Card, Checkbox, IconButton, Text, TextInput } from 'react-native-paper';
import { Screen } from '../../src/components/Screen';
import { mockApi } from '../../src/mockApi';
import { useSnackbar } from '../../src/components/SnackbarProvider';

export default function Inbound() {
  const { showSnackbar } = useSnackbar();
  const [items, setItems] = useState<any[]>([]);
  const [keyword, setKeyword] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = async (kw: string = keyword) => {
    setLoading(true);
    try {
      const data = await mockApi.searchPackages(kw);
      setItems(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(''); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try { await load(keyword); } finally { setRefreshing(false); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());
  const selectAll = () => setSelectedIds(new Set(items.map(it => it.id)));

  const selectedCount = useMemo(() => selectedIds.size, [selectedIds]);

  const onMarkInbound = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const r = await mockApi.markInbound(ids);
    showSnackbar(`已入库 ${r.changed} 件`);
    clearSelection();
    await load(keyword);
  };

  const onDelete = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const r = await mockApi.deletePackages(ids);
    showSnackbar(`已删除 ${r.removed} 件`);
    clearSelection();
    await load(keyword);
  };

  return (
    <Screen>
      <View style={{ gap: 12 }}>
        <TextInput
          mode="outlined"
          placeholder="搜索单号"
          value={keyword}
          onChangeText={(v)=>{
            setKeyword(v);
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(()=>{ load(v); }, 300);
          }}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="labelMedium">共 {items.length} 条</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <IconButton icon="select-all" onPress={selectAll} accessibilityLabel="全选" />
            <IconButton icon="close" onPress={clearSelection} accessibilityLabel="清空" />
          </View>
        </View>

        <FlatList
          data={items}
          keyExtractor={(it)=>it.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({item}) => (
            <Card style={{ marginBottom: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(13,71,161,0.08)' }}>
              <Card.Content style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Checkbox
                  status={selectedIds.has(item.id) ? 'checked' : 'unchecked'}
                  onPress={()=>toggleSelect(item.id)}
                />
                <View style={{ flex: 1 }}>
                  <Text variant="titleSmall">{item.trackingNumber}</Text>
                  <Text variant="bodySmall" style={{ color:'#4b5563' }}>{item.status} · {item.weightKg}kg</Text>
                </View>
              </Card.Content>
            </Card>
          )}
          ListFooterComponent={<View style={{ height: 72 }} />}
        />
      </View>

      {selectedCount > 0 && (
        <Card style={{ position: 'absolute', left: 16, right: 16, bottom: 16, borderRadius: 16 }}>
          <Card.Content>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text>已选 {selectedCount} 件</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button mode="outlined" onPress={onDelete}>删除</Button>
                <Button mode="contained" onPress={onMarkInbound} loading={loading}>标记入库</Button>
              </View>
            </View>
          </Card.Content>
        </Card>
      )}
    </Screen>
  );
}


