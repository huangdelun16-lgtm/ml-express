import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useApp } from '../contexts/AppContext';

interface LanguageSelectorProps {
  position?: 'absolute' | 'relative';
}

export default function LanguageSelector({ position = 'absolute' }: LanguageSelectorProps) {
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
    ? [styles.languageSelectorContainer, styles.absolutePosition]
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
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
  },
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  languageFlag: {
    fontSize: 20,
    marginRight: 6,
  },
  languageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginRight: 8,
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

