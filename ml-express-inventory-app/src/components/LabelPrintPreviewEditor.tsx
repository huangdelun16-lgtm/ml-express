import React, { useMemo, useRef } from 'react';
import {
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import BarcodeImage from './BarcodeImage';
import {
  dotsToMm,
  formatLayoutMm,
  getEffectiveElementWidthDots,
  getBarcodePrintMetrics,
  labelHeightDots,
  labelWidthDots,
  normalizeBarcodeScale,
  normalizeTextScale,
  setLayoutElementPosition,
  textElementSizeDots,
  TSPL_TEXT_LINE_HEIGHT_DOTS,
  type LabelBarcodeLayoutConfig,
  type LabelLayoutContentSizes,
} from '../constants/labelBarcodeLayout';
import { XPRINTER_P203A } from '../constants/xprinterP203a';
import { useTranslation } from '../i18n';

export type LabelLayoutTarget = 'expressNo' | 'barcode' | 'inboundCode';

type Props = {
  barcode: string;
  expressNo?: string;
  layout: LabelBarcodeLayoutConfig;
  selectedTarget: LabelLayoutTarget;
  onSelectTarget: (target: LabelLayoutTarget) => void;
  onLayoutChange: (layout: LabelBarcodeLayoutConfig) => void;
  editable?: boolean;
  widthMm?: number;
  heightMm?: number;
  previewWidth?: number;
};

const TARGET_COLORS: Record<LabelLayoutTarget, string> = {
  expressNo: '#2563eb',
  barcode: '#059669',
  inboundCode: '#d97706',
};

function snapDots(value: number): number {
  return Math.round(value);
}

export default function LabelPrintPreviewEditor({
  barcode,
  expressNo,
  layout,
  selectedTarget,
  onSelectTarget,
  onLayoutChange,
  editable = true,
  widthMm = XPRINTER_P203A.defaultWidthMm,
  heightMm = XPRINTER_P203A.defaultHeightMm,
  previewWidth = 300,
}: Props) {
  const { t, fmt } = useTranslation();
  const previewHeight = Math.round(previewWidth * (heightMm / widthMm));
  const express = expressNo?.trim() ?? '';
  const widthDots = labelWidthDots(widthMm);
  const scale = previewWidth / widthDots;
  const barcodeMetrics = getBarcodePrintMetrics(layout);
  const barcodePreviewHeight = Math.max(20, Math.round(barcodeMetrics.height * scale));

  const layoutRef = useRef(layout);
  const onLayoutChangeRef = useRef(onLayoutChange);
  const onSelectTargetRef = useRef(onSelectTarget);
  const dragStartRef = useRef({ x: 0, y: 0, height: 0, baseHeight: 96, scale: 1 });

  layoutRef.current = layout;
  onLayoutChangeRef.current = onLayoutChange;
  onSelectTargetRef.current = onSelectTarget;

  const toPx = (dots: number) => dots * scale;
  const toDots = (px: number) => snapDots(px / scale);

  const gridLines = useMemo(() => {
    const lines: React.ReactNode[] = [];
    for (let mm = 10; mm < widthMm; mm += 10) {
      const x = toPx(labelWidthDots(mm));
      lines.push(
        <View
          key={`v-${mm}`}
          style={[styles.gridLineV, { left: x, height: previewHeight }]}
        />,
      );
    }
    for (let mm = 10; mm < heightMm; mm += 10) {
      const y = toPx(labelHeightDots(mm));
      lines.push(
        <View
          key={`h-${mm}`}
          style={[styles.gridLineH, { top: y, width: previewWidth }]}
        />,
      );
    }
    return lines;
  }, [heightMm, previewHeight, previewWidth, scale, widthMm]);

  const makeDragResponder = (target: LabelLayoutTarget) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => editable,
      onMoveShouldSetPanResponder: () => editable,
      onPanResponderGrant: () => {
        onSelectTargetRef.current(target);
        const current = layoutRef.current;
        if (target === 'barcode') {
          const metrics = getBarcodePrintMetrics(current);
          dragStartRef.current = {
            x: current.barcode.x,
            y: current.barcode.y,
            height: metrics.height,
            baseHeight: current.barcode.height,
            scale: metrics.scale,
          };
        } else {
          dragStartRef.current = {
            x: current[target].x,
            y: current[target].y,
            height: 0,
            baseHeight: 0,
            scale: 1,
          };
        }
      },
      onPanResponderMove: (_, gesture) => {
        const start = dragStartRef.current;
        const nextX = snapDots(start.x + toDots(gesture.dx));
        const nextY = snapDots(start.y + toDots(gesture.dy));
        onLayoutChangeRef.current(
          setLayoutElementPosition(layoutRef.current, target, { x: nextX, y: nextY }),
        );
      },
    });

  const barcodeResize = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => editable,
        onMoveShouldSetPanResponder: () => editable,
        onPanResponderGrant: () => {
          onSelectTargetRef.current('barcode');
          const current = layoutRef.current;
          const metrics = getBarcodePrintMetrics(current);
          dragStartRef.current = {
            x: current.barcode.x,
            y: current.barcode.y,
            height: metrics.height,
            baseHeight: current.barcode.height,
            scale: metrics.scale,
          };
        },
        onPanResponderMove: (_, gesture) => {
          const start = dragStartRef.current;
          const nextPrintHeight = snapDots(start.height + toDots(gesture.dy));
          const nextScale = normalizeBarcodeScale(Math.max(1, Math.round(nextPrintHeight / start.baseHeight)));
          onLayoutChangeRef.current(
            setLayoutElementPosition(layoutRef.current, 'barcode', { scale: nextScale }),
          );
        },
      }),
    [editable],
  );

  const expressDrag = useMemo(() => makeDragResponder('expressNo'), [editable]);
  const barcodeDrag = useMemo(() => makeDragResponder('barcode'), [editable]);
  const inboundDrag = useMemo(() => makeDragResponder('inboundCode'), [editable]);

  const layoutContent: LabelLayoutContentSizes = {
    expressNo: express,
    barcode,
    inboundCode: barcode,
  };
  const expressWidthDots = getEffectiveElementWidthDots(layout, 'expressNo', layoutContent);
  const barcodeWidthDots = getEffectiveElementWidthDots(layout, 'barcode', layoutContent);
  const inboundWidthDots = getEffectiveElementWidthDots(layout, 'inboundCode', layoutContent);

  const expressSized = textElementSizeDots(layout, 'expressNo', layoutContent);
  const inboundSized = textElementSizeDots(layout, 'inboundCode', layoutContent);

  const selectedPos = layout[selectedTarget];
  const selectedMm =
    selectedTarget === 'barcode'
      ? `X ${formatLayoutMm(layout.barcode.x)} · Y ${formatLayoutMm(layout.barcode.y)} · ${barcodeMetrics.scale}× · H ${formatLayoutMm(barcodeMetrics.height)}`
      : `X ${formatLayoutMm(selectedPos.x)} · Y ${formatLayoutMm(selectedPos.y)} · ${normalizeTextScale(layout[selectedTarget === 'expressNo' ? 'expressNo' : 'inboundCode'].scale)}×`;

  const renderHandle = (
    target: LabelLayoutTarget,
    children: React.ReactNode,
    boxStyle: {
      left: number;
      top: number;
      width: number;
      height: number;
    },
    panHandlers: ReturnType<typeof PanResponder.create>['panHandlers'],
    extra?: React.ReactNode,
  ) => {
    const active = selectedTarget === target;
    const color = TARGET_COLORS[target];
    return (
      <View
        {...panHandlers}
        style={[
          styles.elementBox,
          {
            left: boxStyle.left,
            top: boxStyle.top,
            width: boxStyle.width,
            height: boxStyle.height,
            borderColor: active ? color : 'rgba(148,163,184,0.35)',
            backgroundColor: active ? `${color}18` : 'transparent',
          },
        ]}
      >
        {active ? (
          <View style={[styles.elementTag, { backgroundColor: color }]}>
            <Text style={styles.elementTagText}>
              {target === 'expressNo'
                ? t.settings.printPreviewExpressNo
                : target === 'barcode'
                  ? t.settings.printPreviewBarcode
                  : t.settings.printPreviewInboundCode}
            </Text>
          </View>
        ) : null}
        {children}
        {extra}
      </View>
    );
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.previewStage}>
        <Text style={styles.widthRuler}>{fmt(t.settings.printPreviewWidth, { mm: widthMm.toFixed(1) })}</Text>
        <View style={styles.canvasShadow}>
          <View style={[styles.labelCanvas, { width: previewWidth, height: previewHeight }]}>
            <View style={styles.gridLayer} pointerEvents="none">
              {gridLines}
            </View>

            {express
              ? renderHandle(
                  'expressNo',
                  <Text
                    style={[styles.expressText, { fontSize: 11 * expressSized.scale }]}
                    numberOfLines={1}
                  >
                    {express}
                  </Text>,
                  {
                    left: toPx(layout.expressNo.x),
                    top: toPx(layout.expressNo.y),
                    width: Math.max(24, toPx(expressWidthDots)),
                    height: Math.max(18, toPx(expressSized.height)),
                  },
                  expressDrag.panHandlers,
                )
              : null}

            {renderHandle(
              'barcode',
              <BarcodeImage
                code={barcode}
                height={barcodePreviewHeight}
                maxWidth={Math.max(24, toPx(barcodeWidthDots))}
                showCodeText={false}
              />,
              {
                left: toPx(layout.barcode.x),
                top: toPx(layout.barcode.y),
                width: Math.max(24, toPx(barcodeWidthDots)),
                height: barcodePreviewHeight + 10,
              },
              barcodeDrag.panHandlers,
              selectedTarget === 'barcode' && editable ? (
                <View {...barcodeResize.panHandlers} style={styles.resizeHandle}>
                  <View style={styles.resizeGrip} />
                </View>
              ) : null,
            )}

            {renderHandle(
              'inboundCode',
              <Text
                style={[styles.barcodeText, { fontSize: 10 * inboundSized.scale }]}
                numberOfLines={2}
              >
                {barcode}
              </Text>,
              {
                left: toPx(layout.inboundCode.x),
                top: toPx(layout.inboundCode.y),
                width: Math.max(24, toPx(inboundWidthDots)),
                height: Math.max(18, toPx(inboundSized.height)),
              },
              inboundDrag.panHandlers,
            )}
          </View>
        </View>
        <Text style={styles.heightRuler}>{fmt(t.settings.printPreviewHeight, { mm: heightMm.toFixed(1) })}</Text>
      </View>

      <Text style={styles.coordReadout}>{selectedMm}</Text>
      <Text style={styles.dotReadout}>
        {fmt(t.settings.printPreviewDotHint, {
          dots:
            selectedTarget === 'barcode'
              ? `${layout.barcode.x}, ${layout.barcode.y}, ${barcodeMetrics.scale}×, H${barcodeMetrics.height}`
              : `${selectedPos.x}, ${selectedPos.y}`,
          mmPerDot: dotsToMm(1).toFixed(3),
        })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', width: '100%' },
  widthRuler: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  previewStage: {
    alignItems: 'center',
    alignSelf: 'center',
    width: '100%',
  },
  canvasShadow: {
    borderRadius: 10,
    shadowColor: '#0f172a',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    alignSelf: 'center',
  },
  labelCanvas: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#334155',
    position: 'relative',
    overflow: 'visible',
  },
  gridLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
    overflow: 'hidden',
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    width: 1,
    backgroundColor: 'rgba(148,163,184,0.35)',
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    height: 1,
    backgroundColor: 'rgba(148,163,184,0.35)',
  },
  elementBox: {
    position: 'absolute',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 4,
    padding: 2,
    minHeight: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  elementTag: {
    position: 'absolute',
    top: -10,
    left: 0,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    zIndex: 2,
  },
  elementTagText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },
  expressText: {
    color: '#0f172a',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'monospace',
    textAlign: 'center',
    width: '100%',
  },
  barcodeText: {
    color: '#0f172a',
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'monospace',
    textAlign: 'center',
    width: '100%',
  },
  resizeHandle: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -8,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resizeGrip: {
    width: 32,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  heightRuler: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 8,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  coordReadout: {
    marginTop: 12,
    color: '#334155',
    fontSize: 13,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  dotReadout: {
    marginTop: 4,
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'monospace',
    textAlign: 'center',
  },
});
