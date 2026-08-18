import React, { useMemo, useRef } from 'react';
import {
  PanResponder,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import BarcodeImage from './BarcodeImage';
import {
  getEffectiveElementWidthDots,
  getBarcodePrintMetrics,
  getElementDimensions,
  formatGroupTextScale,
  getGroupTextScaleMul,
  getLabelGroupBounds,
  labelHeightDots,
  labelWidthDots,
  moveLabelGroup,
  TSPL_TEXT_LINE_HEIGHT_DOTS,
  type LabelBarcodeLayoutConfig,
  type LabelLayoutContentSizes,
} from '../constants/labelBarcodeLayout';
import { XPRINTER_P203A } from '../constants/xprinterP203a';
import { useTranslation } from '../i18n';

type Props = {
  barcode: string;
  expressNo?: string;
  layout: LabelBarcodeLayoutConfig;
  onLayoutChange: (layout: LabelBarcodeLayoutConfig) => void;
  editable?: boolean;
  widthMm?: number;
  heightMm?: number;
  previewWidth?: number;
};

const GROUP_COLOR = '#2563eb';

function snapDots(value: number): number {
  return Math.round(value);
}

export default function LabelPrintPreviewEditor({
  barcode,
  expressNo,
  layout,
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

  const layoutContent: LabelLayoutContentSizes = {
    expressNo: express,
    barcode,
    inboundCode: barcode,
  };

  const barcodeMetrics = getBarcodePrintMetrics(layout, layoutContent, widthMm);
  const barcodePreviewHeight = Math.max(20, Math.round(barcodeMetrics.height * scale));
  const groupBounds = getLabelGroupBounds(layout, layoutContent, widthMm);
  const textScaleMul = getGroupTextScaleMul(layout, layoutContent, widthMm);

  const layoutRef = useRef(layout);
  const onLayoutChangeRef = useRef(onLayoutChange);
  const dragStartRef = useRef({ groupX: 0, groupY: 0 });
  const widthMmRef = useRef(widthMm);
  const heightMmRef = useRef(heightMm);
  const layoutContentRef = useRef(layoutContent);

  layoutRef.current = layout;
  onLayoutChangeRef.current = onLayoutChange;
  widthMmRef.current = widthMm;
  heightMmRef.current = heightMm;
  layoutContentRef.current = layoutContent;

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

  const groupDrag = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => editable,
        onMoveShouldSetPanResponder: () => editable,
        onPanResponderGrant: () => {
          const bounds = getLabelGroupBounds(
            layoutRef.current,
            layoutContentRef.current,
            widthMmRef.current,
          );
          dragStartRef.current = { groupX: bounds.x, groupY: bounds.y };
        },
        onPanResponderMove: (_, gesture) => {
          const start = dragStartRef.current;
          const nextX = snapDots(start.groupX + toDots(gesture.dx));
          const nextY = snapDots(start.groupY + toDots(gesture.dy));
          const bounds = getLabelGroupBounds(
            layoutRef.current,
            layoutContentRef.current,
            widthMmRef.current,
          );
          onLayoutChangeRef.current(
            moveLabelGroup(
              layoutRef.current,
              nextX - bounds.x,
              nextY - bounds.y,
              layoutContentRef.current,
              widthMmRef.current,
              heightMmRef.current,
            ),
          );
        },
      }),
    [editable],
  );

  const barcodeWidthDots = getEffectiveElementWidthDots(layout, 'barcode', layoutContent, widthMm);

  const expressDims = getElementDimensions(layout, 'expressNo', layoutContent, widthMm);
  const inboundDims = getElementDimensions(layout, 'inboundCode', layoutContent, widthMm);

  const expressFontScale = expressDims.heightDots / TSPL_TEXT_LINE_HEIGHT_DOTS;
  const inboundFontScale = inboundDims.heightDots / TSPL_TEXT_LINE_HEIGHT_DOTS;

  const groupReadout =
    `X ${groupBounds.x} · Y ${groupBounds.y} · ` +
    `narrow ${barcodeMetrics.narrow} · H ${barcodeMetrics.height} dots · ${formatGroupTextScale(textScaleMul)}`;

  return (
    <View style={styles.wrap}>
      <View style={styles.previewStage}>
        <Text style={styles.widthRuler}>{fmt(t.settings.printPreviewWidth, { mm: widthMm.toFixed(1) })}</Text>
        <View style={styles.canvasShadow}>
          <View style={[styles.labelCanvas, { width: previewWidth, height: previewHeight }]}>
            <View style={styles.gridLayer} pointerEvents="none">
              {gridLines}
            </View>

            {express ? (
              <View
                pointerEvents="none"
                style={[
                  styles.contentLayer,
                  styles.expressLayer,
                  {
                    left: toPx(layout.barcode.x),
                    top: toPx(layout.expressNo.y),
                    width: Math.max(24, toPx(barcodeWidthDots)),
                    height: Math.max(18, toPx(expressDims.heightDots)),
                  },
                ]}
              >
                <Text
                  style={[styles.expressText, { fontSize: 11 * expressFontScale }]}
                  numberOfLines={1}
                >
                  {express}
                </Text>
              </View>
            ) : null}

            <View
              pointerEvents="none"
              style={[
                styles.contentLayer,
                {
                  left: toPx(layout.barcode.x),
                  top: toPx(layout.barcode.y),
                  width: Math.max(24, toPx(barcodeWidthDots)),
                  height: barcodePreviewHeight + 4,
                },
              ]}
            >
              <BarcodeImage
                code={barcode}
                height={barcodePreviewHeight}
                maxWidth={Math.max(24, toPx(barcodeWidthDots))}
                showCodeText={false}
                centered
              />
            </View>

            <View
              pointerEvents="none"
              style={[
                styles.contentLayer,
                styles.inboundLayer,
                {
                  left: toPx(layout.barcode.x),
                  top: toPx(layout.inboundCode.y),
                  width: Math.max(24, toPx(barcodeWidthDots)),
                  height: Math.max(18, toPx(inboundDims.heightDots)),
                },
              ]}
            >
              <Text
                style={[styles.barcodeText, { fontSize: 10 * inboundFontScale }]}
                numberOfLines={2}
              >
                {barcode}
              </Text>
            </View>

            <View
              {...groupDrag.panHandlers}
              style={[
                styles.groupBox,
                {
                  left: toPx(groupBounds.x),
                  top: toPx(groupBounds.y),
                  width: Math.max(24, toPx(groupBounds.widthDots)),
                  height: Math.max(24, toPx(groupBounds.heightDots)),
                  borderColor: GROUP_COLOR,
                  backgroundColor: `${GROUP_COLOR}12`,
                },
              ]}
            >
              <View style={[styles.groupTag, { backgroundColor: GROUP_COLOR }]}>
                <Text style={styles.groupTagText}>{t.settings.printPreviewLabelGroup}</Text>
              </View>
            </View>
          </View>
        </View>
        <Text style={styles.heightRuler}>{fmt(t.settings.printPreviewHeight, { mm: heightMm.toFixed(1) })}</Text>
      </View>

      <Text style={styles.coordReadout}>{groupReadout}</Text>
      <Text style={styles.dotReadout}>
        {fmt(t.settings.printPreviewGroupDotHint, {
          w: groupBounds.widthDots,
          h: groupBounds.heightDots,
          narrow: barcodeMetrics.narrow,
          barcodeH: barcodeMetrics.height,
          textMul: textScaleMul,
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
  contentLayer: {
    position: 'absolute',
    overflow: 'hidden',
  },
  expressLayer: {
    justifyContent: 'flex-end',
  },
  inboundLayer: {
    justifyContent: 'flex-start',
  },
  groupBox: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 6,
  },
  groupTag: {
    position: 'absolute',
    top: -10,
    left: 0,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    zIndex: 2,
  },
  groupTagText: {
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
    alignSelf: 'center',
    width: '100%',
  },
  barcodeText: {
    color: '#0f172a',
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'monospace',
    textAlign: 'center',
    alignSelf: 'center',
    width: '100%',
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
