import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  DeviceEventEmitter,
  Pressable,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cacheService, OFFLINE_QUEUE_CHANGED, type OfflineUpdate } from '../services/cacheService';
import { packageService } from '../services/supabase';
import NetInfo from '@react-native-community/netinfo';
import { useApp } from '../contexts/AppContext';
import { isOfflineQueueStuck } from '../utils/offlineQueuePolicy';

function actionLabel(item: OfflineUpdate, language: string): string {
  if (item.type === 'photo') {
    return language === 'zh' ? '拍照证明' : language === 'my' ? 'ဓာတ်ပုံ' : 'Photo proof';
  }
  if (item.status === '已取件') return language === 'zh' ? '取件' : language === 'my' ? 'ယူခြင်း' : 'Pickup';
  if (item.status === '已送达' || item.status === '已完成') {
    return language === 'zh' ? '送达' : language === 'my' ? 'ပို့ခြင်း' : 'Delivery';
  }
  if (item.status === '配送中') return language === 'zh' ? '开始配送' : language === 'my' ? 'ပို့စတင်' : 'Start delivery';
  return item.status || (language === 'zh' ? '状态更新' : 'Status');
}

function stateLabel(item: OfflineUpdate, language: string, online: boolean): string {
  if (!item.lastError) {
    if (!online) {
      return language === 'zh'
        ? '待上传：手机没网，还在这台手机上'
        : language === 'my'
          ? 'မတင်ရသေး။ ကွန်ရက်မရှိ'
          : 'Waiting: this phone is offline';
    }
    return language === 'zh'
      ? '待上传：还在这台手机上，还没交给服务器'
      : language === 'my'
        ? 'မတင်ရသေး။ ဖုန်းထဲတွင်ရှိသည်'
        : 'Waiting: still on this phone';
  }
  const reason =
    item.lastError === 'photo_rejected'
      ? language === 'zh'
        ? '照片没有传上去'
        : language === 'my'
          ? 'ဓာတ်ပုံ မတင်ရ'
          : 'photo was not uploaded'
      : item.lastError === 'status_rejected'
        ? language === 'zh'
          ? '状态没有写到服务器'
          : language === 'my'
            ? 'အခြေအနေ မသိမ်းရ'
            : 'status was not saved'
        : item.lastError === 'network'
          ? language === 'zh'
            ? '网络中断'
            : language === 'my'
              ? 'ကွန်ရက်ပြတ်'
              : 'network dropped'
          : item.lastError;
  return language === 'zh'
    ? `上传失败：${reason}`
    : language === 'my'
      ? `တင်မရ：${reason}`
      : `Failed: ${reason}`;
}

export const SyncIndicator = () => {
  const { language } = useApp();
  const [queue, setQueue] = useState<OfflineUpdate[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [open, setOpen] = useState(false);
  const [opacity] = useState(new Animated.Value(0));

  const checkQueue = async () => {
    const next = await cacheService.getOfflineQueue();
    setQueue(next);
    Animated.timing(opacity, {
      toValue: next.length > 0 ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(!!state.isConnected && state.isInternetReachable !== false);
      void checkQueue();
    });

    const interval = setInterval(() => {
      void checkQueue();
    }, 5000);

    const sub = DeviceEventEmitter.addListener(OFFLINE_QUEUE_CHANGED, () => {
      void checkQueue();
    });
    void checkQueue();

    return () => {
      unsubscribe();
      clearInterval(interval);
      sub.remove();
    };
  }, []);

  const retry = () => {
    if (syncing) return;
    setSyncing(true);
    void packageService.syncOfflineUpdates().finally(() => {
      setSyncing(false);
      void checkQueue();
    });
  };

  if (queue.length === 0) return null;

  const stuckCount = queue.filter((item) => isOfflineQueueStuck(item.retryCount) || item.lastError).length;
  const title =
    language === 'zh'
      ? `${queue.length} 条操作还没传上去`
      : language === 'my'
        ? `လုပ်ဆောင်ချက် ${queue.length} ခု မတင်ရသေး`
        : `${queue.length} actions not uploaded yet`;
  const detail =
    stuckCount > 0
      ? language === 'zh'
        ? `${stuckCount} 条上传失败，点开看原因`
        : language === 'my'
          ? `${stuckCount} ခု တင်မရ။ နှိပ်ပြီး ကြည့်ပါ`
          : `${stuckCount} failed. Tap to see why`
      : language === 'zh'
        ? '都还在这台手机上，点开查看'
        : language === 'my'
          ? 'ဖုန်းထဲတွင်ရှိသည်။ နှိပ်ပြီး ကြည့်ပါ'
          : 'Still on this phone. Tap to review';

  return (
    <>
      <Animated.View style={[styles.container, { opacity }]} accessibilityLiveRegion="polite">
        <Pressable
          style={[styles.banner, stuckCount > 0 ? styles.stuck : !isOnline ? styles.offline : styles.online]}
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`${title}. ${detail}`}
        >
          <Ionicons
            name={stuckCount > 0 ? 'warning' : isOnline ? 'cloud-upload' : 'cloud-offline'}
            size={22}
            color="#fff"
          />
          <View style={styles.copy}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.detail}>{detail}</Text>
          </View>
        </Pressable>
      </Animated.View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.scrim}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Text style={styles.sheetHint}>
              {language === 'zh'
                ? '已上传成功的不会留在这里。'
                : language === 'en'
                  ? 'Uploaded actions are removed from this list.'
                  : 'တင်ပြီးသားများ ဒီမှာ မကျန်ပါ။'}
            </Text>
            <ScrollView style={styles.list}>
              {queue.map((item) => (
                <View key={item.id} style={styles.row}>
                  <Text style={styles.rowTitle}>
                    {actionLabel(item, language)} · {item.packageId}
                  </Text>
                  <Text style={[styles.rowState, item.lastError ? styles.rowBad : styles.rowWait]}>
                    {stateLabel(item, language, isOnline)}
                  </Text>
                </View>
              ))}
            </ScrollView>
            <Pressable style={styles.uploadBtn} onPress={retry} disabled={syncing}>
              <Text style={styles.uploadText}>
                {syncing
                  ? language === 'zh'
                    ? '正在上传…'
                    : language === 'my'
                      ? 'တင်နေသည်…'
                      : 'Uploading…'
                  : language === 'zh'
                    ? '马上上传'
                    : language === 'my'
                      ? 'ယခုတင်မည်'
                      : 'Upload now'}
              </Text>
            </Pressable>
            <Pressable onPress={() => setOpen(false)}>
              <Text style={styles.closeText}>{language === 'zh' ? '关闭' : language === 'en' ? 'Close' : 'ပိတ်'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 52,
    left: 12,
    right: 12,
    zIndex: 9999,
    elevation: 24,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 8,
  },
  online: { backgroundColor: '#b45309' },
  offline: { backgroundColor: '#7f1d1d' },
  stuck: { backgroundColor: '#991b1b' },
  copy: { flex: 1 },
  title: { color: '#fff', fontSize: 15, fontWeight: '800' },
  detail: { color: '#ffedd5', fontSize: 12, fontWeight: '700', marginTop: 2 },
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.72)',
    justifyContent: 'center',
    padding: 20,
  },
  sheet: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#243044',
    maxHeight: '78%',
  },
  sheetTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '800' },
  sheetHint: { color: '#94a3b8', fontSize: 12, fontWeight: '700', marginTop: 6, marginBottom: 12 },
  list: { flexGrow: 0 },
  row: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  rowTitle: { color: '#f8fafc', fontSize: 14, fontWeight: '800' },
  rowState: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  rowWait: { color: '#fbbf24' },
  rowBad: { color: '#fca5a5' },
  uploadBtn: {
    marginTop: 14,
    backgroundColor: '#0f766e',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  uploadText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  closeText: { color: '#94a3b8', textAlign: 'center', fontWeight: '700', marginTop: 12 },
});
