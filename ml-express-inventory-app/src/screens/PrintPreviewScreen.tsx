import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import BluetoothScanModal from '../components/BluetoothScanModal';
import LabelLayoutControls from '../components/LabelLayoutControls';
import LabelLayoutHeightAdjustRow from '../components/LabelLayoutAdjustRow';
import LabelPrintPreviewEditor, {
  type LabelLayoutTarget,
} from '../components/LabelPrintPreviewEditor';
import { PRINT_PREVIEW_SAMPLE } from '../constants/printPreviewSample';
import {
  adjustLayoutElement,
  applyLayoutAlignment,
  buildDefaultCenteredLayout,
  mergeAndCenterLabelLayout,
  centerTextLabelElement,
  type LabelBarcodeLayoutConfig,
  type LabelLayoutAlignH,
  type LabelLayoutAlignV,
} from '../constants/labelBarcodeLayout';
import { XPRINTER_P203A } from '../constants/xprinterP203a';
import { useTranslation } from '../i18n';
import { getActiveBluetoothDevice } from '../services/bluetoothScanner';
import {
  clearLabelLayoutForPrinter,
  loadLabelLayoutForPrinter,
  saveLabelLayoutForPrinter,
} from '../services/labelLayoutStorage';
import { resolvePrintError, runBarcodeLabelPrint } from '../services/labelPrintFlow';
import type { ScannedBluetoothDevice } from '../utils/bluetoothDeviceMerge';

const MAX_COPIES = 9;

function layoutsEqual(a: LabelBarcodeLayoutConfig, b: LabelBarcodeLayoutConfig): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function previewLayoutContent() {
  return {
    expressNo: PRINT_PREVIEW_SAMPLE.inputBarcode,
    barcode: PRINT_PREVIEW_SAMPLE.barcode,
    inboundCode: PRINT_PREVIEW_SAMPLE.barcode,
  };
}

function defaultPreviewLayout() {
  return buildDefaultCenteredLayout(previewLayoutContent());
}

export default function PrintPreviewScreen() {
  const { t } = useTranslation();
  const [connectedPrinter, setConnectedPrinter] = useState<ScannedBluetoothDevice | null>(null);
  const [scanVisible, setScanVisible] = useState(false);
  const [copies, setCopies] = useState(1);
  const [printing, setPrinting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [layout, setLayout] = useState<LabelBarcodeLayoutConfig>(defaultPreviewLayout());
  const [savedLayout, setSavedLayout] = useState<LabelBarcodeLayoutConfig>(defaultPreviewLayout());
  const [selectedTarget, setSelectedTarget] = useState<LabelLayoutTarget>('expressNo');

  const dirty = useMemo(() => !layoutsEqual(layout, savedLayout), [layout, savedLayout]);

  const refreshPrinter = useCallback(async () => {
    const device = await getActiveBluetoothDevice();
    setConnectedPrinter(device);
    if (device?.id) {
      const stored = await loadLabelLayoutForPrinter(device.id);
      setLayout(stored);
      setSavedLayout(stored);
    } else {
      const centered = defaultPreviewLayout();
      setLayout(centered);
      setSavedLayout(centered);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshPrinter();
    }, [refreshPrinter]),
  );

  const adjust = (
    target: 'expressNo' | 'barcode' | 'inboundCode',
    axis: 'x' | 'y' | 'height',
    deltaDots: number,
  ) => {
    setLayout((current) => adjustLayoutElement(current, target, axis, deltaDots));
  };

  const moveSelected = (direction: 'up' | 'down' | 'left' | 'right', deltaDots: number) => {
    const axis = direction === 'left' || direction === 'right' ? 'x' : 'y';
    const signed =
      direction === 'left' || direction === 'up' ? -deltaDots : deltaDots;
    setLayout((current) => adjustLayoutElement(current, selectedTarget, axis, signed));
  };

  const alignSelected = (alignment: {
    horizontal?: LabelLayoutAlignH;
    vertical?: LabelLayoutAlignV;
  }) => {
    setLayout((current) =>
      applyLayoutAlignment(current, selectedTarget, alignment, previewLayoutContent()),
    );
  };

  const centerTextSelected = () => {
    setLayout((current) =>
      centerTextLabelElement(current, selectedTarget, previewLayoutContent()),
    );
  };

  const mergeAndCenterAll = () => {
    setLayout((current) => mergeAndCenterLabelLayout(current, previewLayoutContent()));
  };

  const handleSaveLayout = () => {
    if (!connectedPrinter?.id || saving) return;
    setSaving(true);
    void (async () => {
      try {
        await saveLabelLayoutForPrinter(connectedPrinter.id, layout);
        setSavedLayout(layout);
        Alert.alert(t.common.tip, t.settings.printPreviewLayoutSaved);
      } catch (error) {
        Alert.alert(t.settings.printFailed, resolvePrintError(t, error));
      } finally {
        setSaving(false);
      }
    })();
  };

  const handleResetLayout = () => {
    const centered = defaultPreviewLayout();
    if (!connectedPrinter?.id) {
      setLayout(centered);
      setSavedLayout(centered);
      return;
    }
    Alert.alert(t.settings.printPreviewResetLayout, t.settings.printPreviewResetConfirm, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.confirm,
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await clearLabelLayoutForPrinter(connectedPrinter.id);
            setLayout(centered);
            setSavedLayout(centered);
            Alert.alert(t.common.tip, t.settings.printPreviewLayoutReset);
          })();
        },
      },
    ]);
  };

  const handlePrint = () => {
    if (printing) return;
    if (!connectedPrinter) {
      Alert.alert(t.settings.printFailed, t.settings.scanPrinterNotConfigured);
      return;
    }

    setPrinting(true);
    void (async () => {
      try {
        await runBarcodeLabelPrint(PRINT_PREVIEW_SAMPLE, copies, layout);
        Alert.alert(t.settings.printSentTitle, t.settings.printSentBody);
      } catch (error) {
        Alert.alert(t.settings.printFailed, resolvePrintError(t, error));
      } finally {
        setPrinting(false);
      }
    })();
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.hint}>{t.settings.printPreviewSampleHint}</Text>
        {dirty ? <Text style={styles.unsavedHint}>{t.settings.printPreviewUnsavedHint}</Text> : null}

        <View style={styles.previewPanel}>
          <LabelPrintPreviewEditor
            barcode={PRINT_PREVIEW_SAMPLE.barcode}
            expressNo={PRINT_PREVIEW_SAMPLE.inputBarcode}
            layout={layout}
            selectedTarget={selectedTarget}
            onSelectTarget={setSelectedTarget}
            onLayoutChange={setLayout}
            widthMm={XPRINTER_P203A.defaultWidthMm}
            heightMm={XPRINTER_P203A.defaultHeightMm}
          />
        </View>

        <View style={styles.settingsCard}>
          <Text style={styles.sectionTitle}>{t.settings.printPreviewLayoutTitle}</Text>
          <Text style={styles.sectionHint}>{t.settings.printPreviewMovePadHint}</Text>
          <LabelLayoutControls
            selectedTarget={selectedTarget}
            disabled={printing || saving}
            onMove={moveSelected}
            onAlign={alignSelected}
            onCenterText={centerTextSelected}
            onMergeCenter={mergeAndCenterAll}
          />
          {selectedTarget === 'barcode' ? (
            <LabelLayoutHeightAdjustRow
              label={t.settings.printPreviewBarcodeHeight}
              valueDots={layout.barcode.height}
              disabled={printing || saving}
              onAdjust={(delta) => adjust('barcode', 'height', delta)}
            />
          ) : null}
          <View style={styles.coordSummary}>
            <Text style={styles.coordSummaryText}>
              {selectedTarget === 'barcode'
                ? `X ${layout.barcode.x} · Y ${layout.barcode.y} · H ${layout.barcode.height} dots`
                : `X ${layout[selectedTarget].x} · Y ${layout[selectedTarget].y} dots`}
            </Text>
          </View>

          <View style={styles.layoutActions}>
            <Pressable
              style={[
                styles.saveLayoutBtn,
                (!connectedPrinter || saving || !dirty) && styles.btnDisabled,
              ]}
              onPress={handleSaveLayout}
              disabled={!connectedPrinter || saving || !dirty}
            >
              <Text style={styles.saveLayoutBtnText}>
                {saving ? t.common.processing : t.settings.printPreviewSaveLayout}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.resetLayoutBtn, (!connectedPrinter || saving) && styles.btnDisabled]}
              onPress={handleResetLayout}
              disabled={!connectedPrinter || saving}
            >
              <Text style={styles.resetLayoutBtnText}>{t.settings.printPreviewResetLayout}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.settingsCard}>
          <Pressable style={styles.settingRow} onPress={() => setScanVisible(true)}>
            <Text style={styles.settingLabel}>{t.settings.printPreviewDeviceStatus}</Text>
            <View style={styles.settingValueWrap}>
              <Text
                style={[
                  styles.settingValue,
                  connectedPrinter ? styles.settingValueConnected : styles.settingValueMuted,
                ]}
                numberOfLines={1}
              >
                {connectedPrinter
                  ? connectedPrinter.name
                  : t.settings.printPreviewNotConnected}
              </Text>
              <Text style={styles.chevron}>›</Text>
            </View>
          </Pressable>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>{t.settings.printPreviewCopies}</Text>
            <View style={styles.stepper}>
              <Pressable
                style={[styles.stepBtn, copies <= 1 && styles.stepBtnDisabled]}
                onPress={() => setCopies((value) => Math.max(1, value - 1))}
                disabled={copies <= 1 || printing}
              >
                <Text style={styles.stepBtnText}>−</Text>
              </Pressable>
              <Text style={styles.stepValue}>{copies}</Text>
              <Pressable
                style={[styles.stepBtn, styles.stepBtnPrimary, copies >= MAX_COPIES && styles.stepBtnDisabled]}
                onPress={() => setCopies((value) => Math.min(MAX_COPIES, value + 1))}
                disabled={copies >= MAX_COPIES || printing}
              >
                <Text style={[styles.stepBtnText, styles.stepBtnPrimaryText]}>+</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.printBtn, printing && styles.printBtnDisabled]}
          onPress={handlePrint}
          disabled={printing}
        >
          {printing ? (
            <View style={styles.printBtnInner}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.printBtnText}>{t.settings.printWindowSending}</Text>
            </View>
          ) : (
            <Text style={styles.printBtnText}>{t.settings.printWindowAction}</Text>
          )}
        </Pressable>
      </View>

      <BluetoothScanModal
        visible={scanVisible}
        onClose={() => setScanVisible(false)}
        onConnectionChange={() => {
          void refreshPrinter();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#020617' },
  content: { padding: 16, paddingBottom: 24 },
  hint: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  unsavedHint: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  previewPanel: {
    backgroundColor: '#cbd5e1',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#94a3b8',
    alignItems: 'center',
  },
  settingsCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '900',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 2,
  },
  sectionHint: {
    color: '#64748b',
    fontSize: 10,
    lineHeight: 15,
    paddingHorizontal: 14,
    paddingBottom: 4,
    textAlign: 'center',
  },
  coordSummary: {
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  coordSummaryText: {
    color: '#64748b',
    fontSize: 11,
    fontFamily: 'monospace',
    textAlign: 'center',
  },
  layoutActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  saveLayoutBtn: {
    flex: 1,
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveLayoutBtnText: { color: '#ecfdf5', fontWeight: '900', fontSize: 14 },
  resetLayoutBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  resetLayoutBtnText: { color: '#cbd5e1', fontWeight: '800', fontSize: 14 },
  btnDisabled: { opacity: 0.45 },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  settingLabel: { color: '#e2e8f0', fontSize: 15, fontWeight: '700', flex: 1 },
  settingValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '52%',
  },
  settingValue: { fontSize: 14, fontWeight: '800', flexShrink: 1, textAlign: 'right' },
  settingValueConnected: { color: '#6ee7b7' },
  settingValueMuted: { color: '#64748b' },
  chevron: { color: '#64748b', fontSize: 20, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#334155', marginHorizontal: 16 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#475569',
  },
  stepBtnPrimary: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  stepBtnDisabled: { opacity: 0.45 },
  stepBtnText: { color: '#e2e8f0', fontSize: 20, fontWeight: '900', lineHeight: 22 },
  stepBtnPrimaryText: { color: '#fff' },
  stepValue: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '900',
    minWidth: 24,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    backgroundColor: '#020617',
  },
  printBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  printBtnDisabled: { opacity: 0.65 },
  printBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  printBtnText: { color: '#fff', fontSize: 17, fontWeight: '900' },
});
