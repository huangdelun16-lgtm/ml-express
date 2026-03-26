import React, { memo } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface PackageTypeChipProps {
  type: { value: string; label: string };
  isSelected: boolean;
  onPress: (value: string) => void;
  styles: any;
}

const PackageTypeChip = memo<PackageTypeChipProps>(({ type, isSelected, onPress, styles }) => {
  return (
    <TouchableOpacity
      style={[styles.chip, isSelected && styles.chipActive]}
      onPress={() => onPress(type.value)}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
        {type.label}
      </Text>
    </TouchableOpacity>
  );
});

PackageTypeChip.displayName = 'PackageTypeChip';

export default PackageTypeChip;

