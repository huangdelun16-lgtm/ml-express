import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { isBarcodeInsideFrame, scanFrameRect, type ScanFrame } from '../utils/barcodeScan';

type Props = {
  onScan: (code: string) => void;
  subtitle?: string;
  manualPlaceholder?: string;
  style?: StyleProp<ViewStyle>;
  active?: boolean;
  /** 仅相机区域，不显示底部手动输入条 */
  compact?: boolean;
  /** 优先识别 Code128（app 自打标签） */
  preferLabelBarcodes?: boolean;
  /** 查询进行中：预览还在，但不再收下一条码 */
  suspended?: boolean;
};

const ZOOM_MIN = 0;
const ZOOM_MAX = 0.65;
const ZOOM_STEP = 0.08;
const ZOOM_DEFAULT = 0.16;
const FRAME_H = 136;
const MASK_TOP_FLEX = 0.8;
const MASK_BOTTOM_FLEX = 1.25;

export default function BarcodeScannerView({
  onScan,
  subtitle,
  manualPlaceholder,
  style,
  active = true,
  compact = false,
  preferLabelBarcodes = true,
  suspended = false,
}: Props) {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);
  const [manual, setManual] = useState('');
  const [flash, setFlash] = useState<string | null>(null);
  const [modernAvailable, setModernAvailable] = useState(false);
  const [frame, setFrame] = useState<ScanFrame | null>(null);
  const frameRef = useRef<ScanFrame | null>(null);
  const layoutRef = useRef({ width: 0, height: 0 });
  const autoRequestedRef = useRef(false);
  const modernSubRef = useRef<{ remove: () => void } | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const onConfirmed = useCallback((code: string) => {
    setFlash(code);
    onScanRef.current(code);
    setTimeout(() => setFlash(null), 900);
  }, []);
  const { handleScan, reset, locked } = useBarcodeScanner(onConfirmed);

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
    if (!active || suspended) return;
    const sub = CameraView.onModernBarcodeScanned((event) => {
      handleScan(event.data);
    });
    modernSubRef.current = sub;
    return () => {
      sub.remove();
      modernSubRef.current = null;
    };
  }, [active, handleScan, suspended]);

  const submitManual = () => {
    if (suspended) return;
    const ok = handleScan(manual, null, true);
    if (ok) setManual('');
  };

  const onCameraLayout = (width: number, height: number) => {
    if (layoutRef.current.width === width && layoutRef.current.height === height) return;
    layoutRef.current = { width, height };
    const frameWidth = Math.max(220, Math.min(width - 28, 340));
    const next = scanFrameRect(width, height, frameWidth, FRAME_H, MASK_TOP_FLEX, MASK_BOTTOM_FLEX);
    frameRef.current = next;
    setFrame(next);
  };

  const onCameraBarcode = (result: BarcodeScanningResult) => {
    if (!isBarcodeInsideFrame(result.bounds, frameRef.current)) return;
    handleScan(result.data, result.raw);
  };

  const launchModernScanner = () => {
    if (!modernAvailable || locked || suspended) return;
    void CameraView.launchScanner({
      barcodeTypes: [...scanTypes],
      isHighlightingEnabled: true,
      isPinchToZoomEnabled: true,
      isGuidanceEnabled: true,
    });
  };

  const resolvedHint = subtitle ?? t.scanner.labelScanTip;
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
      <View
        style={styles.cameraWrap}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          onCameraLayout(width, height);
        }}
      >
        {active ? (
          <CameraView
            style={styles.camera}
            facing="back"
            enableTorch={torch}
            zoom={zoom}
            // expo 的 off 表示需要时持续对焦，手持扫面单时比锁死后对焦更稳
            autofocus="off"
            onBarcodeScanned={locked || suspended ? undefined : onCameraBarcode}
            barcodeScannerSettings={{ barcodeTypes: [...scanTypes] }}
          />
        ) : (
          <View style={styles.camera} />
        )}

        <View style={styles.overlay} pointerEvents="none">
          <View style={styles.maskTop} />
          <View style={styles.band}>
            <View style={styles.maskSide} />
            <View style={[styles.frame, { width: frame?.width ?? 280, height: FRAME_H }]}>
              <View style={[styles.corner, styles.cTL]} />
              <View style={[styles.corner, styles.cTR]} />
              <View style={[styles.corner, styles.cBL]} />
              <View style={[styles.corner, styles.cBR]} />
              <View style={styles.scanLine} />
            </View>
            <View style={styles.maskSide} />
          </View>
          <View style={styles.maskBottom}>
            <View style={styles.hintChip}>
              <Text style={styles.hintText} numberOfLines={2}>
                {resolvedHint}
              </Text>
            </View>
          </View>
          {flash ? (
            <View style={styles.flashBox}>
              <Text style={styles.flashText} numberOfLines={1}>
                {flash}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.topActions}>
          {modernAvailable ? (
            <Pressable style={styles.modernBtn} onPress={launchModernScanner} disabled={locked || suspended}>
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
          <View style={styles.entryRow}>
            <TextInput
              style={styles.input}
              placeholder={resolvedManualPlaceholder}
              placeholderTextColor="#94a3b8"
              value={manual}
              onChangeText={setManual}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={submitManual}
              editable={!suspended}
            />
            <Pressable
              style={[styles.primaryBtn, suspended && styles.primaryBtnDisabled]}
              onPress={submitManual}
              disabled={suspended}
            >
              <Text style={styles.primaryBtnText}>{t.scanner.confirmInput}</Text>
            </Pressable>
          </View>
          <Pressable onPress={reset} hitSlop={8} disabled={suspended}>
            <Text style={styles.rescanLink}>{t.scanner.rescan}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const CORNER = 26;

const styles = StyleSheet.create({
  root: { flex: 1 },
  cameraWrap: { flex: 1, position: 'relative', backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  maskTop: { flex: MASK_TOP_FLEX, backgroundColor: 'rgba(2, 6, 23, 0.55)' },
  maskBottom: {
    flex: MASK_BOTTOM_FLEX,
    backgroundColor: 'rgba(2, 6, 23, 0.55)',
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 62,
  },
  band: { flexDirection: 'row' },
  maskSide: { flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.55)' },
  hintChip: {
    maxWidth: '88%',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.28)',
  },
  hintText: { color: '#e2e8f0', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  frame: {
    position: 'relative',
  },
  scanLine: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: '48%',
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(56, 189, 248, 0.9)',
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: '#7dd3fc',
  },
  cTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  cTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  cBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  cBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  flashBox: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    maxWidth: '70%',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(125, 211, 252, 0.45)',
  },
  flashText: { color: '#fde68a', fontWeight: '800', fontSize: 13, fontFamily: 'monospace' },
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
    bottom: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(15,23,42,0.82)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'monospace',
    color: '#0f172a',
  },
  primaryBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  rescanLink: { color: '#7dd3fc', fontSize: 12, fontWeight: '700', textAlign: 'right' },
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
