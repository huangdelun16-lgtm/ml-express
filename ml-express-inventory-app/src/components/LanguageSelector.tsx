import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Text from './AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from '../i18n';
import { LANGUAGES, type Language } from '../i18n/types';

type Props = {
  position?: 'absolute' | 'relative';
};

export default function LanguageSelector({ position = 'absolute' }: Props) {
  const insets = useSafeAreaInsets();
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const current = LANGUAGES.find((l) => l.code === language);

  const onSelect = (code: Language) => {
    void setLanguage(code);
    setOpen(false);
  };

  return (
    <View
      style={[
        styles.wrap,
        position === 'absolute' && {
          position: 'absolute',
          top: insets.top + 8,
          right: 16,
        },
      ]}
    >
      <Pressable style={styles.trigger} onPress={() => setOpen((v) => !v)}>
        <Text style={styles.flag}>{current?.flag}</Text>
        <Text style={styles.triggerText}>{current?.name ?? t.language.title}</Text>
        <Text style={styles.arrow}>{open ? '▲' : '▼'}</Text>
      </Pressable>
      {open ? (
        <View style={styles.menu}>
          {LANGUAGES.map((lang) => (
            <Pressable
              key={lang.code}
              style={[styles.option, language === lang.code && styles.optionActive]}
              onPress={() => onSelect(lang.code)}
            >
              <Text style={styles.optionFlag}>{lang.flag}</Text>
              <Text
                style={[
                  styles.optionText,
                  language === lang.code && styles.optionTextActive,
                ]}
              >
                {lang.name}
              </Text>
              {language === lang.code ? <Text style={styles.check}>✓</Text> : null}
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { zIndex: 1000 },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    gap: 6,
  },
  flag: { fontSize: 16 },
  triggerText: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '700',
  },
  arrow: { color: '#94a3b8', fontSize: 10, fontWeight: '800' },
  menu: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 42,
    right: 0,
    backgroundColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    minWidth: 150,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 10,
  },
  optionActive: { backgroundColor: 'rgba(14, 165, 233, 0.12)' },
  optionFlag: { fontSize: 18 },
  optionText: {
    flex: 1,
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
  },
  optionTextActive: { color: '#38bdf8', fontWeight: '800' },
  check: { color: '#38bdf8', fontWeight: '900' },
});
