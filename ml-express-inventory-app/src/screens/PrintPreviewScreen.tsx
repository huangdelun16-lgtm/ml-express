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
import { feedbackService } from '../services/FeedbackService';
import LabelPaperSpecEditor from '../components/LabelPaperSpecEditor';
import LabelPreviewToolbar from '../components/LabelPreviewToolbar';
import LabelLayoutSizeEditor from '../components/LabelLayoutSizeEditor';
import LabelPrintPreviewEditor from '../components/LabelPrintPreviewEditor';
import { PRINT_PREVIEW_PACK_SAMPLE, PRINT_PREVIEW_SAMPLE, type PrintPreviewMode } from '../constants/printPreviewSample';
import {
  adjustGroupTextScale,
  adjustLayoutElement,
  alignLabelGroup,
  barcodeMaxNarrow,
  barcodeMinNarrow,
  canAdjustElementSize,
  canAdjustGroupTextScale,
  clampLabelBarcodeLayout,
  getBarcodePrintMetrics,
  formatGroupTextScale,
  getGroupTextScaleMul,
  mergeAndCenterLabelLayout,
  fitAndCenterLabelLayout,
  moveLabelGroup,
  TSPL_TEXT_LINE_HEIGHT_DOTS,
  type LabelBarcodeLayoutConfig,
  type LabelLayoutAlignH,
  type LabelLayoutAlignV,
} from '../constants/labelBarcodeLayout';
import {
  DEFAULT_LABEL_PAPER,
  paperSpecsEqual,
  type LabelPaperSpec,
} from '../constants/labelPaperSpec';
import { useTranslation } from '../i18n';
import { getActiveBluetoothDevice } from '../services/bluetoothScanner';
import {
  clearLabelPrinterSettings,
  defaultExpressLayout,
  defaultPackageLayout,
  loadLabelPrinterSettings,
  saveLabelPrinterSettings,
  type LabelPrinterSettings,
} from '../services/labelLayoutStorage';
import { resolvePrintError, printBarcodeLabelOrPick } from '../services/labelPrintFlow';
import type { ScannedBluetoothDevice } from '../utils/bluetoothDeviceMerge';

const MAX_COPIES = 9;

function expressPreviewLayoutContent() {
  return {
    expressNo: PRINT_PREVIEW_SAMPLE.inputBarcode,
    barcode: PRINT_PREVIEW_SAMPLE.barcode,
    inboundCode: PRINT_PREVIEW_SAMPLE.barcode,
  };
}

function packagePreviewLayoutContent() {
  return {
    barcode: PRINT_PREVIEW_PACK_SAMPLE.barcode,
    inboundCode: PRINT_PREVIEW_PACK_SAMPLE.barcode,
  };
}

function previewLayoutContent(mode: PrintPreviewMode) {
  return mode === 'express' ? expressPreviewLayoutContent() : packagePreviewLayoutContent();
}

function defaultPreviewSettings(paper: LabelPaperSpec = DEFAULT_LABEL_PAPER): LabelPrinterSettings {
  return {
    version: 2,
    paper,
    expressLayout: defaultExpressLayout(paper),
    packageLayout: defaultPackageLayout(paper),
  };
}

export default function PrintPreviewScreen() {
  const { t } = useTranslation();
  const [connectedPrinter, setConnectedPrinter] = useState<ScannedBluetoothDevice | null>(null);
  const [scanVisible, setScanVisible] = useState(false);
  const [copies, setCopies] = useState(1);
  const [printing, setPrinting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [printMode, setPrintMode] = useState<PrintPreviewMode>('express');
  const [paper, setPaper] = useState<LabelPaperSpec>(DEFAULT_LABEL_PAPER);
  const [savedPaper, setSavedPaper] = useState<LabelPaperSpec>(DEFAULT_LABEL_PAPER);
  const [expressLayout, setExpressLayout] = useState<LabelBarcodeLayoutConfig>(
    defaultPreviewSettings().expressLayout,
  );
  const [savedExpressLayout, setSavedExpressLayout] = useState<LabelBarcodeLayoutConfig>(
    defaultPreviewSettings().expressLayout,
  );
  const [packageLayout, setPackageLayout] = useState<LabelBarcodeLayoutConfig>(
    defaultPreviewSettings().packageLayout,
  );
  const [savedPackageLayout, setSavedPackageLayout] = useState<LabelBarcodeLayoutConfig>(
    defaultPreviewSettings().packageLayout,
  );

  const layout = printMode === 'express' ? expressLayout : packageLayout;
  const setLayout = printMode === 'express' ? setExpressLayout : setPackageLayout;
  const previewSample = printMode === 'express' ? PRINT_PREVIEW_SAMPLE : PRINT_PREVIEW_PACK_SAMPLE;

  const dirty = useMemo(
    () =>
      !paperSpecsEqual(paper, savedPaper) ||
      JSON.stringify(expressLayout) !== JSON.stringify(savedExpressLayout) ||
      JSON.stringify(packageLayout) !== JSON.stringify(savedPackageLayout),
    [expressLayout, packageLayout, paper, savedExpressLayout, savedPackageLayout, savedPaper],
  );

  const refreshPrinter = useCallback(async () => {
    const device = await getActiveBluetoothDevice();
    setConnectedPrinter(device);
    if (device?.id) {
      const stored = await loadLabelPrinterSettings(device.id);
      setPaper(stored.paper);
      setSavedPaper(stored.paper);
      setExpressLayout(stored.expressLayout);
      setSavedExpressLayout(stored.expressLayout);
      setPackageLayout(stored.packageLayout);
      setSavedPackageLayout(stored.packageLayout);
    } else {
      const defaults = defaultPreviewSettings();
      setPaper(defaults.paper);
      setSavedPaper(defaults.paper);
      setExpressLayout(defaults.expressLayout);
      setSavedExpressLayout(defaults.expressLayout);
      setPackageLayout(defaults.packageLayout);
      setSavedPackageLayout(defaults.packageLayout);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshPrinter();
    }, [refreshPrinter]),
  );

  const layoutContent = previewLayoutContent(printMode);
  const barcodeMetrics = getBarcodePrintMetrics(layout, layoutContent, paper.widthMm);
  const textScaleMul = getGroupTextScaleMul(layout, layoutContent, paper.widthMm);
  const barcodeWidthLocked =
    barcodeMaxNarrow(layoutContent, paper.widthMm) <= barcodeMinNarrow();

  const adjustBarcode = (
    axis: 'width' | 'height',
    direction: 1 | -1,
  ) => {
    const delta =
      axis === 'width'
        ? direction
        : direction * TSPL_TEXT_LINE_HEIGHT_DOTS;
    setLayout((current) =>
      adjustLayoutElement(
        current,
        'barcode',
        axis,
        delta,
        layoutContent,
        paper.widthMm,
      ),
    );
  };

  const adjustTextScale = (direction: 1 | -1) => {
    setLayout((current) =>
      adjustGroupTextScale(
        current,
        direction,
        layoutContent,
        paper.widthMm,
        paper.heightMm,
      ),
    );
  };

  const moveGroup = (direction: 'up' | 'down' | 'left' | 'right', deltaDots: number) => {
    const deltaX =
      direction === 'left' ? -deltaDots : direction === 'right' ? deltaDots : 0;
    const deltaY =
      direction === 'up' ? -deltaDots : direction === 'down' ? deltaDots : 0;
    setLayout((current) =>
      moveLabelGroup(
        current,
        deltaX,
        deltaY,
        layoutContent,
        paper.widthMm,
        paper.heightMm,
      ),
    );
  };

  const alignGroup = (alignment: {
    horizontal?: LabelLayoutAlignH;
    vertical?: LabelLayoutAlignV;
  }) => {
    setLayout((current) =>
      alignLabelGroup(
        current,
        alignment,
        layoutContent,
        paper.widthMm,
        paper.heightMm,
      ),
    );
  };

  const mergeAndCenterAll = () => {
    setLayout((current) =>
      mergeAndCenterLabelLayout(
        current,
        previewLayoutContent(printMode),
        paper.widthMm,
        paper.heightMm,
      ),
    );
  };

  const handlePrintModeChange = (mode: PrintPreviewMode) => {
    setPrintMode(mode);
  };

  const applyPaperSpec = (nextPaper: LabelPaperSpec) => {
    setPaper(nextPaper);
    const recenter = (
      current: LabelBarcodeLayoutConfig,
      content: ReturnType<typeof previewLayoutContent>,
    ) =>
      fitAndCenterLabelLayout(
        clampLabelBarcodeLayout(current, nextPaper.widthMm, nextPaper.heightMm),
        content,
        nextPaper.widthMm,
        nextPaper.heightMm,
      );
    setExpressLayout((current) => recenter(current, expressPreviewLayoutContent()));
    setPackageLayout((current) => recenter(current, packagePreviewLayoutContent()));
  };

  const handleSaveLayout = () => {
    if (!connectedPrinter?.id || saving) return;
    setSaving(true);
    void (async () => {
      try {
        await saveLabelPrinterSettings(connectedPrinter.id, {
          version: 2,
          paper,
          expressLayout,
          packageLayout,
        });
        setSavedPaper(paper);
        setSavedExpressLayout(expressLayout);
        setSavedPackageLayout(packageLayout);
        feedbackService.notify(t.common.tip, t.settings.printPreviewLayoutSaved);
      } catch (error) {
        feedbackService.notify(t.settings.printFailed, resolvePrintError(t, error));
      } finally {
        setSaving(false);
      }
    })();
  };

  const handleResetLayout = () => {
    const defaults = defaultPreviewSettings();
    const applyDefaults = () => {
      setPaper(defaults.paper);
      setSavedPaper(defaults.paper);
      setExpressLayout(defaults.expressLayout);
      setSavedExpressLayout(defaults.expressLayout);
      setPackageLayout(defaults.packageLayout);
      setSavedPackageLayout(defaults.packageLayout);
    };
    if (!connectedPrinter?.id) {
      applyDefaults();
      return;
    }
    Alert.alert(t.settings.printPreviewResetLayout, t.settings.printPreviewResetConfirm, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.confirm,
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await clearLabelPrinterSettings(connectedPrinter.id);
            applyDefaults();
            feedbackService.notify(t.common.tip, t.settings.printPreviewLayoutReset);
          })();
        },
      },
    ]);
  };

  const handlePrint = () => {
    if (printing) return;
    setPrinting(true);
    void (async () => {
      try {
        const printed = await printBarcodeLabelOrPick(previewSample, copies, layout, paper);
        if (printed) {
          await refreshPrinter();
          feedbackService.notify(t.settings.printSentTitle, t.settings.printSentBody);
        }
      } catch (error) {
        feedbackService.notify(t.settings.printFailed, resolvePrintError(t, error));
      } finally {
        setPrinting(false);
      }
    })();
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {dirty ? <Text style={styles.unsavedHint}>{t.settings.printPreviewUnsavedHint}</Text> : null}

        <View style={styles.previewPanel}>
          <LabelPreviewToolbar
            printMode={printMode}
            disabled={printing || saving}
            onPrintModeChange={handlePrintModeChange}
            onMove={moveGroup}
            onAlign={alignGroup}
          />
          <LabelPrintPreviewEditor
            barcode={previewSample.barcode}
            expressNo={printMode === 'express' ? previewSample.inputBarcode : undefined}
            layout={layout}
            onLayoutChange={setLayout}
            widthMm={paper.widthMm}
            heightMm={paper.heightMm}
          />

          <View style={styles.previewFooter}>
            <Pressable
              style={[styles.mergeCenterBtn, (printing || saving) && styles.btnDisabled]}
              onPress={mergeAndCenterAll}
              disabled={printing || saving}
            >
              <Text style={styles.mergeCenterBtnText}>{t.settings.printPreviewMergeCenter}</Text>
            </Pressable>

            <LabelLayoutSizeEditor
              barcodeWidthLabel={t.settings.printPreviewBarcodeNarrow}
              barcodeHeightLabel={t.settings.printPreviewBarcodeHeightDots}
              textScaleLabel={t.settings.printPreviewTextScale}
              barcodeWidthDisplay={`narrow ${barcodeMetrics.narrow}`}
              barcodeHeightDisplay={`${barcodeMetrics.height} dots`}
              textScaleDisplay={formatGroupTextScale(textScaleMul)}
              canDecreaseBarcodeWidth={canAdjustElementSize(
                layout,
                'barcode',
                'width',
                -1,
                layoutContent,
                paper.widthMm,
              )}
              canIncreaseBarcodeWidth={canAdjustElementSize(
                layout,
                'barcode',
                'width',
                1,
                layoutContent,
                paper.widthMm,
              )}
              canDecreaseBarcodeHeight={canAdjustElementSize(
                layout,
                'barcode',
                'height',
                -1,
                layoutContent,
                paper.widthMm,
              )}
              canIncreaseBarcodeHeight={canAdjustElementSize(
                layout,
                'barcode',
                'height',
                1,
                layoutContent,
                paper.widthMm,
              )}
              canDecreaseTextScale={canAdjustGroupTextScale(
                layout,
                -1,
                layoutContent,
                paper.widthMm,
              )}
              canIncreaseTextScale={canAdjustGroupTextScale(
                layout,
                1,
                layoutContent,
                paper.widthMm,
              )}
              disabled={printing || saving}
              tone="light"
              onAdjustBarcodeWidth={(direction) => adjustBarcode('width', direction)}
              onAdjustBarcodeHeight={(direction) => adjustBarcode('height', direction)}
              onAdjustTextScale={adjustTextScale}
            />

            {barcodeWidthLocked ? (
              <Text style={styles.widthLockedHint}>{t.settings.printPreviewBarcodeWidthLocked}</Text>
            ) : null}

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
        </View>

        <View style={styles.settingsCard}>
          <Text style={styles.sectionTitle}>{t.settings.printPreviewPaperTitle}</Text>
          <LabelPaperSpecEditor
            paper={paper}
            disabled={printing || saving}
            onChange={applyPaperSpec}
          />
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
        onConnected={() => {
          setScanVisible(false);
          void refreshPrinter();
        }}
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
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#94a3b8',
    alignItems: 'stretch',
  },
  previewFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#94a3b8',
    gap: 10,
  },
  mergeCenterBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(2,132,199,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(3,105,161,0.45)',
  },
  mergeCenterBtnText: {
    color: '#0c4a6e',
    fontSize: 11,
    fontWeight: '900',
  },
  widthLockedHint: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
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
  layoutActions: {
    flexDirection: 'row',
    gap: 8,
  },
  saveLayoutBtn: {
    flex: 1,
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveLayoutBtnText: { color: '#ecfdf5', fontWeight: '900', fontSize: 13 },
  resetLayoutBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
    backgroundColor: 'rgba(15,23,42,0.06)',
  },
  resetLayoutBtnText: { color: '#334155', fontWeight: '800', fontSize: 13 },
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
