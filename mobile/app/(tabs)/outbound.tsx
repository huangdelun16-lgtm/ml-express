import React, { useEffect, useRef, useState } from 'react';
import { FlatList, View } from 'react-native';
import { Button, Card, Text, TextInput } from 'react-native-paper';
import { Screen } from '../../src/components/Screen';
import { mockApi } from '../../src/mockApi';
import { useSnackbar } from '../../src/components/SnackbarProvider';

export default function Outbound() {
  const { showSnackbar } = useSnackbar();
  const [items, setItems] = useState<any[]>([]);
  const [freightNo, setFreightNo] = useState('');
  const [addInput, setAddInput] = useState('');
  const [busy, setBusy] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = async () => setItems(await mockApi.listOutbound());
  useEffect(() => { reload(); }, []);

  const onCreateShipment = async () => {
    if (!freightNo.trim()) return;
    setBusy(true);
    try {
      await mockApi.createShipment(freightNo.trim());
      showSnackbar('已创建运单');
      setFreightNo('');
      await reload();
    } finally { setBusy(false); }
  };

  const onBindPackages = async () => {
    const tracks = addInput.split(/[\s,\n]+/).map(s=>s.trim()).filter(Boolean);
    if (tracks.length === 0) return;
    setBusy(true);
    try {
      const first = items[0];
      if (!first) { showSnackbar('请先创建运单'); setBusy(false); return; }
      await mockApi.addPackagesToShipment(first.id, tracks);
      showSnackbar(`已绑定 ${tracks.length} 件到 ${first.freightNo}`);
      setAddInput('');
    } finally { setBusy(false); }
  };

  return (
    <Screen>
      <View style={{ gap: 12 }}>
        <Card style={{ borderRadius: 16, borderWidth: 1, borderColor: 'rgba(13,71,161,0.08)' }}>
          <Card.Title title="新建运单" />
          <Card.Content>
            <TextInput placeholder="运单号（车次/航班号）" mode="outlined" value={freightNo} onChangeText={setFreightNo} />
            <Button style={{ marginTop: 12 }} mode="contained" onPress={onCreateShipment} loading={busy}>
              创建
            </Button>
          </Card.Content>
        </Card>

        <Card style={{ borderRadius: 16, borderWidth: 1, borderColor: 'rgba(13,71,161,0.08)' }}>
          <Card.Title title="绑定包裹到最新运单" subtitle="输入多个单号，逗号/空格/换行分隔" />
          <Card.Content>
            <TextInput placeholder="ML123, ML456 ..." mode="outlined" value={addInput} onChangeText={setAddInput} multiline numberOfLines={3} />
            <Button style={{ marginTop: 12 }} mode="contained" onPress={onBindPackages} loading={busy}>
              绑定
            </Button>
          </Card.Content>
        </Card>

        <FlatList
          data={items}
          keyExtractor={(it)=>it.id}
          renderItem={({item}) => (
            <Card style={{ marginBottom: 12, borderRadius: 16 }}>
              <Card.Content>
                <Text variant="titleSmall">运单 {item.freightNo}</Text>
                <Text variant="bodySmall" style={{ color:'#4b5563' }}>包裹 {item.count} 件 · {item.createdAt?.substring(0,10)}</Text>
              </Card.Content>
            </Card>
          )}
        />
      </View>
    </Screen>
  );
}


