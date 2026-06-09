import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import StockInScreen from '../screens/StockInScreen';
import StockOutScreen from '../screens/StockOutScreen';
import ItemsScreen from '../screens/ItemsScreen';
import ItemFormScreen from '../screens/ItemFormScreen';
import MovementsScreen from '../screens/MovementsScreen';
import CameraScanScreen from '../screens/CameraScanScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PkgScreen from '../screens/PkgScreen';

export type RootStackParamList = {
  Home: undefined;
  StockIn: { presetBarcode?: string } | undefined;
  StockOut: { presetBarcode?: string } | undefined;
  Items: undefined;
  ItemForm: { itemId?: string } | undefined;
  Movements: undefined;
  CameraScan: undefined;
  Settings: undefined;
  Pkg: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const screenOptions = {
  headerStyle: { backgroundColor: '#0f172a' },
  headerTintColor: '#f8fafc',
  headerTitleStyle: { fontWeight: '800' as const },
  contentStyle: { backgroundColor: '#0f172a' },
};

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'ML Inventory' }} />
      <Stack.Screen name="StockIn" component={StockInScreen} options={{ title: '入库' }} />
      <Stack.Screen name="StockOut" component={StockOutScreen} options={{ title: '出库' }} />
      <Stack.Screen name="Items" component={ItemsScreen} options={{ title: '商品库' }} />
      <Stack.Screen name="Pkg" component={PkgScreen} options={{ title: 'PKG' }} />
      <Stack.Screen name="ItemForm" component={ItemFormScreen} options={{ title: '商品' }} />
      <Stack.Screen name="Movements" component={MovementsScreen} options={{ title: '流水' }} />
      <Stack.Screen name="CameraScan" component={CameraScanScreen} options={{ title: '相机扫码' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: '设置' }} />
    </Stack.Navigator>
  );
}
