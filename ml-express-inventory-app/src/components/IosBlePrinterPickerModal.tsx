import React, { useEffect, useRef, useState } from 'react';
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
import {
  connectIosBlePrinter,
  scanIosBlePrinters,
  type IosBlePrinterDevice,
} from '../services/iosBleThermalPrinter';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (device: IosBlePrinterDevice) => void;
  title: string;
  scanningLabel: string;
  emptyLabel: string;
  connectLabel: string;
  closeLabel: string;
  connectFailedTitle?: string;
  /** 嵌在已有 Modal 内时用 overlay，避免 iOS 第二层 Modal 不显示 */
  presentation?: 'modal' | 'overlay';
};

export default function IosBlePrinterPickerModal({
  visible,
  onClose,
  onSelect,
  title,
  scanningLabel,
  emptyLabel,
  connectLabel,
  closeLabel,
  connectFailedTitle,
  presentation = 'modal',
}: Props) {
  const [devices, setDevices] = useState<IosBlePrinterDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const stopScanRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!visible) {
      stopScanRef.current?.();
      stopScanRef.current = null;
      setScanning(false);
      setConnectingId(null);
      return;
    }

    let cancelled = false;
    setDevices([]);
    setScanning(true);

    void (async () => {
      try {
        const stop = await scanIosBlePrinters((found) => {
          if (cancelled) return;
          setDevices((prev) => {
            const map = new Map(prev.map((d) => [d.id, d]));
            for (const item of found) map.set(item.id, item);
            return [...map.values()].sort((a, b) => b.rssi - a.rssi);
          });
        });
        stopScanRef.current = stop;
      } catch (error) {
        if (!cancelled) {
          setScanning(false);
          const msg = error instanceof Error ? error.message : String(error ?? '');
          Alert.alert(connectFailedTitle ?? title, msg || emptyLabel);
        }
      }
    })();

    const timer = setTimeout(() => {
      stopScanRef.current?.();
      stopScanRef.current = null;
      if (!cancelled) setScanning(false);
    }, 10000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      stopScanRef.current?.();
      stopScanRef.current = null;
    };
  }, [visible, connectFailedTitle, emptyLabel, title]);

  const pickDevice = (device: IosBlePrinterDevice) => {
    void (async () => {
      setConnectingId(device.id);
      try {
        const ok = await connectIosBlePrinter(device.id);
        if (ok) {
          onSelect(device);
          return;
        }
        Alert.alert(connectFailedTitle ?? title, emptyLabel);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error ?? '');
        Alert.alert(connectFailedTitle ?? title, msg || emptyLabel);
      } finally {
        setConnectingId(null);
      }
    })();
  };

  if (!visible) return null;

  const body = (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        {scanning ? (
          <View style={styles.scanRow}>
            <ActivityIndicator color="#38bdf8" />
            <Text style={styles.scanText}>{scanningLabel}</Text>
          </View>
        ) : null}
        <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
          {devices.length === 0 ? (
            <Text style={styles.empty}>{emptyLabel}</Text>
          ) : (
            devices.map((device) => (
              <Pressable
                key={device.id}
                style={[styles.item, connectingId === device.id && styles.itemBusy]}
                disabled={connectingId != null}
                onPress={() => pickDevice(device)}
              >
                <Text style={styles.itemName}>{device.name}</Text>
                <Text style={styles.itemMeta}>
                  {connectingId === device.id ? connectLabel : `RSSI ${device.rssi}`}
                </Text>
              </Pressable>
            ))
          )}
        </ScrollView>
        <Pressable style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeText}>{closeLabel}</Text>
        </Pressable>
      </View>
    </View>
  );

  if (presentation === 'overlay') {
    return <View style={styles.overlayHost}>{body}</View>;
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      {body}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayHost: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    elevation: 100,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.72)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
    maxHeight: '80%',
  },
  title: { color: '#e2e8f0', fontSize: 18, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
  scanRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  scanText: { color: '#94a3b8', fontSize: 13 },
  list: { maxHeight: 320 },
  empty: { color: '#94a3b8', textAlign: 'center', paddingVertical: 24, lineHeight: 20 },
  item: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  itemBusy: { opacity: 0.7 },
  itemName: { color: '#f8fafc', fontWeight: '800', fontSize: 15 },
  itemMeta: { color: '#64748b', marginTop: 4, fontSize: 12 },
  closeBtn: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  closeText: { color: '#cbd5e1', fontWeight: '700' },
});
