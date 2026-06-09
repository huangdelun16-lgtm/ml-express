import React, { useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import { getItemByBarcode } from '../services/inventoryService';

type Nav = { navigate: (name: string, params?: { presetBarcode?: string }) => void };

export default function CameraScanScreen({ navigation }: { navigation: Nav }) {
  const [permission, requestPermission] = useCameraPermissions();
  const isFocused = useIsFocused();
  const [scanned, setScanned] = useState(false);
  const [manual, setManual] = useState('');
  const lastRef = useRef('');
  const lastTimeRef = useRef(0);

  const handleCode = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    const now = Date.now();
    if (scanned || trimmed === lastRef.current || now - lastTimeRef.current < 1500) return;
    setScanned(true);
    lastRef.current = trimmed;
    lastTimeRef.current = now;

    const item = await getItemByBarcode(trimmed);
    Alert.alert(
      item ? item.name : '未建档条码',
      item
        ? `条码：${item.barcode}\n库存：${item.qty_on_hand} ${item.unit}`
        : `条码：${trimmed}\n可选择入库并自动建档`,
      [
        { text: '重新扫描', onPress: () => setScanned(false) },
        {
          text: '去入库',
          onPress: () => {
            setScanned(false);
            navigation.navigate('StockIn', { presetBarcode: trimmed });
          },
        },
        item
          ? {
              text: '去出库',
              onPress: () => {
                setScanned(false);
                navigation.navigate('StockOut', { presetBarcode: trimmed });
              },
            }
          : { text: '去建档', onPress: () => navigation.navigate('ItemForm') },
      ],
    );
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>检查相机权限…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>需要相机权限</Text>
        <Pressable style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>授予权限</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {isFocused ? (
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={scanned ? undefined : ({ data }) => void handleCode(data)}
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'code128', 'qr', 'pdf417'],
          }}
        />
      ) : (
        <View style={styles.camera} />
      )}
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>对准条码 / 二维码</Text>
        <TextInput
          style={styles.input}
          placeholder="或手动输入条码"
          placeholderTextColor="#94a3b8"
          value={manual}
          onChangeText={setManual}
          onSubmitEditing={() => {
            setScanned(false);
            void handleCode(manual);
            setManual('');
          }}
        />
        {scanned ? (
          <Pressable style={styles.btn} onPress={() => setScanned(false)}>
            <Text style={styles.btnText}>重新扫描</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  panel: {
    backgroundColor: '#0f172a',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  panelTitle: { color: '#f8fafc', fontWeight: '800', marginBottom: 10 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    fontFamily: 'monospace',
  },
  center: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { color: '#f8fafc', fontSize: 18, fontWeight: '800', marginBottom: 16 },
  hint: { color: '#94a3b8' },
  btn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  btnText: { color: '#fff', fontWeight: '800' },
});
