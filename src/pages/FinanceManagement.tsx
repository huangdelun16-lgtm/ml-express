import React, {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { SkeletonCard } from "../components/SkeletonLoader";
import { useNavigate } from "react-router-dom";
import {
  TranslationKeys,
  translations as financeTranslations,
} from "./FinanceManagement.translations";
import {
  financeService,
  FinanceRecord,
  auditLogService,
  packageService,
  Package,
  courierSalaryService,
  CourierSalary,
  CourierSalaryDetail,
  CourierPaymentRecord,
  CourierPerformance,
  adminAccountService,
  AdminAccount,
  deliveryStoreService,
  systemSettingsService,
  supabase,
} from "../services/supabase";
import { useLanguage } from "../contexts/LanguageContext";
import { useResponsive } from "../hooks/useResponsive";
import {
  REGIONS,
  DEFAULT_PRICING_REGION_ID,
  getRegionalPricingForPackage,
  getDateKey,
  getLocalDateYYYYMMDD,
  getRiderShareBaseFeeMmk,
  getRiderDeliveryShareMmk,
  getPlatformPaymentAmountFromDescription,
  getMerchantUnclearedAmountMmk,
  getMerchantSettlementParts,
  getMerchantRecordedAmountMmk,
  getPendingRiderCashAmountMmk,
  isRiderCashUnsettledPackage,
  getPackageFinanceDateKey,
  packageMatchesRegionPrefix,
  isMerchantFinancePackage,
  parsePackagePriceMmk,
  calculateFinanceOverviewSummary,
  detectFinanceRegionPrefix,
  getLocalMonthBounds,
  groupDeliveredPackagesForSalaryMonth,
  isPackageInLocalMonth,
  defaultForm,
  currencyOptions,
  paymentOptions,
  getCategoryOptions,
  statusColors,
  typeColors,
  combineRidersFromAdminAccounts,
  type TabKey,
  type FilterStatus,
  type FilterType,
  type FinanceForm,
} from "./FinanceManagement.helpers";
import { feedbackService } from "../services/FeedbackService";
import { getCurrentUser } from "../services/authService";
import { formatCodSettledByLabel } from "../utils/codSettlement";
import { FinanceWorkspaceProvider } from "./finance/FinanceWorkspace";

const FinanceAnalyticsTab = lazy(() => import("./finance/FinanceAnalyticsTab"));
const FinanceOverviewTab = lazy(() => import("./finance/FinanceOverviewTab"));
const FinanceRecordsTab = lazy(() => import("./finance/FinanceRecordsTab"));
const FinancePackageRecordsTab = lazy(() => import("./finance/FinancePackageRecordsTab"));
const FinanceCourierRecordsTab = lazy(() => import("./finance/FinanceCourierRecordsTab"));
const FinanceCashCollectionTab = lazy(() => import("./finance/FinanceCashCollectionTab"));
const FinanceMerchantsCollectionTab = lazy(() => import("./finance/FinanceMerchantsCollectionTab"));

// 模块级纯逻辑/常量/类型已抽到 ./FinanceManagement.helpers（见下方 import）

const FinanceManagement: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();

  // 获取当前用户角色和账号
  const currentUserRole =
    sessionStorage.getItem("currentUserRole") ||
    localStorage.getItem("currentUserRole") ||
    "operator";
  const currentUser =
    sessionStorage.getItem("currentUser") ||
    localStorage.getItem("currentUser") ||
    "";
  const currentUserRegion =
    sessionStorage.getItem("currentUserRegion") ||
    localStorage.getItem("currentUserRegion") ||
    "";

  const isFinance = currentUserRole === "finance";

  const getDetectedRegion = () =>
    detectFinanceRegionPrefix(currentUser, currentUserRegion);

  const currentRegionPrefix = getDetectedRegion();
  const isRegionalUser =
    currentUserRole !== "admin" && currentRegionPrefix !== "";

  const isMDYFinance = isFinance && currentRegionPrefix === "MDY";
  const isYGNFinance = isFinance && currentRegionPrefix === "YGN";

  const isRegionalFinance = isMDYFinance || isYGNFinance;

  const categoryOptions = useMemo(
    () => getCategoryOptions(language),
    [language],
  );

  const [activeTab, setActiveTab] = useState<TabKey>(
    isRegionalUser ? "records" : "overview",
  );
  const { isMobile, isTablet, isDesktop, width } = useResponsive();
  const [cashCollectionDate, setCashCollectionDate] = useState(
    getLocalDateYYYYMMDD(),
  );
  const [cashSettlementStatus, setCashSettlementStatus] = useState<
    "unsettled" | "settled" | "all"
  >("unsettled");
  const [cashReminderTick, setCashReminderTick] = useState(() => Date.now());
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [packages, setPackages] = useState<Package[]>([]); // 添加包裹数据状态
  const [loading, setLoading] = useState<boolean>(true);
  const [extrasLoading, setExtrasLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");

  // 工资管理相关状态
  const [courierSalaries, setCourierSalaries] = useState<CourierSalary[]>([]);
  const [salaryFilterStatus, setSalaryFilterStatus] = useState<
    "all" | CourierSalary["status"]
  >("all");
  const [selectedSalaryMonth, setSelectedSalaryMonth] = useState<string>(() => {
    // 默认选择当前月份
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [showSalaryForm, setShowSalaryForm] = useState<boolean>(false);
  const [showSalaryDetail, setShowSalaryDetail] = useState<boolean>(false);
  const [selectedSalary, setSelectedSalary] = useState<CourierSalary | null>(
    null,
  );
  const [salaryDetails, setSalaryDetails] = useState<CourierSalaryDetail[]>([]);
  const [selectedSalaries, setSelectedSalaries] = useState<number[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [showSalarySelectionModal, setShowSalarySelectionModal] =
    useState<boolean>(false);
  const [selectedCouriersForSalary, setSelectedCouriersForSalary] = useState<
    Set<string>
  >(new Set());
  const [courierSalaryGroups, setCourierSalaryGroups] = useState<
    Record<string, Package[]>
  >({});
  const [paymentForm, setPaymentForm] = useState({
    payment_method: "bank_transfer",
    payment_reference: "",
    payment_date: new Date().toISOString().split("T")[0],
  });
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>([]); // 账号列表，用于获取工资

  // 包裹收支记录分页状态
  const [packageRecordsPage, setPackageRecordsPage] = useState<number>(1);
  const [packageRecordsPerPage, setPackageRecordsPerPage] =
    useState<number>(20);
  const [packagePaymentFilter, setPackagePaymentFilter] = useState<
    "all" | "cash" | "balance"
  >("all");

  // 现金收款管理相关状态
  const [couriers, setCouriers] = useState<any[]>([]); // 快递员列表
  const [deliveryStores, setDeliveryStores] = useState<any[]>([]); // 合伙店铺列表
  const [showCashDetailModal, setShowCashDetailModal] =
    useState<boolean>(false);
  const [selectedCourier, setSelectedCourier] = useState<string | null>(null);
  const [cashDetailDateFilter, setCashDetailDateFilter] =
    useState<string>("all"); // 'all' | '7days' | '30days' | '90days' | 'custom'
  const [cashDetailStartDate, setCashDetailStartDate] = useState<string>("");
  const [cashDetailEndDate, setCashDetailEndDate] = useState<string>("");
  const [selectedCashPackages, setSelectedCashPackages] = useState<Set<string>>(
    new Set(),
  ); // 选中的包裹ID集合
  const [clearedCashPackages, setClearedCashPackages] = useState<Set<string>>(
    new Set(),
  ); // 已结清的包裹ID集合

  // 🚀 新增：平台支付（余额支付）相关状态
  const [showPlatformPaymentModal, setShowPlatformPaymentModal] =
    useState<boolean>(false);
  const [platformPaymentOrders, setPlatformPaymentOrders] = useState<Package[]>(
    [],
  );
  const [platformPaymentCustomerFilter, setPlatformPaymentCustomerFilter] =
    useState<string>("all");
  const [platformPaymentRegionFilter, setPlatformPaymentRegionFilter] =
    useState<string>("all");

  // 新增：商家已结清和待结清弹窗状态
  const [showMerchantSettledModal, setShowMerchantSettledModal] =
    useState<boolean>(false);
  /** 与商家 COD 共用的明细弹窗：代收款(当日口径) / 已结清历史 */
  const [merchantCodModalKind, setMerchantCodModalKind] = useState<
    "uncleared" | "settled_all"
  >("uncleared");
  const [merchantCodModalScope, setMerchantCodModalScope] = useState<
    "month" | "all"
  >("month");
  const [showPendingOrdersModal, setShowPendingOrdersModal] =
    useState<boolean>(false);
  const [modalOrders, setModalOrders] = useState<Package[]>([]);
  const [merchantRegionFilter, setMerchantRegionFilter] =
    useState<string>("all");
  const [modalTitle, setModalTitle] = useState<string>("");
  const [merchantCodModalSearch, setMerchantCodModalSearch] =
    useState<string>("");

  const deliveredPackages = useMemo(() => {
    let filtered = packages.filter((pkg) => pkg.status === "已送达");
    if (isRegionalUser) {
      filtered = filtered.filter((pkg) =>
        pkg.id.startsWith(currentRegionPrefix),
      );
    }
    return filtered;
  }, [packages, isRegionalUser, currentRegionPrefix]);

  const deliveredPackagesSorted = useMemo(() => {
    const filtered = deliveredPackages.filter((pkg) => {
      if (packagePaymentFilter === "all") return true;
      if (packagePaymentFilter === "cash") return pkg.payment_method === "cash";
      return pkg.payment_method !== "cash";
    });
    return [...filtered].sort((a, b) => {
      const timeA = a.delivery_time ? new Date(a.delivery_time).getTime() : 0;
      const timeB = b.delivery_time ? new Date(b.delivery_time).getTime() : 0;
      return timeB - timeA;
    });
  }, [deliveredPackages, packagePaymentFilter]);

  const inProgressPackages = useMemo(() => {
    let filtered = packages.filter(
      (pkg) => pkg.status !== "已送达" && pkg.status !== "已取消",
    );
    if (isRegionalUser) {
      filtered = filtered.filter((pkg) =>
        pkg.id.startsWith(currentRegionPrefix),
      );
    }
    return filtered;
  }, [packages, isRegionalUser, currentRegionPrefix]);

  const deliveredIncome = useMemo(() => {
    return deliveredPackages.reduce((sum, pkg) => {
      const price = parseFloat(pkg.price?.replace(/[^\d.]/g, "") || "0");
      return sum + price;
    }, 0);
  }, [deliveredPackages]);

  const inProgressIncome = useMemo(() => {
    return inProgressPackages.reduce((sum, pkg) => {
      const price = parseFloat(pkg.price?.replace(/[^\d.]/g, "") || "0");
      return sum + price;
    }, 0);
  }, [inProgressPackages]);

  useEffect(() => {
    setPackageRecordsPage((prev) => {
      const maxPage = Math.max(
        1,
        Math.ceil(deliveredPackagesSorted.length / packageRecordsPerPage),
      );
      return prev > maxPage ? maxPage : prev;
    });
  }, [deliveredPackagesSorted.length, packageRecordsPerPage]);

  useEffect(() => {
    setPackageRecordsPage(1);
  }, [packagePaymentFilter]);

  useEffect(() => {
    const id = window.setInterval(() => setCashReminderTick(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const cashUnsettledForCollectionDate = useMemo(() => {
    return packages.filter((pkg) => {
      if (pkg.payment_method !== "cash") return false;
      if (pkg.status !== "已送达" && pkg.status !== "已完成") return false;
      if (pkg.rider_settled) return false;
      const dateKey = getDateKey(
        pkg.delivery_time ||
          pkg.updated_at ||
          pkg.created_at ||
          pkg.create_time,
      );
      if (!dateKey || dateKey !== cashCollectionDate) return false;
      if (isRegionalUser && !pkg.id.startsWith(currentRegionPrefix))
        return false;
      return true;
    });
  }, [packages, cashCollectionDate, isRegionalUser, currentRegionPrefix]);

  const showCashSettlementReminder = useMemo(() => {
    if (activeTab !== "cash_collection") return false;
    if (getLocalDateYYYYMMDD() !== cashCollectionDate) return false;
    const d = new Date(cashReminderTick);
    const mins = d.getHours() * 60 + d.getMinutes();
    const inWindow = mins >= 17 * 60 && mins < 18 * 60;
    return inWindow && cashUnsettledForCollectionDate.length > 0;
  }, [
    activeTab,
    cashCollectionDate,
    cashReminderTick,
    cashUnsettledForCollectionDate.length,
  ]);

  const cashUnsettledForYesterdayLocal = useMemo(() => {
    return packages.filter((pkg) => {
      if (!isRiderCashUnsettledPackage(pkg)) return false;
      const dateKey = getPackageFinanceDateKey(pkg);
      if (!dateKey || dateKey >= cashCollectionDate) return false;
      if (
        isRegionalUser &&
        !packageMatchesRegionPrefix(pkg, currentRegionPrefix)
      ) {
        return false;
      }
      return true;
    });
  }, [
    packages,
    cashCollectionDate,
    isRegionalUser,
    currentRegionPrefix,
  ]);

  const showYesterdayCashUnsettledReminder = useMemo(() => {
    if (activeTab !== "cash_collection") return false;
    if (getLocalDateYYYYMMDD() !== cashCollectionDate) return false;
    return cashUnsettledForYesterdayLocal.length > 0;
  }, [
    activeTab,
    cashCollectionDate,
    cashUnsettledForYesterdayLocal.length,
    cashReminderTick,
  ]);

  /** 顶部「当日收款管理」标签上的提示：昨日未结清时任意标签页均显示 */
  const showYesterdayCashTabIndicator = useMemo(
    () => cashUnsettledForYesterdayLocal.length > 0,
    [cashUnsettledForYesterdayLocal.length, cashReminderTick],
  );

  const packagePagination = useMemo(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(deliveredPackagesSorted.length / packageRecordsPerPage),
    );
    const currentPage = Math.min(packageRecordsPage, totalPages);
    const startIndex = (currentPage - 1) * packageRecordsPerPage;
    const endIndex = Math.min(
      startIndex + packageRecordsPerPage,
      deliveredPackagesSorted.length,
    );
    const currentPackages = deliveredPackagesSorted.slice(startIndex, endIndex);
    return {
      totalPages,
      currentPage,
      startIndex,
      endIndex,
      currentPackages,
    };
  }, [deliveredPackagesSorted, packageRecordsPage, packageRecordsPerPage]);

  const {
    totalPages: packageTotalPages,
    currentPage: packageCurrentPage,
    startIndex: packageStartIndex,
    endIndex: packageEndIndex,
    currentPackages: packageCurrentPackages,
  } = packagePagination;
  const packageDisplayStart =
    deliveredPackagesSorted.length === 0 ? 0 : packageStartIndex + 1;
  const packageDisplayEnd =
    deliveredPackagesSorted.length === 0 ? 0 : packageEndIndex;

  // 根据月份过滤工资记录
  const getFilteredSalariesByMonth = (
    salaries: CourierSalary[],
    month: string,
  ): CourierSalary[] => {
    if (!month) return salaries;

    const [year, monthNum] = month.split("-").map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59);

    return salaries.filter((salary) => {
      const periodStart = new Date(salary.period_start_date);
      const periodEnd = new Date(salary.period_end_date);

      // 检查结算周期是否与选择的月份有重叠
      return periodStart <= endDate && periodEnd >= startDate;
    });
  };

  // 获取可用的月份列表（从工资记录中提取）
  const getAvailableMonths = (): string[] => {
    const months = new Set<string>();

    courierSalaries.forEach((salary) => {
      const periodStart = new Date(salary.period_start_date);
      const year = periodStart.getFullYear();
      const month = periodStart.getMonth() + 1;
      months.add(`${year}-${String(month).padStart(2, "0")}`);

      // 如果结算周期跨月，也添加结束月份
      const periodEnd = new Date(salary.period_end_date);
      const endYear = periodEnd.getFullYear();
      const endMonth = periodEnd.getMonth() + 1;
      if (year !== endYear || month !== endMonth) {
        months.add(`${endYear}-${String(endMonth).padStart(2, "0")}`);
      }
    });

    // 按日期倒序排列（最新的在前）
    return Array.from(months).sort((a, b) => {
      const dateA = new Date(a + "-01");
      const dateB = new Date(b + "-01");
      return dateB.getTime() - dateA.getTime();
    });
  };

  // 格式化月份显示
  const formatMonthDisplay = (month: string): string => {
    if (!month) return "";
    const [year, monthNum] = month.split("-");
    const index = parseInt(monthNum) - 1;

    if (language === "my") {
      const monthNames = [
        "ဇန်နဝါရီ",
        "ဖေဖော်ဝါရီ",
        "မတ်",
        "ဧပြီ",
        "မေ",
        "ဇွန်",
        "ဇူလိုင်",
        "ဩဂုတ်",
        "စက်တင်ဘာ",
        "အောက်တိုဘာ",
        "နိုဝင်ဘာ",
        "ဒီဇင်ဘာ",
      ];
      return year + " ခုနှစ် " + monthNames[index];
    }

    if (language === "en") {
      const monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];
      return `${monthNames[index]} ${year}`;
    }

    const monthNames = [
      "一月",
      "二月",
      "三月",
      "四月",
      "五月",
      "六月",
      "七月",
      "八月",
      "九月",
      "十月",
      "十一月",
      "十二月",
    ];
    return `${year}年${monthNames[index]}`;
  };
  const t: TranslationKeys = (financeTranslations[language as string] ||
    financeTranslations.zh) as TranslationKeys;

  // 获取记录创建者的工作地区
  const getRecordRegion = (createdBy?: string) => {
    if (!createdBy) return "—";

    // 0. 特殊处理 admin 万能账号
    if (createdBy.toLowerCase() === "admin") return t.universal;

    const prefixFromName = detectFinanceRegionPrefix(createdBy);
    if (prefixFromName) return prefixFromName;

    if (adminAccounts && adminAccounts.length > 0) {
      const account = adminAccounts.find(
        (acc) =>
          (acc.username &&
            acc.username.toLowerCase() === createdBy.toLowerCase()) ||
          (acc.id && acc.id.toLowerCase() === createdBy.toLowerCase()),
      );

      if (account) {
        if (
          account.role === "admin" &&
          account.username.toLowerCase() === "admin"
        ) {
          return t.universal;
        }

        const prefixFromAccount = detectFinanceRegionPrefix(
          createdBy,
          account.region,
        );
        if (prefixFromAccount) return prefixFromAccount;
      }
    }

    // 3. 特殊逻辑：如果创建者就是当前登录用户，且没有识别出来，使用当前检测到的领区
    if (
      createdBy.toLowerCase() === currentUser.toLowerCase() &&
      currentRegionPrefix
    ) {
      return currentRegionPrefix;
    }

    return "—";
  };

  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(
    () => {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        start: firstDay.toISOString().slice(0, 10),
        end: lastDay.toISOString().slice(0, 10),
      };
    },
  );
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [formData, setFormData] = useState<FinanceForm>(defaultForm);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingRecord, setEditingRecord] = useState<FinanceRecord | null>(
    null,
  );
  const financeRecordAmountRef = useRef<HTMLInputElement | null>(null);
  const [regionalPricingMap, setRegionalPricingMap] = useState<
    Record<string, Record<string, any>>
  >({});
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    netProfit: 0,
    pendingPayments: 0,
    packageIncome: 0, // 添加包裹收入
    packageIncomeCash: 0, // 包裹现金跑腿费收入
    packageIncomeBalance: 0, // 包裹余额跑腿费收入
    packageIncomeCashCount: 0,
    packageIncomeBalanceCount: 0,
    packageCount: 0, // 添加包裹数量
    courierKmCost: 0, // 骑手跑腿分成（不按公里）
    totalKm: 0, // 总送货公里数
    merchantsCollection: 0, // 总合伙商家代收款
    totalPlatformPayment: 0, // 总平台支付 (余额支付)
    totalStartingFee: 0, // 总订单起步费（不含顺路递）
    waySidePlatformKeep: 0,
    waySideRiderShare: 0,
    waySideOrderIncome: 0,
    waySideCount: 0,
    booksBalanced: true,
    monthlyRiderFee: 0, // 骑手当月收入总额
    monthlyRiderCount: 0, // 骑手当月收入笔数
    dailyRiderFee: 0, // 骑手当日收入总额
    dailyRiderCount: 0, // 骑手当日收入笔数
  });

  const getPlatformPaymentAmount = (description?: string): number =>
    getPlatformPaymentAmountFromDescription(description);

  const getItemBalanceProductFeeFromDescription = (
    description?: string,
  ): number => {
    if (!description) return 0;
    const m = description.match(
      /\[(?:商品费用 \(仅余额支付\)|商品费用（仅余额支付）|Item Cost \(Balance Only\)|ကုန်ပစ္စည်းဖိုး \(လက်ကျန်ငွေဖြင့်သာ\)): (.*?) MMK\]/,
    );
    if (!m?.[1]) return 0;
    return parseFloat(m[1].replace(/[^\d.]/g, "") || "0");
  };

  /** 余额/平台列：描述有 […: x MMK] 优先；否则非现金单计 跑腿(price)+商品余额费 */
  const getCashDetailPlatformLineTotal = (pkg: Package): number => {
    const tagged = getPlatformPaymentAmount(pkg.description);
    if (tagged > 0) return tagged;
    if (pkg.payment_method === "cash") return 0;
    return (
      parsePackagePriceMmk(pkg) +
      getItemBalanceProductFeeFromDescription(pkg.description)
    );
  };

  /**
   * 与总平台支付同一总额拆行：有描述标签的优先按总额扣减；无标签时 = 非现金 跑腿+商品。
   * 商品费 = 商品费用(仅余额) 行；跑腿费(余额) = 总额 − 商品费(余额)。
   */
  const getCashDetailPlatformItemProductMmk = (pkg: Package): number => {
    const total = getCashDetailPlatformLineTotal(pkg);
    if (total <= 0) return 0;
    const item = getItemBalanceProductFeeFromDescription(pkg.description);
    const tagged = getPlatformPaymentAmount(pkg.description);
    if (tagged > 0) {
      return item > 0 ? Math.min(item, total) : 0;
    }
    if (pkg.payment_method === "cash") return 0;
    return item;
  };

  const getCashDetailPlatformDeliveryBalanceMmk = (pkg: Package): number => {
    const t = getCashDetailPlatformLineTotal(pkg);
    const p = getCashDetailPlatformItemProductMmk(pkg);
    return Math.max(0, t - p);
  };

  /** 总跑腿费（仅现金代收部分） */
  const getCashDetailDeliveryLineCashOnly = (pkg: Package): number => {
    if (pkg.payment_method !== "cash") return 0;
    return parsePackagePriceMmk(pkg);
  };

  const isMerchantPackage = (pkg: Package): boolean =>
    isMerchantFinancePackage(pkg, deliveryStores);

  /**
   * 总代收款（现金）：仅 `payment_method === "cash"` 的商家单上的 cod_amount。
   * 客户端 web/app 下单均为余额/二维码，不算现金代收，不会计入。
   */
  const getCashDetailMerchantRiderCodMmk = (pkg: Package): number => {
    if (pkg.payment_method !== "cash") return 0;
    if (!isMerchantPackage(pkg)) return 0;
    return Number(pkg.cod_amount || 0);
  };

  /**
   * 与「当日收款管理」统计卡片、快递员列表、courierCashMap、点击「查看详情」后的默认日期
   * 使用同一套筛选，保证「商家 COD 明细」与「骑手现金收款详情」中的订单集合规则一致。
   */
  const isPackageInCashCollectionDayView = useCallback(
    (pkg: Package): boolean => {
      if (pkg.status !== "已送达" && pkg.status !== "已完成") return false;
      if (cashSettlementStatus === "unsettled" && pkg.rider_settled)
        return false;
      if (cashSettlementStatus === "settled" && !pkg.rider_settled)
        return false;
      const dateKey = getDateKey(
        pkg.delivery_time ||
          pkg.updated_at ||
          pkg.created_at ||
          pkg.create_time,
      );
      if (!dateKey || dateKey !== cashCollectionDate) return false;
      if (isRegionalUser && !pkg.id.startsWith(currentRegionPrefix))
        return false;
      return true;
    },
    [
      cashCollectionDate,
      cashSettlementStatus,
      isRegionalUser,
      currentRegionPrefix,
    ],
  );

  const getStoreRegionPrefix = (store?: {
    store_code?: string | null;
  }): string => {
    if (!store?.store_code) return "";
    const match = store.store_code.match(/^[A-Z]+/i);
    return match ? match[0].toUpperCase() : "";
  };

  useEffect(() => {
    loadInitialFinanceData();
  }, []);

  const loadPricingSettings = async () => {
    const map = await systemSettingsService.getRegionalPricingMap(
      REGIONS.map((r) => r.id),
    );
    setRegionalPricingMap(map);
  };

  /** 卡片展示用：领区账号看本领区起步价；总部默认曼德勒（汇总已按每单领区计算） */
  const pricingSettingsDisplay = useMemo(() => {
    const fallback = {
      base_fee: 1500,
      way_side_courier_per_order: 0,
      courier_km_rate: 500,
      delivery_bonus_rate: 0,
    };
    const m = regionalPricingMap;
    if (!m || Object.keys(m).length === 0) return fallback;
    if (isRegionalUser) {
      const prefixToId: Record<string, string> = {
        MDY: "mandalay",
        YGN: "yangon",
        POL: "maymyo",
        NPW: "naypyidaw",
        TGI: "taunggyi",
        LSO: "lashio",
        MUSE: "muse",
      };
      const rid = prefixToId[currentRegionPrefix] || DEFAULT_PRICING_REGION_ID;
      return m[rid] || m[DEFAULT_PRICING_REGION_ID] || fallback;
    }
    return m[DEFAULT_PRICING_REGION_ID] || Object.values(m)[0] || fallback;
  }, [regionalPricingMap, isRegionalUser, currentRegionPrefix]);

  useEffect(() => {
    setSummary(
      calculateFinanceOverviewSummary({
        records,
        packages,
        stores: deliveryStores,
        regionalPricingMap,
        cashCollectionDate,
        regionPrefix: isRegionalUser ? currentRegionPrefix : undefined,
      }),
    );
  }, [
    records,
    packages,
    deliveryStores,
    cashCollectionDate,
    regionalPricingMap,
    isRegionalUser,
    currentRegionPrefix,
  ]);

  // 计算合伙店铺代收款统计
  const merchantsCollectionStats = useMemo(() => {
    if (!deliveryStores.length) return [];

    let filteredStores = [...deliveryStores];
    // 🌍 领区可见性：如果检测到是领区账号，则只显示该领区的店铺
    if (isRegionalUser) {
      filteredStores = filteredStores.filter(
        (s) => s.store_code && s.store_code.startsWith(currentRegionPrefix),
      );
    }

    return filteredStores
      .map((store) => {
        // 查找该店铺的所有代收款订单
        const storePackages = packages.filter((pkg) => {
          const isStorePkg =
            pkg.delivery_store_id === store.id ||
            pkg.sender_name === store.store_name;
          if (!isStorePkg) return false;
          const parts = getMerchantSettlementParts(pkg, deliveryStores);
          return parts.rawCodMmk > 0 || parts.rawPlatformMmk > 0;
        });

        // 3. 计算金额和订单数
        // 待结清金额 = 商家COD(需骑手已结清) + 余额支付(不依赖骑手结清)
        const unclearedAmount = storePackages.reduce(
          (sum, pkg) =>
            sum + getMerchantUnclearedAmountMmk(pkg, deliveryStores),
          0,
        );
        const unclearedCount = storePackages.filter(
          (pkg) => getMerchantUnclearedAmountMmk(pkg, deliveryStores) > 0,
        ).length;

        // 已结清金额（全时期累计）+ 今年已结清单数（按 cod_settled_at 自然年）
        const settledPackages = storePackages.filter((pkg) => pkg.cod_settled);
        const totalAmount = settledPackages.reduce(
          (sum, pkg) =>
            sum + getMerchantRecordedAmountMmk(pkg, deliveryStores),
          0,
        );
        const y = new Date().getFullYear();
        const yStart = new Date(y, 0, 1).getTime();
        const yEnd = new Date(y, 11, 31, 23, 59, 59, 999).getTime();
        /** 含无代收/无平台金额但已向平台结清的订单（与已结清弹窗同口径） */
        const settledThisYearCount = packages.filter((pkg) => {
          const isStorePkg =
            pkg.delivery_store_id === store.id ||
            pkg.sender_name === store.store_name;
          if (!isStorePkg) return false;
          if (pkg.status !== "已送达" && pkg.status !== "已完成") return false;
          if (!pkg.cod_settled || !pkg.cod_settled_at) return false;
          const ts = new Date(pkg.cod_settled_at).getTime();
          if (Number.isNaN(ts)) return false;
          return ts >= yStart && ts <= yEnd;
        }).length;

        // 计算最后结清日期（含零金额已结清单）
        const settledPackagesWithTime = packages.filter((pkg) => {
          const isStorePkg =
            pkg.delivery_store_id === store.id ||
            pkg.sender_name === store.store_name;
          return (
            isStorePkg &&
            (pkg.status === "已送达" || pkg.status === "已完成") &&
            !!pkg.cod_settled &&
            !!pkg.cod_settled_at
          );
        });
        let lastSettledAt: string | null = null;
        if (settledPackagesWithTime.length > 0) {
          // 找到最新的结清日期
          settledPackagesWithTime.sort(
            (a, b) =>
              new Date(b.cod_settled_at!).getTime() -
              new Date(a.cod_settled_at!).getTime(),
          );
          lastSettledAt = settledPackagesWithTime[0].cod_settled_at || null;
        }

        return {
          ...store,
          totalAmount,
          settledThisYearCount,
          unclearedAmount,
          unclearedCount: unclearedCount,
          lastSettledAt,
        };
      })
      .sort((a, b) => b.unclearedAmount - a.unclearedAmount);
  }, [deliveryStores, packages, isRegionalUser, currentRegionPrefix]);

  const filteredMerchantCodModalOrders = useMemo(() => {
    const q = merchantCodModalSearch.trim().toLowerCase();
    if (!q) return modalOrders;
    return modalOrders.filter((pkg) => {
      const id = (pkg.id || "").toLowerCase();
      const sender = (pkg.sender_name || "").toLowerCase();
      const receiver = (pkg.receiver_name || "").toLowerCase();
      const rphone = (pkg.receiver_phone || "").toLowerCase();
      const sphone = (pkg.sender_phone || "").toLowerCase();
      return (
        id.includes(q) ||
        sender.includes(q) ||
        receiver.includes(q) ||
        rphone.includes(q) ||
        sphone.includes(q)
      );
    });
  }, [modalOrders, merchantCodModalSearch]);

  /** 商家 COD 弹窗用筛选结果；「待结清订单明细」弹窗用全量，避免与筛选状态串用 */
  const merchantCodModalDisplayOrders = useMemo(() => {
    if (showPendingOrdersModal) return modalOrders;
    return filteredMerchantCodModalOrders;
  }, [
    showPendingOrdersModal,
    modalOrders,
    filteredMerchantCodModalOrders,
  ]);

  // 结清合伙店铺代收款
  const handleSettleMerchant = async (storeId: string, storeName: string) => {
    if (
      !window.confirm(
        `确定要结清 "${storeName}" 的所有代收款吗？\n\n这将把该店铺所有 "已送达" 且 "未结清" 的代收款订单标记为已结清。`,
      )
    )
      return;

    try {
      setLoading(true);
      const user = getCurrentUser();
      const result = await packageService.settleMerchantCOD(storeId, storeName, {
        kind: "admin",
        id: user?.username || "",
        name: user?.name || user?.username || "后台",
      });
      if (result.success) {
        feedbackService.notify("结清成功！");
        loadRecords(); // 刷新数据
      } else {
        throw result.error;
      }
    } catch (error) {
      console.error("结清失败:", error);
      feedbackService.notify("结清失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const applyFinancePayload = (
    financeData: FinanceRecord[],
    packageData: Package[],
    salaryData: CourierSalary[],
    accountsData: AdminAccount[],
    couriersResult: { data?: Array<Record<string, any>> | null },
    storesData: Awaited<
      ReturnType<typeof deliveryStoreService.getAllStores>
    >,
  ) => {
    setRecords(financeData);
    setPackages(packageData);
    setCourierSalaries(salaryData);
    setAdminAccounts(accountsData);
    // 以账号系统为准，职位「骑手」/「骑手队长」再合并 couriers 表实时字段（phone / employee_id）
    setCouriers(
      combineRidersFromAdminAccounts(accountsData, couriersResult.data || []),
    );
    setDeliveryStores(storesData);
  };

  /** 刷新按钮与写入后：仍一次拉齐 6 路，查询条件与原先 Promise.all 完全相同 */
  const loadRecords = async () => {
    try {
      setLoading(true);
      setExtrasLoading(true);
      await loadPricingSettings();
      const [
        financeData,
        packageData,
        salaryData,
        accountsData,
        couriersData,
        storesData,
      ] = await Promise.all([
        financeService.getAllRecords(),
        packageService.getAllPackages(),
        courierSalaryService.getAllSalaries(),
        adminAccountService.getAllAccounts(),
        supabase
          .from("couriers")
          .select("*")
          .order("created_at", { ascending: false }),
        deliveryStoreService.getAllStores(),
      ]);
      applyFinancePayload(
        financeData,
        packageData,
        salaryData,
        accountsData,
        couriersData,
        storesData,
      );
    } catch (error) {
      console.error("加载财务数据失败:", error);
      feedbackService.notify("加载财务数据失败，请刷新页面重试");
    } finally {
      setLoading(false);
      setExtrasLoading(false);
    }
  };

  /** 首屏：先核心（挡住总览/收支/包裹/商家 COD），工资与骑手表随后拉，接口与字段不变 */
  const loadInitialFinanceData = async () => {
    try {
      setLoading(true);
      setExtrasLoading(true);
      await loadPricingSettings();
      const [financeData, packageData, accountsData, storesData] =
        await Promise.all([
          financeService.getAllRecords(),
          packageService.getAllPackages(),
          adminAccountService.getAllAccounts(),
          deliveryStoreService.getAllStores(),
        ]);
      setRecords(financeData);
      setPackages(packageData);
      setAdminAccounts(accountsData);
      setDeliveryStores(storesData);
      setLoading(false);

      const [salaryData, couriersData] = await Promise.all([
        courierSalaryService.getAllSalaries(),
        supabase
          .from("couriers")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);
      setCourierSalaries(salaryData);
      setCouriers(
        combineRidersFromAdminAccounts(
          accountsData,
          couriersData.data || [],
        ),
      );
    } catch (error) {
      console.error("加载财务数据失败:", error);
      feedbackService.notify("加载财务数据失败，请刷新页面重试");
      setLoading(false);
    } finally {
      setExtrasLoading(false);
    }
  };

  // 打开工资生成选择窗口
  const handleOpenSalaryGeneration = async () => {
    setLoading(true);
    try {
      // 确保账号数据已加载
      if (adminAccounts.length === 0) {
        const accountsData = await adminAccountService.getAllAccounts();
        setAdminAccounts(accountsData);
      }

      const { yearMonth } = getLocalMonthBounds();
      const courierGroups = groupDeliveredPackagesForSalaryMonth(
        packages,
        yearMonth,
      );

      setCourierSalaryGroups(courierGroups);
      setSelectedCouriersForSalary(new Set(Object.keys(courierGroups)));
      setShowSalarySelectionModal(true);
    } catch (error) {
      console.error("获取骑手分组失败:", error);
      feedbackService.notify("获取骑手分组失败，请重试！");
    } finally {
      setLoading(false);
    }
  };

  // 生成选定骑手的本月工资
  const generateMonthlySalaries = async () => {
    if (selectedCouriersForSalary.size === 0) {
      feedbackService.notify("请至少选择一位骑手");
      return;
    }

    if (
      !window.confirm(
        `确定要为选中的 ${selectedCouriersForSalary.size} 位骑手生成本月工资记录吗？仅计入本月已送达订单。`,
      )
    )
      return;

    setLoading(true);
    setShowSalarySelectionModal(false);
    try {
      const { start: periodStart, end: periodEnd, yearMonth } =
        getLocalMonthBounds();

      // 为每个选中的骑手生成工资记录
      let successCount = 0;
      let createdCount = 0;
      let updatedCount = 0;

      for (const courierId of Array.from(selectedCouriersForSalary)) {
        const pkgs = (courierSalaryGroups[courierId] || []).filter((pkg) =>
          isPackageInLocalMonth(pkg, yearMonth),
        );
        if (!pkgs.length) continue;

        // 计算统计数据
        const totalDeliveries = pkgs.length;
        const totalKm = pkgs.reduce(
          (sum, pkg) => sum + (pkg.delivery_distance || 0),
          0,
        );
        const relatedPackageIds = pkgs.map((p) => p.id);

        // 配送提成：每单 max(0, 跑腿费 - 该单起步价快照)
        const kmFee = pkgs.reduce((sum, pkg) => {
          const regional = getRegionalPricingForPackage(pkg, regionalPricingMap);
          const settingsBaseFee = regional.base_fee || 1500;
          return (
            sum +
            getRiderDeliveryShareMmk(pkg, settingsBaseFee, regional)
          );
        }, 0);

        // 从账号管理中获取骑手的基本工资 (严格以员工账号设置的工资为准)
        const courierAccount = adminAccounts.find(
          (account) =>
            account.employee_name === courierId &&
            (account.position === "骑手" || account.position === "骑手队长"),
        );

        const baseSalary =
          courierAccount?.salary && courierAccount.salary > 0
            ? courierAccount.salary
            : 0;

        const deliveryBonus = pkgs.reduce((sum, pkg) => {
          const regional = getRegionalPricingForPackage(pkg, regionalPricingMap);
          return sum + (regional.delivery_bonus_rate || 0);
        }, 0);

        const grossSalary = baseSalary + kmFee + deliveryBonus;
        const netSalary = grossSalary;

        // 检查是否已存在
        const existingSalary = courierSalaries.find(
          (s) =>
            s.courier_id === courierId &&
            s.period_start_date === periodStart &&
            s.period_end_date === periodEnd,
        );

        const salaryData: Omit<CourierSalary, "id"> = {
          courier_id: courierId,
          courier_name: courierId,
          settlement_period: "monthly",
          period_start_date: periodStart,
          period_end_date: periodEnd,
          base_salary: baseSalary,
          km_fee: kmFee,
          delivery_bonus: deliveryBonus,
          performance_bonus: 0,
          overtime_pay: 0,
          tip_amount: 0,
          deduction_amount: 0,
          total_deliveries: totalDeliveries,
          total_km: totalKm,
          on_time_deliveries: totalDeliveries,
          late_deliveries: 0,
          gross_salary: grossSalary,
          net_salary: netSalary,
          status: "pending",
          related_package_ids: relatedPackageIds,
        };

        let success = false;
        if (existingSalary) {
          const updateData: Partial<CourierSalary> = {
            base_salary: baseSalary,
            km_fee: kmFee,
            delivery_bonus: deliveryBonus,
            total_deliveries: totalDeliveries,
            total_km: totalKm,
            on_time_deliveries: totalDeliveries,
            late_deliveries: 0,
            gross_salary: grossSalary,
            net_salary: netSalary,
            related_package_ids: relatedPackageIds,
            status:
              existingSalary.status === "pending"
                ? "pending"
                : existingSalary.status,
          };

          success = await courierSalaryService.updateSalary(
            existingSalary.id!,
            updateData,
          );
          if (success) {
            successCount++;
            updatedCount++;
          }
        } else {
          success = await courierSalaryService.createSalary(salaryData);
          if (success) {
            successCount++;
            createdCount++;
          }
        }
      }

      let message = `成功处理 ${successCount} 条工资记录！`;
      if (createdCount > 0) message += `\n新建：${createdCount} 条`;
      if (updatedCount > 0) message += `\n更新：${updatedCount} 条`;

      feedbackService.notify(message);
      await loadRecords();
    } catch (error) {
      console.error("生成工资失败:", error);
      feedbackService.notify("生成工资失败，请重试！");
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      // 🔒 权限逻辑优化：非系统管理员账号只能看到他们自己添加过的记录
      if (currentUserRole !== "admin") {
        // 如果不是系统管理员，只显示自己创建的记录
        if (record.created_by !== currentUser) return false;
      }

      const matchesSearch =
        record.order_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.courier_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.reference?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        filterStatus === "all" || record.status === filterStatus;
      const matchesType =
        filterType === "all" || record.record_type === filterType;

      const withinDateRange = (() => {
        if (!dateRange.start && !dateRange.end) return true;
        const date = new Date(record.record_date);
        const start = dateRange.start ? new Date(dateRange.start) : null;
        const end = dateRange.end ? new Date(dateRange.end) : null;

        if (start && date < start) return false;
        if (end) {
          end.setHours(23, 59, 59, 999);
          if (date > end) return false;
        }
        return true;
      })();

      return matchesSearch && matchesStatus && matchesType && withinDateRange;
    });
  }, [records, searchTerm, filterStatus, filterType, dateRange, currentUser]);

  const resetForm = () => {
    setFormData({
      ...defaultForm,
      record_date: new Date().toISOString().slice(0, 10), // 确保日期始终是今天
    });
    setEditingRecord(null);
  };

  const closeFinanceRecordForm = useCallback(() => {
    setShowForm(false);
    setFormData({
      ...defaultForm,
      record_date: new Date().toISOString().slice(0, 10),
    });
    setEditingRecord(null);
  }, []);

  useEffect(() => {
    if (!showForm) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeFinanceRecordForm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showForm, closeFinanceRecordForm]);

  useEffect(() => {
    if (!showForm) return;
    const id = window.setTimeout(() => {
      if (!editingRecord) financeRecordAmountRef.current?.focus();
    }, 120);
    return () => clearTimeout(id);
  }, [showForm, editingRecord]);

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || Number.isNaN(Number(formData.amount))) {
      feedbackService.notify("请填写有效的金额");
      return;
    }

    setIsProcessing(true);

    const payload: Omit<FinanceRecord, "created_at" | "updated_at"> = {
      id: editingRecord?.id ?? `FIN${Date.now()}`,
      record_type: formData.record_type,
      category: formData.category,
      order_id: formData.order_id,
      courier_id: formData.courier_id,
      amount: Number(formData.amount),
      currency: formData.currency,
      status: formData.status,
      payment_method: formData.payment_method,
      reference: formData.reference || undefined,
      record_date: formData.record_date,
      notes: formData.notes || undefined,
      created_by: editingRecord ? editingRecord.created_by : currentUser, // 保存当前用户名作为创建者
    };

    try {
      let success = false;
      const currentUser = localStorage.getItem("currentUser") || "unknown";
      const currentUserName =
        localStorage.getItem("currentUserName") || "未知用户";

      if (editingRecord) {
        success = await financeService.updateRecord(editingRecord.id, payload);

        // 记录审计日志 - 更新
        if (success) {
          await auditLogService.log({
            user_id: currentUser,
            user_name: currentUserName,
            action_type: "update",
            module: "finance",
            target_id: editingRecord.id,
            target_name: `财务记录 ${editingRecord.id}`,
            action_description: `更新财务记录，类型：${payload.record_type === "income" ? "收入" : "支出"}，分类：${payload.category}，金额：${payload.amount} ${payload.currency}`,
            old_value: JSON.stringify(editingRecord),
            new_value: JSON.stringify(payload),
          });
        }
      } else {
        const result = await financeService.createRecord(payload);
        success = Boolean(result);

        // 记录审计日志 - 创建
        if (success) {
          await auditLogService.log({
            user_id: currentUser,
            user_name: currentUserName,
            action_type: "create",
            module: "finance",
            target_id: payload.id,
            target_name: `财务记录 ${payload.id}`,
            action_description: `创建财务记录，类型：${payload.record_type === "income" ? "收入" : "支出"}，分类：${payload.category}，金额：${payload.amount} ${payload.currency}`,
            new_value: JSON.stringify(payload),
          });
        }
      }

      if (success) {
        await loadRecords();
        closeFinanceRecordForm();
      } else {
        feedbackService.notify("保存失败，请检查日志");
      }
    } catch (error) {
      console.error("保存财务记录失败:", error);
      feedbackService.notify("保存失败，请稍后重试");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditRecord = (record: FinanceRecord) => {
    setEditingRecord(record);
    setFormData({
      id: record.id,
      record_type: record.record_type,
      category: record.category,
      order_id: record.order_id || "",
      courier_id: record.courier_id || "",
      amount: String(record.amount),
      currency: record.currency || "MMK",
      status: record.status,
      payment_method: record.payment_method,
      reference: record.reference || "",
      record_date: record.record_date,
      notes: record.notes || "",
    });
    setShowForm(true);
  };

  /** 与商家端 Web `getPartnerCODOrders(..., settled: false, month: 当月)` 的月份范围一致 */
  const getCurrentMonthKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  const isPackageDeliveryInCalendarMonth = (
    pkg: Package,
    yearMonth: string,
  ) => {
    const parts = yearMonth.split("-").map(Number);
    const y = parts[0];
    const m = parts[1];
    if (!y || !m) return false;
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59, 999);
    const raw = pkg.delivery_time;
    if (!raw) return false;
    const dt = new Date(raw);
    if (Number.isNaN(dt.getTime())) return false;
    return dt >= start && dt <= end;
  };

  const downloadMerchantCodModalCsv = useCallback(() => {
    const list = filteredMerchantCodModalOrders;
    if (list.length === 0) return;
    const escape = (v: string | number | null | undefined) => {
      const s = v == null ? "" : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const statusForRow = (pkg: Package) => {
      const platformAmount = getPlatformPaymentAmount(pkg.description);
      if (Number(pkg.cod_amount || 0) > 0) {
        if (pkg.cod_settled) {
          return language === "zh"
            ? "已结清"
            : language === "my"
              ? "ရှင်းပြီး"
              : "Settled";
        }
        return language === "zh"
          ? "待结清"
          : language === "my"
            ? "စောင့်ဆိုင်း"
            : "Pending";
      }
      if (platformAmount > 0) {
        return language === "zh"
          ? "余额/平台"
          : language === "my"
            ? "ဘဏ်လက်ကျန်"
            : "Balance pay";
      }
      return "—";
    };
    const header =
      language === "zh"
        ? [
            "订单号",
            "店铺",
            "客户",
            "寄件电话",
            "收件电话",
            "代收_MMK",
            "平台或余额_MMK",
            "送达时间",
            "结清时间",
            "结清方",
            "状态",
          ]
        : language === "my"
          ? [
              "အော်ဒါ",
              "ဆိုင်",
              "ဖောက်သည်",
              "စေလွှတ်",
              "လက်ခံ",
              "COD_MMK",
              "ဘဏ်_MMK",
              "ပို့ဆောင်",
              "ရှင်းချိန်",
              "ရှင်းသူ",
              "အခြေအနေ",
            ]
          : [
              "Order ID",
              "Store",
              "Customer",
              "Sender phone",
              "Receiver phone",
              "COD_MMK",
              "Balance_MMK",
              "Delivered",
              "Settled at",
              "Settled by",
              "Status",
            ];
    const body = list.map((pkg) => {
      const parts = getMerchantSettlementParts(pkg, deliveryStores);
      return [
        escape(pkg.id),
        escape(pkg.sender_name),
        escape(pkg.receiver_name),
        escape(pkg.sender_phone),
        escape(pkg.receiver_phone),
        escape(String(parts.countedCodMmk)),
        escape(String(parts.countedPlatformMmk)),
        escape(pkg.delivery_time || ""),
        escape(
          pkg.cod_settled_at
            ? new Date(pkg.cod_settled_at).toLocaleString("zh-CN")
            : "",
        ),
        escape(
          formatCodSettledByLabel(
            pkg,
            language === "my" ? "my" : language === "en" ? "en" : "zh",
          ),
        ),
        escape(statusForRow(pkg)),
      ].join(",");
    });
    const blob = new Blob(
      ["\uFEFF" + [header.map(escape).join(","), ...body].join("\r\n")],
      { type: "text/csv;charset=utf-8" },
    );
    const y = new Date().getFullYear();
    const m = (getCurrentMonthKey() || `${y}-01`)
      .replace(/-/g, "")
      .slice(0, 6);
    const base =
      merchantCodModalKind === "settled_all"
        ? language === "zh"
          ? `已结清订单_${y}`
          : language === "my"
            ? `settled_${y}`
            : `settled_orders_${y}`
        : language === "zh"
          ? `代收款订单明细_${m}`
          : language === "my"
            ? `cod_pending_${m}`
            : `cod_uncleared_${m}`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${base}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [
    deliveryStores,
    filteredMerchantCodModalOrders,
    getCurrentMonthKey,
    language,
    merchantCodModalKind,
  ]);

  /** 已结清：与 settledThisYearCount 同口径，含无代收但 cod_settled 的订单 */
  const handleMerchantAllSettledOrdersClick = (storeName?: string) => {
    setMerchantCodModalSearch("");
    setMerchantCodModalKind("settled_all");
    setMerchantCodModalScope("month");
    const st = storeName
      ? deliveryStores.find((s) => s.store_name === storeName)
      : undefined;
    const y = new Date().getFullYear();
    const yStart = new Date(y, 0, 1).getTime();
    const yEnd = new Date(y, 11, 31, 23, 59, 59, 999).getTime();

    const list = packages
      .filter((pkg) => {
        if (isRegionalUser && !pkg.id.startsWith(currentRegionPrefix))
          return false;
        if (pkg.status !== "已送达" && pkg.status !== "已完成")
          return false;
        if (storeName) {
          const isStorePkg =
            st &&
            (pkg.delivery_store_id === st.id ||
              pkg.sender_name === st.store_name);
          if (st) {
            if (!isStorePkg) return false;
          } else if (pkg.sender_name !== storeName) {
            return false;
          }
        }
        if (!pkg.cod_settled) return false;
        if (!pkg.cod_settled_at) return false;
        const ts = new Date(pkg.cod_settled_at).getTime();
        if (Number.isNaN(ts) || ts < yStart || ts > yEnd) return false;
        return true;
      })
      .sort((a, b) => {
        const tb = b.cod_settled_at
          ? new Date(b.cod_settled_at).getTime()
          : 0;
        const ta = a.cod_settled_at
          ? new Date(a.cod_settled_at).getTime()
          : 0;
        return tb - ta;
      });

    setModalOrders(list);
    setModalTitle(
      storeName
        ? `${storeName} - ${y}年已结清订单`
        : `${y}年已结清订单`,
    );
    setShowMerchantSettledModal(true);
  };

  // 代收款订单明细：商家 Tab 默认当月（与商家端 Web 一致）；总览卡用 scope=all 对齐待结清合计
  const handleMerchantCollectionClick = (
    storeName?: string,
    options?: { scope?: "month" | "all" },
  ) => {
    const scope = options?.scope ?? "month";
    setMerchantCodModalSearch("");
    setMerchantCodModalKind("uncleared");
    setMerchantCodModalScope(scope);
    const monthKey = getCurrentMonthKey();
    const st = storeName
      ? deliveryStores.find((s) => s.store_name === storeName)
      : undefined;
    const storesInScope = isRegionalUser
      ? deliveryStores.filter(
          (s) => s.store_code && s.store_code.startsWith(currentRegionPrefix),
        )
      : deliveryStores;

    const matchesStore = (pkg: Package) => {
      if (!storeName) {
        if (scope === "all") return true;
        return storesInScope.some(
          (s) =>
            pkg.delivery_store_id === s.id ||
            pkg.sender_name === s.store_name,
        );
      }
      if (!st) return pkg.sender_name === storeName;
      return (
        pkg.delivery_store_id === st.id || pkg.sender_name === st.store_name
      );
    };

    const codOrders = packages
      .filter((pkg) => {
        if (isRegionalUser && !pkg.id.startsWith(currentRegionPrefix))
          return false;
        if (!matchesStore(pkg)) return false;
        if (scope === "all") {
          return getMerchantUnclearedAmountMmk(pkg, deliveryStores) > 0;
        }
        if (pkg.status !== "已送达") return false;
        if (pkg.cod_settled) return false;
        return isPackageDeliveryInCalendarMonth(pkg, monthKey);
      })
      .sort((a, b) => {
        const dateA = a.delivery_time
          ? new Date(a.delivery_time).getTime()
          : 0;
        const dateB = b.delivery_time
          ? new Date(b.delivery_time).getTime()
          : 0;
        return dateB - dateA;
      });

    setModalOrders(codOrders);
    setModalTitle(
      storeName
        ? `${storeName} - 代收款订单明细`
        : scope === "all"
          ? language === "zh"
            ? "商家未结清代收"
            : "Merchant uncleared"
          : "代收款订单明细",
    );
    setShowMerchantSettledModal(true);
  };

  const handlePendingCashClick = () => {
    setMerchantCodModalSearch("");
    const pending = packages
      .filter(
        (pkg) =>
          getPendingRiderCashAmountMmk(
            pkg,
            cashCollectionDate,
            deliveryStores,
          ) > 0,
      )
      .sort((a, b) => {
        const dateA = a.delivery_time ? new Date(a.delivery_time).getTime() : 0;
        const dateB = b.delivery_time ? new Date(b.delivery_time).getTime() : 0;
        return dateB - dateA;
      });
    setModalOrders(pending);
    setModalTitle(
      language === "zh"
        ? `当日骑手未结现金（${cashCollectionDate}）`
        : language === "my"
          ? `မရှင်းရသေးသော ငွေသား (${cashCollectionDate})`
          : `Unsettled rider cash (${cashCollectionDate})`,
    );
    setShowPendingOrdersModal(true);
  };

  // 新增：处理待结清金额卡片点击
  const handlePendingPaymentsClick = (storeName?: string) => {
    setMerchantCodModalSearch("");
    // 找出所有待结清的代收订单 (rider_settled && !cod_settled)
    const pendingOrders = packages.filter((pkg) => {
      // 如果指定了店铺名，只看该店铺的
      if (
        storeName &&
        pkg.sender_name !== storeName &&
        !pkg.sender_name?.startsWith(storeName)
      ) {
        return false;
      }
      const isStoreMatch = deliveryStores.some(
        (store) =>
          store.store_name === pkg.sender_name ||
          (pkg.sender_name && pkg.sender_name.startsWith(store.store_name)),
      );
      const isMerchant = !!pkg.delivery_store_id || isStoreMatch;
      if (!isMerchant || pkg.cod_settled) return false;
      return getMerchantUnclearedAmountMmk(pkg, deliveryStores) > 0;
    });

    setModalOrders(pendingOrders);
    setModalTitle(
      storeName ? `${storeName} - 待结清订单明细` : "待结清订单明细",
    );
    setShowPendingOrdersModal(true);
  };

  // 🚀 新增：处理平台支付卡片点击
  const handlePlatformPaymentClick = () => {
    setPlatformPaymentCustomerFilter("all");
    setPlatformPaymentRegionFilter("all");
    // 找出所有已送达且描述中包含“平台支付”标识的订单
    const platformOrders = packages
      .filter((pkg) => {
        if (pkg.status !== "已送达") return false;
        return pkg.description?.match(
          /\[(?:付给商家|Pay to Merchant|ဆိုင်သို့ ပေးချေရန်|骑手代付|Courier Advance Pay|ကောင်ရီယာမှ ကြိုတင်ပေးချေခြင်း|平台支付|Platform Payment|ပလက်ဖောင်းမှ ပေးချေခြင်း): (.*?) MMK\]/,
        );
      })
      .sort((a, b) => {
        const dateA = a.delivery_time ? new Date(a.delivery_time).getTime() : 0;
        const dateB = b.delivery_time ? new Date(b.delivery_time).getTime() : 0;
        return dateB - dateA;
      });

    setPlatformPaymentOrders(platformOrders);
    setShowPlatformPaymentModal(true);
  };

  const handleDeleteRecord = async (id: string) => {
    if (!window.confirm("确定要删除这条财务记录吗？")) return;

    // 获取要删除的记录信息（用于审计日志）
    const recordToDelete = records.find((r) => r.id === id);

    try {
      const success = await financeService.deleteRecord(id);
      if (success) {
        // 记录审计日志
        const currentUser = localStorage.getItem("currentUser") || "unknown";
        const currentUserName =
          localStorage.getItem("currentUserName") || "未知用户";

        await auditLogService.log({
          user_id: currentUser,
          user_name: currentUserName,
          action_type: "delete",
          module: "finance",
          target_id: id,
          target_name: `财务记录 ${id}`,
          action_description: `删除财务记录，类型：${recordToDelete?.record_type === "income" ? "收入" : "支出"}，分类：${recordToDelete?.category || "未知"}，金额：${recordToDelete?.amount || 0} ${recordToDelete?.currency || "MMK"}`,
          old_value: JSON.stringify(recordToDelete),
        });

        await loadRecords();
      } else {
        feedbackService.notify("删除失败，请检查日志");
      }
    } catch (error) {
      console.error("删除失败:", error);
      feedbackService.notify("删除失败，请稍后重试");
    }
  };

  const renderSummaryCard = (
    title: string,
    value: number,
    description: React.ReactNode,
    color: string,
    onClick?: () => void,
  ) => (
    <div
      onClick={onClick}
      style={{
        background: "#fff",
        borderRadius: "12px",
        padding: "24px",
        border: "1px solid #e2e8f0",
        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06), 0 6px 16px rgba(15, 23, 42, 0.06)",
        position: "relative",
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.3s ease",
      }}
      onMouseOver={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = "translateY(-5px)";
          e.currentTarget.style.background = "#f8fafc";
        }
      }}
      onMouseOut={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.background = "#ffffff";
        }
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "-40px",
          right: "-40px",
          width: "120px",
          height: "120px",
          background: `${color}33`,
          borderRadius: "50%",
          filter: "blur(0px)",
        }}
      />
      <h3
        style={{
          color: "#0f172a",
          fontSize: "1.1rem",
          marginBottom: "12px",
        }}
      >
        {title}
      </h3>
      <div
        style={{
          color,
          fontSize: isMobile ? "1.5rem" : "2rem",
          fontWeight: 700,
          letterSpacing: "1px",
          marginBottom: "8px",
        }}
      >
        {value.toLocaleString()} MMK
      </div>
      <div
        style={{
          color: "#64748b",
          fontSize: "0.9rem",
          margin: 0,
        }}
      >
        {description}
      </div>
      {onClick ? (
        <div
          style={{
            marginTop: "10px",
            color: "#0958d9",
            fontSize: "0.8rem",
            fontWeight: 600,
          }}
        >
          {t.overviewClickHint}
        </div>
      ) : null}
    </div>
  );

  const financeWorkspace = {
    activeTab,
    cashCollectionDate,
    cashDetailDateFilter,
    cashDetailEndDate,
    cashDetailStartDate,
    cashSettlementStatus,
    clearedCashPackages,
    courierSalaries,
    courierSalaryGroups,
    couriers,
    currentRegionPrefix,
    currentUserRole,
    deliveredIncome,
    deliveredPackages,
    deliveredPackagesSorted,
    deliveryStores,
    dateRange,
    extrasLoading,
    filterStatus,
    filterType,
    filteredRecords,
    formatMonthDisplay,
    generateMonthlySalaries,
    getAvailableMonths,
    getCashDetailDeliveryLineCashOnly,
    getCashDetailMerchantRiderCodMmk,
    getCashDetailPlatformDeliveryBalanceMmk,
    getCashDetailPlatformItemProductMmk,
    getCashDetailPlatformLineTotal,
    getFilteredSalariesByMonth,
    getRecordRegion,
    getStoreRegionPrefix,
    handleDeleteRecord,
    handleEditRecord,
    handleMerchantAllSettledOrdersClick,
    handleMerchantCollectionClick,
    handleOpenSalaryGeneration,
    handlePendingCashClick,
    handlePendingPaymentsClick,
    handlePlatformPaymentClick,
    handleSettleMerchant,
    inProgressIncome,
    inProgressPackages,
    isMobile,
    isPackageInCashCollectionDayView,
    isRegionalUser,
    language,
    loadRecords,
    loading,
    merchantRegionFilter,
    merchantsCollectionStats,
    packageCurrentPackages,
    packageCurrentPage,
    packageDisplayEnd,
    packageDisplayStart,
    packagePaymentFilter,
    packageRecordsPerPage,
    packageTotalPages,
    packages,
    paymentForm,
    pricingSettingsDisplay,
    records,
    regionalPricingMap,
    renderSummaryCard,
    salaryFilterStatus,
    searchTerm,
    selectedCashPackages,
    selectedCourier,
    selectedCouriersForSalary,
    selectedSalaries,
    selectedSalary,
    selectedSalaryMonth,
    setCashCollectionDate,
    setCashDetailDateFilter,
    setCashDetailEndDate,
    setCashDetailStartDate,
    setCashSettlementStatus,
    setDateRange,
    setFilterStatus,
    setFilterType,
    setClearedCashPackages,
    setLoading,
    setMerchantRegionFilter,
    setPackagePaymentFilter,
    setPackageRecordsPage,
    setPackageRecordsPerPage,
    setPaymentForm,
    setSalaryDetails,
    setSalaryFilterStatus,
    setSearchTerm,
    setSelectedCashPackages,
    setSelectedCourier,
    setSelectedCouriersForSalary,
    setSelectedSalaries,
    setSelectedSalary,
    setSelectedSalaryMonth,
    setShowCashDetailModal,
    setShowPaymentModal,
    setShowSalaryDetail,
    setShowSalarySelectionModal,
    showCashDetailModal,
    showCashSettlementReminder,
    showPaymentModal,
    showSalaryDetail,
    showSalarySelectionModal,
    showYesterdayCashUnsettledReminder,
    summary,
    t,
    width
  };

  return (
    <FinanceWorkspaceProvider value={financeWorkspace}>
    <div className="admin-page admin-finance">
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          color: "#0f172a",
          position: "relative",
        }}
      >
        <div className="admin-page-head">
          <div>
            <h1
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              💰 {t.title}
              {isRegionalUser && (
                <span
                  style={{
                    background: "#48bb78",
                    color: "#0f172a",
                    padding: "4px 12px",
                    borderRadius: "8px",
                    fontSize: "0.9rem",
                    fontWeight: "bold",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                  }}
                >
                  📍 {currentRegionPrefix}
                </span>
              )}
            </h1>
            <p style={{ margin: "8px 0 0 0" }}>{t.subtitle}</p>
          </div>
          <div className="admin-page-actions">
            <button
              type="button"
              className="admin-shell__btn"
              onClick={loadRecords}
              disabled={loading}
            >
              {loading ? "🔄 " + t.loadingData : "🔄 " + t.refreshData}
            </button>
            <button
              type="button"
              className="admin-shell__btn"
              onClick={() => navigate("/admin/dashboard")}
            >
              ← {t.backToDashboard}
            </button>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "12px",
            marginBottom: "24px",
            flexWrap: "wrap",
          }}
        >
          {(
            [
              "overview",
              "records",
              "analytics",
              "package_records",
              "courier_records",
              "cash_collection",
              "merchants_collection",
            ] as TabKey[]
          )
            .filter((key) => {
              if (isRegionalUser) {
                // 🌍 领区账号过滤：隐藏总览、数据分析，保留收支、收款等业务模块
                return !["overview", "analytics"].includes(key);
              }
              return true;
            })
            .map((key) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  padding: "12px 24px",
                  borderRadius: "12px",
                  border:
                    key === "cash_collection" && showYesterdayCashTabIndicator
                      ? "1px solid #fb923c"
                      : "1px solid #e2e8f0",
                  background:
                    activeTab === key
                      ? "#e6f4ff"
                      : "#fff",
                  color: activeTab === key ? "#0958d9" : "#0f172a",
                  cursor: "pointer",
                  fontSize: "1rem",
                  transition: "all 0.3s ease",
                }}
                title={
                  key === "cash_collection" && showYesterdayCashTabIndicator
                    ? t.cashYesterdayUnsettledReminder
                    : undefined
                }
              >
                {key === "overview" && t.financeOverview}
                {key === "records" && t.financialRecords}
                {key === "analytics" && t.dataAnalysis}
                {key === "package_records" && t.packageFinanceRecords}
                {key === "courier_records" && t.courierFinanceRecords}
                {key === "cash_collection" && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span>{t.dailyCollection}</span>
                    {showYesterdayCashTabIndicator && (
                      <span
                        aria-hidden
                        style={{
                          width: "10px",
                          height: "10px",
                          borderRadius: "50%",
                          background: "#f97316",
                          boxShadow: "0 0 0 2px rgba(249, 115, 22, 0.45)",
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </span>
                )}
                {key === "merchants_collection" && t.merchantsCollection}
              </button>
            ))}
          {(activeTab === "records" || activeTab === "package_records") && (
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              style={{
                marginLeft: "auto",
                padding: "12px 24px",
                borderRadius: "12px",
                border: "none",
                background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                color: "#05223b",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 12px 25px rgba(79, 172, 254, 0.35)",
                position: "relative",
                zIndex: 5,
              }}
            >
              + {t.addRecord}
            </button>
          )}
        </div>

        {activeTab === "overview" && (
          <Suspense
            fallback={
              <div className="admin-loading">{t.loadingData}</div>
            }
          >
            <FinanceOverviewTab />
          </Suspense>
        )}

        {activeTab === "records" && (
          <Suspense
            fallback={
              <div className="admin-loading">{t.loadingData}</div>
            }
          >
            <FinanceRecordsTab />
          </Suspense>
        )}

        {activeTab === "analytics" && (
          <Suspense
            fallback={
              <div
                style={{
                  color: "#0f172a",
                  padding: "40px",
                  textAlign: "center",
                }}
              >
                {t.loadingData}
              </div>
            }
          >
            <FinanceAnalyticsTab
              t={t}
              isMobile={isMobile}
              language={language}
              records={records}
              packages={packages}
            />
          </Suspense>
        )}

        {activeTab === "package_records" && (
          <Suspense
            fallback={
              <div className="admin-loading">{t.loadingData}</div>
            }
          >
            <FinancePackageRecordsTab />
          </Suspense>
        )}

        {activeTab === "courier_records" && extrasLoading && (
          <div style={{ padding: "8px 0 24px" }}>
            <SkeletonCard count={4} />
          </div>
        )}

        {activeTab === "courier_records" && !extrasLoading && (
          <Suspense
            fallback={
              <div className="admin-loading">{t.loadingData}</div>
            }
          >
            <FinanceCourierRecordsTab />
          </Suspense>
        )}

        {activeTab === "cash_collection" && extrasLoading && (
          <div style={{ padding: "8px 0 24px" }}>
            <SkeletonCard count={4} />
          </div>
        )}

        {activeTab === "cash_collection" && !extrasLoading && (
          <Suspense
            fallback={
              <div className="admin-loading">{t.loadingData}</div>
            }
          >
            <FinanceCashCollectionTab />
          </Suspense>
        )}

        {activeTab === "merchants_collection" && (
          <Suspense
            fallback={
              <div className="admin-loading">{t.loadingData}</div>
            }
          >
            <FinanceMerchantsCollectionTab />
          </Suspense>
        )}
      </div>

      {/* 订单明细弹窗 (已结清 / 待结清) */}
      {(showMerchantSettledModal || showPendingOrdersModal) && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(10px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 2000,
            padding: isMobile ? "10px" : "20px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "24px",
              width: "100%",
              maxWidth: "900px",
              maxHeight: "90vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
              border: "1px solid #f1f5f9",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "24px",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.5rem",
                  color: "#0f172a",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                {showMerchantSettledModal ? "🤝" : "⏳"} {modalTitle}
                <span
                  style={{
                    fontSize: "0.9rem",
                    background: "#f1f5f9",
                    padding: "4px 12px",
                    borderRadius: "20px",
                    opacity: 0.8,
                  }}
                >
                  {showMerchantSettledModal && merchantCodModalSearch.trim()
                    ? `${filteredMerchantCodModalOrders.length} / ${modalOrders.length}`
                    : modalOrders.length}{" "}
                  {language === "zh" ? "单" : ""}
                </span>
              </h2>
              <button
                onClick={() => {
                  setMerchantCodModalSearch("");
                  setShowMerchantSettledModal(false);
                  setShowPendingOrdersModal(false);
                }}
                style={{
                  background: "#f1f5f9",
                  border: "none",
                  color: "#0f172a",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = "#e2e8f0")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = "#f1f5f9")
                }
              >
                ×
              </button>
            </div>

            {showMerchantSettledModal && merchantCodModalKind === "uncleared" && (
              <div
                style={{
                  padding: "0 24px 12px",
                  color: "#64748b",
                  fontSize: "0.84rem",
                  lineHeight: 1.45,
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                {merchantCodModalScope === "all"
                  ? language === "zh"
                    ? "与总览「商家未结清代收」及「商家COD明细」待结清合计同一口径：已送达、商家未结；COD 须骑手已交，余额/平台支付一并计入。"
                    : language === "my"
                      ? "အနှစ်ချုပ်ကတ်နှင့် ဆိုင် COD စာရင်း — ပို့ဆောင်ပြီး၊ ဆိုင်မရှင်း၊ COD သည် ပို့ဆောင်သူရှင်းပြီးမှ၊ ပလက်ဖောင်းပေးချေမှု ပါဝင်"
                      : "Same as the overview card and Merchant COD uncleared total: delivered, merchant not settled; COD after rider settle, plus balance/platform pay."
                  : language === "zh"
                    ? `与商家端 Web「待结清订单」同一规则：当前自然月（${getCurrentMonthKey()}）内已送达、商家代收款未结清（cod_settled 为空或 false）；店铺匹配为 delivery_store_id 或 sender_name 与合伙店一致。`
                    : language === "my"
                      ? "ဆိုင် Web ရှင်းလင်းရန် စောင့်ဆိုင်းမှု နှင့်တူညီသော စည်းမျဉ်း—လက်ရှိလ၊ ပို့ဆောင်ပြီး cod မရှင်းရသေး"
                      : `Same rules as merchant web “Uncleared orders”: current month (${getCurrentMonthKey()}), delivered, COD not settled; store by delivery_store_id or sender_name.`}
              </div>
            )}
            {showMerchantSettledModal && merchantCodModalKind === "settled_all" && (
              <div
                    style={{
                  padding: "0 24px 12px",
                  color: "#64748b",
                  fontSize: "0.84rem",
                  lineHeight: 1.45,
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                {language === "zh"
                  ? `与上方「当年已结清」笔数一致：只列出结清时间（cod_settled_at）落在 ${new Date().getFullYear()} 自然年内的订单（含无代收/平台金额但已作结清标记的单），由新到旧。`
                  : language === "my"
                    ? "ဖော်ပြထားသော နှစ်ကာလတွင် ရှင်းလင်းချိန် (cod_settled_at) အတိုင်း"
                    : "Same count as the card: orders with settlement time (cod_settled_at) in the current year, newest first—aligned with merchant web."}
                </div>
            )}

            {showMerchantSettledModal &&
              (merchantCodModalKind === "uncleared" ||
                merchantCodModalKind === "settled_all") && (
                <div
                    style={{
                    padding: "12px 24px 0",
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "12px",
                    alignItems: "center",
                  }}
                >
                  <input
                    type="search"
                    value={merchantCodModalSearch}
                    onChange={(e) => setMerchantCodModalSearch(e.target.value)}
                    placeholder={
                      language === "zh"
                        ? "筛选：订单号 / 店铺 / 客户 / 电话"
                        : language === "my"
                          ? "အော်ဒါ/ဆိုင်/ဖုန်း ရှာရန်"
                          : "Filter by order ID, store, customer, phone"
                    }
                    style={{
                      flex: "1 1 220px",
                      minWidth: 0,
                      padding: "10px 14px",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      background: "#ffffff",
                      color: "#0f172a",
                      fontSize: "0.95rem",
                    }}
                  />
                  <button
                    type="button"
                    onClick={downloadMerchantCodModalCsv}
                    disabled={filteredMerchantCodModalOrders.length === 0}
                    style={{
                      padding: "10px 18px",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      background:
                        filteredMerchantCodModalOrders.length === 0
                          ? "#f8fafc"
                          : "linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)",
                      color:
                        filteredMerchantCodModalOrders.length === 0
                          ? "#cbd5e1"
                          : "#05221a",
                      fontWeight: 700,
                      cursor:
                        filteredMerchantCodModalOrders.length === 0
                          ? "not-allowed"
                          : "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {language === "zh"
                      ? "导出对账单 (CSV)"
                      : language === "my"
                        ? "CSV ထုတ်ရန်"
                        : "Export statement (CSV)"}
                  </button>
                </div>
              )}

            {/* Content */}
            <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "1fr"
                    : "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: "16px",
                }}
              >
                {merchantCodModalDisplayOrders.map((pkg) => {
                  const settlerLabel = formatCodSettledByLabel(
                    pkg,
                    language === "my" ? "my" : language === "en" ? "en" : "zh",
                  );
                  return (
                  <div
                    key={pkg.id}
                    style={{
                      background: "#f8fafc",
                      borderRadius: "16px",
                      padding: "16px",
                      border: "1px solid #f1f5f9",
                      transition: "transform 0.2s",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "12px",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: "bold",
                          color: "#4facfe",
                          fontSize: "1rem",
                        }}
                      >
                        {pkg.id}
                      </span>
                      {(() => {
                        const parts = getMerchantSettlementParts(
                          pkg,
                          deliveryStores,
                        );
                        const platformAmount = parts.countedPlatformMmk;
                        const cod = parts.countedCodMmk;
                        if (cod > 0) {
                          return (
                            <span
                              style={{
                                padding: "4px 10px",
                                borderRadius: "8px",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                background: pkg.cod_settled
                                  ? "rgba(39, 174, 96, 0.2)"
                                  : "rgba(243, 156, 18, 0.2)",
                                color: pkg.cod_settled ? "#2ecc71" : "#f39c12",
                              }}
                            >
                              {pkg.cod_settled
                                ? language === "zh"
                                  ? "已结清"
                                  : "Settled"
                                : language === "zh"
                                  ? "待结清"
                                  : "Pending"}
                            </span>
                          );
                        }
                        if (platformAmount > 0) {
                          return (
                            <span
                              style={{
                                padding: "4px 10px",
                                borderRadius: "8px",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                background: "rgba(16, 185, 129, 0.2)",
                                color: "#10b981",
                              }}
                            >
                              {language === "zh" ? "余额支付" : "Balance Pay"}
                            </span>
                          );
                        }
                        if (
                          merchantCodModalKind === "uncleared" &&
                          !pkg.cod_settled
                        ) {
                          return (
                            <span
                              style={{
                                padding: "4px 10px",
                                borderRadius: "8px",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                background: "rgba(243, 156, 18, 0.2)",
                                color: "#f39c12",
                              }}
                            >
                              {language === "zh"
                                ? "待结清"
                                : language === "my"
                                  ? "စောင့်ဆိုင်း"
                                  : "Pending"}
                            </span>
                          );
                        }
                        if (merchantCodModalKind === "settled_all" && pkg.cod_settled) {
                          return (
                            <span
                              style={{
                                padding: "4px 10px",
                                borderRadius: "8px",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                background: "rgba(39, 174, 96, 0.2)",
                                color: "#2ecc71",
                              }}
                            >
                              {language === "zh"
                                ? "已结清"
                                : language === "my"
                                  ? "ရှင်းပြီး"
                                  : "Settled"}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.9rem",
                        }}
                      >
                        <span style={{ opacity: 0.6 }}>
                          {language === "zh" ? "店铺" : "Store"}:
                        </span>
                        <span style={{ color: "#0f172a" }}>
                          {pkg.sender_name}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.9rem",
                        }}
                      >
                        <span style={{ opacity: 0.6 }}>
                          {language === "zh" ? "客户" : "Customer"}:
                        </span>
                        <span style={{ color: "#0f172a" }}>
                          {pkg.receiver_name}
                        </span>
                      </div>

                      {(() => {
                        const parts = getMerchantSettlementParts(
                          pkg,
                          deliveryStores,
                        );
                        const lineAmount =
                          showMerchantSettledModal &&
                          merchantCodModalKind === "uncleared"
                            ? parts.unclearedMmk
                            : parts.countedCodMmk + parts.countedPlatformMmk;
                        const showUnclearedBreakdown =
                          showMerchantSettledModal &&
                          merchantCodModalKind === "uncleared";
                        const showCodLine = showUnclearedBreakdown
                          ? parts.pendingCodMmk > 0 ||
                            (parts.countedCodMmk > 0 && !pkg.rider_settled)
                          : parts.countedCodMmk > 0;
                        return (
                          <>
                            {showUnclearedBreakdown ? (
                              <>
                                {showCodLine && (
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      fontSize: "0.9rem",
                                    }}
                                  >
                                    <span style={{ opacity: 0.6 }}>
                                      {language === "zh"
                                        ? pkg.rider_settled
                                          ? "代收（已交账）"
                                          : "代收（骑手未交，不计入）"
                                        : "COD"}
                                      :
                                    </span>
                                    <span
                                      style={{
                                        fontWeight: "bold",
                                        color: pkg.rider_settled
                                          ? "#ff7675"
                                          : "#94a3b8",
                                      }}
                                    >
                                      {parts.pendingCodMmk.toLocaleString()} MMK
                                      {!pkg.rider_settled &&
                                      parts.countedCodMmk > 0
                                        ? ` / ${parts.countedCodMmk.toLocaleString()}`
                                        : ""}
                                    </span>
                                  </div>
                                )}
                                {parts.countedPlatformMmk > 0 && (
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      fontSize: "0.9rem",
                                    }}
                                  >
                                    <span style={{ opacity: 0.6 }}>
                                      {language === "zh"
                                        ? "平台支付"
                                        : "Platform"}
                                      :
                                    </span>
                                    <span
                                      style={{
                                        fontWeight: "bold",
                                        color: "#0ea5e9",
                                      }}
                                    >
                                      {parts.countedPlatformMmk.toLocaleString()}{" "}
                                      MMK
                                    </span>
                                  </div>
                                )}
                                {parts.duplicate && (
                                  <div
                                    style={{
                                      color: "#64748b",
                                      fontSize: "0.75rem",
                                    }}
                                  >
                                    {language === "zh"
                                      ? "代收与余额为同一笔货款，只计一次"
                                      : "COD and wallet pay are the same amount; counted once"}
                                  </div>
                                )}
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    fontSize: "0.95rem",
                                  }}
                                >
                                  <span style={{ opacity: 0.7 }}>
                                    {language === "zh"
                                      ? "本单待结清"
                                      : "This order"}
                                    :
                                  </span>
                                  <span
                                    style={{
                                      fontWeight: 800,
                                      color: "#ef4444",
                                    }}
                                  >
                                    {lineAmount.toLocaleString()} MMK
                                  </span>
                                </div>
                              </>
                            ) : (
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  fontSize: "0.9rem",
                                }}
                              >
                                <span style={{ opacity: 0.6 }}>
                                  {language === "zh" ? "代收金额" : "COD"}:
                                </span>
                                <span
                                  style={{
                                    fontWeight: "bold",
                                    color: "#ff7675",
                                  }}
                                >
                                  {(parts.countedCodMmk || 0).toLocaleString()}{" "}
                                  MMK
                                  {parts.countedPlatformMmk > 0
                                    ? language === "zh"
                                      ? `（余额 ${parts.countedPlatformMmk.toLocaleString()}）`
                                      : ` (Balance ${parts.countedPlatformMmk.toLocaleString()})`
                                    : ""}
                                </span>
                              </div>
                            )}
                          </>
                        );
                      })()}

                      {pkg.delivery_time && (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "0.85rem",
                          }}
                        >
                          <span style={{ opacity: 0.6 }}>
                            {language === "zh" ? "送达时间" : "Delivered"}:
                          </span>
                          <span style={{ opacity: 0.8 }}>
                            {pkg.delivery_time}
                          </span>
                        </div>
                      )}

                      {pkg.cod_settled_at && (
                        <div
                          style={{
                            marginTop: "8px",
                            paddingTop: "8px",
                            borderTop: "1px solid #f8fafc",
                            fontSize: "0.8rem",
                            opacity: 0.5,
                            textAlign: "right",
                          }}
                        >
                          {language === "zh" ? "结清时间" : "Settled at"}:{" "}
                          {new Date(pkg.cod_settled_at).toLocaleString("zh-CN")}
                          {settlerLabel ? ` · ${settlerLabel}` : ""}
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })}

                {modalOrders.length === 0 && (
                  <div
                    style={{
                      gridColumn: "1 / -1",
                      textAlign: "center",
                      padding: "60px",
                    }}
                  >
                    <div style={{ fontSize: "3rem", marginBottom: "16px" }}>
                      Empty
                    </div>
                    <div
                      style={{
                        color: "#64748b",
                        fontSize: "1.1rem",
                      }}
                    >
                      {language === "zh"
                        ? "暂无相关订单记录"
                        : "No related orders found"}
                    </div>
                  </div>
                )}
                {modalOrders.length > 0 &&
                  merchantCodModalDisplayOrders.length === 0 &&
                  showMerchantSettledModal &&
                  Boolean(merchantCodModalSearch.trim()) && (
                    <div
                      style={{
                        gridColumn: "1 / -1",
                        textAlign: "center",
                        padding: "60px",
                      }}
                    >
                      <div
                        style={{
                          color: "#64748b",
                          fontSize: "1.1rem",
                        }}
                      >
                        {language === "zh"
                          ? "没有符合筛选条件的订单"
                          : language === "my"
                            ? "စစ်ထုတ်ချက်နှင့် ကိုက်ညီသော အော်ဒါ မရှိပါ"
                            : "No orders match your filter"}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "20px 24px",
                borderTop: "1px solid #f1f5f9",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "16px",
                flexWrap: "wrap",
              }}
            >
              {showMerchantSettledModal &&
                merchantCodModalKind === "uncleared" && (
                  <div style={{ color: "#0f172a", fontSize: "0.95rem" }}>
                    <span style={{ color: "#64748b" }}>
                      {language === "zh"
                        ? "弹窗合计（须与卡片待结清金额一致）"
                        : language === "en"
                          ? "Modal total (must match the card)"
                          : "ပေါင်းလဒ်"}
                      :{" "}
                    </span>
                    <strong style={{ color: "#ef4444", fontSize: "1.15rem" }}>
                      {merchantCodModalDisplayOrders
                        .reduce(
                          (sum, pkg) =>
                            sum +
                            getMerchantUnclearedAmountMmk(pkg, deliveryStores),
                          0,
                        )
                        .toLocaleString()}{" "}
                      MMK
                    </strong>
                  </div>
                )}
              <button
                onClick={() => {
                  setMerchantCodModalSearch("");
                  setShowMerchantSettledModal(false);
                  setShowPendingOrdersModal(false);
                }}
                style={{
                  marginLeft: "auto",
                  background:
                    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                  border: "none",
                  color: "#05223b",
                  padding: "10px 24px",
                  borderRadius: "12px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  boxShadow: "0 8px 20px rgba(79, 172, 254, 0.3)",
                }}
              >
                {language === "zh" ? "确认" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 🚀 新增：平台支付（余额支付）订单明细弹窗 */}
      {showPlatformPaymentModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(10px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 2000,
            padding: isMobile ? "10px" : "20px",
          }}
          onClick={() => setShowPlatformPaymentModal(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "24px",
              width: "100%",
              maxWidth: "900px",
              maxHeight: "90vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
              border: "1px solid #f1f5f9",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: "24px",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.5rem",
                  color: "#0f172a",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                💳{" "}
                {language === "zh"
                  ? "平台支付（余额支付）明细"
                  : "Platform Payment Details"}
                <span
                  style={{
                    fontSize: "0.9rem",
                    background: "#f1f5f9",
                    padding: "4px 12px",
                    borderRadius: "20px",
                    opacity: 0.8,
                  }}
                >
                  {
                    platformPaymentOrders.filter((pkg) => {
                      const matchCustomer =
                        platformPaymentCustomerFilter === "all" ||
                        pkg.receiver_name === platformPaymentCustomerFilter;
                      const matchRegion =
                        platformPaymentRegionFilter === "all" ||
                        pkg.id.startsWith(platformPaymentRegionFilter);
                      return matchCustomer && matchRegion;
                    }).length
                  }{" "}
                  {language === "zh" ? "单" : ""}
                </span>
              </h2>
              <button
                onClick={() => setShowPlatformPaymentModal(false)}
                style={{
                  background: "#f1f5f9",
                  border: "none",
                  color: "#0f172a",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = "#e2e8f0")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = "#f1f5f9")
                }
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
              {/* 🚀 新增：筛选工具栏 */}
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  marginBottom: "20px",
                  flexWrap: "wrap",
                  background: "#f8fafc",
                  padding: "16px",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <label
                    style={{
                      display: "block",
                      color: "#64748b",
                      fontSize: "0.8rem",
                      marginBottom: "6px",
                    }}
                  >
                    {language === "zh" ? "商家筛选" : "Filter by Merchant"}
                  </label>
                  <select
                    value={platformPaymentCustomerFilter}
                    onChange={(e) =>
                      setPlatformPaymentCustomerFilter(e.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      background: "#ffffff",
                      color: "#0f172a",
                      fontSize: "0.9rem",
                    }}
                  >
                    <option value="all">
                      {language === "zh" ? "所有客户" : "All Customers"}
                    </option>
                    {Array.from(
                      new Set(
                        platformPaymentOrders.map((pkg) => pkg.receiver_name),
                      ),
                    )
                      .sort()
                      .map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                  </select>
                </div>

                <div style={{ flex: 1, minWidth: "200px" }}>
                  <label
                    style={{
                      display: "block",
                      color: "#64748b",
                      fontSize: "0.8rem",
                      marginBottom: "6px",
                    }}
                  >
                    {language === "zh" ? "按地区筛选" : "Filter by Region"}
                  </label>
                  <select
                    value={platformPaymentRegionFilter}
                    onChange={(e) =>
                      setPlatformPaymentRegionFilter(e.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      background: "#ffffff",
                      color: "#0f172a",
                      fontSize: "0.9rem",
                    }}
                  >
                    <option value="all">
                      {language === "zh" ? "所有地区" : "All Regions"}
                    </option>
                    {REGIONS.map((reg) => (
                      <option key={reg.prefix} value={reg.prefix}>
                        {reg.name} ({reg.prefix})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "1fr"
                    : "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: "16px",
                }}
              >
                {platformPaymentOrders
                  .filter((pkg) => {
                    const matchCustomer =
                      platformPaymentCustomerFilter === "all" ||
                      pkg.receiver_name === platformPaymentCustomerFilter;
                    const matchRegion =
                      platformPaymentRegionFilter === "all" ||
                      pkg.id.startsWith(platformPaymentRegionFilter);
                    return matchCustomer && matchRegion;
                  })
                  .map((pkg) => {
                    const platformAmount =
                      pkg.description?.match(
                        /\[(?:付给商家|Pay to Merchant|ဆိုင်သို့ ပေးချေရန်|骑手代付|Courier Advance Pay|ကောင်ရီယာမှ ကြိုတင်ပေးချေခြင်း|平台支付|Platform Payment|ပလက်ဖောင်းမှ ပေးချေခြင်း): (.*?) MMK\]/,
                      )?.[1] || "0";

                    // 🚀 逻辑：判断跑腿费支付方式
                    // 如果描述中包含 "[跑腿费已通过余额支付]" 标识，或者 payment_method 不是 cash 且订单有平台支付标识
                    const isDeliveryFeeBalance =
                      pkg.description?.includes("跑腿费已通过余额支付") ||
                      pkg.description?.includes(
                        "Delivery fee paid by balance",
                      ) ||
                      pkg.payment_method !== "cash";

                    return (
                      <div
                        key={pkg.id}
                        style={{
                          background: "#f8fafc",
                          borderRadius: "16px",
                          padding: "16px",
                          border: "1px solid #f1f5f9",
                          transition: "transform 0.2s",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: "12px",
                          }}
                        >
                          <span
                            style={{
                              fontWeight: "bold",
                              color: "#4facfe",
                              fontSize: "1rem",
                            }}
                          >
                            {pkg.id}
                          </span>
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: "8px",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              background: "rgba(16, 185, 129, 0.2)",
                              color: "#10b981",
                            }}
                          >
                            {language === "zh" ? "余额支付" : "Balance Pay"}
                          </span>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "0.9rem",
                            }}
                          >
                            <span style={{ opacity: 0.6 }}>
                              {language === "zh" ? "客户" : "Customer"}:
                            </span>
                            <span style={{ color: "#0f172a" }}>
                              {pkg.receiver_name}
                            </span>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "0.9rem",
                            }}
                          >
                            <span style={{ opacity: 0.6 }}>
                              {language === "zh" ? "货款支付" : "COD Paid"}:
                            </span>
                            <span
                              style={{ fontWeight: "bold", color: "#10b981" }}
                            >
                              {platformAmount} MMK
                            </span>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "0.85rem",
                            }}
                          >
                            <span style={{ opacity: 0.6 }}>
                              {language === "zh" ? "跑腿费" : "Delivery Fee"}:
                            </span>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ color: "#0f172a" }}>{pkg.price}</div>
                              <div
                                style={{
                                  fontSize: "0.7rem",
                                  color: isDeliveryFeeBalance
                                    ? "#10b981"
                                    : "#fbc531",
                                  fontWeight: "bold",
                                }}
                              >
                                {isDeliveryFeeBalance
                                  ? language === "zh"
                                    ? "● 平台余额支付"
                                    : "● Paid by Balance"
                                  : language === "zh"
                                    ? "● 现金支付"
                                    : "● Paid by Cash"}
                              </div>
                            </div>
                          </div>

                          <div
                            style={{
                              marginTop: "8px",
                              paddingTop: "8px",
                              borderTop: "1px solid #f8fafc",
                              fontSize: "0.8rem",
                              opacity: 0.5,
                              textAlign: "right",
                            }}
                          >
                            {language === "zh" ? "送达时间" : "Delivered at"}:{" "}
                            {pkg.delivery_time}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                {platformPaymentOrders.length === 0 && (
                  <div
                    style={{
                      gridColumn: "1 / -1",
                      textAlign: "center",
                      padding: "60px",
                    }}
                  >
                    <div style={{ fontSize: "3rem", marginBottom: "16px" }}>
                      Empty
                    </div>
                    <div
                      style={{
                        color: "#64748b",
                        fontSize: "1.1rem",
                      }}
                    >
                      {language === "zh"
                        ? "暂无余额支付订单记录"
                        : "No balance payment orders found"}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "20px 24px",
                borderTop: "1px solid #f1f5f9",
                textAlign: "right",
              }}
            >
              <button
                onClick={() => setShowPlatformPaymentModal(false)}
                style={{
                  background:
                    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                  border: "none",
                  color: "#05223b",
                  padding: "10px 24px",
                  borderRadius: "12px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  boxShadow: "0 8px 20px rgba(79, 172, 254, 0.3)",
                }}
              >
                {language === "zh" ? "确认" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="finance-record-form-title"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(5, 12, 28, 0.82)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1200,
            padding: isMobile ? "12px" : "24px",
          }}
          onClick={closeFinanceRecordForm}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 560,
              maxHeight: "min(92vh, 720px)",
              background:
                "#ffffff",
              borderRadius: 20,
              border: "1px solid #e2e8f0",
              boxShadow:
                "0 28px 60px rgba(0,0,0,0.45), 0 0 0 1px #f8fafc inset",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                flexShrink: 0,
                padding: "18px 20px 14px",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <h2
                  id="finance-record-form-title"
                  style={{
                    margin: 0,
                    color: "#0f172a",
                    fontSize: isMobile ? "1.2rem" : "1.35rem",
                    fontWeight: 800,
                    letterSpacing: "0.02em",
                  }}
                >
                  {editingRecord ? t.editRecord : t.addRecord}
                </h2>
                <p
                  style={{
                    margin: "8px 0 0",
                    color: "#64748b",
                    fontSize: "0.85rem",
                    lineHeight: 1.45,
                  }}
                >
                  {language === "zh"
                    ? "Esc 关闭 · 新建时焦点在金额"
                    : language === "my"
                      ? "Esc — ပိတ်ရန်"
                      : "Press Esc to close. Amount is focused for new records."}
                </p>
    </div>
              <button
                type="button"
                onClick={closeFinanceRecordForm}
                aria-label={t.cancel}
                style={{
                  flexShrink: 0,
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                  color: "#475569",
                  fontSize: "1.35rem",
                  lineHeight: 1,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleCreateOrUpdate}
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                minHeight: 0,
              }}
            >
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  WebkitOverflowScrolling: "touch",
                  padding: "16px 20px 12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    marginBottom: 18,
                  }}
                >
                  {(
                    [
                      { v: "income" as const, icon: "📈", label: t.income },
                      { v: "expense" as const, icon: "📉", label: t.expense },
                    ] as const
                  ).map(({ v, icon, label }) => {
                    const on = formData.record_type === v;
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, record_type: v }))
                        }
                        style={{
                          flex: 1,
                          padding: "14px 12px",
                          borderRadius: 14,
                          border: on
                            ? v === "income"
                              ? "2px solid rgba(52, 211, 153, 0.9)"
                              : "2px solid rgba(251, 113, 133, 0.95)"
                            : "1px solid #e2e8f0",
                          background: on
                            ? v === "income"
                              ? "rgba(16, 185, 129, 0.2)"
                              : "rgba(244, 63, 94, 0.18)"
                            : "#f8fafc",
                          color: "#0f172a",
                          fontWeight: 700,
                          fontSize: "0.95rem",
                          cursor: "pointer",
                          transition: "border 0.15s ease, background 0.15s ease",
                          boxShadow: on
                            ? v === "income"
                              ? "0 0 20px rgba(52,211,153,0.15)"
                              : "0 0 20px rgba(251,113,133,0.12)"
                            : "none",
                        }}
                      >
                        {icon} {label}
                      </button>
                    );
                  })}
                </div>

                {(() => {
                  const lab = {
                    display: "block" as const,
                    marginBottom: "6px",
                    color: "#0f172a",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                  };
                  const sel = {
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    background: "#ffffff",
                    color: "#0f172a",
                    fontSize: "0.95rem",
                  };
                  const inp = {
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    background: "#f1f5f9",
                    color: "#0f172a",
                    fontSize: "0.95rem",
                  };
                  const secTitle = (text: string) => (
                    <div
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase" as const,
                        color: "#64748b",
                        margin: "18px 0 10px",
                      }}
                    >
                      {text}
                    </div>
                  );
                  const mainSec =
                    language === "zh"
                      ? "主要信息"
                      : language === "my"
                        ? "အဓိက"
                        : "Main";
                  const linkSec =
                    language === "zh"
                      ? "关联（可选）"
                      : language === "my"
                        ? "ချိတ်ဆက်မှု"
                        : "Links (optional)";
                  const settleSec =
                    language === "zh"
                      ? "状态与支付"
                      : language === "my"
                        ? "အခြေအနေ နှင့် ပေးချေမှု"
                        : "Status & payment";
                  return (
                    <>
                      {secTitle(mainSec)}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: isMobile
                            ? "1fr"
                            : "1fr 1fr",
                          gap: 14,
                        }}
                      >
                        <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}>
                          <label style={lab}>{t.amount} *</label>
                          <input
                            ref={financeRecordAmountRef}
                            type="number"
                            inputMode="decimal"
                            value={formData.amount}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                amount: e.target.value,
                              }))
                            }
                            required
                            min="0"
                            step="0.01"
                            placeholder={
                              language === "zh" ? "如：5000" : "e.g. 5000"
                            }
                            style={{
                              ...inp,
                              fontSize: "1.2rem",
                              fontWeight: 700,
                              padding: "14px 16px",
                            }}
                          />
                        </div>
                        <div>
                          <label style={lab}>{t.currency}</label>
                          <select
                            value={formData.currency}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                currency: e.target.value,
                              }))
                            }
                            style={sel}
                          >
                            {currencyOptions.map((option) => (
                              <option
                                key={option}
                                value={option}
                                style={{ color: "#000" }}
                              >
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={lab}>{t.category} *</label>
                          <select
                            value={formData.category}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                category: e.target.value,
                              }))
                            }
                            required
                            style={sel}
                          >
                            {categoryOptions.map((option) => (
                              <option
                                key={option}
                                value={option}
                                style={{ color: "#000" }}
                              >
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}>
                          <label style={lab}>{t.recordDate} *</label>
                          <div
                            style={{
                              display: "flex",
                              gap: 10,
                              alignItems: "stretch",
                              flexWrap: "wrap",
                            }}
                          >
                            <input
                              type="date"
                              value={formData.record_date}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  record_date: e.target.value,
                                }))
                              }
                              required
                              style={{ ...inp, flex: "1 1 200px", minWidth: 0 }}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  record_date: getLocalDateYYYYMMDD(),
                                }))
                              }
                              style={{
                                padding: "0 16px",
                                borderRadius: 10,
                                border: "1px solid rgba(125, 211, 252, 0.45)",
                                background: "rgba(56, 189, 248, 0.12)",
                                color: "#1677ff",
                                fontWeight: 700,
                                fontSize: "0.88rem",
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {language === "zh"
                                ? "今日"
                                : language === "my"
                                  ? "ယနေ့"
                                  : "Today"}
                            </button>
                          </div>
                        </div>
                      </div>

                      {secTitle(linkSec)}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: isMobile
                            ? "1fr"
                            : "1fr 1fr",
                          gap: 14,
                        }}
                      >
                        <div>
                          <label style={lab}>
                            {t.orderId}{" "}
                            <span
                              style={{
                                fontWeight: 400,
                                opacity: 0.65,
                                fontSize: "0.78rem",
                              }}
                            >
                              (
                              {language === "zh"
                                ? "可选"
                                : language === "my"
                                  ? "မဖြစ်မနေမဟုတ်"
                                  : "Optional"}
                              )
                            </span>
                          </label>
                          <input
                            value={formData.order_id}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                order_id: e.target.value,
                              }))
                            }
                            placeholder={
                              language === "zh"
                                ? "如：MDY20250928121501"
                                : "e.g. MDY20250928121501"
                            }
                            style={inp}
                            autoComplete="off"
                          />
                        </div>
                        <div>
                          <label style={lab}>
                            {t.courierId}{" "}
                            <span
                              style={{
                                fontWeight: 400,
                                opacity: 0.65,
                                fontSize: "0.78rem",
                              }}
                            >
                              (
                              {language === "zh"
                                ? "可选"
                                : language === "my"
                                  ? "မဖြစ်မနေမဟုတ်"
                                  : "Optional"}
                              )
                            </span>
                          </label>
                          <input
                            value={formData.courier_id}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                courier_id: e.target.value,
                              }))
                            }
                            placeholder={
                              language === "zh" ? "如：COU001" : "e.g. COU001"
                            }
                            style={inp}
                            autoComplete="off"
                          />
                        </div>
                      </div>

                      {secTitle(settleSec)}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: isMobile
                            ? "1fr"
                            : "1fr 1fr",
                          gap: 14,
                        }}
                      >
                        <div>
                          <label style={lab}>{t.status}</label>
                          <select
                            value={formData.status}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                status: e.target
                                  .value as FinanceRecord["status"],
                              }))
                            }
                            style={sel}
                          >
                            <option value="pending" style={{ color: "#000" }}>
                              {t.pending}
                            </option>
                            <option value="completed" style={{ color: "#000" }}>
                              {t.completed}
                            </option>
                            <option value="cancelled" style={{ color: "#000" }}>
                              {t.cancelled}
                            </option>
                          </select>
                        </div>
                        <div>
                          <label style={lab}>{t.paymentMethod}</label>
                          <select
                            value={formData.payment_method}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                payment_method: e.target.value,
                              }))
                            }
                            style={sel}
                          >
                            {paymentOptions.map((option) => (
                              <option
                                key={option.value}
                                value={option.value}
                                style={{ color: "#000" }}
                              >
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}>
                          <label style={lab}>
                            {language === "zh"
                              ? "参考号 (可选)"
                              : language === "my"
                                ? "ကိုးကားချက်နံပါတ် (မဖြစ်မနေမဟုတ်)"
                                : "Reference (optional)"}
                          </label>
                          <input
                            value={formData.reference}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                reference: e.target.value,
                              }))
                            }
                            placeholder={t.refPlaceholder}
                            style={inp}
                            autoComplete="off"
                          />
                        </div>
                      </div>

                      <label
                        style={{
                          ...lab,
                          marginTop: 14,
                        }}
                      >
                        {t.notes}
                      </label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            notes: e.target.value,
                          }))
                        }
                        rows={3}
                        style={{
                          ...inp,
                          resize: "vertical" as const,
                          minHeight: 88,
                        }}
                      />
                    </>
                  );
                })()}
              </div>

              <div
                style={{
                  flexShrink: 0,
                  padding: "14px 20px 18px",
                  borderTop: "1px solid #f1f5f9",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 12,
                  background: "#f8fafc",
                }}
              >
                <button
                  type="button"
                  onClick={closeFinanceRecordForm}
                  style={{
                    padding: "12px 22px",
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    color: "#0f172a",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "0.95rem",
                  }}
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  style={{
                    padding: "12px 26px",
                    borderRadius: 12,
                    border: "none",
                    background: isProcessing
                      ? "rgba(59, 130, 246, 0.45)"
                      : "linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)",
                    color: "#fff",
                    fontWeight: 800,
                    cursor: isProcessing ? "not-allowed" : "pointer",
                    fontSize: "0.95rem",
                    boxShadow: isProcessing
                      ? "none"
                      : "0 10px 28px rgba(37, 99, 235, 0.35)",
                    opacity: isProcessing ? 0.75 : 1,
                  }}
                >
                  {isProcessing
                    ? t.loading
                    : editingRecord
                      ? t.saveChanges
                      : t.createRecord}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </FinanceWorkspaceProvider>
  );
};

export default FinanceManagement;
