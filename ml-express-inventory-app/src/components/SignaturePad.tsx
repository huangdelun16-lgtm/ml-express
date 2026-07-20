import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { SignaturePoint, SignatureStroke } from '../types/customerSignReceipt';

export const SIGNATURE_PAD_COMPACT_HEIGHT = 160;

const EXPANDED_HEIGHT = Math.min(Dimensions.get('window').height * 0.62, 520);
const DOUBLE_TAP_MS = 360;
const TAP_MOVE_TOLERANCE = 8;
const STROKE_WIDTH = 3.2;

function strokeToPath(stroke: SignaturePoint[]): string {
  if (stroke.length === 0) return '';
  const [first, ...rest] = stroke;
  let d = `M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`;
  for (const point of rest) {
    d += ` L ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
  }
  return d;
}

function scaleStrokes(
  strokes: SignatureStroke[],
  fromHeight: number,
  toHeight: number,
  fromWidth: number,
  toWidth: number,
): SignatureStroke[] {
  if (fromHeight <= 0 || toHeight <= 0 || fromWidth <= 0 || toWidth <= 0) return strokes;
  const scaleX = toWidth / fromWidth;
  const scaleY = toHeight / fromHeight;
  if (scaleX === 1 && scaleY === 1) return strokes;
  return strokes.map((stroke) =>
    stroke.map((point) => ({ x: point.x * scaleX, y: point.y * scaleY })),
  );
}

function SignatureCanvas({
  width,
  height,
  strokes,
}: {
  width: number;
  height: number;
  strokes: SignatureStroke[];
}) {
  if (width <= 0 || height <= 0) return null;
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      {strokes.map((stroke, index) => {
        const d = strokeToPath(stroke);
        if (!d) return null;
        return (
          <Path
            key={`stroke-${index}`}
            d={d}
            stroke="#0f172a"
            strokeWidth={STROKE_WIDTH}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
    </Svg>
  );
}

export function SignaturePreview({
  strokes,
  height = 96,
  sourceHeight = SIGNATURE_PAD_COMPACT_HEIGHT,
}: {
  strokes: SignatureStroke[];
  height?: number;
  sourceHeight?: number;
}) {
  const [width, setWidth] = useState(0);
  const scale = height / sourceHeight;
  const scaledStrokes = useMemo(
    () =>
      width > 0
        ? scaleStrokes(strokes, sourceHeight, height, sourceHeight * 2.2, width)
        : strokes.map((stroke) => stroke.map((p) => ({ x: p.x * scale, y: p.y * scale }))),
    [strokes, sourceHeight, height, width, scale],
  );

  if (strokes.length === 0) return null;

  return (
    <View
      style={[styles.previewBox, { height }]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <SignatureCanvas width={width} height={height} strokes={scaledStrokes} />
    </View>
  );
}

type PadSurfaceProps = {
  padHeight: number;
  strokes: SignatureStroke[];
  onChange: (strokes: SignatureStroke[]) => void;
  hint: string;
  onDoubleTapBackground?: () => void;
};

function PadSurface({
  padHeight,
  strokes,
  onChange,
  hint,
  onDoubleTapBackground,
}: PadSurfaceProps) {
  const [liveStrokes, setLiveStrokes] = useState<SignatureStroke[]>(strokes);
  const [padWidth, setPadWidth] = useState(0);
  const currentStrokeRef = useRef<SignaturePoint[]>([]);
  const grantPointRef = useRef<SignaturePoint | null>(null);
  const grantTimeRef = useRef(0);
  const lastTapTimeRef = useRef(0);

  useEffect(() => {
    setLiveStrokes(strokes);
  }, [strokes]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          grantPointRef.current = { x: locationX, y: locationY };
          grantTimeRef.current = Date.now();
          currentStrokeRef.current = [{ x: locationX, y: locationY }];
          setLiveStrokes([...strokes, currentStrokeRef.current]);
        },
        onPanResponderMove: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          const point = { x: locationX, y: locationY };
          const last = currentStrokeRef.current[currentStrokeRef.current.length - 1];
          if (last && Math.hypot(point.x - last.x, point.y - last.y) < 0.8) return;
          currentStrokeRef.current = [...currentStrokeRef.current, point];
          setLiveStrokes([...strokes, currentStrokeRef.current]);
        },
        onPanResponderRelease: (evt) => {
          const { locationX, locationY } = evt.nativeEvent;
          const grant = grantPointRef.current;
          const moved =
            grant != null &&
            Math.hypot(locationX - grant.x, locationY - grant.y) > TAP_MOVE_TOLERANCE;
          const quickTap = Date.now() - grantTimeRef.current < 220;

          if (!moved && quickTap && currentStrokeRef.current.length <= 1) {
            currentStrokeRef.current = [];
            setLiveStrokes(strokes);
            const now = Date.now();
            if (now - lastTapTimeRef.current <= DOUBLE_TAP_MS) {
              lastTapTimeRef.current = 0;
              onDoubleTapBackground?.();
              return;
            }
            lastTapTimeRef.current = now;
            return;
          }

          if (currentStrokeRef.current.length === 0) return;
          const next = [...strokes, currentStrokeRef.current];
          currentStrokeRef.current = [];
          setLiveStrokes(next);
          onChange(next);
        },
        onPanResponderTerminate: () => {
          currentStrokeRef.current = [];
          setLiveStrokes(strokes);
        },
      }),
    [onChange, onDoubleTapBackground, strokes],
  );

  return (
    <View
      style={[styles.pad, { height: padHeight }]}
      onLayout={(e) => setPadWidth(e.nativeEvent.layout.width)}
      {...panResponder.panHandlers}
    >
      <Text style={styles.hint}>{hint}</Text>
      <SignatureCanvas width={padWidth} height={padHeight} strokes={liveStrokes} />
    </View>
  );
}

type Props = {
  strokes: SignatureStroke[];
  onChange: (strokes: SignatureStroke[]) => void;
};

export default function SignaturePad({ strokes, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [padWidth, setPadWidth] = useState(0);
  const compactHeight = SIGNATURE_PAD_COMPACT_HEIGHT;

  const openExpanded = () => {
    if (padWidth > 0) {
      onChange(
        scaleStrokes(strokes, compactHeight, EXPANDED_HEIGHT, padWidth, padWidth),
      );
    } else {
      onChange(scaleStrokes(strokes, compactHeight, EXPANDED_HEIGHT, 1, 1));
    }
    setExpanded(true);
  };

  const closeExpanded = () => {
    if (padWidth > 0) {
      onChange(
        scaleStrokes(strokes, EXPANDED_HEIGHT, compactHeight, padWidth, padWidth),
      );
    } else {
      onChange(scaleStrokes(strokes, EXPANDED_HEIGHT, compactHeight, 1, 1));
    }
    setExpanded(false);
  };

  const clear = () => onChange([]);

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>收件人签名</Text>
        <Pressable onPress={clear} hitSlop={8} accessibilityRole="button" accessibilityLabel="清除签名">
          <Text style={styles.clearBtn}>清除</Text>
        </Pressable>
      </View>

      <View onLayout={(e) => setPadWidth(e.nativeEvent.layout.width)}>
        <PadSurface
          padHeight={compactHeight}
          strokes={strokes}
          onChange={onChange}
          hint="请在此手写签名 · 双击背景放大"
          onDoubleTapBackground={openExpanded}
        />
      </View>

      <Modal visible={expanded} animationType="fade" transparent onRequestClose={closeExpanded}>
        <View style={styles.expandOverlay}>
          <View style={styles.expandSheet}>
            <View style={styles.expandHeader}>
              <Text style={styles.expandTitle}>手写签名</Text>
              <Pressable onPress={closeExpanded} hitSlop={8}>
                <Text style={styles.expandDone}>完成</Text>
              </Pressable>
            </View>
            <Text style={styles.expandHint}>大签名区更方便签字 · 笔画已平滑显示</Text>
            <PadSurface
              padHeight={EXPANDED_HEIGHT}
              strokes={strokes}
              onChange={onChange}
              hint="请在此手写签名"
            />
            <View style={styles.expandActions}>
              <Pressable style={styles.expandClearBtn} onPress={clear}>
                <Text style={styles.expandClearText}>清除重签</Text>
              </Pressable>
              <Pressable style={styles.expandConfirmBtn} onPress={closeExpanded}>
                <Text style={styles.expandConfirmText}>完成签名</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: '#cbd5e1', fontSize: 13, fontWeight: '700' },
  clearBtn: { color: '#38bdf8', fontSize: 13, fontWeight: '700' },
  pad: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  hint: {
    position: 'absolute',
    left: 12,
    top: 12,
    zIndex: 1,
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
    paddingRight: 12,
  },
  previewBox: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  expandOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.88)',
    justifyContent: 'center',
    padding: 16,
  },
  expandSheet: {
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 10,
  },
  expandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  expandTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '900' },
  expandDone: { color: '#38bdf8', fontSize: 15, fontWeight: '800' },
  expandHint: { color: '#94a3b8', fontSize: 12, lineHeight: 18 },
  expandActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  expandClearBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#475569',
    paddingVertical: 14,
    alignItems: 'center',
  },
  expandClearText: { color: '#cbd5e1', fontSize: 15, fontWeight: '700' },
  expandConfirmBtn: {
    flex: 1.2,
    borderRadius: 12,
    backgroundColor: '#059669',
    paddingVertical: 14,
    alignItems: 'center',
  },
  expandConfirmText: { color: '#ecfdf5', fontSize: 15, fontWeight: '800' },
});
