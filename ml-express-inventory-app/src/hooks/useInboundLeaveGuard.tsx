import { HeaderBackButton } from '@react-navigation/elements';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { Alert, BackHandler } from 'react-native';
import { colors } from '../theme';

type LeaveNavigation = {
  goBack: () => void;
  setOptions: (options: Record<string, unknown>) => void;
};

export function useInboundLeaveGuard(params: {
  navigation: LeaveNavigation;
  shouldConfirm: boolean;
  title: string;
  message: string;
  stayLabel: string;
  leaveLabel: string;
}): { requestLeave: () => void } {
  const shouldConfirmRef = useRef(params.shouldConfirm);
  shouldConfirmRef.current = params.shouldConfirm;
  const copyRef = useRef(params);
  copyRef.current = params;

  const requestLeave = useCallback(() => {
    const { navigation, title, message, stayLabel, leaveLabel } = copyRef.current;
    if (!shouldConfirmRef.current) {
      navigation.goBack();
      return;
    }
    Alert.alert(title, message, [
      { text: stayLabel, style: 'cancel' },
      { text: leaveLabel, style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  }, []);

  useLayoutEffect(() => {
    const blockNativePop = params.shouldConfirm;
    params.navigation.setOptions({
      headerBackButtonMenuEnabled: false,
      headerBackVisible: false,
      gestureEnabled: !blockNativePop,
      fullScreenGestureEnabled: false,
      headerLeft: () => (
        <HeaderBackButton
          tintColor={colors.text}
          labelVisible={false}
          onPress={requestLeave}
        />
      ),
    });
  }, [params.navigation, params.shouldConfirm, requestLeave]);

  useEffect(() => {
    if (!params.shouldConfirm) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      requestLeave();
      return true;
    });
    return () => sub.remove();
  }, [params.shouldConfirm, requestLeave]);

  return { requestLeave };
}
