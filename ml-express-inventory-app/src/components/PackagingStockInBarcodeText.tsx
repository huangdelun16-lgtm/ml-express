import React from 'react';
import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';
import { splitPackagingStockInLineBarcodeDisplay } from '../utils/inboundBarcode';

type Variant = 'list' | 'light' | 'dark';

const COLORS: Record<Variant, { base: string; suffix: string }> = {
  list: { base: '#fde68a', suffix: '#5eead4' },
  light: { base: '#0f172a', suffix: '#0d9488' },
  dark: { base: '#e2e8f0', suffix: '#2dd4bf' },
};

type Props = TextProps & {
  barcode: string;
  variant?: Variant;
  baseStyle?: TextStyle;
  suffixStyle?: TextStyle;
};

/** 多个入库条码：基础号与 (3-1) 序号分色展示 */
export default function PackagingStockInBarcodeText({
  barcode,
  variant = 'list',
  baseStyle,
  suffixStyle,
  style,
  ...rest
}: Props) {
  const { base, suffix } = splitPackagingStockInLineBarcodeDisplay(barcode);
  const colors = COLORS[variant];

  if (!suffix) {
    return (
      <Text style={[styles.text, { color: colors.base }, style, baseStyle]} {...rest}>
        {base}
      </Text>
    );
  }

  return (
    <Text style={[styles.text, style]} {...rest}>
      <Text style={[styles.text, { color: colors.base }, style, baseStyle]}>{base}</Text>
      <Text style={[styles.text, styles.suffix, { color: colors.suffix }, style, suffixStyle]}>{suffix}</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  suffix: {
    fontWeight: '900',
  },
});
