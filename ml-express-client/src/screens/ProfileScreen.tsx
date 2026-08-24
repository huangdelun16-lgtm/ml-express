import React, { useState, useEffect, useRef, useCallback } from 'react';
import LoggerService from './../services/LoggerService';
import { profileTranslations } from './profile/profileTranslations';
import { profileStyles as styles, meStyles as me } from './profile/profileStyles';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, Alert, Modal, TextInput, Switch, Dimensions, Linking, ActivityIndicator, Image, Vibration, Animated, Easing } from 'react-native';
import { Platform } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as MediaLibrary from 'expo-media-library';
import { ensureSaveToLibraryPermission, pickImageFromLibrary, takePhotoWithCamera } from '../utils/mediaAccess';
import { useApp } from '../contexts/AppContext';
import { useLoading } from '../contexts/LoadingContext';
import { customerService, packageService, rechargeService, addressService, supabase, fetchRechargeQrUrlMap, getDefaultRechargeQrUrlMap } from '../services/supabase';
import { remoteImageUri } from '../services/clientApi/nativeSupabaseUrl';
import { persistUserAvatarUrl, hydrateUserAvatarFromServer } from '../utils/userAvatar';
import Toast from '../components/Toast';
import { feedbackService } from '../services/FeedbackService';
import { common, tt } from '../i18n';
import { APP_CONFIG } from '../config/constants';
import BrandRider from '../components/BrandRider';
import MyOrdersBar from '../components/MyOrdersBar';
import {
  ProfileAvatar3D,
  ClayCoupon,
  ClayCoin,
  ClayHeart,
  ClayPin,
  ClayHeadset,
  ClayGlobe,
  ClayInfo,
  ClayGear,
} from '../components/ProfileClayIcons';
import {
  checkAndroidAppUpdate,
  checkExpoOtaUpdateAvailable,
  downloadAndApplyExpoOtaUpdate,
  getInstalledBuildVersion,
  getIosAppStoreUrl,
  openAndroidApkDownload,
  openIosAppStore,
} from '../services/appUpdateService';

const { width, height: WINDOW_H } = Dimensions.get('window');
const SETTINGS_SHEET_SLIDE = Math.min(WINDOW_H * 0.72, 640);

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
  const { showLoading, hideLoading } = useLoading();
  const insets = useSafeAreaInsets();
  const appVersion = Constants.expoConfig?.version ?? '1.1.0';
  const buildVersion = getInstalledBuildVersion();
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [userName, setUserName] = useState<string>('访客用户');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userPhone, setUserPhone] = useState<string>('');
  const [avatarUri, setAvatarUri] = useState<string>('');
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [accountBalance, setAccountBalance] = useState<number>(0); // 🚀 新增：账户余额
  const [userType, setUserType] = useState<string>('customer');
  const [orderStats, setOrderStats] = useState({
    total: 0,
    pending: 0,
    inTransit: 0,
    delivered: 0,
    pendingPay: 0,
    pendingAccept: 0,
    awaitingDelivery: 0,
    delivering: 0,
    afterSale: 0,
    cancelled: 0,
    deliveredIds: [] as string[],
  });
  const [toReviewCount, setToReviewCount] = useState(0);
  const [addressCount, setAddressCount] = useState(0);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const settingsSheetClosing = useRef(false);
  const settingsSheetY = useRef(new Animated.Value(SETTINGS_SHEET_SLIDE)).current;
  const settingsOverlayOpacity = useRef(new Animated.Value(0)).current;

  const openSettingsSheet = useCallback(() => {
    settingsSheetClosing.current = false;
    settingsSheetY.setValue(SETTINGS_SHEET_SLIDE);
    settingsOverlayOpacity.setValue(0);
    setShowSettingsSheet(true);
  }, [settingsOverlayOpacity, settingsSheetY]);

  const playSettingsSheetIn = useCallback(() => {
    Animated.parallel([
      Animated.timing(settingsOverlayOpacity, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(settingsSheetY, {
        toValue: 0,
        damping: 26,
        stiffness: 280,
        mass: 0.86,
        useNativeDriver: true,
      }),
    ]).start();
  }, [settingsOverlayOpacity, settingsSheetY]);

  const closeSettingsSheet = useCallback((afterClose?: () => void) => {
    if (!showSettingsSheet || settingsSheetClosing.current) return;
    settingsSheetClosing.current = true;
    Animated.parallel([
      Animated.timing(settingsOverlayOpacity, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(settingsSheetY, {
        toValue: SETTINGS_SHEET_SLIDE,
        duration: 240,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      settingsSheetClosing.current = false;
      if (!finished) return;
      setShowSettingsSheet(false);
      afterClose?.();
    });
  }, [settingsOverlayOpacity, settingsSheetY, showSettingsSheet]);

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
  const c = common(language);
  const cancelLabel = c.cancel;

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

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const currentUser = await AsyncStorage.getItem('currentUser');
          if (!currentUser) return;
          const user = JSON.parse(currentUser);
          if (!user?.id || user.id === 'guest') return;
          const addrs = await addressService.getAddresses(user.id);
          if (!cancelled) setAddressCount(addrs.length);
        } catch {
          /* ignore */
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const loadUserData = async () => {
    try {
      const currentUser = await AsyncStorage.getItem('currentUser');
      const guestMode = await AsyncStorage.getItem('isGuest');
      
      if (guestMode === 'true' || !currentUser) {
        setIsGuest(true);
        setUserName(t.guest);
        setUserEmail('');
        setUserPhone('');
        setAvatarUri('');
        setAccountBalance(0);
        setAddressCount(0);
        setToReviewCount(0);
        setOrderStats({
          total: 0,
          pending: 0,
          inTransit: 0,
          delivered: 0,
          pendingPay: 0,
          pendingAccept: 0,
          awaitingDelivery: 0,
          delivering: 0,
          afterSale: 0,
          cancelled: 0,
          deliveredIds: [],
        });
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
        setAvatarUri('');
        setAccountBalance(0);
        setUserType('customer');
        setAddressCount(0);
        setToReviewCount(0);
        navigation.replace('Login');
        return;
      }

      setIsGuest(false);
      setUserId(user.id);
      setUserName(user.name || t.guest);
      setUserEmail(user.email || '');
      setUserPhone(user.phone || '');
      setAccountBalance(user.balance || 0);

      const cachedAvatar = await AsyncStorage.getItem(`userAvatarUrl_${user.id}`);
      setAvatarUri(user.avatar_url || cachedAvatar || '');
      setAvatarFailed(false);

      let finalUserType = detectedUserType;
      if (detectedUserType === 'customer' && (user.balance || 0) > 0) {
        finalUserType = 'vip';
      }
      setUserType(finalUserType);

      if (user.id && user.id !== 'guest') {
        try {
          const { data: latestRaw, error: userError } = await supabase
            .from('users')
            .select('balance, user_type, name, phone, email, avatar_url')
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
              const mergedUser = {
                ...localUser,
                ...latestRaw,
                avatar_url: latestRaw.avatar_url || localUser.avatar_url || '',
              };
              await AsyncStorage.setItem('currentUser', JSON.stringify(mergedUser));
            }
          } else if (userError) {
            console.warn('⚠️ 同步用户信息失败:', userError.message);
          }
        } catch (error) {
          console.warn('❌ 获取最新用户信息异常:', error);
        }

        try {
          const remoteAvatar = await hydrateUserAvatarFromServer(user.id);
          if (remoteAvatar) {
            setAvatarUri(remoteAvatar);
            setAvatarFailed(false);
          }
        } catch {
          /* 沿用本地缓存 */
        }

        const stats = await packageService.getOrderStats(
          user.id,
          user.email,
          user.phone,
          detectedUserType,
        );
        setOrderStats({
          total: stats.total,
          pending: stats.pending,
          inTransit: stats.inTransit,
          delivered: stats.delivered,
          pendingPay: stats.pendingPay || 0,
          pendingAccept: stats.pendingAccept || 0,
          awaitingDelivery: stats.awaitingDelivery || 0,
          delivering: stats.delivering || 0,
          afterSale: stats.afterSale || 0,
          cancelled: stats.cancelled || 0,
          deliveredIds: stats.deliveredIds || [],
        });
        try {
          const [addrs, reviewRes] = await Promise.all([
            addressService.getAddresses(user.id),
            supabase.from('store_reviews').select('order_id').eq('user_id', user.id),
          ]);
          setAddressCount(addrs.length);
          const reviewed = new Set((reviewRes.data || []).map((r: { order_id: string }) => r.order_id));
          setToReviewCount((stats.deliveredIds || []).filter((id: string) => !reviewed.has(id)).length);
        } catch {
          setAddressCount(0);
          setToReviewCount(stats.delivered || 0);
        }
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

  const persistAvatarLocal = async (uid: string, url: string | null) => {
    await persistUserAvatarUrl(uid, url);
  };

  const applyAvatarFromPicker = async (uri: string) => {
    if (!userId) return;
    setAvatarUri(uri);
    setUploadingAvatar(true);
    try {
      const uploaded = await customerService.uploadAvatar(userId, uri);
      if (!uploaded) {
        showToast(t.avatarUpdateFailed, 'error');
        return;
      }
      setAvatarUri(`${uploaded}${uploaded.includes('?') ? '&' : '?'}v=${Date.now()}`);
      setAvatarFailed(false);
      await persistAvatarLocal(userId, uploaded);
      const saved = await customerService.updateUser(userId, { avatar_url: uploaded }, userType);
      if (!saved.success && saved.error?.code !== 'NO_AVATAR_COLUMN') {
        LoggerService.warn('保存头像地址失败:', saved.error);
      }
      showToast(t.avatarUpdated, 'success');
    } catch (error) {
      LoggerService.error('更换头像失败:', error);
      showToast(t.avatarUpdateFailed, 'error');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!userId) return;
    setAvatarUri('');
    setAvatarFailed(false);
    await persistAvatarLocal(userId, null);
    await customerService.removeAvatar(userId);
    showToast(t.avatarUpdated, 'success');
  };

  const pickAvatarOptions = {
    mediaTypes: ['images'] as ['images'],
    allowsEditing: true,
    aspect: [1, 1] as [number, number],
    quality: 0.7,
  };

  const handleChangeAvatar = () => {
    if (isGuest) {
      handleLogin();
      return;
    }
    const buttons: { text: string; style?: 'cancel' | 'destructive'; onPress?: () => void }[] = [
      {
        text: t.chooseFromAlbum,
        onPress: async () => {
          try {
            const result = await pickImageFromLibrary(pickAvatarOptions);
            if (result.canceled && result.assets === null) {
              Alert.alert(t.changeAvatar, c.galleryPermissionAvatar);
              return;
            }
            const uri = result.assets?.[0]?.uri;
            if (!result.canceled && uri) await applyAvatarFromPicker(uri);
          } catch (error) {
            LoggerService.error('选择头像失败:', error);
            showToast(t.avatarUpdateFailed, 'error');
          }
        },
      },
      {
        text: t.takePhoto,
        onPress: async () => {
          try {
            const result = await takePhotoWithCamera(pickAvatarOptions);
            if (result.canceled && result.assets === null) {
              Alert.alert(t.changeAvatar, t.cameraPermission);
              return;
            }
            const uri = result.assets?.[0]?.uri;
            if (!result.canceled && uri) await applyAvatarFromPicker(uri);
          } catch (error) {
            LoggerService.error('拍摄头像失败:', error);
            showToast(t.avatarUpdateFailed, 'error');
          }
        },
      },
    ];
    if (avatarUri) {
      buttons.push({
        text: t.removeAvatar,
        style: 'destructive',
        onPress: () => void handleRemoveAvatar(),
      });
    }
    buttons.push({ text: t.cancel, style: 'cancel' });
    Alert.alert(t.changeAvatar, t.changeAvatarHint, buttons);
  };

  const displayAvatarUri = (() => {
    if (!avatarUri || avatarFailed) return undefined;
    if (avatarUri.startsWith('file://') || avatarUri.startsWith('content://')) return avatarUri;
    return remoteImageUri(avatarUri);
  })();

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
      showToast(c.fillNamePhone, 'warning');
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
      showLoading(c.saving, 'package');
      
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
          c.saved,
          c.qrSavedPay
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
      showLoading(c.submitting, 'package');
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
        c.submitted,
        c.rechargeSubmitted,
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
        c.submitFailed,
        tt(language, `充值申请提交失败，请联系客服。\n错误详情: ${errorMsg}`, `Submission failed.\nError: ${errorMsg}`, `ငွေဖြည့်လျှောက်လွှာ မအောင်မြင်ပါ။\nအမှား: ${errorMsg}`)
      );
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      showToast(c.fillAllPassword, 'warning');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast(c.passwordMismatch, 'error');
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
        showToast(c.passwordUpdated, 'success');
        setShowPasswordModal(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        showToast(result.error?.message || c.updateFailed, 'error');
      }
    } catch (error) {
      LoggerService.error('修改密码失败:', error);
      showToast(c.updateFailedRetry, 'error');
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
      case 'points':
      case 'favorites':
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
  };

  const requireLoginThen = (next?: () => void) => {
    if (!isGuest) {
      next?.();
      return;
    }
    Alert.alert(t.pleaseLogin, '', [
      { text: t.cancel, style: 'cancel' },
      { text: t.confirm, onPress: handleLogin },
    ]);
  };

  const openOrders = (filterStatus = 'all') => {
    requireLoginThen(() => navigation.navigate('MyOrders', { filterStatus }));
  };

  const openCustomerService = () => {
    const numbers = [
      { display: '(+95) 09788848928', tel: '+959788848928' },
      { display: '(+95) 09941118588', tel: '+959941118588' },
      { display: '(+95) 09941118688', tel: '+959941118688' },
    ];
    Alert.alert(
      c.hotlineTitle,
      APP_CONFIG.CONTACT.PHONE_DISPLAY,
      [
        ...numbers.map((n) => ({
          text: n.display,
          onPress: () => Linking.openURL(`tel:${n.tel}`),
        })),
        { text: c.cancel, style: 'cancel' as const },
      ],
    );
  };

  const memberBadgeLabel = () => {
    if (accountBalance > 0 || userType === 'vip') return 'VIP';
    if (userType === 'admin') return t.admin;
    if (userType === 'courier') return t.courier;
    return t.member;
  };

  const completedLine = (t.completedOrders || '已完成 {n} 单').replace('{n}', String(orderStats.delivered || 0));

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

  const renderMePage = () => {
    const statItems = [
      { key: 'coupons', label: t.coupons, value: 0, icon: <ClayCoupon size={32} />, action: 'coupons' },
      { key: 'points', label: t.points, value: 0, icon: <ClayCoin size={32} />, action: 'points' },
      { key: 'favorites', label: t.favorites, value: 0, icon: <ClayHeart size={32} />, action: 'favorites' },
      { key: 'addresses', label: t.addresses, value: addressCount, icon: <ClayPin size={32} />, action: 'address' },
    ];

    return (
      <>
        <View style={[me.hero, { paddingTop: insets.top + 6 }]}>
          <LinearGradient
            colors={['#B6DFFB', '#D7F1F5', '#EAF7F6']}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={me.brandRow}>
            <View style={me.brandLeft}>
              <Image
                source={require('../../assets/login-logo.png')}
                style={me.logoImg}
                resizeMode="contain"
              />
              <View style={me.wordmark}>
                <Text style={me.brandKicker}>MARKET LINK</Text>
                <View style={me.brandHairline} />
                <Text style={me.brandSub}>EXPRESS</Text>
              </View>
            </View>
            <BrandRider width={Math.round(Math.min(136, width * 0.34))} />
          </View>
        </View>

        <View style={me.profileCard}>
          <View style={me.identity}>
            <TouchableOpacity
              style={me.avatarHit}
              onPress={handleChangeAvatar}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={isGuest ? t.tapToLogin : t.changeAvatar}
            >
              <View style={me.avatarRing}>
                {displayAvatarUri ? (
                  <Image
                    source={{ uri: displayAvatarUri }}
                    style={me.avatarImage}
                    onError={() => setAvatarFailed(true)}
                  />
                ) : (
                  <ProfileAvatar3D size={64} />
                )}
                {uploadingAvatar ? (
                  <View style={me.avatarLoading}>
                    <ActivityIndicator color="#fff" size="small" />
                  </View>
                ) : null}
              </View>
              <View style={me.avatarCamBadge}>
                <Ionicons name="camera" size={12} color="#fff" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => (isGuest ? handleLogin() : handleEditProfile())}
              activeOpacity={0.86}
            >
              <View style={me.nameRow}>
                <Text style={me.userName} numberOfLines={1}>{userName}</Text>
                {!isGuest ? (
                  <View style={me.memberPill}>
                    <Text style={me.memberPillText}>{memberBadgeLabel()}</Text>
                  </View>
                ) : null}
              </View>
              {isGuest ? (
                <Text style={me.subLine}>{t.tapToLogin}</Text>
              ) : (
                <Text style={me.subLine}>{completedLine}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => (isGuest ? handleLogin() : handleEditProfile())}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-forward" size={18} color="#C5D0DA" />
            </TouchableOpacity>
          </View>
          {!isGuest ? (
            <TouchableOpacity
              style={me.walletBar}
              onPress={() => handleQuickAction('recharge')}
              activeOpacity={0.88}
            >
              <View style={me.walletIcon}>
                <Ionicons name="wallet" size={16} color="#fff" />
              </View>
              <Text style={me.walletLabel}>{t.walletBalance}</Text>
              <Text style={me.walletValue}>{formatMoney(accountBalance)} MMK</Text>
              <Text style={me.walletCta}>{t.goRecharge}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={me.statCard}>
          {statItems.map((item, index) => (
            <TouchableOpacity
              key={item.key}
              style={[me.statCell, index > 0 && me.statCellBorder]}
              activeOpacity={0.85}
              onPress={() => handleQuickAction(item.action)}
            >
              <View style={me.statIconWell}>{item.icon}</View>
              <Text style={me.statValue}>{formatMoney(item.value)}</Text>
              <Text style={me.statLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <MyOrdersBar
          counts={{
            accept: orderStats.pendingAccept + orderStats.pendingPay,
            pickup: Math.max(0, orderStats.awaitingDelivery - orderStats.pendingAccept),
            ship: orderStats.delivering,
            done: orderStats.delivered,
            cancel: orderStats.cancelled,
          }}
          onPressAll={() => openOrders('all')}
          onPressItem={(_key, filter) => openOrders(filter)}
        />

        <View style={me.menuCard}>
          <TouchableOpacity style={me.menuRow} onPress={() => handleQuickAction('address')}>
            <View style={me.menuIcon}><ClayPin size={26} /></View>
            <Text style={me.menuLabel}>{t.shippingAddress}</Text>
            <Ionicons name="chevron-forward" size={18} color="#D0D7DE" />
          </TouchableOpacity>
          <View style={me.menuDivider} />
          <View style={me.menuRow}>
            <View style={me.menuIcon}><ClayGlobe size={26} /></View>
            <Text style={me.menuLabel}>{t.languageSettings}</Text>
            <View style={me.langSeg}>
              {([
                { code: 'zh' as const, label: '中文' },
                { code: 'en' as const, label: 'EN' },
                { code: 'my' as const, label: 'မြန်မာ' },
              ]).map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[me.langChip, language === lang.code && me.langChipOn]}
                  onPress={() => handleLanguageChange(lang.code)}
                >
                  <Text style={[me.langChipText, language === lang.code && me.langChipTextOn]}>{lang.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={me.menuDivider} />
          <TouchableOpacity style={me.menuRow} onPress={openCustomerService}>
            <View style={me.menuIcon}><ClayHeadset size={26} /></View>
            <Text style={me.menuLabel}>{t.customerService}</Text>
            <Ionicons name="chevron-forward" size={18} color="#D0D7DE" />
          </TouchableOpacity>
          <View style={me.menuDivider} />
          <TouchableOpacity style={me.menuRow} onPress={() => setShowAboutModal(true)}>
            <View style={me.menuIcon}><ClayInfo size={26} /></View>
            <Text style={me.menuLabel}>{t.aboutBrand}</Text>
            <Ionicons name="chevron-forward" size={18} color="#D0D7DE" />
          </TouchableOpacity>
          <View style={me.menuDivider} />
          <TouchableOpacity
            style={[me.menuRow, { paddingBottom: 4 }]}
            onPress={openSettingsSheet}
          >
            <View style={me.menuIcon}><ClayGear size={26} /></View>
            <Text style={me.menuLabel}>{t.settings}</Text>
            <Ionicons name="chevron-forward" size={18} color="#D0D7DE" />
          </TouchableOpacity>
        </View>
      </>
    );
  };

  return (
    <View style={me.container}>
      <LinearGradient
        colors={['#B6DFFB', '#E7F5F7', '#F3F5F7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        style={me.scroll}
        contentContainerStyle={me.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2C98A6']} tintColor="#2C98A6" />
        }
      >
        {renderMePage()}
      </ScrollView>

      <Modal
        visible={showSettingsSheet}
        transparent
        animationType="none"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onShow={playSettingsSheetIn}
        onRequestClose={() => closeSettingsSheet()}
      >
        <View style={me.sheetRoot}>
          <Animated.View
            pointerEvents="none"
            style={[me.sheetDim, { opacity: settingsOverlayOpacity }]}
          />
          <TouchableOpacity
            style={me.sheetDismissZone}
            activeOpacity={1}
            onPress={() => closeSettingsSheet()}
          />
          <Animated.View
            style={[
              me.sheet,
              {
                paddingBottom: Math.max(insets.bottom, 16),
                transform: [{ translateY: settingsSheetY }],
              },
            ]}
          >
            <View style={me.sheetHandle} pointerEvents="none" />
            <Text style={me.sheetTitle}>{t.extraSettings}</Text>
            {!isGuest ? (
              <TouchableOpacity style={me.sheetRow} onPress={() => closeSettingsSheet(handleEditProfile)}>
                <Ionicons name="person-circle-outline" size={22} color="#2C98A6" />
                <Text style={me.sheetRowText}>{t.editProfile}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={me.sheetRow} onPress={() => closeSettingsSheet(handleLogin)}>
                <Ionicons name="log-in-outline" size={22} color="#2C98A6" />
                <Text style={me.sheetRowText}>{t.login}</Text>
              </TouchableOpacity>
            )}
            {!isGuest ? (
              <TouchableOpacity style={me.sheetRow} onPress={() => closeSettingsSheet(() => setShowRechargeModal(true))}>
                <Ionicons name="wallet-outline" size={22} color="#2C98A6" />
                <Text style={me.sheetRowText}>{t.recharge}</Text>
                <Text style={me.sheetMeta}>{formatMoney(accountBalance)} MMK</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={me.sheetRow} onPress={() => closeSettingsSheet(() => navigation.navigate('NotificationCenter'))}>
              <Ionicons name="notifications-outline" size={22} color="#2C98A6" />
                <Text style={me.sheetRowText}>{t.inbox}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={me.sheetRow} onPress={() => closeSettingsSheet(openNotificationSettings)}>
              <Ionicons name="settings-outline" size={22} color="#2C98A6" />
              <Text style={me.sheetRowText}>{t.notifications}</Text>
            </TouchableOpacity>
            <View style={me.sheetRow}>
              <Ionicons name={isDarkMode ? 'moon' : 'sunny-outline'} size={22} color="#2C98A6" />
              <Text style={me.sheetRowText}>{t.darkMode}</Text>
              <Switch
                value={isDarkMode}
                onValueChange={setIsDarkMode}
                trackColor={{ false: '#cbd5e1', true: '#2C98A6' }}
                thumbColor="#ffffff"
              />
            </View>
            {!isGuest ? (
              <TouchableOpacity style={me.sheetRow} onPress={() => closeSettingsSheet(() => setShowPasswordModal(true))}>
                <Ionicons name="lock-closed-outline" size={22} color="#2C98A6" />
                <Text style={me.sheetRowText}>{t.changePassword}</Text>
              </TouchableOpacity>
            ) : null}
            {!isGuest ? (
              <TouchableOpacity style={me.sheetRow} onPress={() => closeSettingsSheet(handleLogout)}>
                <Ionicons name="log-out-outline" size={22} color="#ef4444" />
                <Text style={[me.sheetRowText, { color: '#ef4444' }]}>{t.logout}</Text>
              </TouchableOpacity>
            ) : null}
            {!isGuest ? (
              <TouchableOpacity style={me.sheetRow} onPress={() => closeSettingsSheet(handleDeleteAccount)}>
                <Ionicons name="trash-outline" size={22} color="#ef4444" />
                <Text style={[me.sheetRowText, { color: '#ef4444' }]}>{t.deleteAccount}</Text>
              </TouchableOpacity>
            ) : null}
            <Text style={me.sheetVer}>v{appVersion}</Text>
          </Animated.View>
        </View>
      </Modal>

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
              colors={['#1F7A84', '#2C98A6']}
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
              <TouchableOpacity
                style={{ alignItems: 'center', marginBottom: 20 }}
                onPress={handleChangeAvatar}
                activeOpacity={0.85}
              >
                <View style={[me.avatarRing, { width: 84, height: 84, borderRadius: 42 }]}>
                  {displayAvatarUri ? (
                    <Image
                      source={{ uri: displayAvatarUri }}
                      style={{ width: 84, height: 84 }}
                      onError={() => setAvatarFailed(true)}
                    />
                  ) : (
                    <ProfileAvatar3D size={84} />
                  )}
                  {uploadingAvatar ? (
                    <View style={me.avatarLoading}>
                      <ActivityIndicator color="#fff" size="small" />
                    </View>
                  ) : null}
                </View>
                <Text style={{ marginTop: 8, fontSize: 13, fontWeight: '700', color: '#2C98A6' }}>
                  {t.changeAvatar}
                </Text>
              </TouchableOpacity>
              <View style={{ gap: 20, marginBottom: 24 }}>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748b', marginBottom: 8, marginLeft: 4 }}>{t.fullName}</Text>
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
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748b', marginBottom: 8, marginLeft: 4 }}>{t.emailAddress}</Text>
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
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748b', marginBottom: 8, marginLeft: 4 }}>{t.phoneNumber}</Text>
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
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748b', marginBottom: 8, marginLeft: 4 }}>{t.detailAddress}</Text>
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
                    colors={['#2C98A6', '#1E6F7A']}
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
                  colors={['#2C98A6', '#1E6F7A']}
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
                      c.hotlineTitle,
                      '',
                      [
                        ...numbers.map(n => ({
                          text: n.display,
                          onPress: () => Linking.openURL(`tel:${n.tel}`)
                        })),
                        { text: c.cancel, style: 'cancel' }
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
                        c.cannotOpenLink,
                        tt(language, '请稍后访问: ' + privacyUrl, 'Please visit later: ' + privacyUrl, 'ကျေးဇူးပြု၍ နောက်မှ လည်ပတ်ပါ: ' + privacyUrl)
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
                        c.cannotOpenLink,
                        tt(language, '请稍后访问: ' + termsUrl, 'Please visit later: ' + termsUrl, 'ကျေးဇူးပြု၍ နောက်မှ လည်ပတ်ပါ: ' + termsUrl)
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
                  colors={['#2C98A6', '#1E6F7A']}
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
              colors={['#1F7A84', '#2C98A6']}
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
                        borderColor: selectedRechargeAmount === item.amount ? '#2C98A6' : '#f1f5f9',
                        backgroundColor: selectedRechargeAmount === item.amount ? '#E8F6F8' : 'white',
                        alignItems: 'center',
                        marginBottom: 4,
                      }}
                    >
                      <Text style={{ fontSize: 18, fontWeight: 'bold', color: selectedRechargeAmount === item.amount ? '#2C98A6' : '#1e293b' }}>
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
                      colors={['#2C98A6', '#1E6F7A']}
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
              colors={['#1F7A84', '#2C98A6'] as any}
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
                          {c.loading}
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
                  {c.tapOrLongPressToSave}
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
                <Ionicons name={rechargeProofUri ? "checkmark-circle" : "cloud-upload-outline"} size={24} color={rechargeProofUri ? "#10b981" : "#2C98A6"} />
                <Text style={{ marginLeft: 8, fontWeight: 'bold', color: rechargeProofUri ? "#10b981" : "#1e293b" }}>
                  {rechargeProofUri ? c.proofSelected : t.uploadPaymentRecord}
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

