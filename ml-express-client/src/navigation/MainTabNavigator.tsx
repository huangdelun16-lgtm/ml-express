import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../contexts/AppContext';
import { useCart } from '../contexts/CartContext';
import MyanmarAwareText from '../components/MyanmarAwareText';
import HomeScreen from '../screens/HomeScreen';
import PlaceOrderScreen from '../screens/PlaceOrderScreen';
import CityMallScreen from '../screens/CityMallScreen';
import CartScreen from '../screens/CartScreen';
import MyOrdersScreen from '../screens/MyOrdersScreen';
import TrackOrderScreen from '../screens/TrackOrderScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const TEAL = '#2C98A6';
const MUTED = '#94a3b8';
const TAB_MIN_WIDTH = 72;

const LABELS = {
  zh: { home: '首页', order: '下单', mall: '商场', cart: '购物车', orders: '订单', track: '追踪', profile: '我的' },
  en: { home: 'Home', order: 'Order', mall: 'Mall', cart: 'Cart', orders: 'Orders', track: 'Track', profile: 'Me' },
  my: { home: 'ပင်မ', order: 'မှာယူ', mall: 'ဈေး', cart: 'လှည်း', orders: 'အော်ဒါ', track: 'ခြေရာခံ', profile: 'ကျွန်ုပ်' },
};

function ScrollableTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { cartCount } = useCart();
  const scrollRef = useRef<ScrollView>(null);
  const itemX = useRef<Record<number, number>>({});
  const metrics = useRef({ x: 0, viewW: 0, contentW: 0 });
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const nudge = useRef(new Animated.Value(0)).current;

  const updateHints = () => {
    const { x, viewW, contentW } = metrics.current;
    if (viewW <= 0 || contentW <= 0) return;
    setCanScrollLeft(x > 6);
    setCanScrollRight(x + viewW < contentW - 6);
  };

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(nudge, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(nudge, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [nudge]);

  useEffect(() => {
    const x = itemX.current[state.index];
    if (typeof x === 'number') {
      scrollRef.current?.scrollTo({ x: Math.max(0, x - 20), animated: true });
    }
  }, [state.index]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    metrics.current = {
      x: contentOffset.x,
      viewW: layoutMeasurement.width,
      contentW: contentSize.width,
    };
    updateHints();
  };

  const hintShift = nudge.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 5],
  });

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        bounces
        contentContainerStyle={styles.row}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onLayout={(e) => {
          metrics.current.viewW = e.nativeEvent.layout.width;
          updateHints();
        }}
        onContentSizeChange={(w) => {
          metrics.current.contentW = w;
          updateHints();
        }}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const color = isFocused ? TEAL : MUTED;
          const rawLabel = options.tabBarLabel;
          const label = typeof rawLabel === 'string' ? rawLabel : route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              onPress={onPress}
              onLayout={(e) => {
                itemX.current[index] = e.nativeEvent.layout.x;
              }}
              style={styles.item}
              activeOpacity={0.7}
            >
              <View>
                {options.tabBarIcon
                  ? options.tabBarIcon({ focused: isFocused, color, size: 22 })
                  : null}
                {route.name === 'Cart' && cartCount > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
                  </View>
                ) : null}
              </View>
              <MyanmarAwareText style={[styles.label, { color }]} numberOfLines={1} myanmarWeight="semibold">
                {label}
              </MyanmarAwareText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {canScrollLeft ? (
        <View pointerEvents="none" style={styles.hintLeft}>
          <LinearGradient
            colors={['#FFFFFF', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <Animated.View
            style={{
              opacity: 0.4,
              transform: [{ translateX: Animated.multiply(hintShift, -1) }],
            }}
          >
            <Ionicons name="chevron-back" size={13} color={MUTED} />
          </Animated.View>
        </View>
      ) : null}

      {canScrollRight ? (
        <View pointerEvents="none" style={styles.hintRight}>
          <LinearGradient
            colors={['rgba(255,255,255,0)', '#FFFFFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <Animated.View style={{ opacity: 0.4, transform: [{ translateX: hintShift }] }}>
            <Ionicons name="chevron-forward" size={13} color={MUTED} />
          </Animated.View>
        </View>
      ) : null}
    </View>
  );
}

export default function MainTabNavigator() {
  const { language } = useApp();
  const labels = LABELS[language] || LABELS.zh;

  return (
    <Tab.Navigator
      tabBar={(props) => <ScrollableTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: labels.home,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="PlaceOrder"
        component={PlaceOrderScreen}
        options={{
          tabBarLabel: labels.order,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'cube' : 'cube-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="CityMall"
        component={CityMallScreen}
        options={{
          tabBarLabel: labels.mall,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'bag-handle' : 'bag-handle-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarLabel: labels.cart,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'cart' : 'cart-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="MyOrders"
        component={MyOrdersScreen}
        options={{
          tabBarLabel: labels.orders,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'clipboard' : 'clipboard-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="TrackOrder"
        component={TrackOrderScreen}
        options={{
          tabBarLabel: labels.track,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'locate' : 'locate-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: labels.profile,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
    paddingTop: 6,
  },
  row: {
    flexGrow: 1,
    paddingHorizontal: 4,
  },
  item: {
    minWidth: TAB_MIN_WIDTH,
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  label: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    paddingHorizontal: 3,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 11,
  },
  hintLeft: {
    position: 'absolute',
    left: 0,
    top: 6,
    height: 44,
    width: 26,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 2,
  },
  hintRight: {
    position: 'absolute',
    right: 0,
    top: 6,
    height: 44,
    width: 26,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 2,
  },
});
