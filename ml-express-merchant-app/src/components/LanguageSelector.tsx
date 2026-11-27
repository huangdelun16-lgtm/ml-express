import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../contexts/AppContext';

interface LanguageSelectorProps {
  position?: 'absolute' | 'relative';
}

export default function LanguageSelector({ position = 'absolute' }: LanguageSelectorProps) {
  const insets = useSafeAreaInsets();
  const { language, setLanguage } = useApp();
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  // 语言选项
  const languages = [
    { code: 'zh' as const, name: '中文', flag: '🇨🇳' },
    { code: 'en' as const, name: 'English', flag: '🇬🇧' },
    { code: 'my' as const, name: 'မြန်မာ', flag: '🇲🇲' },
  ];

  const currentLanguage = languages.find(lang => lang.code === language);

  const handleLanguageChange = (langCode: 'zh' | 'en' | 'my') => {
    setLanguage(langCode);
    setShowLanguageMenu(false);
  };

  const containerStyle = position === 'absolute'
    ? [styles.languageSelectorContainer, styles.absolutePosition, { top: insets.top + 10 }]
    : styles.languageSelectorContainer;

  return (
    <View style={containerStyle}>
      <TouchableOpacity
        style={styles.languageSelector}
        onPress={() => setShowLanguageMenu(!showLanguageMenu)}
        activeOpacity={0.7}
      >
        <Text style={styles.languageFlag}>{currentLanguage?.flag}</Text>
        <Text style={styles.languageText}>{currentLanguage?.name}</Text>
        <Text style={styles.languageArrow}>{showLanguageMenu ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {/* Language Dropdown Menu */}
      {showLanguageMenu && (
        <View style={styles.languageMenu}>
          {languages.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.languageOption,
                language === lang.code && styles.languageOptionActive
              ]}
              onPress={() => handleLanguageChange(lang.code)}
              activeOpacity={0.7}
            >
              <Text style={styles.languageOptionFlag}>{lang.flag}</Text>
              <Text style={[
                styles.languageOptionText,
                language === lang.code && styles.languageOptionTextActive
              ]}>
                {lang.name}
              </Text>
              {language === lang.code && (
                <Text style={styles.languageCheckmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  languageSelectorContainer: {
    zIndex: 1000,
  },
  absolutePosition: {
    position: 'absolute',
    right: 16,
  },
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.28)',
  },
  languageFlag: {
    fontSize: 16,
    marginRight: 6,
  },
  languageText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e2e8f0',
    marginRight: 6,
  },
  languageArrow: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  languageMenu: {
    position: 'absolute',
    top: 50,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 160,
    overflow: 'hidden',
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  languageOptionActive: {
    backgroundColor: '#eff6ff',
  },
  languageOptionFlag: {
    fontSize: 20,
    marginRight: 12,
  },
  languageOptionText: {
    fontSize: 15,
    color: '#1e293b',
    flex: 1,
    fontWeight: '500',
  },
  languageOptionTextActive: {
    color: '#3b82f6',
    fontWeight: '700',
  },
  languageCheckmark: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: 'bold',
  },
});

