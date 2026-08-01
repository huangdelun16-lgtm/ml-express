import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import StockInScreen from '../screens/StockInScreen';
import PackagingStockInScreen from '../screens/PackagingStockInScreen';
import StockOutScreen from '../screens/StockOutScreen';
import ItemsScreen from '../screens/ItemsScreen';
import ItemFormScreen from '../screens/ItemFormScreen';
import MovementsScreen from '../screens/MovementsScreen';
import CrossBorderFinanceScreen from '../screens/CrossBorderFinanceScreen';
import CameraScanScreen from '../screens/CameraScanScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PrintPreviewScreen from '../screens/PrintPreviewScreen';
import PkgScreen from '../screens/PkgScreen';
import TrackExpressScreen from '../screens/TrackExpressScreen';
import HubReceiveScreen from '../screens/HubReceiveScreen';
import ShipmentTrackScreen from '../screens/ShipmentTrackScreen';
import { useTranslation } from '../i18n';

export type RootStackParamList = {
  Home: undefined;
  StockIn: { presetBarcode?: string } | undefined;
  PackagingStockIn: undefined;
  StockOut: { presetBarcode?: string } | undefined;
  Items: undefined;
  ItemForm: { itemId?: string } | undefined;
  Movements: undefined;
  CrossBorderFinance: { initialTab?: 'transport' | 'pending' | 'agency' | 'manual' | 'all' } | undefined;
  CameraScan: undefined;
  Settings: undefined;
  PrintPreview: undefined;
  Pkg: undefined;
  TrackExpress: { presetCode?: string } | undefined;
  HubReceive: undefined;
  ShipmentTrack: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const screenOptions = {
  headerStyle: { backgroundColor: '#020617' },
  headerTintColor: '#f8fafc',
  headerTitleStyle: { fontWeight: '800' as const },
  contentStyle: { backgroundColor: '#020617' },
};

export default function AppNavigator() {
  const { t, language } = useTranslation();

  return (
      <Stack.Navigator key={language} screenOptions={screenOptions}>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="StockIn" component={StockInScreen} options={{ title: t.nav.stockIn }} />
      <Stack.Screen
        name="PackagingStockIn"
        component={PackagingStockInScreen}
        options={{ title: t.nav.packagingStockIn }}
      />
      <Stack.Screen name="StockOut" component={StockOutScreen} options={{ title: t.nav.stockOut }} />
      <Stack.Screen name="HubReceive" component={HubReceiveScreen} options={{ title: t.nav.hubReceive }} />
      <Stack.Screen name="ShipmentTrack" component={ShipmentTrackScreen} options={{ title: t.nav.shipmentTrack }} />
      <Stack.Screen name="Items" component={ItemsScreen} options={{ title: t.nav.items }} />
      <Stack.Screen name="Pkg" component={PkgScreen} options={{ title: t.nav.pkg }} />
      <Stack.Screen name="TrackExpress" component={TrackExpressScreen} options={{ title: t.nav.trackExpress }} />
      <Stack.Screen name="ItemForm" component={ItemFormScreen} options={{ title: t.nav.itemForm }} />
      <Stack.Screen name="Movements" component={MovementsScreen} options={{ title: t.nav.movements }} />
      <Stack.Screen
        name="CrossBorderFinance"
        component={CrossBorderFinanceScreen}
        options={{ title: t.nav.crossBorderFinance }}
      />
      <Stack.Screen name="CameraScan" component={CameraScanScreen} options={{ title: t.nav.cameraScan }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: t.nav.settings }} />
      <Stack.Screen
        name="PrintPreview"
        component={PrintPreviewScreen}
        options={{ title: t.nav.printPreview }}
      />
    </Stack.Navigator>
  );
}
