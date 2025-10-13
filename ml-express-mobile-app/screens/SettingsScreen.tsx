import React, { useState, useEffect } from 'react';
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
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, adminAccountService } from '../services/supabase';
import { useApp } from '../contexts/AppContext';

export default function SettingsScreen({ navigation }: any) {
  const { language, setLanguage: setAppLanguage, setThemeMode: setAppTheme } = useApp();
  const [settings, setSettings] = useState({
    notifications: true,
    language: 'zh',
    theme: 'light',
  });
  const [currentUser, setCurrentUser] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  
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
      const userName = await AsyncStorage.getItem('currentUserName') || '用户';
      setCurrentUser(userName);
    } catch (error) {
      console.error('加载用户信息失败:', error);
    }
  };

  const saveSettings = async (newSettings: typeof settings) => {
    try {
      await AsyncStorage.setItem('appSettings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      Alert.alert('错误', '保存设置失败');
    }
  };

  const toggleNotifications = async () => {
    const newSettings = { ...settings, notifications: !settings.notifications };
    await saveSettings(newSettings);
    Alert.alert('设置已更新', settings.notifications ? '通知已关闭' : '通知已开启');
  };

  const changeLanguage = async (lang: string) => {
    const newSettings = { ...settings, language: lang };
    await saveSettings(newSettings);
    await setAppLanguage(lang); // 更新全局语言状态
    setShowLanguageModal(false);
    
    const langName = lang === 'zh' ? '中文' : lang === 'en' ? 'English' : 'မြန်မာ';
    Alert.alert(
      language === 'zh' ? '设置已更新' : language === 'en' ? 'Settings Updated' : 'အပြင်အဆင်ပြောင်းလဲပြီး',
      language === 'zh' ? `语言已切换为${langName}` : language === 'en' ? `Language changed to ${langName}` : `ဘာသာစကားပြောင်းလဲပြီး ${langName}`
    );
  };

  const changeTheme = async (theme: string) => {
    const newSettings = { ...settings, theme };
    await saveSettings(newSettings);
    await setAppTheme(theme); // 更新全局主题状态
    setShowThemeModal(false);
    
    const themeName = theme === 'light' 
      ? (language === 'zh' ? '浅色' : language === 'en' ? 'Light' : 'အလင်း')
      : (language === 'zh' ? '深色' : language === 'en' ? 'Dark' : 'အမှောင်');
    
    Alert.alert(
      language === 'zh' ? '设置已更新' : language === 'en' ? 'Settings Updated' : 'အပြင်အဆင်ပြောင်းလဲပြီး',
      language === 'zh' ? `主题已切换为${themeName}模式` : language === 'en' ? `Theme changed to ${themeName} mode` : `အပြင်အဆင်ပြောင်းလဲပြီး ${themeName}`
    );
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      Alert.alert('提示', '请填写当前密码和新密码');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Alert.alert('错误', '新密码和确认密码不匹配');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      Alert.alert('错误', '密码长度至少6位');
      return;
    }

    try {
      // 调用后端API修改密码
      const success = await adminAccountService.updatePassword(currentUser, passwordForm.newPassword);

      if (success) {
        Alert.alert(language === 'zh' ? '成功' : 'Success', language === 'zh' ? '密码修改成功，下次登录时生效' : 'Password changed successfully, will take effect on next login');
        setShowPasswordModal(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        Alert.alert(language === 'zh' ? '错误' : 'Error', language === 'zh' ? '密码修改失败，请重试' : 'Failed to change password, please try again');
      }
    } catch (error) {
      console.error('密码修改失败:', error);
      Alert.alert(language === 'zh' ? '错误' : 'Error', language === 'zh' ? '网络错误，请检查连接' : 'Network error, please check connection');
    }
  };

  const handleChangeUsername = async () => {
    if (!usernameForm.newUsername || usernameForm.newUsername.length < 3) {
      Alert.alert(language === 'zh' ? '错误' : 'Error', language === 'zh' ? '用户名长度至少3位' : 'Username must be at least 3 characters');
      return;
    }

    try {
      // 调用后端API修改用户名
      const success = await adminAccountService.updateUsername(currentUser, usernameForm.newUsername);

      if (success) {
        Alert.alert(language === 'zh' ? '成功' : 'Success', language === 'zh' ? '用户名修改成功，下次登录时生效' : 'Username changed successfully, will take effect on next login');

        // 更新本地存储的用户名
        await AsyncStorage.setItem('currentUserName', usernameForm.newUsername);

        setShowUsernameModal(false);
        setUsernameForm({ currentUsername: '', newUsername: '' });
        loadUserInfo(); // 重新加载用户信息
      } else {
        Alert.alert(language === 'zh' ? '错误' : 'Error', language === 'zh' ? '用户名修改失败，可能用户名已存在' : 'Failed to change username, username may already exist');
      }
    } catch (error) {
      console.error('用户名修改失败:', error);
      Alert.alert(language === 'zh' ? '错误' : 'Error', language === 'zh' ? '网络错误，请检查连接' : 'Network error, please check connection');
    }
  };

  const checkPermissions = async () => {
    // 检查各种权限状态
    setShowPermissionsModal(true);
  };

  const settingSections = [
    {
      title: language === 'zh' ? '通用设置' : language === 'en' ? 'General Settings' : 'ယေဘုယျချိန်ညှိမှု',
      items: [
        { 
          icon: '🔔', 
          label: language === 'zh' ? '推送通知' : language === 'en' ? 'Push Notifications' : 'အသိပေးချက်များ', 
          subtitle: settings.notifications 
            ? (language === 'zh' ? '已开启' : language === 'en' ? 'Enabled' : 'ဖွင့်ထားသည်') 
            : (language === 'zh' ? '已关闭' : language === 'en' ? 'Disabled' : 'ပိတ်ထားသည်'), 
          action: toggleNotifications,
          hasSwitch: true,
          switchValue: settings.notifications,
        },
        { 
          icon: '🌐', 
          label: language === 'zh' ? '语言设置' : language === 'en' ? 'Language Settings' : 'ဘာသာစကားချိန်ညှိမှု', 
          subtitle: settings.language === 'zh' ? '中文' : settings.language === 'en' ? 'English' : 'မြန်မာ', 
          action: () => setShowLanguageModal(true)
        },
        { 
          icon: '🎨', 
          label: language === 'zh' ? '主题模式' : language === 'en' ? 'Theme Mode' : 'အပြင်အဆင်ပုံစံ', 
          subtitle: settings.theme === 'light' 
            ? (language === 'zh' ? '浅色模式' : language === 'en' ? 'Light Mode' : 'အလင်းပုံစံ') 
            : (language === 'zh' ? '深色模式' : language === 'en' ? 'Dark Mode' : 'အမှောင်ပုံစံ'), 
          action: () => setShowThemeModal(true)
        },
      ]
    },
    {
      title: language === 'zh' ? '账户与安全' : language === 'en' ? 'Account & Security' : 'အကောင့်နှင့်လုံခြုံရေး',
      items: [
        {
          icon: '👤',
          label: language === 'zh' ? '修改用户名' : language === 'en' ? 'Change Username' : 'အသုံးပြုသူအမည်ပြောင်းရန်',
          subtitle: language === 'zh' ? '更改登录用户名' : language === 'en' ? 'Change login username' : 'အကောင့်ဝင်ရောက်ရန်အမည်ပြောင်းရန်',
          action: () => setShowUsernameModal(true)
        },
        {
          icon: '🔐',
          label: language === 'zh' ? '修改密码' : language === 'en' ? 'Change Password' : 'စကားဝှက်ပြောင်းရန်',
          subtitle: language === 'zh' ? '保护账户安全' : language === 'en' ? 'Protect account security' : 'အကောင့်လုံခြုံရေးကာကွယ်ရန်',
          action: () => setShowPasswordModal(true)
        },
        { 
          icon: '📱', 
          label: language === 'zh' ? '权限管理' : language === 'en' ? 'Permission Management' : 'ခွင့်ပြုချက်စီမံခန့်ခွဲမှု', 
          subtitle: language === 'zh' ? '管理应用权限' : language === 'en' ? 'Manage app permissions' : 'အက်ပ်ခွင့်ပြုချက်များစီမံရန်', 
          action: checkPermissions
        },
        { 
          icon: '🛡️', 
          label: language === 'zh' ? '隐私设置' : language === 'en' ? 'Privacy Settings' : 'ကိုယ်ရေးကိုယ်တာချိန်ညှိမှု', 
          subtitle: language === 'zh' ? '数据隐私保护' : language === 'en' ? 'Data privacy protection' : 'ဒေတာကိုယ်ရေးလုံခြုံရေး', 
          action: () => Alert.alert(
            language === 'zh' ? '隐私设置' : language === 'en' ? 'Privacy Settings' : 'ကိုယ်ရေးကိုယ်တာချိန်ညှိမှု',
            language === 'zh' 
              ? '🔒 数据加密存储\n📍 位置信息保护\n👤 个人信息安全\n\n我们严格保护您的隐私'
              : language === 'en' 
              ? '🔒 Encrypted data storage\n📍 Location information protection\n👤 Personal information security\n\nWe strictly protect your privacy'
              : '🔒 ဒေတာကုဒ်ဝှက်သိမ်းဆည်းမှု\n📍 တည်နေရာအချက်အလက်ကာကွယ်မှု\n👤 ကိုယ်ရေးကိုယ်တာအချက်အလက်လုံခြုံရေး\n\nသင့်ကိုယ်ရေးကိုယ်တာကို ကျွန်ုပ်တို့တင်းကြပ်စွာကာကွယ်ပါသည်'
          )
        },
      ]
    },
    {
      title: language === 'zh' ? '帮助与支持' : language === 'en' ? 'Help & Support' : 'အကူအညီနှင့်ပံ့ပိုးမှု',
      items: [
        { 
          icon: 'ℹ️', 
          label: language === 'zh' ? '关于我们' : language === 'en' ? 'About Us' : 'ကျွန်ုပ်တို့အကြောင်း', 
          subtitle: 'Market Link Express', 
          action: () => setShowAboutModal(true)
        },
        { 
          icon: '📖', 
          label: language === 'zh' ? '使用帮助' : language === 'en' ? 'User Guide' : 'အသုံးပြုရန်လမ်းညွှန်', 
          subtitle: language === 'zh' ? '功能使用指南' : language === 'en' ? 'Feature usage guide' : 'လုပ်ဆောင်ချက်အသုံးပြုရန်လမ်းညွှန်', 
          action: () => setShowHelpModal(true)
        },
        { 
          icon: '🌐', 
          label: language === 'zh' ? '访问网站' : 'Visit Website', 
          subtitle: 'market-link-express.com', 
          action: () => Linking.openURL('https://market-link-express.com')
        },
        { 
          icon: '📞', 
          label: language === 'zh' ? '联系客服' : 'Contact Support', 
          subtitle: '09-000000000', 
          action: () => Linking.openURL('tel:09-000000000')
        },
      ]
    },
  ];

  return (
    <View style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>⚙️ {language === 'zh' ? '设置系统' : language === 'en' ? 'System Settings' : 'စနစ်ချိန်ညှိမှု'}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.content}>
        {settingSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, itemIndex) => (
                <View key={itemIndex}>
                  <TouchableOpacity
                    style={styles.settingItem}
                    onPress={item.action}
                    activeOpacity={0.7}
                  >
                    <View style={styles.itemLeft}>
                      <View style={styles.iconContainer}>
                        <Text style={styles.itemIcon}>{item.icon}</Text>
                      </View>
                      <View style={styles.itemText}>
                        <Text style={styles.itemLabel}>{item.label}</Text>
                        <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                      </View>
                    </View>
                    {(item as any).hasSwitch ? (
                      <Switch
                        value={(item as any).switchValue}
                        onValueChange={item.action}
                        trackColor={{ false: '#e5e7eb', true: '#2c5282' }}
                        thumbColor={(item as any).switchValue ? '#fff' : '#f4f3f4'}
                      />
                    ) : (
                      <Text style={styles.itemArrow}>›</Text>
                    )}
                  </TouchableOpacity>
                  {itemIndex < section.items.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* 版本信息 */}
        <View style={styles.versionSection}>
          <Text style={styles.versionText}>Market Link Express Mobile</Text>
          <Text style={styles.versionNumber}>{language === 'zh' ? '版本 1.0.0' : 'Version 1.0.0'}</Text>
          <Text style={styles.copyright}>© 2025 Market Link Express</Text>
        </View>
      </ScrollView>

      {/* 修改密码模态框 */}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🔐 {language === 'zh' ? '修改密码' : language === 'en' ? 'Change Password' : 'စကားဝှက်ပြောင်းရန်'}</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.passwordForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{language === 'zh' ? '当前密码 *' : 'Current Password *'}</Text>
                <TextInput
                  style={styles.textInput}
                  value={passwordForm.currentPassword}
                  onChangeText={(text) => setPasswordForm({...passwordForm, currentPassword: text})}
                  placeholder={language === 'zh' ? '请输入当前密码' : 'Enter current password'}
                  secureTextEntry={true}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{language === 'zh' ? '新密码 *' : 'New Password *'}</Text>
                <TextInput
                  style={styles.textInput}
                  value={passwordForm.newPassword}
                  onChangeText={(text) => setPasswordForm({...passwordForm, newPassword: text})}
                  placeholder={language === 'zh' ? '请输入新密码（至少6位）' : 'Enter new password (min 6 characters)'}
                  secureTextEntry={true}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>确认密码 *</Text>
                <TextInput
                  style={styles.textInput}
                  value={passwordForm.confirmPassword}
                  onChangeText={(text) => setPasswordForm({...passwordForm, confirmPassword: text})}
                  placeholder="请再次输入新密码"
                  secureTextEntry={true}
                />
              </View>

              <View style={styles.passwordButtonContainer}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowPasswordModal(false);
                    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                >
                  <Text style={styles.cancelButtonText}>{language === 'zh' ? '取消' : language === 'en' ? 'Cancel' : 'ပယ်ဖျက်ရန်'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitButton} onPress={handleChangePassword}>
                  <Text style={styles.submitButtonText}>{language === 'zh' ? '确认修改' : language === 'en' ? 'Confirm Change' : 'အတည်ပြုပြောင်းလဲရန်'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* 用户名修改模态框 */}
      <Modal
        visible={showUsernameModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUsernameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>👤 {language === 'zh' ? '修改用户名' : language === 'en' ? 'Change Username' : 'အသုံးပြုသူအမည်ပြောင်းရန်'}</Text>
              <TouchableOpacity onPress={() => setShowUsernameModal(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.passwordForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{language === 'zh' ? '新用户名 *' : 'New Username *'}</Text>
                <TextInput
                  style={styles.textInput}
                  value={usernameForm.newUsername}
                  onChangeText={(text) => setUsernameForm({...usernameForm, newUsername: text})}
                  placeholder={language === 'zh' ? '请输入新用户名（至少3位）' : 'Enter new username (min 3 characters)'}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.passwordButtonContainer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowUsernameModal(false);
                    setUsernameForm({ currentUsername: '', newUsername: '' });
                  }}
                >
                  <Text style={styles.cancelButtonText}>{language === 'zh' ? '取消' : language === 'en' ? 'Cancel' : 'ပယ်ဖျက်ရန်'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitButton} onPress={handleChangeUsername}>
                  <Text style={styles.submitButtonText}>{language === 'zh' ? '确认修改' : language === 'en' ? 'Confirm Change' : 'အတည်ပြုပြောင်းလဲရန်'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* 语言设置模态框 */}
      <Modal
        visible={showLanguageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.smallModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                🌐 {language === 'zh' ? '语言设置' : language === 'en' ? 'Language Settings' : 'ဘာသာစကားချိန်ညှိမှု'}
              </Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.optionsContainer}>
              {[
                { key: 'zh', label: '中文', subtitle: '简体中文' },
                { key: 'en', label: 'English', subtitle: 'English' },
                { key: 'my', label: 'မြန်မာ', subtitle: 'Myanmar' },
              ].map(lang => (
                <TouchableOpacity
                  key={lang.key}
                  style={[styles.optionItem, settings.language === lang.key && styles.selectedOption]}
                  onPress={() => changeLanguage(lang.key)}
                >
                  <View style={styles.optionContent}>
                    <Text style={styles.optionLabel}>{lang.label}</Text>
                    <Text style={styles.optionSubtitle}>{lang.subtitle}</Text>
                  </View>
                  {settings.language === lang.key && (
                    <Text style={styles.checkIcon}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* 主题设置模态框 */}
      <Modal
        visible={showThemeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowThemeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.smallModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🎨 {language === 'zh' ? '主题模式' : language === 'en' ? 'Theme Mode' : 'အပြင်အဆင်ပုံစံ'}</Text>
              <TouchableOpacity onPress={() => setShowThemeModal(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.optionsContainer}>
              {[
                { key: 'light', label: '浅色模式', subtitle: '适合白天使用', icon: '☀️' },
                { key: 'dark', label: '深色模式', subtitle: '适合夜间使用', icon: '🌙' },
                { key: 'auto', label: '自动切换', subtitle: '跟随系统设置', icon: '🔄' },
              ].map(theme => (
                <TouchableOpacity
                  key={theme.key}
                  style={[styles.optionItem, settings.theme === theme.key && styles.selectedOption]}
                  onPress={() => changeTheme(theme.key)}
                >
                  <Text style={styles.themeIcon}>{theme.icon}</Text>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionLabel}>{theme.label}</Text>
                    <Text style={styles.optionSubtitle}>{theme.subtitle}</Text>
                  </View>
                  {settings.theme === theme.key && (
                    <Text style={styles.checkIcon}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* 关于我们模态框 */}
      <Modal
        visible={showAboutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAboutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ℹ️ {language === 'zh' ? '关于我们' : language === 'en' ? 'About Us' : 'ကျွန်ုပ်တို့အကြောင်း'}</Text>
              <TouchableOpacity onPress={() => setShowAboutModal(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.aboutContent}>
              <View style={styles.aboutLogoSection}>
                <Image 
                  source={require('../assets/logo.png')} 
                  style={styles.aboutLogoImage}
                  resizeMode="contain"
                />
                <Text style={styles.aboutCompanyName}>Market Link Express</Text>
                <Text style={styles.aboutSlogan}>缅甸专业快递服务</Text>
              </View>

              <View style={styles.aboutInfo}>
                <Text style={styles.aboutTitle}>🚚 关于我们</Text>
                <Text style={styles.aboutDescription}>
                  Market Link Express 是缅甸领先的快递服务提供商，致力于为客户提供快速、安全、可靠的配送服务。
                  我们拥有专业的快递团队和先进的管理系统，确保每一个包裹都能准时安全送达。
                </Text>

                <Text style={styles.aboutTitle}>📋 服务范围</Text>
                <Text style={styles.aboutDescription}>
                  • 同城快递配送（1-3小时送达）
                  • 包裹实时追踪服务
                  • 文件、物品、食品配送
                  • 企业定制物流解决方案
                </Text>

                <Text style={styles.aboutTitle}>📞 联系我们</Text>
                <View style={styles.contactInfo}>
                  <TouchableOpacity 
                    style={styles.contactItem}
                    onPress={() => Linking.openURL('tel:09-000000000')}
                  >
                    <Text style={styles.contactIcon}>📞</Text>
                    <Text style={styles.contactText}>客服热线: 09-000000000</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.contactItem}
                    onPress={() => Linking.openURL('https://market-link-express.com')}
                  >
                    <Text style={styles.contactIcon}>🌐</Text>
                    <Text style={styles.contactText}>官方网站: market-link-express.com</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.versionInfo}>版本 1.0.0 | © 2025 Market Link Express</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 使用帮助模态框 */}
      <Modal
        visible={showHelpModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowHelpModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📖 {language === 'zh' ? '使用帮助' : language === 'en' ? 'User Guide' : 'အသုံးပြုရန်လမ်းညွှန်'}</Text>
              <TouchableOpacity onPress={() => setShowHelpModal(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.helpContent}>
              {[
                {
                  title: '📦 如何下单',
                  content: '1. 在首页点击"立即下单"\n2. 填写寄件人和收件人信息\n3. 选择包裹类型和重量\n4. 确认价格后提交订单\n5. 获得包裹编号用于追踪'
                },
                {
                  title: '🔍 如何追踪包裹',
                  content: '1. 在首页点击"包裹追踪"\n2. 输入包裹编号\n3. 点击查询查看详细状态\n4. 包裹状态包括：待取件、已取件、配送中、已送达'
                },
                {
                  title: '📞 如何联系客服',
                  content: '1. 在首页点击"联系客服"\n2. 或拨打客服热线：09-000000000\n3. 客服时间：周一至周日 8:00-22:00\n4. 微信客服：（开发中）'
                },
                {
                  title: '💰 配送费用',
                  content: '基础费用：1,500 MMK\n超重费：>5kg +200 MMK/kg\n易碎品费：+500 MMK\n价格透明，下单时实时显示'
                },
                {
                  title: '⏰ 配送时间',
                  content: '同城配送：1-3小时\n取件时间：周一至周日 8:00-20:00\n配送时间：周一至周日 8:00-22:00\n紧急配送：24小时服务'
                },
                {
                  title: '🛡️ 安全保障',
                  content: '包裹保险：免费基础保险\n丢失赔付：按价值100%赔付\n破损保护：专业包装保护\nGPS追踪：全程位置追踪'
                },
              ].map((help, index) => (
                <View key={index} style={styles.helpSection}>
                  <Text style={styles.helpTitle}>{help.title}</Text>
                  <Text style={styles.helpText}>{help.content}</Text>
                </View>
              ))}

              <View style={styles.helpContact}>
                <Text style={styles.helpContactTitle}>还有问题？</Text>
                <TouchableOpacity 
                  style={styles.helpContactButton}
                  onPress={() => Linking.openURL('tel:09-000000000')}
                >
                  <Text style={styles.helpContactButtonText}>📞 联系客服</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 权限管理模态框 */}
      <Modal
        visible={showPermissionsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPermissionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📱 {language === 'zh' ? '权限管理' : language === 'en' ? 'Permission Management' : 'ခွင့်ပြုချက်စီမံခန့်ခွဲမှု'}</Text>
              <TouchableOpacity onPress={() => setShowPermissionsModal(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.permissionsContent}>
              {[
                {
                  icon: '📍',
                  title: '位置权限',
                  description: '用于显示快递员位置和导航功能',
                  status: 'granted',
                  action: () => Alert.alert('位置权限', '当前已授权\n\n如需修改，请前往手机设置 > 应用权限')
                },
                {
                  icon: '📷',
                  title: '相机权限',
                  description: '用于扫描包裹二维码功能',
                  status: 'granted',
                  action: () => Alert.alert('相机权限', '当前已授权\n\n如需修改，请前往手机设置 > 应用权限')
                },
                {
                  icon: '🔔',
                  title: '通知权限',
                  description: '用于接收重要消息和状态更新',
                  status: 'granted',
                  action: () => Alert.alert('通知权限', '当前已授权\n\n如需修改，请前往手机设置 > 应用权限')
                },
                {
                  icon: '📱',
                  title: '网络权限',
                  description: '用于数据同步和在线功能',
                  status: 'granted',
                  action: () => Alert.alert('网络权限', '当前已授权\n\n如需修改，请前往手机设置 > 应用权限')
                },
              ].map((permission, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.permissionItem}
                  onPress={permission.action}
                >
                  <Text style={styles.permissionIcon}>{permission.icon}</Text>
                  <View style={styles.permissionInfo}>
                    <Text style={styles.permissionTitle}>{permission.title}</Text>
                    <Text style={styles.permissionDescription}>{permission.description}</Text>
                  </View>
                  <View style={[styles.permissionStatus, {
                    backgroundColor: permission.status === 'granted' ? '#d4edda' : '#f8d7da'
                  }]}>
                    <Text style={[styles.permissionStatusText, {
                      color: permission.status === 'granted' ? '#27ae60' : '#e74c3c'
                    }]}>
                      {permission.status === 'granted' ? '已授权' : '未授权'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}

              <View style={styles.permissionNote}>
                <Text style={styles.permissionNoteText}>
                  💡 提示：如需修改权限设置，请前往手机系统设置中的应用权限管理。
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  header: {
    backgroundColor: '#2c5282',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '300',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
    marginBottom: 12,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemIcon: {
    fontSize: 22,
  },
  itemText: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 3,
  },
  itemSubtitle: {
    fontSize: 13,
    color: '#999',
  },
  itemArrow: {
    fontSize: 24,
    color: '#e5e7eb',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 72,
  },
  versionSection: {
    alignItems: 'center',
    padding: 40,
    paddingTop: 30,
  },
  versionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  versionNumber: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  copyright: {
    fontSize: 11,
    color: '#ccc',
  },
  // 模态框样式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  smallModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
    width: '100%',
    maxWidth: 350,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  // 密码修改样式
  passwordForm: {
    paddingVertical: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    backgroundColor: '#f8f9fa',
    color: '#2c3e50',
  },
  passwordButtonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#27ae60',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
  },
  // 选项列表样式
  optionsContainer: {
    paddingVertical: 16,
    gap: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectedOption: {
    backgroundColor: '#e8f4fd',
    borderColor: '#2c5282',
  },
  themeIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  checkIcon: {
    fontSize: 20,
    color: '#2c5282',
    fontWeight: 'bold',
  },
  // 关于我们样式
  aboutContent: {
    paddingVertical: 16,
  },
  aboutLogoSection: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 20,
  },
  aboutLogoImage: {
    width: 120,
    height: 120,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  aboutCompanyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  aboutSlogan: {
    fontSize: 14,
    color: '#666',
  },
  aboutInfo: {
    gap: 16,
  },
  aboutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c5282',
    marginBottom: 8,
  },
  aboutDescription: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 22,
    marginBottom: 8,
  },
  contactInfo: {
    gap: 8,
    marginBottom: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  contactIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  contactText: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  versionInfo: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  // 帮助页面样式
  helpContent: {
    paddingVertical: 16,
  },
  helpSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c5282',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#2c3e50',
    lineHeight: 22,
  },
  helpContact: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#e8f4fd',
    borderRadius: 12,
    marginTop: 10,
  },
  helpContactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  helpContactButton: {
    backgroundColor: '#2c5282',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  helpContactButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
  },
  // 权限管理样式
  permissionsContent: {
    paddingVertical: 16,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  permissionIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  permissionInfo: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  permissionStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  permissionStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  permissionNote: {
    backgroundColor: '#e8f4fd',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  permissionNoteText: {
    fontSize: 13,
    color: '#2c5282',
    lineHeight: 20,
    textAlign: 'center',
  },
});
