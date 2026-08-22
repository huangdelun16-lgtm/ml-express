import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import { useTranslation } from '../i18n';
import { MYANMAR_FONT_BOLD } from '../utils/myanmarText';
import { colors } from '../theme';

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
  HubReceive: { openPackBarcode?: string } | undefined;
  ShipmentTrack: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { t, language } = useTranslation();
  const screenOptions = {
    headerStyle: { backgroundColor: colors.bgDeep },
    headerTintColor: colors.text,
    headerTitleStyle:
      language === 'my'
        ? { fontFamily: MYANMAR_FONT_BOLD, fontWeight: '800' as const }
        : { fontWeight: '800' as const },
    contentStyle: { backgroundColor: colors.bgDeep },
  };

  return (
      <Stack.Navigator key={language} screenOptions={screenOptions}>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="StockIn" getComponent={() => require('../screens/StockInScreen').default} options={{ title: t.nav.stockIn }} />
      <Stack.Screen
        name="PackagingStockIn"
        getComponent={() => require('../screens/PackagingStockInScreen').default}
        options={{ title: t.nav.packagingStockIn }}
      />
      <Stack.Screen name="StockOut" getComponent={() => require('../screens/StockOutScreen').default} options={{ title: t.nav.stockOut }} />
      <Stack.Screen name="HubReceive" getComponent={() => require('../screens/HubReceiveScreen').default} options={{ title: t.nav.hubReceive }} />
      <Stack.Screen name="ShipmentTrack" getComponent={() => require('../screens/ShipmentTrackScreen').default} options={{ title: t.nav.shipmentTrack }} />
      <Stack.Screen name="Items" getComponent={() => require('../screens/ItemsScreen').default} options={{ title: t.nav.items }} />
      <Stack.Screen name="Pkg" getComponent={() => require('../screens/PkgScreen').default} options={{ title: t.nav.pkg }} />
      <Stack.Screen name="TrackExpress" getComponent={() => require('../screens/TrackExpressScreen').default} options={{ title: t.nav.trackExpress }} />
      <Stack.Screen name="ItemForm" getComponent={() => require('../screens/ItemFormScreen').default} options={{ title: t.nav.itemForm }} />
      <Stack.Screen name="Movements" getComponent={() => require('../screens/MovementsScreen').default} options={{ title: t.nav.movements }} />
      <Stack.Screen
        name="CrossBorderFinance"
        getComponent={() => require('../screens/CrossBorderFinanceScreen').default}
        options={{ title: t.nav.crossBorderFinance }}
      />
      <Stack.Screen name="CameraScan" getComponent={() => require('../screens/CameraScanScreen').default} options={{ title: t.nav.cameraScan }} />
      <Stack.Screen name="Settings" getComponent={() => require('../screens/SettingsScreen').default} options={{ title: t.nav.settings }} />
      <Stack.Screen
        name="PrintPreview"
        getComponent={() => require('../screens/PrintPreviewScreen').default}
        options={{ title: t.nav.printPreview }}
      />
    </Stack.Navigator>
  );
}
