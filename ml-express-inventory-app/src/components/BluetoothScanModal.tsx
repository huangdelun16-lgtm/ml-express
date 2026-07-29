import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import { useTranslation } from '../i18n';
import type { TranslationDict } from '../i18n/translations';
import {
  mergeScannedDevices,
  type ScannedBluetoothDevice,
} from '../utils/bluetoothDeviceMerge';
import { filterLikelyBlePrinters } from '../utils/blePrinterDeviceFilter';
import {
  connectBluetoothDevice,
  disconnectBluetoothDevice,
  getActiveBluetoothDevice,
  requestBluetoothScanPermissions,
  startBluetoothScan,
} from '../services/bluetoothScanner';

type Props = {
  visible: boolean;
  onClose: () => void;
  onConnectionChange?: () => void;
};

const SCAN_DURATION_MS = 15000;

function isNativeBleAvailable(): boolean {
  return Constants.appOwnership !== 'expo';
}

export default function BluetoothScanModal({ visible, onClose, onConnectionChange }: Props) {
  const { t, fmt } = useTranslation();
  const [devices, setDevices] = useState<ScannedBluetoothDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [connectedDevice, setConnectedDevice] = useState<ScannedBluetoothDevice | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const stopScanRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!visible) {
      stopScanRef.current?.();
      stopScanRef.current = null;
      setScanning(false);
      setConnectingId(null);
      return;
    }

    void getActiveBluetoothDevice().then(setConnectedDevice);

    if (!isNativeBleAvailable()) return;

    let cancelled = false;
    setDevices([]);
    setScanning(true);

    void (async () => {
      try {
        const granted = await requestBluetoothScanPermissions();
        if (!granted) {
          throw new Error('BLUETOOTH_PERMISSION_DENIED');
        }

        const stop = await startBluetoothScan((found) => {
          if (cancelled) return;
          setDevices((prev) => mergeScannedDevices(prev, filterLikelyBlePrinters(found)));
        });
        stopScanRef.current = stop;
      } catch (error) {
        if (cancelled) return;
        setScanning(false);
        Alert.alert(t.settings.scanPrinterTitle, resolveScanError(t, error));
      }
    })();

    const timer = setTimeout(() => {
      stopScanRef.current?.();
      stopScanRef.current = null;
      if (!cancelled) setScanning(false);
    }, SCAN_DURATION_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      stopScanRef.current?.();
      stopScanRef.current = null;
    };
  }, [visible, t]);

  const handleRescan = () => {
    if (!isNativeBleAvailable()) {
      Alert.alert(t.settings.scanPrinterTitle, t.settings.scanPrinterUnavailable);
      return;
    }
    if (connectingId) return;

    stopScanRef.current?.();
    stopScanRef.current = null;
    setDevices([]);
    setScanning(true);

    void (async () => {
      try {
        const granted = await requestBluetoothScanPermissions();
        if (!granted) throw new Error('BLUETOOTH_PERMISSION_DENIED');
        const stop = await startBluetoothScan((found) => {
          setDevices((prev) => mergeScannedDevices(prev, filterLikelyBlePrinters(found)));
        });
        stopScanRef.current = stop;
        setTimeout(() => {
          stopScanRef.current?.();
          stopScanRef.current = null;
          setScanning(false);
        }, SCAN_DURATION_MS);
      } catch (error) {
        setScanning(false);
        Alert.alert(t.settings.scanPrinterTitle, resolveScanError(t, error));
      }
    })();
  };

  const handleStop = () => {
    stopScanRef.current?.();
    stopScanRef.current = null;
    setScanning(false);
  };

  const handleConnect = (device: ScannedBluetoothDevice) => {
    if (connectingId || disconnecting) return;

    stopScanRef.current?.();
    stopScanRef.current = null;
    setScanning(false);
    setConnectingId(device.id);

    void (async () => {
      try {
        const connected = await connectBluetoothDevice(device.id);
        setConnectedDevice(connected);
        onConnectionChange?.();
        Alert.alert(
          t.settings.scanPrinterTitle,
          fmt(t.settings.scanPrinterConnectedTo, { name: connected.name }),
        );
      } catch (error) {
        Alert.alert(
          t.settings.scanPrinterConnectFailed,
          resolveScanError(t, error),
        );
      } finally {
        setConnectingId(null);
      }
    })();
  };

  const handleDisconnect = () => {
    if (connectingId || disconnecting) return;

    setDisconnecting(true);
    void (async () => {
      try {
        await disconnectBluetoothDevice();
        setConnectedDevice(null);
        onConnectionChange?.();
      } catch (error) {
        Alert.alert(t.settings.scanPrinterConnectFailed, resolveScanError(t, error));
      } finally {
        setDisconnecting(false);
      }
    })();
  };

  const visibleDevices = useMemo(() => {
    const filtered = filterLikelyBlePrinters(devices);
    if (connectedDevice && !filtered.some((device) => device.id === connectedDevice.id)) {
      return [connectedDevice, ...filtered];
    }
    return filtered;
  }, [devices, connectedDevice]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{t.settings.scanPrinterTitle}</Text>
          <Text style={styles.hint}>{t.settings.scanPrinterModalHint}</Text>

          {!isNativeBleAvailable() ? (
            <Text style={styles.unavailable}>{t.settings.scanPrinterUnavailable}</Text>
          ) : (
            <>
              {connectedDevice ? (
                <View style={styles.connectedBanner}>
                  <Text style={styles.connectedText}>
                    {fmt(t.settings.scanPrinterConnectedTo, { name: connectedDevice.name })}
                  </Text>
                  <Pressable
                    style={[styles.disconnectBtn, disconnecting && styles.btnDisabled]}
                    onPress={handleDisconnect}
                    disabled={disconnecting || connectingId != null}
                  >
                    <Text style={styles.disconnectBtnText}>
                      {disconnecting ? t.settings.scanPrinterConnecting : t.settings.scanPrinterDisconnect}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Text style={styles.tapHint}>{t.settings.scanPrinterTapToConnect}</Text>
              )}

              {scanning ? (
                <View style={styles.scanRow}>
                  <ActivityIndicator color="#38bdf8" />
                  <Text style={styles.scanText}>{t.settings.scanPrinterScanning}</Text>
                </View>
              ) : (
                <Text style={styles.doneText}>
                  {visibleDevices.length > 0
                    ? fmt(t.settings.scanPrinterFound, { count: visibleDevices.length })
                    : t.settings.scanPrinterEmpty}
                </Text>
              )}

              <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
                {visibleDevices.map((device) => {
                  const isConnected = connectedDevice?.id === device.id;
                  const isConnecting = connectingId === device.id;

                  return (
                    <Pressable
                      key={device.id}
                      style={[
                        styles.item,
                        isConnected && styles.itemConnected,
                        isConnecting && styles.itemBusy,
                      ]}
                      disabled={connectingId != null || disconnecting}
                      onPress={() => handleConnect(device)}
                    >
                      <View style={styles.itemHead}>
                        <Text style={styles.itemName} numberOfLines={2}>
                          {device.name}
                        </Text>
                        {isConnected ? (
                          <Text style={styles.itemBadge}>{t.settings.scanPrinterConnected}</Text>
                        ) : isConnecting ? (
                          <Text style={styles.itemBadgeBusy}>{t.settings.scanPrinterConnecting}</Text>
                        ) : null}
                      </View>
                      <Text style={styles.itemMeta} selectable numberOfLines={1}>
                        {device.rssi != null ? `RSSI ${device.rssi}` : '—'} · {device.id}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={styles.actions}>
                {scanning ? (
                  <Pressable style={styles.secondaryBtn} onPress={handleStop}>
                    <Text style={styles.secondaryBtnText}>{t.settings.scanPrinterStop}</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    style={[styles.primaryBtn, connectingId != null && styles.btnDisabled]}
                    onPress={handleRescan}
                    disabled={connectingId != null}
                  >
                    <Text style={styles.primaryBtnText}>{t.settings.scanPrinterRescan}</Text>
                  </Pressable>
                )}
              </View>
            </>
          )}

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>{t.common.close}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function resolveScanError(t: TranslationDict, error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error ?? '');
  if (msg === 'BLUETOOTH_OFF') return t.settings.scanPrinterBluetoothOff;
  if (msg === 'BLUETOOTH_PERMISSION_DENIED') return t.settings.scanPrinterPermissionDenied;
  if (/timeout|timed out|connect/i.test(msg)) return t.settings.scanPrinterConnectFailed;
  return msg || t.settings.scanPrinterFailed;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.78)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: '85%',
  },
  title: {
    color: '#7dd3fc',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  hint: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 10,
  },
  tapHint: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
  },
  connectedBanner: {
    backgroundColor: '#064e3b',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#059669',
    gap: 10,
  },
  connectedText: { color: '#6ee7b7', fontWeight: '800', fontSize: 13, textAlign: 'center' },
  disconnectBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#34d399',
  },
  disconnectBtnText: { color: '#a7f3d0', fontWeight: '800', fontSize: 13 },
  unavailable: {
    color: '#fbbf24',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  scanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  scanText: { color: '#bae6fd', fontWeight: '700', fontSize: 14 },
  doneText: {
    color: '#cbd5e1',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  list: { maxHeight: 320, marginBottom: 12 },
  item: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  itemConnected: {
    borderColor: '#059669',
    backgroundColor: '#022c22',
  },
  itemBusy: { opacity: 0.7 },
  itemHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  itemName: { color: '#f8fafc', fontWeight: '800', fontSize: 15, flex: 1 },
  itemBadge: { color: '#34d399', fontWeight: '900', fontSize: 11 },
  itemBadgeBusy: { color: '#38bdf8', fontWeight: '900', fontSize: 11 },
  itemMeta: { color: '#64748b', fontSize: 11, fontFamily: 'monospace' },
  actions: { marginBottom: 10 },
  primaryBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  secondaryBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  secondaryBtnText: { color: '#e2e8f0', fontWeight: '800', fontSize: 14 },
  closeBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  closeText: { color: '#cbd5e1', fontWeight: '700', fontSize: 15 },
  btnDisabled: { opacity: 0.55 },
});
