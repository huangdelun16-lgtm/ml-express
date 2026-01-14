import React, { useState, useEffect, useRef } from 'react';
import LoggerService from './../services/LoggerService';
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
  ActivityIndicator,
  Platform,
  Animated,
  PanResponder
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useApp } from '../contexts/AppContext';
import { customerService, packageService, deliveryStoreService } from '../services/supabase';
import Toast from '../components/Toast';
import BackToHomeButton from '../components/BackToHomeButton';
import { theme } from '../config/theme';

// 🚀 新增：充值二维码图片资源映射
const RECHARGE_QR_IMAGES: Record<number, any> = {
  10000: require('../../assets/kbz_qr_10000.png'),
  50000: require('../../assets/kbz_qr_50000.png'),
  100000: require('../../assets/kbz_qr_100000.png'),
  300000: require('../../assets/kbz_qr_300000.png'),
};

const { width } = Dimensions.get('window');

export default function ProfileScreen({ navigation }: any) {
  const { language, setLanguage } = useApp();
  const appVersion = Constants.expoConfig?.version ?? '1.1.0';
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [userName, setUserName] = useState<string>('访客用户');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userPhone, setUserPhone] = useState<string>('');
  const [accountBalance, setAccountBalance] = useState<number>(0); // 🚀 新增：账户余额
  const [isGuest, setIsGuest] = useState(false);
  const [userType, setUserType] = useState<string>('customer');
  const [orderStats, setOrderStats] = useState({
    total: 0,
    pending: 0,
    inTransit: 0,
    delivered: 0,
  });
  const [partnerCODStats, setPartnerCODStats] = useState({
    totalCOD: 0,
    settledCOD: 0,
    unclearedCOD: 0,
    unclearedCount: 0,
    lastSettledAt: null as string | null,
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showCODOrdersModal, setShowCODOrdersModal] = useState(false);
  const [codModalSettled, setCodModalSettled] = useState<boolean | undefined>(undefined);
  const [codOrders, setCodOrders] = useState<Array<{orderId: string, codAmount: number, deliveryTime?: string}>>([]);
  const [codOrdersPage, setCodOrdersPage] = useState(1);
  const [codOrdersTotal, setCodOrdersTotal] = useState(0);
  const [codOrdersLoading, setCodOrdersLoading] = useState(false);
  const [codOrdersRefreshing, setCodOrdersRefreshing] = useState(false);
  const [codOrdersLoadingMore, setCodOrdersLoadingMore] = useState(false);
  const [codOrdersSearchText, setCodOrdersSearchText] = useState('');
  const [allCodOrders, setAllCodOrders] = useState<Array<{orderId: string, codAmount: number, deliveryTime?: string}>>([]);
  
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

  // 修改密码模态框
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // 关于我们模态框
  const [showAboutModal, setShowAboutModal] = useState(false);

  // 🚀 新增：充值模态框状态
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [selectedRechargeAmount, setSelectedRechargeAmount] = useState<number | null>(null);
  
  // 🚀 新增：支付二维码模态框状态
  const [showPaymentQRModal, setShowPaymentQRModal] = useState(false);
  const [rechargeProofUri, setRechargeProofUri] = useState<string | null>(null);

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

  // 🚀 新增：商家店铺信息和营业状态
  const [storeInfo, setStoreInfo] = useState<any>(null);
  const [businessStatus, setBusinessStatus] = useState({
    is_closed_today: false,
    operating_hours: '09:00 - 21:00'
  });

  // 🚀 新增：时间选择器状态
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pickingTimeType, setPickingTimeType] = useState<'open' | 'close' | null>(null);
  const [tempHour, setTempHour] = useState('09');
  const [tempMinute, setTempMinute] = useState('00');

  const isPartnerStore = userType === 'partner';

  // 🚀 新增：格式化函数（React Native 中 toLocaleString 可能不兼容）
  const formatMoney = (amount: number | string) => {
    const num = Number(amount) || 0;
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '-';
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch (e) {
      return '-';
    }
  };

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
      changePassword: '修改密码',
      currentPassword: '当前密码',
      newPassword: '新密码',
      confirmPassword: '确认密码',
      save: '保存',
      name: '姓名',
      email: '邮箱',
      phone: '电话',
      address: '地址',
      updateSuccess: '资料更新成功',
      updateFailed: '资料更新失败',
      pleaseLogin: '请先登录',
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
      totalCOD: '本月已结清代收款',
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
      searchOrder: '搜索订单号',
      totalAmount: '总金额',
      refresh: '刷新',
      // 注销账号相关
      deleteAccount: '注销账号',
      confirmDeleteTitle: '确定要注销账号吗？',
      deleteWarning: '注销后，您的所有个人数据、订单历史和优惠券将被永久删除，且无法恢复。',
      deleteSuccess: '账号已注销',
      deleteFailed: '注销账号失败',
      deleteProcessing: '正在注销...',
      // 🚀 充值相关
      recharge: '充值余额',
      rechargeCard: '充值卡',
      rechargeDesc: '请选择充值金额，快速升级 VIP',
      discount5: '小提示：优惠 5%',
      discount10: '小提示：优惠 10%',
      confirmRecharge: '确认充值',
      rechargeSuccess: '充值成功',
      rechargeFailed: '充值失败',
      uploadPaymentRecord: '上传汇款记录',
      paymentQRTitle: '扫描二维码支付',
      pleaseUploadRecord: '请在支付后上传汇款凭证截图',
      // 身份标识
      partner: '合伙人',
      vipMember: 'VIP 会员',
      admin: '管理员',
      courier: '快递员',
      member: '会员',
      // 商家管理
      merchantService: '商家管理',
      myProducts: '我的商品',
      productManageDesc: '管理店内商品、价格及库存',
      cityMall: '同城商场',
      shoppingCart: '购物车',
      mallDesc: '浏览并购买同城优质商品',
      cartDesc: '查看已选择的商品并结算',
      // 🚀 营业管理相关
      businessManagement: '营业状态管理',
      operatingHours: '营业时间设置',
      closedToday: '今日暂停营业',
      openingTime: '开门时间',
      closingTime: '打烊时间',
      statusUpdated: '营业状态已更新',
      businessResumed: '已恢复正常营业',
      serviceSuspended: '今日暂停服务设置成功',
      operatingHoursUpdated: '营业时间设置成功',
      selectTime: '选择时间',
      lastUpdated: '最后更改时间',
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
      changePassword: 'Change Password',
      currentPassword: 'Current Password',
      newPassword: 'New Password',
      confirmPassword: 'Confirm Password',
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
      totalCOD: 'Monthly Settled COD',
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
      searchOrder: 'Search Order ID',
      totalAmount: 'Total Amount',
      refresh: 'Refresh',
      // Account deletion
      deleteAccount: 'Delete Account',
      confirmDeleteTitle: 'Confirm Delete Account?',
      deleteWarning: 'After deletion, all your personal data, order history, and coupons will be permanently deleted and cannot be recovered.',
      deleteSuccess: 'Account deleted successfully',
      deleteFailed: 'Failed to delete account',
      deleteProcessing: 'Deleting...',
      // 🚀 Recharge related
      recharge: 'Recharge',
      rechargeCard: 'Recharge Card',
      rechargeDesc: 'Select amount to upgrade to VIP',
      discount5: 'Tip: 5% Discount',
      discount10: 'Tip: 10% Discount',
      confirmRecharge: 'Confirm Recharge',
      rechargeSuccess: 'Recharge Successful',
      rechargeFailed: 'Recharge Failed',
      uploadPaymentRecord: 'Upload Payment Record',
      paymentQRTitle: 'Scan QR to Pay',
      pleaseUploadRecord: 'Please upload payment proof after paying',
      // Badges
      partner: 'Partner',
      vipMember: 'VIP Member',
      admin: 'Admin',
      courier: 'Courier',
      member: 'Member',
      // Merchant management
      merchantService: 'Merchant',
      myProducts: 'My Products',
      productManageDesc: 'Manage your items, prices and stock',
      cityMall: 'City Mall',
      shoppingCart: 'Cart',
      mallDesc: 'Browse and buy local products',
      cartDesc: 'View and checkout your items',
      // 🚀 Business management related
      businessManagement: 'Business Status',
      operatingHours: 'Operating Hours',
      closedToday: 'Closed Today',
      openingTime: 'Opening Time',
      closingTime: 'Closing Time',
      statusUpdated: 'Status Updated',
      businessResumed: 'Business Resumed',
      serviceSuspended: 'Service Suspended for Today',
      operatingHoursUpdated: 'Operating Hours Updated',
      selectTime: 'Select Time',
      lastUpdated: 'Last Updated',
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
      changePassword: 'စကားဝှက်ပြောင်းရန်',
      currentPassword: 'လက်ရှိစကားဝှက်',
      newPassword: 'စကားဝှက်အသစ်',
      confirmPassword: 'စကားဝှက်အတည်ပြုပါ',
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
      totalCOD: 'လအလိုက် ငွေရှင်းပြီးသော ငွေကောက်ခံမှု',
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
      searchOrder: 'အော်ဒါနံပါတ်ရှာဖွေရန်',
      totalAmount: 'စုစုပေါင်းငွေ',
      refresh: 'ပြန်လည်စတင်ရန်',
      // အကောင့်ဖျက်သိမ်းခြင်း
      deleteAccount: 'အကောင့်ဖျက်သိမ်းရန်',
      confirmDeleteTitle: 'အကောင့်ဖျက်သိမ်းရန်သေချာပါသလား?',
      deleteWarning: 'ဖျက်သိမ်းပြီးနောက်၊ သင်၏ကိုယ်ရေးအချက်အလက်များ၊ အော်ဒါမှတ်တမ်းများနှင့် ကူပွန်များအားလုံးကို အမြဲတမ်းဖျက်သိမ်းမည်ဖြစ်ပြီး ပြန်လည်ရယူ၍မရပါ။',
      deleteSuccess: 'အကောင့်ဖျက်သိမ်းပြီးပါပြီ',
      deleteFailed: 'အကောင့်ဖျက်သိမ်းမှုမအောင်မြင်ပါ',
      deleteProcessing: 'ဖျက်သိမ်းနေဆဲ...',
      // 🚀 Recharge related
      recharge: 'ငွေဖြည့်မည်',
      rechargeCard: 'ငွေဖြည့်ကတ်',
      rechargeDesc: 'VIP အဆင့်မြှင့်ရန် ပမာဏရွေးချယ်ပါ',
      discount5: 'အကြံပြုချက် - ၅% လျှော့စျေး',
      discount10: 'အကြံပြုချက် - ၁၀% လျှော့စျေး',
      confirmRecharge: 'ငွေဖြည့်မည်',
      rechargeSuccess: 'ငွေဖြည့်သွင်းမှု အောင်မြင်ပါသည်',
      rechargeFailed: 'ငွေဖြည့်သွင်းမှု မအောင်မြင်ပါ',
      uploadPaymentRecord: 'ငွေလွှဲမှတ်တမ်းတင်မည်',
      paymentQRTitle: 'QR စကင်ဖတ်၍ ငွေပေးချေပါ',
      pleaseUploadRecord: 'ငွေပေးချေပြီးနောက် ငွေလွှဲအထောက်အထားကို တင်ပေးပါ',
      // အဆင့်အတန်းများ
      partner: 'မိတ်ဖက်',
      vipMember: 'VIP အဖွဲ့၀င်',
      admin: 'စီမံခန့်ခွဲသူ',
      courier: 'ပို့ဆောင်သူ',
      member: 'အဖွဲ့၀င်',
      // ဆိုင်စီမံခန့်ခွဲမှု
      merchantService: 'ဆိုင်စီမံခန့်ခွဲမှု',
      myProducts: 'ကျွန်ုပ်၏ကုန်ပစ္စည်းများ',
      productManageDesc: 'ကုန်ပစ္စည်းများ၊ စျေးနှုန်းနှင့် လက်ကျန်စာရင်းကို စီမံခန့်ခွဲပါ',
      cityMall: 'မြို့တွင်းဈေးဝယ်စင်တာ',
      shoppingCart: 'ဈေးဝယ်လှည်း',
      mallDesc: 'ဒေသတွင်း ကုန်ပစ္စည်းများကို ကြည့်ရှုဝယ်ယူပါ',
      cartDesc: 'ရွေးချယ်ထားသောပစ္စည်းများကို ကြည့်ရှုစစ်ဆေးပါ',
      // 🚀 ဆိုင်စီမံခန့်ခွဲမှု ဆက်စပ်ဘာသာပြန်များ
      businessManagement: 'ဆိုင်ဖွင့်လှစ်မှု အခြေအနေ',
      operatingHours: 'ဆိုင်ဖွင့်ချိန် သတ်မှတ်ချက်',
      closedToday: 'ယနေ့ ဆိုင်ပိတ်သည်',
      openingTime: 'ဆိုင်ဖွင့်ချိန်',
      closingTime: 'ဆိုင်ပိတ်ချိန်',
      statusUpdated: 'အခြေအနေ ပြောင်းလဲပြီးပါပြီ',
      businessResumed: 'ပုံမှန်အတိုင်း ပြန်လည်ဖွင့်လှစ်ပါပြီ',
      serviceSuspended: 'ယနေ့ ဆိုင်ပိတ်ရန် သတ်မှတ်ပြီးပါပြီ',
      operatingHoursUpdated: 'ဆိုင်ဖွင့်ချိန် သတ်မှတ်မှု အောင်မြင်ပါသည်',
      selectTime: 'အချိန်ရွေးချယ်ပါ',
      lastUpdated: 'နောက်ဆုံးပြင်ဆင်ချိန်',
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
      setAccountBalance(user.balance || 0); // 🚀 获取余额
      setIsGuest(false);

      // 检测用户类型
      const detectedUserType = user.user_type || 'customer';
      
      // 🚀 核心逻辑：如果余额 > 0 且是普通会员，则显示为 VIP MEMBER
      const finalUserType = (detectedUserType === 'customer' && (user.balance || 0) > 0) ? 'vip' : detectedUserType;
      setUserType(finalUserType);

      // 加载订单统计
      if (user.id && user.id !== 'guest') {
        // 🚀 实时从数据库同步最新余额和用户信息
        try {
          const { data: latestUser, error: userError } = await supabase
            .from('users')
            .select('balance, user_type')
            .eq('id', user.id)
            .single();
          
          if (!userError && latestUser) {
            setUserBalance(latestUser.balance || 0);
            if (latestUser.user_type === 'customer' && (latestUser.balance || 0) > 0) {
              setUserType('vip');
            } else {
              setUserType(latestUser.user_type || 'customer');
            }
          }
        } catch (error) {
          console.warn('获取最新用户信息失败');
        }

        // 如果是合伙人，获取店铺名称（通常存储在user.name或AsyncStorage中）
        let storeName: string | undefined = undefined;
        if (detectedUserType === 'partner') {
          storeName = user.name || await AsyncStorage.getItem('userName') || undefined;
          
          // 🚀 加载店铺详细信息
          try {
            const { data: store, error } = await deliveryStoreService.getStoreById(user.id);
            if (!error && store) {
              setStoreInfo(store);
              setBusinessStatus({
                is_closed_today: store.is_closed_today || false,
                operating_hours: store.operating_hours || '09:00 - 21:00'
              });
            }
          } catch (error) {
            LoggerService.error('加载店铺详情失败:', error);
          }

          // 加载合伙店铺代收款统计
          try {
            const codStats = await packageService.getPartnerStats(user.id, storeName, selectedMonth);
            if (codStats) {
              setPartnerCODStats(prev => ({
                ...prev,
                ...codStats
              }));
            }
          } catch (error) {
            LoggerService.error('加载代收款统计失败:', error);
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
      LoggerService.error('加载用户数据失败:', error);
    }
  };

  // 🚀 新增：更新店铺营业状态
  const handleUpdateStoreStatus = async (updates: any) => {
    if (!userId || !isPartnerStore) return;
    try {
      const result = await deliveryStoreService.updateStoreInfo(userId, updates);
      if (result.success) {
        setStoreInfo(result.data);
        
        // 提示逻辑
        if (updates.is_closed_today !== undefined && updates.is_closed_today !== storeInfo?.is_closed_today) {
          showToast(updates.is_closed_today ? t.serviceSuspended : t.businessResumed, 'success');
        } else if (updates.operating_hours) {
          showToast(t.operatingHoursUpdated, 'success');
        } else {
          showToast(t.statusUpdated, 'success');
        }
      } else {
        showToast(language === 'zh' ? '保存失败' : 'Save failed', 'error');
      }
    } catch (error) {
      LoggerService.error('更新营业状态失败:', error);
      showToast(language === 'zh' ? '保存异常' : 'Error saving', 'error');
    }
  };

  // 🚀 新增：打开时间选择器
  const openTimePicker = (type: 'open' | 'close') => {
    const currentTime = businessStatus.operating_hours.split(' - ')[type === 'open' ? 0 : 1] || (type === 'open' ? '09:00' : '21:00');
    const [h, m] = currentTime.split(':');
    setTempHour(h || '09');
    setTempMinute(m || '00');
    setPickingTimeType(type);
    setShowTimePicker(true);
  };

  // 🚀 新增：确认时间选择
  const handleConfirmTime = () => {
    const newTime = `${tempHour}:${tempMinute}`;
    const times = businessStatus.operating_hours.split(' - ');
    if (pickingTimeType === 'open') {
      setBusinessStatus(prev => ({ ...prev, operating_hours: `${newTime} - ${times[1] || '21:00'}` }));
    } else {
      setBusinessStatus(prev => ({ ...prev, operating_hours: `${times[0] || '09:00'} - ${newTime}` }));
    }
    setShowTimePicker(false);
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
  const handleViewCODOrders = async (settled?: boolean, isRefresh = false) => {
    try {
      const currentUser = await AsyncStorage.getItem('currentUser');
      if (!currentUser) return;
      
      const user = JSON.parse(currentUser);
      let storeName: string | undefined = undefined;
      if (userType === 'partner') {
        storeName = user.name || await AsyncStorage.getItem('userName') || undefined;
      }
      
      if (!isRefresh) {
        setCodOrdersLoading(true);
        setCodModalSettled(settled);
        setShowCODOrdersModal(true);
      }
      setCodOrdersPage(1);
      
      // 注意：getPartnerCODOrders 现在返回 { orders, total }
      const result = await packageService.getPartnerCODOrders(user.id, storeName, selectedMonth, settled, 1, 20);
      LoggerService.debug('COD Orders result:', result);
      setAllCodOrders(result.orders);
      setCodOrders(result.orders);
      setCodOrdersTotal(result.total);
      setCodOrdersSearchText(''); // 重置搜索
    } catch (error) {
      LoggerService.error('加载代收款订单失败:', error);
      showToast('加载订单列表失败', 'error');
    } finally {
      if (!isRefresh) {
        setCodOrdersLoading(false);
      }
    }
  };

  // 搜索订单
  const handleSearchCODOrders = (text: string) => {
    setCodOrdersSearchText(text);
    if (!text.trim()) {
      setCodOrders(allCodOrders);
    } else {
      const filtered = allCodOrders.filter(order => 
        order.orderId.toLowerCase().includes(text.toLowerCase().trim())
      );
      setCodOrders(filtered);
    }
  };

  // 刷新订单列表
  const refreshCODOrders = async () => {
    try {
      setCodOrdersRefreshing(true);
      await handleViewCODOrders(codModalSettled, true);
    } finally {
      setCodOrdersRefreshing(false);
    }
  };

  // 计算总金额
  const calculateTotalAmount = () => {
    if (!codOrders || !Array.isArray(codOrders)) return 0;
    return codOrders.reduce((sum, order) => sum + (order.codAmount || 0), 0);
  };

  // 加载更多代收款订单
  const loadMoreCODOrders = async () => {
    if (codOrdersLoadingMore || allCodOrders.length >= codOrdersTotal) return;

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
      
      const result = await packageService.getPartnerCODOrders(user.id, storeName, selectedMonth, codModalSettled, nextPage, 20);
      
      if (result.orders.length > 0) {
        const newOrders = [...allCodOrders, ...result.orders];
        setAllCodOrders(newOrders);
        // 如果有搜索文本，需要过滤
        if (codOrdersSearchText.trim()) {
          const filtered = newOrders.filter(order => 
            order.orderId.toLowerCase().includes(codOrdersSearchText.toLowerCase().trim())
          );
          setCodOrders(filtered);
        } else {
          setCodOrders(newOrders);
        }
        setCodOrdersPage(nextPage);
      }
    } catch (error) {
      LoggerService.error('加载更多代收款订单失败:', error);
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

  const handleDeleteAccount = async () => {
    if (isGuest || !userId) {
      showToast(t.pleaseLogin, 'warning');
      return;
    }

    Alert.alert(
      t.confirmDeleteTitle,
      t.deleteWarning,
      [
        { text: t.cancel, style: 'cancel' },
        {
          text: t.deleteAccount,
          style: 'destructive',
          onPress: async () => {
            try {
              setRefreshing(true);
              const result = await customerService.deleteAccount(userId);
              
              if (result.success) {
                showToast(t.deleteSuccess, 'success');
                await AsyncStorage.clear();
                setTimeout(() => {
                  navigation.replace('Login');
                }, 1500);
              } else {
                Alert.alert(t.deleteFailed, result.error?.message || '');
              }
            } catch (error) {
              LoggerService.error('注销账号操作失败:', error);
              showToast(t.deleteFailed, 'error');
            } finally {
              setRefreshing(false);
            }
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
    // ... (rest of the function)
  };

  // 🚀 修改：开启支付二维码显示
  const handleOpenPaymentQR = () => {
    if (!selectedRechargeAmount) return;
    setShowRechargeModal(false);
    setShowPaymentQRModal(true);
  };

  // 🚀 新增：上传支付凭证
  const handleUploadPaymentProof = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('提示', '需要相册权限才能选择图片');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setRechargeProofUri(result.assets[0].uri);
        Alert.alert('提示', '凭证已选择，请确认提交充值申请');
      }
    } catch (error) {
      LoggerService.error('Pick proof error:', error);
    }
  };

  // 🚀 修改：执行最终充值确认逻辑
  const handleConfirmRecharge = async () => {
    if (!selectedRechargeAmount || !userId) return;
    
    if (!rechargeProofUri) {
      Alert.alert('提示', t.pleaseUploadRecord);
      return;
    }

    try {
      setRefreshing(true);
      // 在实际项目中，这里应该先上传图片到存储，然后创建待审核的交易记录
      // 目前为了快速演示逻辑，直接加余额
      
      const newBalance = accountBalance + selectedRechargeAmount;

      const { error } = await supabase
        .from('users')
        .update({ 
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      // 更新本地状态和缓存
      setAccountBalance(newBalance);
      
      const currentUser = await AsyncStorage.getItem('currentUser');
      if (currentUser) {
        const user = JSON.parse(currentUser);
        const updatedUser = { ...user, balance: newBalance };
        await AsyncStorage.setItem('currentUser', JSON.stringify(updatedUser));
      }

      showToast(t.rechargeSuccess, 'success');
      setShowPaymentQRModal(false);
      setSelectedRechargeAmount(null);
      setRechargeProofUri(null);
      
      // 🚀 如果之前是普通Member且余额现在>0，刷新界面显示为VIP
      if (userType === 'customer') {
        loadUserData();
      }
    } catch (error) {
      LoggerService.error('充值失败:', error);
      showToast(t.rechargeFailed, 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      showToast(language === 'zh' ? '请填写所有密码字段' : 'Please fill all password fields', 'warning');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast(language === 'zh' ? '新密码和确认密码不匹配' : 'Passwords do not match', 'error');
      return;
    }

    try {
      const result = await customerService.changePassword(
        userId, 
        passwordForm.currentPassword, 
        passwordForm.newPassword,
        userType // 传入用户类型 (customer 或 partner)
      );

      if (result.success) {
        showToast(language === 'zh' ? '密码修改成功' : 'Password updated', 'success');
        setShowPasswordModal(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        showToast(result.error?.message || (language === 'zh' ? '修改失败' : 'Update failed'), 'error');
      }
    } catch (error) {
      LoggerService.error('修改密码失败:', error);
      showToast(language === 'zh' ? '修改失败，请重试' : 'Update failed, please try again', 'error');
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
        navigation.navigate('AddressBook');
        break;
      case 'notifications':
        navigation.navigate('NotificationCenter');
        break;
      case 'recharge': // 🚀 新增：开启充值弹窗
        setShowRechargeModal(true);
        break;
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
      LoggerService.error('加载通知设置失败:', error);
    }
  };

  // 保存通知设置
  const saveNotificationSettings = async (newSettings: typeof notificationSettings) => {
    try {
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(newSettings));
      setNotificationSettings(newSettings);
      showToast(t.settingsSaved, 'success');
    } catch (error) {
      LoggerService.error('保存通知设置失败:', error);
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
                userType === 'partner' && styles.partnerBadge,
                (accountBalance > 0 || userType === 'vip') && styles.vipBadge,
                userType === 'admin' && styles.adminBadge,
                userType === 'courier' && styles.courierBadge,
                (!userType || userType === 'customer' || userType === 'member') && !isPartnerStore && !(accountBalance > 0 || userType === 'vip') && styles.memberBadge
              ]}>
                <Text style={[
                  styles.userBadgeText,
                  userType === 'partner' && styles.partnerBadgeText,
                  (accountBalance > 0 || userType === 'vip') && styles.vipBadgeText,
                  userType === 'admin' && styles.adminBadgeText,
                  userType === 'courier' && styles.courierBadgeText,
                  (!userType || userType === 'customer' || userType === 'member') && !isPartnerStore && styles.memberBadgeText
                ]}>
                  {userType === 'partner' ? 'PARTNER' : (
                    (accountBalance > 0 || userType === 'vip') ? 'VIP' : (
                      userType === 'admin' ? t.admin : (userType === 'courier' ? t.courier : 'MEMBER')
                    )
                  )}
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
              {/* 🚀 新增：余额显示 */}
              {!isGuest && (
                <View style={[styles.contactRow, { marginTop: 4, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' }]}>
                  <Ionicons name="wallet-outline" size={16} color="#fbbf24" />
                  <Text style={[styles.userContact, { color: '#fbbf24', fontWeight: 'bold' }]}>
                    {language === 'zh' ? '账户余额' : 'Balance'}: {formatMoney(accountBalance)} MMK
                  </Text>
                </View>
              )}
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
              {formatMoney(partnerCODStats.settledCOD)} <Text style={{fontSize: 12}}>MMK</Text>
            </Text>
            <TouchableOpacity
              onPress={() => handleViewCODOrders(true)}
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
              {formatMoney(partnerCODStats.unclearedCOD)} <Text style={{fontSize: 12}}>MMK</Text>
            </Text>
            <TouchableOpacity
              onPress={() => handleViewCODOrders(false)}
              style={{
                marginTop: 8,
                paddingVertical: 6,
                paddingHorizontal: 12,
                backgroundColor: 'rgba(239, 68, 68, 0.3)',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: 'rgba(239, 68, 68, 0.5)',
              }}
            >
              <Text style={{ color: '#f87171', fontSize: 12, fontWeight: '600' }}>{t.view}</Text>
            </TouchableOpacity>
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
                {formatDateTime(partnerCODStats.lastSettledAt)}
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

  const renderMerchantServices = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t.merchantService}</Text>
      <View style={{ gap: 12 }}>
        <TouchableOpacity 
          style={styles.merchantCard}
          onPress={() => navigation.navigate('MerchantProducts', { storeId: userId })}
        >
          <LinearGradient
            colors={['rgba(16, 185, 129, 0.1)', 'rgba(16, 185, 129, 0.05)']}
            style={styles.merchantGradient}
          >
            <View style={styles.merchantIconContainer}>
              <Text style={styles.merchantIcon}>🛍️</Text>
            </View>
            <View style={styles.merchantInfo}>
              <Text style={styles.merchantTitle}>{t.myProducts}</Text>
              <Text style={styles.merchantDesc}>{t.productManageDesc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#10b981" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderBusinessManagement = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t.businessManagement}</Text>
      <View style={styles.businessCard}>
        <View style={styles.businessHeader}>
          <View style={styles.businessIconContainer}>
            <Text style={styles.businessIcon}>⏰</Text>
          </View>
          <View style={styles.businessHeaderText}>
            <Text style={styles.businessTitle}>{t.operatingHours}</Text>
            {storeInfo?.updated_at && (
              <Text style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
                ⏱️ {t.lastUpdated}: {formatDateTime(storeInfo.updated_at)}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.businessActions}>
          {/* 今日暂停营业开关 */}
          <View style={styles.businessRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.businessRowLabel}>{t.closedToday}</Text>
              <Text style={styles.businessRowDesc}>开启后用户将看到“休息中”</Text>
            </View>
            <TouchableOpacity 
              onPress={() => setBusinessStatus(prev => ({ ...prev, is_closed_today: !prev.is_closed_today }))}
              style={[
                styles.toggleContainer,
                { backgroundColor: businessStatus.is_closed_today ? '#ef4444' : '#d1d5db' }
              ]}
            >
              <View style={[
                styles.toggleCircle,
                { transform: [{ translateX: businessStatus.is_closed_today ? 24 : 2 }] }
              ]} />
            </TouchableOpacity>
          </View>

          {/* 营业时间设置 */}
          <View style={styles.timeSettingsContainer}>
            <TouchableOpacity 
              style={styles.timeInputGroup}
              onPress={() => openTimePicker('open')}
            >
              <Text style={styles.timeLabel}>{t.openingTime}</Text>
              <View style={styles.timeDisplayBox}>
                <Text style={styles.timeDisplayText}>{businessStatus.operating_hours.split(' - ')[0]}</Text>
                <Ionicons name="time-outline" size={18} color="#3b82f6" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.timeInputGroup}
              onPress={() => openTimePicker('close')}
            >
              <Text style={styles.timeLabel}>{t.closingTime}</Text>
              <View style={styles.timeDisplayBox}>
                <Text style={styles.timeDisplayText}>{businessStatus.operating_hours.split(' - ')[1] || '21:00'}</Text>
                <Ionicons name="time-outline" size={18} color="#3b82f6" />
              </View>
            </TouchableOpacity>
          </View>

          {/* 保存按钮 */}
          <TouchableOpacity 
            style={styles.businessSaveButton}
            onPress={() => handleUpdateStoreStatus(businessStatus)}
          >
            <LinearGradient
              colors={['#10b981', '#059669']}
              style={styles.businessSaveGradient}
            >
              <Ionicons name="save-outline" size={20} color="white" style={{ marginRight: 8 }} />
              <Text style={styles.businessSaveText}>{t.save}</Text>
            </LinearGradient>
          </TouchableOpacity>
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
          { label: '通知中心', icon: '🔔', action: 'notifications', color: '#8b5cf6' },
          { label: t.recharge, icon: '💰', action: 'recharge', color: '#10b981' }, // 🚀 新增：充值按钮
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
          onPress={() => navigation.navigate('NotificationCenter')}
        >
          <View style={styles.settingLeft}>
            <Text style={styles.settingIcon}>📩</Text>
            <Text style={styles.settingLabel}>{t.title === '账户' ? '消息中心' : t.title === 'Profile' ? 'Notification Center' : 'အသိပေးချက်ဗဟို'}</Text>
          </View>
          <Text style={styles.settingArrow}>›</Text>
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

        {!isGuest && (
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => setShowPasswordModal(true)}
          >
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>🔒</Text>
              <Text style={styles.settingLabel}>{t.changePassword}</Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
        )}

        {!isGuest && (
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handleDeleteAccount}
          >
            <View style={styles.settingLeft}>
              <Text style={[styles.settingIcon, { color: theme.colors.error.DEFAULT }]}>🗑️</Text>
              <Text style={[styles.settingLabel, { color: theme.colors.error.DEFAULT }]}>{t.deleteAccount}</Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1e3a8a', '#2563eb', '#f8fafc']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.4 }}
        style={StyleSheet.absoluteFill}
      />
      {/* 背景装饰性圆圈 */}
      <View style={{
        position: 'absolute',
        top: -100,
        right: -100,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        zIndex: 0
      }} />
      <View style={{
        position: 'absolute',
        top: 150,
        left: -50,
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        zIndex: 0
      }} />

      <BackToHomeButton navigation={navigation} position="topRight" color="white" />
      
      <View style={{ paddingTop: 60, paddingHorizontal: 20, marginBottom: 10 }}>
        <Text style={{ color: '#ffffff', fontSize: 32, fontWeight: '800' }}>{t.title}</Text>
        <View style={{ height: 3, width: 40, backgroundColor: '#fbbf24', borderRadius: 2, marginTop: 8 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />
        }
      >
        {renderUserCard()}
        {!isGuest && renderOrderStats()}
        {!isGuest && userType === 'partner' && renderPartnerCODStats()}
        {!isGuest && userType === 'partner' && renderBusinessManagement()}
        {!isGuest && userType === 'partner' && renderMerchantServices()}
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

      {/* 🚀 新增：自定义时间选择器模态框 */}
      <Modal
        visible={showTimePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 340, padding: 0 }]}>
            <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', textAlign: 'center' }}>{t.selectTime}</Text>
            </View>
            
            <View style={{ flexDirection: 'row', padding: 20, justifyContent: 'center', alignItems: 'center' }}>
              {/* 小时选择 */}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <ScrollView 
                  showsVerticalScrollIndicator={false} 
                  style={{ height: 150 }}
                  contentContainerStyle={{ paddingVertical: 60 }}
                  snapToInterval={30}
                >
                  {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map(h => (
                    <TouchableOpacity key={h} onPress={() => setTempHour(h)} style={{ height: 30, justifyContent: 'center' }}>
                      <Text style={{ fontSize: 20, fontWeight: tempHour === h ? '900' : '400', color: tempHour === h ? '#3b82f6' : '#94a3b8' }}>{h}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text style={{ fontSize: 24, fontWeight: 'bold', marginHorizontal: 10 }}>:</Text>

              {/* 分钟选择 */}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <ScrollView 
                  showsVerticalScrollIndicator={false} 
                  style={{ height: 150 }}
                  contentContainerStyle={{ paddingVertical: 60 }}
                  snapToInterval={30}
                >
                  {['00', '15', '30', '45'].map(m => (
                    <TouchableOpacity key={m} onPress={() => setTempMinute(m)} style={{ height: 30, justifyContent: 'center' }}>
                      <Text style={{ fontSize: 20, fontWeight: tempMinute === m ? '900' : '400', color: tempMinute === m ? '#3b82f6' : '#94a3b8' }}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={[styles.modalButtons, { padding: 16, borderTopWidth: 1, borderTopColor: '#eee' }]}>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonCancel]} onPress={() => setShowTimePicker(false)}>
                <Text style={styles.modalButtonText}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonConfirm]} onPress={handleConfirmTime}>
                <Text style={[styles.modalButtonText, styles.modalButtonTextConfirm]}>{t.confirm}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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

      {/* 修改密码模态框 */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t.changePassword}</Text>
            
            <TextInput
              style={styles.input}
              placeholder={t.currentPassword}
              placeholderTextColor="#9ca3af"
              value={passwordForm.currentPassword}
              onChangeText={(text) => setPasswordForm({ ...passwordForm, currentPassword: text })}
              secureTextEntry
            />
            
            <TextInput
              style={styles.input}
              placeholder={t.newPassword}
              placeholderTextColor="#9ca3af"
              value={passwordForm.newPassword}
              onChangeText={(text) => setPasswordForm({ ...passwordForm, newPassword: text })}
              secureTextEntry
            />
            
            <TextInput
              style={styles.input}
              placeholder={t.confirmPassword}
              placeholderTextColor="#9ca3af"
              value={passwordForm.confirmPassword}
              onChangeText={(text) => setPasswordForm({ ...passwordForm, confirmPassword: text })}
              secureTextEntry
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowPasswordModal(false)}
              >
                <Text style={styles.modalButtonText}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleChangePassword}
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
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
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
        <View style={[styles.modalOverlay, { justifyContent: 'flex-end', padding: 0 }]}>
          <View style={[styles.modalContent, { 
            maxHeight: '85%', 
            height: '85%', 
            width: '100%', 
            borderBottomLeftRadius: 0, 
            borderBottomRightRadius: 0,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 0, 
            overflow: 'hidden' 
          }]}>
            {/* 头部 */}
            <LinearGradient
              colors={['#3b82f6', '#2563eb']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 20, paddingTop: 24 }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white', marginBottom: 4 }}>
                    {t.codOrders}
                  </Text>
                  <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>
                    {selectedMonth} • {language === 'zh' ? '共' : 'Total'} {codOrdersTotal} {language === 'zh' ? '单' : 'Orders'}
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setShowCODOrdersModal(false)} 
                  style={{ 
                    padding: 8, 
                    backgroundColor: 'rgba(255,255,255,0.2)', 
                    borderRadius: 20 
                  }}
                >
                  <Ionicons name="close" size={22} color="white" />
                </TouchableOpacity>
              </View>

              {/* 搜索框 */}
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                backgroundColor: 'rgba(255,255,255,0.95)', 
                borderRadius: 12, 
                paddingHorizontal: 12,
                marginBottom: 12
              }}>
                <Ionicons name="search-outline" size={20} color="#64748b" />
                <TextInput
                  value={codOrdersSearchText}
                  onChangeText={handleSearchCODOrders}
                  placeholder={t.searchOrder}
                  placeholderTextColor="#94a3b8"
                  style={{ 
                    flex: 1, 
                    paddingVertical: 10, 
                    paddingHorizontal: 8, 
                    fontSize: 15,
                    color: '#1e293b'
                  }}
                />
                {codOrdersSearchText.length > 0 && (
                  <TouchableOpacity onPress={() => handleSearchCODOrders('')} style={{ padding: 4 }}>
                    <Ionicons name="close-circle" size={20} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>

              {/* 统计信息 */}
              {codOrders.length > 0 && (
                <View style={{ 
                  flexDirection: 'row', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  borderRadius: 12,
                  padding: 12
                }}>
                  <View>
                    <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 2 }}>
                      {language === 'zh' ? '显示' : 'Showing'} {codOrders.length} / {codOrdersTotal}
                    </Text>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: 'white' }}>
                      {t.totalAmount}: {formatMoney(calculateTotalAmount())} MMK
                    </Text>
                  </View>
                  <TouchableOpacity 
                    onPress={refreshCODOrders}
                    style={{ 
                      padding: 8, 
                      backgroundColor: 'rgba(255,255,255,0.2)', 
                      borderRadius: 8 
                    }}
                  >
                    <Ionicons name="refresh" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              )}
            </LinearGradient>
            
            <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
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
                  contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                  onEndReached={loadMoreCODOrders}
                  onEndReachedThreshold={0.2}
                  showsVerticalScrollIndicator={true}
                  refreshControl={
                    <RefreshControl
                      refreshing={codOrdersRefreshing}
                      onRefresh={refreshCODOrders}
                      colors={['#3b82f6']}
                      tintColor="#3b82f6"
                    />
                  }
                  renderItem={({ item, index }) => {
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
                        backgroundColor: 'white',
                        borderRadius: 16,
                        padding: 16,
                        marginBottom: 12,
                        ...theme.shadows.small,
                        borderLeftWidth: 4,
                        borderLeftColor: '#3b82f6'
                      }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                              <View style={{ 
                                width: 32, 
                                height: 32, 
                                borderRadius: 16, 
                                backgroundColor: '#eff6ff', 
                                justifyContent: 'center', 
                                alignItems: 'center',
                                marginRight: 10
                              }}>
                                <Ionicons name="cube" size={18} color="#3b82f6" />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>
                                  {t.orderId}
                                </Text>
                                <Text style={{ color: theme.colors.text.primary, fontSize: 16, fontWeight: '700', fontFamily: 'monospace' }}>
                                  {item.orderId}
                                </Text>
                              </View>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                              <Ionicons name="time-outline" size={14} color="#94a3b8" style={{ marginRight: 6 }} />
                              <Text style={{ color: theme.colors.text.tertiary, fontSize: 12 }}>
                                {formatDate(item.deliveryTime)}
                              </Text>
                            </View>
                          </View>
                          <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
                            <View style={{ 
                              backgroundColor: '#eff6ff',
                              borderRadius: 12,
                              padding: 12,
                              minWidth: 100,
                              alignItems: 'center'
                            }}>
                              <Text style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                                {t.codAmount}
                              </Text>
                              <Text style={{ color: '#3b82f6', fontSize: 20, fontWeight: 'bold', lineHeight: 24 }}>
                                {formatMoney(item.codAmount)}
                              </Text>
                              <Text style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>
                                MMK
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  }}
                  ListEmptyComponent={
                    <View style={{ padding: 60, alignItems: 'center', marginTop: 40 }}>
                      <LinearGradient
                        colors={['#f1f5f9', '#e2e8f0']}
                        style={{ 
                          width: 100, 
                          height: 100, 
                          borderRadius: 50, 
                          justifyContent: 'center', 
                          alignItems: 'center',
                          marginBottom: 20
                        }}
                      >
                        <Ionicons name="receipt-outline" size={50} color="#94a3b8" />
                      </LinearGradient>
                      <Text style={{ color: theme.colors.text.secondary, fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
                        {codOrdersSearchText.trim() 
                          ? (language === 'zh' ? '未找到匹配的订单' : language === 'en' ? 'No matching orders' : 'အော်ဒါမတွေ့ရှိပါ')
                          : (language === 'zh' ? '本月暂无代收款订单' : language === 'en' ? 'No COD orders this month' : 'အော်ဒါမရှိပါ')
                        }
                      </Text>
                      {codOrdersSearchText.trim() && (
                        <TouchableOpacity 
                          onPress={() => handleSearchCODOrders('')}
                          style={{ marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#3b82f6', borderRadius: 8 }}
                        >
                          <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>
                            {language === 'zh' ? '清除搜索' : language === 'en' ? 'Clear Search' : 'ရှာဖွေမှုရှင်းလင်းရန်'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  }
                  ListFooterComponent={
                    codOrdersLoadingMore ? (
                      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                        <ActivityIndicator size="small" color="#3b82f6" />
                        <Text style={{ marginTop: 8, color: '#94a3b8', fontSize: 12 }}>{t.loading}</Text>
                      </View>
                    ) : (allCodOrders.length >= codOrdersTotal && codOrdersTotal > 0 && !codOrdersSearchText.trim()) ? (
                      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                        <View style={{ 
                          width: 40, 
                          height: 40, 
                          borderRadius: 20, 
                          backgroundColor: '#f1f5f9', 
                          justifyContent: 'center', 
                          alignItems: 'center',
                          marginBottom: 8
                        }}>
                          <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                        </View>
                        <Text style={{ textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                          {t.noMoreData}
                        </Text>
                      </View>
                    ) : null
                  }
                />
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* 🚀 新增：充值余额模态框 */}
      <Modal
        visible={showRechargeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRechargeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { padding: 0, overflow: 'hidden' }]}>
            <LinearGradient
              colors={['#1e3a8a', '#2563eb']}
              style={{ padding: 20, alignItems: 'center' }}
            >
              <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>💰 {t.recharge}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>{t.rechargeDesc}</Text>
            </LinearGradient>

            <View style={{ padding: 20 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: '#1e293b' }}>{t.rechargeCard}</Text>
              
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' }}>
                {[
                  { amount: 10000, label: '10,000', tip: null },
                  { amount: 50000, label: '50,000', tip: null },
                  { amount: 100000, label: '100,000', tip: t.discount5 },
                  { amount: 300000, label: '300,000', tip: t.discount10 },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.amount}
                    onPress={() => setSelectedRechargeAmount(item.amount)}
                    style={{
                      width: (width * 0.9 - 52) / 2,
                      padding: 16,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: selectedRechargeAmount === item.amount ? '#3b82f6' : '#f1f5f9',
                      backgroundColor: selectedRechargeAmount === item.amount ? '#eff6ff' : 'white',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: selectedRechargeAmount === item.amount ? '#3b82f6' : '#1e293b' }}>
                      {item.label}
                    </Text>
                    <Text style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>MMK</Text>
                    {item.tip && (
                      <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 8 }}>
                        <Text style={{ fontSize: 9, color: '#d97706', fontWeight: 'bold' }}>{item.tip}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => {
                    setShowRechargeModal(false);
                    setSelectedRechargeAmount(null);
                  }}
                >
                  <Text style={styles.modalButtonText}>{t.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton, 
                    styles.modalButtonConfirm,
                    !selectedRechargeAmount && { opacity: 0.5 }
                  ]}
                  disabled={!selectedRechargeAmount || refreshing}
                  onPress={handleOpenPaymentQR}
                >
                  <Text style={[styles.modalButtonText, styles.modalButtonTextConfirm]}>
                    {t.confirm}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* 🚀 新增：支付二维码模态框 */}
      <Modal
        visible={showPaymentQRModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaymentQRModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { padding: 0, overflow: 'hidden' }]}>
            <LinearGradient
              colors={['#1e3a8a', '#2563eb']}
              style={{ padding: 20, alignItems: 'center' }}
            >
              <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>{t.paymentQRTitle}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
                {selectedRechargeAmount?.toLocaleString()} MMK
              </Text>
            </LinearGradient>

            <View style={{ padding: 20, alignItems: 'center' }}>
              <View style={{ width: 220, height: 220, backgroundColor: '#f8fafc', borderRadius: 15, padding: 10, marginBottom: 20, justifyContent: 'center', alignItems: 'center' }}>
                {/* 🚀 使用预定义的映射显示二维码 */}
                {selectedRechargeAmount && RECHARGE_QR_IMAGES[selectedRechargeAmount] ? (
                  <Image 
                    source={RECHARGE_QR_IMAGES[selectedRechargeAmount]} 
                    style={{ width: '100%', height: '100%' }} 
                    resizeMode="contain" 
                  />
                ) : (
                  <View style={{ alignItems: 'center' }}>
                    <Ionicons name="qr-code-outline" size={120} color="#cbd5e1" />
                    <Text style={{ marginTop: 10, color: '#94a3b8', fontSize: 12, textAlign: 'center' }}>
                      {language === 'zh' ? '加载中...' : 'Loading...'}
                    </Text>
                  </View>
                )}
              </View>

              <TouchableOpacity 
                onPress={handleUploadPaymentProof}
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  backgroundColor: '#f1f5f9', 
                  padding: 12, 
                  borderRadius: 12, 
                  width: '100%', 
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: rechargeProofUri ? '#10b981' : '#e2e8f0',
                  marginBottom: 20
                }}
              >
                <Ionicons name={rechargeProofUri ? "checkmark-circle" : "cloud-upload-outline"} size={24} color={rechargeProofUri ? "#10b981" : "#3b82f6"} />
                <Text style={{ marginLeft: 8, fontWeight: 'bold', color: rechargeProofUri ? "#10b981" : "#1e293b" }}>
                  {rechargeProofUri ? (language === 'zh' ? '凭证已选择' : 'Proof Selected') : t.uploadPaymentRecord}
                </Text>
              </TouchableOpacity>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => {
                    setShowPaymentQRModal(false);
                    setRechargeProofUri(null);
                  }}
                >
                  <Text style={styles.modalButtonText}>{t.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton, 
                    styles.modalButtonConfirm,
                    !rechargeProofUri && { opacity: 0.5 }
                  ]}
                  disabled={!rechargeProofUri || refreshing}
                  onPress={handleConfirmRecharge}
                >
                  {refreshing ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text style={[styles.modalButtonText, styles.modalButtonTextConfirm]}>
                      {t.confirmRecharge}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
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
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
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
    borderRadius: 24,
    padding: theme.spacing.l,
    marginBottom: theme.spacing.xl,
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
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
    backgroundColor: '#3b82f6', // 蓝色背景
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  partnerBadgeText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  vipBadge: {
    backgroundColor: '#fbbf24', // 金色背景
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  vipBadgeText: {
    color: '#92400e', // 深褐色文字
    fontWeight: '800',
  },
  adminBadge: {
    backgroundColor: '#f97316', // 橙色背景
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  adminBadgeText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  courierBadge: {
    backgroundColor: '#a855f7', // 紫色背景
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  courierBadgeText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  memberBadge: {
    backgroundColor: '#3b82f6', // 蓝色背景
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  memberBadgeText: {
    color: '#ffffff',
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
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
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
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
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
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
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
  merchantCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: theme.colors.background.paper,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    ...theme.shadows.small,
  },
  merchantGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  merchantIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  merchantIcon: {
    fontSize: 24,
  },
  merchantInfo: {
    flex: 1,
  },
  merchantTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  merchantDesc: {
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  // 🚀 营业管理样式
  businessCard: {
    backgroundColor: theme.colors.background.paper,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.l,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    ...theme.shadows.medium,
  },
  businessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 15,
  },
  businessIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  businessIcon: {
    fontSize: 24,
  },
  businessHeaderText: {
    flex: 1,
  },
  businessTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  businessDesc: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
  },
  businessActions: {
    gap: 16,
  },
  businessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 16,
  },
  businessRowLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  businessRowDesc: {
    fontSize: 11,
    color: theme.colors.text.tertiary,
  },
  toggleContainer: {
    width: 50,
    height: 26,
    borderRadius: 13,
    padding: 2,
    justifyContent: 'center',
  },
  toggleCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'white',
    ...theme.shadows.small,
  },
  timeSettingsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  timeInputGroup: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    marginBottom: 6,
    marginLeft: 4,
  },
  timeDisplayBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  timeDisplayText: {
    fontSize: 16,
    fontWeight: '900',
    color: theme.colors.text.primary,
  },
  businessSaveButton: {
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
    ...theme.shadows.small,
  },
  businessSaveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  businessSaveText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

