import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

export type StockOutSuccessData = {
  destination: string;
  count: number;
  totalWeight: string;
  cloudHint: string;
};

type Props = {
  visible: boolean;
  data: StockOutSuccessData | null;
  onDone: () => void;
  autoReturnSeconds?: number;
};

export default function StockOutSuccessModal({
  visible,
  data,
  onDone,
  autoReturnSeconds = 2,
}: Props) {
  const [secondsLeft, setSecondsLeft] = useState(autoReturnSeconds);
  const finishedRef = useRef(false);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onDone();
  }, [onDone]);

  useEffect(() => {
    if (!visible || !data) return;

    finishedRef.current = false;
    setSecondsLeft(autoReturnSeconds);

    const countdown = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    const autoDone = setTimeout(() => {
      finish();
    }, autoReturnSeconds * 1000);

    return () => {
      clearInterval(countdown);
      clearTimeout(autoDone);
    };
  }, [visible, data, autoReturnSeconds, finish]);

  if (!data) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={finish}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Text style={styles.icon}>✓</Text>
          </View>
          <Text style={styles.title}>装车出库完成</Text>
          <Text style={styles.summary}>
            已成功出库 {data.count} 包，目的地 {data.destination}
            {data.totalWeight ? `，总重 ${data.totalWeight} Kg` : ''}。
          </Text>

          {data.cloudHint ? (
            <View style={styles.hintBox}>
              <Text style={styles.hintText}>{data.cloudHint.trim()}</Text>
            </View>
          ) : null}

          <Pressable style={styles.btnDone} onPress={finish}>
            <Text style={styles.btnDoneText}>
              {secondsLeft > 0 ? `${secondsLeft} 秒后返回首页` : '返回首页'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.78)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#334155',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(220,38,38,0.18)',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  icon: { color: '#fca5a5', fontSize: 28, fontWeight: '900' },
  title: { color: '#fca5a5', fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 10 },
  summary: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 14,
  },
  hintBox: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  hintText: { color: '#94a3b8', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  btnDone: {
    backgroundColor: '#dc2626',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDoneText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
