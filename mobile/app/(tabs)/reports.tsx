import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { Screen } from '../../src/components/Screen';
import { mockApi } from '../../src/mockApi';

export default function Reports() {
  const [summary, setSummary] = useState<any>(null);
  useEffect(() => { (async ()=> setSummary(await mockApi.listReportsSummary()))(); }, []);
  if (!summary) return <Screen><Text>加载中...</Text></Screen>;
  return (
    <Screen>
      <View style={{ gap: 12 }}>
        <Card style={{ borderRadius: 16 }}>
          <Card.Content>
            <Text variant="titleSmall">今日入库</Text>
            <Text variant="headlineSmall">{summary.todayInbound}</Text>
          </Card.Content>
        </Card>
        <Card style={{ borderRadius: 16 }}>
          <Card.Content>
            <Text variant="titleSmall">今日出库</Text>
            <Text variant="headlineSmall">{summary.todayOutbound}</Text>
          </Card.Content>
        </Card>
        <Card style={{ borderRadius: 16 }}>
          <Card.Content>
            <Text variant="titleSmall">本月营收</Text>
            <Text variant="headlineSmall">{summary.monthRevenue} Ks</Text>
          </Card.Content>
        </Card>
        <Card style={{ borderRadius: 16 }}>
          <Card.Content>
            <Text variant="titleSmall">本月包裹量</Text>
            <Text variant="headlineSmall">{summary.monthPackages}</Text>
          </Card.Content>
        </Card>
      </View>
    </Screen>
  );
}


