import React from 'react';
import { ActivityIndicator } from 'react-native';
import { Button } from 'react-native-paper';

type Props = {
  title: string;
  onPress: () => void | Promise<void>;
  loading?: boolean;
  fullWidth?: boolean;
  mode?: 'contained' | 'outlined' | 'elevated' | 'contained-tonal' | 'text';
};

export function PrimaryButton({ title, onPress, loading, fullWidth = true, mode = 'contained' }: Props) {
  return (
    <Button
      mode={mode}
      onPress={onPress}
      loading={loading}
      style={{ width: fullWidth ? '100%' : undefined, marginVertical: 8 }}
      contentStyle={{ paddingVertical: 6 }}
    >
      {title}
    </Button>
  );
}

