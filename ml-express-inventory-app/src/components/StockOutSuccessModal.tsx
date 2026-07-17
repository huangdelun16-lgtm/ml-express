import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { fmt, useTranslation } from '../i18n';

export type CloudSyncStatus = 'synced' | 'failed' | 'skipped';

export type StockOutSuccessData = {
  destination: string;
  count: number;
  totalWeight: string;
  tripNumber?: string;
  cloudStatus: CloudSyncStatus;
  cloudError?: string;
  packBarcodes: string[];
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
  const { t, fmt } = useTranslation();
  const [secondsLeft, setSecondsLeft] = useState(autoReturnSeconds);
  const finishedRef = useRef(false);
  const needsCloudAction = data?.cloudStatus === 'failed' || data?.cloudStatus === 'skipped';

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onDone();
  }, [onDone]);

  useEffect(() => {
    if (!visible || !data) return;

    finishedRef.current = false;
    setSecondsLeft(autoReturnSeconds);

    if (needsCloudAction) return;

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
  }, [visible, data, autoReturnSeconds, finish, needsCloudAction]);

  if (!data) return null;

  const weightPart = data.totalWeight
    ? fmt(t.stockOut.successWeight, { weight: data.totalWeight })
    : '';

  const summaryText = fmt(t.stockOut.successBody, {
    count: data.count,
    dest: data.destination,
    weight: weightPart,
    cloud: '',
  });

  const cloudHint =
    data.cloudStatus === 'synced'
      ? fmt(t.stockOut.cloudSynced, { dest: data.destination })
      : data.cloudStatus === 'failed' && data.cloudError
        ? fmt(t.stockOut.cloudFailed, { err: data.cloudError })
        : t.stockOut.cloudSkipped;

  const failedSteps = fmt(t.stockOut.cloudSyncFailedSteps, { dest: data.destination });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={needsCloudAction ? undefined : finish}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            needsCloudAction && styles.cardWarn,
          ]}
        >
          <View
            style={[
              styles.iconCircle,
              needsCloudAction ? styles.iconCircleWarn : styles.iconCircleOk,
            ]}
          >
            <Text style={[styles.icon, needsCloudAction && styles.iconWarn]}>
              {needsCloudAction ? '⚠️' : '✓'}
            </Text>
          </View>

          <Text style={[styles.title, needsCloudAction && styles.titleWarn]}>
            {needsCloudAction ? t.stockOut.cloudSyncWarnTitle : t.stockOut.successTitle}
          </Text>

          <Text style={styles.summary}>{summaryText}</Text>
          {data.tripNumber ? (
            <Text style={styles.tripNumber}>
              {fmt(t.stockOut.successTrip, { trip: data.tripNumber })}
            </Text>
          ) : null}

          {needsCloudAction ? (
            <>
              <View style={styles.warnBanner}>
                <Text style={styles.warnBannerTitle}>{t.stockOut.cloudSyncFailedLead}</Text>
                <Text style={styles.warnBannerText}>{cloudHint}</Text>
                <Text style={styles.warnSteps}>{failedSteps}</Text>
              </View>
              {data.packBarcodes.length > 0 ? (
                <View style={styles.packListBox}>
                  <Text style={styles.packListTitle}>{t.stockOut.cloudSyncPackList}</Text>
                  {data.packBarcodes.map((code) => (
                    <Text key={code} style={styles.packListItem}>
                      · {code}
                    </Text>
                  ))}
                </View>
              ) : null}
              <Pressable style={styles.btnSecondary} onPress={finish}>
                <Text style={styles.btnSecondaryText}>{t.common.close}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.okBox}>
                <Text style={styles.okText}>{cloudHint}</Text>
                <Text style={styles.okSubText}>
                  {fmt(t.stockOut.cloudSyncedNextStation, { dest: data.destination })}
                </Text>
              </View>
              <Pressable style={styles.btnPrimary} onPress={finish}>
                <Text style={styles.btnPrimaryText}>
                  {secondsLeft > 0 ? `${secondsLeft}s · ${t.nav.home}` : t.nav.home}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.85)',
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
  cardWarn: {
    borderColor: '#f59e0b',
    borderWidth: 2,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconCircleOk: {
    backgroundColor: 'rgba(220,38,38,0.18)',
  },
  iconCircleWarn: {
    backgroundColor: 'rgba(245,158,11,0.2)',
  },
  icon: { color: '#fca5a5', fontSize: 28, fontWeight: '900' },
  iconWarn: { fontSize: 30 },
  title: {
    color: '#fca5a5',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
  },
  titleWarn: { color: '#fcd34d' },
  summary: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 14,
  },
  tripNumber: {
    color: '#7dd3fc',
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: 14,
  },
  okBox: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.35)',
  },
  okText: { color: '#6ee7b7', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  okSubText: { color: '#94a3b8', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 6 },
  warnBanner: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.45)',
  },
  warnBannerTitle: {
    color: '#fcd34d',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
  },
  warnBannerText: {
    color: '#fde68a',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 10,
  },
  warnSteps: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
  },
  packListBox: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  packListTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
  },
  packListItem: {
    color: '#e2e8f0',
    fontSize: 13,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  btnPrimary: {
    backgroundColor: '#dc2626',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  btnSecondary: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  btnSecondaryText: { color: '#cbd5e1', fontWeight: '800', fontSize: 15 },
});
