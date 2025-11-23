import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Dimensions,
  Linking
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../contexts/AppContext';
import { customerService, packageService } from '../services/supabase';
import Toast from '../components/Toast';

const { width } = Dimensions.get('window');

export default function ProfileScreen({ navigation }: any) {
  const { language, setLanguage } = useApp();
  const appVersion = Constants.expoConfig?.version ?? '1.1.0';
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [userName, setUserName] = useState<string>('访客用户');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userPhone, setUserPhone] = useState<string>('');
  const [isGuest, setIsGuest] = useState(false);
  const [orderStats, setOrderStats] = useState({
    total: 0,
    pending: 0,
    inTransit: 0,
    delivered: 0,
  });
  
  // Toast状态
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');

  // 编辑资料模态框
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  // 关于我们模态框
  const [showAboutModal, setShowAboutModal] = useState(false);

  // 通知设置状态
  const [notificationSettings, setNotificationSettings] = useState({
    orderUpdates: true,        // 订单状态更新通知
    deliveryReminders: true,   // 配送提醒通知
    promotionalMessages: false, // 促销消息通知
    systemAnnouncements: true, // 系统公告通知
    pushNotifications: true,   // 推送通知总开关
    emailNotifications: false, // 邮件通知
    smsNotifications: false,   // 短信通知
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  // 多语言翻译
  const translations = {
    zh: {
      title: '我的',
      guest: '访客用户',
      login: '登录/注册',
      orderStats: '订单统计',
      totalOrders: '全部订单',
      pendingOrders: '待取件',
      inTransitOrders: '配送中',
      deliveredOrders: '已完成',
      quickActions: '快捷功能',
      myProfile: '个人资料',
      addressManagement: '地址管理',
      myCoupons: '我的优惠券',
      helpCenter: '帮助中心',
      settings: '设置',
      language: '语言切换',
      notifications: '通知设置',
      aboutUs: '关于我们',
      logout: '退出登录',
      confirmLogout: '确定要退出登录吗？',
      cancel: '取消',
      confirm: '确定',
      editProfile: '编辑资料',
      save: '保存',
      name: '姓名',
      email: '邮箱',
      phone: '电话',
      address: '地址',
      updateSuccess: '资料更新成功',
      updateFailed: '资料更新失败',
      pleaseLogin: '请先登录',
      comingSoon: '功能开发中，敬请期待',
      // 关于我们相关翻译
      aboutApp: '关于应用',
      appDescription: 'MARKET LINK EXPRESS 是一款专业的快递配送服务平台，为用户提供快速、安全、可靠的包裹配送服务。',
      version: '版本',
      privacyPolicy: '隐私政策',
      termsOfService: '用户协议',
      contactUs: '联系我们',
      email: '邮箱',
      phone: '电话',
      website: '网站',
      openLink: '打开链接',
      // 通知设置相关翻译
      notificationSettings: '通知设置',
      orderUpdates: '订单状态更新',
      deliveryReminders: '配送提醒',
      promotionalMessages: '促销消息',
      systemAnnouncements: '系统公告',
      pushNotifications: '推送通知',
      emailNotifications: '邮件通知',
      smsNotifications: '短信通知',
      notificationDesc: '管理您希望接收的通知类型',
      saveSettings: '保存设置',
      settingsSaved: '设置已保存',
      settingsSaveFailed: '设置保存失败',
    },
    en: {
      title: 'Profile',
      guest: 'Guest User',
      login: 'Login/Register',
      orderStats: 'Order Statistics',
      totalOrders: 'Total Orders',
      pendingOrders: 'Pending',
      inTransitOrders: 'In Transit',
      deliveredOrders: 'Delivered',
      quickActions: 'Quick Actions',
      myProfile: 'My Profile',
      addressManagement: 'Address Management',
      myCoupons: 'My Coupons',
      helpCenter: 'Help Center',
      settings: 'Settings',
      language: 'Language',
      notifications: 'Notifications',
      aboutUs: 'About Us',
      logout: 'Logout',
      confirmLogout: 'Are you sure you want to logout?',
      cancel: 'Cancel',
      confirm: 'Confirm',
      editProfile: 'Edit Profile',
      save: 'Save',
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      address: 'Address',
      updateSuccess: 'Profile updated successfully',
      updateFailed: 'Failed to update profile',
      pleaseLogin: 'Please login first',
      comingSoon: 'Coming Soon',
      // About Us translations
      aboutApp: 'About App',
      appDescription: 'MARKET LINK EXPRESS is a professional express delivery service platform that provides fast, secure, and reliable package delivery services.',
      version: 'Version',
      privacyPolicy: 'Privacy Policy',
      termsOfService: 'Terms of Service',
      contactUs: 'Contact Us',
      email: 'Email',
      phone: 'Phone',
      website: 'Website',
      openLink: 'Open Link',
      // Notification settings translations
      notificationSettings: 'Notification Settings',
      orderUpdates: 'Order Updates',
      deliveryReminders: 'Delivery Reminders',
      promotionalMessages: 'Promotional Messages',
      systemAnnouncements: 'System Announcements',
      pushNotifications: 'Push Notifications',
      emailNotifications: 'Email Notifications',
      smsNotifications: 'SMS Notifications',
      notificationDesc: 'Manage the types of notifications you want to receive',
      saveSettings: 'Save Settings',
      settingsSaved: 'Settings saved',
      settingsSaveFailed: 'Failed to save settings',
    },
    my: {
      title: 'ကျွန်ုပ်၏',
      guest: 'ဧည့်သည်အသုံးပြုသူ',
      login: 'လော့ဂ်အင်/မှတ်ပုံတင်ခြင်း',
      orderStats: 'အော်ဒါစာရင်းအင်း',
      totalOrders: 'စုစုပေါင်းအော်ဒါများ',
      pendingOrders: 'စောင့်ဆိုင်းဆဲ',
      inTransitOrders: 'ပို့ဆောင်နေဆဲ',
      deliveredOrders: 'ပြီးမြောက်ပြီး',
      quickActions: 'အမြန်လုပ်ဆောင်ချက်များ',
      myProfile: 'ကိုယ်ရေးအချက်အလက်',
      addressManagement: 'လိပ်စာစီမံခန့်ခွဲမှု',
      myCoupons: 'ကျွန်ုပ်၏ကူပွန်များ',
      helpCenter: 'အကူအညီဗဟို',
      settings: 'ဆက်တင်များ',
      language: 'ဘာသာစကား',
      notifications: 'အသိပေးချက်များ',
      aboutUs: 'ကျွန်ုပ်တို့အကြောင်း',
      logout: 'ထွက်ရန်',
      confirmLogout: 'ထွက်ရန်သေချာပါသလား?',
      cancel: 'မလုပ်တော့',
      confirm: 'သေချာပါတယ်',
      editProfile: 'အချက်အလက်ပြင်ဆင်ရန်',
      save: 'သိမ်းရန်',
      name: 'အမည်',
      email: 'အီးမေးလ်',
      phone: 'ဖုန်း',
      address: 'လိပ်စာ',
      updateSuccess: 'အချက်အလက်ပြင်ဆင်ပြီးပါပြီ',
      updateFailed: 'အချက်အလက်ပြင်ဆင်မှုမအောင်မြင်ပါ',
      pleaseLogin: 'ကျေးဇူးပြု၍အရင်လော့ဂ်အင်ဝင်ပါ',
      comingSoon: 'မကြာမီလာမည်',
      // အကြောင်းအရာဆက်တင်များ
      aboutApp: 'အက်ပ်အကြောင်း',
      appDescription: 'MARKET LINK EXPRESS သည် အမြန်နှင့်လုံခြုံသော ပါဆယ်ပို့ဆောင်ရေးဝန်ဆောင်မှုများကို ပေးအပ်သော ပရော်ဖက်ရှင်နယ် ပို့ဆောင်ရေးဝန်ဆောင်မှုပလက်ဖောင်းဖြစ်သည်။',
      version: 'ဗားရှင်း',
      privacyPolicy: 'ကိုယ်ရေးလုံခြုံမှုမူဝါဒ',
      termsOfService: 'အသုံးပြုသူစည်းမျဉ်းများ',
      contactUs: 'ဆက်သွယ်ရန်',
      email: 'အီးမေးလ်',
      phone: 'ဖုန်း',
      website: 'ဝက်ဘ်ဆိုဒ်',
      openLink: 'လင့်ခ်ဖွင့်ရန်',
      // အသိပေးချက်ဆက်တင်များ
      notificationSettings: 'အသိပေးချက်ဆက်တင်များ',
      orderUpdates: 'အော်ဒါအခြေအနေအသိပေးချက်',
      deliveryReminders: 'ပို့ဆောင်မှုသတိပေးချက်',
      promotionalMessages: 'ကြော်ငြာမက်ဆေ့ဂျ်',
      systemAnnouncements: 'စနစ်ကြေညာချက်',
      pushNotifications: 'Push အသိပေးချက်',
      emailNotifications: 'အီးမေးလ်အသိပေးချက်',
      smsNotifications: 'SMS အသိပေးချက်',
      notificationDesc: 'သင်လက်ခံလိုသောအသိပေးချက်အမျိုးအစားများကိုစီမံခန့်ခွဲပါ',
      saveSettings: 'ဆက်တင်များသိမ်းရန်',
      settingsSaved: 'ဆက်တင်များသိမ်းပြီးပါပြီ',
      settingsSaveFailed: 'ဆက်တင်များသိမ်းမှုမအောင်မြင်ပါ',
    },
  };

  const t = translations[language as keyof typeof translations];

  useEffect(() => {
    loadUserData();
    loadNotificationSettings();
  }, []);

  const loadUserData = async () => {
    try {
      const currentUser = await AsyncStorage.getItem('currentUser');
      const guestMode = await AsyncStorage.getItem('isGuest');
      
      if (guestMode === 'true' || !currentUser) {
        setIsGuest(true);
        setUserName(t.guest);
        setUserEmail('');
        setUserPhone('');
        return;
      }

      const user = JSON.parse(currentUser);
      setUserId(user.id);
      setUserName(user.name || t.guest);
      setUserEmail(user.email || '');
      setUserPhone(user.phone || '');
      setIsGuest(false);

      // 加载订单统计
      if (user.id && user.id !== 'guest') {
        const stats = await packageService.getOrderStats(user.id);
        setOrderStats(stats);
      }
    } catch (error) {
      console.error('加载用户数据失败:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    setRefreshing(false);
  };

  const handleLogin = () => {
    navigation.replace('Login');
  };

  const handleLogout = async () => {
    Alert.alert(
      t.logout,
      t.confirmLogout,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.confirm,
          onPress: async () => {
            await AsyncStorage.clear();
            navigation.replace('Login');
          }
        }
      ]
    );
  };

  const handleEditProfile = () => {
    if (isGuest) {
      showToast(t.pleaseLogin, 'warning');
      return;
    }
    setEditForm({
      name: userName,
      email: userEmail,
      phone: userPhone,
      address: '',
    });
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    try {
      if (!userId || userId === 'guest') {
        showToast(t.pleaseLogin, 'warning');
        return;
      }

      const updateData: any = {};
      if (editForm.name !== userName) updateData.name = editForm.name;
      if (editForm.email !== userEmail) updateData.email = editForm.email;
      if (editForm.phone !== userPhone) updateData.phone = editForm.phone;
      if (editForm.address) updateData.address = editForm.address;

      if (Object.keys(updateData).length === 0) {
        setShowEditModal(false);
        return;
      }

      // 更新用户信息
      const result = await customerService.updateUser(userId, updateData);
      
      if (result.success) {
        // 更新本地数据
        setUserName(editForm.name);
        setUserEmail(editForm.email);
        setUserPhone(editForm.phone);
        
        // 更新AsyncStorage
        const currentUser = await AsyncStorage.getItem('currentUser');
        if (currentUser) {
          const user = JSON.parse(currentUser);
          const updatedUser = { ...user, ...updateData };
          await AsyncStorage.setItem('currentUser', JSON.stringify(updatedUser));
          await AsyncStorage.setItem('userName', editForm.name);
          await AsyncStorage.setItem('userEmail', editForm.email);
          await AsyncStorage.setItem('userPhone', editForm.phone);
        }

        setShowEditModal(false);
        showToast(t.updateSuccess, 'success');
      } else {
        showToast(t.updateFailed, 'error');
      }
    } catch (error) {
      console.error('更新用户资料失败:', error);
      showToast(t.updateFailed, 'error');
    }
  };

  const handleQuickAction = (action: string) => {
    if (isGuest && action !== 'help') {
      Alert.alert(t.pleaseLogin, '', [
        { text: t.cancel, style: 'cancel' },
        { text: t.confirm, onPress: handleLogin }
      ]);
      return;
    }

    switch (action) {
      case 'profile':
        handleEditProfile();
        break;
      case 'address':
      case 'coupons':
      case 'help':
        showToast(t.comingSoon, 'info');
        break;
      case 'notificationTest':
        navigation.navigate('NotificationWorkflow');
        break;
      default:
        break;
    }
  };

  const handleLanguageChange = (lang: 'zh' | 'en' | 'my') => {
    setLanguage(lang);
    showToast(`${translations[lang].language}: ${lang === 'zh' ? '中文' : lang === 'en' ? 'English' : 'မြန်မာ'}`, 'success');
  };

  // 加载通知设置
  const loadNotificationSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('notificationSettings');
      if (settings) {
        setNotificationSettings(JSON.parse(settings));
      }
    } catch (error) {
      console.error('加载通知设置失败:', error);
    }
  };

  // 保存通知设置
  const saveNotificationSettings = async (newSettings: typeof notificationSettings) => {
    try {
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(newSettings));
      setNotificationSettings(newSettings);
      showToast(t.settingsSaved, 'success');
    } catch (error) {
      console.error('保存通知设置失败:', error);
      showToast(t.settingsSaveFailed, 'error');
    }
  };

  // 处理通知设置变更
  const handleNotificationSettingChange = (key: keyof typeof notificationSettings, value: boolean) => {
    const newSettings = { ...notificationSettings, [key]: value };
    saveNotificationSettings(newSettings);
  };

  // 打开通知设置页面
  const openNotificationSettings = () => {
    if (isGuest) {
      showToast(t.pleaseLogin, 'warning');
      return;
    }
    navigation.navigate('NotificationSettings', {
      settings: notificationSettings,
      onSave: saveNotificationSettings,
    });
  };

  const renderUserCard = () => (
    <LinearGradient
      colors={['#2E86AB', '#1c6a8f', '#4CA1CF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.userCard}
    >
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{userName.charAt(0)}</Text>
        </View>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{userName}</Text>
        {!isGuest && (
          <>
            <Text style={styles.userContact}>{userPhone}</Text>
            <Text style={styles.userContact}>{userEmail}</Text>
          </>
        )}
        {isGuest && (
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>{t.login}</Text>
          </TouchableOpacity>
        )}
      </View>
      {!isGuest && (
        <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
          <Text style={styles.editButtonText}>✏️</Text>
        </TouchableOpacity>
      )}
    </LinearGradient>
  );

  const renderOrderStats = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t.orderStats}</Text>
      <View style={styles.statsGrid}>
        {[
          { label: t.totalOrders, value: orderStats.total, color: '#3b82f6', icon: '📦' },
          { label: t.pendingOrders, value: orderStats.pending, color: '#f59e0b', icon: '⏳' },
          { label: t.inTransitOrders, value: orderStats.inTransit, color: '#8b5cf6', icon: '🚚' },
          { label: t.deliveredOrders, value: orderStats.delivered, color: '#10b981', icon: '✅' },
        ].map((stat, index) => (
          <TouchableOpacity
            key={index}
            style={styles.statCard}
            onPress={() => navigation.navigate('MyOrders')}
          >
            <LinearGradient
              colors={[stat.color, `${stat.color}dd`]}
              style={styles.statGradient}
            >
              <Text style={styles.statIcon}>{stat.icon}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t.quickActions}</Text>
      <View style={styles.actionGrid}>
        {[
          { label: t.myProfile, icon: '👤', action: 'profile', color: '#3b82f6' },
          { label: t.addressManagement, icon: '📍', action: 'address', color: '#f59e0b' },
          { label: t.myCoupons, icon: '🎟️', action: 'coupons', color: '#ec4899' },
          { label: t.helpCenter, icon: '❓', action: 'help', color: '#10b981' },
          { label: '通知测试', icon: '🔔', action: 'notificationTest', color: '#8b5cf6' },
        ].map((action, index) => (
          <TouchableOpacity
            key={index}
            style={styles.actionCard}
            onPress={() => handleQuickAction(action.action)}
          >
            <View style={[styles.actionIcon, { backgroundColor: `${action.color}20` }]}>
              <Text style={styles.actionIconText}>{action.icon}</Text>
            </View>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t.settings}</Text>
      <View style={styles.settingsList}>
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Text style={styles.settingIcon}>🌐</Text>
            <Text style={styles.settingLabel}>{t.language}</Text>
          </View>
          <View style={styles.languageButtons}>
            {[
              { code: 'zh', label: '中' },
              { code: 'en', label: 'EN' },
              { code: 'my', label: 'မြန်' },
            ].map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageButton,
                  language === lang.code && styles.languageButtonActive
                ]}
                onPress={() => handleLanguageChange(lang.code as 'zh' | 'en' | 'my')}
              >
                <Text style={[
                  styles.languageButtonText,
                  language === lang.code && styles.languageButtonTextActive
                ]}>
                  {lang.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.settingItem}
          onPress={openNotificationSettings}
        >
          <View style={styles.settingLeft}>
            <Text style={styles.settingIcon}>🔔</Text>
            <Text style={styles.settingLabel}>{t.notifications}</Text>
          </View>
          <View style={styles.settingRight}>
            <View style={[
              styles.notificationToggle,
              { backgroundColor: notificationSettings.pushNotifications ? '#10b981' : '#d1d5db' }
            ]}>
              <Text style={styles.notificationToggleText}>
                {notificationSettings.pushNotifications ? 'ON' : 'OFF'}
              </Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => setShowAboutModal(true)}
        >
          <View style={styles.settingLeft}>
            <Text style={styles.settingIcon}>ℹ️</Text>
            <Text style={styles.settingLabel}>{t.aboutUs}</Text>
          </View>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#b0d3e8', '#a2c3d6', '#93b4c5', '#86a4b4', '#7895a3']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>{t.title}</Text>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderUserCard()}
        {!isGuest && renderOrderStats()}
        {renderQuickActions()}
        {renderSettings()}

        {!isGuest && (
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>🚪 {t.logout}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>MARKET LINK EXPRESS</Text>
          <Text style={styles.footerVersion}>v{appVersion}</Text>
        </View>
      </ScrollView>

      {/* 编辑资料模态框 */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t.editProfile}</Text>
            
            <TextInput
              style={styles.input}
              placeholder={t.name}
              placeholderTextColor="#9ca3af"
              value={editForm.name}
              onChangeText={(text) => setEditForm({ ...editForm, name: text })}
            />
            
            <TextInput
              style={styles.input}
              placeholder={t.email}
              placeholderTextColor="#9ca3af"
              value={editForm.email}
              onChangeText={(text) => setEditForm({ ...editForm, email: text })}
              keyboardType="email-address"
            />
            
            <TextInput
              style={styles.input}
              placeholder={t.phone}
              placeholderTextColor="#9ca3af"
              value={editForm.phone}
              onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
              keyboardType="phone-pad"
            />
            
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={t.address}
              placeholderTextColor="#9ca3af"
              value={editForm.address}
              onChangeText={(text) => setEditForm({ ...editForm, address: text })}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.modalButtonText}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleSaveProfile}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextConfirm]}>
                  {t.save}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 关于我们模态框 */}
      <Modal
        visible={showAboutModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAboutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t.aboutApp}</Text>
            
            <ScrollView style={styles.aboutScrollView} showsVerticalScrollIndicator={false}>
              <Text style={styles.aboutDescription}>{t.appDescription}</Text>
              
              <View style={styles.aboutSection}>
                <Text style={styles.aboutSectionTitle}>{t.version}</Text>
                <Text style={styles.aboutSectionValue}>v{appVersion}</Text>
              </View>

              <View style={styles.aboutSection}>
                <Text style={styles.aboutSectionTitle}>{t.contactUs}</Text>
                <TouchableOpacity 
                  style={styles.aboutLink}
                  onPress={() => Linking.openURL('mailto:marketlink982@gmail.com')}
                >
                  <Text style={styles.aboutLinkText}>📧 {t.email}: marketlink982@gmail.com</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.aboutLink}
                  onPress={() => Linking.openURL('tel:+9512345678')}
                >
                  <Text style={styles.aboutLinkText}>📞 {t.phone}: +95-1-234-5678</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.aboutLink}
                  onPress={() => Linking.openURL('https://mlexpress.com')}
                >
                  <Text style={styles.aboutLinkText}>🌐 {t.website}: mlexpress.com</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.aboutSection}>
                <Text style={styles.aboutSectionTitle}>{t.privacyPolicy}</Text>
                <TouchableOpacity 
                  style={styles.aboutLink}
                  onPress={() => {
                    const privacyUrl = 'https://mlexpress.com/privacy';
                    Linking.openURL(privacyUrl).catch(() => {
                      Alert.alert(
                        language === 'zh' ? '无法打开链接' : language === 'en' ? 'Cannot open link' : 'လင့်ခ်ဖွင့်ရန်မအောင်မြင်ပါ',
                        language === 'zh' 
                          ? '请稍后访问: ' + privacyUrl
                          : language === 'en'
                          ? 'Please visit later: ' + privacyUrl
                          : 'ကျေးဇူးပြု၍ နောက်မှ လည်ပတ်ပါ: ' + privacyUrl
                      );
                    });
                  }}
                >
                  <Text style={styles.aboutLinkText}>🔒 {t.privacyPolicy}</Text>
                  <Text style={styles.aboutLinkArrow}>›</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.aboutSection}>
                <Text style={styles.aboutSectionTitle}>{t.termsOfService}</Text>
                <TouchableOpacity 
                  style={styles.aboutLink}
                  onPress={() => {
                    const termsUrl = 'https://mlexpress.com/terms';
                    Linking.openURL(termsUrl).catch(() => {
                      Alert.alert(
                        language === 'zh' ? '无法打开链接' : language === 'en' ? 'Cannot open link' : 'လင့်ခ်ဖွင့်ရန်မအောင်မြင်ပါ',
                        language === 'zh' 
                          ? '请稍后访问: ' + termsUrl
                          : language === 'en'
                          ? 'Please visit later: ' + termsUrl
                          : 'ကျေးဇူးပြု၍ နောက်မှ လည်ပတ်ပါ: ' + termsUrl
                      );
                    });
                  }}
                >
                  <Text style={styles.aboutLinkText}>📄 {t.termsOfService}</Text>
                  <Text style={styles.aboutLinkArrow}>›</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonConfirm]}
              onPress={() => setShowAboutModal(false)}
            >
              <Text style={[styles.modalButtonText, styles.modalButtonTextConfirm]}>
                {t.confirm}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Toast
        message={toastMessage}
        type={toastType}
        visible={toastVisible}
        duration={3000}
        onHide={() => setToastVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  userCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  userContact: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  loginButton: {
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: (width - 60) / 2,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  statGradient: {
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: (width - 60) / 4,
    alignItems: 'center',
    marginBottom: 16,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionIconText: {
    fontSize: 28,
  },
  actionLabel: {
    fontSize: 12,
    color: '#4b5563',
    textAlign: 'center',
  },
  settingsList: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: '#1f2937',
  },
  settingArrow: {
    fontSize: 24,
    color: '#9ca3af',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationToggle: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 40,
    alignItems: 'center',
  },
  notificationToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  languageButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  languageButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  languageButtonActive: {
    backgroundColor: '#2E86AB',
  },
  languageButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  languageButtonTextActive: {
    color: '#ffffff',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 4,
  },
  footerVersion: {
    fontSize: 12,
    color: '#9ca3af',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 12,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f3f4f6',
  },
  modalButtonConfirm: {
    backgroundColor: '#2E86AB',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  modalButtonTextConfirm: {
    color: '#ffffff',
  },
  aboutScrollView: {
    maxHeight: 400,
    marginBottom: 16,
  },
  aboutDescription: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
    marginBottom: 20,
    textAlign: 'left',
  },
  aboutSection: {
    marginBottom: 20,
  },
  aboutSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  aboutSectionValue: {
    fontSize: 14,
    color: '#6b7280',
  },
  aboutLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  aboutLinkText: {
    fontSize: 14,
    color: '#2E86AB',
    fontWeight: '500',
    flex: 1,
  },
  aboutLinkArrow: {
    fontSize: 20,
    color: '#9ca3af',
    marginLeft: 8,
  },
});

