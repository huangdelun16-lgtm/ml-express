import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { BARCODE_SCAN_TYPES } from '../constants/barcodeScan';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';

type Props = {
  onScan: (code: string) => void;
  title?: string;
  subtitle?: string;
  manualPlaceholder?: string;
  style?: StyleProp<ViewStyle>;
  active?: boolean;
  /** 仅相机区域，不显示底部手动输入条 */
  compact?: boolean;
};

export default function BarcodeScannerView({
  onScan,
  title = '对准条码',
  subtitle = '支持快递单、入库条码、PKG 包装号',
  manualPlaceholder = '或手动输入后按回车',
  style,
  active = true,
  compact = false,
}: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [manual, setManual] = useState('');
  const [flash, setFlash] = useState<string | null>(null);
  const { handleScan, reset, locked } = useBarcodeScanner((code) => {
    setFlash(code);
    onScan(code);
    setTimeout(() => setFlash(null), 900);
  });

  const submitManual = () => {
    const ok = handleScan(manual);
    if (ok) setManual('');
  };

  if (!permission) {
    return (
      <View style={[styles.center, style]}>
        <Text style={styles.hint}>检查相机权限…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.center, style]}>
        <Text style={styles.hint}>需要相机权限才能扫码</Text>
        <Pressable style={styles.btn} onPress={() => void requestPermission()}>
          <Text style={styles.btnText}>授予权限</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.root, style]}>
      <View style={styles.cameraWrap}>
        {active ? (
          <CameraView
            style={styles.camera}
            facing="back"
            enableTorch={torch}
            onBarcodeScanned={locked ? undefined : ({ data }) => handleScan(data)}
            barcodeScannerSettings={{ barcodeTypes: [...BARCODE_SCAN_TYPES] }}
          />
        ) : (
          <View style={styles.camera} />
        )}

        <View style={styles.overlay} pointerEvents="none">
          <Text style={styles.overlayTitle}>{title}</Text>
          <Text style={styles.overlaySub}>{subtitle}</Text>
          <View style={styles.frame}>
            <View style={[styles.corner, styles.cTL]} />
            <View style={[styles.corner, styles.cTR]} />
            <View style={[styles.corner, styles.cBL]} />
            <View style={[styles.corner, styles.cBR]} />
          </View>
          {flash ? (
            <View style={styles.flashBox}>
              <Text style={styles.flashText}>✓ {flash}</Text>
            </View>
          ) : null}
        </View>

        <Pressable
          style={[styles.torchBtn, torch && styles.torchOn]}
          onPress={() => setTorch((v) => !v)}
        >
          <Text style={styles.torchText}>{torch ? '💡 关灯' : '🔦 补光'}</Text>
        </Pressable>
      </View>

      {compact ? null : (
        <View style={styles.panel}>
          <TextInput
            style={styles.input}
            placeholder={manualPlaceholder}
            placeholderTextColor="#94a3b8"
            value={manual}
            onChangeText={setManual}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={submitManual}
          />
          <View style={styles.panelActions}>
            <Pressable style={styles.secondaryBtn} onPress={reset}>
              <Text style={styles.secondaryBtnText}>重新识别</Text>
            </Pressable>
            <Pressable style={styles.btn} onPress={submitManual}>
              <Text style={styles.btnText}>确认输入</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const FRAME = 260;
const CORNER = 22;

const styles = StyleSheet.create({
  root: { flex: 1 },
  cameraWrap: { flex: 1, position: 'relative', backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  overlayTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '900', marginBottom: 6 },
  overlaySub: { color: 'rgba(248,250,252,0.75)', fontSize: 12, textAlign: 'center', marginBottom: 20 },
  frame: {
    width: FRAME,
    height: FRAME * 0.55,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: '#38bdf8',
  },
  cTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  cTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  cBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  cBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  flashBox: {
    position: 'absolute',
    bottom: 24,
    backgroundColor: 'rgba(34,197,94,0.92)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  flashText: { color: '#fff', fontWeight: '900', fontSize: 14, fontFamily: 'monospace' },
  torchBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(15,23,42,0.72)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  torchOn: { backgroundColor: 'rgba(37,99,235,0.85)' },
  torchText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  panel: {
    backgroundColor: '#0f172a',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    gap: 10,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'monospace',
    color: '#0f172a',
  },
  panelActions: { flexDirection: 'row', gap: 10 },
  btn: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '800' },
  secondaryBtn: {
    paddingHorizontal: 14,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  secondaryBtnText: { color: '#94a3b8', fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  hint: { color: '#94a3b8', fontSize: 14, textAlign: 'center' },
});
