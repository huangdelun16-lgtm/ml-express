import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import CloudAutoSyncRunner from './src/components/CloudAutoSyncRunner';
import LoginScreen from './src/screens/LoginScreen';
import { getDatabase } from './src/services/database';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Root() {
  const { ready, isAuthenticated } = useAuth();
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    void getDatabase()
      .then(() => setDbReady(true))
      .catch(() => setDbReady(true));
  }, []);

  useEffect(() => {
    if (ready && dbReady) {
      void SplashScreen.hideAsync();
    }
  }, [ready, dbReady]);

  if (!ready || !dbReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return isAuthenticated ? (
    <NavigationContainer>
      <CloudAutoSyncRunner />
      <AppNavigator />
    </NavigationContainer>
  ) : (
    <LoginScreen />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Root />
    </AuthProvider>
  );
}
