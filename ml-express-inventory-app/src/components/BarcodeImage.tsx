import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getCode128ModuleRuns, getCode128TotalModules } from '../utils/barcodeImage';

type Props = {
  code: string;
  height?: number;
  showCodeText?: boolean;
  /** 条码区域最大宽度，始终等比缩放进此宽度内 */
  maxWidth?: number;
};

/**
 * 用原生 View 黑白条渲染 Code128，按 maxWidth 等比缩放，避免溢出容器。
 */
export default function BarcodeImage({
  code,
  height = 80,
  showCodeText = true,
  maxWidth = 280,
}: Props) {
  const trimmed = code.trim();
  if (!trimmed) return null;

  const runs = getCode128ModuleRuns(trimmed);
  const totalModules = getCode128TotalModules(trimmed);
  if (runs.length === 0 || totalModules <= 0) return null;

  return (
    <View style={[styles.wrap, { maxWidth }]}>
      <View style={[styles.canvas, { width: maxWidth, height }]}>
        {runs.map((run, index) => (
          <View
            key={`${run.black ? 'b' : 'w'}-${index}-${run.modules}`}
            style={{
              flex: run.modules,
              height,
              backgroundColor: run.black ? '#000' : '#fff',
            }}
          />
        ))}
      </View>
      {showCodeText ? (
        <Text style={styles.code} selectable numberOfLines={2}>
          {trimmed}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    width: '100%',
    alignItems: 'center',
    overflow: 'hidden',
  },
  canvas: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    overflow: 'hidden',
    alignSelf: 'center',
  },
  code: {
    marginTop: 10,
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
    textAlign: 'center',
    maxWidth: '100%',
  },
});
