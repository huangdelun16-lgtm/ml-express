import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const STAFF_KEY = 'inventory_staff_name';
const PIN_KEY = 'inventory_staff_pin';

type AuthContextValue = {
  ready: boolean;
  operatorName: string | null;
  hasPin: boolean;
  login: (name: string, pin: string) => Promise<boolean>;
  setupPin: (name: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [operatorName, setOperatorName] = useState<string | null>(null);
  const [hasPin, setHasPin] = useState(false);

  useEffect(() => {
    (async () => {
      const pin = await SecureStore.getItemAsync(PIN_KEY);
      const name = await AsyncStorage.getItem(STAFF_KEY);
      setHasPin(!!pin);
      if (pin && name) setOperatorName(name);
      setReady(true);
    })();
  }, []);

  const setupPin = useCallback(async (name: string, pin: string) => {
    const trimmed = name.trim();
    if (!trimmed || pin.length < 4) throw new Error('请填写姓名且 PIN 至少 4 位');
    await SecureStore.setItemAsync(PIN_KEY, pin);
    await AsyncStorage.setItem(STAFF_KEY, trimmed);
    setOperatorName(trimmed);
    setHasPin(true);
  }, []);

  const login = useCallback(async (name: string, pin: string) => {
    const storedPin = await SecureStore.getItemAsync(PIN_KEY);
    const storedName = await AsyncStorage.getItem(STAFF_KEY);
    if (!storedPin) return false;
    if (pin !== storedPin) return false;
    const trimmed = name.trim() || storedName || '工作人员';
    await AsyncStorage.setItem(STAFF_KEY, trimmed);
    setOperatorName(trimmed);
    return true;
  }, []);

  const logout = useCallback(async () => {
    setOperatorName(null);
  }, []);

  const value = useMemo(
    () => ({ ready, operatorName, hasPin, login, setupPin, logout }),
    [ready, operatorName, hasPin, login, setupPin, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
