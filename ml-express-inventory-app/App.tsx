import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  NotoSansMyanmar_400Regular,
  NotoSansMyanmar_600SemiBold,
  NotoSansMyanmar_700Bold,
} from '@expo-google-fonts/noto-sans-myanmar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { colors } from './src/theme';
import AppNavigator from './src/navigation/AppNavigator';
import InventorySessionMonitor from './src/components/InventorySessionMonitor';
import { GlobalToast } from './src/components/GlobalToast';
import PrinterPickerHost from './src/components/PrinterPickerHost';
import LoginScreen from './src/screens/LoginScreen';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Root({ fontsReady }: { fontsReady: boolean }) {
  const { ready, isAuthenticated, store, logout } = useAuth();
  useEffect(() => {
    if (ready && fontsReady) {
      void SplashScreen.hideAsync();
    }
  }, [ready, fontsReady]);

  if (!ready || !fontsReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return isAuthenticated ? (
    <NavigationContainer>
      {store ? (
        <InventorySessionMonitor storeId={store.id} onKicked={() => void logout()} />
      ) : null}
      <AppNavigator />
    </NavigationContainer>
  ) : (
    <LoginScreen />
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    NotoSansMyanmar_400Regular,
    NotoSansMyanmar_600SemiBold,
    NotoSansMyanmar_700Bold,
  });
  const fontsReady = fontsLoaded || Boolean(fontError);

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <Root fontsReady={fontsReady} />
          <GlobalToast />
          <PrinterPickerHost />
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
