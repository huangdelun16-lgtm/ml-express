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
  packageService,
  deliveryStoreService,
  supabase,
} from "../services/supabase";
import { theme } from "../config/theme";
import { analytics } from "../services/AnalyticsService";

const { width } = Dimensions.get("window");

interface MerchantStats {
  pendingConfirm: number;
  awaitingPickup: number;
  processing: number;
  delivering: number;
  completed: number;
  totalRevenueMmk: number;
  urgent: number;
  standard: number;
  todayOrderCount: number;
  yesterdayOrderCount: number;
}

export default function HomeScreen({ navigation }: any) {
  const { language, isDarkMode } = useApp();
  const { showLoading, hideLoading } = useLoading();

  const [refreshing, setRefreshing] = useState(false);
  const [merchantInfo, setMerchantInfo] = useState<any>(null);
  const [stats, setStats] = useState<MerchantStats>({
    pendingConfirm: 0,
    awaitingPickup: 0,
    processing: 0,
    delivering: 0,
    completed: 0,
    totalRevenueMmk: 0,
    urgent: 0,
    standard: 0,
    todayOrderCount: 0,
    yesterdayOrderCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const scrollY = new Animated.Value(0);

  const t = {
    zh: {
      welcome: "欢迎回来, 合作伙伴",
      businessStatus: "经营概况",
      pendingOrders: "待确认",
      pickupPendingOrders: "待取件",
      processingOrders: "打包中",
      deliveringOrders: "配送中",
      completedOrders: "已完成",
      totalSales: "商品总营收 (MMK)",
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
    },
    en: {
      welcome: "Welcome Back, Partner",
      businessStatus: "Business Overview",
      pendingOrders: "To confirm",
      pickupPendingOrders: "Awaiting pickup",
      processingOrders: "Packing",
      deliveringOrders: "In transit",
      completedOrders: "Completed",
      totalSales: "Product Revenue (MMK)",
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
    },
    my: {
      welcome: "ပြန်လည်ကြိုဆိုပါတယ် မိတ်ဖက်",
      businessStatus: "စီးပွားရေးအခြေအနေ",
      pendingOrders: "အတည်ပြုရန်",
      pickupPendingOrders: "ယူရန်စောင့်ဆိုင်း",
      processingOrders: "ထုပ်ပိုးနေသည်",
      deliveringOrders: "ပို့ဆောင်နေသည်",
      completedOrders: "ပြီးစီးသည်",
      totalSales: "ကုန်ပစ္စည်းဝင်ငွေ (MMK)",
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
    },
  };

  const currentT = t[language] || t.zh;

  const loadData = async () => {
    try {
      setLoading(true);
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) {
        navigation.replace("Login");
        return;
      }

      // 获取店铺详细信息
      const store = await deliveryStoreService.getStoreById(userId);
      setMerchantInfo(store);

      // 获取订单统计 (针对商家)
      const email = await AsyncStorage.getItem("userEmail");
      const [orderData, revenueData] = await Promise.all([
        packageService.getOrderStats(
          userId,
          email || undefined,
          undefined,
          "merchant",
          store?.store_name,
        ),
        packageService.getRevenueStats(userId, store?.store_name),
      ]);

      setStats({
        pendingConfirm: orderData.pendingConfirm ?? 0,
        awaitingPickup: orderData.awaitingPickup ?? 0,
        processing: orderData.processing || 0,
        delivering: orderData.delivering ?? 0,
        completed: orderData.delivered || 0,
        totalRevenueMmk: revenueData.totalRevenue ?? 0,
        urgent: orderData.urgent || 0,
        standard: orderData.standard || 0,
        todayOrderCount: revenueData.todayOrderCount ?? 0,
        yesterdayOrderCount: revenueData.yesterdayOrderCount ?? 0,
      });
    } catch (error) {
      console.error("Failed to load merchant data:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [220, 180],
    extrapolate: "clamp",
  });

  return (
    <View
      style={[styles.container, isDarkMode && { backgroundColor: "#0f172a" }]}
    >
      <Animated.View style={[styles.header, { height: headerHeight }]}>
        <LinearGradient
          colors={["#1e293b", "#0f172a"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.headerContent}>
          <View style={styles.profileRow}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {merchantInfo?.store_name?.charAt(0) || "M"}
              </Text>
            </View>
            <View style={styles.nameContainer}>
              <Text style={styles.welcomeText}>{currentT.welcome}</Text>
              <Text style={styles.storeName}>
                {merchantInfo?.store_name || "Loading..."}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.notificationBtn}
              onPress={() => navigation.navigate("NotificationCenter")}
            >
              <Ionicons name="notifications-outline" size={24} color="#fff" />
              <View style={styles.badge} />
            </TouchableOpacity>
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
          />
        }
      >
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>{currentT.businessStatus}</Text>
          <View style={styles.statsGrid}>
            <TouchableOpacity
              style={styles.statsCard}
              onPress={() =>
                navigation.navigate("MyOrders", { filterStatus: "待确认" })
              }
            >
              <Text style={styles.statsValue}>{stats.pendingConfirm}</Text>
              <Text style={styles.statsLabel}>{currentT.pendingOrders}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statsCard}
              onPress={() =>
                navigation.navigate("MyOrders", { filterStatus: "待取件" })
              }
            >
              <Text style={styles.statsValue}>{stats.awaitingPickup}</Text>
              <Text style={styles.statsLabel}>
                {currentT.pickupPendingOrders}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statsCard}
              onPress={() =>
                navigation.navigate("MyOrders", { filterStatus: "打包中" })
              }
            >
              <Text style={styles.statsValue}>{stats.processing}</Text>
              <Text style={styles.statsLabel}>{currentT.processingOrders}</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.statsGrid, { marginTop: 12 }]}>
            <TouchableOpacity
              style={styles.statsCard}
              onPress={() =>
                navigation.navigate("MyOrders", { filterStatus: "配送中" })
              }
            >
              <Text style={styles.statsValue}>{stats.delivering}</Text>
              <Text style={styles.statsLabel}>{currentT.deliveringOrders}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statsCard}
              onPress={() =>
                navigation.navigate("MyOrders", { filterStatus: "已送达" })
              }
            >
              <Text style={styles.statsValue}>{stats.completed}</Text>
              <Text style={styles.statsLabel}>{currentT.completedOrders}</Text>
            </TouchableOpacity>
          </View>

          {/* 🚀 新增：细分统计 (急件 vs 标准) */}
          <View style={[styles.statsGrid, { marginTop: 12 }]}>
            <View style={[styles.statsCard, { paddingVertical: 10 }]}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="flash"
                  size={14}
                  color="#ef4444"
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.statsValue,
                    { fontSize: 18, color: "#ef4444" },
                  ]}
                >
                  {stats.urgent}
                </Text>
              </View>
              <Text style={styles.statsLabel}>{currentT.urgentOrders}</Text>
            </View>
            <View style={[styles.statsCard, { paddingVertical: 10 }]}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="apps"
                  size={14}
                  color="#3b82f6"
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={[
                    styles.statsValue,
                    { fontSize: 18, color: "#3b82f6" },
                  ]}
                >
                  {stats.standard}
                </Text>
              </View>
              <Text style={styles.statsLabel}>{currentT.standardOrders}</Text>
            </View>
          </View>

          {/* 🚀 新增：营收对比图表 (今日 vs 昨日) */}
          <View style={styles.revenueContainer}>
            <Text
              style={[styles.sectionTitle, { fontSize: 16, marginBottom: 12 }]}
            >
              {currentT.revenueChart}
            </Text>
            <View style={styles.chartArea}>
              <View style={styles.chartBarRow}>
                <Text style={styles.chartDayLabel}>{currentT.yesterday}</Text>
                <View style={styles.barBackground}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        backgroundColor: "#94a3b8",
                        width:
                          stats.yesterdayOrderCount > 0 ||
                          stats.todayOrderCount > 0
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

              <View style={styles.chartBarRow}>
                <Text style={styles.chartDayLabel}>{currentT.today}</Text>
                <View style={styles.barBackground}>
                  <LinearGradient
                    colors={["#f59e0b", "#d97706"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.barFill,
                      {
                        width:
                          stats.todayOrderCount > 0 ||
                          stats.yesterdayOrderCount > 0
                            ? `${(stats.todayOrderCount / Math.max(stats.todayOrderCount, stats.yesterdayOrderCount, 1)) * 100}%`
                            : "0%",
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.chartValueLabel,
                    { color: "#d97706", fontWeight: "bold" },
                  ]}
                >
                  {stats.todayOrderCount.toLocaleString()}
                  {currentT.orderCountUnit}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.salesCard}>
            <LinearGradient
              colors={["#1e3a8a", "#1e40af"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.salesGradient}
            >
              <Text style={styles.salesLabel}>{currentT.totalSales}</Text>
              <Text style={styles.salesValue}>
                {stats.totalRevenueMmk.toLocaleString()}
              </Text>
            </LinearGradient>
          </View>
        </View>

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
            onPress={() =>
              navigation.navigate("MerchantProducts", {
                storeId: merchantInfo?.id,
                storeName: merchantInfo?.store_name,
              })
            }
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

        <View style={styles.recentActivity}>
          <Text style={styles.sectionTitle}>{currentT.recentActivity}</Text>
          <View style={styles.emptyActivity}>
            <Text style={styles.emptyText}>{currentT.noActivity}</Text>
          </View>
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
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingHorizontal: 20,
    justifyContent: "center",
    overflow: "hidden",
  },
  headerContent: {
    zIndex: 1,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  nameContainer: {
    marginLeft: 15,
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "500",
  },
  storeName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    marginTop: 2,
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  badge: {
    position: "absolute",
    top: 12,
    right: 12,
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
  salesCard: {
    marginTop: 12,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
  },
  salesGradient: {
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  salesLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "600",
  },
  salesValue: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 24,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
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
    minWidth: 60,
    textAlign: "right",
    fontSize: 12,
    color: "#475569",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
});
