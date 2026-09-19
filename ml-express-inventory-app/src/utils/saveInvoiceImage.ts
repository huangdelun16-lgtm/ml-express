import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Sharing from 'expo-sharing';

function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

export async function persistInvoicePng(uri: string): Promise<'saved' | 'shared'> {
  if (isExpoGo()) {
    if (!(await Sharing.isAvailableAsync())) {
      throw new Error('share-unavailable');
    }
    await Sharing.shareAsync(uri, {
      mimeType: 'image/png',
      UTI: 'public.png',
    });
    return 'shared';
  }

  const MediaLibrary = await import('expo-media-library');
  if (!(Platform.OS === 'android' && Number(Platform.Version) >= 33)) {
    const { status } = await MediaLibrary.requestPermissionsAsync(true);
    if (status !== 'granted') throw new Error('permission');
  }
  await MediaLibrary.saveToLibraryAsync(uri);
  return 'saved';
}

export async function shareInvoicePng(uri: string, dialogTitle: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) return;
  await Sharing.shareAsync(uri, {
    mimeType: 'image/png',
    UTI: 'public.png',
    dialogTitle,
  });
}
