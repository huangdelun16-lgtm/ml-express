import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../contexts/AppContext';
import { userNotificationService, UserNotification } from '../services/supabase';
import { theme } from '../config/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function NotificationCenterScreen({ navigation }: any) {
  const { language } = useApp();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [userId, setUserId] = useState<string>('');

  const t = {
    zh: {
      title: '消息中心',
      markAll: '全部已读',
      noMsg: '暂无消息',
      system: '系统通知',
      order: '订单动态',
      promotion: '优惠促销'
    },
    en: {
      title: 'Notifications',
      markAll: 'Read All',
      noMsg: 'No notifications',
      system: 'System',
      order: 'Order',
      promotion: 'Promotion'
    },
    my: {
      title: 'အသိပေးချက်များ',
      markAll: 'အားလုံးဖတ်ပြီး',
      noMsg: 'အသိပေးချက်မရှိပါ',
      system: 'စနစ်',
      order: 'အော်ဒါ',
      promotion: 'ပရိုမိုးရှင်း'
    }
  }[language as 'zh' | 'en' | 'my'] || {
    zh: {}, en: {}, my: {}
  };

  useEffect(() => {
    loadUserId();
  }, []);

  useEffect(() => {
    if (userId) {
      loadNotifications();
    }
  }, [userId]);

  const loadUserId = async () => {
    const currentUser = await AsyncStorage.getItem('currentUser');
    if (currentUser) {
      const user = JSON.parse(currentUser);
      setUserId(user.id);
    }
  };

  const loadNotifications = async () => {
    const data = await userNotificationService.getNotifications(userId);
    setNotifications(data);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleMarkAll = async () => {
    const success = await userNotificationService.markAllAsRead(userId);
    if (success) {
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    }
  };

  const handleRead = async (item: UserNotification) => {
    if (!item.is_read) {
      await userNotificationService.markAsRead(item.id);
      setNotifications(notifications.map(n => n.id === item.id ? { ...n, is_read: true } : n));
    }

    if (item.type === 'order' && item.related_id) {
      navigation.navigate('OrderDetail', { orderId: item.related_id });
    }
  };

  const renderItem = ({ item }: { item: UserNotification }) => {
    let icon = 'notifications-outline';
    let color = '#3b82f6';
    if (item.type === 'order') { icon = 'cube-outline'; color = '#8b5cf6'; }
    if (item.type === 'promotion') { icon = 'pricetag-outline'; color = '#ec4899'; }

    return (
      <TouchableOpacity
        style={[styles.msgCard, !item.is_read && styles.unreadCard]}
        onPress={() => handleRead(item)}
      >
        <View style={[styles.iconBox, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon as any} size={24} color={color} />
        </View>
        <View style={styles.content}>
          <View style={styles.msgHeader}>
            <Text style={styles.msgTitle}>{item.title}</Text>
            <Text style={styles.timeText}>{new Date(item.created_at).toLocaleDateString()}</Text>
          </View>
          <Text style={styles.msgBody} numberOfLines={2}>{item.content}</Text>
        </View>
        {!item.is_read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1e3a8a', '#2563eb']}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>{t.title}</Text>
        <TouchableOpacity onPress={handleMarkAll}>
          <Text style={styles.markAllText}>{t.markAll}</Text>
        </TouchableOpacity>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off-outline" size={80} color="#cbd5e1" />
              <Text style={styles.emptyText}>{t.noMsg}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  backBtn: { width: 40 },
  title: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  markAllText: { color: 'white', fontSize: 14, opacity: 0.9 },
  list: { padding: 16 },
  msgCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    ...theme.shadows.small
  },
  unreadCard: { backgroundColor: '#f0f7ff' },
  iconBox: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  content: { flex: 1 },
  msgHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  msgTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  timeText: { fontSize: 12, color: '#94a3b8' },
  msgBody: { fontSize: 14, color: '#64748b', lineHeight: 20 },
  unreadDot: { position: 'absolute', top: 16, right: 16, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 16, color: '#94a3b8', fontSize: 16 }
});

