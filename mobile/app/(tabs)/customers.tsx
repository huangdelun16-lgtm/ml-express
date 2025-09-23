import React, { useEffect, useState } from 'react';
import { FlatList } from 'react-native';
import { Avatar, Card, Text } from 'react-native-paper';
import { Screen } from '../../src/components/Screen';
import { mockApi } from '../../src/mockApi';

export default function Customers() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { (async ()=> setItems(await mockApi.listCustomers()))(); }, []);
  return (
    <Screen>
      <FlatList
        data={items}
        keyExtractor={(it)=>it.id}
        renderItem={({item}) => (
          <Card style={{ marginBottom: 12, borderRadius: 16 }}>
            <Card.Title title={item.name} subtitle={item.phone} left={(p)=>(<Avatar.Text {...p} label={item.name?.substring(0,1)} />)} />
          </Card>
        )}
      />
    </Screen>
  );
}


