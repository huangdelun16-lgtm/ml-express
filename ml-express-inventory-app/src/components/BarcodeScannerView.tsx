import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import {
  BARCODE_SCAN_TYPES,
  LABEL_BARCODE_SCAN_TYPES,
} from '../constants/barcodeScan';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { useTranslation } from '../i18n';

type Props = {
  onScan: (code: string) => void;
  title?: string;
  subtitle?: string;
  manualPlaceholder?: string;
  style?: StyleProp<ViewStyle>;
  active?: boolean;
  /** 仅相机区域，不显示底部手动输入条 */
  compact?: boolean;
  /** 优先识别 Code128（app 自打标签） */
  preferLabelBarcodes?: boolean;
};

const ZOOM_MIN = 0;
const ZOOM_MAX = 0.65;
const ZOOM_STEP = 0.08;

export default function BarcodeScannerView({
  onScan,
  title,
  subtitle,
  manualPlaceholder,
  style,
  active = true,
  compact = false,
  preferLabelBarcodes = true,
}: Props) {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [zoom, setZoom] = useState(0.12);
  const [manual, setManual] = useState('');
  const [flash, setFlash] = useState<string | null>(null);
  const [modernAvailable, setModernAvailable] = useState(false);
  const autoRequestedRef = useRef(false);
  const modernSubRef = useRef<{ remove: () => void } | null>(null);
  const { handleScan, reset, locked } = useBarcodeScanner((code) => {
    setFlash(code);
    onScan(code);
    setTimeout(() => setFlash(null), 900);
  });

  const scanTypes = preferLabelBarcodes ? LABEL_BARCODE_SCAN_TYPES : BARCODE_SCAN_TYPES;

  useEffect(() => {
    setModernAvailable(CameraView.isModernBarcodeScannerAvailable);
  }, []);

  useEffect(() => {
    if (!active || !permission || permission.granted) return;
    if (autoRequestedRef.current) return;
    autoRequestedRef.current = true;
    void requestPermission();
  }, [active, permission, requestPermission]);

  useEffect(() => {
    if (permission?.granted) {
      autoRequestedRef.current = false;
    }
  }, [permission?.granted]);

  useEffect(() => {
    if (!active) return;
    const sub = CameraView.onModernBarcodeScanned((event) => {
      handleScan(event.data);
    });
    modernSubRef.current = sub;
    return () => {
      sub.remove();
      modernSubRef.current = null;
    };
  }, [active, handleScan]);

  const submitManual = () => {
    const ok = handleScan(manual);
    if (ok) setManual('');
  };

  const onCameraBarcode = (result: BarcodeScanningResult) => {
    handleScan(result.data, result.raw);
  };

  const launchModernScanner = () => {
    if (!modernAvailable || locked) return;
    void CameraView.launchScanner({
      barcodeTypes: [...scanTypes],
      isHighlightingEnabled: true,
      isPinchToZoomEnabled: true,
      isGuidanceEnabled: true,
    });
  };

  const resolvedTitle = title ?? t.scanner.aimTitle;
  const resolvedSubtitle = subtitle ?? t.scanner.aimSubtitle;
  const resolvedManualPlaceholder = manualPlaceholder ?? t.scanner.manualPlaceholder;

  if (!permission) {
    return (
      <View style={[styles.center, style]}>
        <ActivityIndicator color="#38bdf8" />
        <Text style={styles.hint}>{t.scanner.checkingPermission}</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.center, style]}>
        <Text style={styles.permissionTitle}>{t.scanner.permissionTitle}</Text>
        <Text style={styles.hint}>{t.scanner.permissionBody}</Text>
        {permission.canAskAgain ? (
          <Pressable
            style={styles.permissionBtn}
            onPress={() => void requestPermission()}
          >
            <Text style={styles.permissionBtnText}>{t.scanner.continueBtn}</Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.permissionBtn}
            onPress={() => void Linking.openSettings()}
          >
            <Text style={styles.permissionBtnText}>{t.scanner.openSettingsBtn}</Text>
          </Pressable>
        )}
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
            zoom={zoom}
            autofocus="off"
            onBarcodeScanned={locked ? undefined : onCameraBarcode}
            barcodeScannerSettings={{ barcodeTypes: [...scanTypes] }}
          />
        ) : (
          <View style={styles.camera} />
        )}

        <View style={styles.overlay} pointerEvents="none">
          <Text style={styles.overlayTitle}>{resolvedTitle}</Text>
          <Text style={styles.overlaySub}>{resolvedSubtitle}</Text>
          <Text style={styles.overlayTip}>{t.scanner.labelScanTip}</Text>
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

        <View style={styles.topActions}>
          {modernAvailable ? (
            <Pressable style={styles.modernBtn} onPress={launchModernScanner} disabled={locked}>
              <Text style={styles.modernBtnText}>{t.scanner.modernScan}</Text>
            </Pressable>
          ) : null}
          <Pressable
            style={[styles.torchBtn, torch && styles.torchOn]}
            onPress={() => setTorch((v) => !v)}
          >
            <Text style={styles.torchText}>{torch ? t.scanner.torchOff : t.scanner.torchOn}</Text>
          </Pressable>
        </View>

        <View style={styles.zoomRow}>
          <Pressable
            style={styles.zoomBtn}
            onPress={() => setZoom((z) => Math.max(ZOOM_MIN, Math.round((z - ZOOM_STEP) * 100) / 100))}
          >
            <Text style={styles.zoomBtnText}>−</Text>
          </Pressable>
          <Text style={styles.zoomLabel}>{t.scanner.zoomHint}</Text>
          <Pressable
            style={styles.zoomBtn}
            onPress={() => setZoom((z) => Math.min(ZOOM_MAX, Math.round((z + ZOOM_STEP) * 100) / 100))}
          >
            <Text style={styles.zoomBtnText}>+</Text>
          </Pressable>
        </View>
      </View>

      {compact ? null : (
        <View style={styles.panel}>
          <TextInput
            style={styles.input}
            placeholder={resolvedManualPlaceholder}
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
              <Text style={styles.secondaryBtnText}>{t.scanner.rescan}</Text>
            </Pressable>
            <Pressable style={styles.primaryBtn} onPress={submitManual}>
              <Text style={styles.primaryBtnText}>{t.scanner.confirmInput}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const FRAME_W = 300;
const FRAME_H = 120;
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
  overlaySub: { color: 'rgba(248,250,252,0.75)', fontSize: 12, textAlign: 'center', marginBottom: 4 },
  overlayTip: {
    color: '#fcd34d',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 16,
    paddingHorizontal: 12,
  },
  frame: {
    width: FRAME_W,
    height: FRAME_H,
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
    bottom: 72,
    backgroundColor: 'rgba(34,197,94,0.92)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  flashText: { color: '#fff', fontWeight: '900', fontSize: 14, fontFamily: 'monospace' },
  topActions: {
    position: 'absolute',
    top: 12,
    right: 12,
    alignItems: 'flex-end',
    gap: 8,
  },
  modernBtn: {
    backgroundColor: 'rgba(37,99,235,0.92)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  modernBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  torchBtn: {
    backgroundColor: 'rgba(15,23,42,0.72)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  torchOn: { backgroundColor: 'rgba(37,99,235,0.85)' },
  torchText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  zoomRow: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(15,23,42,0.72)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  zoomBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(51,65,85,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBtnText: { color: '#fff', fontSize: 20, fontWeight: '900', lineHeight: 22 },
  zoomLabel: { color: '#e2e8f0', fontSize: 11, fontWeight: '700', minWidth: 72, textAlign: 'center' },
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
  primaryBtn: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '800' },
  secondaryBtn: {
    paddingHorizontal: 14,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  secondaryBtnText: { color: '#94a3b8', fontWeight: '700' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 14,
    backgroundColor: '#0f172a',
  },
  permissionTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  hint: { color: '#94a3b8', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  permissionBtn: {
    alignSelf: 'center',
    minWidth: 168,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  permissionBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
