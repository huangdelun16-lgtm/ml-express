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
  Linking,
  FlatList,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import { customerService, packageService } from '../services/supabase';
import Toast from '../components/Toast';
import BackToHomeButton from '../components/BackToHomeButton';
import { theme } from '../config/theme';

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
  const [userType, setUserType] = useState<'customer' | 'partner'>('customer');
  const [orderStats, setOrderStats] = useState({
    total: 0,
    pending: 0,
    inTransit: 0,
    delivered: 0,
  });
  const [partnerCODStats, setPartnerCODStats] = useState({
    totalCOD: 0,
    unclearedCOD: 0,
    unclearedCount: 0,
    lastSettledAt: null as string | null,
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showCODOrdersModal, setShowCODOrdersModal] = useState(false);
  const [codOrders, setCodOrders] = useState<Array<{orderId: string, codAmount: number, deliveryTime?: string}>>([]);
  const [codOrdersPage, setCodOrdersPage] = useState(1);
  const [codOrdersTotal, setCodOrdersTotal] = useState(0);
  const [codOrdersLoading, setCodOrdersLoading] = useState(false);
  const [codOrdersLoadingMore, setCodOrdersLoadingMore] = useState(false);
  
  // 月份选择器状态
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [tempSelectedYear, setTempSelectedYear] = useState(new Date().getFullYear());
  const [tempSelectedMonth, setTempSelectedMonth] = useState(new Date().getMonth() + 1);
  
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
      title: '账户',
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
      contactEmail: '邮箱',
      contactPhone: '电话',
      website: '网站',
      wechat: '微信',
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
      // 代收款相关翻译
      codStats: '代收款统计',
      totalCOD: '本月代收款',
      unclearedCOD: '待结清金额',
      unclearedCount: '待结清订单数',
      lastSettledAt: '上次结清',
      noSettlement: '暂无结清记录',
      view: '查看',
      codOrders: '代收款订单',
      orderId: '订单号',
      codAmount: '代收金额',
      close: '关闭',
      loading: '加载中...',
      noMoreData: '没有更多数据了',
      selectDate: '选择日期',
      year: '年',
      month: '月',
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
      contactEmail: 'Email',
      contactPhone: 'Phone',
      website: 'Website',
      wechat: 'WeChat',
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
      // COD related translations
      codStats: 'COD Statistics',
      totalCOD: 'Monthly COD',
      unclearedCOD: 'Uncleared Amount',
      unclearedCount: 'Uncleared Orders',
      lastSettledAt: 'Last Settled',
      noSettlement: 'No settlement record',
      view: 'View',
      codOrders: 'COD Orders',
      orderId: 'Order ID',
      codAmount: 'COD Amount',
      close: 'Close',
      loading: 'Loading...',
      noMoreData: 'No more data',
      selectDate: 'Select Date',
      year: 'Year',
      month: 'Month',
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
      contactEmail: 'အီးမေးလ်',
      contactPhone: 'ဖုန်း',
      website: 'ဝက်ဘ်ဆိုဒ်',
      wechat: 'WeChat',
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
      // ငွေကောက်ခံရန်ဆက်စပ်ဘာသာပြန်များ
      codStats: 'ငွေကောက်ခံရန်စာရင်းအင်း',
      totalCOD: 'လတစ်လငွေကောက်ခံရန်',
      unclearedCOD: 'မရှင်းလင်းသေးသောငွေ',
      unclearedCount: 'မရှင်းလင်းသေးသောအော်ဒါများ',
      lastSettledAt: 'နောက်ဆုံးရှင်းလင်းချိန်',
      noSettlement: 'ရှင်းလင်းမှုမှတ်တမ်းမရှိပါ',
      view: 'ကြည့်ရန်',
      codOrders: 'ငွေကောက်ခံရန်အော်ဒါများ',
      orderId: 'အော်ဒါနံပါတ်',
      codAmount: 'ငွေကောက်ခံရန်ပမာဏ',
      close: 'ပိတ်ရန်',
      loading: 'ဆွဲယူနေသည်...',
      noMoreData: 'ဒေတာမရှိတော့ပါ',
      selectDate: 'ရက်စွဲရွေးချယ်ပါ',
      year: 'နှစ်',
      month: 'လ',
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

      // 检测用户类型
      const detectedUserType = user.user_type === 'partner' ? 'partner' : 'customer';
      setUserType(detectedUserType);

      // 加载订单统计
      if (user.id && user.id !== 'guest') {
        // 如果是合伙人，获取店铺名称（通常存储在user.name或AsyncStorage中）
        let storeName: string | undefined = undefined;
        if (detectedUserType === 'partner') {
          storeName = user.name || await AsyncStorage.getItem('userName') || undefined;
          
          // 加载合伙店铺代收款统计
          try {
            const codStats = await packageService.getPartnerStats(user.id, storeName, selectedMonth);
            setPartnerCODStats(codStats);
          } catch (error) {
            console.error('加载代收款统计失败:', error);
          }
        }

        const stats = await packageService.getOrderStats(
          user.id, 
          user.email, 
          user.phone, 
          detectedUserType,
          storeName
        );
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

  // 当月份改变时重新加载数据
  useEffect(() => {
    if (userType === 'partner' && userId && userId !== 'guest') {
      loadUserData();
    }
  }, [selectedMonth]);

  // 处理月份切换
  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    let newYear = year;
    let newMonth = month - 1;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    setSelectedMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    let newYear = year;
    let newMonth = month + 1;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    const nextMonthStr = `${newYear}-${String(newMonth).padStart(2, '0')}`;
    // 允许查看未来月份吗？通常不允许，但这里先不做严格限制，或者只限制到当前月份
    // const now = new Date();
    // const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    // if (nextMonthStr <= currentMonthStr) {
       setSelectedMonth(nextMonthStr);
    // }
  };

  const openMonthPicker = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    setTempSelectedYear(year);
    setTempSelectedMonth(month);
    setShowMonthPicker(true);
  };

  const confirmMonthPicker = () => {
    setSelectedMonth(`${tempSelectedYear}-${String(tempSelectedMonth).padStart(2, '0')}`);
    setShowMonthPicker(false);
  };

  // 查看代收款订单
  const handleViewCODOrders = async () => {
    try {
      const currentUser = await AsyncStorage.getItem('currentUser');
      if (!currentUser) return;
      
      const user = JSON.parse(currentUser);
      let storeName: string | undefined = undefined;
      if (userType === 'partner') {
        storeName = user.name || await AsyncStorage.getItem('userName') || undefined;
      }
      
      setCodOrdersLoading(true);
      setShowCODOrdersModal(true);
      setCodOrdersPage(1);
      
      // 注意：getPartnerCODOrders 现在返回 { orders, total }
      const result = await packageService.getPartnerCODOrders(user.id, storeName, selectedMonth, 1, 20);
      console.log('COD Orders result:', result);
      setCodOrders(result.orders);
      setCodOrdersTotal(result.total);
    } catch (error) {
      console.error('加载代收款订单失败:', error);
      showToast('加载订单列表失败', 'error');
    } finally {
      setCodOrdersLoading(false);
    }
  };

  // 加载更多代收款订单
  const loadMoreCODOrders = async () => {
    if (codOrdersLoadingMore || codOrders.length >= codOrdersTotal) return;

    try {
      const currentUser = await AsyncStorage.getItem('currentUser');
      if (!currentUser) return;
      
      const user = JSON.parse(currentUser);
      let storeName: string | undefined = undefined;
      if (userType === 'partner') {
        storeName = user.name || await AsyncStorage.getItem('userName') || undefined;
      }
      
      setCodOrdersLoadingMore(true);
      const nextPage = codOrdersPage + 1;
      
      const result = await packageService.getPartnerCODOrders(user.id, storeName, selectedMonth, nextPage, 20);
      
      if (result.orders.length > 0) {
        setCodOrders(prev => [...prev, ...result.orders]);
        setCodOrdersPage(nextPage);
      }
    } catch (error) {
      console.error('加载更多代收款订单失败:', error);
    } finally {
      setCodOrdersLoadingMore(false);
    }
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
      colors={theme.colors.gradients.blue}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.userCard}
    >
      <View style={styles.userHeaderRow}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
          </View>
        </View>
        
        <View style={styles.userInfo}>
          <View style={styles.userNameRow}>
            <Text style={styles.userName} numberOfLines={1}>{userName}</Text>
            {!isGuest && (
              <View style={[
                styles.userBadge,
                userType === 'partner' && styles.partnerBadge
              ]}>
                <Text style={[
                  styles.userBadgeText,
                  userType === 'partner' && styles.partnerBadgeText
                ]}>
                  {userType === 'partner' ? 'Partner' : '普通会员'}
                </Text>
              </View>
            )}
          </View>
          
          {isGuest ? (
            <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
              <Text style={styles.loginButtonText}>{t.login}</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.contactInfoContainer}>
              <View style={styles.contactRow}>
                <Ionicons name="call-outline" size={16} color="rgba(255,255,255,0.9)" />
                <Text style={styles.userContact}>{userPhone || '未绑定电话'}</Text>
              </View>
              <View style={styles.contactRow}>
                <Ionicons name="mail-outline" size={16} color="rgba(255,255,255,0.9)" />
                <Text style={styles.userContact}>{userEmail || '未绑定邮箱'}</Text>
              </View>
            </View>
          )}
        </View>

        {!isGuest && (
          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
            <Ionicons name="create-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
        )}
      </View>
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

  const renderPartnerCODStats = () => (
    <View style={styles.section}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <Text style={styles.sectionTitle}>{t.codStats}</Text>
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          backgroundColor: 'rgba(0,0,0,0.2)', 
          borderRadius: 20, 
          paddingHorizontal: 4, 
          paddingVertical: 2,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)'
        }}>
          <TouchableOpacity onPress={handlePrevMonth} style={{ padding: 8 }}>
            <Ionicons name="chevron-back" size={20} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={openMonthPicker} style={{ paddingHorizontal: 12 }}>
            <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold', fontFamily: 'System' }}>{selectedMonth}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNextMonth} style={{ padding: 8 }}>
            <Ionicons name="chevron-forward" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.codCard}>
        <View style={styles.codStatsRow}>
          <LinearGradient
            colors={['rgba(59, 130, 246, 0.15)', 'rgba(59, 130, 246, 0.05)']}
            style={[styles.codStatBox, { borderColor: 'rgba(59, 130, 246, 0.3)' }]}
          >
            <Text style={[styles.codStatLabel, { color: '#60a5fa' }]}>{t.totalCOD}</Text>
            <Text style={[styles.codStatValue, { color: '#3b82f6' }]}>
              {partnerCODStats.totalCOD.toLocaleString()} <Text style={{fontSize: 12}}>MMK</Text>
            </Text>
            <TouchableOpacity
              onPress={handleViewCODOrders}
              style={{
                marginTop: 8,
                paddingVertical: 6,
                paddingHorizontal: 12,
                backgroundColor: 'rgba(59, 130, 246, 0.3)',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: 'rgba(59, 130, 246, 0.5)',
              }}
            >
              <Text style={{ color: '#60a5fa', fontSize: 12, fontWeight: '600' }}>{t.view}</Text>
            </TouchableOpacity>
          </LinearGradient>
          <LinearGradient
            colors={['rgba(239, 68, 68, 0.15)', 'rgba(239, 68, 68, 0.05)']}
            style={[styles.codStatBox, { borderColor: 'rgba(239, 68, 68, 0.3)' }]}
          >
            <Text style={[styles.codStatLabel, { color: '#f87171' }]}>{t.unclearedCOD}</Text>
            <Text style={[styles.codStatValue, { color: '#ef4444' }]}>
              {partnerCODStats.unclearedCOD.toLocaleString()} <Text style={{fontSize: 12}}>MMK</Text>
            </Text>
          </LinearGradient>
        </View>
        <View style={styles.codInfoContainer}>
          <View style={styles.codInfoRow}>
            <Text style={styles.codInfoLabel}>{t.unclearedCount}</Text>
            <View style={[styles.codInfoBadge, { backgroundColor: partnerCODStats.unclearedCount > 0 ? '#ef4444' : '#10b981' }]}>
              <Text style={styles.codInfoBadgeText}>{partnerCODStats.unclearedCount}</Text>
            </View>
          </View>
          {partnerCODStats.lastSettledAt && (
            <View style={styles.codInfoRow}>
              <Text style={styles.codInfoLabel}>{t.lastSettledAt}</Text>
              <Text style={styles.codInfoValue}>
                {new Date(partnerCODStats.lastSettledAt).toLocaleString('zh-CN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            </View>
          )}
          {!partnerCODStats.lastSettledAt && partnerCODStats.totalCOD > 0 && (
            <View style={styles.codInfoRow}>
              <Text style={styles.codInfoLabel}>{t.lastSettledAt}</Text>
              <Text style={[styles.codInfoValue, { opacity: 0.6, fontStyle: 'italic' }]}>{t.noSettlement}</Text>
            </View>
          )}
        </View>
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
      <BackToHomeButton navigation={navigation} position="topRight" />
      <LinearGradient
        colors={['#1e3a8a', '#2563eb', '#60a5fa']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
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
        {!isGuest && userType === 'partner' && renderPartnerCODStats()}
        {renderQuickActions()}
        {renderSettings()}

        {!isGuest && (
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>🚪 {t.logout}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.footer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Text style={styles.footerText}>MARKET LINK EXPRESS</Text>
            <Text style={[styles.footerText, { fontStyle: 'italic', marginLeft: 8, fontSize: 10 }]}>Delivery Service</Text>
          </View>
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
                  <Text style={styles.aboutLinkText}>📧 {t.contactEmail}: marketlink982@gmail.com</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.aboutLink}
                  onPress={() => Linking.openURL('tel:+9509788848928')}
                >
                  <Text style={styles.aboutLinkText}>📞 {t.contactPhone}: (+95) 09788848928</Text>
                </TouchableOpacity>
                <View style={styles.aboutLink}>
                  <Text style={styles.aboutLinkText}>💬 {t.wechat}: AMT349</Text>
                </View>
                <TouchableOpacity 
                  style={styles.aboutLink}
                  onPress={() => Linking.openURL('https://www.market-link-express.com')}
                >
                  <Text style={styles.aboutLinkText}>🌐 {t.website}: www.market-link-express.com</Text>
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

      {/* 月份选择器模态框 */}
      <Modal
        visible={showMonthPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMonthPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: 320, padding: 0, overflow: 'hidden' }]}>
            <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#f8fafc' }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', textAlign: 'center', color: '#334155' }}>{t.selectDate}</Text>
            </View>
            <View style={{ flexDirection: 'row', height: 240 }}>
              {/* 年份列表 */}
              <View style={{ flex: 1, borderRightWidth: 1, borderRightColor: '#eee', backgroundColor: 'white' }}>
                <Text style={{ textAlign: 'center', padding: 12, fontWeight: '600', color: '#64748b', backgroundColor: '#f1f5f9' }}>{t.year}</Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <TouchableOpacity
                      key={year}
                      style={{
                        paddingVertical: 16,
                        backgroundColor: tempSelectedYear === year ? '#eff6ff' : 'transparent',
                        borderLeftWidth: 4,
                        borderLeftColor: tempSelectedYear === year ? theme.colors.primary.DEFAULT : 'transparent'
                      }}
                      onPress={() => setTempSelectedYear(year)}
                    >
                      <Text style={{ 
                        textAlign: 'center', 
                        color: tempSelectedYear === year ? theme.colors.primary.DEFAULT : '#334155',
                        fontWeight: tempSelectedYear === year ? 'bold' : 'normal',
                        fontSize: 16
                      }}>{year}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              {/* 月份列表 */}
              <View style={{ flex: 1, backgroundColor: 'white' }}>
                <Text style={{ textAlign: 'center', padding: 12, fontWeight: '600', color: '#64748b', backgroundColor: '#f1f5f9' }}>{t.month}</Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <TouchableOpacity
                      key={month}
                      style={{
                        paddingVertical: 16,
                        backgroundColor: tempSelectedMonth === month ? '#eff6ff' : 'transparent',
                        borderLeftWidth: 4,
                        borderLeftColor: tempSelectedMonth === month ? theme.colors.primary.DEFAULT : 'transparent'
                      }}
                      onPress={() => setTempSelectedMonth(month)}
                    >
                      <Text style={{ 
                        textAlign: 'center', 
                        color: tempSelectedMonth === month ? theme.colors.primary.DEFAULT : '#334155',
                        fontWeight: tempSelectedMonth === month ? 'bold' : 'normal',
                        fontSize: 16
                      }}>{String(month).padStart(2, '0')}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
            <View style={[styles.modalButtons, { padding: 16, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#eee', marginTop: 0 }]}>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonCancel]} onPress={() => setShowMonthPicker(false)}>
                <Text style={styles.modalButtonText}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonConfirm]} onPress={confirmMonthPicker}>
                <Text style={[styles.modalButtonText, styles.modalButtonTextConfirm]}>{t.confirm}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 代收款订单列表模态框 */}
      <Modal
        visible={showCODOrdersModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCODOrdersModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%', padding: 0, overflow: 'hidden' }]}>
            <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.colors.text.primary }}>
                {t.codOrders} <Text style={{ fontSize: 14, color: '#64748b', fontWeight: 'normal' }}>({codOrdersTotal})</Text>
              </Text>
              <TouchableOpacity onPress={() => setShowCODOrdersModal(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            
            <View style={{ flex: 1, paddingHorizontal: 16 }}>
              {codOrdersLoading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
                  <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
                  <Text style={{ marginTop: 12, color: theme.colors.text.secondary }}>{t.loading}</Text>
                </View>
              ) : (
                  <FlatList
                  data={codOrders}
                  keyExtractor={(item) => item.orderId}
                  style={{ flex: 1 }}
                  contentContainerStyle={{ paddingTop: 16, paddingBottom: 20 }}
                  onEndReached={loadMoreCODOrders}
                  onEndReachedThreshold={0.2}
                  showsVerticalScrollIndicator={true}
                  renderItem={({ item }) => {
                    const formatDate = (dateStr?: string) => {
                      if (!dateStr) return '-';
                      try {
                        const d = new Date(dateStr);
                        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                      } catch (e) {
                        return dateStr;
                      }
                    };
                    return (
                    <View style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: 16,
                      marginBottom: 12,
                      backgroundColor: 'white',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#e2e8f0',
                      ...theme.shadows.small
                    }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.colors.text.tertiary, fontSize: 12, marginBottom: 4 }}>
                          {formatDate(item.deliveryTime)}
                        </Text>
                        <Text style={{ color: theme.colors.text.primary, fontSize: 15, fontWeight: '600' }}>
                          {t.orderId}: <Text style={{ fontFamily: 'System' }}>{item.orderId}</Text>
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
                        <Text style={{ color: theme.colors.text.tertiary, fontSize: 11, marginBottom: 2 }}>
                          {t.codAmount}
                        </Text>
                        <Text style={{ color: '#3b82f6', fontSize: 16, fontWeight: 'bold' }}>
                          {item.codAmount.toLocaleString()}
                        </Text>
                        <Text style={{ color: '#3b82f6', fontSize: 10 }}>MMK</Text>
                      </View>
                    </View>
                  );}}
                  ListEmptyComponent={
                    <View style={{ padding: 40, alignItems: 'center' }}>
                      <Text style={{ fontSize: 40, marginBottom: 16 }}>📭</Text>
                      <Text style={{ color: theme.colors.text.secondary, fontSize: 14 }}>
                        {language === 'zh' ? '本月暂无代收款订单' : language === 'en' ? 'No COD orders this month' : 'အော်ဒါမရှိပါ'}
                      </Text>
                    </View>
                  }
                  ListFooterComponent={
                    codOrdersLoadingMore ? (
                      <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                        <ActivityIndicator size="small" color="#3b82f6" />
                      </View>
                    ) : (codOrders.length >= codOrdersTotal && codOrdersTotal > 0) ? (
                      <Text style={{ textAlign: 'center', paddingVertical: 16, color: '#94a3b8', fontSize: 12 }}>
                        {t.noMoreData}
                      </Text>
                    ) : null
                  }
                />
              )}
            </View>

            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: 'white' }}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm, { flex: 0, width: '100%' }]}
                onPress={() => setShowCODOrdersModal(false)}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextConfirm]}>
                  {t.close}
                </Text>
              </TouchableOpacity>
            </View>
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
    backgroundColor: theme.colors.background.default,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text.light,
    letterSpacing: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  userCard: {
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.l,
    marginBottom: theme.spacing.xl,
    ...theme.shadows.medium,
  },
  userHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: theme.spacing.l,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.white,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  userInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.s,
  },
  userName: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginRight: theme.spacing.s,
    maxWidth: 150,
  },
  userBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.s,
  },
  userBadgeText: {
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: '600',
  },
  partnerBadge: {
    backgroundColor: '#fbbf24', // 金色背景
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  partnerBadgeText: {
    color: '#92400e', // 深褐色文字
    fontWeight: '800',
  },
  contactInfoContainer: {
    gap: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userContact: {
    fontSize: theme.typography.sizes.s,
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: 6,
  },
  loginButton: {
    marginTop: theme.spacing.s,
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing.l,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.l,
    alignSelf: 'flex-start',
  },
  loginButtonText: {
    color: theme.colors.primary.DEFAULT,
    fontSize: theme.typography.sizes.s,
    fontWeight: 'bold',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing.s,
  },
  section: {
    marginBottom: theme.spacing.xxl,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.l,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.l,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: (width - 60) / 2,
    marginBottom: 12,
    borderRadius: theme.borderRadius.l,
    overflow: 'hidden',
    ...theme.shadows.small,
  },
  statGradient: {
    padding: theme.spacing.l,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 28,
    marginBottom: theme.spacing.s,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: theme.typography.sizes.xs,
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
    marginBottom: theme.spacing.l,
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.s,
  },
  actionIconText: {
    fontSize: 24,
  },
  actionLabel: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  settingsList: {
    backgroundColor: theme.colors.background.paper,
    borderRadius: theme.borderRadius.l,
    overflow: 'hidden',
    ...theme.shadows.small,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.l,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    fontSize: 20,
    marginRight: theme.spacing.m,
  },
  settingLabel: {
    fontSize: theme.typography.sizes.m,
    color: theme.colors.text.primary,
  },
  settingArrow: {
    fontSize: 20,
    color: theme.colors.text.tertiary,
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
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.white,
  },
  languageButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  languageButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: theme.colors.background.subtle,
  },
  languageButtonActive: {
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  languageButtonText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontWeight: '600',
  },
  languageButtonTextActive: {
    color: theme.colors.white,
  },
  logoutButton: {
    backgroundColor: theme.colors.error.DEFAULT,
    borderRadius: theme.borderRadius.l,
    padding: theme.spacing.l,
    alignItems: 'center',
    marginTop: theme.spacing.s,
    marginBottom: theme.spacing.xxl,
    ...theme.shadows.medium,
  },
  logoutButtonText: {
    color: theme.colors.white,
    fontSize: theme.typography.sizes.m,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: theme.typography.sizes.s,
    color: theme.colors.text.secondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  footerVersion: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.text.tertiary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: theme.colors.background.paper,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    width: '100%',
    maxWidth: 400,
    ...theme.shadows.large,
  },
  modalTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
  },
  input: {
    backgroundColor: theme.colors.background.input,
    borderWidth: 1,
    borderColor: theme.colors.border.DEFAULT,
    borderRadius: theme.borderRadius.m,
    padding: theme.spacing.m,
    fontSize: theme.typography.sizes.m,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.m,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: theme.spacing.s,
  },
  modalButton: {
    flex: 1,
    padding: theme.spacing.m,
    borderRadius: theme.borderRadius.m,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: theme.colors.background.subtle,
  },
  modalButtonConfirm: {
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  modalButtonText: {
    fontSize: theme.typography.sizes.m,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  modalButtonTextConfirm: {
    color: theme.colors.white,
  },
  aboutScrollView: {
    maxHeight: 400,
    marginBottom: 16,
  },
  aboutDescription: {
    fontSize: theme.typography.sizes.m,
    color: theme.colors.text.secondary,
    lineHeight: 22,
    marginBottom: 20,
    textAlign: 'left',
  },
  aboutSection: {
    marginBottom: 20,
  },
  aboutSectionTitle: {
    fontSize: theme.typography.sizes.m,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  aboutSectionValue: {
    fontSize: theme.typography.sizes.m,
    color: theme.colors.text.secondary,
  },
  aboutLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.background.subtle,
    borderRadius: theme.borderRadius.s,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
  },
  aboutLinkText: {
    fontSize: theme.typography.sizes.m,
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
    flex: 1,
  },
  aboutLinkArrow: {
    fontSize: 20,
    color: theme.colors.text.tertiary,
    marginLeft: 8,
  },
  codCard: {
    backgroundColor: theme.colors.background.paper,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.l,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    ...theme.shadows.medium,
  },
  codStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  codStatBox: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codStatLabel: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  codStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  codInfoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 12,
  },
  codInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  codInfoLabel: {
    fontSize: theme.typography.sizes.s,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  codInfoValue: {
    fontSize: theme.typography.sizes.s,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  codInfoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  codInfoBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});

