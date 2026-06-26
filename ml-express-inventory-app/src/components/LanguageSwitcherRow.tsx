import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from '../i18n';
import { LANGUAGES, type Language } from '../i18n/types';

export default function LanguageSwitcherRow() {
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t.language.title}</Text>
      <View style={styles.row}>
        {LANGUAGES.map((lang) => {
          const active = language === lang.code;
          return (
            <Pressable
              key={lang.code}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => void setLanguage(lang.code as Language)}
            >
              <Text style={styles.chipFlag}>{lang.flag}</Text>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {lang.code === 'zh' ? t.language.zh : lang.code === 'en' ? t.language.en : t.language.my}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 4 },
  title: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  row: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1e293b',
  },
  chipActive: {
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
  },
  chipFlag: { fontSize: 16 },
  chipText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextActive: { color: '#7dd3fc' },
});
