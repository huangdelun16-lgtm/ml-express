import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../contexts/AppContext';
import NotificationService from '../services/notificationService';
import Toast from '../components/Toast';
import BackToHomeButton from '../components/BackToHomeButton';

const { width } = Dimensions.get('window');

export default function NotificationWorkflowScreen({ navigation }: any) {
  const { language } = useApp();
  const [notificationService] = useState(() => NotificationService.getInstance());
  
  // Toast状态
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  // 多语言翻译
  const translations = {
    zh: {
      title: '通知工作流程演示',
      description: '测试不同类型的通知功能',
      orderUpdate: '发送订单更新通知',
      deliveryReminder: '发送配送提醒通知',
      promotional: '发送促销消息通知',
      systemAnnouncement: '发送系统公告通知',
      checkPermissions: '检查通知权限',
      requestPermissions: '请求通知权限',
      getScheduledNotifications: '查看待发送通知',
      cancelAllNotifications: '取消所有通知',
      back: '返回',
      success: '成功',
      error: '失败',
      info: '信息',
      warning: '警告',
    },
    en: {
      title: 'Notification Workflow Demo',
      description: 'Test different types of notification features',
      orderUpdate: 'Send Order Update Notification',
      deliveryReminder: 'Send Delivery Reminder Notification',
      promotional: 'Send Promotional Message Notification',
      systemAnnouncement: 'Send System Announcement Notification',
      checkPermissions: 'Check Notification Permissions',
      requestPermissions: 'Request Notification Permissions',
      getScheduledNotifications: 'View Scheduled Notifications',
      cancelAllNotifications: 'Cancel All Notifications',
      back: 'Back',
      success: 'Success',
      error: 'Failed',
      info: 'Info',
      warning: 'Warning',
    },
    my: {
      title: 'အသိပေးချက်အလုပ်လုပ်ငန်းစဉ်ပြသခြင်း',
      description: 'အသိပေးချက်အမျိုးအစားများကိုစမ်းသပ်ပါ',
      orderUpdate: 'အော်ဒါအပ်ဒိတ်အသိပေးချက်ပို့ရန်',
      deliveryReminder: 'ပို့ဆောင်မှုသတိပေးချက်ပို့ရန်',
      promotional: 'ကြော်ငြာမက်ဆေ့ဂျ်အသိပေးချက်ပို့ရန်',
      systemAnnouncement: 'စနစ်ကြေညာချက်အသိပေးချက်ပို့ရန်',
      checkPermissions: 'အသိပေးချက်ခွင့်ပြုချက်များစစ်ဆေးရန်',
      requestPermissions: 'အသိပေးချက်ခွင့်ပြုချက်များတောင်းဆိုရန်',
      getScheduledNotifications: 'စီစဉ်ထားသောအသိပေးချက်များကြည့်ရန်',
      cancelAllNotifications: 'အသိပေးချက်အားလုံးပယ်ဖျက်ရန်',
      back: 'ပြန်သွားရန်',
      success: 'အောင်မြင်ပါပြီ',
      error: 'မအောင်မြင်ပါ',
      info: 'အချက်အလက်',
      warning: 'သတိပေးချက်',
    },
  };

  const t = translations[language as keyof typeof translations];

  // 发送订单更新通知
  const handleOrderUpdateNotification = async () => {
    try {
      await notificationService.sendOrderUpdateNotification({
        orderId: 'DEMO-001',
        status: '已取件',
        customerName: '张三',
        customerPhone: '13800138000',
      });
      showToast('订单更新通知发送成功', 'success');
    } catch (error) {
      showToast('订单更新通知发送失败', 'error');
    }
  };

  // 发送配送提醒通知
  const handleDeliveryReminderNotification = async () => {
    try {
      await notificationService.sendDeliveryReminderNotification({
        orderId: 'DEMO-002',
        estimatedTime: '30分钟内',
        courierName: '李四',
        courierPhone: '13900139000',
      });
      showToast('配送提醒通知发送成功', 'success');
    } catch (error) {
      showToast('配送提醒通知发送失败', 'error');
    }
  };

  // 发送促销消息通知
  const handlePromotionalNotification = async () => {
    try {
      await notificationService.sendPromotionalNotification({
        title: '限时优惠',
        message: '新用户首单立减10元，优惠码：WELCOME10',
        promoCode: 'WELCOME10',
        expiryDate: '2024-12-31',
      });
      showToast('促销消息通知发送成功', 'success');
    } catch (error) {
      showToast('促销消息通知发送失败', 'error');
    }
  };

  // 发送系统公告通知
  const handleSystemAnnouncementNotification = async () => {
    try {
      await notificationService.sendSystemAnnouncementNotification({
        title: '系统维护通知',
        message: '系统将于今晚22:00-24:00进行维护，期间可能影响服务使用',
        priority: 'medium',
      });
      showToast('系统公告通知发送成功', 'success');
    } catch (error) {
      showToast('系统公告通知发送失败', 'error');
    }
  };

  // 检查通知权限
  const handleCheckPermissions = async () => {
    try {
      const hasPermission = await notificationService.checkPermissions();
      showToast(`通知权限状态: ${hasPermission ? '已授权' : '未授权'}`, hasPermission ? 'success' : 'warning');
    } catch (error) {
      showToast('检查通知权限失败', 'error');
    }
  };

  // 请求通知权限
  const handleRequestPermissions = async () => {
    try {
      const granted = await notificationService.requestPermissions();
      showToast(`权限请求结果: ${granted ? '已授权' : '被拒绝'}`, granted ? 'success' : 'warning');
    } catch (error) {
      showToast('请求通知权限失败', 'error');
    }
  };

  // 查看待发送通知
  const handleGetScheduledNotifications = async () => {
    try {
      const notifications = await notificationService.getScheduledNotifications();
      showToast(`待发送通知数量: ${notifications.length}`, 'info');
    } catch (error) {
      showToast('获取待发送通知失败', 'error');
    }
  };

  // 取消所有通知
  const handleCancelAllNotifications = async () => {
    Alert.alert(
      '确认操作',
      '确定要取消所有待发送的通知吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: async () => {
            try {
              await notificationService.cancelAllNotifications();
              showToast('所有通知已取消', 'success');
            } catch (error) {
              showToast('取消通知失败', 'error');
            }
          }
        }
      ]
    );
  };

  // 渲染功能按钮
  const renderFunctionButton = (
    title: string,
    onPress: () => void,
    icon: string,
    color: string
  ) => (
    <TouchableOpacity style={styles.functionButton} onPress={onPress}>
      <LinearGradient
        colors={[color, `${color}dd`]}
        style={styles.functionButtonGradient}
      >
        <Text style={styles.functionButtonIcon}>{icon}</Text>
        <Text style={styles.functionButtonText}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <BackToHomeButton navigation={navigation} position="topRight" />
      <LinearGradient
        colors={['#2E86AB', '#1c6a8f', '#4CA1CF']}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← {t.back}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.title}</Text>
        <View style={styles.headerRight} />
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.descriptionContainer}>
          <Text style={styles.description}>{t.description}</Text>
        </View>

        <View style={styles.functionsContainer}>
          <Text style={styles.sectionTitle}>📦 订单相关通知</Text>
          {renderFunctionButton(t.orderUpdate, handleOrderUpdateNotification, '📋', '#3b82f6')}
          {renderFunctionButton(t.deliveryReminder, handleDeliveryReminderNotification, '🚚', '#f59e0b')}
          
          <Text style={styles.sectionTitle}>📢 营销通知</Text>
          {renderFunctionButton(t.promotional, handlePromotionalNotification, '🎯', '#ec4899')}
          
          <Text style={styles.sectionTitle}>ℹ️ 系统通知</Text>
          {renderFunctionButton(t.systemAnnouncement, handleSystemAnnouncementNotification, '📢', '#8b5cf6')}
          
          <Text style={styles.sectionTitle}>⚙️ 权限管理</Text>
          {renderFunctionButton(t.checkPermissions, handleCheckPermissions, '🔍', '#6b7280')}
          {renderFunctionButton(t.requestPermissions, handleRequestPermissions, '🔑', '#10b981')}
          
          <Text style={styles.sectionTitle}>📋 通知管理</Text>
          {renderFunctionButton(t.getScheduledNotifications, handleGetScheduledNotifications, '📋', '#3b82f6')}
          {renderFunctionButton(t.cancelAllNotifications, handleCancelAllNotifications, '❌', '#ef4444')}
        </View>
      </ScrollView>

      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  descriptionContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  functionsContainer: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    marginTop: 20,
  },
  functionButton: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  functionButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  functionButtonIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  functionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
});
