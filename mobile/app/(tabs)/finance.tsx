import React, { useEffect, useState } from 'react';
import { FlatList } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { Screen } from '../../src/components/Screen';
import { mockApi } from '../../src/mockApi';

export default function Finance() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { (async ()=> setItems(await mockApi.listFinance()))(); }, []);
  return (
    <Screen>
      <FlatList
        data={items}
        keyExtractor={(it)=>it.id}
        renderItem={({item}) => (
          <Card style={{ marginBottom: 12, borderRadius: 16 }}>
            <Card.Content>
              <Text variant="titleSmall">{item.type} {item.amount} Ks</Text>
              <Text variant="bodySmall" style={{ color:'#4b5563' }}>{item.note} · {item.date?.substring(0,10)}</Text>
            </Card.Content>
          </Card>
        )}
      />
    </Screen>
  );
}


