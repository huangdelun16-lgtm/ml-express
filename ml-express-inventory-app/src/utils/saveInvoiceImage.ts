import type { RefObject } from 'react';
import { Platform, type View } from 'react-native';
import Constants from 'expo-constants';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

function isPermissionError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err ?? '');
  return message === 'permission' || /permission|phphoto|not authorized|access denied/i.test(message);
}

async function sharePng(uri: string, dialogTitle?: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('share-unavailable');
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'image/png',
    UTI: 'public.png',
    dialogTitle,
  });
}

/** 离屏发票透明度为 0 时 iOS 截不到。先按图层截，不行再按上屏方式截。 */
export async function captureInvoiceView(target: RefObject<View | null> | View): Promise<string> {
  const view = target && typeof target === 'object' && 'current' in target ? target.current : target;
  if (!view) throw new Error('invoice-not-ready');
  const base = { format: 'png' as const, quality: 1, result: 'tmpfile' as const };
  try {
    return await captureRef(view, { ...base, useRenderInContext: true });
  } catch (first) {
    try {
      return await captureRef(view, base);
    } catch {
      throw first;
    }
  }
}

export async function persistInvoicePng(uri: string): Promise<'saved' | 'shared'> {
  if (isExpoGo()) {
    await sharePng(uri);
    return 'shared';
  }

  try {
    const MediaLibrary = await import('expo-media-library');
    if (!(Platform.OS === 'android' && Number(Platform.Version) >= 33)) {
      const { status } = await MediaLibrary.requestPermissionsAsync(true);
      if (status !== 'granted') throw new Error('permission');
    }
    await MediaLibrary.saveToLibraryAsync(uri);
    return 'saved';
  } catch (err) {
    if (isPermissionError(err)) throw new Error('permission');
    await sharePng(uri);
    return 'shared';
  }
}

export async function shareInvoicePng(uri: string, dialogTitle: string): Promise<void> {
  try {
    await sharePng(uri, dialogTitle);
  } catch (err) {
    if (err instanceof Error && err.message === 'share-unavailable') return;
    throw err;
  }
}
