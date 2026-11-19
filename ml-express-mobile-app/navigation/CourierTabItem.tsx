import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type Props = {
  focused: boolean;
  label: string;
  icon: IconName;
  iconFocused: IconName;
};

export function CourierTabItem({ focused, label, icon, iconFocused }: Props) {
  return (
    <View style={[styles.item, focused && styles.itemOn]}>
      <Ionicons
        name={focused ? iconFocused : icon}
        size={22}
        color={focused ? '#99f6e4' : '#8b9cb3'}
      />
      <Text style={[styles.label, focused && styles.labelOn]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    minWidth: 68,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 18,
  },
  itemOn: {
    backgroundColor: 'rgba(45, 212, 191, 0.16)',
  },
  label: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '600',
    color: '#8b9cb3',
  },
  labelOn: {
    color: '#ecfeff',
    fontWeight: '800',
  },
});
