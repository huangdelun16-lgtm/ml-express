import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function Layout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#1976d2',
      tabBarStyle: { backgroundColor: '#ffffff', borderTopColor: 'rgba(13,71,161,0.12)' },
      headerStyle: { backgroundColor: '#ffffff' },
      headerTitleStyle: { color: '#0d47a1' },
    }}>
      <Tabs.Screen name="home" options={{ title: '首页', tabBarIcon: ({color, size}) => (<Ionicons name="home" color={color} size={size} />) }} />
      <Tabs.Screen name="inbound" options={{ title: '入库', tabBarIcon: ({color, size}) => (<Ionicons name="log-in" color={color} size={size} />) }} />
      <Tabs.Screen name="outbound" options={{ title: '出库', tabBarIcon: ({color, size}) => (<Ionicons name="log-out" color={color} size={size} />) }} />
      <Tabs.Screen name="finance" options={{ title: '财务', tabBarIcon: ({color, size}) => (<Ionicons name="cash" color={color} size={size} />) }} />
      <Tabs.Screen name="reports" options={{ title: '报表', tabBarIcon: ({color, size}) => (<Ionicons name="stats-chart" color={color} size={size} />) }} />
      <Tabs.Screen name="customers" options={{ title: '客户', tabBarIcon: ({color, size}) => (<Ionicons name="people" color={color} size={size} />) }} />
      <Tabs.Screen name="scan" options={{ title: '扫码', tabBarIcon: ({color, size}) => (<Ionicons name="qr-code" color={color} size={size} />) }} />
      <Tabs.Screen name="profile" options={{ title: '我的', tabBarIcon: ({color, size}) => (<Ionicons name="person" color={color} size={size} />) }} />
    </Tabs>
  );
}
