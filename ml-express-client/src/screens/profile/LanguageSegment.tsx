import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import MyanmarAwareText from '../../components/MyanmarAwareText';
import {
  languageIndex,
  languagePillMetrics,
  PROFILE_LANGUAGES,
  type ProfileLanguage,
} from '../../utils/profileLanguage';

export default function LanguageSegment({
  language,
  onChange,
}: {
  language: ProfileLanguage;
  onChange: (lang: ProfileLanguage) => void;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const pillX = useRef(new Animated.Value(0)).current;
  const lastWidth = useRef(0);
  const index = languageIndex(language);
  const pill = languagePillMetrics(trackWidth, index);

  useEffect(() => {
    if (trackWidth <= 0) return;
    const widthChanged = Math.abs(trackWidth - lastWidth.current) > 1;
    lastWidth.current = trackWidth;
    if (widthChanged) {
      pillX.setValue(pill.x);
      return;
    }
    Animated.spring(pillX, {
      toValue: pill.x,
      damping: 22,
      stiffness: 260,
      mass: 0.7,
      useNativeDriver: true,
    }).start();
  }, [pill.x, pillX, trackWidth]);

  return (
    <View
      style={styles.track}
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
    >
      {trackWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pill,
            {
              width: pill.width,
              transform: [{ translateX: pillX }],
            },
          ]}
        />
      ) : null}
      {PROFILE_LANGUAGES.map((item) => {
        const active = language === item.code;
        return (
          <Pressable
            key={item.code}
            accessibilityRole="button"
            accessibilityLabel={item.nativeLabel}
            accessibilityState={{ selected: active }}
            android_ripple={{ color: 'rgba(44,152,166,0.16)' }}
            onPress={() => onChange(item.code)}
            style={styles.cell}
          >
            <MyanmarAwareText
              text={item.nativeLabel}
              myanmarWeight="bold"
              numberOfLines={1}
              style={[styles.label, active && styles.labelOn]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    padding: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  pill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 0,
    borderRadius: 11,
    backgroundColor: '#2C98A6',
    shadowColor: '#0F766E',
    shadowOpacity: 0.22,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cell: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748b',
    lineHeight: 20,
  },
  labelOn: {
    color: '#fff',
  },
});
