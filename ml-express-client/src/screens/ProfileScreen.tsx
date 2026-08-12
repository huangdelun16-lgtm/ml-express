import React, { useState, useEffect, useRef, useCallback } from 'react';
import LoggerService from './../services/LoggerService';
import { profileTranslations } from './profile/profileTranslations';
import { profileStyles as styles } from './profile/profileStyles';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Alert, Modal, TextInput, Switch, Dimensions, Linking, FlatList, ActivityIndicator, Image, Animated, PanResponder } from 'react-native';
import { Platform } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Vibration } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { ensureSaveToLibraryPermission, pickImageFromLibrary } from '../utils/mediaAccess';
import * as FileSystem from 'expo-file-system';
import { useApp } from '../contexts/AppContext';
import { useLoading } from '../contexts/LoadingContext';
import { customerService, packageService, rechargeService, supabase, fetchRechargeQrUrlMap, getDefaultRechargeQrUrlMap } from '../services/supabase';
import Toast from '../components/Toast';
import BackToHomeButton from '../components/BackToHomeButton';
import { theme } from '../config/theme';
import Skeleton, { StatsCardSkeleton } from '../components/Skeleton';
import { feedbackService } from '../services/FeedbackService';
import {
  checkAndroidAppUpdate,
  checkExpoOtaUpdateAvailable,
  downloadAndApplyExpoOtaUpdate,
  getInstalledBuildVersion,
  getIosAppStoreUrl,
  openAndroidApkDownload,
  openIosAppStore,
} from '../services/appUpdateService';

const { width } = Dimensions.get('window');

const MERCHANT_SESSION_KEYS = [
  'currentUser',
  'userId',
  'userEmail',
  'userName',
  'userPhone',
  'userType',
  'currentStoreCode',
  'currentSessionId',
];

function isMerchantUserType(userType: unknown): boolean {
  const value = String(userType || '').toLowerCase();
  return value === 'merchant' || value === 'merchants' || value === 'partner';
}

function formatUpdateMessage(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? '');
}

export default function ProfileScreen({ navigation }: any) {
  const { language, setLanguage, isDarkMode, setIsDarkMode, isGuest, setIsGuest } = useApp();
  const { showLoading, hideLoading } = useLoading(); // 🚀 新增：加载状态控制
  const appVersion = Constants.expoConfig?.version ?? '1.1.0';
  const buildVersion = getInstalledBuildVersion();
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [userName, setUserName] = useState<string>('访客用户');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userPhone, setUserPhone] = useState<string>('');
  const [accountBalance, setAccountBalance] = useState<number>(0); // 🚀 新增：账户余额
  const [userType, setUserType] = useState<string>('customer');
  const [orderStats, setOrderStats] = useState({
    total: 0,
    pending: 0,
    inTransit: 0,
    delivered: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

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
  const [checkingAppUpdate, setCheckingAppUpdate] = useState(false);

  // 🚀 新增：充值模态框状态
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [selectedRechargeAmount, setSelectedRechargeAmount] = useState<number | null>(null);
  
  // 🚀 新增：支付二维码模态框状态
  const [showPaymentQRModal, setShowPaymentQRModal] = useState(false);
  const [rechargeProofUri, setRechargeProofUri] = useState<string | null>(null);
  const [rechargeQrImages, setRechargeQrImages] = useState<Record<number, string>>(() => getDefaultRechargeQrUrlMap());

  const [isSavingProfile, setIsSavingProfile] = useState(false);

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

  // 🚀 新增：用于捕获二维码的 Ref
  const qrCodeRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    fetchRechargeQrUrlMap().then((map) => {
      if (!cancelled) setRechargeQrImages(map);
    });
    return () => {
      cancelled = true;
    };
  }, []);


  // 🚀 新增：格式化函数（React Native 中 toLocaleString 可能不兼容）
  const formatMoney = (amount: number | string) => {
    const num = Number(amount) || 0;
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  // 多语言翻译
  const translations = profileTranslations;
  const t = translations[language as keyof typeof translations];
  const cancelLabel = language === 'zh' ? '取消' : language === 'en' ? 'Cancel' : 'ပယ်မည်';

  const handleCheckAppUpdate = () => {
    if (checkingAppUpdate) return;
    if (__DEV__) {
      Alert.alert(t.updateTip, t.updateDevTip);
      return;
    }
    setCheckingAppUpdate(true);
    void (async () => {
      try {
        if (Platform.OS === 'android') {
          const result = await checkAndroidAppUpdate();
          if (!result.latest) {
            Alert.alert(t.updateTip, t.updateNoReleaseConfig);
            return;
          }
          if (!result.hasUpdate) {
            Alert.alert(
              t.updateUpToDateTitle,
              formatUpdateMessage(t.updateUpToDateBody, {
                current: result.currentVersion,
                code: String(result.currentVersionCode),
              }),
            );
            return;
          }
          const latest = result.latest;
          Alert.alert(
            t.updateAvailableTitle,
            formatUpdateMessage(t.updateAvailableBody, {
              current: result.currentVersion,
              code: String(result.currentVersionCode),
              latest: latest.version,
              latestCode: String(latest.versionCode),
              notes: latest.releaseNotes || '—',
            }),
            [
              { text: cancelLabel, style: 'cancel' },
              {
                text: t.updateDownload,
                onPress: () => {
                  void openAndroidApkDownload(latest.apkUrl).catch((e: unknown) => {
                    Alert.alert(
                      t.updateCheckFailed,
                      e instanceof Error ? e.message : String(e),
                    );
                  });
                },
              },
            ],
          );
          return;
        }

        const otaAvailable = await checkExpoOtaUpdateAvailable();
        if (otaAvailable) {
          Alert.alert(t.updateOtaAvailableTitle, t.updateOtaAvailableBody, [
            { text: cancelLabel, style: 'cancel' },
            {
              text: t.updateOtaApply,
              onPress: () => {
                void downloadAndApplyExpoOtaUpdate().catch((e: unknown) => {
                  Alert.alert(
                    t.updateCheckFailed,
                    e instanceof Error ? e.message : String(e),
                  );
                });
              },
            },
          ]);
          return;
        }

        const storeButtons = getIosAppStoreUrl()
          ? [
              {
                text: t.updateOpenStore,
                onPress: () => {
                  void openIosAppStore().catch((e: unknown) => {
                    Alert.alert(
                      t.updateCheckFailed,
                      e instanceof Error ? e.message : String(e),
                    );
                  });
                },
              },
            ]
          : [];

        Alert.alert(
          t.updateUpToDateTitle,
          formatUpdateMessage(t.updateUpToDateBodyIos, {
            current: appVersion,
            code: buildVersion,
          }),
          [{ text: cancelLabel, style: 'cancel' }, ...storeButtons],
        );
      } catch (e: unknown) {
        Alert.alert(
          t.updateCheckFailed,
          e instanceof Error ? e.message : String(e),
        );
      } finally {
        setCheckingAppUpdate(false);
      }
    })();
  };

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

      let detectedUserType = user.user_type || 'customer';
      if (detectedUserType === 'merchants') detectedUserType = 'merchant';

      if (isMerchantUserType(detectedUserType)) {
        await AsyncStorage.multiRemove(MERCHANT_SESSION_KEYS);
        feedbackService.info(
          language === 'en'
            ? 'Merchant accounts use MARKET LINK MERCHANT. Please sign in there.'
            : language === 'my'
              ? 'ဆိုင်အကောင့်များကို Merchant App တွင်သာ အသုံးပြုပါ။'
              : '商家账号请使用商家端 App 登录。'
        );
        setIsGuest(true);
        setUserId('');
        setUserName(t.guest);
        setUserEmail('');
        setUserPhone('');
        setAccountBalance(0);
        setUserType('customer');
        navigation.replace('Login');
        return;
      }

      setIsGuest(false);
      setUserId(user.id);
      setUserName(user.name || t.guest);
      setUserEmail(user.email || '');
      setUserPhone(user.phone || '');
      setAccountBalance(user.balance || 0);

      let finalUserType = detectedUserType;
      if (detectedUserType === 'customer' && (user.balance || 0) > 0) {
        finalUserType = 'vip';
      }
      setUserType(finalUserType);

      if (user.id && user.id !== 'guest') {
        try {
          const { data: latestRaw, error: userError } = await supabase
            .from('users')
            .select('balance, user_type, name, phone, email')
            .eq('id', user.id)
            .limit(1)
            .maybeSingle();

          if (!userError && latestRaw) {
            const updatedBalance = Number(latestRaw.balance) || 0;
            setAccountBalance(updatedBalance);

            let finalType = latestRaw.user_type || 'customer';
            if (finalType === 'merchants') finalType = 'merchant';

            if (finalType === 'customer' && updatedBalance > 0) {
              finalType = 'vip';
            }
            setUserType(finalType);
            setUserName(latestRaw.name || '');
            setUserEmail(latestRaw.email || '');
            setUserPhone(latestRaw.phone || '');

            const currentUserStr = await AsyncStorage.getItem('currentUser');
            if (currentUserStr) {
              const localUser = JSON.parse(currentUserStr);
              const mergedUser = { ...localUser, ...latestRaw };
              await AsyncStorage.setItem('currentUser', JSON.stringify(mergedUser));
            }
          } else if (userError) {
            console.warn('⚠️ 同步用户信息失败:', userError.message);
          }
        } catch (error) {
          console.warn('❌ 获取最新用户信息异常:', error);
        }

        setLoadingStats(true);
        const stats = await packageService.getOrderStats(
          user.id,
          user.email,
          user.phone,
          detectedUserType,
        );
        setOrderStats(stats);
        setLoadingStats(false);
      }
    } catch (error) {
      LoggerService.error('加载用户数据失败:', error);
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
    if (!editForm.name || !editForm.phone) {
      showToast(language === 'zh' ? '请填写姓名和电话' : 'Please fill name and phone', 'warning');
      return;
    }

    try {
      setIsSavingProfile(true);
      const result = await customerService.updateUser(userId, {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        address: editForm.address,
      }, userType);

      if (result.success) {
        setUserName(editForm.name);
        setUserEmail(editForm.email);
        setUserPhone(editForm.phone);
        
        // 更新本地存储
        await AsyncStorage.setItem('userName', editForm.name);
        await AsyncStorage.setItem('userEmail', editForm.email);
        await AsyncStorage.setItem('userPhone', editForm.phone);
        
        const currentUserStr = await AsyncStorage.getItem('currentUser');
        if (currentUserStr) {
          const user = JSON.parse(currentUserStr);
          const updatedUser = { 
            ...user, 
            name: editForm.name, 
            email: editForm.email, 
            phone: editForm.phone,
            address: editForm.address 
          };
          await AsyncStorage.setItem('currentUser', JSON.stringify(updatedUser));
        }

        showToast(t.updateSuccess, 'success');
        setShowEditModal(false);
      } else {
        showToast(result.error?.message || t.updateFailed, 'error');
      }
    } catch (error) {
      LoggerService.error('保存个人资料失败:', error);
      showToast(t.updateFailed, 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // 🚀 修改：开启支付二维码显示
  const handleOpenPaymentQR = () => {
    if (!selectedRechargeAmount) return;
    setShowRechargeModal(false);
    setShowPaymentQRModal(true);
    fetchRechargeQrUrlMap().then(setRechargeQrImages);
  };

  // 🚀 新增：保存二维码到本机
  const handleSaveQRCode = async (amount: number) => {
    Vibration.vibrate(50); // 🚀 点击反馈
    try {
      console.log('🚀 开始保存二维码...', amount);
      showLoading(language === 'zh' ? '正在保存...' : 'Saving...', 'package');
      
      const granted = await ensureSaveToLibraryPermission();
      if (!granted) {
        hideLoading();
        Alert.alert('提示', '需要相册权限才能保存图片');
        return;
      }

      // 🚀 优化方案：使用 captureRef 捕获组件视图，避开 FileSystem 下载问题
      if (!qrCodeRef.current) {
        throw new Error('无法找到二维码引用');
      }

      console.log('正在截图二维码视图...');
      const localUri = await captureRef(qrCodeRef, {
        format: 'png',
        quality: 1.0,
      });
      
      if (localUri) {
        console.log('正在保存到相册...', localUri);
        await MediaLibrary.saveToLibraryAsync(localUri);
        
        hideLoading();
        Alert.alert(
          language === 'zh' ? '保存成功' : 'Saved!',
          language === 'zh' ? '收款码已保存到您的相册，请打开 KBZPay 支付' : 'QR code saved to gallery, please pay with KBZPay'
        );
      } else {
        throw new Error('截图失败');
      }
    } catch (error: any) {
      hideLoading();
      console.error('保存二维码失败详情:', error);
      LoggerService.error('保存二维码失败:', error);
      Alert.alert('保存失败', `原因: ${error?.message || '未知错误'}`);
    }
  };

  // 🚀 新增：上传支付凭证
  const handleUploadPaymentProof = async () => {
    try {
      const result = await pickImageFromLibrary({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
      });

      if (result.canceled && result.assets === null) {
        Alert.alert('提示', '需要相册权限才能选择图片');
        return;
      }

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
    Vibration.vibrate(50); // 🚀 点击反馈
    console.log('🚀 开始提交充值申请...');
    
    if (!selectedRechargeAmount || !userId) {
      console.warn('缺少必要信息:', { selectedRechargeAmount, userId });
      Alert.alert('提示', '用户信息已丢失，请重新登录');
      return;
    }
    
    if (!rechargeProofUri) {
      console.warn('未选择汇款凭证');
      Alert.alert('提示', t.pleaseUploadRecord);
      return;
    }

    try {
      showLoading(language === 'zh' ? '正在提交申请...' : 'Submitting...', 'package');
      console.log('正在准备上传凭证:', rechargeProofUri);
      Alert.alert('提示', '正在上传凭证，请稍候...');
      
      // 1. 上传图片到 Supabase Storage
      const proofUrl = await rechargeService.uploadProof(userId, rechargeProofUri);
      
      if (!proofUrl) {
        console.error('凭证上传失败，返回为空');
        throw new Error('Upload failed - URL is empty');
      }

      console.log('凭证上传成功，准备创建数据库记录:', proofUrl);

      // 2. 创建充值记录申请
      const requestResult = await rechargeService.createRequest({
        user_id: userId,
        user_name: userName,
        amount: selectedRechargeAmount,
        proof_url: proofUrl,
        status: 'pending',
        notes: `充值卡金额: ${selectedRechargeAmount} MMK`
      });

      if (!requestResult.success) {
        console.error('数据库记录创建失败:', requestResult.error);
        throw new Error(`Request creation failed: ${JSON.stringify(requestResult.error)}`);
      }

      console.log('✅ 充值申请已成功存入数据库');

      hideLoading();
      Alert.alert(
        language === 'zh' ? '提交成功' : 'Submitted',
        language === 'zh' ? '您的充值申请已提交，管理员审核通过后余额将自动到账。' : 'Your recharge request has been submitted. Balance will be updated after admin review.',
        [{ text: t.confirm, onPress: () => setShowPaymentQRModal(false) }]
      );
      
      setSelectedRechargeAmount(null);
      setRechargeProofUri(null);
      
    } catch (error: any) {
      hideLoading();
      console.error('充值流程全面报错:', error);
      LoggerService.error('充值提交全面失败:', error?.message || error);
      
      let errorMsg = error?.message || '未知错误';
      if (errorMsg.includes('Network request failed')) {
        errorMsg = '网络连接失败，请检查您的网络设置';
      }

      Alert.alert(
        language === 'zh' ? '提交失败' : 'Failed',
        language === 'zh' ? `充值申请提交失败，请联系客服。\n错误详情: ${errorMsg}` : `Submission failed.\nError: ${errorMsg}`
      );
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
        userType // 传入用户类型 (customer 或 merchants)
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
        showToast(language === 'zh' ? '即将推出' : 'Coming soon', 'info');
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
      colors={theme.colors.gradients.blue as [string, string]}
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
                (accountBalance > 0 || userType === 'vip') && styles.vipBadge,
                userType === 'admin' && styles.adminBadge,
                userType === 'courier' && styles.courierBadge,
                (!userType || userType === 'customer' || userType === 'member') && !(accountBalance > 0 || userType === 'vip') && styles.memberBadge
              ]}>
                <Text style={[
                  styles.userBadgeText,
                  (accountBalance > 0 || userType === 'vip') && styles.vipBadgeText,
                  userType === 'admin' && styles.adminBadgeText,
                  userType === 'courier' && styles.courierBadgeText,
                  (!userType || userType === 'customer' || userType === 'member') && styles.memberBadgeText
                ]}>
                  {(accountBalance > 0 || userType === 'vip') ? 'VIP' : (
                    userType === 'admin' ? t.admin : (userType === 'courier' ? t.courier : 'MEMBER')
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
        {loadingStats ? (
          <>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </>
        ) : (
          [
            { label: t.totalOrders, value: orderStats.total, color: '#3b82f6', icon: '📦' },
            { label: t.pendingOrders, value: orderStats.pending, color: '#f59e0b', icon: '⏳' },
            { label: t.inTransitOrders, value: orderStats.inTransit, color: '#8b5cf6', icon: '🚚' },
            { label: t.deliveredOrders, value: orderStats.delivered, color: '#10b981', icon: '✅' },
          ].map((stat, index) => (
            <TouchableOpacity
              key={index}
              style={styles.statCard}
              onPress={() => navigation.navigate('MyOrders')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[stat.color, `${stat.color}dd`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.statGradient}
              >
                <View style={styles.statContent}>
                  <Text style={stat.icon === '📦' ? styles.statIcon : styles.statIconSmall}>{stat.icon}</Text>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))
        )}
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
      <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>{t.settings}</Text>
      <View style={[styles.settingsList, isDarkMode && styles.darkSettingsList]}>
        {/* 语言设置 */}
        <TouchableOpacity style={[styles.settingItem, isDarkMode && styles.darkSettingItem]}>
          <View style={styles.settingLeft}>
            <Text style={styles.settingIcon}>🌐</Text>
            <Text style={[styles.settingLabel, isDarkMode && styles.darkText]}>{t.language}</Text>
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

        {/* 🚀 深色模式切换 */}
        <View style={[styles.settingItem, isDarkMode && styles.darkSettingItem]}>
          <View style={styles.settingLeft}>
            <Text style={styles.settingIcon}>{isDarkMode ? '🌙' : '☀️'}</Text>
            <Text style={[styles.settingLabel, isDarkMode && styles.darkText]}>{language === 'zh' ? '深色模式' : 'Dark Mode'}</Text>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={setIsDarkMode}
            trackColor={{ false: '#cbd5e1', true: '#1e3a8a' }}
            thumbColor={isDarkMode ? '#3b82f6' : '#f4f3f4'}
          />
        </View>

        {/* 消息中心 */}
        <TouchableOpacity 
          style={[styles.settingItem, isDarkMode && styles.darkSettingItem]}
          onPress={() => navigation.navigate('NotificationCenter')}
        >
          <View style={styles.settingLeft}>
            <Text style={styles.settingIcon}>📩</Text>
            <Text style={[styles.settingLabel, isDarkMode && styles.darkText]}>{t.title === '账户' ? '消息中心' : t.title === 'Profile' ? 'Notification Center' : 'အသိပေးချက်ဗဟို'}</Text>
          </View>
          <Text style={[styles.settingArrow, isDarkMode && styles.darkText]}>›</Text>
        </TouchableOpacity>

        {/* 通知设置 */}
        <TouchableOpacity 
          style={[styles.settingItem, isDarkMode && styles.darkSettingItem]}
          onPress={openNotificationSettings}
        >
          <View style={styles.settingLeft}>
            <Text style={styles.settingIcon}>🔔</Text>
            <Text style={[styles.settingLabel, isDarkMode && styles.darkText]}>{t.notifications}</Text>
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
            <Text style={[styles.settingArrow, isDarkMode && styles.darkText]}>›</Text>
          </View>
        </TouchableOpacity>

        {/* 关于我们 */}
        <TouchableOpacity 
          style={[styles.settingItem, isDarkMode && styles.darkSettingItem]}
          onPress={() => setShowAboutModal(true)}
        >
          <View style={styles.settingLeft}>
            <Text style={styles.settingIcon}>ℹ️</Text>
            <Text style={[styles.settingLabel, isDarkMode && styles.darkText]}>{t.aboutUs}</Text>
          </View>
          <Text style={[styles.settingArrow, isDarkMode && styles.darkText]}>›</Text>
        </TouchableOpacity>

        {/* 修改密码 */}
        {!isGuest && (
          <TouchableOpacity 
            style={[styles.settingItem, isDarkMode && styles.darkSettingItem]}
            onPress={() => setShowPasswordModal(true)}
          >
            <View style={styles.settingLeft}>
              <Text style={styles.settingIcon}>🔒</Text>
              <Text style={[styles.settingLabel, isDarkMode && styles.darkText]}>{t.changePassword}</Text>
            </View>
            <Text style={[styles.settingArrow, isDarkMode && styles.darkText]}>›</Text>
          </TouchableOpacity>
        )}

        {/* 注销账号 */}
        {!isGuest && (
          <TouchableOpacity 
            style={[styles.settingItem, isDarkMode && styles.darkSettingItem]}
            onPress={handleDeleteAccount}
          >
            <View style={styles.settingLeft}>
              <Text style={[styles.settingIcon, { color: theme.colors.error.DEFAULT }]}>🗑️</Text>
              <Text style={[styles.settingLabel, { color: theme.colors.error.DEFAULT }]}>{t.deleteAccount}</Text>
            </View>
            <Text style={[styles.settingArrow, isDarkMode && styles.darkText]}>›</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      <LinearGradient
        colors={isDarkMode ? ['#0f172a', '#1e293b', '#0f172a'] : ['#1e3a8a', '#2563eb', '#f8fafc']}
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

      <View style={{ paddingTop: 60, paddingHorizontal: 20, marginBottom: 10 }}>
        <Text style={{ color: '#ffffff', fontSize: 32, fontWeight: '800' }}>{t.title}</Text>
        <View style={{ height: 3, width: 40, backgroundColor: '#fbbf24', borderRadius: 2, marginTop: 8 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} tintColor={isDarkMode ? '#ffffff' : '#3b82f6'} />
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
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={[styles.modalOverlay, { justifyContent: 'center', backgroundColor: 'rgba(15, 23, 42, 0.7)' }]}>
          <View style={[styles.modalContent, { borderRadius: 32, padding: 0, overflow: 'hidden', backgroundColor: '#ffffff' }]}>
            <LinearGradient
              colors={['#1e3a8a', '#2563eb']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="person-outline" size={24} color="white" />
                </View>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: 'white' }}>{t.editProfile}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={{ padding: 24 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={{ gap: 20, marginBottom: 24 }}>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748b', marginBottom: 8, marginLeft: 4 }}>{language === 'zh' ? '姓名 / 店名' : 'Full Name'}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 16 }}>
                    <Ionicons name="person-outline" size={20} color="#94a3b8" />
                    <TextInput
                      style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 12, fontSize: 16, color: '#1e293b' }}
                      placeholder={t.name}
                      placeholderTextColor="#9ca3af"
                      value={editForm.name}
                      onChangeText={(text) => setEditForm({ ...editForm, name: text })}
                    />
                  </View>
                </View>

                <View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748b', marginBottom: 8, marginLeft: 4 }}>{language === 'zh' ? '电子邮箱' : 'Email Address'}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 16 }}>
                    <Ionicons name="mail-outline" size={20} color="#94a3b8" />
                    <TextInput
                      style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 12, fontSize: 16, color: '#1e293b' }}
                      placeholder={t.email}
                      placeholderTextColor="#9ca3af"
                      value={editForm.email}
                      onChangeText={(text) => setEditForm({ ...editForm, email: text })}
                      keyboardType="email-address"
                    />
                  </View>
                </View>

                <View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748b', marginBottom: 8, marginLeft: 4 }}>{language === 'zh' ? '联系电话' : 'Phone Number'}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 16 }}>
                    <Ionicons name="call-outline" size={20} color="#94a3b8" />
                    <TextInput
                      style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 12, fontSize: 16, color: '#1e293b' }}
                      placeholder={t.phone}
                      placeholderTextColor="#9ca3af"
                      value={editForm.phone}
                      onChangeText={(text) => setEditForm({ ...editForm, phone: text })}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                <View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748b', marginBottom: 8, marginLeft: 4 }}>{language === 'zh' ? '详细地址' : 'Address'}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#f8fafc', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 16, paddingTop: 12 }}>
                    <Ionicons name="location-outline" size={20} color="#94a3b8" style={{ marginTop: 2 }} />
                    <TextInput
                      style={{ flex: 1, paddingBottom: 14, paddingHorizontal: 12, fontSize: 16, color: '#1e293b', minHeight: 80, textAlignVertical: 'top' }}
                      placeholder={t.address}
                      placeholderTextColor="#9ca3af"
                      value={editForm.address}
                      onChangeText={(text) => setEditForm({ ...editForm, address: text })}
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 40 }}>
                <TouchableOpacity
                  style={{ flex: 1, height: 56, borderRadius: 16, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' }}
                  onPress={() => setShowEditModal(false)}
                >
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#64748b' }}>{t.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 2, height: 56, borderRadius: 16, overflow: 'hidden' }}
                  onPress={handleSaveProfile}
                  disabled={isSavingProfile}
                >
                  <LinearGradient
                    colors={['#3b82f6', '#2563eb']}
                    style={{ flex: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 }}
                  >
                    {isSavingProfile ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <>
                        <Ionicons name="save-outline" size={20} color="white" />
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: 'white' }}>{t.save}</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
                <LinearGradient
                  colors={['#3b82f6', '#2563eb']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalButtonGradient}
                >
                  <Text style={[styles.modalButtonText, styles.modalButtonTextConfirm]}>
                    {t.save}
                  </Text>
                </LinearGradient>
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
                <View style={styles.aboutVersionRow}>
                  <Text style={styles.aboutSectionValue}>
                    v{appVersion} ({buildVersion})
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.aboutUpdateBtn,
                      checkingAppUpdate && styles.aboutUpdateBtnDisabled,
                    ]}
                    onPress={handleCheckAppUpdate}
                    disabled={checkingAppUpdate}
                    activeOpacity={0.85}
                  >
                    {checkingAppUpdate ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.aboutUpdateBtnText}>{t.checkForUpdate}</Text>
                    )}
                  </TouchableOpacity>
                </View>
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
                  onPress={() => {
                    const numbers = [
                      { display: '(+95) 09788848928', tel: '+959788848928' },
                      { display: '(+95) 09941118588', tel: '+959941118588' },
                      { display: '(+95) 09941118688', tel: '+959941118688' }
                    ];
                    Alert.alert(
                      language === 'zh' ? '选择拨打的客服热线' : language === 'en' ? 'Choose a hotline number' : 'ဖုန်းနံပါတ်ကို ရွေးချယ်ပါ',
                      '',
                      [
                        ...numbers.map(n => ({
                          text: n.display,
                          onPress: () => Linking.openURL(`tel:${n.tel}`)
                        })),
                        { text: language === 'zh' ? '取消' : 'Cancel', style: 'cancel' }
                      ]
                    );
                  }}
                >
                  <Text style={styles.aboutLinkText}>📞 {t.contactPhone}</Text>
                  <Text style={[styles.aboutLinkText, { fontSize: 12, opacity: 0.8 }]}>多线拨打 ➔</Text>
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

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowAboutModal(false)}
              >
                <Text style={styles.modalButtonText}>{t.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={() => setShowAboutModal(false)}
              >
                <LinearGradient
                  colors={['#3b82f6', '#2563eb']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalButtonGradient}
                >
                  <Text style={[styles.modalButtonText, styles.modalButtonTextConfirm]}>
                    {t.confirm}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
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

            <View style={{ maxHeight: Dimensions.get('window').height * 0.7 }}>
              <ScrollView bounces={false} showsVerticalScrollIndicator={true} contentContainerStyle={{ padding: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: '#1e293b' }}>{t.rechargeCard}</Text>
                
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' }}>
                  {[
                    { amount: 10000, label: '10,000', tip: null },
                    { amount: 50000, label: '50,000', tip: null },
                    { amount: 100000, label: '100,000', tip: null },
                    { amount: 300000, label: '300,000', tip: null },
                    { amount: 500000, label: '500,000', tip: null },
                    { amount: 1000000, label: '1,000,000', tip: null },
                  ].map((item) => (
                    <TouchableOpacity
                      key={item.amount}
                      onPress={() => {
                        Vibration.vibrate(10);
                        setSelectedRechargeAmount(item.amount);
                      }}
                      style={{
                        width: (width * 0.9 - 52) / 2,
                        padding: 16,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: selectedRechargeAmount === item.amount ? '#3b82f6' : '#f1f5f9',
                        backgroundColor: selectedRechargeAmount === item.amount ? '#eff6ff' : 'white',
                        alignItems: 'center',
                        marginBottom: 4,
                      }}
                    >
                      <Text style={{ fontSize: 18, fontWeight: 'bold', color: selectedRechargeAmount === item.amount ? '#3b82f6' : '#1e293b' }}>
                        {item.label}
                      </Text>
                      <Text style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>MMK</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={[styles.modalButtons, { marginTop: 20 }]}>
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
                    <LinearGradient
                      colors={['#3b82f6', '#2563eb']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.modalButtonGradient}
                    >
                      <Text style={[styles.modalButtonText, styles.modalButtonTextConfirm]}>
                        {t.confirm}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </ScrollView>
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
              colors={['#1e3a8a', '#2563eb'] as any}
              style={{ padding: 20, alignItems: 'center' }}
            >
              <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>{t.paymentQRTitle}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
                {selectedRechargeAmount?.toLocaleString()} MMK
              </Text>
            </LinearGradient>

            <View style={{ padding: 20, alignItems: 'center' }}>
              <View style={{ position: 'relative' }}>
                <View 
                  ref={qrCodeRef}
                  collapsable={false}
                  style={{ width: 220, height: 220, backgroundColor: '#ffffff', borderRadius: 15, padding: 10, marginBottom: 10, justifyContent: 'center', alignItems: 'center' }}
                >
                  <TouchableOpacity 
                    activeOpacity={0.8}
                    onLongPress={() => selectedRechargeAmount && handleSaveQRCode(selectedRechargeAmount)}
                    style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
                  >
                    {/* 🚀 使用预定义的映射显示二维码 */}
                    {selectedRechargeAmount && rechargeQrImages[selectedRechargeAmount] ? (
                      <Image 
                        source={{ uri: rechargeQrImages[selectedRechargeAmount] }} 
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
                  </TouchableOpacity>
                </View>

                {/* 🚀 新增：显式的保存按钮图标 */}
                <TouchableOpacity
                  onPress={() => selectedRechargeAmount && handleSaveQRCode(selectedRechargeAmount)}
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    backgroundColor: 'rgba(59, 130, 246, 0.9)',
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    justifyContent: 'center',
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    elevation: 4
                  }}
                >
                  <Ionicons name="download-outline" size={20} color="white" />
                </TouchableOpacity>
              </View>
              
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 }}>
                <Ionicons name="information-circle-outline" size={14} color="#64748b" />
                <Text style={{ color: '#64748b', fontSize: 12 }}>
                  {language === 'zh' ? '点击右上角或长按图片可保存' : 'Tap icon or long press to save'}
                </Text>
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
                  <LinearGradient
                    colors={['#10b981', '#059669']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.modalButtonGradient}
                  >
                    {refreshing ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={[styles.modalButtonText, styles.modalButtonTextConfirm]}>
                        {t.confirmRecharge}
                      </Text>
                    )}
                  </LinearGradient>
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

