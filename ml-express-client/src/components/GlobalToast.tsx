import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Toast from './Toast';
import { toastService, ToastMessage } from '../services/ToastService';

export const GlobalToast: React.FC = () => {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleShow = (message: ToastMessage) => {
      setToast(message);
      setVisible(true);
    };

    const handleHide = () => {
      setVisible(false);
    };

    toastService.on('show', handleShow);
    toastService.on('hide', handleHide);

    return () => {
      toastService.off('show', handleShow);
      toastService.off('hide', handleHide);
    };
  }, []);

  const handleHide = () => {
    setVisible(false);
    toastService.dismiss();
  };

  if (!toast) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Toast
        message={toast.message}
        type={toast.type}
        visible={visible}
        duration={toast.duration}
        onHide={handleHide}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    pointerEvents: 'box-none',
  },
});

