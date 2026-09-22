import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Keyboard,
  PanResponder,
  Platform,
  StyleSheet,
  Vibration,
  View,
} from 'react-native';
import {
  TabRouter,
  createNavigatorFactory,
  useNavigationBuilder,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  resolveTabSwipeIndex,
  shouldCaptureTabSwipeOnRoute,
  shouldClaimTabSwipe,
  tabSwipeTranslateX,
} from '../utils/tabSwipeGesture';

const SPRING = {
  damping: 26,
  stiffness: 280,
  mass: 0.86,
  useNativeDriver: true as const,
};

function SwipeTabView({ tabBar, ...rest }: any) {
  const { state, navigation, descriptors, NavigationContent } = useNavigationBuilder(TabRouter, rest);
  const insets = useSafeAreaInsets();
  const routes = state.routes;
  const pageWidthRef = useRef(Dimensions.get('window').width);
  const [pageWidth, setPageWidth] = useState(pageWidthRef.current);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const offset = useRef(new Animated.Value(-state.index * pageWidthRef.current)).current;
  const dragging = useRef(false);
  const startIndex = useRef(state.index);
  const stateRef = useRef(state);
  const keyboardRef = useRef(false);
  const navigationRef = useRef(navigation);
  const [mountedKeys, setMountedKeys] = useState<string[]>(() => [routes[state.index]?.key].filter(Boolean));

  stateRef.current = state;
  keyboardRef.current = keyboardVisible;
  navigationRef.current = navigation;
  pageWidthRef.current = pageWidth;

  const focusedKey = routes[state.index]?.key;
  const hideOnKeyboard = descriptors[focusedKey]?.options?.tabBarHideOnKeyboard !== false;

  if (focusedKey && !mountedKeys.includes(focusedKey)) {
    setMountedKeys((prev) => (prev.includes(focusedKey) ? prev : [...prev, focusedKey]));
  }

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const index = stateRef.current.index;
      const list = stateRef.current.routes;
      const extras = [list[index - 1]?.key, list[index + 1]?.key].filter(Boolean) as string[];
      if (!extras.length) return;
      setMountedKeys((prev) => {
        const next = [...prev];
        extras.forEach((key) => {
          if (!next.includes(key)) next.push(key);
        });
        return next.length === prev.length ? prev : next;
      });
    }, 280);
    return () => clearTimeout(timer);
  }, [state.index]);

  useEffect(() => {
    if (dragging.current) return;
    Animated.spring(offset, {
      toValue: -state.index * pageWidthRef.current,
      ...SPRING,
    }).start();
  }, [offset, state.index]);

  const ensureNeighbor = (index: number, dx: number) => {
    const nextIndex = dx < 0 ? index + 1 : index - 1;
    const key = stateRef.current.routes[nextIndex]?.key;
    if (!key) return;
    setMountedKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
  };

  const snapTo = (index: number, haptic: boolean) => {
    const current = stateRef.current;
    const nextIndex = Math.max(0, Math.min(current.routes.length - 1, index));
    dragging.current = false;
    Animated.spring(offset, {
      toValue: -nextIndex * pageWidthRef.current,
      ...SPRING,
    }).start();
    if (nextIndex === current.index) return;
    if (haptic) Vibration.vibrate(10);
    navigationRef.current.navigate(current.routes[nextIndex].name as never);
  };

  const snapToRef = useRef(snapTo);
  const ensureNeighborRef = useRef(ensureNeighbor);
  snapToRef.current = snapTo;
  ensureNeighborRef.current = ensureNeighbor;

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => {
          if (keyboardRef.current) return false;
          return shouldClaimTabSwipe(gesture.dx, gesture.dy);
        },
        onMoveShouldSetPanResponderCapture: (_, gesture) => {
          if (keyboardRef.current) return false;
          const routeName = String(stateRef.current.routes[stateRef.current.index]?.name ?? '');
          return shouldCaptureTabSwipeOnRoute(
            routeName,
            gesture.x0,
            pageWidthRef.current,
            gesture.dx,
            gesture.dy,
          );
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          offset.stopAnimation();
          dragging.current = true;
          startIndex.current = stateRef.current.index;
        },
        onPanResponderMove: (_, gesture) => {
          if (Math.abs(gesture.dx) > 8) ensureNeighborRef.current(startIndex.current, gesture.dx);
          offset.setValue(
            tabSwipeTranslateX(
              startIndex.current,
              gesture.dx,
              pageWidthRef.current,
              stateRef.current.routes.length,
            ),
          );
        },
        onPanResponderRelease: (_, gesture) => {
          const nextIndex = resolveTabSwipeIndex({
            startIndex: startIndex.current,
            dx: gesture.dx,
            vx: gesture.vx,
            width: pageWidthRef.current,
            count: stateRef.current.routes.length,
          });
          snapToRef.current(nextIndex, nextIndex !== startIndex.current);
        },
        onPanResponderTerminate: () => {
          snapToRef.current(startIndex.current, false);
        },
      }),
    [offset],
  );

  const showTabBar = !(keyboardVisible && hideOnKeyboard);

  return (
    <NavigationContent>
      <View style={styles.root}>
        <View
          style={styles.pager}
          onLayout={(event) => {
            const nextWidth = event.nativeEvent.layout.width;
            if (nextWidth <= 0 || Math.abs(nextWidth - pageWidthRef.current) < 0.5) return;
            pageWidthRef.current = nextWidth;
            setPageWidth(nextWidth);
            if (!dragging.current) {
              offset.setValue(-stateRef.current.index * nextWidth);
            }
          }}
          {...pan.panHandlers}
        >
          <Animated.View
            style={[
              styles.track,
              {
                width: pageWidth * Math.max(routes.length, 1),
                transform: [{ translateX: offset }],
              },
            ]}
          >
            {routes.map((route: { key: string }, index: number) => {
              const isFocused = index === state.index;
              const mounted = mountedKeys.includes(route.key);
              return (
                <View
                  key={route.key}
                  style={[styles.page, { width: pageWidth }]}
                  pointerEvents={isFocused && !dragging.current ? 'auto' : 'none'}
                  accessibilityElementsHidden={!isFocused}
                  importantForAccessibility={isFocused ? 'yes' : 'no-hide-descendants'}
                >
                  {mounted ? descriptors[route.key].render() : <View style={styles.page} />}
                </View>
              );
            })}
          </Animated.View>
        </View>
        {showTabBar && tabBar
          ? tabBar({ state, descriptors, navigation, insets })
          : null}
      </View>
    </NavigationContent>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  pager: {
    flex: 1,
    overflow: 'hidden',
  },
  track: {
    flex: 1,
    flexDirection: 'row',
  },
  page: {
    flex: 1,
    height: '100%',
  },
});

export const createSwipeTabNavigator = createNavigatorFactory(SwipeTabView);
