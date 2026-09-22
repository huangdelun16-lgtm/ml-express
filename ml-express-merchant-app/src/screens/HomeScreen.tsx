import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Image,
  Dimensions,
  Animated,
  RefreshControl,
  Alert,
  Platform,
  DeviceEventEmitter,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useApp } from "../contexts/AppContext";
import { useLoading } from "../contexts/LoadingContext";
import { LinearGradient } from "expo-linear-gradient";
import Skeleton, {
  StatsCardSkeleton,
  OrderCardSkeleton,
} from "../components/Skeleton";
import { Ionicons } from "@expo/vector-icons";
import {
  merchantService,
  packageService,
  deliveryStoreService,
  supabase,
  type Product,
} from "../services/supabase";
import { theme } from "../config/theme";
import { analytics } from "../services/AnalyticsService";
import { STORE_AVATAR_UPDATED, storeAvatarDisplayUri } from "../utils/storeAvatar";
import { pickHomeSpotlightProducts, spotlightOffer } from "../utils/homeSpotlightProducts";
import { rewritePublicStorageUrl } from "../services/merchantApi/nativeSupabaseUrl";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

interface MerchantStats {
  pendingConfirm: number;
  awaitingPayment: number;
  awaitingPickup: number;
  processing: number;
  pickedUp: number;
  delivering: number;
  completed: number;
  revenueOneYear: number;
  yesterdayRevenue: number;
  todayRevenue: number;
  urgent: number;
  standard: number;
  todayOrderCount: number;
  yesterdayOrderCount: number;
}

export default function HomeScreen({ navigation }: any) {
  const { language, isDarkMode } = useApp();
  const { showLoading, hideLoading } = useLoading();
  const insets = useSafeAreaInsets();

  const [refreshing, setRefreshing] = useState(false);
  const [merchantInfo, setMerchantInfo] = useState<any>(null);
  const [stats, setStats] = useState<MerchantStats>({
    pendingConfirm: 0,
    awaitingPayment: 0,
    awaitingPickup: 0,
    processing: 0,
    pickedUp: 0,
    delivering: 0,
    completed: 0,
    revenueOneYear: 0,
    yesterdayRevenue: 0,
    todayRevenue: 0,
    urgent: 0,
    standard: 0,
    todayOrderCount: 0,
    yesterdayOrderCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [spotlightProducts, setSpotlightProducts] = useState<Product[]>([]);
  const scrollY = useRef(new Animated.Value(0)).current;

  const t = {
    zh: {
      welcome: "欢迎回来, 合作伙伴",
      businessStatus: "经营概况",
      pendingOrders: "待确认",
      awaitingPaymentOrders: "待收款",
      pickupPendingOrders: "待取件",
      processingOrders: "打包中",
      pickedUpOrders: "已取件",
      deliveringOrders: "配送中",
      completedOrders: "已送达",
      revenueOneYear: "总营收",
      revenueOneYearHint: "本年度（1/1 起）· 已送达 · MMK",
      revenueYesterday: "昨日营收",
      revenueToday: "今日营收",
      revenueMmkHint: "已送达 · MMK",
      manageProducts: "商品管理",
      printerSettings: "打印设置",
      myOrders: "订单列表",
      profile: "店铺资料",
      recentActivity: "近期动态",
      noActivity: "暂无新动态",
      refresh: "下拉刷新数据",
      urgentOrders: "急件",
      standardOrders: "标准",
      revenueChart: "营收对比 (今日 vs 昨日)",
      orderCountUnit: "单",
      today: "今日",
      yesterday: "昨日",
      placeOrder: "立即下单",
      myProducts: "我的商品",
      spotlightOff: "已下架",
    },
    en: {
      welcome: "Welcome Back, Partner",
      businessStatus: "Business Overview",
      pendingOrders: "To confirm",
      awaitingPaymentOrders: "To collect",
      pickupPendingOrders: "Awaiting pickup",
      processingOrders: "Packing",
      pickedUpOrders: "Picked up",
      deliveringOrders: "In transit",
      completedOrders: "Delivered",
      revenueOneYear: "Total revenue",
      revenueOneYearHint: "YTD (Jan 1) · delivered · MMK",
      revenueYesterday: "Yesterday",
      revenueToday: "Today",
      revenueMmkHint: "Delivered · MMK",
      manageProducts: "Products",
      printerSettings: "Printer",
      myOrders: "Orders",
      profile: "Store Info",
      recentActivity: "Recent Activity",
      noActivity: "No recent activity",
      refresh: "Pull to refresh",
      urgentOrders: "Urgent",
      standardOrders: "Standard",
      revenueChart: "Revenue (Today vs Yesterday)",
      orderCountUnit: " orders",
      today: "Today",
      yesterday: "Yesterday",
      placeOrder: "Place Order",
      myProducts: "Products",
      spotlightOff: "Off shelf",
    },
    my: {
      welcome: "ပြန်လည်ကြိုဆိုပါတယ် မိတ်ဖက်",
      businessStatus: "စီးပွားရေးအခြေအနေ",
      pendingOrders: "အတည်ပြုရန်",
      awaitingPaymentOrders: "ငွေကောက်ရန်",
      pickupPendingOrders: "ယူရန်စောင့်ဆိုင်း",
      processingOrders: "ထုပ်ပိုးနေသည်",
      pickedUpOrders: "ထုပ်ယူပြီး",
      deliveringOrders: "ပို့ဆောင်နေသည်",
      completedOrders: "ပို့ဆောင်ပြီး",
      revenueOneYear: "စုစုဝင်ငွေ (၁ နှစ်)",
      revenueOneYearHint: "ယခုနှစ် ၁.၁ မှ · ပို့ဆောင်ပြီး · MMK",
      revenueYesterday: "မနေ့က ဝင်ငွေ",
      revenueToday: "ယနေ့ ဝင်ငွေ",
      revenueMmkHint: "ပို့ဆောင်ပြီး · MMK",
      manageProducts: "ကုန်ပစ္စည်းများ",
      printerSettings: "ပရင်တာ",
      myOrders: "အော်ဒါများ",
      profile: "ဆိုင်အချက်အလက်",
      recentActivity: "လတ်တလောလှုပ်ရှားမှု",
      noActivity: "လှုပ်ရှားမှုမရှိပါ",
      refresh: "ဒေတာအသစ်ရယူရန်",
      urgentOrders: "အရေးကြီး",
      standardOrders: "ပုံမှန်",
      revenueChart: "ဝင်ငွေနှိုင်းယှဉ်ချက်",
      orderCountUnit: " ခု",
      today: "ယနေ့",
      yesterday: "မနေ့က",
      placeOrder: "အော်ဒါတင်မည်",
      myProducts: "ကုန်ပစ္စည်းများ",
      spotlightOff: "ပိတ်ထား",
    },
  };

  const currentT = t[language] || t.zh;

  const loadData = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true;
    try {
      if (!silent) setLoading(true);
      const [userId, cachedName] = await Promise.all([
        AsyncStorage.getItem("userId"),
        AsyncStorage.getItem("userName"),
      ]);
      if (!userId) {
        navigation.replace("Login");
        return;
      }

      if (cachedName) {
        setMerchantInfo((prev: any) =>
          prev?.store_name ? prev : { ...prev, id: userId, store_name: cachedName },
        );
      }

      // 获取店铺详细信息（SELECT * 若被 avatar_url 列权限拦住会降级，仍可能为 null）
      const store = await deliveryStoreService.getStoreById(userId);
      setMerchantInfo(
        store
          ? { ...store, store_name: store.store_name || cachedName }
          : cachedName
            ? { id: userId, store_name: cachedName }
            : null,
      );

      // 获取订单统计 (针对商家)
      const email = await AsyncStorage.getItem("userEmail");
      const [orderData, revenueData, productRows] = await Promise.all([
        packageService.getOrderStats(
          userId,
          email || undefined,
          undefined,
          "merchant",
          store?.store_name,
        ),
        packageService.getRevenueStats(userId, store?.store_name),
        merchantService.getStoreProducts(userId),
      ]);
      setSpotlightProducts(pickHomeSpotlightProducts(productRows, 3));

      setStats({
        pendingConfirm: orderData.pendingConfirm ?? 0,
        awaitingPayment: orderData.awaitingPayment ?? 0,
        awaitingPickup: orderData.awaitingPickup ?? 0,
        processing: orderData.processing || 0,
        pickedUp: orderData.pickedUp ?? 0,
        delivering: orderData.delivering ?? 0,
        completed: orderData.delivered || 0,
        revenueOneYear: revenueData.revenueOneYear ?? 0,
        yesterdayRevenue: revenueData.yesterdayRevenue ?? 0,
        todayRevenue: revenueData.todayRevenue ?? 0,
        urgent: orderData.urgent || 0,
        standard: orderData.standard || 0,
        todayOrderCount: revenueData.todayOrderCount ?? 0,
        yesterdayOrderCount: revenueData.yesterdayOrderCount ?? 0,
      });
    } catch (error) {
      console.warn("Failed to load merchant data:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  /** 接单/拒单后全局会 emit，经营概况状态卡片即时对齐数据库 */
  useEffect(() => {
    const orderSub = DeviceEventEmitter.addListener("order_status_updated", () => {
      loadData({ silent: true });
    });
    const avatarSub = DeviceEventEmitter.addListener(
      STORE_AVATAR_UPDATED,
      (payload?: { url?: string; updatedAt?: string }) => {
        setMerchantInfo((prev: any) =>
          prev
            ? {
                ...prev,
                avatar_url: payload?.url || "",
                updated_at: payload?.updatedAt || prev.updated_at,
              }
            : prev,
        );
      },
    );
    return () => {
      orderSub.remove();
      avatarSub.remove();
    };
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const homeAvatarUri = storeAvatarDisplayUri(
    merchantInfo?.avatar_url,
    merchantInfo?.updated_at,
  );

  const headerMax = insets.top + 108;
  const headerMin = insets.top + 58;
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 96],
    outputRange: [headerMax, headerMin],
    extrapolate: "clamp",
  });
  const avatarSize = scrollY.interpolate({
    inputRange: [0, 96],
    outputRange: [56, 32],
    extrapolate: "clamp",
  });
  const avatarRadius = scrollY.interpolate({
    inputRange: [0, 96],
    outputRange: [28, 16],
    extrapolate: "clamp",
  });
  const welcomeOpacity = scrollY.interpolate({
    inputRange: [0, 36, 64],
    outputRange: [1, 0.4, 0],
    extrapolate: "clamp",
  });
  const notifySize = scrollY.interpolate({
    inputRange: [0, 96],
    outputRange: [44, 34],
    extrapolate: "clamp",
  });

  return (
    <View
      style={[styles.container, isDarkMode && { backgroundColor: "#0f172a" }]}
    >
      <Animated.View
        style={[
          styles.header,
          { height: headerHeight, paddingTop: insets.top + 4 },
        ]}
      >
        <LinearGradient
          colors={["#1e293b", "#0f172a"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.headerContent}>
          <View style={styles.profileRow}>
            <Animated.View
              style={[
                styles.avatarContainer,
                {
                  width: avatarSize,
                  height: avatarSize,
                  borderRadius: avatarRadius,
                },
              ]}
            >
              {homeAvatarUri ? (
                <Image
                  source={{ uri: homeAvatarUri }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>
                  {merchantInfo?.store_name?.charAt(0) || "M"}
                </Text>
              )}
            </Animated.View>
            <View style={styles.nameContainer}>
              <Animated.View
                style={{
                  opacity: welcomeOpacity,
                  height: scrollY.interpolate({
                    inputRange: [0, 64],
                    outputRange: [18, 0],
                    extrapolate: "clamp",
                  }),
                  overflow: "hidden",
                }}
              >
                <Text style={styles.welcomeText} numberOfLines={1}>
                  {currentT.welcome}
                </Text>
              </Animated.View>
              <Text style={styles.storeName} numberOfLines={1}>
                {merchantInfo?.store_name || (loading ? "Loading..." : "—")}
              </Text>
            </View>
            <Animated.View
              style={[
                styles.notificationBtn,
                { width: notifySize, height: notifySize, borderRadius: 22 },
              ]}
            >
              <TouchableOpacity
                onPress={() => navigation.navigate("NotificationCenter")}
                style={styles.notificationHit}
              >
                <Ionicons name="notifications-outline" size={22} color="#fff" />
                <View style={styles.badge} />
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
          />
        }
      >
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate("PlaceOrder")}
          >
            <View style={[styles.iconBg, { backgroundColor: "#fff7ed" }]}>
              <Ionicons name="add-circle-outline" size={28} color="#f59e0b" />
            </View>
            <Text style={styles.actionText}>{currentT.placeOrder}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate("MyOrders")}
          >
            <View style={[styles.iconBg, { backgroundColor: "#f5f3ff" }]}>
              <Ionicons name="list-outline" size={28} color="#8b5cf6" />
            </View>
            <Text style={styles.actionText}>{currentT.myOrders}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={async () => {
              const fallbackId = await AsyncStorage.getItem("userId");
              const fallbackName = await AsyncStorage.getItem("userName");
              const storeId = merchantInfo?.id || fallbackId;
              if (!storeId) {
                return;
              }
              navigation.navigate("MerchantProducts", {
                storeId,
                storeName: merchantInfo?.store_name || fallbackName || undefined,
              });
            }}
          >
            <View style={[styles.iconBg, { backgroundColor: "#f0fdf4" }]}>
              <Ionicons name="cube-outline" size={28} color="#10b981" />
            </View>
            <Text style={styles.actionText}>{currentT.myProducts}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate("Profile")}
          >
            <View style={[styles.iconBg, { backgroundColor: "#eff6ff" }]}>
              <Ionicons name="business-outline" size={28} color="#3b82f6" />
            </View>
            <Text style={styles.actionText}>{currentT.profile}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.pipelineCard}>
          <Text style={styles.kicker}>{currentT.businessStatus}</Text>
          <View style={styles.pipelineRow}>
            {[
              { value: stats.pendingConfirm, label: currentT.pendingOrders, filter: "待确认" },
              { value: stats.processing, label: currentT.processingOrders, filter: "打包中" },
              { value: stats.awaitingPayment, label: currentT.awaitingPaymentOrders, filter: "待收款" },
              { value: stats.awaitingPickup, label: currentT.pickupPendingOrders, filter: "待取件" },
              { value: stats.pickedUp, label: currentT.pickedUpOrders, filter: "已取件" },
              { value: stats.delivering, label: currentT.deliveringOrders, filter: "配送中" },
              { value: stats.completed, label: currentT.completedOrders, filter: "已送达" },
            ].map((item) => (
              <TouchableOpacity
                key={item.filter}
                style={styles.pipelineCell}
                onPress={() => navigation.navigate("MyOrders", { filterStatus: item.filter })}
              >
                <Text style={styles.pipelineValue}>{item.value}</Text>
                <Text style={styles.pipelineLabel} numberOfLines={2}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.pipelineMeta}>
            <View style={styles.metaChip}>
              <Ionicons name="flash" size={12} color="#ef4444" />
              <Text style={styles.metaText}>
                {currentT.urgentOrders} {stats.urgent}
              </Text>
            </View>
            <View style={styles.metaChip}>
              <Ionicons name="apps" size={12} color="#2563eb" />
              <Text style={styles.metaText}>
                {currentT.standardOrders} {stats.standard}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.revenuePanel}>
          <Text style={styles.kicker}>{currentT.revenueToday}</Text>
          <Text style={styles.revenueHero} numberOfLines={1} adjustsFontSizeToFit>
            {stats.todayRevenue.toLocaleString()}
          </Text>
          <Text style={styles.revenueHint}>{currentT.revenueMmkHint}</Text>
          <View style={styles.chartArea}>
            <View style={styles.chartBarRow}>
              <Text style={styles.chartDayLabel}>{currentT.today}</Text>
              <View style={styles.barBackground}>
                <View
                  style={[
                    styles.barFill,
                    {
                      backgroundColor: "#d97706",
                      width:
                        stats.todayOrderCount > 0 || stats.yesterdayOrderCount > 0
                          ? `${(stats.todayOrderCount / Math.max(stats.todayOrderCount, stats.yesterdayOrderCount, 1)) * 100}%`
                          : "0%",
                    },
                  ]}
                />
              </View>
              <Text style={styles.chartValueLabel}>
                {stats.todayOrderCount.toLocaleString()}
                {currentT.orderCountUnit}
              </Text>
            </View>
            <View style={styles.chartBarRow}>
              <Text style={styles.chartDayLabel}>{currentT.yesterday}</Text>
              <View style={styles.barBackground}>
                <View
                  style={[
                    styles.barFill,
                    {
                      backgroundColor: "#94a3b8",
                      width:
                        stats.todayOrderCount > 0 || stats.yesterdayOrderCount > 0
                          ? `${(stats.yesterdayOrderCount / Math.max(stats.todayOrderCount, stats.yesterdayOrderCount, 1)) * 100}%`
                          : "0%",
                    },
                  ]}
                />
              </View>
              <Text style={styles.chartValueLabel}>
                {stats.yesterdayOrderCount.toLocaleString()}
                {currentT.orderCountUnit}
              </Text>
            </View>
          </View>
          <View style={styles.revenueSplit}>
            <View style={styles.revenueSplitCell}>
              <Text style={styles.revenueSplitLabel}>{currentT.revenueYesterday}</Text>
              <Text style={styles.revenueSplitValue} numberOfLines={1} adjustsFontSizeToFit>
                {stats.yesterdayRevenue.toLocaleString()}
              </Text>
            </View>
            <View style={styles.revenueSplitRule} />
            <View style={styles.revenueSplitCell}>
              <Text style={styles.revenueSplitLabel}>{currentT.revenueOneYear}</Text>
              <Text style={styles.revenueSplitValue} numberOfLines={1} adjustsFontSizeToFit>
                {stats.revenueOneYear.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.recentActivity}>
          <Text style={styles.sectionTitle}>{currentT.recentActivity}</Text>
          {spotlightProducts.length === 0 ? (
            <View style={styles.emptyActivity}>
              <Text style={styles.emptyText}>{currentT.noActivity}</Text>
            </View>
          ) : (
            spotlightProducts.map((product) => {
              const offer = spotlightOffer(product);
              const imageUri =
                product.image_url && !product.image_url.startsWith("file://")
                  ? rewritePublicStorageUrl(product.image_url)
                  : "";
              const percentLabel = offer.percent > 0 ? `${Math.round(offer.percent)}%` : "";
              return (
                <TouchableOpacity
                  key={product.id}
                  style={styles.spotlightCard}
                  activeOpacity={0.86}
                  onPress={() => {
                    const storeId = merchantInfo?.id;
                    if (!storeId) return;
                    navigation.navigate("MerchantProducts", {
                      storeId,
                      storeName: merchantInfo?.store_name,
                      editProductId: product.id,
                    });
                  }}
                >
                  <View style={styles.spotlightImageWrap}>
                    {imageUri ? (
                      <Image source={{ uri: imageUri }} style={styles.spotlightImage} />
                    ) : (
                      <View style={[styles.spotlightImage, styles.spotlightImageEmpty]}>
                        <Ionicons name="image-outline" size={22} color="#cbd5e1" />
                      </View>
                    )}
                    {percentLabel ? (
                      <View style={styles.spotlightBadge}>
                        <Text style={styles.spotlightBadgeText}>{percentLabel}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.spotlightInfo}>
                    <Text style={styles.spotlightName} numberOfLines={2}>
                      {product.name}
                    </Text>
                    <Text style={styles.spotlightPrice}>
                      {offer.price.toLocaleString()} MMK
                    </Text>
                    {offer.percent > 0 && offer.original ? (
                      <Text style={styles.spotlightOriginal}>
                        {offer.original.toLocaleString()} MMK
                      </Text>
                    ) : null}
                    {!product.is_available ? (
                      <Text style={styles.spotlightOff}>{currentT.spotlightOff}</Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    justifyContent: "flex-end",
    overflow: "hidden",
    zIndex: 4,
    elevation: 8,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  headerContent: {
    zIndex: 1,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  nameContainer: {
    marginLeft: 12,
    flex: 1,
    minWidth: 0,
  },
  welcomeText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.62)",
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  storeName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.3,
  },
  notificationBtn: {
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  notificationHit: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  content: {
    flex: 1,
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 20,
  },
  statsContainer: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  statsCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  statsValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1e3a8a",
  },
  statsLabel: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 4,
    fontWeight: "600",
    textAlign: "center",
  },
  revenueCardsColumn: {
    marginTop: 12,
    gap: 10,
  },
  revenueCard: {
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  revenueCardGradient: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 72,
    gap: 10,
  },
  revenueCardTextCol: {
    flex: 1,
    minWidth: 0,
  },
  revenueCardLabel: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 15,
    fontWeight: "700",
  },
  revenueCardHint: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 10,
    marginTop: 4,
    fontWeight: "500",
  },
  revenueCardValue: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    flexShrink: 0,
    maxWidth: "48%",
    textAlign: "right",
  },
  quickActions: {
    flexDirection: "row",
    marginTop: 20,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 4,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  actionItem: {
    width: "25%",
    alignItems: "center",
    paddingVertical: 15,
  },
  iconBg: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  actionText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "700",
    textAlign: "center",
  },
  recentActivity: {
    marginTop: 24,
  },
  emptyActivity: {
    padding: 40,
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  emptyText: {
    color: "#94a3b8",
    fontSize: 14,
  },
  spotlightCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eef2f6",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  spotlightImageWrap: {
    width: 84,
    height: 84,
  },
  spotlightImage: {
    width: 84,
    height: 84,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
  },
  spotlightImageEmpty: {
    alignItems: "center",
    justifyContent: "center",
  },
  spotlightBadge: {
    position: "absolute",
    left: 6,
    top: 6,
    backgroundColor: "#ef4444",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  spotlightBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
  spotlightInfo: {
    flex: 1,
    minWidth: 0,
  },
  spotlightName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 6,
  },
  spotlightPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f766e",
  },
  spotlightOriginal: {
    marginTop: 2,
    fontSize: 12,
    color: "#94a3b8",
    textDecorationLine: "line-through",
  },
  spotlightOff: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    color: "#ef4444",
  },
  // 🚀 新增：营收对比图表样式
  revenueContainer: {
    marginTop: 20,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  chartArea: {
    gap: 12,
  },
  chartBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  chartDayLabel: {
    width: 40,
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
  barBackground: {
    flex: 1,
    height: 12,
    backgroundColor: "#f1f5f9",
    borderRadius: 6,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 6,
  },
  chartValueLabel: {
    minWidth: 52,
    textAlign: "right",
    fontSize: 12,
    color: "#475569",
    fontWeight: "700",
  },
  pipelineCard: {
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 8,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  kicker: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.4,
    marginBottom: 10,
    paddingHorizontal: 8,
  },
  pipelineRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  pipelineCell: {
    width: "25%",
    alignItems: "center",
    paddingHorizontal: 2,
    paddingVertical: 6,
  },
  pipelineValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.4,
  },
  pipelineLabel: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "700",
    color: "#64748b",
    textAlign: "center",
  },
  pipelineMeta: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 8,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f8fafc",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  metaText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  revenuePanel: {
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  revenueHero: {
    fontSize: 34,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -1,
  },
  revenueHint: {
    marginTop: 2,
    marginBottom: 14,
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
  },
  revenueSplit: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e2e8f0",
  },
  revenueSplitCell: {
    flex: 1,
    minWidth: 0,
  },
  revenueSplitRule: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
    backgroundColor: "#e2e8f0",
    marginHorizontal: 12,
  },
  revenueSplitLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
  },
  revenueSplitValue: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: "800",
    color: "#334155",
  },
});
