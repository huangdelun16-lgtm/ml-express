import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

async function getItemNative(key: string): Promise<string | null> {
  try { return await SecureStore.getItemAsync(key); } catch { return null; }
}

async function setItemNative(key: string, value: string): Promise<void> {
  try { await SecureStore.setItemAsync(key, value); } catch {}
}

async function deleteItemNative(key: string): Promise<void> {
  try { await SecureStore.deleteItemAsync(key); } catch {}
}

function getItemWeb(key: string): Promise<string | null> {
  try { return Promise.resolve(window.localStorage.getItem(key)); } catch { return Promise.resolve(null); }
}

function setItemWeb(key: string, value: string): Promise<void> {
  try { window.localStorage.setItem(key, value); } catch {}
  return Promise.resolve();
}

function deleteItemWeb(key: string): Promise<void> {
  try { window.localStorage.removeItem(key); } catch {}
  return Promise.resolve();
}

export const storage = {
  getItem(key: string) {
    return Platform.OS === 'web' ? getItemWeb(key) : getItemNative(key);
  },
  setItem(key: string, value: string) {
    return Platform.OS === 'web' ? setItemWeb(key, value) : setItemNative(key, value);
  },
  deleteItem(key: string) {
    return Platform.OS === 'web' ? deleteItemWeb(key) : deleteItemNative(key);
  },
};


