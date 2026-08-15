import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';
import InventorySessionMonitor from './src/components/InventorySessionMonitor';
import { GlobalToast } from './src/components/GlobalToast';
import LoginScreen from './src/screens/LoginScreen';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Root() {
  const { ready, isAuthenticated, store, logout } = useAuth();
  useEffect(() => {
    if (ready) {
      void SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#2563eb" />
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
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <Root />
          <GlobalToast />
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
