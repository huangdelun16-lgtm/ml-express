import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
  Modal,
  TextInput,
  Switch,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase, adminAccountService } from '../services/supabase';
import { feedbackService } from '../services/feedbackService';
import { useApp } from '../contexts/AppContext';
import { getPushRuntimeSummary } from '../services/notificationService';
import AboutUsModal from '../components/AboutUsModal';
import { getStaffVersionDisplay } from '../utils/appVersion';

const HOTLINE_NUMBERS = [
  { display: '(+95) 09788848928', tel: '+959788848928' },
  { display: '(+95) 09259369349', tel: '+959259369349' },
  { display: '(+95) 09941118588', tel: '+959941118588' },
  { display: '(+95) 09941118688', tel: '+959941118688' },
];

export default function SettingsScreen({ navigation }: any) {
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { language, setLanguage: setAppLanguage, setThemeMode: setAppTheme, t } = useApp();
  const pushSummary = useMemo(() => getPushRuntimeSummary(), []);
  const runtimeDescription = useMemo(() => {
    switch (pushSummary.channel) {
      case 'expo_go_ios':
        return t.envRuntimeExpoGoIos;
      case 'expo_go_android':
        return t.envRuntimeExpoGoAndroid;
      case 'standalone':
        return t.envRuntimeStandalone;
      case 'bare':
        return t.envRuntimeBare;
      default:
        return t.envRuntimeUnknown;
    }
  }, [pushSummary.channel, t]);
  const pushDescription = useMemo(() => {
    if (pushSummary.simulator) return t.envPushSimulator;
    if (pushSummary.expoGoAndroid) return t.envPushExpoGoAndroid;
    if (!pushSummary.hasNotificationsModule) return t.envPushNoModule;
    return t.envPushReady;
  }, [pushSummary, t]);
  const [settings, setSettings] = useState({
    notifications: true,
    language: 'zh',
    theme: 'light',
  });
  const [currentUser, setCurrentUser] = useState(''); // 登录用户名 (ID)
  const [currentUserName, setCurrentUserName] = useState(''); // 员工姓名 (显示用)
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  
  const hotlineDisplay = HOTLINE_NUMBERS.map(item => item.display).join(' / ');
  const hotlineNewlineDisplay = HOTLINE_NUMBERS.map(item => item.display).join('\n');

  const openHotlineSelector = () => {
    const cancelText = language === 'zh' ? '取消' : language === 'en' ? 'Cancel' : 'မဆက်တော့ပါ';
    const title = language === 'zh' ? '选择拨打的客服热线' : language === 'en' ? 'Choose a hotline' : 'ဖုန်းနံပါတ်ရွေးချယ်ပါ';

    Alert.alert(
      title,
      '',
      [
        ...HOTLINE_NUMBERS.map(item => ({
          text: item.display,
          onPress: () => Linking.openURL(`tel:${item.tel}`),
        })),
        { text: cancelText, style: 'cancel' },
      ]
    );
  };
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [usernameForm, setUsernameForm] = useState({
    currentUsername: '',
    newUsername: '',
  });

  useEffect(() => {
    loadSettings();
    loadUserInfo();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (route.params?.openHelp === true) {
        setShowHelpModal(true);
        navigation.setParams({ openHelp: false });
      }
      if (route.params?.openAbout === true) {
        setShowAboutModal(true);
        navigation.setParams({ openAbout: false });
      }
    }, [navigation, route.params?.openHelp, route.params?.openAbout]),
  );

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('appSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('加载设置失败:', error);
    }
  };

  const loadUserInfo = async () => {
    try {
      const loginUser = await AsyncStorage.getItem('currentUser') || '';
      const userName = await AsyncStorage.getItem('currentUserName') || '用户';
      setCurrentUser(loginUser);
      setCurrentUserName(userName);
    } catch (error) {
      console.error('加载用户信息失败:', error);
    }
  };

  const saveSettings = async (newSettings: typeof settings) => {
    try {
      await AsyncStorage.setItem('appSettings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      feedbackService.notify('错误', '保存设置失败');
    }
  };

  const toggleNotifications = async () => {
    const newSettings = { ...settings, notifications: !settings.notifications };
    await saveSettings(newSettings);
  };

  const changeLanguage = async (lang: string) => {
    const newSettings = { ...settings, language: lang };
    await saveSettings(newSettings);
    await setAppLanguage(lang);
    setShowLanguageModal(false);
  };

  const changeTheme = async (theme: string) => {
    const newSettings = { ...settings, theme };
    await saveSettings(newSettings);
    await setAppTheme(theme);
    setShowThemeModal(false);
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      feedbackService.notify('提示', language === 'zh' ? '请填写当前密码和新密码' : 'Please fill current, new and confirm password');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      feedbackService.notify('错误', language === 'zh' ? '新密码和确认密码不匹配' : 'Passwords do not match');
      return;
    }
    try {
      // 这里的 currentUser 应该是登录名 (如 mdy-rider-001)
      const success = await adminAccountService.updatePassword(
        currentUser, 
        passwordForm.currentPassword, 
        passwordForm.newPassword
      );
      if (success) {
        feedbackService.notify('成功', language === 'zh' ? '密码修改成功' : 'Password updated');
        setShowPasswordModal(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        feedbackService.notify('错误', language === 'zh' ? '修改失败，请重试' : 'Update failed');
      }
    } catch (error) {
      feedbackService.notify('错误', language === 'zh' ? '网络错误' : 'Network error');
    }
  };

  const handleChangeUsername = async () => {
    if (!usernameForm.newUsername || usernameForm.newUsername.length < 3) {
      feedbackService.notify('错误', language === 'zh' ? '用户名至少3位' : 'Username must be at least 3 chars');
      return;
    }
    try {
      // currentUser 是旧用户名，usernameForm.newUsername 是新用户名
      const success = await adminAccountService.updateUsername(currentUser, usernameForm.newUsername);
      if (success) {
        feedbackService.notify('成功', language === 'zh' ? '用户名已修改' : 'Username updated');
        await AsyncStorage.setItem('currentUser', usernameForm.newUsername);
        setShowUsernameModal(false);
        setUsernameForm({ currentUsername: '', newUsername: '' });
        loadUserInfo();
      } else {
        feedbackService.notify('错误', language === 'zh' ? '修改失败，可能用户名已存在' : 'Update failed');
      }
    } catch (error) {
      feedbackService.notify('错误', language === 'zh' ? '网络错误' : 'Network error');
    }
  };

  const settingSections = [
    {
      title: language === 'zh' ? '通用设置' : 'General',
      items: [
        { icon: 'notifications', label: language === 'zh' ? '推送通知' : 'Notifications', subtitle: settings.notifications ? (language === 'zh' ? '已开启' : 'On') : (language === 'zh' ? '已关闭' : 'Off'), action: toggleNotifications, hasSwitch: true, switchValue: settings.notifications, color: '#3b82f6' },
        { icon: 'language', label: language === 'zh' ? '语言设置' : 'Language', subtitle: settings.language === 'zh' ? '中文' : settings.language === 'en' ? 'English' : 'မြန်မာ', action: () => setShowLanguageModal(true), color: '#10b981' },
        { icon: 'color-palette', label: language === 'zh' ? '主题模式' : 'Theme', subtitle: settings.theme === 'light' ? (language === 'zh' ? '浅色' : 'Light') : (language === 'zh' ? '深色' : 'Dark'), action: () => setShowThemeModal(true), color: '#8b5cf6' },
      ]
    },
    {
      title: language === 'zh' ? '账户与安全' : 'Account',
      items: [
        { icon: 'person', label: language === 'zh' ? '修改用户名' : 'Username', subtitle: language === 'zh' ? '更改登录名' : 'Change login name', action: () => setShowUsernameModal(true), color: '#f59e0b' },
        { icon: 'lock-closed', label: language === 'zh' ? '修改密码' : 'Password', subtitle: language === 'zh' ? '保护账户安全' : 'Protect account', action: () => setShowPasswordModal(true), color: '#ef4444' },
        { icon: 'shield-checkmark', label: language === 'zh' ? '权限管理' : 'Permissions', subtitle: language === 'zh' ? '管理应用权限' : 'Manage app perms', action: () => setShowPermissionsModal(true), color: '#6366f1' },
      ]
    },
    {
      title: language === 'zh' ? '帮助与支持' : 'Support',
      items: [
        { icon: 'information-circle', label: language === 'zh' ? '关于我们' : 'About Us', subtitle: 'Market Link Express', action: () => setShowAboutModal(true), color: '#64748b' },
        { icon: 'help-circle', label: language === 'zh' ? '使用帮助' : 'User Guide', subtitle: language === 'zh' ? '功能使用指南' : 'Feature guide', action: () => setShowHelpModal(true), color: '#0ea5e9' },
        { icon: 'globe', label: language === 'zh' ? '访问官网' : 'Website', subtitle: 'market-link-express.com', action: () => Linking.openURL('https://market-link-express.com'), color: '#3b82f6' },
        { icon: 'headset', label: language === 'zh' ? '联系客服' : 'Support', subtitle: HOTLINE_NUMBERS[0].display, action: openHotlineSelector, color: '#10b981' },
      ]
    }
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel={t.back}
        >
          <Ionicons name="chevron-back" size={22} color="#e2e8f0" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{language === 'zh' ? '设置中心' : 'Settings'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.envSectionTitle}</Text>
          <View style={styles.sectionGlassCard}>
            <View style={styles.envBlock}>
              <Text style={styles.itemLabel}>{t.envRuntimeLabel}</Text>
              <Text style={styles.envBody}>{runtimeDescription}</Text>
            </View>
            <View style={[styles.glassDivider, { marginLeft: 0 }]} />
            <View style={styles.envBlock}>
              <Text style={styles.itemLabel}>{t.envPushLabel}</Text>
              <Text style={styles.envBody}>{pushDescription}</Text>
              <Text style={styles.envFootnote}>{t.envPushFootnote}</Text>
            </View>
          </View>
        </View>

        {settingSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionGlassCard}>
              {section.items.map((item, itemIndex) => (
                <View key={itemIndex}>
                  <TouchableOpacity style={styles.settingItem} onPress={item.action} activeOpacity={0.7}>
                    <View style={styles.itemLeft}>
                      <View style={styles.iconContainer}>
                        <Ionicons name={item.icon as any} size={20} color="#7dd3fc" />
                      </View>
                      <View style={styles.itemText}>
                        <Text style={styles.itemLabel}>{item.label}</Text>
                        <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                      </View>
                    </View>
                    {item.hasSwitch ? (
                      <Switch
                        value={item.switchValue}
                        onValueChange={item.action}
                        trackColor={{ false: 'rgba(255,255,255,0.1)', true: '#3b82f6' }}
                        thumbColor={item.switchValue ? '#fff' : '#94a3b8'}
                      />
                    ) : (
                      <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.2)" />
                    )}
                  </TouchableOpacity>
                  {itemIndex < section.items.length - 1 && <View style={styles.glassDivider} />}
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.versionText}>MARKET LINK STAFF {getStaffVersionDisplay()}</Text>
          <Text style={styles.copyright}>© {new Date().getFullYear()} Market Link Express</Text>
        </View>
      </ScrollView>

      {/* 修改用户名模态框 */}
      <Modal visible={showUsernameModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.glassModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>👤 {language === 'zh' ? '修改用户名' : 'Change Username'}</Text>
              <TouchableOpacity onPress={() => setShowUsernameModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>{language === 'zh' ? '当前用户名' : 'Current'}</Text>
                <TextInput
                  style={[styles.textInput, { opacity: 0.6 }]}
                  value={currentUser}
                  editable={false}
                  placeholderTextColor="rgba(255,255,255,0.2)"
                />
              </View>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>{language === 'zh' ? '新用户名' : 'New Username'}</Text>
                <TextInput
                  style={styles.textInput}
                  value={usernameForm.newUsername}
                  onChangeText={(text) => setUsernameForm({...usernameForm, newUsername: text})}
                  placeholder={language === 'zh' ? '请输入新用户名' : 'Enter new username'}
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  autoCapitalize="none"
                />
              </View>
              <TouchableOpacity style={styles.submitBtn} onPress={handleChangeUsername}>
                <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.btnGradient}>
                  <Text style={styles.btnText}>{language === 'zh' ? '保存修改' : 'Save Changes'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 修改密码模态框 */}
      <Modal visible={showPasswordModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.glassModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🔐 {language === 'zh' ? '修改密码' : 'Change Password'}</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>{language === 'zh' ? '当前密码' : 'Current Password'}</Text>
                <TextInput
                  style={styles.textInput}
                  value={passwordForm.currentPassword}
                  onChangeText={(text) => setPasswordForm({...passwordForm, currentPassword: text})}
                  secureTextEntry
                  placeholder={language === 'zh' ? '请输入当前密码' : 'Current password'}
                  placeholderTextColor="rgba(255,255,255,0.2)"
                />
              </View>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>{language === 'zh' ? '新密码' : 'New'}</Text>
                <TextInput
                  style={styles.textInput}
                  value={passwordForm.newPassword}
                  onChangeText={(text) => setPasswordForm({...passwordForm, newPassword: text})}
                  secureTextEntry
                  placeholder={language === 'zh' ? '设置新密码' : 'New password'}
                  placeholderTextColor="rgba(255,255,255,0.2)"
                />
              </View>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>{language === 'zh' ? '确认新密码' : 'Confirm'}</Text>
                <TextInput
                  style={styles.textInput}
                  value={passwordForm.confirmPassword}
                  onChangeText={(text) => setPasswordForm({...passwordForm, confirmPassword: text})}
                  secureTextEntry
                  placeholder={language === 'zh' ? '再次输入新密码' : 'Confirm password'}
                  placeholderTextColor="rgba(255,255,255,0.2)"
                />
              </View>
              <TouchableOpacity style={styles.submitBtn} onPress={handleChangePassword}>
                <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.btnGradient}>
                  <Text style={styles.btnText}>{language === 'zh' ? '保存修改' : 'Save Changes'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 语言选择模态框 */}
      <Modal visible={showLanguageModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.glassModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🌐 {language === 'zh' ? '选择语言' : 'Language'}</Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              {[
                { key: 'zh', label: '中文', sub: '简体中文' },
                { key: 'en', label: 'English', sub: 'English' },
                { key: 'my', label: 'မြန်မာ', sub: 'Myanmar' },
              ].map(lang => (
                <TouchableOpacity 
                  key={lang.key} 
                  style={[styles.optionItem, settings.language === lang.key && styles.selectedOption]} 
                  onPress={() => changeLanguage(lang.key)}
                >
                  <View>
                    <Text style={styles.optionLabel}>{lang.label}</Text>
                    <Text style={styles.optionSub}>{lang.sub}</Text>
                  </View>
                  {settings.language === lang.key && <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* 使用帮助模态框 */}
      <Modal visible={showHelpModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.glassModal, { height: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📖 {language === 'zh' ? '使用帮助' : 'User Guide'}</Text>
              <TouchableOpacity onPress={() => setShowHelpModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {[
                { t: '📦 任务处理', c: '在“我的任务”中查看分配给您的包裹，点击进入详情可进行扫码取件、拍照上传及状态更新。' },
                { t: '📍 导航功能', c: '「规划路线」：点地图加站，列表可上下调整；「最近优先」一键按距离排线（同单先取后送）。「Google 语音导航」按此顺序导航。' },
                { t: '📸 配送证明', c: '送达包裹时，请点击“上传照片”拍摄配送现场照片，系统将自动记录GPS坐标作为凭证。' },
                { t: '💰 费用结算', c: '在“配送历史”中可查看未结清的跑腿费和代收款，请定期联系财务进行结算。' },
              ].map((item, i) => (
                <View key={i} style={styles.helpBox}>
                  <Text style={styles.helpBoxTitle}>{item.t}</Text>
                  <Text style={styles.helpBoxContent}>{item.c}</Text>
                </View>
              ))}
              <TouchableOpacity style={styles.contactSupportBtn} onPress={openHotlineSelector}>
                <Ionicons name="headset" size={20} color="white" />
                <Text style={styles.contactSupportText}>还需要帮助？联系客服</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <AboutUsModal
        visible={showAboutModal}
        onClose={() => setShowAboutModal(false)}
        language={language}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.28)',
  },
  headerTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '700' },
  content: { flex: 1, paddingHorizontal: 20 },
  section: { marginTop: 18 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#94a3b8', marginBottom: 8, marginLeft: 4 },
  sectionGlassCard: {
    backgroundColor: '#1e293b',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.22)',
  },
  settingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  itemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: 'rgba(125, 211, 252, 0.12)',
  },
  itemText: { flex: 1 },
  itemLabel: { fontSize: 15, fontWeight: '700', color: '#f8fafc', marginBottom: 2 },
  itemSubtitle: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  glassDivider: { height: 1, backgroundColor: 'rgba(148, 163, 184, 0.16)', marginLeft: 62 },
  footer: { alignItems: 'center', paddingTop: 28, paddingBottom: 12 },
  versionText: { fontSize: 13, fontWeight: '700', color: '#94a3b8', marginBottom: 4 },
  copyright: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(2, 6, 23, 0.72)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  glassModal: {
    width: '100%',
    backgroundColor: '#152033',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.22)',
    overflow: 'hidden',
  },
  modalHeader: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.16)',
  },
  modalTitle: { color: '#f8fafc', fontSize: 17, fontWeight: '700' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: { padding: 18 },
  inputWrapper: { marginBottom: 14 },
  inputLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  textInput: {
    height: 48,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 12,
    paddingHorizontal: 14,
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.28)',
  },
  submitBtn: { height: 48, borderRadius: 12, overflow: 'hidden', marginTop: 6 },
  btnGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedOption: { borderColor: 'rgba(125, 211, 252, 0.7)', backgroundColor: 'rgba(125, 211, 252, 0.08)' },
  optionLabel: { color: '#f8fafc', fontSize: 16, fontWeight: '700', marginBottom: 2 },
  optionSub: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  modalScroll: { padding: 18 },
  helpBox: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
  },
  helpBoxTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '700', marginBottom: 6 },
  helpBoxContent: { color: '#94a3b8', fontSize: 14, lineHeight: 21, fontWeight: '600' },
  contactSupportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    height: 48,
    borderRadius: 12,
    marginTop: 6,
    marginBottom: 24,
  },
  contactSupportText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  envBlock: { padding: 14 },
  envBody: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 20,
    marginTop: 6,
    fontWeight: '600',
  },
  envFootnote: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 17,
    marginTop: 10,
    fontWeight: '600',
  },
});
