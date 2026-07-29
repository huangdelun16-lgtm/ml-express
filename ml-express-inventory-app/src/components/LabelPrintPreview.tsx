import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import BarcodeImage from './BarcodeImage';
import {
  labelHeightDots,
  labelWidthDots,
  type LabelBarcodeLayoutConfig,
} from '../constants/labelBarcodeLayout';
import { XPRINTER_P203A } from '../constants/xprinterP203a';
import { useTranslation } from '../i18n';

type Props = {
  barcode: string;
  expressNo?: string;
  layout: LabelBarcodeLayoutConfig;
  widthMm?: number;
  heightMm?: number;
  previewWidth?: number;
};

export default function LabelPrintPreview({
  barcode,
  expressNo,
  layout,
  widthMm = XPRINTER_P203A.defaultWidthMm,
  heightMm = XPRINTER_P203A.defaultHeightMm,
  previewWidth = 280,
}: Props) {
  const { t, fmt } = useTranslation();
  const previewHeight = Math.round(previewWidth * (heightMm / widthMm));
  const express = expressNo?.trim() ?? '';
  const widthDots = labelWidthDots(widthMm);
  const heightDots = labelHeightDots(heightMm);
  const scale = previewWidth / widthDots;

  const toLeft = (dots: number) => dots * scale;
  const toTop = (dots: number) => dots * scale;
  const barcodePreviewHeight = Math.max(24, Math.round(layout.barcode.height * scale));

  return (
    <View style={styles.wrap}>
      <Text style={styles.widthRuler}>{fmt(t.settings.printPreviewWidth, { mm: widthMm.toFixed(1) })}</Text>
      <View style={styles.previewRow}>
        <View
          style={[
            styles.label,
            { width: previewWidth, height: Math.max(previewHeight, previewHeight) },
          ]}
        >
          {express ? (
            <Text
              style={[
                styles.expressText,
                {
                  position: 'absolute',
                  left: toLeft(layout.expressNo.x),
                  top: toTop(layout.expressNo.y),
                  maxWidth: previewWidth - toLeft(layout.expressNo.x) - 4,
                },
              ]}
              numberOfLines={1}
            >
              {express}
            </Text>
          ) : null}
          <View
            style={[
              styles.barcodeWrap,
              {
                position: 'absolute',
                left: toLeft(layout.barcode.x),
                top: toTop(layout.barcode.y),
                width: previewWidth - toLeft(layout.barcode.x) - 4,
              },
            ]}
          >
            <BarcodeImage
              code={barcode}
              height={barcodePreviewHeight}
              maxWidth={previewWidth - toLeft(layout.barcode.x) - 8}
              showCodeText={false}
            />
          </View>
          <Text
            style={[
              styles.barcodeText,
              {
                position: 'absolute',
                left: toLeft(layout.inboundCode.x),
                top: toTop(layout.inboundCode.y),
                maxWidth: previewWidth - toLeft(layout.inboundCode.x) - 4,
              },
            ]}
            numberOfLines={2}
          >
            {barcode}
          </Text>
        </View>
        <View style={styles.heightRulerCol}>
          <View style={[styles.heightRulerLine, { height: previewHeight }]} />
          <Text style={styles.heightRulerText}>
            {fmt(t.settings.printPreviewHeight, { mm: heightMm.toFixed(1) })}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', width: '100%' },
  widthRuler: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  label: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  expressText: {
    color: '#0f172a',
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  barcodeWrap: {
    alignItems: 'flex-start',
  },
  barcodeText: {
    color: '#0f172a',
    fontSize: 10,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  heightRulerCol: {
    alignItems: 'center',
    paddingTop: 4,
  },
  heightRulerLine: {
    width: 1,
    backgroundColor: '#64748b',
    opacity: 0.8,
  },
  heightRulerText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
    transform: [{ rotate: '90deg' }],
    width: 72,
    textAlign: 'center',
  },
});
