import React from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const LIGHT = ['#16356e', '#1d4ed8', '#2563eb'] as const;
const DARK = ['#0b1220', '#172554', '#1e3a8a'] as const;

type Props = {
  title: string;
  subtitle?: string;
  topInset: number;
  exitLabel: string;
  onExit: () => void;
  trailing?: React.ReactNode;
  children?: React.ReactNode;
  dark?: boolean;
  onLayout?: (event: LayoutChangeEvent) => void;
};

export function merchantExitLabel(language: string): string {
  if (language === 'en') return 'Exit';
  if (language === 'my') return 'ထွက်';
  return '退出';
}

export function MerchantHeaderIconButton({
  icon,
  onPress,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={22} color="#ffffff" />
    </Pressable>
  );
}

export default function MerchantPageHeader({
  title,
  subtitle,
  topInset,
  exitLabel,
  onExit,
  trailing,
  children,
  dark,
  onLayout,
}: Props) {
  return (
    <LinearGradient
      colors={dark ? DARK : LIGHT}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      onLayout={onLayout}
      style={[styles.shell, { paddingTop: topInset + 10 }]}
    >
      <View pointerEvents="none" style={styles.glow} />
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={exitLabel}
          onPress={onExit}
          style={({ pressed }) => [styles.exitBtn, pressed && styles.pressed]}
        >
          <Ionicons name="log-out-outline" size={16} color="#ffffff" style={styles.exitIcon} />
          <Text style={styles.exitText}>{exitLabel}</Text>
        </Pressable>
        <View style={styles.titles} pointerEvents="none">
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.trailing}>{trailing}</View>
      </View>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  shell: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
  },
  exitBtn: {
    minWidth: 72,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  exitIcon: {
    transform: [{ scaleX: -1 }],
  },
  exitText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  titles: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.76)',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  trailing: {
    width: 72,
    alignItems: 'flex-end',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.82,
  },
});
