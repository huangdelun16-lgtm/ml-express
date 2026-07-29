import React, { useMemo, useRef } from 'react';
import {
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import BarcodeImage from './BarcodeImage';
import {
  dotsToMm,
  formatLayoutMm,
  labelHeightDots,
  labelWidthDots,
  setLayoutElementPosition,
  type LabelBarcodeLayoutConfig,
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
  const barcodePreviewHeight = Math.max(20, Math.round(layout.barcode.height * scale));

  const layoutRef = useRef(layout);
  const onLayoutChangeRef = useRef(onLayoutChange);
  const onSelectTargetRef = useRef(onSelectTarget);
  const dragStartRef = useRef({ x: 0, y: 0, height: 0 });

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
          dragStartRef.current = {
            x: current.barcode.x,
            y: current.barcode.y,
            height: current.barcode.height,
          };
        } else {
          dragStartRef.current = {
            x: current[target].x,
            y: current[target].y,
            height: 0,
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
          dragStartRef.current = {
            x: layoutRef.current.barcode.x,
            y: layoutRef.current.barcode.y,
            height: layoutRef.current.barcode.height,
          };
        },
        onPanResponderMove: (_, gesture) => {
          const nextHeight = snapDots(dragStartRef.current.height + toDots(gesture.dy));
          onLayoutChangeRef.current(
            setLayoutElementPosition(layoutRef.current, 'barcode', { height: nextHeight }),
          );
        },
      }),
    [editable],
  );

  const expressDrag = useMemo(() => makeDragResponder('expressNo'), [editable]);
  const barcodeDrag = useMemo(() => makeDragResponder('barcode'), [editable]);
  const inboundDrag = useMemo(() => makeDragResponder('inboundCode'), [editable]);

  const selectedPos = layout[selectedTarget];
  const selectedMm =
    selectedTarget === 'barcode'
      ? `X ${formatLayoutMm(layout.barcode.x)} · Y ${formatLayoutMm(layout.barcode.y)} · H ${formatLayoutMm(layout.barcode.height)}`
      : `X ${formatLayoutMm(selectedPos.x)} · Y ${formatLayoutMm(selectedPos.y)}`;

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
      <View style={styles.selectorRow}>
        {(['expressNo', 'barcode', 'inboundCode'] as LabelLayoutTarget[]).map((target) => {
          const active = selectedTarget === target;
          const color = TARGET_COLORS[target];
          const label =
            target === 'expressNo'
              ? t.settings.printPreviewExpressNo
              : target === 'barcode'
                ? t.settings.printPreviewBarcode
                : t.settings.printPreviewInboundCode;
          return (
            <Pressable
              key={target}
              onPress={() => onSelectTarget(target)}
              style={[
                styles.selectorChip,
                active && { backgroundColor: `${color}33`, borderColor: color },
              ]}
            >
              <Text style={[styles.selectorChipText, active && { color: '#f8fafc' }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {editable ? <Text style={styles.dragHint}>{t.settings.printPreviewDragHint}</Text> : null}

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
                  <Text style={styles.expressText} numberOfLines={1}>
                    {express}
                  </Text>,
                  {
                    left: toPx(layout.expressNo.x),
                    top: toPx(layout.expressNo.y),
                    width: Math.max(40, previewWidth - toPx(layout.expressNo.x) - 2),
                    height: 22,
                  },
                  expressDrag.panHandlers,
                )
              : null}

            {renderHandle(
              'barcode',
              <BarcodeImage
                code={barcode}
                height={barcodePreviewHeight}
                maxWidth={Math.max(40, previewWidth - toPx(layout.barcode.x) - 8)}
                showCodeText={false}
              />,
              {
                left: toPx(layout.barcode.x),
                top: toPx(layout.barcode.y),
                width: Math.max(40, previewWidth - toPx(layout.barcode.x) - 2),
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
              <Text style={styles.barcodeText} numberOfLines={2}>
                {barcode}
              </Text>,
              {
                left: toPx(layout.inboundCode.x),
                top: toPx(layout.inboundCode.y),
                width: Math.max(40, previewWidth - toPx(layout.inboundCode.x) - 2),
                height: 30,
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
              ? `${layout.barcode.x}, ${layout.barcode.y}, H${layout.barcode.height}`
              : `${selectedPos.x}, ${selectedPos.y}`,
          mmPerDot: dotsToMm(1).toFixed(3),
        })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', width: '100%' },
  selectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 10,
    width: '100%',
  },
  selectorChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#475569',
  },
  selectorChipText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
  },
  dragHint: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 18,
  },
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
  },
  barcodeText: {
    color: '#0f172a',
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'monospace',
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
