import React from 'react';
import { Stack } from 'expo-router';
import { Provider as PaperProvider } from 'react-native-paper';
import { appTheme } from '../src/theme';
import { useEffect } from 'react';
import { setOnUnauthorized } from '../src/api';
import { useRouter } from 'expo-router';
import { SnackbarProvider } from '../src/components/SnackbarProvider';

export default function Root() {
  const router = useRouter();
  useEffect(() => {
    setOnUnauthorized(() => {
      try { router.push('/(tabs)/profile'); } catch {}
    });
  }, []);
  return (
    <PaperProvider theme={appTheme}>
      <SnackbarProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
      </SnackbarProvider>
    </PaperProvider>
  );
}
