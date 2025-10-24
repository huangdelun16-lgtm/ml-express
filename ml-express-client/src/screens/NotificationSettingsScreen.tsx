import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Switch,
  Alert,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../contexts/AppContext';
import Toast from '../components/Toast';

const { width } = Dimensions.get('window');

interface NotificationSettings {
  orderUpdates: boolean;
  deliveryReminders: boolean;
  promotionalMessages: boolean;
  systemAnnouncements: boolean;
  pushNotifications: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
}

export default function NotificationSettingsScreen({ navigation, route }: any) {
  const { language } = useApp();
  const { settings: initialSettings, onSave } = route.params || {};
  
  const [settings, setSettings] = useState<NotificationSettings>(initialSettings || {
    orderUpdates: true,
    deliveryReminders: true,
    promotionalMessages: false,
    systemAnnouncements: true,
    pushNotifications: true,
    emailNotifications: false,
    smsNotifications: false,
  });

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
      title: '通知设置',
      description: '管理您希望接收的通知类型',
      orderUpdates: '订单状态更新',
      orderUpdatesDesc: '当您的订单状态发生变化时接收通知',
      deliveryReminders: '配送提醒',
      deliveryRemindersDesc: '接收配送进度和预计到达时间提醒',
      promotionalMessages: '促销消息',
      promotionalMessagesDesc: '接收优惠活动和促销信息',
      systemAnnouncements: '系统公告',
      systemAnnouncementsDesc: '接收重要的系统更新和公告',
      pushNotifications: '推送通知',
      pushNotificationsDesc: '允许应用发送推送通知',
      emailNotifications: '邮件通知',
      emailNotificationsDesc: '通过邮件接收重要通知',
      smsNotifications: '短信通知',
      smsNotificationsDesc: '通过短信接收紧急通知',
      saveSettings: '保存设置',
      settingsSaved: '设置已保存',
      settingsSaveFailed: '设置保存失败',
      back: '返回',
      resetToDefault: '恢复默认设置',
      confirmReset: '确定要恢复默认设置吗？',
      cancel: '取消',
      confirm: '确定',
    },
    en: {
      title: 'Notification Settings',
      description: 'Manage the types of notifications you want to receive',
      orderUpdates: 'Order Updates',
      orderUpdatesDesc: 'Receive notifications when your order status changes',
      deliveryReminders: 'Delivery Reminders',
      deliveryRemindersDesc: 'Receive delivery progress and estimated arrival time reminders',
      promotionalMessages: 'Promotional Messages',
      promotionalMessagesDesc: 'Receive offers and promotional information',
      systemAnnouncements: 'System Announcements',
      systemAnnouncementsDesc: 'Receive important system updates and announcements',
      pushNotifications: 'Push Notifications',
      pushNotificationsDesc: 'Allow the app to send push notifications',
      emailNotifications: 'Email Notifications',
      emailNotificationsDesc: 'Receive important notifications via email',
      smsNotifications: 'SMS Notifications',
      smsNotificationsDesc: 'Receive urgent notifications via SMS',
      saveSettings: 'Save Settings',
      settingsSaved: 'Settings saved',
      settingsSaveFailed: 'Failed to save settings',
      back: 'Back',
      resetToDefault: 'Reset to Default',
      confirmReset: 'Are you sure you want to reset to default settings?',
      cancel: 'Cancel',
      confirm: 'Confirm',
    },
    my: {
      title: 'အသိပေးချက်ဆက်တင်များ',
      description: 'သင်လက်ခံလိုသောအသိပေးချက်အမျိုးအစားများကိုစီမံခန့်ခွဲပါ',
      orderUpdates: 'အော်ဒါအသိပေးချက်',
      orderUpdatesDesc: 'သင့်အော်ဒါအခြေအနေပြောင်းလဲသောအခါအသိပေးချက်လက်ခံပါ',
      deliveryReminders: 'ပို့ဆောင်မှုသတိပေးချက်',
      deliveryRemindersDesc: 'ပို့ဆောင်မှုတိုးတက်မှုနှင့်ခန့်မှန်းရောက်ရှိချိန်သတိပေးချက်များလက်ခံပါ',
      promotionalMessages: 'ကြော်ငြာမက်ဆေ့ဂျ်',
      promotionalMessagesDesc: 'အပေးအယူနှင့်ကြော်ငြာအချက်အလက်များလက်ခံပါ',
      systemAnnouncements: 'စနစ်ကြေညာချက်',
      systemAnnouncementsDesc: 'အရေးကြီးသောစနစ်အပ်ဒိတ်နှင့်ကြေညာချက်များလက်ခံပါ',
      pushNotifications: 'Push အသိပေးချက်',
      pushNotificationsDesc: 'အက်ပ်မှ Push အသိပေးချက်များပို့ခွင့်ပြုပါ',
      emailNotifications: 'အီးမေးလ်အသိပေးချက်',
      emailNotificationsDesc: 'အရေးကြီးသောအသိပေးချက်များကိုအီးမေးလ်မှတစ်ဆင့်လက်ခံပါ',
      smsNotifications: 'SMS အသိပေးချက်',
      smsNotificationsDesc: 'အရေးပေါ်အသိပေးချက်များကို SMS မှတစ်ဆင့်လက်ခံပါ',
      saveSettings: 'ဆက်တင်များသိမ်းရန်',
      settingsSaved: 'ဆက်တင်များသိမ်းပြီးပါပြီ',
      settingsSaveFailed: 'ဆက်တင်များသိမ်းမှုမအောင်မြင်ပါ',
      back: 'ပြန်သွားရန်',
      resetToDefault: 'မူလဆက်တင်များသို့ပြန်သွားရန်',
      confirmReset: 'မူလဆက်တင်များသို့ပြန်သွားရန်သေချာပါသလား?',
      cancel: 'မလုပ်တော့',
      confirm: 'သေချာပါတယ်',
    },
  };

  const t = translations[language as keyof typeof translations];

  // 处理设置变更
  const handleSettingChange = (key: keyof NotificationSettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // 保存设置
  const handleSaveSettings = async () => {
    try {
      if (onSave) {
        await onSave(settings);
        showToast(t.settingsSaved, 'success');
        navigation.goBack();
      }
    } catch (error) {
      console.error('保存通知设置失败:', error);
      showToast(t.settingsSaveFailed, 'error');
    }
  };

  // 恢复默认设置
  const handleResetToDefault = () => {
    Alert.alert(
      t.resetToDefault,
      t.confirmReset,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.confirm,
          onPress: () => {
            const defaultSettings: NotificationSettings = {
              orderUpdates: true,
              deliveryReminders: true,
              promotionalMessages: false,
              systemAnnouncements: true,
              pushNotifications: true,
              emailNotifications: false,
              smsNotifications: false,
            };
            setSettings(defaultSettings);
            showToast('已恢复默认设置', 'success');
          }
        }
      ]
    );
  };

  // 渲染设置项
  const renderSettingItem = (
    key: keyof NotificationSettings,
    title: string,
    description: string,
    icon: string
  ) => (
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <Text style={styles.settingIcon}>{icon}</Text>
        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingDescription}>{description}</Text>
        </View>
      </View>
      <Switch
        value={settings[key]}
        onValueChange={(value) => handleSettingChange(key, value)}
        trackColor={{ false: '#d1d5db', true: '#10b981' }}
        thumbColor={settings[key] ? '#ffffff' : '#f4f3f4'}
        ios_backgroundColor="#d1d5db"
      />
    </View>
  );

  return (
    <View style={styles.container}>
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

        <View style={styles.settingsContainer}>
          <Text style={styles.sectionTitle}>📱 推送通知</Text>
          {renderSettingItem('pushNotifications', t.pushNotifications, t.pushNotificationsDesc, '🔔')}
          
          <Text style={styles.sectionTitle}>📦 订单相关</Text>
          {renderSettingItem('orderUpdates', t.orderUpdates, t.orderUpdatesDesc, '📋')}
          {renderSettingItem('deliveryReminders', t.deliveryReminders, t.deliveryRemindersDesc, '🚚')}
          
          <Text style={styles.sectionTitle}>📢 营销消息</Text>
          {renderSettingItem('promotionalMessages', t.promotionalMessages, t.promotionalMessagesDesc, '🎯')}
          
          <Text style={styles.sectionTitle}>ℹ️ 系统消息</Text>
          {renderSettingItem('systemAnnouncements', t.systemAnnouncements, t.systemAnnouncementsDesc, '📢')}
          
          <Text style={styles.sectionTitle}>📧 其他通知方式</Text>
          {renderSettingItem('emailNotifications', t.emailNotifications, t.emailNotificationsDesc, '📧')}
          {renderSettingItem('smsNotifications', t.smsNotifications, t.smsNotificationsDesc, '📱')}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.resetButton} onPress={handleResetToDefault}>
            <Text style={styles.resetButtonText}>{t.resetToDefault}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveSettings}>
            <LinearGradient
              colors={['#10b981', '#059669']}
              style={styles.saveButtonGradient}
            >
              <Text style={styles.saveButtonText}>{t.saveSettings}</Text>
            </LinearGradient>
          </TouchableOpacity>
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
  settingsContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  settingIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  resetButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
