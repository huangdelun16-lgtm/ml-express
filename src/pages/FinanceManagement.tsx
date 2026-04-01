import React, { useEffect, useMemo, useState } from "react";
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
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";

const REGIONS = [
  { id: "mandalay", name: "曼德勒", prefix: "MDY" },
  { id: "maymyo", name: "彬乌伦", prefix: "POL" },
  { id: "yangon", name: "仰光", prefix: "YGN" },
  { id: "naypyidaw", name: "内比都", prefix: "NPW" },
  { id: "taunggyi", name: "东枝", prefix: "TGI" },
  { id: "lashio", name: "腊戌", prefix: "LSO" },
  { id: "muse", name: "木姐", prefix: "MUSE" },
];

const getDateKey = (value?: string): string => {
  if (!value) return "";
  const match = value.match(/\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

type TabKey =
  | "overview"
  | "records"
  | "analytics"
  | "package_records"
  | "courier_records"
  | "cash_collection"
  | "merchants_collection";
type FilterStatus = "all" | FinanceRecord["status"];
type FilterType = "all" | FinanceRecord["record_type"];

interface FinanceForm {
  id?: string;
  record_type: FinanceRecord["record_type"];
  category: string;
  order_id: string;
  courier_id: string;
  amount: string;
  currency: string;
  status: FinanceRecord["status"];
  payment_method: string;
  reference: string;
  record_date: string;
  notes: string;
}

const defaultForm: FinanceForm = {
  record_type: "income",
  category: "同城配送",
  order_id: "",
  courier_id: "",
  amount: "",
  currency: "MMK",
  status: "pending",
  payment_method: "cash",
  reference: "",
  record_date: new Date().toISOString().slice(0, 10),
  notes: "",
};

const currencyOptions = ["MMK", "USD", "THB", "RMB"];
const paymentOptions = [
  { value: "cash", label: "现金" },
  { value: "kbz_pay", label: "KBZ Pay" },
  { value: "wave_pay", label: "Wave Pay" },
  { value: "aya_pay", label: "AYA Pay" },
  { value: "uab_pay", label: "UAB Pay" },
  { value: "alipay", label: "支付宝" },
  { value: "bank_transfer", label: "银行转账" },
];

const getCategoryOptions = (language: string) => {
  if (language === "my") {
    return [
      "မြို့တွင်း ပို့ဆောင်မှု",
      "နောက်နေ့ ပို့ဆောင်မှု",
      "ပို့ဆောင်သူ ကော်မရှင်",
      "ဝန်ထမ်း လစာ",
      "လုပ်ငန်းလည်ပတ်မှု အသုံးစရိတ်",
      "ယာဉ် ထိန်းသိမ်းမှု",
      "စျေးကွက် မြှင့်တင်ရေး",
      "ဝယ်ယူသူ ငွေပြန်အမ်းမှု",
      "အခြား ဝင်ငွေ",
      "အခြား အသုံးစရိတ်",
    ];
  }
  return [
    "同城配送",
    "次日配送",
    "快递员佣金",
    "员工工资",
    "运营支出",
    "车辆维护",
    "营销推广",
    "客户退款",
    "其他收入",
    "其他支出",
  ];
};

const statusColors: Record<FinanceRecord["status"], string> = {
  pending: "#f39c12",
  completed: "#27ae60",
  cancelled: "#e74c3c",
};

const typeColors: Record<FinanceRecord["record_type"], string> = {
  income: "#2ecc71",
  expense: "#e74c3c",
};

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

  // 领区识别逻辑更新：确保 MDY 和 POL 彻底分开
  const getDetectedRegion = () => {
    const userUpper = currentUser.toUpperCase();
    if (currentUserRegion === "yangon" || userUpper.startsWith("YGN"))
      return "YGN";
    if (currentUserRegion === "maymyo" || userUpper.startsWith("POL"))
      return "POL";
    if (currentUserRegion === "mandalay" || userUpper.startsWith("MDY"))
      return "MDY";
    return "";
  };

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
    new Date().toISOString().split("T")[0],
  );
  const [cashSettlementStatus, setCashSettlementStatus] = useState<
    "unsettled" | "settled" | "all"
  >("unsettled");
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [packages, setPackages] = useState<Package[]>([]); // 添加包裹数据状态
  const [loading, setLoading] = useState<boolean>(true);
  const [timePeriod, setTimePeriod] = useState<
    "7days" | "30days" | "90days" | "all"
  >("30days"); // 时间周期状态
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
  const [showPendingOrdersModal, setShowPendingOrdersModal] =
    useState<boolean>(false);
  const [modalOrders, setModalOrders] = useState<Package[]>([]);
  const [
    merchantCollectionCustomerFilter,
    setMerchantCollectionCustomerFilter,
  ] = useState<string>("all");
  const [merchantCollectionRegionFilter, setMerchantCollectionRegionFilter] =
    useState<string>("all");
  const [merchantRegionFilter, setMerchantRegionFilter] =
    useState<string>("all");
  const [modalTitle, setModalTitle] = useState<string>("");

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

    // 1. 先通过前缀快速识别 (MDY, YGN, POL)
    const userUpper = createdBy.toUpperCase();
    if (userUpper.startsWith("YGN")) return "YGN";
    if (userUpper.startsWith("POL")) return "POL";
    if (userUpper.startsWith("MDY")) return "MDY";

    // 2. 如果前缀识别不到，从账号列表中查找该用户的 region 字段
    // 确保 adminAccounts 已经加载
    if (adminAccounts && adminAccounts.length > 0) {
      const account = adminAccounts.find(
        (acc) =>
          (acc.username &&
            acc.username.toLowerCase() === createdBy.toLowerCase()) ||
          (acc.id && acc.id.toLowerCase() === createdBy.toLowerCase()),
      );

      if (account) {
        // 如果账号角色是超级管理员，也显示万能
        if (
          account.role === "admin" &&
          account.username.toLowerCase() === "admin"
        ) {
          return t.universal;
        }

        if (account.region) {
          const r = account.region.toLowerCase();
          if (r === "mandalay" || r === "mdy") return "MDY";
          if (r === "yangon" || r === "ygn") return "YGN";
          if (r === "maymyo" || r === "pol") return "POL";
          return account.region.toUpperCase();
        }
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

  // 根据时间周期获取天数
  const getDaysFromPeriod = (period: typeof timePeriod): number | null => {
    switch (period) {
      case "7days":
        return 7;
      case "30days":
        return 30;
      case "90days":
        return 90;
      case "all":
        return null;
      default:
        return 30;
    }
  };

  // 根据时间周期筛选数据
  const filterByTimePeriod = <
    T extends {
      record_date?: string;
      created_at?: string;
      create_time?: string;
    },
  >(
    data: T[],
    period: typeof timePeriod,
    dateField: "record_date" | "created_at" | "create_time" = "record_date",
  ): T[] => {
    const days = getDaysFromPeriod(period);
    if (days === null) return data;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return data.filter((item) => {
      const dateStr = item[dateField];
      if (!dateStr) {
        // 对于包裹，尝试其他日期字段
        if ("created_at" in item && item.created_at) {
          const date = new Date(item.created_at);
          return date >= cutoffDate;
        }
        if ("create_time" in item && item.create_time) {
          const date = new Date(item.create_time);
          return date >= cutoffDate;
        }
        return false;
      }
      const date = new Date(dateStr);
      return date >= cutoffDate;
    });
  };

  // 获取当前周期的显示文本
  const getPeriodLabel = (): string => {
    switch (timePeriod) {
      case "7days":
        return t.last7Days;
      case "30days":
        return t.last30Days;
      case "90days":
        return t.last90Days;
      case "all":
        return t.all;
      default:
        return t.last30Days;
    }
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
  const [pricingSettings, setPricingSettings] = useState<Record<string, any>>({
    courier_km_rate: 500,
  });
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    netProfit: 0,
    pendingPayments: 0,
    packageIncome: 0, // 添加包裹收入
    packageIncomeCash: 0, // 包裹现金跑腿费收入
    packageIncomeBalance: 0, // 包裹余额跑腿费收入
    packageCount: 0, // 添加包裹数量
    courierKmCost: 0, // 快递员公里费用（仅送货距离）
    totalKm: 0, // 总送货公里数
    merchantsCollection: 0, // 总合伙商家代收款
    totalPlatformPayment: 0, // 总平台支付 (余额支付)
    totalStartingFee: 0, // 总订单起步费
    monthlyRiderFee: 0, // 骑手当月收入总额
    monthlyRiderCount: 0, // 骑手当月收入笔数
    dailyRiderFee: 0, // 骑手当日收入总额
    dailyRiderCount: 0, // 骑手当日收入笔数
  });

  const getPlatformPaymentAmount = (description?: string): number => {
    if (!description) return 0;
    const payMatch = description.match(
      /\[(?:付给商家|Pay to Merchant|ဆိုင်သို့ ပေးချေရန်|骑手代付|Courier Advance Pay|ကောင်ရီယာမှ ကြိုတင်ပေးချေခြင်း|平台支付|Platform Payment|ပလက်ဖောင်းမှ ပေးချေခြင်း): (.*?) MMK\]/,
    );
    if (!payMatch || !payMatch[1]) return 0;
    return parseFloat(payMatch[1].replace(/[^\d.]/g, "") || "0");
  };

  const isMerchantPackage = (pkg: Package): boolean => {
    const isStoreMatch = deliveryStores.some(
      (store) =>
        store.store_name === pkg.sender_name ||
        (pkg.sender_name && pkg.sender_name.startsWith(store.store_name)),
    );
    return !!pkg.delivery_store_id || isStoreMatch;
  };

  const getStoreRegionPrefix = (store?: {
    store_code?: string | null;
  }): string => {
    if (!store?.store_code) return "";
    const match = store.store_code.match(/^[A-Z]+/i);
    return match ? match[0].toUpperCase() : "";
  };

  useEffect(() => {
    loadRecords();
    loadPricingSettings();
  }, []);

  const loadPricingSettings = async () => {
    const settings = await systemSettingsService.getPricingSettings();
    setPricingSettings(settings);
  };

  useEffect(() => {
    const calculateSummary = () => {
      const totalIncome = records
        .filter((r) => r.record_type === "income")
        .reduce((sum, record) => sum + (record.amount || 0), 0);
      const totalExpense = records
        .filter((r) => r.record_type === "expense")
        .reduce((sum, record) => sum + (record.amount || 0), 0);
      const netProfit = totalIncome - totalExpense;
      const pendingPayments = packages
        .filter((pkg) => {
          if (pkg.payment_method !== "cash") return false;
          if (pkg.status !== "已送达" && pkg.status !== "已完成") return false;
          if (pkg.rider_settled) return false;
          const dateKey = getDateKey(
            pkg.delivery_time ||
              pkg.updated_at ||
              pkg.created_at ||
              pkg.create_time,
          );
          return Boolean(dateKey && dateKey === cashCollectionDate);
        })
        .reduce((sum, pkg) => {
          const price = parseFloat(pkg.price?.replace(/[^\d.]/g, "") || "0");
          const codAmount = isMerchantPackage(pkg)
            ? Number(pkg.cod_amount || 0)
            : 0;
          return sum + price + codAmount;
        }, 0);

      // 计算订单收入（统计已送达且已结清的包裹）
      const deliveredPackages = packages.filter(
        (pkg) => pkg.status === "已送达",
      );

      let packageIncome = 0;
      let packageIncomeCash = 0;
      let packageIncomeBalance = 0;
      let settledPackageCount = 0;
      let totalPlatformPayment = 0;
      let merchantCodTotal = 0;
      let merchantPlatformPaymentTotal = 0;

      deliveredPackages.forEach((pkg) => {
        // 🚀 累加平台支付金额
        const platformAmount = getPlatformPaymentAmount(pkg.description);
        if (platformAmount > 0) {
          totalPlatformPayment += platformAmount;
        }

        if (isMerchantPackage(pkg)) {
          if (Number(pkg.cod_amount || 0) > 0) {
            merchantCodTotal += Number(pkg.cod_amount || 0);
          }
          if (platformAmount > 0) {
            merchantPlatformPaymentTotal += platformAmount;
          }
        }

        const price = parseFloat(pkg.price?.replace(/[^\d.]/g, "") || "0");

        // 如果是现金支付，必须已结清才计入收入
        if (pkg.payment_method === "cash") {
          if (!pkg.rider_settled) {
            return;
          }
          packageIncomeCash += price;
        } else {
          packageIncomeBalance += price;
        }

        packageIncome += price;
        settledPackageCount++;
      });

      const packageCount = settledPackageCount;

      // 计算快递员送货费用 (跑腿费 - 起步价)
      const BASE_FEE = pricingSettings.base_fee || 1500;
      const courierKmCost = deliveredPackages.reduce((sum, pkg) => {
        const pkgPrice = parseFloat(pkg.price?.replace(/[^\d.]/g, "") || "0");
        const riderFee = Math.max(0, pkgPrice - BASE_FEE);
        return sum + riderFee;
      }, 0);

      const totalKm = deliveredPackages.reduce((sum, pkg) => {
        return sum + (pkg.delivery_distance || 0);
      }, 0);

      // 总合伙商家代收款 = 已送达 + 骑手已结清 + 商家未结清
      const merchantsCollection = packages.reduce((sum, pkg) => {
        if (!isMerchantPackage(pkg)) return sum;
        if (pkg.status !== "已送达" && pkg.status !== "已完成") return sum;
        const codAmount = Number(pkg.cod_amount || 0);
        if (!pkg.rider_settled || pkg.cod_settled) return sum;
        return sum + codAmount;
      }, 0);

      // 计算总订单起步费 (所有已送达订单 * 起步价)
      const totalStartingFee = deliveredPackages.length * BASE_FEE;

      // 🚀 新增：计算当月和当日骑手收入统计
      const now_current = new Date();
      const currentMonthKey = `${now_current.getFullYear()}-${String(now_current.getMonth() + 1).padStart(2, "0")}`;

      let monthlyRiderFee = 0;
      let monthlyRiderCount = 0;
      let dailyRiderFee = 0;
      let dailyRiderCount = 0;

      deliveredPackages.forEach((pkg) => {
        const pkgPrice = parseFloat(pkg.price?.replace(/[^\d.]/g, "") || "0");
        const riderShare = Math.max(0, pkgPrice - BASE_FEE);
        const dateKey = getDateKey(
          pkg.delivery_time || pkg.updated_at || pkg.created_at,
        );

        // 当月统计
        if (dateKey && dateKey.startsWith(currentMonthKey)) {
          monthlyRiderFee += riderShare;
          monthlyRiderCount++;
        }

        // 当日统计 (基于 cashCollectionDate)
        if (dateKey && dateKey === cashCollectionDate) {
          dailyRiderFee += riderShare;
          dailyRiderCount++;
        }
      });

      setSummary({
        totalIncome,
        totalExpense,
        netProfit,
        pendingPayments,
        packageIncome,
        packageIncomeCash,
        packageIncomeBalance,
        packageCount,
        courierKmCost,
        totalKm,
        merchantsCollection,
        totalPlatformPayment,
        totalStartingFee,
        monthlyRiderFee,
        monthlyRiderCount,
        dailyRiderFee,
        dailyRiderCount,
      });
    };

    calculateSummary();
  }, [records, packages, deliveryStores, cashCollectionDate]);

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
          const platformAmount = getPlatformPaymentAmount(pkg.description);
          return (
            isStorePkg &&
            (pkg.status === "已送达" || pkg.status === "已完成") &&
            (Number(pkg.cod_amount || 0) > 0 || platformAmount > 0)
          );
        });

        // 3. 计算金额和订单数
        // 待结清金额 = 商家COD(需骑手已结清) + 余额支付(不依赖骑手结清)
        const unclearedPackages = storePackages.filter((pkg) => {
          const platformAmount = getPlatformPaymentAmount(pkg.description);
          return (
            !pkg.cod_settled &&
            (Number(pkg.cod_amount || 0) > 0 || platformAmount > 0)
          );
        });
        const unclearedAmount = unclearedPackages.reduce((sum, pkg) => {
          const platformAmount = getPlatformPaymentAmount(pkg.description);
          const codAmount = Number(pkg.cod_amount || 0);
          const pendingCod = codAmount > 0 && pkg.rider_settled ? codAmount : 0;
          return sum + pendingCod + platformAmount;
        }, 0);

        // 今年代收款统计 = 累计已结清金额(COD + 余额支付)
        const settledPackages = storePackages.filter((pkg) => pkg.cod_settled);
        const totalAmount = settledPackages.reduce((sum, pkg) => {
          const platformAmount = getPlatformPaymentAmount(pkg.description);
          return sum + Number(pkg.cod_amount || 0) + platformAmount;
        }, 0);

        // 计算最后结清日期
        const settledPackagesWithTime = storePackages.filter(
          (pkg) => pkg.cod_settled && pkg.cod_settled_at,
        );
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
          unclearedAmount,
          unclearedCount: unclearedPackages.length,
          lastSettledAt,
        };
      })
      .sort((a, b) => b.unclearedAmount - a.unclearedAmount);
  }, [deliveryStores, packages, isRegionalUser, currentRegionPrefix]);

  const getMerchantFilterKey = (pkg: Package): string => {
    const store =
      deliveryStores.find((item) => item.id === pkg.delivery_store_id) ||
      deliveryStores.find(
        (item) =>
          item.store_name === pkg.sender_name ||
          (pkg.sender_name && pkg.sender_name.startsWith(item.store_name)),
      );
    const storeName = store?.store_name || pkg.sender_name || "未知";
    const storeCode = store?.store_code ? store.store_code : "";
    return `${storeName}||${storeCode}`;
  };

  const merchantCustomerOptions = useMemo(() => {
    const keys = modalOrders.map((pkg) => getMerchantFilterKey(pkg));
    return Array.from(new Set(keys)).sort();
  }, [modalOrders]);

  const filteredMerchantOrders = useMemo(() => {
    return modalOrders.filter((pkg) => {
      const matchCustomer =
        merchantCollectionCustomerFilter === "all" ||
        getMerchantFilterKey(pkg) === merchantCollectionCustomerFilter;
      const matchRegion =
        merchantCollectionRegionFilter === "all" ||
        pkg.id.startsWith(merchantCollectionRegionFilter);
      return matchCustomer && matchRegion;
    });
  }, [
    modalOrders,
    merchantCollectionCustomerFilter,
    merchantCollectionRegionFilter,
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
      const result = await packageService.settleMerchantCOD(storeId, storeName);
      if (result.success) {
        window.alert("结清成功！");
        loadRecords(); // 刷新数据
      } else {
        throw result.error;
      }
    } catch (error) {
      console.error("结清失败:", error);
      window.alert("结清失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const loadRecords = async () => {
    try {
      setLoading(true);
      // 同时加载财务记录、包裹数据、工资数据、账号数据、快递员数据和合伙店铺数据
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
      setRecords(financeData);
      setPackages(packageData);
      setCourierSalaries(salaryData);
      setAdminAccounts(accountsData);

      // 🔄 同步逻辑：以账号系统为准，过滤并合并快递员数据
      // 只有职位为 "骑手" 或 "骑手队长" 的账号才会出现在财务收款列表中
      const riderAccounts = accountsData.filter(
        (acc) => acc.position === "骑手" || acc.position === "骑手队长",
      );

      const realTimeData = couriersData.data || [];
      const combinedCouriers = riderAccounts.map((acc) => {
        // 通过手机号或员工编号匹配快递员实时数据（如配送量、评分等）
        const rtInfo = realTimeData.find(
          (c) => c.phone === acc.phone || c.employee_id === acc.employee_id,
        );

        return {
          ...rtInfo,
          id: acc.id || rtInfo?.id || "",
          name: acc.employee_name,
          phone: acc.phone,
          employee_id: acc.employee_id,
          region: acc.region,
          status: acc.status,
          vehicle_type:
            rtInfo?.vehicle_type ||
            (acc.position === "骑手队长" ? "car" : "motorcycle"),
          total_deliveries: rtInfo?.total_deliveries || 0,
          rating: rtInfo?.rating || 5.0,
          last_active: rtInfo?.last_active || "从未上线",
          join_date:
            acc.hire_date ||
            (acc.created_at
              ? new Date(acc.created_at).toLocaleDateString("zh-CN")
              : "未知"),
        };
      });

      setCouriers(combinedCouriers);
      setDeliveryStores(storesData);
    } catch (error) {
      console.error("加载财务数据失败:", error);
      // 添加用户友好的错误提示
      window.alert("加载财务数据失败，请刷新页面重试");
    } finally {
      setLoading(false);
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

      // 获取所有已送达包裹
      const deliveredPackages = packages.filter(
        (pkg) =>
          pkg.status === "已送达" && pkg.courier && pkg.courier !== "待分配",
      );

      // 按骑手分组
      const courierGroups: Record<string, Package[]> = {};
      deliveredPackages.forEach((pkg) => {
        const courierId = pkg.courier;
        if (!courierGroups[courierId]) {
          courierGroups[courierId] = [];
        }
        courierGroups[courierId].push(pkg);
      });

      setCourierSalaryGroups(courierGroups);
      // 默认全选
      setSelectedCouriersForSalary(new Set(Object.keys(courierGroups)));
      setShowSalarySelectionModal(true);
    } catch (error) {
      console.error("获取骑手分组失败:", error);
      window.alert("获取骑手分组失败，请重试！");
    } finally {
      setLoading(false);
    }
  };

  // 生成选定骑手的本月工资
  const generateMonthlySalaries = async () => {
    if (selectedCouriersForSalary.size === 0) {
      window.alert("请至少选择一位骑手");
      return;
    }

    if (
      !window.confirm(
        `确定要为选中的 ${selectedCouriersForSalary.size} 位骑手生成本月工资记录吗？`,
      )
    )
      return;

    setLoading(true);
    setShowSalarySelectionModal(false);
    try {
      // 结算周期
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .split("T")[0];

      // 为每个选中的骑手生成工资记录
      let successCount = 0;
      let createdCount = 0;
      let updatedCount = 0;

      for (const courierId of Array.from(selectedCouriersForSalary)) {
        const pkgs = courierSalaryGroups[courierId];
        if (!pkgs) continue;

        // 计算统计数据
        const totalDeliveries = pkgs.length;
        const totalKm = pkgs.reduce(
          (sum, pkg) => sum + (pkg.delivery_distance || 0),
          0,
        );
        const relatedPackageIds = pkgs.map((p) => p.id);

        // 计算公里提成 (现在改为: 总跑腿费 - 起步价)
        const BASE_FEE = pricingSettings.base_fee || 1500;
        const kmFee = pkgs.reduce((sum, pkg) => {
          const pkgPrice = parseFloat(pkg.price?.replace(/[^\d.]/g, "") || "0");
          return sum + Math.max(0, pkgPrice - BASE_FEE);
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

        const deliveryBonusRate = pricingSettings.delivery_bonus_rate || 0;
        const deliveryBonus = totalDeliveries * deliveryBonusRate;

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

      window.alert(message);
      await loadRecords();
    } catch (error) {
      console.error("生成工资失败:", error);
      window.alert("生成工资失败，请重试！");
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

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || Number.isNaN(Number(formData.amount))) {
      window.alert("请填写有效的金额");
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
        resetForm();
        setShowForm(false);
      } else {
        window.alert("保存失败，请检查日志");
      }
    } catch (error) {
      console.error("保存财务记录失败:", error);
      window.alert("保存失败，请稍后重试");
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

  // 新增：处理合伙代收款卡片点击
  const handleMerchantCollectionClick = (storeName?: string) => {
    setMerchantCollectionCustomerFilter("all");
    setMerchantCollectionRegionFilter("all");
    // 找出所有已送达/已完成且有代收款的合伙店铺未结清订单
    const codOrders = packages
      .filter((pkg) => {
        // 如果指定了店铺名，只看该店铺的
        if (
          storeName &&
          pkg.sender_name !== storeName &&
          !pkg.sender_name?.startsWith(storeName)
        ) {
          return false;
        }
        const platformAmount = getPlatformPaymentAmount(pkg.description);
        // 只要是合伙商家订单且已送达/已完成，且包含 COD 或平台支付，并且未结清
        return (
          isMerchantPackage(pkg) &&
          (pkg.status === "已送达" || pkg.status === "已完成") &&
          !pkg.cod_settled &&
          (Number(pkg.cod_amount || 0) > 0 || platformAmount > 0)
        );
      })
      .sort((a, b) => {
        const dateA = a.delivery_time ? new Date(a.delivery_time).getTime() : 0;
        const dateB = b.delivery_time ? new Date(b.delivery_time).getTime() : 0;
        return dateB - dateA; // 最近的在前面
      });

    setModalOrders(codOrders);
    setModalTitle(
      storeName ? `${storeName} - 代收款订单明细` : "代收款订单明细",
    );
    setShowMerchantSettledModal(true);
  };

  // 新增：处理待结清金额卡片点击
  const handlePendingPaymentsClick = (storeName?: string) => {
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
      const platformAmount = getPlatformPaymentAmount(pkg.description);
      const codAmount = Number(pkg.cod_amount || 0);
      const pendingCod = codAmount > 0 && pkg.rider_settled;
      const pendingPlatform = platformAmount > 0;
      return pendingCod || pendingPlatform;
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
        window.alert("删除失败，请检查日志");
      }
    } catch (error) {
      console.error("删除失败:", error);
      window.alert("删除失败，请稍后重试");
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
        background: "rgba(255, 255, 255, 0.12)",
        borderRadius: "16px",
        padding: "24px",
        border: "1px solid rgba(255, 255, 255, 0.25)",
        boxShadow: "0 10px 30px rgba(10, 31, 68, 0.35)",
        position: "relative",
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.3s ease",
      }}
      onMouseOver={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = "translateY(-5px)";
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.18)";
        }
      }}
      onMouseOut={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
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
          color: "rgba(255, 255, 255, 0.9)",
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
          color: "rgba(255, 255, 255, 0.65)",
          fontSize: "0.9rem",
          margin: 0,
        }}
      >
        {description}
      </div>
    </div>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #091540 0%, #1a365d 35%, #2c5282 70%, #3a77ad 100%)",
        padding: "24px",
        fontFamily: "Segoe UI, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          color: "white",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "32px",
            gap: isMobile ? "12px" : "16px",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "2.4rem",
                margin: 0,
                letterSpacing: "1px",
                textShadow: "0 8px 20px rgba(3, 27, 78, 0.55)",
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
                    color: "white",
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
            <p
              style={{
                margin: "8px 0 0 0",
                color: "rgba(255, 255, 255, 0.75)",
              }}
            >
              {t.subtitle}
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={loadRecords}
              disabled={loading}
              style={{
                background: loading
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(255, 255, 255, 0.12)",
                color: "white",
                border: "1px solid rgba(255, 255, 255, 0.35)",
                padding: "12px 24px",
                borderRadius: "12px",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "1rem",
                transition: "all 0.3s ease",
                backdropFilter: "blur(10px)",
                opacity: loading ? 0.6 : 1,
              }}
              onMouseOver={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                  e.currentTarget.style.transform = "translateY(-3px)";
                }
              }}
              onMouseOut={(e) => {
                if (!loading) {
                  e.currentTarget.style.background =
                    "rgba(255, 255, 255, 0.12)";
                  e.currentTarget.style.transform = "translateY(0)";
                }
              }}
            >
              {loading ? "🔄 " + t.loadingData : "🔄 " + t.refreshData}
            </button>
            <button
              onClick={() => navigate("/admin/dashboard")}
              style={{
                background: "rgba(255, 255, 255, 0.12)",
                color: "white",
                border: "1px solid rgba(255, 255, 255, 0.35)",
                padding: "12px 24px",
                borderRadius: "12px",
                cursor: "pointer",
                fontSize: "1rem",
                transition: "all 0.3s ease",
                backdropFilter: "blur(10px)",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                e.currentTarget.style.transform = "translateY(-3px)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
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
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  background:
                    activeTab === key
                      ? "rgba(255, 255, 255, 0.22)"
                      : "rgba(255, 255, 255, 0.12)",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "1rem",
                  transition: "all 0.3s ease",
                }}
              >
                {key === "overview" && t.financeOverview}
                {key === "records" && t.financialRecords}
                {key === "analytics" && t.dataAnalysis}
                {key === "package_records" && t.packageFinanceRecords}
                {key === "courier_records" && t.courierFinanceRecords}
                {key === "cash_collection" && t.dailyCollection}
                {key === "merchants_collection" && t.merchantsCollection}
              </button>
            ))}
          {(activeTab === "records" || activeTab === "package_records") && (
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
                // 默认类别设为其他收入/支出
                setFormData((prev) => ({ ...prev, category: "其他收入" }));
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
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
              gap: "18px",
            }}
          >
            {/* 排列规则：1排3张卡片 - 严格执行用户要求的顺序 */}

            {/* 第一排：核心财务状况 */}
            {renderSummaryCard(
              t.totalIncome,
              summary.totalIncome,
              t.totalIncomeDesc,
              "#4cd137",
            )}
            {renderSummaryCard(
              t.totalExpense,
              summary.totalExpense,
              t.totalExpenseDesc,
              "#ff7979",
            )}
            {renderSummaryCard(
              t.netProfit,
              summary.netProfit,
              t.netProfitDesc,
              summary.netProfit >= 0 ? "#00cec9" : "#ff7675",
            )}

            {/* 第二排：收支明细与代收 */}
            {renderSummaryCard(
              language === "my"
                ? "စုစုပေါင်း ပလက်ဖောင်းမှပေးချေမှု"
                : "总平台支付 (余额支付)",
              summary.totalPlatformPayment,
              language === "my"
                ? "လက်ကျန်ငွေဖြင့် ပေးချေခြင်း"
                : "所有订单的余额支付汇总",
              "#3b82f6",
              () => handlePlatformPaymentClick(),
            )}
            {renderSummaryCard(
              t.pendingPayments,
              summary.pendingPayments,
              t.pendingAmountDesc,
              "#fbc531",
              () => handleMerchantCollectionClick(),
            )}
            {renderSummaryCard(
              t.totalMerchantCollection,
              summary.merchantsCollection,
              t.merchantsCollectionDesc,
              "#ef4444",
              () => handlePendingPaymentsClick(),
            )}

            {/* 第三排：成本与分成 */}
            {renderSummaryCard(
              t.totalStartingFee,
              summary.totalStartingFee,
              t.totalStartingFeeDesc,
              "#a29bfe",
            )}
            {renderSummaryCard(
              t.courierKmCost,
              summary.courierKmCost,
              `${language === "zh" ? "骑手分得总额 (总跑腿费 - 总起步价)" : "Total rider share (Delivery fee - Base fee)"} (起步价: ${pricingSettings.base_fee || 1500} MMK)`,
              "#fd79a8",
            )}
            {renderSummaryCard(
              t.orderIncome,
              summary.packageIncome,
              <>
                <div>
                  现金支付：{summary.packageIncomeCash.toLocaleString()} MMK
                </div>
                <div>
                  余额支付：{summary.packageIncomeBalance.toLocaleString()}{" "}
                  MMK（{summary.packageCount} {t.packageSuffix}）
                </div>
              </>,
              "#6c5ce7",
            )}
          </div>
        )}

        {activeTab === "records" && (
          <div
            style={{
              background: "rgba(255, 255, 255, 0.12)",
              borderRadius: "20px",
              padding: "24px",
              border: "1px solid rgba(255, 255, 255, 0.18)",
              boxShadow: "0 12px 35px rgba(7, 23, 55, 0.45)",
            }}
          >
            {/* Filters */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(auto-fit, minmax(200px, 1fr))",
                gap: isMobile ? "12px" : "16px",
                marginBottom: "24px",
              }}
            >
              <input
                placeholder={t.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: "12px 16px",
                  borderRadius: "12px",
                  border: "none",
                  background: "rgba(255, 255, 255, 0.18)",
                  color: "white",
                }}
              />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as FilterType)}
                style={{
                  padding: "12px 16px",
                  borderRadius: "12px",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  background: "rgba(7, 23, 53, 0.65)",
                  color: "white",
                }}
              >
                <option value="all" style={{ color: "#000" }}>
                  {t.allTypes}
                </option>
                <option value="income" style={{ color: "#000" }}>
                  {t.income}
                </option>
                <option value="expense" style={{ color: "#000" }}>
                  {t.expense}
                </option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(e.target.value as FilterStatus)
                }
                style={{
                  padding: "12px 16px",
                  borderRadius: "12px",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  background: "rgba(7, 23, 53, 0.65)",
                  color: "white",
                }}
              >
                <option value="all" style={{ color: "#000" }}>
                  {t.allStatus}
                </option>
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
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) =>
                    setDateRange((prev) => ({ ...prev, start: e.target.value }))
                  }
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    borderRadius: "12px",
                    border: "none",
                    background: "rgba(255, 255, 255, 0.18)",
                    color: "white",
                  }}
                />
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) =>
                    setDateRange((prev) => ({ ...prev, end: e.target.value }))
                  }
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    borderRadius: "12px",
                    border: "none",
                    background: "rgba(255, 255, 255, 0.18)",
                    color: "white",
                  }}
                />
              </div>
            </div>

            {/* Form */}
            {showForm && (
              <div
                style={{
                  marginBottom: "24px",
                  padding: "24px",
                  background: "rgba(8, 27, 48, 0.72)",
                  borderRadius: "16px",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  position: "relative",
                  zIndex: 10,
                }}
              >
                <button
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  style={{
                    position: "absolute",
                    top: "16px",
                    right: "16px",
                    background: "transparent",
                    border: "none",
                    color: "rgba(255, 255, 255, 0.6)",
                    fontSize: "1.5rem",
                    cursor: "pointer",
                  }}
                >
                  ×
                </button>
                <h3 style={{ marginTop: 0, color: "white" }}>
                  {editingRecord ? t.editRecord : t.addRecord}
                </h3>
                <form onSubmit={handleCreateOrUpdate}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile
                        ? "1fr"
                        : "repeat(auto-fit, minmax(260px, 1fr))",
                      gap: isMobile ? "12px" : "16px",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "6px",
                          color: "rgba(255, 255, 255, 0.8)",
                        }}
                      >
                        {t.incomeType}
                      </label>
                      <select
                        value={formData.record_type}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            record_type: e.target
                              .value as FinanceRecord["record_type"],
                          }))
                        }
                        required
                        style={{
                          width: "100%",
                          padding: "12px",
                          borderRadius: "10px",
                          border: "1px solid rgba(255, 255, 255, 0.25)",
                          background: "rgba(7, 23, 53, 0.65)",
                          color: "white",
                        }}
                      >
                        <option value="income" style={{ color: "#000" }}>
                          {t.income}
                        </option>
                        <option value="expense" style={{ color: "#000" }}>
                          {t.expense}
                        </option>
                      </select>
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "6px",
                          color: "rgba(255, 255, 255, 0.8)",
                        }}
                      >
                        {t.category}
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            category: e.target.value,
                          }))
                        }
                        required
                        style={{
                          width: "100%",
                          padding: "12px",
                          borderRadius: "10px",
                          border: "1px solid rgba(255, 255, 255, 0.25)",
                          background: "rgba(7, 23, 53, 0.65)",
                          color: "white",
                        }}
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
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "6px",
                          color: "rgba(255, 255, 255, 0.8)",
                        }}
                      >
                        {t.orderId} (
                        {language === "zh"
                          ? "可选"
                          : language === "my"
                            ? "မဖြစ်မနေမဟုတ်"
                            : "Optional"}
                        )
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
                        style={{
                          width: "100%",
                          padding: "12px",
                          borderRadius: "10px",
                          border: "none",
                          background: "rgba(255, 255, 255, 0.18)",
                          color: "white",
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "6px",
                          color: "rgba(255, 255, 255, 0.8)",
                        }}
                      >
                        {t.courierId} (
                        {language === "zh"
                          ? "可选"
                          : language === "my"
                            ? "မဖြစ်မနေမဟုတ်"
                            : "Optional"}
                        )
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
                        style={{
                          width: "100%",
                          padding: "12px",
                          borderRadius: "10px",
                          border: "none",
                          background: "rgba(255, 255, 255, 0.18)",
                          color: "white",
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "6px",
                          color: "rgba(255, 255, 255, 0.8)",
                        }}
                      >
                        {t.amount}
                      </label>
                      <input
                        type="number"
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
                          width: "100%",
                          padding: "12px",
                          borderRadius: "10px",
                          border: "none",
                          background: "rgba(255, 255, 255, 0.18)",
                          color: "white",
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "6px",
                          color: "rgba(255, 255, 255, 0.8)",
                        }}
                      >
                        {t.currency}
                      </label>
                      <select
                        value={formData.currency}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            currency: e.target.value,
                          }))
                        }
                        style={{
                          width: "100%",
                          padding: "12px",
                          borderRadius: "10px",
                          border: "1px solid rgba(255, 255, 255, 0.25)",
                          background: "rgba(7, 23, 53, 0.65)",
                          color: "white",
                        }}
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
                      <label
                        style={{
                          display: "block",
                          marginBottom: "6px",
                          color: "rgba(255, 255, 255, 0.8)",
                        }}
                      >
                        {t.status}
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            status: e.target.value as FinanceRecord["status"],
                          }))
                        }
                        style={{
                          width: "100%",
                          padding: "12px",
                          borderRadius: "10px",
                          border: "1px solid rgba(255, 255, 255, 0.25)",
                          background: "rgba(7, 23, 53, 0.65)",
                          color: "white",
                        }}
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
                      <label
                        style={{
                          display: "block",
                          marginBottom: "6px",
                          color: "rgba(255, 255, 255, 0.8)",
                        }}
                      >
                        {t.paymentMethod}
                      </label>
                      <select
                        value={formData.payment_method}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            payment_method: e.target.value,
                          }))
                        }
                        style={{
                          width: "100%",
                          padding: "12px",
                          borderRadius: "10px",
                          border: "1px solid rgba(255, 255, 255, 0.25)",
                          background: "rgba(7, 23, 53, 0.65)",
                          color: "white",
                        }}
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
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "6px",
                          color: "rgba(255, 255, 255, 0.8)",
                        }}
                      >
                        {language === "zh"
                          ? "参考号 (可选)"
                          : language === "my"
                            ? "ကိုးကားချက်နံပါတ် (မဖြစ်မနေမဟုတ်)"
                            : "Reference (Optional)"}
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
                        style={{
                          width: "100%",
                          padding: "12px",
                          borderRadius: "10px",
                          border: "none",
                          background: "rgba(255, 255, 255, 0.18)",
                          color: "white",
                        }}
                      />
                    </div>
                    <div>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "6px",
                          color: "rgba(255, 255, 255, 0.8)",
                        }}
                      >
                        {t.recordDate}
                      </label>
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
                        style={{
                          width: "100%",
                          padding: "12px",
                          borderRadius: "10px",
                          border: "none",
                          background: "rgba(255, 255, 255, 0.18)",
                          color: "white",
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: "16px" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "6px",
                        color: "rgba(255, 255, 255, 0.8)",
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
                        width: "100%",
                        padding: "12px",
                        borderRadius: "10px",
                        border: "none",
                        background: "rgba(255, 255, 255, 0.18)",
                        color: "white",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      gap: isMobile ? "12px" : "16px",
                      marginTop: "24px",
                    }}
                  >
                    <button
                      type="submit"
                      disabled={isProcessing}
                      style={{
                        padding: "12px 28px",
                        borderRadius: "12px",
                        border: "none",
                        background:
                          "linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)",
                        color: "#031937",
                        fontWeight: 700,
                        cursor: "pointer",
                        boxShadow: "0 12px 25px rgba(0, 210, 255, 0.35)",
                        opacity: isProcessing ? 0.7 : 1,
                      }}
                    >
                      {isProcessing
                        ? t.loading
                        : editingRecord
                          ? t.saveChanges
                          : t.createRecord}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        resetForm();
                      }}
                      style={{
                        padding: "12px 28px",
                        borderRadius: "12px",
                        border: "1px solid rgba(255, 255, 255, 0.3)",
                        background: "rgba(255, 255, 255, 0.12)",
                        color: "white",
                        cursor: "pointer",
                      }}
                    >
                      {t.cancel}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Records Table - Reverted to standard table for reliability */}
            <div
              style={{
                overflowX: "auto",
                background: "rgba(8, 32, 64, 0.4)",
                borderRadius: "12px",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  color: "white",
                  minWidth: "1200px",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "rgba(8, 32, 64, 0.8)",
                      borderBottom: "2px solid rgba(255, 255, 255, 0.1)",
                    }}
                  >
                    {[
                      t.recordId,
                      t.type,
                      t.category,
                      t.amount,
                      t.currency,
                      t.status,
                      t.orderCourier,
                      t.date,
                      t.workRegion,
                      t.notes,
                      t.actions,
                    ].map((header) => (
                      <th
                        key={header}
                        style={{
                          padding: "14px",
                          textAlign: "left",
                          fontWeight: 600,
                          fontSize: "0.95rem",
                        }}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={11}
                        style={{ textAlign: "center", padding: "48px" }}
                      >
                        <div
                          className="spinner"
                          style={{ marginBottom: "16px" }}
                        ></div>
                        {t.loadingData}
                      </td>
                    </tr>
                  ) : filteredRecords.length === 0 ? (
                    <tr>
                      <td
                        colSpan={11}
                        style={{ textAlign: "center", padding: "80px 24px" }}
                      >
                        <div
                          style={{
                            fontSize: "3rem",
                            marginBottom: "16px",
                            opacity: 0.5,
                          }}
                        >
                          📝
                        </div>
                        <div
                          style={{
                            color: "rgba(255, 255, 255, 0.7)",
                            fontSize: "1.2rem",
                            fontWeight: 500,
                          }}
                        >
                          {t.noRecords}
                        </div>
                        {currentUserRole !== "admin" && (
                          <div
                            style={{
                              color: "rgba(255, 255, 255, 0.4)",
                              fontSize: "1rem",
                              marginTop: "12px",
                            }}
                          >
                            {t.financeAuthOnly}
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((record, index) => (
                      <tr
                        key={record.id}
                        style={{
                          borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
                          background:
                            index % 2 === 0
                              ? "rgba(255, 255, 255, 0.02)"
                              : "transparent",
                        }}
                      >
                        <td style={{ padding: "14px", fontSize: "0.85rem" }}>
                          {record.id}
                        </td>
                        <td style={{ padding: "14px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 8px",
                              borderRadius: "999px",
                              background: `${typeColors[record.record_type]}22`,
                              color: typeColors[record.record_type],
                              fontWeight: 600,
                              fontSize: "0.8rem",
                            }}
                          >
                            {record.record_type === "income"
                              ? t.income
                              : t.expense}
                          </span>
                        </td>
                        <td style={{ padding: "14px", fontSize: "0.9rem" }}>
                          {record.category}
                        </td>
                        <td
                          style={{
                            padding: "14px",
                            color:
                              record.record_type === "income"
                                ? "#4cd137"
                                : "#ff7979",
                            fontWeight: 600,
                          }}
                        >
                          {record.amount?.toLocaleString()}
                        </td>
                        <td style={{ padding: "14px", fontSize: "0.9rem" }}>
                          {record.currency}
                        </td>
                        <td style={{ padding: "14px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 8px",
                              borderRadius: "999px",
                              background: `${statusColors[record.status]}22`,
                              color: statusColors[record.status],
                              fontWeight: 600,
                              fontSize: "0.8rem",
                            }}
                          >
                            {record.status === "pending"
                              ? t.pending
                              : record.status === "completed"
                                ? t.completed
                                : t.cancelled}
                          </span>
                        </td>
                        <td style={{ padding: "14px" }}>
                          <div
                            style={{
                              fontSize: "0.85rem",
                              color: "rgba(255, 255, 255, 0.9)",
                            }}
                          >
                            {t.orderId}: {record.order_id || "—"}
                          </div>
                          <div
                            style={{
                              fontSize: "0.8rem",
                              color: "rgba(255, 255, 255, 0.6)",
                            }}
                          >
                            {t.courierId}: {record.courier_id || "—"}
                          </div>
                        </td>
                        <td style={{ padding: "14px", fontSize: "0.85rem" }}>
                          {record.record_date}
                        </td>
                        <td style={{ padding: "14px" }}>
                          <div
                            style={{
                              background:
                                getRecordRegion(record.created_by) === "—"
                                  ? "rgba(255, 255, 255, 0.05)"
                                  : "#48bb78",
                              color: "white",
                              padding: "4px 10px",
                              borderRadius: "8px",
                              fontSize: "0.85rem",
                              fontWeight: "bold",
                              display: "inline-block",
                              minWidth: "45px",
                              textAlign: "center",
                              boxShadow:
                                getRecordRegion(record.created_by) === "—"
                                  ? "none"
                                  : "0 2px 6px rgba(0,0,0,0.2)",
                            }}
                          >
                            {getRecordRegion(record.created_by)}
                          </div>
                        </td>
                        <td style={{ padding: "14px", maxWidth: "300px" }}>
                          <div
                            style={{
                              fontSize: "0.85rem",
                              color: "rgba(255, 255, 255, 0.75)",
                            }}
                          >
                            {record.notes || "—"}
                          </div>
                          {record.reference && (
                            <div
                              style={{
                                fontSize: "0.75rem",
                                color: "rgba(255, 255, 255, 0.4)",
                              }}
                            >
                              {language === "my" ? "ကိုးကား" : "参考"}:{" "}
                              {record.reference}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "14px" }}>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              onClick={() => handleEditRecord(record)}
                              style={{
                                padding: "6px 12px",
                                borderRadius: "10px",
                                border: "none",
                                background: "rgba(76, 209, 55, 0.2)",
                                color: "#4cd137",
                                cursor: "pointer",
                                fontSize: "0.85rem",
                              }}
                            >
                              {t.edit}
                            </button>
                            <button
                              onClick={() => handleDeleteRecord(record.id)}
                              style={{
                                padding: "6px 12px",
                                borderRadius: "10px",
                                border: "none",
                                background: "rgba(255, 71, 87, 0.2)",
                                color: "#ff4757",
                                cursor: "pointer",
                                fontSize: "0.85rem",
                              }}
                            >
                              {t.delete}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "analytics" && (
          <div>
            <h3
              style={{
                marginTop: 0,
                marginBottom: "24px",
                color: "white",
                fontSize: "1.8rem",
              }}
            >
              📈 {t.dataAnalysis}
            </h3>

            {/* 时间范围选择 */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.12)",
                borderRadius: "16px",
                padding: isMobile ? "12px" : "20px",
                marginBottom: "24px",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                display: "flex",
                gap: isMobile ? "12px" : "16px",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{ color: "white", fontWeight: "600", fontSize: "1rem" }}
              >
                📅 {t.analysisPeriod}：
              </div>
              {[
                { key: "7days", label: t.last7Days },
                { key: "30days", label: t.last30Days },
                { key: "90days", label: t.last90Days },
                { key: "all", label: t.all },
              ].map((period) => (
                <button
                  key={period.key}
                  onClick={() => setTimePeriod(period.key as typeof timePeriod)}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "10px",
                    border: `2px solid ${timePeriod === period.key ? "#4facfe" : "rgba(255, 255, 255, 0.3)"}`,
                    background:
                      timePeriod === period.key
                        ? "rgba(79, 172, 254, 0.3)"
                        : "rgba(255, 255, 255, 0.15)",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    fontWeight: timePeriod === period.key ? "700" : "500",
                    transition: "all 0.3s ease",
                    boxShadow:
                      timePeriod === period.key
                        ? "0 4px 15px rgba(79, 172, 254, 0.4)"
                        : "none",
                  }}
                  onMouseOver={(e) => {
                    if (timePeriod !== period.key) {
                      e.currentTarget.style.background =
                        "rgba(255, 255, 255, 0.25)";
                    }
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseOut={(e) => {
                    if (timePeriod !== period.key) {
                      e.currentTarget.style.background =
                        "rgba(255, 255, 255, 0.15)";
                    }
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  {period.label}
                </button>
              ))}
            </div>

            {/* 关键指标卡片 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "18px",
                marginBottom: "24px",
              }}
            >
              {(() => {
                // 根据选择的时间周期筛选数据
                const recentRecords = filterByTimePeriod(
                  records,
                  timePeriod,
                  "record_date",
                );
                const recentPackages = filterByTimePeriod(packages, timePeriod);

                // 获取天数用于日均计算
                const days =
                  getDaysFromPeriod(timePeriod) || Math.max(records.length, 1);

                const recentIncome = recentRecords
                  .filter((r) => r.record_type === "income")
                  .reduce((sum, r) => sum + (r.amount || 0), 0);
                const recentExpense = recentRecords
                  .filter((r) => r.record_type === "expense")
                  .reduce((sum, r) => sum + (r.amount || 0), 0);
                const recentPackageIncome = recentPackages
                  .filter((pkg) => pkg.status === "已送达")
                  .reduce((sum, pkg) => {
                    const price = parseFloat(
                      pkg.price?.replace(/[^\d.]/g, "") || "0",
                    );
                    return sum + price;
                  }, 0);
                const recentPackageCount = recentPackages.filter(
                  (pkg) => pkg.status === "已送达",
                ).length;

                // 计算增长率（与总数据对比）
                const totalIncome = records
                  .filter((r) => r.record_type === "income")
                  .reduce((sum, r) => sum + (r.amount || 0), 0);
                const avgDailyIncome =
                  totalIncome / Math.max(records.length, 1);
                const recentAvgDailyIncome = recentIncome / days;
                const incomeGrowth =
                  avgDailyIncome > 0
                    ? ((recentAvgDailyIncome - avgDailyIncome) /
                        avgDailyIncome) *
                      100
                    : 0;

                return (
                  <>
                    <div
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(46, 213, 115, 0.2) 0%, rgba(46, 213, 115, 0.05) 100%)",
                        borderRadius: "16px",
                        padding: "24px",
                        border: "1px solid rgba(46, 213, 115, 0.3)",
                        boxShadow: "0 8px 20px rgba(46, 213, 115, 0.2)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: "12px",
                        }}
                      >
                        <div
                          style={{
                            color: "rgba(255, 255, 255, 0.9)",
                            fontSize: "0.95rem",
                            fontWeight: "500",
                          }}
                        >
                          💰 {getPeriodLabel()}
                          {t.recentIncome}
                        </div>
                        <div
                          style={{
                            padding: "4px 10px",
                            borderRadius: "12px",
                            background:
                              incomeGrowth >= 0
                                ? "rgba(46, 213, 115, 0.3)"
                                : "rgba(255, 107, 107, 0.3)",
                            color: incomeGrowth >= 0 ? "#2ecc71" : "#ff6b6b",
                            fontSize: "0.85rem",
                            fontWeight: "600",
                          }}
                        >
                          {incomeGrowth >= 0 ? "↗" : "↘"}{" "}
                          {Math.abs(incomeGrowth).toFixed(1)}%
                        </div>
                      </div>
                      <div
                        style={{
                          color: "#2ecc71",
                          fontSize: isMobile ? "1.5rem" : "2rem",
                          fontWeight: "700",
                          marginBottom: "8px",
                        }}
                      >
                        {recentIncome.toLocaleString()} MMK
                      </div>
                      <div
                        style={{
                          color: "rgba(255, 255, 255, 0.65)",
                          fontSize: "0.85rem",
                        }}
                      >
                        {t.dailyAvg}: {(recentIncome / days).toLocaleString()}{" "}
                        MMK
                      </div>
                    </div>

                    <div
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(255, 107, 107, 0.2) 0%, rgba(255, 107, 107, 0.05) 100%)",
                        borderRadius: "16px",
                        padding: "24px",
                        border: "1px solid rgba(255, 107, 107, 0.3)",
                        boxShadow: "0 8px 20px rgba(255, 107, 107, 0.2)",
                      }}
                    >
                      <div
                        style={{
                          color: "rgba(255, 255, 255, 0.9)",
                          fontSize: "0.95rem",
                          fontWeight: "500",
                          marginBottom: "12px",
                        }}
                      >
                        💸 {getPeriodLabel()}
                        {t.recentExpense}
                      </div>
                      <div
                        style={{
                          color: "#ff6b6b",
                          fontSize: isMobile ? "1.5rem" : "2rem",
                          fontWeight: "700",
                          marginBottom: "8px",
                        }}
                      >
                        {recentExpense.toLocaleString()} MMK
                      </div>
                      <div
                        style={{
                          color: "rgba(255, 255, 255, 0.65)",
                          fontSize: "0.85rem",
                        }}
                      >
                        {t.dailyAvg}: {(recentExpense / days).toLocaleString()}{" "}
                        MMK
                      </div>
                    </div>

                    <div
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(108, 92, 231, 0.2) 0%, rgba(108, 92, 231, 0.05) 100%)",
                        borderRadius: "16px",
                        padding: "24px",
                        border: "1px solid rgba(108, 92, 231, 0.3)",
                        boxShadow: "0 8px 20px rgba(108, 92, 231, 0.2)",
                      }}
                    >
                      <div
                        style={{
                          color: "rgba(255, 255, 255, 0.9)",
                          fontSize: "0.95rem",
                          fontWeight: "500",
                          marginBottom: "12px",
                        }}
                      >
                        📦 {getPeriodLabel()}
                        {t.recentPackages}
                      </div>
                      <div
                        style={{
                          color: "#6c5ce7",
                          fontSize: isMobile ? "1.5rem" : "2rem",
                          fontWeight: "700",
                          marginBottom: "8px",
                        }}
                      >
                        {recentPackageCount}{" "}
                        {language === "zh"
                          ? "个"
                          : language === "en"
                            ? ""
                            : "ခု"}
                      </div>
                      <div
                        style={{
                          color: "rgba(255, 255, 255, 0.65)",
                          fontSize: "0.85rem",
                        }}
                      >
                        {t.income}: {recentPackageIncome.toLocaleString()} MMK
                      </div>
                    </div>

                    <div
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(0, 206, 201, 0.2) 0%, rgba(0, 206, 201, 0.05) 100%)",
                        borderRadius: "16px",
                        padding: "24px",
                        border: "1px solid rgba(0, 206, 201, 0.3)",
                        boxShadow: "0 8px 20px rgba(0, 206, 201, 0.2)",
                      }}
                    >
                      <div
                        style={{
                          color: "rgba(255, 255, 255, 0.9)",
                          fontSize: "0.95rem",
                          fontWeight: "500",
                          marginBottom: "12px",
                        }}
                      >
                        💎 {getPeriodLabel()}
                        {t.recentProfit}
                      </div>
                      <div
                        style={{
                          color:
                            recentIncome - recentExpense >= 0
                              ? "#00cec9"
                              : "#ff6b6b",
                          fontSize: isMobile ? "1.5rem" : "2rem",
                          fontWeight: "700",
                          marginBottom: "8px",
                        }}
                      >
                        {(recentIncome - recentExpense).toLocaleString()} MMK
                      </div>
                      <div
                        style={{
                          color: "rgba(255, 255, 255, 0.65)",
                          fontSize: "0.85rem",
                        }}
                      >
                        {t.profitMargin}:{" "}
                        {recentIncome > 0
                          ? (
                              ((recentIncome - recentExpense) / recentIncome) *
                              100
                            ).toFixed(1)
                          : 0}
                        %
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* 月度趋势分析 */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.12)",
                borderRadius: "20px",
                padding: "24px",
                marginBottom: "24px",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                boxShadow: "0 12px 35px rgba(7, 23, 55, 0.45)",
              }}
            >
              <h4
                style={{
                  marginTop: 0,
                  color: "white",
                  marginBottom: "20px",
                  fontSize: "1.3rem",
                }}
              >
                📊 月度收支趋势
              </h4>

              {(() => {
                // 按月份分组统计
                const monthlyData: Record<
                  string,
                  {
                    income: number;
                    expense: number;
                    packageIncome: number;
                    packageCount: number;
                    courierKm: number;
                  }
                > = {};

                // 处理财务记录
                records.forEach((record) => {
                  const date = new Date(record.record_date);
                  const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

                  if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = {
                      income: 0,
                      expense: 0,
                      packageIncome: 0,
                      packageCount: 0,
                      courierKm: 0,
                    };
                  }

                  if (record.record_type === "income") {
                    monthlyData[monthKey].income += record.amount || 0;
                  } else {
                    monthlyData[monthKey].expense += record.amount || 0;
                  }
                });

                // 处理包裹数据
                packages.forEach((pkg) => {
                  const dateStr = pkg.created_at || pkg.create_time;
                  if (!dateStr) return;

                  const date = new Date(dateStr);
                  const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

                  if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = {
                      income: 0,
                      expense: 0,
                      packageIncome: 0,
                      packageCount: 0,
                      courierKm: 0,
                    };
                  }

                  if (pkg.status === "已送达") {
                    const price = parseFloat(
                      pkg.price?.replace(/[^\d.]/g, "") || "0",
                    );
                    monthlyData[monthKey].packageIncome += price;
                    monthlyData[monthKey].packageCount += 1;
                    monthlyData[monthKey].courierKm +=
                      pkg.delivery_distance || 0;
                  }
                });

                // 排序并获取最近6个月
                const sortedMonths = Object.keys(monthlyData).sort().slice(-6);

                if (sortedMonths.length === 0) {
                  return (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "40px",
                        color: "rgba(255, 255, 255, 0.6)",
                      }}
                    >
                      暂无月度数据
                    </div>
                  );
                }

                // 准备图表数据
                const chartData = sortedMonths.map((month) => {
                  const data = monthlyData[month];
                  return {
                    month: `${month.split("-")[0]}年${month.split("-")[1]}月`,
                    monthShort: `${month.split("-")[1]}月`,
                    income: data.income,
                    expense: data.expense,
                    profit: data.income - data.expense,
                    packageIncome: data.packageIncome,
                    packageCount: data.packageCount,
                  };
                });

                return (
                  <div>
                    {/* 组合图表：柱状图 + 折线图 */}
                    <div style={{ marginBottom: "32px" }}>
                      <h5
                        style={{
                          color: "rgba(255, 255, 255, 0.9)",
                          marginBottom: "16px",
                          fontSize: "1.1rem",
                        }}
                      >
                        📊 收支对比（柱状图 + 利润趋势）
                      </h5>
                      <ResponsiveContainer width="100%" height={350}>
                        <ComposedChart
                          data={chartData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255, 255, 255, 0.1)"
                          />
                          <XAxis
                            dataKey="monthShort"
                            stroke="rgba(255, 255, 255, 0.7)"
                            style={{ fontSize: "12px" }}
                          />
                          <YAxis
                            stroke="rgba(255, 255, 255, 0.7)"
                            style={{ fontSize: "12px" }}
                            tickFormatter={(value) =>
                              `${(value / 1000).toFixed(0)}K`
                            }
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "rgba(15, 23, 42, 0.95)",
                              border: "1px solid rgba(255, 255, 255, 0.2)",
                              borderRadius: "8px",
                              color: "white",
                            }}
                            formatter={(value: number) =>
                              `${value.toLocaleString()} MMK`
                            }
                          />
                          <Legend
                            wrapperStyle={{
                              color: "rgba(255, 255, 255, 0.9)",
                              paddingTop: "20px",
                            }}
                          />
                          <Bar
                            dataKey="income"
                            fill="#2ecc71"
                            name="收入"
                            radius={[8, 8, 0, 0]}
                          />
                          <Bar
                            dataKey="expense"
                            fill="#e74c3c"
                            name="支出"
                            radius={[8, 8, 0, 0]}
                          />
                          <Line
                            type="monotone"
                            dataKey="profit"
                            stroke="#00cec9"
                            strokeWidth={3}
                            name="利润"
                            dot={{ fill: "#00cec9", r: 5 }}
                            activeDot={{ r: 7 }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>

                    {/* 收入趋势折线图 */}
                    <div style={{ marginBottom: "32px" }}>
                      <h5
                        style={{
                          color: "rgba(255, 255, 255, 0.9)",
                          marginBottom: "16px",
                          fontSize: "1.1rem",
                        }}
                      >
                        📈 收入趋势（折线图）
                      </h5>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart
                          data={chartData}
                          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient
                              id="colorIncome"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#2ecc71"
                                stopOpacity={0.8}
                              />
                              <stop
                                offset="95%"
                                stopColor="#2ecc71"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255, 255, 255, 0.1)"
                          />
                          <XAxis
                            dataKey="monthShort"
                            stroke="rgba(255, 255, 255, 0.7)"
                            style={{ fontSize: "12px" }}
                          />
                          <YAxis
                            stroke="rgba(255, 255, 255, 0.7)"
                            style={{ fontSize: "12px" }}
                            tickFormatter={(value) =>
                              `${(value / 1000).toFixed(0)}K`
                            }
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "rgba(15, 23, 42, 0.95)",
                              border: "1px solid rgba(255, 255, 255, 0.2)",
                              borderRadius: "8px",
                              color: "white",
                            }}
                            formatter={(value: number) =>
                              `${value.toLocaleString()} MMK`
                            }
                          />
                          <Area
                            type="monotone"
                            dataKey="income"
                            stroke="#2ecc71"
                            fillOpacity={1}
                            fill="url(#colorIncome)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    {/* 支出趋势折线图 */}
                    <div style={{ marginBottom: "32px" }}>
                      <h5
                        style={{
                          color: "rgba(255, 255, 255, 0.9)",
                          marginBottom: "16px",
                          fontSize: "1.1rem",
                        }}
                      >
                        📉 支出趋势（折线图）
                      </h5>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart
                          data={chartData}
                          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient
                              id="colorExpense"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#e74c3c"
                                stopOpacity={0.8}
                              />
                              <stop
                                offset="95%"
                                stopColor="#e74c3c"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255, 255, 255, 0.1)"
                          />
                          <XAxis
                            dataKey="monthShort"
                            stroke="rgba(255, 255, 255, 0.7)"
                            style={{ fontSize: "12px" }}
                          />
                          <YAxis
                            stroke="rgba(255, 255, 255, 0.7)"
                            style={{ fontSize: "12px" }}
                            tickFormatter={(value) =>
                              `${(value / 1000).toFixed(0)}K`
                            }
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "rgba(15, 23, 42, 0.95)",
                              border: "1px solid rgba(255, 255, 255, 0.2)",
                              borderRadius: "8px",
                              color: "white",
                            }}
                            formatter={(value: number) =>
                              `${value.toLocaleString()} MMK`
                            }
                          />
                          <Area
                            type="monotone"
                            dataKey="expense"
                            stroke="#e74c3c"
                            fillOpacity={1}
                            fill="url(#colorExpense)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    {/* 每日收支趋势（最近30天） */}
                    {(() => {
                      // 按日期统计最近30天的数据
                      const dailyData: Record<
                        string,
                        { income: number; expense: number; profit: number }
                      > = {};
                      const days = 30;
                      const today = new Date();

                      // 初始化最近30天的数据
                      for (let i = days - 1; i >= 0; i--) {
                        const date = new Date(today);
                        date.setDate(date.getDate() - i);
                        const dateKey = date.toISOString().slice(0, 10);
                        dailyData[dateKey] = {
                          income: 0,
                          expense: 0,
                          profit: 0,
                        };
                      }

                      // 统计财务记录
                      const recentRecords = filterByTimePeriod(
                        records,
                        "30days",
                        "record_date",
                      );
                      recentRecords.forEach((record) => {
                        const dateKey = record.record_date;
                        if (dailyData[dateKey]) {
                          if (record.record_type === "income") {
                            dailyData[dateKey].income += record.amount || 0;
                          } else {
                            dailyData[dateKey].expense += record.amount || 0;
                          }
                          dailyData[dateKey].profit =
                            dailyData[dateKey].income -
                            dailyData[dateKey].expense;
                        }
                      });

                      const dailyChartData = Object.entries(dailyData)
                        .map(([date, data]) => ({
                          date: new Date(date).toLocaleDateString("zh-CN", {
                            month: "short",
                            day: "numeric",
                          }),
                          dateFull: date,
                          income: data.income,
                          expense: data.expense,
                          profit: data.profit,
                        }))
                        .sort((a, b) => a.dateFull.localeCompare(b.dateFull));

                      return (
                        <div style={{ marginBottom: "32px" }}>
                          <h5
                            style={{
                              color: "rgba(255, 255, 255, 0.9)",
                              marginBottom: "16px",
                              fontSize: "1.1rem",
                            }}
                          >
                            📅 每日收支趋势（最近30天）
                          </h5>
                          <ResponsiveContainer width="100%" height={350}>
                            <LineChart
                              data={dailyChartData}
                              margin={{
                                top: 10,
                                right: 30,
                                left: 0,
                                bottom: 5,
                              }}
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="rgba(255, 255, 255, 0.1)"
                              />
                              <XAxis
                                dataKey="date"
                                stroke="rgba(255, 255, 255, 0.7)"
                                style={{ fontSize: "11px" }}
                                angle={-45}
                                textAnchor="end"
                                height={80}
                              />
                              <YAxis
                                stroke="rgba(255, 255, 255, 0.7)"
                                style={{ fontSize: "12px" }}
                                tickFormatter={(value) =>
                                  `${(value / 1000).toFixed(0)}K`
                                }
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "rgba(15, 23, 42, 0.95)",
                                  border: "1px solid rgba(255, 255, 255, 0.2)",
                                  borderRadius: "8px",
                                  color: "white",
                                }}
                                formatter={(value: number) =>
                                  `${value.toLocaleString()} MMK`
                                }
                              />
                              <Legend
                                wrapperStyle={{
                                  color: "rgba(255, 255, 255, 0.9)",
                                  paddingTop: "20px",
                                }}
                              />
                              <Line
                                type="monotone"
                                dataKey="income"
                                stroke="#2ecc71"
                                strokeWidth={2}
                                name="收入"
                                dot={{ fill: "#2ecc71", r: 3 }}
                                activeDot={{ r: 5 }}
                              />
                              <Line
                                type="monotone"
                                dataKey="expense"
                                stroke="#e74c3c"
                                strokeWidth={2}
                                name="支出"
                                dot={{ fill: "#e74c3c", r: 3 }}
                                activeDot={{ r: 5 }}
                              />
                              <Line
                                type="monotone"
                                dataKey="profit"
                                stroke="#00cec9"
                                strokeWidth={2}
                                name="利润"
                                strokeDasharray="5 5"
                                dot={{ fill: "#00cec9", r: 3 }}
                                activeDot={{ r: 5 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      );
                    })()}

                    {/* 月度详细数据表格 */}
                    <div
                      style={{
                        background: "rgba(255, 255, 255, 0.05)",
                        borderRadius: "12px",
                        overflow: "hidden",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                      }}
                    >
                      <table
                        style={{ width: "100%", borderCollapse: "collapse" }}
                      >
                        <thead>
                          <tr
                            style={{ background: "rgba(255, 255, 255, 0.1)" }}
                          >
                            <th
                              style={{
                                padding: "12px",
                                textAlign: "left",
                                color: "white",
                                fontSize: "0.9rem",
                              }}
                            >
                              月份
                            </th>
                            <th
                              style={{
                                padding: "12px",
                                textAlign: "right",
                                color: "white",
                                fontSize: "0.9rem",
                              }}
                            >
                              收入
                            </th>
                            <th
                              style={{
                                padding: "12px",
                                textAlign: "right",
                                color: "white",
                                fontSize: "0.9rem",
                              }}
                            >
                              支出
                            </th>
                            <th
                              style={{
                                padding: "12px",
                                textAlign: "right",
                                color: "white",
                                fontSize: "0.9rem",
                              }}
                            >
                              利润
                            </th>
                            <th
                              style={{
                                padding: "12px",
                                textAlign: "right",
                                color: "white",
                                fontSize: "0.9rem",
                              }}
                            >
                              包裹数
                            </th>
                            <th
                              style={{
                                padding: "12px",
                                textAlign: "right",
                                color: "white",
                                fontSize: "0.9rem",
                              }}
                            >
                              包裹收入
                            </th>
                            <th
                              style={{
                                padding: "12px",
                                textAlign: "right",
                                color: "white",
                                fontSize: "0.9rem",
                              }}
                            >
                              配送距离
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedMonths.map((month) => {
                            const data = monthlyData[month];
                            const profit = data.income - data.expense;

                            return (
                              <tr
                                key={month}
                                style={{
                                  borderBottom:
                                    "1px solid rgba(255, 255, 255, 0.1)",
                                }}
                              >
                                <td
                                  style={{
                                    padding: "12px",
                                    color: "white",
                                    fontSize: "0.9rem",
                                    fontWeight: "600",
                                  }}
                                >
                                  {month}
                                </td>
                                <td
                                  style={{
                                    padding: "12px",
                                    textAlign: "right",
                                    color: "#2ecc71",
                                    fontSize: "0.9rem",
                                    fontWeight: "600",
                                  }}
                                >
                                  {data.income.toLocaleString()}
                                </td>
                                <td
                                  style={{
                                    padding: "12px",
                                    textAlign: "right",
                                    color: "#e74c3c",
                                    fontSize: "0.9rem",
                                    fontWeight: "600",
                                  }}
                                >
                                  {data.expense.toLocaleString()}
                                </td>
                                <td
                                  style={{
                                    padding: "12px",
                                    textAlign: "right",
                                    color: profit >= 0 ? "#00cec9" : "#ff6b6b",
                                    fontSize: "0.9rem",
                                    fontWeight: "600",
                                  }}
                                >
                                  {profit.toLocaleString()}
                                </td>
                                <td
                                  style={{
                                    padding: "12px",
                                    textAlign: "right",
                                    color: "rgba(255, 255, 255, 0.8)",
                                    fontSize: "0.9rem",
                                  }}
                                >
                                  {data.packageCount} 个
                                </td>
                                <td
                                  style={{
                                    padding: "12px",
                                    textAlign: "right",
                                    color: "#6c5ce7",
                                    fontSize: "0.9rem",
                                    fontWeight: "600",
                                  }}
                                >
                                  {data.packageIncome.toLocaleString()}
                                </td>
                                <td
                                  style={{
                                    padding: "12px",
                                    textAlign: "right",
                                    color: "#fd79a8",
                                    fontSize: "0.9rem",
                                    fontWeight: "600",
                                  }}
                                >
                                  {data.courierKm.toFixed(2)} KM
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* 业务分析 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(auto-fit, minmax(350px, 1fr))",
                gap: isMobile ? "12px" : "20px",
              }}
            >
              {/* 包裹类型分布 - 饼图 */}
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.12)",
                  borderRadius: "16px",
                  padding: "24px",
                  border: "1px solid rgba(255, 255, 255, 0.18)",
                }}
              >
                <h4
                  style={{ marginTop: 0, color: "white", marginBottom: "16px" }}
                >
                  📦 包裹类型分布
                </h4>
                {(() => {
                  const typeStats: Record<string, number> = {};
                  packages
                    .filter((pkg) => pkg.status === "已送达")
                    .forEach((pkg) => {
                      const type = pkg.package_type || "未知";
                      typeStats[type] = (typeStats[type] || 0) + 1;
                    });

                  const total = Object.values(typeStats).reduce(
                    (sum, count) => sum + count,
                    0,
                  );

                  if (total === 0) {
                    return (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "40px",
                          color: "rgba(255, 255, 255, 0.6)",
                        }}
                      >
                        暂无包裹数据
                      </div>
                    );
                  }

                  // 准备饼图数据
                  const pieColors = [
                    "#6c5ce7",
                    "#a29bfe",
                    "#fd79a8",
                    "#fdcb6e",
                    "#55efc4",
                    "#74b9ff",
                    "#0984e3",
                    "#00b894",
                  ];
                  const pieData = Object.entries(typeStats)
                    .map(([name, value], index) => ({
                      name,
                      value,
                      percentage: ((value / total) * 100).toFixed(1),
                    }))
                    .sort((a, b) => b.value - a.value);

                  return (
                    <div>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }: any) =>
                              `${name}: ${(percent * 100).toFixed(0)}%`
                            }
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={pieColors[index % pieColors.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "rgba(15, 23, 42, 0.95)",
                              border: "1px solid rgba(255, 255, 255, 0.2)",
                              borderRadius: "8px",
                              color: "white",
                            }}
                            formatter={(value: number) => `${value} 个`}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div
                        style={{
                          marginTop: "16px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        {pieData.map((item, index) => (
                          <div
                            key={item.name}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <div
                              style={{
                                width: "12px",
                                height: "12px",
                                borderRadius: "3px",
                                background: pieColors[index % pieColors.length],
                              }}
                            />
                            <span
                              style={{
                                color: "rgba(255, 255, 255, 0.9)",
                                fontSize: "0.85rem",
                                flex: 1,
                              }}
                            >
                              {item.name}
                            </span>
                            <span
                              style={{
                                color: "rgba(255, 255, 255, 0.7)",
                                fontSize: "0.85rem",
                              }}
                            >
                              {item.value}个 ({item.percentage}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 收入分类分布 - 饼图 */}
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.12)",
                  borderRadius: "16px",
                  padding: "24px",
                  border: "1px solid rgba(255, 255, 255, 0.18)",
                }}
              >
                <h4
                  style={{ marginTop: 0, color: "white", marginBottom: "16px" }}
                >
                  💰 收入分类分布
                </h4>
                {(() => {
                  const recentRecords = filterByTimePeriod(
                    records,
                    timePeriod,
                    "record_date",
                  );
                  const incomeStats: Record<string, number> = {};

                  recentRecords
                    .filter((r) => r.record_type === "income")
                    .forEach((record) => {
                      const category = record.category || "其他";
                      incomeStats[category] =
                        (incomeStats[category] || 0) + (record.amount || 0);
                    });

                  const total = Object.values(incomeStats).reduce(
                    (sum, amount) => sum + amount,
                    0,
                  );

                  if (total === 0) {
                    return (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "40px",
                          color: "rgba(255, 255, 255, 0.6)",
                        }}
                      >
                        暂无收入数据
                      </div>
                    );
                  }

                  // 准备饼图数据
                  const incomeColors = [
                    "#2ecc71",
                    "#27ae60",
                    "#55efc4",
                    "#00b894",
                    "#00cec9",
                    "#74b9ff",
                    "#0984e3",
                    "#6c5ce7",
                  ];
                  const incomePieData = Object.entries(incomeStats)
                    .map(([name, value]) => ({
                      name,
                      value,
                      percentage: ((value / total) * 100).toFixed(1),
                    }))
                    .sort((a, b) => b.value - a.value);

                  return (
                    <div>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={incomePieData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }: any) =>
                              `${name}: ${(percent * 100).toFixed(0)}%`
                            }
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {incomePieData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={incomeColors[index % incomeColors.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "rgba(15, 23, 42, 0.95)",
                              border: "1px solid rgba(255, 255, 255, 0.2)",
                              borderRadius: "8px",
                              color: "white",
                            }}
                            formatter={(value: number) =>
                              `${value.toLocaleString()} MMK`
                            }
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div
                        style={{
                          marginTop: "16px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        {incomePieData.map((item, index) => (
                          <div
                            key={item.name}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <div
                              style={{
                                width: "12px",
                                height: "12px",
                                borderRadius: "3px",
                                background:
                                  incomeColors[index % incomeColors.length],
                              }}
                            />
                            <span
                              style={{
                                color: "rgba(255, 255, 255, 0.9)",
                                fontSize: "0.85rem",
                                flex: 1,
                              }}
                            >
                              {item.name}
                            </span>
                            <span
                              style={{
                                color: "rgba(255, 255, 255, 0.7)",
                                fontSize: "0.85rem",
                              }}
                            >
                              {item.value.toLocaleString()} MMK (
                              {item.percentage}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 支出分类分布 - 饼图 */}
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.12)",
                  borderRadius: "16px",
                  padding: "24px",
                  border: "1px solid rgba(255, 255, 255, 0.18)",
                }}
              >
                <h4
                  style={{ marginTop: 0, color: "white", marginBottom: "16px" }}
                >
                  💸 支出分类分布
                </h4>
                {(() => {
                  const recentRecords = filterByTimePeriod(
                    records,
                    timePeriod,
                    "record_date",
                  );
                  const expenseStats: Record<string, number> = {};

                  recentRecords
                    .filter((r) => r.record_type === "expense")
                    .forEach((record) => {
                      const category = record.category || "其他";
                      expenseStats[category] =
                        (expenseStats[category] || 0) + (record.amount || 0);
                    });

                  const total = Object.values(expenseStats).reduce(
                    (sum, amount) => sum + amount,
                    0,
                  );

                  if (total === 0) {
                    return (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "40px",
                          color: "rgba(255, 255, 255, 0.6)",
                        }}
                      >
                        暂无支出数据
                      </div>
                    );
                  }

                  // 准备饼图数据
                  const expenseColors = [
                    "#e74c3c",
                    "#c0392b",
                    "#ff6b6b",
                    "#ff7675",
                    "#fd79a8",
                    "#fdcb6e",
                    "#e17055",
                    "#d63031",
                  ];
                  const expensePieData = Object.entries(expenseStats)
                    .map(([name, value]) => ({
                      name,
                      value,
                      percentage: ((value / total) * 100).toFixed(1),
                    }))
                    .sort((a, b) => b.value - a.value);

                  return (
                    <div>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={expensePieData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }: any) =>
                              `${name}: ${(percent * 100).toFixed(0)}%`
                            }
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {expensePieData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  expenseColors[index % expenseColors.length]
                                }
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "rgba(15, 23, 42, 0.95)",
                              border: "1px solid rgba(255, 255, 255, 0.2)",
                              borderRadius: "8px",
                              color: "white",
                            }}
                            formatter={(value: number) =>
                              `${value.toLocaleString()} MMK`
                            }
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div
                        style={{
                          marginTop: "16px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        {expensePieData.map((item, index) => (
                          <div
                            key={item.name}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <div
                              style={{
                                width: "12px",
                                height: "12px",
                                borderRadius: "3px",
                                background:
                                  expenseColors[index % expenseColors.length],
                              }}
                            />
                            <span
                              style={{
                                color: "rgba(255, 255, 255, 0.9)",
                                fontSize: "0.85rem",
                                flex: 1,
                              }}
                            >
                              {item.name}
                            </span>
                            <span
                              style={{
                                color: "rgba(255, 255, 255, 0.7)",
                                fontSize: "0.85rem",
                              }}
                            >
                              {item.value.toLocaleString()} MMK (
                              {item.percentage}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 骑手效率排名 - 柱状图 */}
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.12)",
                  borderRadius: "16px",
                  padding: "24px",
                  border: "1px solid rgba(255, 255, 255, 0.18)",
                }}
              >
                <h4
                  style={{ marginTop: 0, color: "white", marginBottom: "16px" }}
                >
                  🏆 骑手效率排名 TOP 10
                </h4>
                {(() => {
                  const courierStats: Record<
                    string,
                    { count: number; km: number }
                  > = {};

                  packages
                    .filter(
                      (pkg) =>
                        pkg.status === "已送达" &&
                        pkg.courier &&
                        pkg.courier !== "待分配",
                    )
                    .forEach((pkg) => {
                      const courier = pkg.courier;
                      if (!courierStats[courier]) {
                        courierStats[courier] = { count: 0, km: 0 };
                      }
                      courierStats[courier].count++;
                      courierStats[courier].km += pkg.delivery_distance || 0;
                    });

                  const topCouriers = Object.entries(courierStats)
                    .sort((a, b) => b[1].count - a[1].count)
                    .slice(0, 10);

                  if (topCouriers.length === 0) {
                    return (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "40px",
                          color: "rgba(255, 255, 255, 0.6)",
                        }}
                      >
                        暂无骑手数据
                      </div>
                    );
                  }

                  // 准备柱状图数据
                  const courierChartData = topCouriers.map(
                    ([courier, stats]) => ({
                      name:
                        courier.length > 8
                          ? `${courier.substring(0, 8)}...`
                          : courier,
                      fullName: courier,
                      count: stats.count,
                      km: stats.km,
                    }),
                  );

                  return (
                    <div>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={courierChartData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255, 255, 255, 0.1)"
                          />
                          <XAxis
                            dataKey="name"
                            stroke="rgba(255, 255, 255, 0.7)"
                            style={{ fontSize: "11px" }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis
                            stroke="rgba(255, 255, 255, 0.7)"
                            style={{ fontSize: "12px" }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "rgba(15, 23, 42, 0.95)",
                              border: "1px solid rgba(255, 255, 255, 0.2)",
                              borderRadius: "8px",
                              color: "white",
                            }}
                            formatter={(value: number, name: string) => {
                              if (name === "count")
                                return [`${value} 单`, "配送单数"];
                              if (name === "km")
                                return [`${value.toFixed(1)} KM`, "配送距离"];
                              return value;
                            }}
                            labelFormatter={(label) =>
                              `骑手: ${courierChartData.find((d) => d.name === label)?.fullName || label}`
                            }
                          />
                          <Legend
                            wrapperStyle={{
                              color: "rgba(255, 255, 255, 0.9)",
                              paddingTop: "20px",
                            }}
                          />
                          <Bar
                            dataKey="count"
                            fill="#2ecc71"
                            name="配送单数"
                            radius={[8, 8, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                      <div
                        style={{
                          marginTop: "16px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        {topCouriers.map(([courier, stats], index) => {
                          const medals = [
                            "🥇",
                            "🥈",
                            "🥉",
                            "4️⃣",
                            "5️⃣",
                            "6️⃣",
                            "7️⃣",
                            "8️⃣",
                            "9️⃣",
                            "🔟",
                          ];
                          return (
                            <div
                              key={courier}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                padding: "8px",
                                background: "rgba(255, 255, 255, 0.05)",
                                borderRadius: "8px",
                              }}
                            >
                              <div
                                style={{ fontSize: "1.2rem", width: "30px" }}
                              >
                                {medals[index] || `${index + 1}.`}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div
                                  style={{
                                    color: "white",
                                    fontSize: "0.85rem",
                                    fontWeight: "600",
                                  }}
                                >
                                  {courier}
                                </div>
                                <div
                                  style={{
                                    color: "rgba(255, 255, 255, 0.6)",
                                    fontSize: "0.75rem",
                                  }}
                                >
                                  {stats.count}单 · {stats.km.toFixed(1)} KM
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {activeTab === "package_records" && (
          <div
            style={{
              background: "rgba(255, 255, 255, 0.12)",
              borderRadius: "20px",
              padding: "24px",
              border: "1px solid rgba(255, 255, 255, 0.18)",
              boxShadow: "0 12px 35px rgba(7, 23, 55, 0.45)",
            }}
          >
            <h3 style={{ marginTop: 0, color: "white", marginBottom: "20px" }}>
              📦 {t.packageRecords}
            </h3>

            {/* 包裹收入统计 */}
            <div style={{ marginBottom: "24px" }}>
              <h4
                style={{
                  color: "rgba(255, 255, 255, 0.9)",
                  marginBottom: "12px",
                }}
              >
                {t.packageIncomeOverview || "包裹收入统计"}
              </h4>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "1fr"
                    : "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: isMobile ? "12px" : "16px",
                  marginBottom: "16px",
                }}
              >
                <div
                  style={{
                    background: "rgba(34, 197, 94, 0.2)",
                    border: "1px solid rgba(34, 197, 94, 0.3)",
                    borderRadius: "12px",
                    padding: "16px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      color: "#22c55e",
                      fontSize: "1.5rem",
                      fontWeight: "bold",
                    }}
                  >
                    {deliveredPackages.length}
                  </div>
                  <div
                    style={{
                      color: "rgba(255, 255, 255, 0.8)",
                      fontSize: "0.9rem",
                    }}
                  >
                    {t.deliveredCount}
                  </div>
                </div>
                <div
                  style={{
                    background: "rgba(34, 197, 94, 0.2)",
                    border: "1px solid rgba(34, 197, 94, 0.3)",
                    borderRadius: "12px",
                    padding: "16px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      color: "#22c55e",
                      fontSize: "1.5rem",
                      fontWeight: "bold",
                    }}
                  >
                    {deliveredIncome.toLocaleString()} MMK
                  </div>
                  <div
                    style={{
                      color: "rgba(255, 255, 255, 0.8)",
                      fontSize: "0.9rem",
                    }}
                  >
                    {t.deliveredIncome}
                  </div>
                </div>
                <div
                  style={{
                    background: "rgba(251, 191, 36, 0.2)",
                    border: "1px solid rgba(251, 191, 36, 0.3)",
                    borderRadius: "12px",
                    padding: "16px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      color: "#fbbf24",
                      fontSize: "1.5rem",
                      fontWeight: "bold",
                    }}
                  >
                    {inProgressPackages.length}
                  </div>
                  <div
                    style={{
                      color: "rgba(255, 255, 255, 0.8)",
                      fontSize: "0.9rem",
                    }}
                  >
                    {t.inProgressCount}
                  </div>
                </div>
                <div
                  style={{
                    background: "rgba(251, 191, 36, 0.2)",
                    border: "1px solid rgba(251, 191, 36, 0.3)",
                    borderRadius: "12px",
                    padding: "16px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      color: "#fbbf24",
                      fontSize: "1.5rem",
                      fontWeight: "bold",
                    }}
                  >
                    {inProgressIncome.toLocaleString()} MMK
                  </div>
                  <div
                    style={{
                      color: "rgba(255, 255, 255, 0.8)",
                      fontSize: "0.9rem",
                    }}
                  >
                    {t.expectedIncome}
                  </div>
                </div>
              </div>
            </div>

            {/* 包裹收支记录表格 */}
            <div style={{ marginTop: "24px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "12px",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <h4 style={{ color: "rgba(255, 255, 255, 0.9)", margin: 0 }}>
                  {language === "zh"
                    ? "包裹收入记录"
                    : language === "my"
                      ? "ပစ္စည်းပို့ဆောင်မှု ဝင်ငွေမှတ်တမ်း"
                      : "Package Income Records"}
                </h4>
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <label
                    style={{
                      color: "rgba(255, 255, 255, 0.8)",
                      fontSize: "0.9rem",
                    }}
                  >
                    {language === "zh"
                      ? "支付方式"
                      : language === "my"
                        ? "ပေးချေမှု"
                        : "Payment"}
                  </label>
                  <select
                    value={packagePaymentFilter}
                    onChange={(e) =>
                      setPackagePaymentFilter(
                        e.target.value as "all" | "cash" | "balance",
                      )
                    }
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255, 255, 255, 0.25)",
                      background: "rgba(7, 23, 53, 0.65)",
                      color: "white",
                      fontSize: "0.9rem",
                      cursor: "pointer",
                    }}
                  >
                    <option
                      value="all"
                      style={{ background: "#0f1729", color: "white" }}
                    >
                      {language === "zh"
                        ? "全部"
                        : language === "my"
                          ? "အားလုံး"
                          : "All"}
                    </option>
                    <option
                      value="cash"
                      style={{ background: "#0f1729", color: "white" }}
                    >
                      {language === "zh"
                        ? "现金支付"
                        : language === "my"
                          ? "ငွေသား"
                          : "Cash"}
                    </option>
                    <option
                      value="balance"
                      style={{ background: "#0f1729", color: "white" }}
                    >
                      {language === "zh"
                        ? "余额支付"
                        : language === "my"
                          ? "လက်ကျန်ငွေ"
                          : "Balance"}
                    </option>
                  </select>
                  <label
                    style={{
                      color: "rgba(255, 255, 255, 0.8)",
                      fontSize: "0.9rem",
                    }}
                  >
                    {t.recordsPerPage}：
                  </label>
                  <select
                    value={packageRecordsPerPage}
                    onChange={(e) => {
                      setPackageRecordsPerPage(Number(e.target.value));
                      setPackageRecordsPage(1); // 重置到第一页
                    }}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255, 255, 255, 0.25)",
                      background: "rgba(7, 23, 53, 0.65)",
                      color: "white",
                      fontSize: "0.9rem",
                      cursor: "pointer",
                    }}
                  >
                    <option
                      value={10}
                      style={{ background: "#0f1729", color: "white" }}
                    >
                      10
                    </option>
                    <option
                      value={20}
                      style={{ background: "#0f1729", color: "white" }}
                    >
                      20
                    </option>
                    <option
                      value={50}
                      style={{ background: "#0f1729", color: "white" }}
                    >
                      50
                    </option>
                    <option
                      value={100}
                      style={{ background: "#0f1729", color: "white" }}
                    >
                      100
                    </option>
                  </select>
                </div>
              </div>
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  borderRadius: "12px",
                  overflow: "hidden",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "rgba(255, 255, 255, 0.1)" }}>
                      <th
                        style={{
                          padding: "12px",
                          textAlign: "left",
                          color: "white",
                          fontSize: "0.9rem",
                        }}
                      >
                        {t.orderId}
                      </th>
                      <th
                        style={{
                          padding: "12px",
                          textAlign: "left",
                          color: "white",
                          fontSize: "0.9rem",
                        }}
                      >
                        {language === "my" ? "ပို့ဆောင်သူ" : "寄件人"}
                      </th>
                      <th
                        style={{
                          padding: "12px",
                          textAlign: "left",
                          color: "white",
                          fontSize: "0.9rem",
                        }}
                      >
                        {language === "my" ? "လက်ခံသူ" : "收件人"}
                      </th>
                      <th
                        style={{
                          padding: "12px",
                          textAlign: "left",
                          color: "white",
                          fontSize: "0.9rem",
                        }}
                      >
                        {language === "my" ? "ပစ္စည်းအမျိုးအစား" : "包裹类型"}
                      </th>
                      <th
                        style={{
                          padding: "12px",
                          textAlign: "left",
                          color: "white",
                          fontSize: "0.9rem",
                        }}
                      >
                        {t.amount}
                      </th>
                      <th
                        style={{
                          padding: "12px",
                          textAlign: "left",
                          color: "white",
                          fontSize: "0.9rem",
                        }}
                      >
                        {language === "zh"
                          ? "支付方式"
                          : language === "my"
                            ? "ပေးချေမှု"
                            : "Payment"}
                      </th>
                      <th
                        style={{
                          padding: "12px",
                          textAlign: "left",
                          color: "white",
                          fontSize: "0.9rem",
                        }}
                      >
                        {t.status}
                      </th>
                      <th
                        style={{
                          padding: "12px",
                          textAlign: "left",
                          color: "white",
                          fontSize: "0.9rem",
                        }}
                      >
                        {language === "my" ? "ပို့ဆောင်ချိန်" : "送达时间"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveredPackagesSorted.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          style={{
                            padding: "24px",
                            textAlign: "center",
                            color: "rgba(255, 255, 255, 0.6)",
                          }}
                        >
                          {t.noRecords}
                        </td>
                      </tr>
                    ) : (
                      packageCurrentPackages.map((pkg) => {
                        const price = parseFloat(
                          pkg.price?.replace(/[^\d.]/g, "") || "0",
                        );
                        const isCashPayment = pkg.payment_method === "cash";
                        return (
                          <tr
                            key={pkg.id}
                            style={{
                              borderBottom:
                                "1px solid rgba(255, 255, 255, 0.1)",
                            }}
                          >
                            <td
                              style={{
                                padding: "12px",
                                color: "rgba(255, 255, 255, 0.8)",
                                fontSize: "0.9rem",
                              }}
                            >
                              {pkg.id}
                            </td>
                            <td
                              style={{
                                padding: "12px",
                                color: "rgba(255, 255, 255, 0.8)",
                                fontSize: "0.9rem",
                              }}
                            >
                              {pkg.sender_name}
                            </td>
                            <td
                              style={{
                                padding: "12px",
                                color: "rgba(255, 255, 255, 0.8)",
                                fontSize: "0.9rem",
                              }}
                            >
                              {pkg.receiver_name}
                            </td>
                            <td
                              style={{
                                padding: "12px",
                                color: "rgba(255, 255, 255, 0.8)",
                                fontSize: "0.9rem",
                              }}
                            >
                              {pkg.package_type}
                            </td>
                            <td
                              style={{
                                padding: "12px",
                                color: "rgba(255, 255, 255, 0.8)",
                                fontSize: "0.9rem",
                              }}
                            >
                              <span
                                style={{ color: "#22c55e", fontWeight: "bold" }}
                              >
                                {price.toLocaleString()} MMK
                              </span>
                            </td>
                            <td
                              style={{
                                padding: "12px",
                                color: "rgba(255, 255, 255, 0.8)",
                                fontSize: "0.9rem",
                              }}
                            >
                              <span
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: "6px",
                                  fontSize: "0.8rem",
                                  background: isCashPayment
                                    ? "rgba(59, 130, 246, 0.2)"
                                    : "rgba(16, 185, 129, 0.2)",
                                  color: isCashPayment ? "#60a5fa" : "#34d399",
                                }}
                              >
                                {isCashPayment
                                  ? language === "zh"
                                    ? "现金支付"
                                    : language === "my"
                                      ? "ငွေသား"
                                      : "Cash"
                                  : language === "zh"
                                    ? "余额支付"
                                    : language === "my"
                                      ? "လက်ကျန်ငွေ"
                                      : "Balance"}
                              </span>
                            </td>
                            <td
                              style={{
                                padding: "12px",
                                color: "rgba(255, 255, 255, 0.8)",
                                fontSize: "0.9rem",
                              }}
                            >
                              <span
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: "6px",
                                  fontSize: "0.8rem",
                                  background: "rgba(34, 197, 94, 0.2)",
                                  color: "#22c55e",
                                }}
                              >
                                {t.completed}
                              </span>
                            </td>
                            <td
                              style={{
                                padding: "12px",
                                color: "rgba(255, 255, 255, 0.8)",
                                fontSize: "0.9rem",
                              }}
                            >
                              {pkg.delivery_time || "-"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* 分页控件 */}
              {packageTotalPages <= 1
                ? null
                : (() => {
                    const getPageNumbers = () => {
                      const pages: (number | string)[] = [];
                      const maxVisible = 5;

                      if (packageTotalPages <= maxVisible) {
                        // 如果总页数少于等于5，显示所有页码
                        for (let i = 1; i <= packageTotalPages; i++) {
                          pages.push(i);
                        }
                      } else {
                        // 总是显示第一页
                        pages.push(1);

                        if (packageCurrentPage > 3) {
                          pages.push("...");
                        }

                        // 显示当前页前后各1页
                        const start = Math.max(2, packageCurrentPage - 1);
                        const end = Math.min(
                          packageTotalPages - 1,
                          packageCurrentPage + 1,
                        );

                        for (let i = start; i <= end; i++) {
                          pages.push(i);
                        }

                        if (packageCurrentPage < packageTotalPages - 2) {
                          pages.push("...");
                        }

                        // 总是显示最后一页
                        pages.push(packageTotalPages);
                      }

                      return pages;
                    };

                    return (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginTop: "20px",
                          padding: "16px",
                          background: "rgba(255, 255, 255, 0.05)",
                          borderRadius: "12px",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          flexWrap: "wrap",
                          gap: "12px",
                        }}
                      >
                        <div
                          style={{
                            color: "rgba(255, 255, 255, 0.8)",
                            fontSize: "0.9rem",
                          }}
                        >
                          {language === "zh"
                            ? `显示第 ${packageDisplayStart} - ${packageDisplayEnd} 条，共 ${deliveredPackagesSorted.length} 条记录`
                            : language === "my"
                              ? deliveredPackagesSorted.length +
                                " ခု အနက် " +
                                packageDisplayStart +
                                " မှ " +
                                packageDisplayEnd +
                                " အထိ ပြသနေသည်"
                              : `Showing ${packageDisplayStart} to ${packageDisplayEnd} of ${deliveredPackagesSorted.length}`}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            alignItems: "center",
                            flexWrap: "wrap",
                          }}
                        >
                          {/* 上一页按钮 */}
                          <button
                            onClick={() =>
                              setPackageRecordsPage((prev) =>
                                Math.max(1, prev - 1),
                              )
                            }
                            disabled={packageCurrentPage === 1}
                            style={{
                              padding: "8px 16px",
                              borderRadius: "8px",
                              border: "1px solid rgba(255, 255, 255, 0.25)",
                              background:
                                packageCurrentPage === 1
                                  ? "rgba(255, 255, 255, 0.1)"
                                  : "rgba(59, 130, 246, 0.2)",
                              color:
                                packageCurrentPage === 1
                                  ? "rgba(255, 255, 255, 0.4)"
                                  : "white",
                              cursor:
                                packageCurrentPage === 1
                                  ? "not-allowed"
                                  : "pointer",
                              fontSize: "0.9rem",
                              fontWeight: "600",
                              transition: "all 0.2s",
                            }}
                          >
                            {language === "zh"
                              ? "← 上一页"
                              : language === "my"
                                ? "← ယခင်"
                                : "← Prev"}
                          </button>

                          {/* 页码按钮 */}
                          {getPageNumbers().map((page, index) => {
                            if (page === "...") {
                              return (
                                <span
                                  key={`ellipsis-${index}`}
                                  style={{
                                    color: "rgba(255, 255, 255, 0.6)",
                                    padding: "0 8px",
                                    fontSize: "0.9rem",
                                  }}
                                >
                                  ...
                                </span>
                              );
                            }

                            const pageNum = page as number;
                            const isActive = pageNum === packageCurrentPage;

                            return (
                              <button
                                key={pageNum}
                                onClick={() => setPackageRecordsPage(pageNum)}
                                style={{
                                  minWidth: "40px",
                                  padding: "8px 12px",
                                  borderRadius: "8px",
                                  border: "1px solid rgba(255, 255, 255, 0.25)",
                                  background: isActive
                                    ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                                    : "rgba(255, 255, 255, 0.1)",
                                  color: "white",
                                  cursor: "pointer",
                                  fontSize: "0.9rem",
                                  fontWeight: isActive ? "bold" : "normal",
                                  transition: "all 0.2s",
                                }}
                                onMouseOver={(e) => {
                                  if (!isActive) {
                                    e.currentTarget.style.background =
                                      "rgba(255, 255, 255, 0.15)";
                                  }
                                }}
                                onMouseOut={(e) => {
                                  if (!isActive) {
                                    e.currentTarget.style.background =
                                      "rgba(255, 255, 255, 0.1)";
                                  }
                                }}
                              >
                                {pageNum}
                              </button>
                            );
                          })}

                          {/* 下一页按钮 */}
                          <button
                            onClick={() =>
                              setPackageRecordsPage((prev) =>
                                Math.min(packageTotalPages, prev + 1),
                              )
                            }
                            disabled={packageCurrentPage === packageTotalPages}
                            style={{
                              padding: "8px 16px",
                              borderRadius: "8px",
                              border: "1px solid rgba(255, 255, 255, 0.25)",
                              background:
                                packageCurrentPage === packageTotalPages
                                  ? "rgba(255, 255, 255, 0.1)"
                                  : "rgba(59, 130, 246, 0.2)",
                              color:
                                packageCurrentPage === packageTotalPages
                                  ? "rgba(255, 255, 255, 0.4)"
                                  : "white",
                              cursor:
                                packageCurrentPage === packageTotalPages
                                  ? "not-allowed"
                                  : "pointer",
                              fontSize: "0.9rem",
                              fontWeight: "600",
                              transition: "all 0.2s",
                            }}
                          >
                            {language === "zh"
                              ? "下一页 →"
                              : language === "my"
                                ? "နောက်သို့ →"
                                : "Next →"}
                          </button>
                        </div>
                      </div>
                    );
                  })()}
            </div>
          </div>
        )}

        {activeTab === "courier_records" && (
          <div>
            {/* 顶部操作栏 */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.12)",
                borderRadius: "16px",
                padding: isMobile ? "12px" : "20px",
                marginBottom: "24px",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                display: "flex",
                gap: isMobile ? "12px" : "16px",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <h3 style={{ margin: 0, color: "white", flex: "1 1 auto" }}>
                💰 {t.courierFinanceRecords}
              </h3>

              {/* 状态筛选 */}
              <select
                value={salaryFilterStatus}
                onChange={(e) => setSalaryFilterStatus(e.target.value as any)}
                style={{
                  padding: "10px 16px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  background: "rgba(7, 23, 53, 0.65)",
                  color: "white",
                  fontSize: "0.9rem",
                }}
              >
                <option value="all" style={{ color: "#000" }}>
                  {t.allStatus}
                </option>
                <option value="pending" style={{ color: "#000" }}>
                  {t.pending}
                </option>
                <option value="approved" style={{ color: "#000" }}>
                  {language === "zh"
                    ? "已审核"
                    : language === "my"
                      ? "အတည်ပြုပြီး"
                      : "Approved"}
                </option>
                <option value="paid" style={{ color: "#000" }}>
                  {t.settled}
                </option>
                <option value="rejected" style={{ color: "#000" }}>
                  {language === "zh"
                    ? "已拒绝"
                    : language === "my"
                      ? "ငြင်းပယ်ခံရသည်"
                      : "Rejected"}
                </option>
              </select>

              {/* 生成工资按钮 */}
              {!isRegionalUser && (
                <button
                  onClick={handleOpenSalaryGeneration}
                  disabled={loading}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "10px",
                    border: "none",
                    background: loading
                      ? "rgba(102, 126, 234, 0.5)"
                      : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    transition: "all 0.3s ease",
                  }}
                >
                  🔄 {t.generateSalaries}
                </button>
              )}

              {selectedSalaries.length > 0 && !isRegionalUser && (
                <>
                  <button
                    onClick={async () => {
                      if (
                        !window.confirm(
                          `是否批量审核 ${selectedSalaries.length} 条工资记录？`,
                        )
                      )
                        return;

                      setLoading(true);
                      try {
                        const success =
                          await courierSalaryService.batchApproveSalaries(
                            selectedSalaries,
                            localStorage.getItem("admin_name") || "System",
                          );

                        if (success) {
                          window.alert("批量审核成功！");
                          await loadRecords();
                          setSelectedSalaries([]);
                        } else {
                          window.alert("批量审核失败！");
                        }
                      } catch (error) {
                        console.error("批量审核失败:", error);
                        window.alert("批量审核失败！");
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "10px",
                      border: "none",
                      background:
                        "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
                      color: "white",
                      cursor: loading ? "not-allowed" : "pointer",
                      fontSize: "0.9rem",
                      fontWeight: "600",
                    }}
                  >
                    ✅ 批量审核 ({selectedSalaries.length})
                  </button>

                  <button
                    onClick={() => setShowPaymentModal(true)}
                    disabled={loading}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "10px",
                      border: "none",
                      background:
                        "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                      color: "white",
                      cursor: loading ? "not-allowed" : "pointer",
                      fontSize: "0.9rem",
                      fontWeight: "600",
                    }}
                  >
                    💳 批量发放 ({selectedSalaries.length})
                  </button>

                  <button
                    onClick={async () => {
                      if (
                        !window.confirm(
                          `确定要批量删除 ${selectedSalaries.length} 条工资记录吗？\n此操作不可恢复！`,
                        )
                      )
                        return;

                      setLoading(true);
                      try {
                        let successCount = 0;
                        let failCount = 0;

                        // 逐个删除选中的工资记录
                        for (const salaryId of selectedSalaries) {
                          try {
                            const success =
                              await courierSalaryService.deleteSalary(salaryId);
                            if (success) {
                              successCount++;
                            } else {
                              failCount++;
                            }
                          } catch (error) {
                            console.error(
                              `删除工资记录 ${salaryId} 失败:`,
                              error,
                            );
                            failCount++;
                          }
                        }

                        // 显示删除结果
                        if (failCount === 0) {
                          window.alert(
                            `批量删除成功！共删除 ${successCount} 条记录。`,
                          );
                        } else {
                          window.alert(
                            `批量删除完成！成功：${successCount} 条，失败：${failCount} 条。`,
                          );
                        }

                        // 重新加载数据并清空选择
                        await loadRecords();
                        setSelectedSalaries([]);
                      } catch (error) {
                        console.error("批量删除失败:", error);
                        window.alert("批量删除失败！");
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "10px",
                      border: "none",
                      background:
                        "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                      color: "white",
                      cursor: loading ? "not-allowed" : "pointer",
                      fontSize: "0.9rem",
                      fontWeight: "600",
                      transition: "all 0.3s ease",
                    }}
                  >
                    🗑️ 批量删除 ({selectedSalaries.length})
                  </button>
                </>
              )}
            </div>

            {/* 月份选择器 */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.12)",
                borderRadius: "16px",
                padding: isMobile ? "12px" : "20px",
                marginBottom: "24px",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                display: "flex",
                gap: "16px",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <label
                style={{
                  color: "white",
                  fontSize: "0.95rem",
                  fontWeight: "600",
                }}
              >
                📅 {t.selectMonth}：
              </label>
              <select
                value={selectedSalaryMonth}
                onChange={(e) => {
                  setSelectedSalaryMonth(e.target.value);
                  setSelectedSalaries([]); // 切换月份时清空选择
                }}
                style={{
                  padding: "10px 16px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  background: "rgba(7, 23, 53, 0.65)",
                  color: "white",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  minWidth: "180px",
                }}
              >
                {getAvailableMonths().map((month) => (
                  <option
                    key={month}
                    value={month}
                    style={{ background: "#0f1729", color: "white" }}
                  >
                    {formatMonthDisplay(month)}
                  </option>
                ))}
              </select>
              <div
                style={{
                  color: "rgba(255, 255, 255, 0.7)",
                  fontSize: "0.85rem",
                  marginLeft: "auto",
                }}
              >
                {language === "zh"
                  ? `共 ${getFilteredSalariesByMonth(courierSalaries, selectedSalaryMonth).length} 条记录`
                  : language === "my"
                    ? "စုစုပေါင်း " +
                      getFilteredSalariesByMonth(
                        courierSalaries,
                        selectedSalaryMonth,
                      ).length +
                      " ခု"
                    : `Total ${getFilteredSalariesByMonth(courierSalaries, selectedSalaryMonth).length} records`}
              </div>
            </div>

            {/* 工资统计卡片 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(auto-fit, minmax(220px, 1fr))",
                gap: isMobile ? "12px" : "16px",
                marginBottom: "24px",
              }}
            >
              {(() => {
                let monthFilteredSalaries = getFilteredSalariesByMonth(
                  courierSalaries,
                  selectedSalaryMonth,
                );

                // 领区过滤
                if (isRegionalUser) {
                  monthFilteredSalaries = monthFilteredSalaries.filter(
                    (s) =>
                      s.courier_id &&
                      s.courier_id.startsWith(currentRegionPrefix),
                  );
                }

                return (
                  <>
                    <div
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(245, 158, 11, 0.2) 100%)",
                        border: "1px solid rgba(251, 191, 36, 0.3)",
                        borderRadius: "16px",
                        padding: isMobile ? "12px" : "20px",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          color: "#fbbf24",
                          fontSize: isMobile ? "1.5rem" : "2rem",
                          fontWeight: "bold",
                          marginBottom: "8px",
                        }}
                      >
                        {
                          monthFilteredSalaries.filter(
                            (s) => s.status === "pending",
                          ).length
                        }
                      </div>
                      <div
                        style={{
                          color: "rgba(255, 255, 255, 0.9)",
                          fontSize: "0.95rem",
                        }}
                      >
                        {t.pending}
                      </div>
                    </div>

                    <div
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(22, 163, 74, 0.2) 100%)",
                        border: "1px solid rgba(34, 197, 94, 0.3)",
                        borderRadius: "16px",
                        padding: isMobile ? "12px" : "20px",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          color: "#22c55e",
                          fontSize: isMobile ? "1.5rem" : "2rem",
                          fontWeight: "bold",
                          marginBottom: "8px",
                        }}
                      >
                        {
                          monthFilteredSalaries.filter(
                            (s) => s.status === "approved",
                          ).length
                        }
                      </div>
                      <div
                        style={{
                          color: "rgba(255, 255, 255, 0.9)",
                          fontSize: "0.95rem",
                        }}
                      >
                        {language === "zh"
                          ? "已审核"
                          : language === "my"
                            ? "အတည်ပြုပြီး"
                            : "Approved"}
                      </div>
                    </div>

                    <div
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.2) 100%)",
                        border: "1px solid rgba(59, 130, 246, 0.3)",
                        borderRadius: "16px",
                        padding: isMobile ? "12px" : "20px",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          color: "#3b82f6",
                          fontSize: isMobile ? "1.5rem" : "2rem",
                          fontWeight: "bold",
                          marginBottom: "8px",
                        }}
                      >
                        {
                          monthFilteredSalaries.filter(
                            (s) => s.status === "paid",
                          ).length
                        }
                      </div>
                      <div
                        style={{
                          color: "rgba(255, 255, 255, 0.9)",
                          fontSize: "0.95rem",
                        }}
                      >
                        {t.settled}
                      </div>
                    </div>

                    <div
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(147, 51, 234, 0.2) 100%)",
                        border: "1px solid rgba(168, 85, 247, 0.3)",
                        borderRadius: "16px",
                        padding: isMobile ? "12px" : "20px",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          color: "#a855f7",
                          fontSize: "1.6rem",
                          fontWeight: "bold",
                          marginBottom: "8px",
                        }}
                      >
                        {monthFilteredSalaries
                          .reduce((sum, s) => sum + s.net_salary, 0)
                          .toLocaleString()}{" "}
                        MMK
                      </div>
                      <div
                        style={{
                          color: "rgba(255, 255, 255, 0.9)",
                          fontSize: "0.95rem",
                        }}
                      >
                        {language === "zh"
                          ? "工资总额"
                          : language === "my"
                            ? "စုစုပေါင်း လစာ"
                            : "Total Salary"}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* 工资记录表格 */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.12)",
                borderRadius: "16px",
                padding: "24px",
                marginBottom: "24px",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                overflow: "auto",
              }}
            >
              <h4
                style={{
                  margin: "0 0 16px 0",
                  color: "white",
                  fontSize: "1.1rem",
                }}
              >
                💼 {language === "my" ? "လစာမှတ်တမ်းဇယား" : "工资记录表"}
              </h4>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: "1200px",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "rgba(255, 255, 255, 0.1)",
                      borderBottom: "2px solid rgba(255, 255, 255, 0.2)",
                    }}
                  >
                    <th
                      style={{
                        padding: "14px 12px",
                        textAlign: "left",
                        color: "white",
                        fontSize: "0.9rem",
                        fontWeight: "600",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={(() => {
                          const monthFiltered = getFilteredSalariesByMonth(
                            courierSalaries,
                            selectedSalaryMonth,
                          );
                          const filtered = monthFiltered.filter(
                            (s) =>
                              salaryFilterStatus === "all" ||
                              s.status === salaryFilterStatus,
                          );
                          return (
                            selectedSalaries.length === filtered.length &&
                            filtered.length > 0
                          );
                        })()}
                        onChange={(e) => {
                          const monthFiltered = getFilteredSalariesByMonth(
                            courierSalaries,
                            selectedSalaryMonth,
                          );
                          const filtered = monthFiltered.filter(
                            (s) =>
                              salaryFilterStatus === "all" ||
                              s.status === salaryFilterStatus,
                          );
                          if (e.target.checked) {
                            setSelectedSalaries(
                              filtered
                                .map((s) => s.id!)
                                .filter((id) => id !== undefined),
                            );
                          } else {
                            setSelectedSalaries([]);
                          }
                        }}
                        style={{ cursor: "pointer" }}
                      />
                    </th>
                    <th
                      style={{
                        padding: "14px 12px",
                        textAlign: "left",
                        color: "white",
                        fontSize: "0.9rem",
                        fontWeight: "600",
                      }}
                    >
                      {t.riderId}
                    </th>
                    <th
                      style={{
                        padding: "14px 12px",
                        textAlign: "left",
                        color: "white",
                        fontSize: "0.9rem",
                        fontWeight: "600",
                      }}
                    >
                      {t.settlementPeriod}
                    </th>
                    <th
                      style={{
                        padding: "14px 12px",
                        textAlign: "right",
                        color: "white",
                        fontSize: "0.9rem",
                        fontWeight: "600",
                      }}
                    >
                      {t.baseSalary}
                    </th>
                    <th
                      style={{
                        padding: "14px 12px",
                        textAlign: "right",
                        color: "white",
                        fontSize: "0.9rem",
                        fontWeight: "600",
                      }}
                    >
                      {t.kmFee}
                    </th>
                    <th
                      style={{
                        padding: "14px 12px",
                        textAlign: "right",
                        color: "white",
                        fontSize: "0.9rem",
                        fontWeight: "600",
                      }}
                    >
                      {t.deliveryBonus}
                    </th>
                    <th
                      style={{
                        padding: "14px 12px",
                        textAlign: "right",
                        color: "white",
                        fontSize: "0.9rem",
                        fontWeight: "600",
                      }}
                    >
                      {language === "my" ? "စုစုပေါင်းလစာ" : "实发工资"}
                    </th>
                    <th
                      style={{
                        padding: "14px 12px",
                        textAlign: "center",
                        color: "white",
                        fontSize: "0.9rem",
                        fontWeight: "600",
                      }}
                    >
                      {t.deliveryCount}
                    </th>
                    <th
                      style={{
                        padding: "14px 12px",
                        textAlign: "center",
                        color: "white",
                        fontSize: "0.9rem",
                        fontWeight: "600",
                      }}
                    >
                      {t.status}
                    </th>
                    <th
                      style={{
                        padding: "14px 12px",
                        textAlign: "center",
                        color: "white",
                        fontSize: "0.9rem",
                        fontWeight: "600",
                      }}
                    >
                      {t.action}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // 先按月份过滤，再按状态过滤
                    let monthFiltered = getFilteredSalariesByMonth(
                      courierSalaries,
                      selectedSalaryMonth,
                    );

                    // 领区过滤
                    if (isRegionalUser) {
                      monthFiltered = monthFiltered.filter(
                        (s) =>
                          s.courier_id &&
                          s.courier_id.startsWith(currentRegionPrefix),
                      );
                    }

                    const filtered = monthFiltered.filter(
                      (s) =>
                        salaryFilterStatus === "all" ||
                        s.status === salaryFilterStatus,
                    );

                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td
                            colSpan={10}
                            style={{
                              padding: "40px",
                              textAlign: "center",
                              color: "rgba(255, 255, 255, 0.6)",
                              fontSize: "1rem",
                            }}
                          >
                            {selectedSalaryMonth
                              ? `暂无 ${formatMonthDisplay(selectedSalaryMonth)} 的工资记录`
                              : "暂无工资记录"}
                          </td>
                        </tr>
                      );
                    }

                    return filtered.map((salary) => (
                      <tr
                        key={salary.id}
                        style={{
                          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                          transition: "all 0.2s",
                        }}
                        onMouseOver={(e) =>
                          (e.currentTarget.style.background =
                            "rgba(255, 255, 255, 0.05)")
                        }
                        onMouseOut={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        <td style={{ padding: "14px 12px", color: "white" }}>
                          <input
                            type="checkbox"
                            checked={selectedSalaries.includes(salary.id!)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSalaries([
                                  ...selectedSalaries,
                                  salary.id!,
                                ]);
                              } else {
                                setSelectedSalaries(
                                  selectedSalaries.filter(
                                    (id) => id !== salary.id,
                                  ),
                                );
                              }
                            }}
                            style={{ cursor: "pointer" }}
                          />
                        </td>
                        <td
                          style={{
                            padding: "14px 12px",
                            color: "white",
                            fontSize: "0.9rem",
                            fontWeight: "600",
                          }}
                        >
                          {salary.courier_id}
                        </td>
                        <td
                          style={{
                            padding: "14px 12px",
                            color: "rgba(255, 255, 255, 0.8)",
                            fontSize: "0.85rem",
                          }}
                        >
                          {salary.period_start_date} ~ {salary.period_end_date}
                        </td>
                        <td
                          style={{
                            padding: "14px 12px",
                            textAlign: "right",
                            color: "rgba(255, 255, 255, 0.8)",
                            fontSize: "0.9rem",
                          }}
                        >
                          {salary.base_salary.toLocaleString()}
                        </td>
                        <td
                          style={{
                            padding: "14px 12px",
                            textAlign: "right",
                            color: "#74b9ff",
                            fontSize: "0.9rem",
                            fontWeight: "600",
                          }}
                        >
                          {salary.km_fee.toLocaleString()}
                        </td>
                        <td
                          style={{
                            padding: "14px 12px",
                            textAlign: "right",
                            color: "#a29bfe",
                            fontSize: "0.9rem",
                            fontWeight: "600",
                          }}
                        >
                          {salary.delivery_bonus.toLocaleString()}
                        </td>
                        <td
                          style={{
                            padding: "14px 12px",
                            textAlign: "right",
                            color: "#55efc4",
                            fontSize: "1rem",
                            fontWeight: "bold",
                          }}
                        >
                          {salary.net_salary.toLocaleString()} MMK
                        </td>
                        <td
                          style={{
                            padding: "14px 12px",
                            textAlign: "center",
                            color: "rgba(255, 255, 255, 0.8)",
                            fontSize: "0.9rem",
                          }}
                        >
                          {salary.total_deliveries} {t.packageSuffix || "单"}
                        </td>
                        <td
                          style={{ padding: "14px 12px", textAlign: "center" }}
                        >
                          <span
                            style={{
                              padding: "6px 12px",
                              borderRadius: "8px",
                              fontSize: "0.8rem",
                              fontWeight: "600",
                              background:
                                salary.status === "pending"
                                  ? "rgba(251, 191, 36, 0.2)"
                                  : salary.status === "approved"
                                    ? "rgba(34, 197, 94, 0.2)"
                                    : salary.status === "paid"
                                      ? "rgba(59, 130, 246, 0.2)"
                                      : "rgba(239, 68, 68, 0.2)",
                              color:
                                salary.status === "pending"
                                  ? "#fbbf24"
                                  : salary.status === "approved"
                                    ? "#22c55e"
                                    : salary.status === "paid"
                                      ? "#3b82f6"
                                      : "#ef4444",
                            }}
                          >
                            {salary.status === "pending"
                              ? t.pending
                              : salary.status === "approved"
                                ? language === "my"
                                  ? "အတည်ပြုပြီး"
                                  : "已审核"
                                : salary.status === "paid"
                                  ? t.settled
                                  : language === "my"
                                    ? "ငြင်းပယ်ခံရသည်"
                                    : "已拒绝"}
                          </span>
                        </td>
                        <td
                          style={{ padding: "14px 12px", textAlign: "center" }}
                        >
                          <div
                            style={{
                              display: "flex",
                              gap: "8px",
                              justifyContent: "center",
                            }}
                          >
                            <button
                              onClick={async () => {
                                setSelectedSalary(salary);
                                const details =
                                  await courierSalaryService.getSalaryDetails(
                                    salary.id!,
                                  );
                                setSalaryDetails(details);
                                setShowSalaryDetail(true);
                              }}
                              style={{
                                padding: "6px 12px",
                                borderRadius: "6px",
                                border: "none",
                                background: "rgba(59, 130, 246, 0.2)",
                                color: "#3b82f6",
                                cursor: "pointer",
                                fontSize: "0.8rem",
                                fontWeight: "600",
                              }}
                            >
                              {t.viewDetail || "详情"}
                            </button>

                            {!isRegionalUser && (
                              <>
                                {salary.status === "pending" && (
                                  <button
                                    onClick={async () => {
                                      if (
                                        !window.confirm(
                                          language === "my"
                                            ? "အတည်ပြုမှာ သေချာပါသလား?"
                                            : "确认审核通过？",
                                        )
                                      )
                                        return;

                                      setLoading(true);
                                      try {
                                        const success =
                                          await courierSalaryService.updateSalary(
                                            salary.id!,
                                            {
                                              status: "approved",
                                              approved_by:
                                                localStorage.getItem(
                                                  "admin_name",
                                                ) || "System",
                                              approved_at:
                                                new Date().toISOString(),
                                            },
                                          );

                                        if (success) {
                                          window.alert(
                                            language === "my"
                                              ? "အတည်ပြုခြင်း အောင်မြင်သည်!"
                                              : "审核成功！",
                                          );
                                          await loadRecords();
                                        } else {
                                          window.alert(
                                            language === "my"
                                              ? "အတည်ပြုခြင်း မအောင်မြင်ပါ!"
                                              : "审核失败！",
                                          );
                                        }
                                      } catch (error) {
                                        console.error("审核失败:", error);
                                        window.alert("审核失败！");
                                      } finally {
                                        setLoading(false);
                                      }
                                    }}
                                    style={{
                                      padding: "6px 12px",
                                      borderRadius: "6px",
                                      border: "none",
                                      background: "rgba(34, 197, 94, 0.2)",
                                      color: "#22c55e",
                                      cursor: "pointer",
                                      fontSize: "0.8rem",
                                      fontWeight: "600",
                                    }}
                                  >
                                    {t.audit || "审核"}
                                  </button>
                                )}

                                {salary.status === "approved" && (
                                  <button
                                    onClick={() => {
                                      setSelectedSalaries([salary.id!]);
                                      setShowPaymentModal(true);
                                    }}
                                    style={{
                                      padding: "6px 12px",
                                      borderRadius: "6px",
                                      border: "none",
                                      background: "rgba(245, 87, 108, 0.2)",
                                      color: "#f5576c",
                                      cursor: "pointer",
                                      fontSize: "0.8rem",
                                      fontWeight: "600",
                                    }}
                                  >
                                    发放
                                  </button>
                                )}

                                <button
                                  onClick={async () => {
                                    if (
                                      !window.confirm(
                                        `确定要删除骑手 ${salary.courier_id} 的工资记录吗？\n此操作不可恢复！`,
                                      )
                                    )
                                      return;

                                    setLoading(true);
                                    try {
                                      const success =
                                        await courierSalaryService.deleteSalary(
                                          salary.id!,
                                        );
                                      if (success) {
                                        window.alert("删除成功！");
                                        await loadRecords();
                                      } else {
                                        window.alert("删除失败！");
                                      }
                                    } catch (error) {
                                      console.error("删除工资记录失败:", error);
                                      window.alert("删除失败！");
                                    } finally {
                                      setLoading(false);
                                    }
                                  }}
                                  style={{
                                    padding: "6px 12px",
                                    borderRadius: "6px",
                                    border: "none",
                                    background: "rgba(239, 68, 68, 0.2)",
                                    color: "#ef4444",
                                    cursor: "pointer",
                                    fontSize: "0.8rem",
                                    fontWeight: "600",
                                  }}
                                >
                                  删除
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>

            {/* =============== 原有的统计信息 (保留) =============== */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.12)",
                borderRadius: "20px",
                padding: "24px",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                boxShadow: "0 12px 35px rgba(7, 23, 55, 0.45)",
              }}
            >
              <h3
                style={{ marginTop: 0, color: "white", marginBottom: "20px" }}
              >
                📊 骑手数据统计
              </h3>

              {/* 骑手送货费用统计 */}
              <div style={{ marginBottom: "24px" }}>
                <h4
                  style={{
                    color: "rgba(255, 255, 255, 0.9)",
                    marginBottom: "12px",
                  }}
                >
                  📍 骑手送货费用统计
                </h4>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile
                      ? "1fr"
                      : "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: isMobile ? "12px" : "16px",
                    marginBottom: "16px",
                  }}
                >
                  <div
                    style={{
                      background: "rgba(253, 121, 168, 0.2)",
                      border: "1px solid rgba(253, 121, 168, 0.3)",
                      borderRadius: "12px",
                      padding: "16px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        color: "#fd79a8",
                        fontSize: "1.5rem",
                        fontWeight: "bold",
                      }}
                    >
                      {summary.totalKm.toFixed(2)} KM
                    </div>
                    <div
                      style={{
                        color: "rgba(255, 255, 255, 0.8)",
                        fontSize: "0.9rem",
                      }}
                    >
                      总配送距离
                    </div>
                  </div>
                  <div
                    style={{
                      background: "rgba(253, 121, 168, 0.2)",
                      border: "1px solid rgba(253, 121, 168, 0.3)",
                      borderRadius: "12px",
                      padding: "16px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        color: "#fd79a8",
                        fontSize: "1.5rem",
                        fontWeight: "bold",
                      }}
                    >
                      {pricingSettings.base_fee || 1500} MMK
                    </div>
                    <div
                      style={{
                        color: "rgba(255, 255, 255, 0.8)",
                        fontSize: "0.9rem",
                      }}
                    >
                      基础起步价 (平台收费)
                    </div>
                  </div>
                  <div
                    style={{
                      background: "rgba(253, 121, 168, 0.2)",
                      border: "1px solid rgba(253, 121, 168, 0.3)",
                      borderRadius: "12px",
                      padding: "16px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        color: "#fd79a8",
                        fontSize: "1.5rem",
                        fontWeight: "bold",
                      }}
                    >
                      {summary.courierKmCost.toLocaleString()} MMK
                    </div>
                    <div
                      style={{
                        color: "rgba(255, 255, 255, 0.8)",
                        fontSize: "0.9rem",
                      }}
                    >
                      骑手分得总额 (总费 - 起步价)
                    </div>
                  </div>
                  <div
                    style={{
                      background: "rgba(253, 121, 168, 0.2)",
                      border: "1px solid rgba(253, 121, 168, 0.3)",
                      borderRadius: "12px",
                      padding: "16px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        color: "#fd79a8",
                        fontSize: "1.5rem",
                        fontWeight: "bold",
                      }}
                    >
                      {packages.filter((pkg) => pkg.status === "已送达").length}
                    </div>
                    <div
                      style={{
                        color: "rgba(255, 255, 255, 0.8)",
                        fontSize: "0.9rem",
                      }}
                    >
                      已送达包裹数
                    </div>
                  </div>
                </div>
              </div>

              {/* 骑手收入统计 (当月) */}
              <div style={{ marginBottom: "24px" }}>
                <h4
                  style={{
                    color: "rgba(255, 255, 255, 0.9)",
                    marginBottom: "12px",
                  }}
                >
                  💰 骑手收入统计 (当月)
                </h4>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile
                      ? "1fr"
                      : "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: isMobile ? "12px" : "16px",
                    marginBottom: "16px",
                  }}
                >
                  <div
                    style={{
                      background: "rgba(34, 197, 94, 0.2)",
                      border: "1px solid rgba(34, 197, 94, 0.3)",
                      borderRadius: "12px",
                      padding: "16px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        color: "#22c55e",
                        fontSize: "1.5rem",
                        fontWeight: "bold",
                      }}
                    >
                      {summary.monthlyRiderCount}
                    </div>
                    <div
                      style={{
                        color: "rgba(255, 255, 255, 0.8)",
                        fontSize: "0.9rem",
                      }}
                    >
                      当月送达总笔数
                    </div>
                  </div>
                  <div
                    style={{
                      background: "rgba(34, 197, 94, 0.2)",
                      border: "1px solid rgba(34, 197, 94, 0.3)",
                      borderRadius: "12px",
                      padding: "16px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        color: "#22c55e",
                        fontSize: "1.5rem",
                        fontWeight: "bold",
                      }}
                    >
                      {summary.monthlyRiderFee.toLocaleString()} MMK
                    </div>
                    <div
                      style={{
                        color: "rgba(255, 255, 255, 0.8)",
                        fontSize: "0.9rem",
                      }}
                    >
                      当月骑手收入总额
                    </div>
                  </div>
                </div>
              </div>

              {/* 骑手收入统计 (当日) */}
              <div style={{ marginBottom: "24px" }}>
                <h4
                  style={{
                    color: "rgba(255, 255, 255, 0.9)",
                    marginBottom: "12px",
                  }}
                >
                  ⏰ 骑手收入统计 (当日 - {cashCollectionDate})
                </h4>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile
                      ? "1fr"
                      : "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: isMobile ? "12px" : "16px",
                    marginBottom: "16px",
                  }}
                >
                  <div
                    style={{
                      background: "rgba(251, 197, 49, 0.15)",
                      border: "1px solid rgba(251, 197, 49, 0.3)",
                      borderRadius: "12px",
                      padding: "16px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        color: "#fbc531",
                        fontSize: "1.5rem",
                        fontWeight: "bold",
                      }}
                    >
                      {summary.dailyRiderCount}
                    </div>
                    <div
                      style={{
                        color: "rgba(255, 255, 255, 0.8)",
                        fontSize: "0.9rem",
                      }}
                    >
                      当日送达总笔数
                    </div>
                  </div>
                  <div
                    style={{
                      background: "rgba(251, 197, 49, 0.15)",
                      border: "1px solid rgba(251, 197, 49, 0.3)",
                      borderRadius: "12px",
                      padding: "16px",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        color: "#fbc531",
                        fontSize: "1.5rem",
                        fontWeight: "bold",
                      }}
                    >
                      {summary.dailyRiderFee.toLocaleString()} MMK
                    </div>
                    <div
                      style={{
                        color: "rgba(255, 255, 255, 0.8)",
                        fontSize: "0.9rem",
                      }}
                    >
                      当日骑手收入总额
                    </div>
                  </div>
                </div>
              </div>

              {/* 骑手送货费用明细表 */}
              <div style={{ marginTop: "24px", marginBottom: "24px" }}>
                <h4
                  style={{
                    color: "rgba(255, 255, 255, 0.9)",
                    marginBottom: "12px",
                  }}
                >
                  📋 骑手送货费用明细 (按骑手统计)
                </h4>
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    borderRadius: "12px",
                    overflow: "hidden",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "rgba(255, 255, 255, 0.1)" }}>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: "white",
                            fontSize: "0.9rem",
                          }}
                        >
                          骑手ID
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: "white",
                            fontSize: "0.9rem",
                          }}
                        >
                          送达包裹数
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: "white",
                            fontSize: "0.9rem",
                          }}
                        >
                          总送货距离
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: "white",
                            fontSize: "0.9rem",
                          }}
                        >
                          骑手收入 (总费 - 起步价)
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: "white",
                            fontSize: "0.9rem",
                          }}
                        >
                          平均每单距离
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        // 按骑手分组统计
                        const courierStats: Record<
                          string,
                          {
                            count: number;
                            totalKm: number;
                            totalRiderFee: number;
                          }
                        > = {};
                        const BASE_FEE = pricingSettings.base_fee || 1500;

                        packages
                          .filter(
                            (pkg) =>
                              pkg.status === "已送达" &&
                              pkg.courier &&
                              pkg.courier !== "待分配",
                          )
                          .forEach((pkg) => {
                            const courierId = pkg.courier;
                            if (!courierStats[courierId]) {
                              courierStats[courierId] = {
                                count: 0,
                                totalKm: 0,
                                totalRiderFee: 0,
                              };
                            }

                            const pkgPrice = parseFloat(
                              pkg.price?.replace(/[^\d.]/g, "") || "0",
                            );
                            const riderFee = Math.max(0, pkgPrice - BASE_FEE);

                            courierStats[courierId].count++;
                            courierStats[courierId].totalKm +=
                              pkg.delivery_distance || 0;
                            courierStats[courierId].totalRiderFee += riderFee;
                          });

                        const courierList = Object.entries(courierStats).sort(
                          (a, b) => b[1].totalRiderFee - a[1].totalRiderFee,
                        );

                        if (courierList.length === 0) {
                          return (
                            <tr>
                              <td
                                colSpan={5}
                                style={{
                                  padding: "24px",
                                  textAlign: "center",
                                  color: "rgba(255, 255, 255, 0.6)",
                                }}
                              >
                                暂无骑手配送记录
                              </td>
                            </tr>
                          );
                        }

                        return courierList.map(([courierId, stats]) => {
                          const avgKm = stats.totalKm / stats.count;

                          return (
                            <tr
                              key={courierId}
                              style={{
                                borderBottom:
                                  "1px solid rgba(255, 255, 255, 0.1)",
                              }}
                            >
                              <td
                                style={{
                                  padding: "12px",
                                  color: "rgba(255, 255, 255, 0.8)",
                                  fontSize: "0.9rem",
                                  fontWeight: "bold",
                                }}
                              >
                                {courierId}
                              </td>
                              <td
                                style={{
                                  padding: "12px",
                                  color: "rgba(255, 255, 255, 0.8)",
                                  fontSize: "0.9rem",
                                }}
                              >
                                {stats.count} 个
                              </td>
                              <td
                                style={{
                                  padding: "12px",
                                  color: "rgba(255, 255, 255, 0.8)",
                                  fontSize: "0.9rem",
                                }}
                              >
                                <span
                                  style={{
                                    color: "#74b9ff",
                                    fontWeight: "bold",
                                  }}
                                >
                                  {stats.totalKm.toFixed(2)} KM
                                </span>
                              </td>
                              <td
                                style={{
                                  padding: "12px",
                                  color: "rgba(255, 255, 255, 0.8)",
                                  fontSize: "0.9rem",
                                }}
                              >
                                <span
                                  style={{
                                    color: "#fd79a8",
                                    fontWeight: "bold",
                                  }}
                                >
                                  {stats.totalRiderFee.toLocaleString()} MMK
                                </span>
                              </td>
                              <td
                                style={{
                                  padding: "12px",
                                  color: "rgba(255, 255, 255, 0.8)",
                                  fontSize: "0.9rem",
                                }}
                              >
                                {avgKm.toFixed(2)} KM
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 骑手当日送货费用明细表 */}
              <div style={{ marginTop: "24px" }}>
                <h4
                  style={{
                    color: "rgba(255, 255, 255, 0.9)",
                    marginBottom: "12px",
                  }}
                >
                  📄 骑手送货费用 (当日明细 - {cashCollectionDate})
                </h4>
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    borderRadius: "12px",
                    overflow: "hidden",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "rgba(255, 255, 255, 0.1)" }}>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: "white",
                            fontSize: "0.9rem",
                          }}
                        >
                          骑手ID
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: "white",
                            fontSize: "0.9rem",
                          }}
                        >
                          订单号
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: "white",
                            fontSize: "0.9rem",
                          }}
                        >
                          总跑腿费
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: "white",
                            fontSize: "0.9rem",
                          }}
                        >
                          起步价(平台)
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: "white",
                            fontSize: "0.9rem",
                          }}
                        >
                          骑手应得
                        </th>
                        <th
                          style={{
                            padding: "12px",
                            textAlign: "left",
                            color: "white",
                            fontSize: "0.9rem",
                          }}
                        >
                          送达时间
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const BASE_FEE = pricingSettings.base_fee || 1500;
                        const todayDelivered = packages
                          .filter((pkg) => {
                            if (
                              pkg.status !== "已送达" &&
                              pkg.status !== "已完成"
                            )
                              return false;
                            const dateKey = getDateKey(
                              pkg.delivery_time ||
                                pkg.updated_at ||
                                pkg.created_at,
                            );
                            return dateKey === cashCollectionDate;
                          })
                          .sort((a, b) => {
                            const timeA = new Date(
                              a.delivery_time || a.updated_at || 0,
                            ).getTime();
                            const timeB = new Date(
                              b.delivery_time || b.updated_at || 0,
                            ).getTime();
                            return timeB - timeA;
                          });

                        if (todayDelivered.length === 0) {
                          return (
                            <tr>
                              <td
                                colSpan={6}
                                style={{
                                  padding: "24px",
                                  textAlign: "center",
                                  color: "rgba(255, 255, 255, 0.6)",
                                }}
                              >
                                所选日期内无配送完成记录
                              </td>
                            </tr>
                          );
                        }

                        return todayDelivered.map((pkg) => {
                          const pkgPrice = parseFloat(
                            pkg.price?.replace(/[^\d.]/g, "") || "0",
                          );
                          const riderShare = Math.max(0, pkgPrice - BASE_FEE);

                          return (
                            <tr
                              key={pkg.id}
                              style={{
                                borderBottom:
                                  "1px solid rgba(255, 255, 255, 0.1)",
                              }}
                            >
                              <td
                                style={{
                                  padding: "12px",
                                  color: "white",
                                  fontSize: "0.9rem",
                                  fontWeight: "bold",
                                }}
                              >
                                {pkg.courier || "N/A"}
                              </td>
                              <td
                                style={{
                                  padding: "12px",
                                  color: "#74b9ff",
                                  fontSize: "0.85rem",
                                }}
                              >
                                {pkg.id}
                              </td>
                              <td
                                style={{
                                  padding: "12px",
                                  color: "rgba(255, 255, 255, 0.8)",
                                  fontSize: "0.9rem",
                                }}
                              >
                                {pkgPrice.toLocaleString()}
                              </td>
                              <td
                                style={{
                                  padding: "12px",
                                  color: "rgba(255, 255, 255, 0.6)",
                                  fontSize: "0.9rem",
                                }}
                              >
                                {BASE_FEE.toLocaleString()}
                              </td>
                              <td
                                style={{
                                  padding: "12px",
                                  color: "#fd79a8",
                                  fontSize: "0.9rem",
                                  fontWeight: "bold",
                                }}
                              >
                                {riderShare.toLocaleString()} MMK
                              </td>
                              <td
                                style={{
                                  padding: "12px",
                                  color: "rgba(255, 255, 255, 0.5)",
                                  fontSize: "0.8rem",
                                }}
                              >
                                {pkg.delivery_time
                                  ? new Date(
                                      pkg.delivery_time,
                                    ).toLocaleTimeString()
                                  : "N/A"}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* 工资详情模态框 */}
            {showSalaryDetail && selectedSalary && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "rgba(0, 0, 0, 0.8)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  zIndex: 1000,
                  padding: isMobile ? "12px" : "20px",
                }}
                onClick={() => setShowSalaryDetail(false)}
              >
                <div
                  style={{
                    background:
                      "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)",
                    borderRadius: "20px",
                    padding: "32px",
                    maxWidth: "600px",
                    width: "100%",
                    maxHeight: "80vh",
                    overflow: "auto",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "24px",
                    }}
                  >
                    <h2
                      style={{ margin: 0, color: "white", fontSize: "1.5rem" }}
                    >
                      💰 工资详情
                    </h2>
                    <button
                      onClick={() => setShowSalaryDetail(false)}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "8px",
                        border: "none",
                        background: "rgba(255, 255, 255, 0.2)",
                        color: "white",
                        cursor: "pointer",
                        fontSize: "0.9rem",
                      }}
                    >
                      关闭
                    </button>
                  </div>

                  {/* 基本信息 */}
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.1)",
                      borderRadius: "12px",
                      padding: isMobile ? "12px" : "20px",
                      marginBottom: "20px",
                    }}
                  >
                    <h3
                      style={{
                        margin: "0 0 16px 0",
                        color: "white",
                        fontSize: "1.1rem",
                      }}
                    >
                      基本信息
                    </h3>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isMobile
                          ? "1fr"
                          : "repeat(2, 1fr)",
                        gap: "12px",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            color: "rgba(255, 255, 255, 0.7)",
                            fontSize: "0.85rem",
                            marginBottom: "4px",
                          }}
                        >
                          骑手ID
                        </div>
                        <div
                          style={{
                            color: "white",
                            fontSize: "1rem",
                            fontWeight: "600",
                          }}
                        >
                          {selectedSalary.courier_id}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            color: "rgba(255, 255, 255, 0.7)",
                            fontSize: "0.85rem",
                            marginBottom: "4px",
                          }}
                        >
                          结算周期
                        </div>
                        <div style={{ color: "white", fontSize: "0.9rem" }}>
                          {selectedSalary.period_start_date} ~{" "}
                          {selectedSalary.period_end_date}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            color: "rgba(255, 255, 255, 0.7)",
                            fontSize: "0.85rem",
                            marginBottom: "4px",
                          }}
                        >
                          配送单数
                        </div>
                        <div
                          style={{
                            color: "#74b9ff",
                            fontSize: "1rem",
                            fontWeight: "600",
                          }}
                        >
                          {selectedSalary.total_deliveries} 单
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            color: "rgba(255, 255, 255, 0.7)",
                            fontSize: "0.85rem",
                            marginBottom: "4px",
                          }}
                        >
                          配送距离
                        </div>
                        <div
                          style={{
                            color: "#fd79a8",
                            fontSize: "1rem",
                            fontWeight: "600",
                          }}
                        >
                          {selectedSalary.total_km.toFixed(1)} KM
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 工资组成 */}
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.1)",
                      borderRadius: "12px",
                      padding: isMobile ? "12px" : "20px",
                    }}
                  >
                    <h3
                      style={{
                        margin: "0 0 16px 0",
                        color: "white",
                        fontSize: "1.1rem",
                      }}
                    >
                      工资组成
                    </h3>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "8px 0",
                          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                        }}
                      >
                        <span style={{ color: "rgba(255, 255, 255, 0.8)" }}>
                          基本工资
                        </span>
                        <span style={{ color: "white", fontWeight: "600" }}>
                          {selectedSalary.base_salary.toLocaleString()} MMK
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "8px 0",
                          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                        }}
                      >
                        <span style={{ color: "rgba(255, 255, 255, 0.8)" }}>
                          送货费
                        </span>
                        <span style={{ color: "#74b9ff", fontWeight: "600" }}>
                          +{selectedSalary.km_fee.toLocaleString()} MMK
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "8px 0",
                          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                        }}
                      >
                        <span style={{ color: "rgba(255, 255, 255, 0.8)" }}>
                          配送奖金
                        </span>
                        <span style={{ color: "#a29bfe", fontWeight: "600" }}>
                          +{selectedSalary.delivery_bonus.toLocaleString()} MMK
                        </span>
                      </div>
                      {selectedSalary.performance_bonus > 0 && (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "8px 0",
                            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                          }}
                        >
                          <span style={{ color: "rgba(255, 255, 255, 0.8)" }}>
                            绩效奖金
                          </span>
                          <span style={{ color: "#55efc4", fontWeight: "600" }}>
                            +{selectedSalary.performance_bonus.toLocaleString()}{" "}
                            MMK
                          </span>
                        </div>
                      )}
                      {selectedSalary.deduction_amount > 0 && (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "8px 0",
                            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                          }}
                        >
                          <span style={{ color: "rgba(255, 255, 255, 0.8)" }}>
                            扣款
                          </span>
                          <span style={{ color: "#ff7675", fontWeight: "600" }}>
                            -{selectedSalary.deduction_amount.toLocaleString()}{" "}
                            MMK
                          </span>
                        </div>
                      )}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "12px 0",
                          marginTop: "8px",
                          borderTop: "2px solid rgba(255, 255, 255, 0.3)",
                        }}
                      >
                        <span
                          style={{
                            color: "white",
                            fontSize: "1.1rem",
                            fontWeight: "600",
                          }}
                        >
                          实发工资
                        </span>
                        <span
                          style={{
                            color: "#55efc4",
                            fontSize: "1.3rem",
                            fontWeight: "bold",
                          }}
                        >
                          {selectedSalary.net_salary.toLocaleString()} MMK
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 发放工资模态框 */}
            {/* 🚀 生成工资骑手选择弹窗 */}
            {showSalarySelectionModal && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "rgba(0, 0, 0, 0.75)",
                  backdropFilter: "blur(8px)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  zIndex: 2000,
                  padding: "20px",
                }}
              >
                <div
                  style={{
                    background:
                      "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)",
                    borderRadius: "24px",
                    padding: "32px",
                    width: "100%",
                    maxWidth: "600px",
                    maxHeight: "80vh",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "24px",
                    }}
                  >
                    <h2
                      style={{
                        margin: 0,
                        color: "white",
                        fontSize: "1.5rem",
                        fontWeight: 800,
                      }}
                    >
                      选择生成工资的骑手
                    </h2>
                    <button
                      onClick={() => setShowSalarySelectionModal(false)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "rgba(255,255,255,0.6)",
                        cursor: "pointer",
                        fontSize: "1.5rem",
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "12px 16px",
                      background: "rgba(255,255,255,0.05)",
                      borderRadius: "12px",
                      marginBottom: "16px",
                    }}
                  >
                    <div
                      style={{
                        color: "rgba(255,255,255,0.7)",
                        fontSize: "0.9rem",
                      }}
                    >
                      本月有待结算订单的骑手:{" "}
                      <strong style={{ color: "#4facfe" }}>
                        {Object.keys(courierSalaryGroups).length}
                      </strong>{" "}
                      名
                    </div>
                    <button
                      onClick={() => {
                        if (
                          selectedCouriersForSalary.size ===
                          Object.keys(courierSalaryGroups).length
                        ) {
                          setSelectedCouriersForSalary(new Set());
                        } else {
                          setSelectedCouriersForSalary(
                            new Set(Object.keys(courierSalaryGroups)),
                          );
                        }
                      }}
                      style={{
                        background: "rgba(255,255,255,0.1)",
                        border: "1px solid rgba(255,255,255,0.2)",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        color: "white",
                        fontSize: "0.85rem",
                        cursor: "pointer",
                      }}
                    >
                      {selectedCouriersForSalary.size ===
                      Object.keys(courierSalaryGroups).length
                        ? "取消全选"
                        : "全选"}
                    </button>
                  </div>

                  <div
                    style={{
                      flex: 1,
                      overflowY: "auto",
                      paddingRight: "8px",
                      marginBottom: "24px",
                    }}
                  >
                    {Object.keys(courierSalaryGroups).length === 0 ? (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "40px",
                          color: "rgba(255,255,255,0.4)",
                        }}
                      >
                        暂无本月待结算的骑手数据
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr",
                          gap: "10px",
                        }}
                      >
                        {Object.entries(courierSalaryGroups).map(
                          ([courierId, pkgs]) => {
                            const isSelected =
                              selectedCouriersForSalary.has(courierId);
                            const totalKm = pkgs.reduce(
                              (sum, pkg) => sum + (pkg.delivery_distance || 0),
                              0,
                            );

                            return (
                              <div
                                key={courierId}
                                onClick={() => {
                                  const next = new Set(
                                    selectedCouriersForSalary,
                                  );
                                  if (next.has(courierId))
                                    next.delete(courierId);
                                  else next.add(courierId);
                                  setSelectedCouriersForSalary(next);
                                }}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "15px",
                                  padding: "16px",
                                  borderRadius: "12px",
                                  background: isSelected
                                    ? "rgba(59, 130, 246, 0.15)"
                                    : "rgba(255,255,255,0.03)",
                                  border: `1px solid ${isSelected ? "rgba(59, 130, 246, 0.4)" : "rgba(255,255,255,0.08)"}`,
                                  cursor: "pointer",
                                  transition: "all 0.2s",
                                }}
                              >
                                <div
                                  style={{
                                    width: "24px",
                                    height: "24px",
                                    borderRadius: "6px",
                                    border: isSelected
                                      ? "none"
                                      : "2px solid rgba(255,255,255,0.3)",
                                    background: isSelected
                                      ? "#3b82f6"
                                      : "transparent",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  {isSelected && (
                                    <span
                                      style={{
                                        color: "white",
                                        fontWeight: "bold",
                                      }}
                                    >
                                      ✓
                                    </span>
                                  )}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div
                                    style={{
                                      color: "white",
                                      fontWeight: 700,
                                      fontSize: "1.05rem",
                                    }}
                                  >
                                    {courierId}
                                  </div>
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: "15px",
                                      marginTop: "4px",
                                    }}
                                  >
                                    <span
                                      style={{
                                        color: "rgba(255,255,255,0.5)",
                                        fontSize: "0.8rem",
                                      }}
                                    >
                                      📦 {pkgs.length} 单
                                    </span>
                                    <span
                                      style={{
                                        color: "rgba(255,255,255,0.5)",
                                        fontSize: "0.8rem",
                                      }}
                                    >
                                      🛣️ {totalKm.toFixed(1)} KM
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          },
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "12px" }}>
                    <button
                      onClick={() => setShowSalarySelectionModal(false)}
                      style={{
                        flex: 1,
                        padding: "14px",
                        borderRadius: "12px",
                        border: "1px solid rgba(255,255,255,0.2)",
                        background: "rgba(255,255,255,0.05)",
                        color: "white",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      取消
                    </button>
                    <button
                      onClick={generateMonthlySalaries}
                      disabled={selectedCouriersForSalary.size === 0}
                      style={{
                        flex: 2,
                        padding: "14px",
                        borderRadius: "12px",
                        border: "none",
                        background:
                          selectedCouriersForSalary.size === 0
                            ? "#4a5568"
                            : "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                        color: "#05223b",
                        fontWeight: 800,
                        cursor:
                          selectedCouriersForSalary.size === 0
                            ? "not-allowed"
                            : "pointer",
                        boxShadow:
                          selectedCouriersForSalary.size === 0
                            ? "none"
                            : "0 10px 20px rgba(79, 172, 254, 0.3)",
                      }}
                    >
                      确认生成 ({selectedCouriersForSalary.size} 名)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showPaymentModal && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "rgba(0, 0, 0, 0.8)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  zIndex: 1000,
                  padding: isMobile ? "12px" : "20px",
                }}
                onClick={() => setShowPaymentModal(false)}
              >
                <div
                  style={{
                    background:
                      "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)",
                    borderRadius: "20px",
                    padding: "32px",
                    maxWidth: "500px",
                    width: "100%",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h2
                    style={{
                      margin: "0 0 24px 0",
                      color: "white",
                      fontSize: "1.5rem",
                    }}
                  >
                    💳 发放工资
                  </h2>

                  <div style={{ marginBottom: "16px" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        color: "rgba(255, 255, 255, 0.9)",
                        fontSize: "0.95rem",
                      }}
                    >
                      发放方式 *
                    </label>
                    <select
                      value={paymentForm.payment_method}
                      onChange={(e) =>
                        setPaymentForm({
                          ...paymentForm,
                          payment_method: e.target.value,
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "12px",
                        borderRadius: "10px",
                        border: "1px solid rgba(255, 255, 255, 0.25)",
                        background: "rgba(7, 23, 53, 0.65)",
                        color: "white",
                        fontSize: "0.95rem",
                      }}
                    >
                      <option value="cash">现金</option>
                      <option value="bank_transfer">银行转账</option>
                      <option value="kbz_pay">KBZ Pay</option>
                      <option value="wave_money">Wave Money</option>
                      <option value="mobile_money">其他移动支付</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: "16px" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        color: "rgba(255, 255, 255, 0.9)",
                        fontSize: "0.95rem",
                      }}
                    >
                      支付凭证号
                    </label>
                    <input
                      type="text"
                      value={paymentForm.payment_reference}
                      onChange={(e) =>
                        setPaymentForm({
                          ...paymentForm,
                          payment_reference: e.target.value,
                        })
                      }
                      placeholder="银行单号/交易号"
                      style={{
                        width: "100%",
                        padding: "12px",
                        borderRadius: "10px",
                        border: "none",
                        background: "rgba(255, 255, 255, 0.18)",
                        color: "white",
                        fontSize: "0.95rem",
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: "24px" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "8px",
                        color: "rgba(255, 255, 255, 0.9)",
                        fontSize: "0.95rem",
                      }}
                    >
                      发放日期 *
                    </label>
                    <input
                      type="date"
                      value={paymentForm.payment_date}
                      onChange={(e) =>
                        setPaymentForm({
                          ...paymentForm,
                          payment_date: e.target.value,
                        })
                      }
                      style={{
                        width: "100%",
                        padding: "12px",
                        borderRadius: "10px",
                        border: "none",
                        background: "rgba(255, 255, 255, 0.18)",
                        color: "white",
                        fontSize: "0.95rem",
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: "12px" }}>
                    <button
                      onClick={() => setShowPaymentModal(false)}
                      style={{
                        flex: 1,
                        padding: "12px",
                        borderRadius: "10px",
                        border: "1px solid rgba(255, 255, 255, 0.3)",
                        background: "transparent",
                        color: "white",
                        cursor: "pointer",
                        fontSize: "0.95rem",
                        fontWeight: "600",
                      }}
                    >
                      取消
                    </button>
                    <button
                      onClick={async () => {
                        if (
                          !window.confirm(
                            `确认发放 ${selectedSalaries.length} 条工资？`,
                          )
                        )
                          return;

                        setLoading(true);
                        try {
                          let successCount = 0;
                          for (const salaryId of selectedSalaries) {
                            const success =
                              await courierSalaryService.paySalary(salaryId, {
                                payment_method: paymentForm.payment_method,
                                payment_reference:
                                  paymentForm.payment_reference,
                                payment_date: paymentForm.payment_date,
                              });

                            if (success) {
                              successCount++;

                              // 新增逻辑：标记相关包裹为已结算
                              const salaryRecord = courierSalaries.find(
                                (s) => s.id === salaryId,
                              );
                              if (
                                salaryRecord &&
                                salaryRecord.related_package_ids
                              ) {
                                await courierSalaryService.markPackagesAsSettled(
                                  salaryRecord.related_package_ids,
                                );
                              }
                            }
                          }

                          window.alert(`成功发放 ${successCount} 条工资！`);
                          await loadRecords();
                          setShowPaymentModal(false);
                          setSelectedSalaries([]);
                        } catch (error) {
                          console.error("发放工资失败:", error);
                          window.alert("发放工资失败！");
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      style={{
                        flex: 1,
                        padding: "12px",
                        borderRadius: "10px",
                        border: "none",
                        background: loading
                          ? "rgba(240, 147, 251, 0.5)"
                          : "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                        color: "white",
                        cursor: loading ? "not-allowed" : "pointer",
                        fontSize: "0.95rem",
                        fontWeight: "600",
                      }}
                    >
                      确认发放
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "cash_collection" && (
          <div>
            {/* 顶部标题和统计 */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.12)",
                borderRadius: "16px",
                padding: isMobile ? "16px" : "24px",
                marginBottom: "24px",
                border: "1px solid rgba(255, 255, 255, 0.18)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "20px",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <h3 style={{ margin: 0, color: "white", fontSize: "1.5rem" }}>
                  💵 {t.cashCollection}
                </h3>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: "rgba(0, 0, 0, 0.3)",
                    padding: "4px 8px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                  }}
                >
                  <button
                    onClick={() => {
                      const date = new Date(cashCollectionDate);
                      date.setDate(date.getDate() - 1);
                      setCashCollectionDate(date.toISOString().split("T")[0]);
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "white",
                      cursor: "pointer",
                      fontSize: "1.2rem",
                      padding: "0 8px",
                      fontWeight: "bold",
                      opacity: 0.8,
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.opacity = "1")}
                    onMouseOut={(e) => (e.currentTarget.style.opacity = "0.8")}
                    title={t.prevDay}
                  >
                    &lt;
                  </button>

                  <input
                    type="date"
                    value={cashCollectionDate}
                    onChange={(e) => setCashCollectionDate(e.target.value)}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      border: "none",
                      background: "transparent",
                      color: "white",
                      fontSize: "1rem",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      outline: "none",
                    }}
                  />

                  <button
                    onClick={() => {
                      const date = new Date(cashCollectionDate);
                      date.setDate(date.getDate() + 1);
                      setCashCollectionDate(date.toISOString().split("T")[0]);
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "white",
                      cursor: "pointer",
                      fontSize: "1.2rem",
                      padding: "0 8px",
                      fontWeight: "bold",
                      opacity: 0.8,
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.opacity = "1")}
                    onMouseOut={(e) => (e.currentTarget.style.opacity = "0.8")}
                    title={t.nextDay}
                  >
                    &gt;
                  </button>

                  <button
                    onClick={() =>
                      setCashCollectionDate(
                        new Date().toISOString().split("T")[0],
                      )
                    }
                    style={{
                      background: "rgba(255, 255, 255, 0.1)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      borderRadius: "4px",
                      color: "white",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      padding: "4px 10px",
                      marginLeft: "8px",
                      fontWeight: "500",
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(255, 255, 255, 0.2)")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(255, 255, 255, 0.1)")
                    }
                  >
                    {t.today}
                  </button>
                </div>

                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span
                    style={{
                      color: "rgba(255,255,255,0.7)",
                      fontSize: "0.9rem",
                    }}
                  >
                    {t.statusFilter}:
                  </span>
                  <select
                    value={cashSettlementStatus}
                    onChange={(e) =>
                      setCashSettlementStatus(e.target.value as any)
                    }
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255, 255, 255, 0.3)",
                      background: "rgba(0, 0, 0, 0.3)",
                      color: "white",
                      fontSize: "0.9rem",
                      cursor: "pointer",
                    }}
                  >
                    <option value="unsettled" style={{ color: "#000" }}>
                      {t.unsettled}
                    </option>
                    <option value="settled" style={{ color: "#000" }}>
                      {t.settled}
                    </option>
                    <option value="all" style={{ color: "#000" }}>
                      {t.all}
                    </option>
                  </select>
                </div>
              </div>

              {/* 统计卡片 */}
              {(() => {
                const cashPackages = packages.filter((pkg) => {
                  if (pkg.payment_method !== "cash") return false;
                  if (pkg.status !== "已送达" && pkg.status !== "已完成")
                    return false;

                  // 结清状态过滤
                  if (cashSettlementStatus === "unsettled" && pkg.rider_settled)
                    return false;
                  if (cashSettlementStatus === "settled" && !pkg.rider_settled)
                    return false;

                  // 日期筛选：按日期精确匹配
                  const dateKey = getDateKey(
                    pkg.delivery_time ||
                      pkg.updated_at ||
                      pkg.created_at ||
                      pkg.create_time,
                  );
                  if (!dateKey || dateKey !== cashCollectionDate) return false;

                  // 领区过滤
                  if (isRegionalUser && !pkg.id.startsWith(currentRegionPrefix))
                    return false;

                  return true;
                });

                let totalDeliveryFee = 0;
                let totalCOD = 0;
                let totalPlatformPayment = 0;

                cashPackages.forEach((pkg) => {
                  const price = parseFloat(
                    pkg.price?.replace(/[^\d.]/g, "") || "0",
                  );
                  totalDeliveryFee += price;

                  // Check merchants
                  const isStoreMatch = deliveryStores.some(
                    (store) =>
                      store.store_name === pkg.sender_name ||
                      (pkg.sender_name &&
                        pkg.sender_name.startsWith(store.store_name)),
                  );
                  const isMerchant = !!pkg.delivery_store_id || isStoreMatch;
                  if (isMerchant) {
                    totalCOD += Number(pkg.cod_amount || 0);
                  }

                  // 🚀 新增：累加平台支付金额
                  const payMatch = pkg.description?.match(
                    /\[(?:付给商家|Pay to Merchant|ဆိုင်သို့ ပေးချေရန်|骑手代付|Courier Advance Pay|ကောင်ရီယာမှ ကြိုတင်ပေးချေခြင်း|平台支付|Platform Payment|ပလက်ဖောင်းမှ ပေးချေခြင်း): (.*?) MMK\]/,
                  );
                  if (payMatch && payMatch[1]) {
                    totalPlatformPayment += parseFloat(
                      payMatch[1].replace(/[^\d.]/g, "") || "0",
                    );
                  }
                });

                const totalAmount = totalDeliveryFee + totalCOD;

                return (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile
                        ? "1fr"
                        : "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: "16px",
                    }}
                  >
                    {/* 总跑腿费 */}
                    <div
                      style={{
                        background: "rgba(254, 243, 199, 0.2)",
                        borderRadius: "12px",
                        padding: "20px",
                        border: "1px solid rgba(254, 243, 199, 0.3)",
                      }}
                    >
                      <div
                        style={{
                          color: "#fef3c7",
                          fontSize: "0.9rem",
                          marginBottom: "8px",
                        }}
                      >
                        {language === "my"
                          ? "စုစုပေါင်း ပို့ဆောင်ခ"
                          : "总跑腿费"}
                      </div>
                      <div
                        style={{
                          color: "white",
                          fontSize: "1.5rem",
                          fontWeight: "bold",
                        }}
                      >
                        {totalDeliveryFee.toLocaleString()} MMK
                      </div>
                      <div
                        style={{
                          color: "rgba(255, 255, 255, 0.7)",
                          fontSize: "0.85rem",
                          marginTop: "4px",
                        }}
                      >
                        {cashPackages.length} {t.packageSuffix}
                      </div>
                    </div>

                    {/* 总代收款 */}
                    <div
                      style={{
                        background: "rgba(254, 202, 202, 0.2)",
                        borderRadius: "12px",
                        padding: "20px",
                        border: "1px solid rgba(254, 202, 202, 0.3)",
                      }}
                    >
                      <div
                        style={{
                          color: "#fecaca",
                          fontSize: "0.9rem",
                          marginBottom: "8px",
                        }}
                      >
                        {language === "my"
                          ? "စုစုပေါင်း ကိုယ်စားကောက်ခံငွေ"
                          : "总代收款"}
                      </div>
                      <div
                        style={{
                          color: "white",
                          fontSize: "1.5rem",
                          fontWeight: "bold",
                        }}
                      >
                        {totalCOD.toLocaleString()} MMK
                      </div>
                      <div
                        style={{
                          color: "rgba(255, 255, 255, 0.7)",
                          fontSize: "0.85rem",
                          marginTop: "4px",
                        }}
                      >
                        MERCHANTS{" "}
                        {language === "my" ? "ဆိုင်မှ ကောက်ခံငွေ" : "店铺代收"}
                      </div>
                    </div>

                    {/* 总金额 */}
                    <div
                      style={{
                        background: "rgba(167, 243, 208, 0.2)",
                        borderRadius: "12px",
                        padding: "20px",
                        border: "1px solid rgba(167, 243, 208, 0.3)",
                      }}
                    >
                      <div
                        style={{
                          color: "#a7f3d0",
                          fontSize: "0.9rem",
                          marginBottom: "8px",
                        }}
                      >
                        {language === "my"
                          ? "စုစုပေါင်း ပမာဏ (ပို့ဆောင်ခ+ကိုယ်စားကောက်)"
                          : t.totalAmount}
                      </div>
                      <div
                        style={{
                          color: "white",
                          fontSize: "1.5rem",
                          fontWeight: "bold",
                        }}
                      >
                        {totalAmount.toLocaleString()} MMK
                      </div>
                    </div>

                    {/* 🚀 新增：总平台支付 */}
                    <div
                      style={{
                        background: "rgba(59, 130, 246, 0.2)",
                        borderRadius: "12px",
                        padding: "20px",
                        border: "1px solid rgba(59, 130, 246, 0.3)",
                      }}
                    >
                      <div
                        style={{
                          color: "#93c5fd",
                          fontSize: "0.9rem",
                          marginBottom: "8px",
                        }}
                      >
                        {language === "my"
                          ? "စုစုပေါင်း ပလက်ဖောင်းမှပေးချေမှု"
                          : "总平台支付"}
                      </div>
                      <div
                        style={{
                          color: "white",
                          fontSize: "1.5rem",
                          fontWeight: "bold",
                        }}
                      >
                        {totalPlatformPayment.toLocaleString()} MMK
                      </div>
                      <div
                        style={{
                          color: "rgba(255, 255, 255, 0.7)",
                          fontSize: "0.85rem",
                          marginTop: "4px",
                        }}
                      >
                        {language === "my"
                          ? "လက်ကျန်ငွေဖြင့် ပေးချေခြင်း"
                          : "余额支付汇总"}
                      </div>
                    </div>

                    {/* 快递员数 */}
                    <div
                      style={{
                        background: "rgba(219, 234, 254, 0.2)",
                        borderRadius: "12px",
                        padding: "20px",
                        border: "1px solid rgba(219, 234, 254, 0.3)",
                      }}
                    >
                      <div
                        style={{
                          color: "#dbeafe",
                          fontSize: "0.9rem",
                          marginBottom: "8px",
                        }}
                      >
                        {t.totalCourierCount}
                      </div>
                      <div
                        style={{
                          color: "white",
                          fontSize: "1.5rem",
                          fontWeight: "bold",
                        }}
                      >
                        {couriers.length}
                      </div>
                      <div
                        style={{
                          color: "rgba(255, 255, 255, 0.7)",
                          fontSize: "0.85rem",
                          marginTop: "4px",
                        }}
                      >
                        {couriers.length} {t.courierSuffix}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* 快递员列表 */}
            {(() => {
              // 筛选符合条件的包裹：现金支付、已送达、符合结清状态、且符合日期
              const cashPackages = packages.filter((pkg) => {
                if (pkg.payment_method !== "cash") return false;
                if (pkg.status !== "已送达" && pkg.status !== "已完成")
                  return false;

                // 结清状态过滤
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
                return Boolean(dateKey && dateKey === cashCollectionDate);
              });

              const courierCashMap: Record<
                string,
                { packages: Package[]; total: number }
              > = {};

              cashPackages.forEach((pkg) => {
                const courier = pkg.courier || "未分配";
                if (!courierCashMap[courier]) {
                  courierCashMap[courier] = { packages: [], total: 0 };
                }
                courierCashMap[courier].packages.push(pkg);
                const price = parseFloat(
                  pkg.price?.replace(/[^\d.]/g, "") || "0",
                );
                courierCashMap[courier].total += price;
              });

              // 过滤快递员列表（如果为领区用户，仅显示所属领区的骑手）
              let displayCouriers = [...couriers];
              if (isRegionalUser) {
                displayCouriers = displayCouriers.filter(
                  (c) =>
                    c.employee_id &&
                    c.employee_id.startsWith(currentRegionPrefix),
                );
              }

              if (displayCouriers.length === 0) {
                return (
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.12)",
                      borderRadius: "16px",
                      padding: "60px 20px",
                      textAlign: "center",
                      border: "1px solid rgba(255, 255, 255, 0.18)",
                    }}
                  >
                    <div style={{ fontSize: "3rem", marginBottom: "16px" }}>
                      🚚
                    </div>
                    <div
                      style={{
                        color: "rgba(255, 255, 255, 0.7)",
                        fontSize: "1.1rem",
                      }}
                    >
                      暂无快递员数据
                    </div>
                  </div>
                );
              }

              return (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  {displayCouriers.map((courier) => {
                    const courierName = courier.name || "未知";
                    const employeeId = courier.employee_id || "无";
                    const cashData = courierCashMap[courierName] || {
                      packages: [],
                      total: 0,
                    };

                    return (
                      <div
                        key={courier.id}
                        style={{
                          background:
                            "linear-gradient(145deg, rgba(30, 58, 138, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%)",
                          borderRadius: "20px",
                          padding: isMobile ? "20px" : "24px",
                          border: "1px solid rgba(255, 255, 255, 0.15)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: "16px",
                          backdropFilter: "blur(10px)",
                          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                          transition: "transform 0.3s ease",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.transform = "translateY(-4px)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.transform = "translateY(0)")
                        }
                      >
                        <div style={{ flex: 1, minWidth: "250px" }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "16px",
                              marginBottom: "12px",
                            }}
                          >
                            <div
                              style={{
                                width: "50px",
                                height: "50px",
                                borderRadius: "14px",
                                background: "rgba(59, 130, 246, 0.25)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "1.8rem",
                                border: "1px solid rgba(59, 130, 246, 0.3)",
                              }}
                            >
                              {courier.vehicle_type === "car" ? "🚗" : "🏍️"}
                            </div>
                            <div>
                              <h4
                                style={{
                                  margin: 0,
                                  color: "white",
                                  fontSize: "1.3rem",
                                  fontWeight: 800,
                                }}
                              >
                                {courierName}
                              </h4>
                              <div
                                style={{
                                  display: "flex",
                                  gap: "8px",
                                  marginTop: "4px",
                                  alignItems: "center",
                                }}
                              >
                                <span
                                  style={{
                                    background: "rgba(72, 187, 120, 0.15)",
                                    color: "#4ade80",
                                    padding: "2px 8px",
                                    borderRadius: "6px",
                                    fontSize: "0.8rem",
                                    fontWeight: 700,
                                    fontFamily: "monospace",
                                  }}
                                >
                                  #{employeeId}
                                </span>
                                <span
                                  style={{
                                    color: "rgba(255,255,255,0.5)",
                                    fontSize: "0.8rem",
                                    fontWeight: 600,
                                  }}
                                >
                                  {(() => {
                                    const r = REGIONS.find(
                                      (reg) =>
                                        reg.id === courier.region ||
                                        reg.prefix === courier.region,
                                    );
                                    return r ? r.prefix : courier.region || "-";
                                  })()}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div
                            style={{
                              background: "rgba(0,0,0,0.2)",
                              padding: "12px 16px",
                              borderRadius: "12px",
                              border: "1px solid rgba(255,255,255,0.05)",
                              display: "inline-block",
                            }}
                          >
                            <div
                              style={{
                                color: "rgba(255, 255, 255, 0.6)",
                                fontSize: "0.85rem",
                                marginBottom: "4px",
                              }}
                            >
                              {t.riderCollection}
                            </div>
                            <div
                              style={{
                                color:
                                  cashData.total > 0
                                    ? "#fbbf24"
                                    : "rgba(255,255,255,0.4)",
                                fontSize: "1.2rem",
                                fontWeight: 800,
                              }}
                            >
                              {cashData.total.toLocaleString()} MMK
                              <span
                                style={{
                                  fontSize: "0.85rem",
                                  fontWeight: 500,
                                  marginLeft: "8px",
                                  opacity: 0.7,
                                }}
                              >
                                ({cashData.packages.length} {t.packageSuffix})
                              </span>
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                            alignItems: isMobile ? "flex-start" : "flex-end",
                          }}
                        >
                          <div
                            style={{
                              background:
                                courier.status === "active"
                                  ? "rgba(16, 185, 129, 0.2)"
                                  : "rgba(239, 68, 68, 0.2)",
                              color:
                                courier.status === "active"
                                  ? "#10b981"
                                  : "#f87171",
                              padding: "6px 16px",
                              borderRadius: "10px",
                              fontSize: "0.85rem",
                              fontWeight: 800,
                              border: `1px solid ${courier.status === "active" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            <span
                              style={{
                                width: "6px",
                                height: "6px",
                                borderRadius: "50%",
                                background: "currentColor",
                                boxShadow: "0 0 8px currentColor",
                              }}
                            ></span>
                            {courier.status === "active" ? t.online : t.offline}
                          </div>

                          <button
                            onClick={() => {
                              setSelectedCourier(courierName);
                              setShowCashDetailModal(true);
                              setCashDetailDateFilter("all");
                              setCashDetailStartDate("");
                              setCashDetailEndDate("");
                              setSelectedCashPackages(new Set());
                              setClearedCashPackages(new Set());
                            }}
                            style={{
                              background:
                                cashData.packages.length > 0
                                  ? "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
                                  : "rgba(255, 255, 255, 0.1)",
                              color: "white",
                              border: "none",
                              padding: "12px 32px",
                              borderRadius: "12px",
                              fontSize: "1rem",
                              fontWeight: "bold",
                              cursor:
                                cashData.packages.length > 0
                                  ? "pointer"
                                  : "not-allowed",
                              opacity: cashData.packages.length > 0 ? 1 : 0.5,
                              transition: "all 0.3s ease",
                              boxShadow:
                                cashData.packages.length > 0
                                  ? "0 8px 20px rgba(59, 130, 246, 0.35)"
                                  : "none",
                            }}
                            disabled={cashData.packages.length === 0}
                            onMouseOver={(e) => {
                              if (cashData.packages.length > 0) {
                                e.currentTarget.style.transform = "scale(1.05)";
                                e.currentTarget.style.filter =
                                  "brightness(1.1)";
                              }
                            }}
                            onMouseOut={(e) => {
                              if (cashData.packages.length > 0) {
                                e.currentTarget.style.transform = "scale(1)";
                                e.currentTarget.style.filter = "brightness(1)";
                              }
                            }}
                          >
                            {t.viewDetail}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* 现金收款详情弹窗 */}
        {showCashDetailModal && selectedCourier && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.75)",
              backdropFilter: "blur(8px)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000,
              padding: isMobile ? "16px" : "20px",
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowCashDetailModal(false);
              }
            }}
          >
            <div
              style={{
                background:
                  "linear-gradient(145deg, #1a365d 0%, #2c5282 50%, #3182ce 100%)",
                borderRadius: "20px",
                padding: 0,
                border: "1px solid rgba(255, 255, 255, 0.15)",
                boxShadow: "0 25px 50px rgba(0, 0, 0, 0.5)",
                maxWidth: "900px",
                width: "100%",
                maxHeight: "90vh",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 弹窗头部 */}
              <div
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)",
                  padding: "24px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: "1.5rem",
                      fontWeight: 700,
                      color: "white",
                    }}
                  >
                    💵 {selectedCourier} - 现金收款详情
                  </h2>
                  <p
                    style={{
                      margin: "8px 0 0 0",
                      fontSize: "0.9rem",
                      color: "rgba(255,255,255,0.7)",
                    }}
                  >
                    查看该快递员的所有现金收款包裹
                  </p>
                </div>
                <button
                  onClick={() => setShowCashDetailModal(false)}
                  style={{
                    background: "rgba(255, 255, 255, 0.1)",
                    color: "white",
                    border: "1px solid rgba(255,255,255,0.2)",
                    padding: "8px 16px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontSize: "1rem",
                    fontWeight: "bold",
                    transition: "all 0.3s ease",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background =
                      "rgba(255, 255, 255, 0.2)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background =
                      "rgba(255, 255, 255, 0.1)";
                  }}
                >
                  ✕
                </button>
              </div>

              {/* 弹窗内容 */}
              <div
                style={{
                  padding: "24px",
                  overflowY: "auto",
                  flex: 1,
                }}
              >
                {/* 日期筛选 */}
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.08)",
                    borderRadius: "12px",
                    padding: "16px",
                    marginBottom: "20px",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <div
                    style={{
                      color: "white",
                      fontSize: "0.9rem",
                      marginBottom: "12px",
                      fontWeight: "600",
                    }}
                  >
                    日期筛选
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <select
                      value={cashDetailDateFilter}
                      onChange={(e) => {
                        setCashDetailDateFilter(e.target.value);
                        if (e.target.value !== "custom") {
                          setCashDetailStartDate("");
                          setCashDetailEndDate("");
                        }
                      }}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid rgba(255, 255, 255, 0.25)",
                        background: "rgba(7, 23, 53, 0.65)",
                        color: "white",
                        fontSize: "0.9rem",
                        minWidth: "120px",
                      }}
                    >
                      <option value="all">全部</option>
                      <option value="7days">最近7天</option>
                      <option value="30days">最近30天</option>
                      <option value="90days">最近90天</option>
                      <option value="custom">自定义</option>
                    </select>
                    {cashDetailDateFilter === "custom" && (
                      <>
                        <input
                          type="date"
                          value={cashDetailStartDate}
                          onChange={(e) =>
                            setCashDetailStartDate(e.target.value)
                          }
                          style={{
                            padding: "8px 12px",
                            borderRadius: "8px",
                            border: "1px solid rgba(255, 255, 255, 0.25)",
                            background: "rgba(7, 23, 53, 0.65)",
                            color: "white",
                            fontSize: "0.9rem",
                          }}
                        />
                        <span style={{ color: "rgba(255, 255, 255, 0.7)" }}>
                          至
                        </span>
                        <input
                          type="date"
                          value={cashDetailEndDate}
                          onChange={(e) => setCashDetailEndDate(e.target.value)}
                          style={{
                            padding: "8px 12px",
                            borderRadius: "8px",
                            border: "1px solid rgba(255, 255, 255, 0.25)",
                            background: "rgba(7, 23, 53, 0.65)",
                            color: "white",
                            fontSize: "0.9rem",
                          }}
                        />
                      </>
                    )}
                  </div>
                </div>

                {/* 包裹列表 */}
                {(() => {
                  let filteredPackages = packages.filter(
                    (pkg) =>
                      pkg.payment_method === "cash" &&
                      (pkg.status === "已送达" || pkg.status === "已完成") &&
                      pkg.courier === selectedCourier,
                  );

                  // 日期筛选
                  if (cashDetailDateFilter !== "all") {
                    const now = new Date();
                    let startDate: Date | null = null;

                    if (cashDetailDateFilter === "custom") {
                      if (cashDetailStartDate) {
                        startDate = new Date(cashDetailStartDate);
                        startDate.setHours(0, 0, 0, 0);
                      }
                      const endDate = cashDetailEndDate
                        ? new Date(cashDetailEndDate)
                        : null;
                      if (endDate) {
                        endDate.setHours(23, 59, 59, 999);
                      }

                      filteredPackages = filteredPackages.filter((pkg) => {
                        const deliveryValue =
                          pkg.delivery_time ||
                          pkg.updated_at ||
                          pkg.created_at ||
                          pkg.create_time;
                        if (!deliveryValue) return false;
                        const deliveryDate = new Date(deliveryValue);
                        if (Number.isNaN(deliveryDate.getTime())) return false;
                        if (startDate && deliveryDate < startDate) return false;
                        if (endDate && deliveryDate > endDate) return false;
                        return true;
                      });
                    } else {
                      const days =
                        cashDetailDateFilter === "7days"
                          ? 7
                          : cashDetailDateFilter === "30days"
                            ? 30
                            : 90;
                      startDate = new Date(
                        now.getTime() - days * 24 * 60 * 60 * 1000,
                      );
                      startDate.setHours(0, 0, 0, 0);

                      filteredPackages = filteredPackages.filter((pkg) => {
                        const deliveryValue =
                          pkg.delivery_time ||
                          pkg.updated_at ||
                          pkg.created_at ||
                          pkg.create_time;
                        if (!deliveryValue) return false;
                        const deliveryDate = new Date(deliveryValue);
                        if (Number.isNaN(deliveryDate.getTime())) return false;
                        return deliveryDate >= startDate!;
                      });
                    }
                  }

                  const cashRelevantPackages = filteredPackages.filter(
                    (pkg) => {
                      const price = parseFloat(
                        pkg.price?.replace(/[^\d.]/g, "") || "0",
                      );
                      const hasDeliveryFee = price > 0;
                      const hasMerchantCod =
                        isMerchantPackage(pkg) &&
                        Number(pkg.cod_amount || 0) > 0;
                      return hasDeliveryFee || hasMerchantCod;
                    },
                  );

                  const totalAmount = cashRelevantPackages.reduce(
                    (sum, pkg) => {
                      const price = parseFloat(
                        pkg.price?.replace(/[^\d.]/g, "") || "0",
                      );
                      return sum + price;
                    },
                    0,
                  );

                  if (cashRelevantPackages.length === 0) {
                    return (
                      <div
                        style={{
                          background: "rgba(255, 255, 255, 0.08)",
                          borderRadius: "12px",
                          padding: "60px 20px",
                          textAlign: "center",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                        }}
                      >
                        <div style={{ fontSize: "3rem", marginBottom: "16px" }}>
                          📦
                        </div>
                        <div
                          style={{
                            color: "rgba(255, 255, 255, 0.7)",
                            fontSize: "1.1rem",
                          }}
                        >
                          该时间段内暂无现金收款包裹
                        </div>
                      </div>
                    );
                  }

                  // 过滤掉已结清的包裹
                  const visiblePackages = cashRelevantPackages.filter(
                    (pkg) =>
                      !clearedCashPackages.has(pkg.id) && !pkg.rider_settled,
                  );

                  let visibleDeliveryFee = 0;
                  let visibleCOD = 0;
                  let visiblePlatformPayment = 0;

                  visiblePackages.forEach((pkg) => {
                    const price = parseFloat(
                      pkg.price?.replace(/[^\d.]/g, "") || "0",
                    );
                    visibleDeliveryFee += price;

                    const isStoreMatch = deliveryStores.some(
                      (store) =>
                        store.store_name === pkg.sender_name ||
                        (pkg.sender_name &&
                          pkg.sender_name.startsWith(store.store_name)),
                    );
                    const isMerchant = !!pkg.delivery_store_id || isStoreMatch;
                    if (isMerchant) {
                      visibleCOD += Number(pkg.cod_amount || 0);
                    }

                    // 🚀 新增：累加平台支付金额
                    const payMatch = pkg.description?.match(
                      /\[(?:付给商家|Pay to Merchant|ဆိုင်သို့ ပေးချေရန်|骑手代付|Courier Advance Pay|ကောင်ရီယာမှ ကြိုတင်ပေးချေခြင်း|平台支付|Platform Payment|ပလက်ဖောင်းမှ ပေးချေခြင်း): (.*?) MMK\]/,
                    );
                    if (payMatch && payMatch[1]) {
                      visiblePlatformPayment += parseFloat(
                        payMatch[1].replace(/[^\d.]/g, "") || "0",
                      );
                    }
                  });

                  const visibleTotalAmount = visibleDeliveryFee + visibleCOD;

                  // 检查是否全选
                  const allSelected =
                    visiblePackages.length > 0 &&
                    visiblePackages.every((pkg) =>
                      selectedCashPackages.has(pkg.id),
                    );

                  // 全选/取消全选处理
                  const handleSelectAll = () => {
                    if (allSelected) {
                      // 取消全选
                      setSelectedCashPackages(new Set());
                    } else {
                      // 全选
                      const allIds = new Set(
                        visiblePackages.map((pkg) => pkg.id),
                      );
                      setSelectedCashPackages(allIds);
                    }
                  };

                  // 全部结清处理
                  const handleClearAll = async () => {
                    if (selectedCashPackages.size === 0) {
                      window.alert("请先选择要结清的包裹");
                      return;
                    }
                    if (
                      window.confirm(
                        `确定要结清 ${selectedCashPackages.size} 个包裹吗？\n这将标记这些包裹的现金已上缴。`,
                      )
                    ) {
                      const ids = Array.from(selectedCashPackages);
                      const result = await packageService.settleRiderCash(ids);

                      if (result.success) {
                        setClearedCashPackages((prev) => {
                          const newSet = new Set(prev);
                          selectedCashPackages.forEach((id) => newSet.add(id));
                          return newSet;
                        });
                        setSelectedCashPackages(new Set());
                        // 重新加载数据，确保状态同步
                        loadRecords();
                      } else {
                        window.alert("结清失败，请重试");
                      }
                    }
                  };

                  return (
                    <>
                      {/* 统计信息 */}
                      <div style={{ marginBottom: "20px" }}>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: isMobile
                              ? "1fr"
                              : "repeat(4, 1fr)",
                            gap: "12px",
                            marginBottom: "16px",
                          }}
                        >
                          {/* 总跑腿费 */}
                          <div
                            style={{
                              background: "rgba(254, 243, 199, 0.2)",
                              borderRadius: "12px",
                              padding: "16px",
                              border: "1px solid rgba(254, 243, 199, 0.3)",
                            }}
                          >
                            <div
                              style={{
                                color: "#fef3c7",
                                fontSize: "0.9rem",
                                marginBottom: "4px",
                              }}
                            >
                              总跑腿费
                            </div>
                            <div
                              style={{
                                color: "white",
                                fontSize: "1.4rem",
                                fontWeight: "bold",
                              }}
                            >
                              {visibleDeliveryFee.toLocaleString()} MMK
                            </div>
                            <div
                              style={{
                                color: "rgba(255, 255, 255, 0.7)",
                                fontSize: "0.8rem",
                                marginTop: "4px",
                              }}
                            >
                              {visiblePackages.length} 个包裹
                            </div>
                          </div>

                          {/* 总代收款 */}
                          <div
                            style={{
                              background: "rgba(254, 202, 202, 0.2)",
                              borderRadius: "12px",
                              padding: "16px",
                              border: "1px solid rgba(254, 202, 202, 0.3)",
                            }}
                          >
                            <div
                              style={{
                                color: "#fecaca",
                                fontSize: "0.9rem",
                                marginBottom: "4px",
                              }}
                            >
                              总代收款
                            </div>
                            <div
                              style={{
                                color: "white",
                                fontSize: "1.4rem",
                                fontWeight: "bold",
                              }}
                            >
                              {visibleCOD.toLocaleString()} MMK
                            </div>
                          </div>

                          {/* 🚀 新增：总平台支付 */}
                          <div
                            style={{
                              background: "rgba(167, 243, 208, 0.2)",
                              borderRadius: "12px",
                              padding: "16px",
                              border: "1px solid rgba(167, 243, 208, 0.3)",
                            }}
                          >
                            <div
                              style={{
                                color: "#a7f3d0",
                                fontSize: "0.9rem",
                                marginBottom: "4px",
                              }}
                            >
                              总平台支付 (余额支付)
                            </div>
                            <div
                              style={{
                                color: "white",
                                fontSize: "1.4rem",
                                fontWeight: "bold",
                              }}
                            >
                              {visiblePlatformPayment.toLocaleString()} MMK
                            </div>
                          </div>

                          {/* 总金额 */}
                          <div
                            style={{
                              background: "rgba(191, 219, 254, 0.2)",
                              borderRadius: "12px",
                              padding: "16px",
                              border: "1px solid rgba(191, 219, 254, 0.3)",
                            }}
                          >
                            <div
                              style={{
                                color: "#bfdbfe",
                                fontSize: "0.9rem",
                                marginBottom: "4px",
                              }}
                            >
                              总金额 (未结清)
                            </div>
                            <div
                              style={{
                                color: "white",
                                fontSize: "1.4rem",
                                fontWeight: "bold",
                              }}
                            >
                              {visibleTotalAmount.toLocaleString()} MMK
                            </div>
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: "10px",
                            alignItems: "center",
                            flexWrap: "wrap",
                            justifyContent: "flex-end",
                          }}
                        >
                          {/* 全选图标 */}
                          <button
                            onClick={handleSelectAll}
                            style={{
                              background: allSelected
                                ? "rgba(59, 130, 246, 0.3)"
                                : "rgba(255, 255, 255, 0.1)",
                              border: `2px solid ${allSelected ? "#3b82f6" : "rgba(255, 255, 255, 0.3)"}`,
                              borderRadius: "8px",
                              padding: "8px 12px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              transition: "all 0.3s ease",
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.background = allSelected
                                ? "rgba(59, 130, 246, 0.4)"
                                : "rgba(255, 255, 255, 0.15)";
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.background = allSelected
                                ? "rgba(59, 130, 246, 0.3)"
                                : "rgba(255, 255, 255, 0.1)";
                            }}
                          >
                            <span style={{ fontSize: "1.2rem" }}>
                              {allSelected ? "☑️" : "☐"}
                            </span>
                            <span
                              style={{
                                color: "white",
                                fontSize: "0.85rem",
                                fontWeight: "600",
                              }}
                            >
                              {allSelected ? "取消全选" : "全选"}
                            </span>
                          </button>

                          {/* 全部结清按钮 */}
                          <button
                            onClick={handleClearAll}
                            disabled={selectedCashPackages.size === 0}
                            style={{
                              background:
                                selectedCashPackages.size > 0
                                  ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                                  : "rgba(255, 255, 255, 0.1)",
                              border: "none",
                              borderRadius: "8px",
                              padding: "8px 16px",
                              cursor:
                                selectedCashPackages.size > 0
                                  ? "pointer"
                                  : "not-allowed",
                              opacity: selectedCashPackages.size > 0 ? 1 : 0.5,
                              transition: "all 0.3s ease",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              boxShadow:
                                selectedCashPackages.size > 0
                                  ? "0 4px 12px rgba(16, 185, 129, 0.3)"
                                  : "none",
                            }}
                            onMouseOver={(e) => {
                              if (selectedCashPackages.size > 0) {
                                e.currentTarget.style.transform =
                                  "translateY(-2px)";
                                e.currentTarget.style.boxShadow =
                                  "0 6px 16px rgba(16, 185, 129, 0.4)";
                              }
                            }}
                            onMouseOut={(e) => {
                              if (selectedCashPackages.size > 0) {
                                e.currentTarget.style.transform =
                                  "translateY(0)";
                                e.currentTarget.style.boxShadow =
                                  "0 4px 12px rgba(16, 185, 129, 0.3)";
                              }
                            }}
                          >
                            <span style={{ fontSize: "1rem" }}>✅</span>
                            <span
                              style={{
                                color: "white",
                                fontSize: "0.9rem",
                                fontWeight: "600",
                              }}
                            >
                              全部结清 ({selectedCashPackages.size})
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* 包裹列表 */}
                      {visiblePackages.length === 0 ? (
                        <div
                          style={{
                            background: "rgba(255, 255, 255, 0.08)",
                            borderRadius: "12px",
                            padding: "60px 20px",
                            textAlign: "center",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                          }}
                        >
                          <div
                            style={{ fontSize: "3rem", marginBottom: "16px" }}
                          >
                            ✅
                          </div>
                          <div
                            style={{
                              color: "rgba(255, 255, 255, 0.7)",
                              fontSize: "1.1rem",
                            }}
                          >
                            所有包裹已结清
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: isMobile
                              ? "1fr"
                              : "repeat(auto-fill, minmax(280px, 1fr))",
                            gap: "12px",
                          }}
                        >
                          {visiblePackages.map((pkg) => {
                            const price = parseFloat(
                              pkg.price?.replace(/[^\d.]/g, "") || "0",
                            );
                            const isSelected = selectedCashPackages.has(pkg.id);

                            // 检查是否为合伙店铺订单
                            const isStoreMatch = deliveryStores.some(
                              (store) =>
                                store.store_name === pkg.sender_name ||
                                (pkg.sender_name &&
                                  pkg.sender_name.startsWith(store.store_name)),
                            );
                            const isMerchant =
                              !!pkg.delivery_store_id || isStoreMatch;
                            const codVal = Number(pkg.cod_amount || 0);

                            return (
                              <div
                                key={pkg.id}
                                style={{
                                  background: isSelected
                                    ? "rgba(59, 130, 246, 0.15)"
                                    : "rgba(255, 255, 255, 0.1)",
                                  borderRadius: "10px",
                                  padding: "16px",
                                  border: isSelected
                                    ? "2px solid #3b82f6"
                                    : "1px solid rgba(255, 255, 255, 0.15)",
                                  position: "relative",
                                  transition: "all 0.3s ease",
                                }}
                              >
                                {/* 左上角白色复选框 */}
                                <div
                                  onClick={() => {
                                    setSelectedCashPackages((prev) => {
                                      const newSet = new Set(prev);
                                      if (newSet.has(pkg.id)) {
                                        newSet.delete(pkg.id);
                                      } else {
                                        newSet.add(pkg.id);
                                      }
                                      return newSet;
                                    });
                                  }}
                                  style={{
                                    position: "absolute",
                                    top: "12px",
                                    left: "12px",
                                    width: "20px",
                                    height: "20px",
                                    background: "white",
                                    border: `2px solid ${isSelected ? "#3b82f6" : "rgba(255, 255, 255, 0.5)"}`,
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    transition: "all 0.2s ease",
                                    zIndex: 10,
                                  }}
                                  onMouseOver={(e) => {
                                    e.currentTarget.style.borderColor =
                                      "#3b82f6";
                                    e.currentTarget.style.transform =
                                      "scale(1.1)";
                                  }}
                                  onMouseOut={(e) => {
                                    e.currentTarget.style.borderColor =
                                      isSelected
                                        ? "#3b82f6"
                                        : "rgba(255, 255, 255, 0.5)";
                                    e.currentTarget.style.transform =
                                      "scale(1)";
                                  }}
                                >
                                  {isSelected && (
                                    <span
                                      style={{
                                        color: "#3b82f6",
                                        fontSize: "14px",
                                        fontWeight: "bold",
                                      }}
                                    >
                                      ✓
                                    </span>
                                  )}
                                </div>

                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "flex-start",
                                    marginBottom: "8px",
                                    paddingLeft: "32px",
                                  }}
                                >
                                  <div style={{ flex: 1 }}>
                                    <div
                                      style={{
                                        color: "white",
                                        fontWeight: "bold",
                                        fontSize: "0.95rem",
                                        marginBottom: "4px",
                                      }}
                                    >
                                      {pkg.id}
                                    </div>
                                    <div
                                      style={{
                                        color: "rgba(255, 255, 255, 0.7)",
                                        fontSize: "0.85rem",
                                      }}
                                    >
                                      {pkg.receiver_name} - {pkg.receiver_phone}
                                    </div>
                                  </div>
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      alignItems: "flex-end",
                                      gap: "4px",
                                    }}
                                  >
                                    <div
                                      style={{
                                        background: "#fef3c7",
                                        color: "#92400e",
                                        padding: "4px 12px",
                                        borderRadius: "6px",
                                        fontSize: "0.9rem",
                                        fontWeight: "bold",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {price.toLocaleString()} MMK
                                    </div>
                                    {isMerchant && (
                                      <div
                                        style={{
                                          background: "#fee2e2",
                                          color: "#b91c1c",
                                          padding: "4px 12px",
                                          borderRadius: "6px",
                                          fontSize: "0.85rem",
                                          fontWeight: "bold",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        代收:{" "}
                                        {codVal > 0
                                          ? `${codVal.toLocaleString()} MMK`
                                          : "无"}
                                      </div>
                                    )}
                                    {/* 🚀 新增：展示平台支付金额 */}
                                    {(() => {
                                      const payMatch = pkg.description?.match(
                                        /\[(?:付给商家|Pay to Merchant|ဆိုင်သို့ ပေးချေရန်|骑手代付|Courier Advance Pay|ကောင်ရီယာမှ ကြိုတင်ပေးချေခြင်း|平台支付|Platform Payment|ပလက်ဖောင်းမှ ပေးချေခြင်း): (.*?) MMK\]/,
                                      );
                                      if (payMatch && payMatch[1]) {
                                        return (
                                          <div
                                            style={{
                                              background:
                                                "rgba(16, 185, 129, 0.2)",
                                              color: "#10b981",
                                              padding: "4px 12px",
                                              borderRadius: "6px",
                                              fontSize: "0.85rem",
                                              fontWeight: "bold",
                                              whiteSpace: "nowrap",
                                              marginTop: "4px",
                                            }}
                                          >
                                            平台支付: {payMatch[1]} MMK
                                          </div>
                                        );
                                      }
                                      return null;
                                    })()}
                                  </div>
                                </div>
                                <div
                                  style={{
                                    color: "rgba(255, 255, 255, 0.6)",
                                    fontSize: "0.8rem",
                                    marginTop: "8px",
                                    paddingTop: "8px",
                                    borderTop:
                                      "1px solid rgba(255, 255, 255, 0.1)",
                                  }}
                                >
                                  📍 {pkg.receiver_address}
                                </div>
                                {pkg.delivery_time && (
                                  <div
                                    style={{
                                      color: "rgba(255, 255, 255, 0.5)",
                                      fontSize: "0.75rem",
                                      marginTop: "4px",
                                    }}
                                  >
                                    送达时间: {pkg.delivery_time}
                                  </div>
                                )}
                                {pkg.create_time && (
                                  <div
                                    style={{
                                      color: "rgba(255, 255, 255, 0.5)",
                                      fontSize: "0.75rem",
                                      marginTop: "2px",
                                    }}
                                  >
                                    创建时间: {pkg.create_time}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {activeTab === "merchants_collection" && (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <span
                  style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.9rem" }}
                >
                  {language === "zh"
                    ? "分区域"
                    : language === "my"
                      ? "ဒေသအလိုက်"
                      : "Region"}
                </span>
                <select
                  value={merchantRegionFilter}
                  onChange={(e) => setMerchantRegionFilter(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "10px",
                    border: "1px solid rgba(255, 255, 255, 0.25)",
                    background: "rgba(255, 255, 255, 0.12)",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "0.95rem",
                  }}
                >
                  <option value="all" style={{ color: "#111827" }}>
                    {language === "zh"
                      ? "全部地区"
                      : language === "my"
                        ? "ဒေသအားလုံး"
                        : "All Regions"}
                  </option>
                  {REGIONS.map((region) => (
                    <option
                      key={region.prefix}
                      value={region.prefix}
                      style={{ color: "#111827" }}
                    >
                      {region.prefix}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {merchantRegionFilter !== "all" ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "20px",
                }}
              >
                {REGIONS.filter(
                  (region) => region.prefix === merchantRegionFilter,
                ).map((region) => {
                  const regionStores = merchantsCollectionStats.filter(
                    (store) => {
                      const prefix = getStoreRegionPrefix(store);
                      return prefix === region.prefix;
                    },
                  );
                  if (regionStores.length === 0) return null;
                  return (
                    <div
                      key={region.prefix}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
                      <div
                        style={{
                          color: "rgba(255,255,255,0.8)",
                          fontSize: "1rem",
                          fontWeight: 600,
                        }}
                      >
                        {region.name} ({region.prefix})
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fill, minmax(350px, 1fr))",
                          gap: "20px",
                        }}
                      >
                        {regionStores.map((store) => (
                          <div
                            key={store.id}
                            style={{
                              background: "rgba(255, 255, 255, 0.12)",
                              borderRadius: "20px",
                              padding: "24px",
                              border: "1px solid rgba(255, 255, 255, 0.18)",
                              boxShadow: "0 12px 35px rgba(7, 23, 55, 0.45)",
                              display: "flex",
                              flexDirection: "column",
                              gap: "16px",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <h3
                                style={{
                                  margin: 0,
                                  color: "white",
                                  fontSize: "1.2rem",
                                }}
                              >
                                {store.store_name}
                              </h3>
                              <div
                                style={{
                                  background:
                                    store.unclearedAmount > 0
                                      ? "rgba(239, 68, 68, 0.2)"
                                      : "rgba(16, 185, 129, 0.2)",
                                  color:
                                    store.unclearedAmount > 0
                                      ? "#ef4444"
                                      : "#10b981",
                                  padding: "4px 12px",
                                  borderRadius: "20px",
                                  fontSize: "0.85rem",
                                  fontWeight: "600",
                                }}
                              >
                                {store.unclearedAmount > 0
                                  ? t.unsettled
                                  : t.settled}
                              </div>
                            </div>

                            {/* 店铺联系信息 - 使用 delivery_stores 表的数据 */}
                            <div
                              style={{
                                background: "rgba(0,0,0,0.15)",
                                padding: "12px",
                                borderRadius: "12px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "8px",
                              }}
                            >
                              {store.contact_phone && (
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    color: "rgba(255,255,255,0.8)",
                                  }}
                                >
                                  <span style={{ fontSize: "1rem" }}>📞</span>
                                  <span style={{ fontSize: "0.9rem" }}>
                                    {store.contact_phone}
                                  </span>
                                </div>
                              )}
                              {store.address && (
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: "8px",
                                    color: "rgba(255,255,255,0.8)",
                                  }}
                                >
                                  <span style={{ fontSize: "1rem" }}>📍</span>
                                  <span
                                    style={{
                                      fontSize: "0.9rem",
                                      lineHeight: "1.4",
                                    }}
                                  >
                                    {store.address}
                                  </span>
                                </div>
                              )}
                              {store.store_code && (
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    color: "rgba(255,255,255,0.8)",
                                    marginTop: "4px",
                                    paddingTop: "8px",
                                    borderTop:
                                      "1px solid rgba(255,255,255,0.1)",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: "0.85rem",
                                      opacity: 0.7,
                                    }}
                                  >
                                    {language === "zh"
                                      ? "代码"
                                      : language === "my"
                                        ? "ကုဒ်"
                                        : "Code"}
                                    :
                                  </span>
                                  <span
                                    style={{
                                      fontFamily: "monospace",
                                      background: "rgba(0,0,0,0.3)",
                                      padding: "2px 8px",
                                      borderRadius: "6px",
                                      fontWeight: "bold",
                                      fontSize: "0.85rem",
                                    }}
                                  >
                                    {store.store_code}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: "12px",
                              }}
                            >
                              <div
                                onClick={() =>
                                  handlePendingPaymentsClick(store.store_name)
                                }
                                style={{
                                  background: "rgba(255, 255, 255, 0.08)",
                                  padding: "12px",
                                  borderRadius: "12px",
                                  cursor: "pointer",
                                  transition: "all 0.2s",
                                  border: "1px solid rgba(255, 255, 255, 0.1)",
                                }}
                                onMouseOver={(e) => {
                                  e.currentTarget.style.background =
                                    "rgba(255, 255, 255, 0.15)";
                                  e.currentTarget.style.transform =
                                    "translateY(-2px)";
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.background =
                                    "rgba(255, 255, 255, 0.08)";
                                  e.currentTarget.style.transform =
                                    "translateY(0)";
                                }}
                              >
                                <div
                                  style={{
                                    color: "rgba(255,255,255,0.6)",
                                    fontSize: "0.85rem",
                                    marginBottom: "4px",
                                  }}
                                >
                                  {language === "my"
                                    ? "ယခုနှစ် ငွေကောက်ခံမှု စုစုပေါင်း"
                                    : t.monthlyMerchantCollection}
                                </div>
                                <div
                                  style={{
                                    color: "white",
                                    fontSize: "1.1rem",
                                    fontWeight: "bold",
                                  }}
                                >
                                  {store.totalAmount.toLocaleString()}
                                </div>
                              </div>
                              <div
                                onClick={() =>
                                  handleMerchantCollectionClick(
                                    store.store_name,
                                  )
                                }
                                style={{
                                  background: "rgba(239, 68, 68, 0.1)",
                                  padding: "12px",
                                  borderRadius: "12px",
                                  border: "1px solid rgba(239, 68, 68, 0.3)",
                                  cursor: "pointer",
                                  transition: "all 0.2s",
                                }}
                                onMouseOver={(e) => {
                                  e.currentTarget.style.background =
                                    "rgba(239, 68, 68, 0.2)";
                                  e.currentTarget.style.transform =
                                    "translateY(-2px)";
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.background =
                                    "rgba(239, 68, 68, 0.1)";
                                  e.currentTarget.style.transform =
                                    "translateY(0)";
                                }}
                              >
                                <div
                                  style={{
                                    color: "#ef4444",
                                    fontSize: "0.85rem",
                                    marginBottom: "4px",
                                  }}
                                >
                                  {language === "my"
                                    ? "ရှင်းလင်းရန် ကျန်ငွေ"
                                    : t.pendingAmount}
                                </div>
                                <div
                                  style={{
                                    color: "#ef4444",
                                    fontSize: "1.1rem",
                                    fontWeight: "bold",
                                  }}
                                >
                                  {store.unclearedAmount.toLocaleString()}
                                </div>
                              </div>
                            </div>

                            <div
                              style={{
                                color: "rgba(255,255,255,0.6)",
                                fontSize: "0.9rem",
                              }}
                            >
                              {t.unsettledOrders}:{" "}
                              <span
                                style={{ color: "white", fontWeight: "bold" }}
                              >
                                {store.unclearedCount}
                              </span>{" "}
                              {language === "zh" ? "单" : ""}
                            </div>

                            {store.lastSettledAt && (
                              <div
                                style={{
                                  color: "rgba(255,255,255,0.6)",
                                  fontSize: "0.9rem",
                                  marginTop: "4px",
                                }}
                              >
                                {t.lastSettled}:{" "}
                                <span
                                  style={{ color: "white", fontWeight: "500" }}
                                >
                                  {new Date(store.lastSettledAt).toLocaleString(
                                    "zh-CN",
                                    {
                                      year: "numeric",
                                      month: "2-digit",
                                      day: "2-digit",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )}
                                </span>
                              </div>
                            )}

                            {/* 🚀 新增：COD 结清日显示 */}
                            <div
                              style={{
                                marginTop: "8px",
                                padding: "10px 14px",
                                background: "rgba(59, 130, 246, 0.1)",
                                borderRadius: "12px",
                                border: "1px solid rgba(59, 130, 246, 0.2)",
                                display: "flex",
                                flexDirection: "column",
                                gap: "4px",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <span
                                  style={{
                                    color: "rgba(255,255,255,0.5)",
                                    fontSize: "0.8rem",
                                    fontWeight: "bold",
                                  }}
                                >
                                  {language === "zh"
                                    ? "🗓️ COD 结清周期"
                                    : language === "my"
                                      ? "🗓️ COD ရှင်းလင်းရေးကာလ"
                                      : "🗓️ COD Settlement Cycle"}
                                </span>
                                <span
                                  style={{
                                    color: "#60a5fa",
                                    fontWeight: "800",
                                    fontSize: "0.9rem",
                                  }}
                                >
                                  {store.cod_settlement_day || "7"}{" "}
                                  {language === "zh" ? "天" : "Days"}
                                </span>
                              </div>

                              {(() => {
                                const days = parseInt(
                                  store.cod_settlement_day || "7",
                                );
                                const baseDate = store.lastSettledAt
                                  ? new Date(store.lastSettledAt)
                                  : new Date(store.created_at);
                                const nextDate = new Date(baseDate);
                                nextDate.setDate(baseDate.getDate() + days);

                                const isOverdue = new Date() > nextDate;

                                return (
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      marginTop: "4px",
                                      paddingTop: "4px",
                                      borderTop:
                                        "1px solid rgba(255,255,255,0.05)",
                                    }}
                                  >
                                    <span
                                      style={{
                                        color: "rgba(255,255,255,0.5)",
                                        fontSize: "0.8rem",
                                        fontWeight: "bold",
                                      }}
                                    >
                                      {language === "zh"
                                        ? "🔔 下次结清日"
                                        : language === "my"
                                          ? "🔔 နောက်တစ်ကြိမ်ရှင်းလင်းရမည့်ရက်"
                                          : "🔔 Next Settlement"}
                                    </span>
                                    <span
                                      style={{
                                        color: isOverdue
                                          ? "#ef4444"
                                          : "#10b981",
                                        fontWeight: "900",
                                        fontSize: "1rem",
                                        textShadow: isOverdue
                                          ? "0 0 10px rgba(239, 68, 68, 0.3)"
                                          : "none",
                                      }}
                                    >
                                      {nextDate.toLocaleDateString("zh-CN", {
                                        month: "2-digit",
                                        day: "2-digit",
                                      })}
                                      {isOverdue && (
                                        <span
                                          style={{
                                            fontSize: "0.7rem",
                                            marginLeft: "4px",
                                          }}
                                        >
                                          (
                                          {language === "zh"
                                            ? "逾期"
                                            : "Overdue"}
                                          )
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                );
                              })()}
                            </div>

                            {store.unclearedAmount > 0 && (
                              <button
                                onClick={() =>
                                  !isRegionalUser &&
                                  handleSettleMerchant(
                                    store.id,
                                    store.store_name,
                                  )
                                }
                                disabled={isRegionalUser}
                                style={{
                                  marginTop: "auto",
                                  padding: "10px 12px",
                                  background: isRegionalUser
                                    ? "rgba(148, 163, 184, 0.15)"
                                    : "linear-gradient(135deg, #f97316 0%, #ef4444 100%)",
                                  border: "none",
                                  borderRadius: "12px",
                                  color: "white",
                                  cursor: isRegionalUser
                                    ? "not-allowed"
                                    : "pointer",
                                  fontWeight: 600,
                                  boxShadow: isRegionalUser
                                    ? "none"
                                    : "0 4px 15px rgba(239, 68, 68, 0.4)",
                                  transition: "all 0.3s ease",
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                                onMouseOver={(e) => {
                                  if (!isRegionalUser)
                                    e.currentTarget.style.transform =
                                      "scale(1.02)";
                                }}
                                onMouseOut={(e) => {
                                  if (!isRegionalUser)
                                    e.currentTarget.style.transform =
                                      "scale(1)";
                                }}
                              >
                                <span>
                                  {t.confirmSettle} (
                                  {store.unclearedAmount.toLocaleString()} MMK)
                                </span>
                                {isRegionalUser && (
                                  <span
                                    style={{
                                      fontSize: "0.75rem",
                                      fontWeight: "normal",
                                      opacity: 0.8,
                                    }}
                                  >
                                    🔒{" "}
                                    {language === "zh"
                                      ? "仅限总公司管理员操作"
                                      : language === "my"
                                        ? "ပင်မရုံးချုပ် စီမံခန့်ခွဲသူသာ ဆောင်ရွက်နိုင်သည်"
                                        : "HQ Admin Only"}
                                  </span>
                                )}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
                  gap: "20px",
                }}
              >
                {merchantsCollectionStats.map((store) => (
                  <div
                    key={store.id}
                    style={{
                      background: "rgba(255, 255, 255, 0.12)",
                      borderRadius: "20px",
                      padding: "24px",
                      border: "1px solid rgba(255, 255, 255, 0.18)",
                      boxShadow: "0 12px 35px rgba(7, 23, 55, 0.45)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                          color: "white",
                          fontSize: "1.2rem",
                        }}
                      >
                        {store.store_name}
                      </h3>
                      <div
                        style={{
                          background:
                            store.unclearedAmount > 0
                              ? "rgba(239, 68, 68, 0.2)"
                              : "rgba(16, 185, 129, 0.2)",
                          color:
                            store.unclearedAmount > 0 ? "#ef4444" : "#10b981",
                          padding: "4px 12px",
                          borderRadius: "20px",
                          fontSize: "0.85rem",
                          fontWeight: "600",
                        }}
                      >
                        {store.unclearedAmount > 0 ? t.unsettled : t.settled}
                      </div>
                    </div>

                    {/* 店铺联系信息 - 使用 delivery_stores 表的数据 */}
                    <div
                      style={{
                        background: "rgba(0,0,0,0.15)",
                        padding: "12px",
                        borderRadius: "12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      {store.contact_phone && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            color: "rgba(255,255,255,0.8)",
                          }}
                        >
                          <span style={{ fontSize: "1rem" }}>📞</span>
                          <span style={{ fontSize: "0.9rem" }}>
                            {store.contact_phone}
                          </span>
                        </div>
                      )}
                      {store.address && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "8px",
                            color: "rgba(255,255,255,0.8)",
                          }}
                        >
                          <span style={{ fontSize: "1rem" }}>📍</span>
                          <span
                            style={{ fontSize: "0.9rem", lineHeight: "1.4" }}
                          >
                            {store.address}
                          </span>
                        </div>
                      )}
                      {store.store_code && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            color: "rgba(255,255,255,0.8)",
                            marginTop: "4px",
                            paddingTop: "8px",
                            borderTop: "1px solid rgba(255,255,255,0.1)",
                          }}
                        >
                          <span style={{ fontSize: "0.85rem", opacity: 0.7 }}>
                            {language === "zh"
                              ? "代码"
                              : language === "my"
                                ? "ကုဒ်"
                                : "Code"}
                            :
                          </span>
                          <span
                            style={{
                              fontFamily: "monospace",
                              background: "rgba(0,0,0,0.3)",
                              padding: "2px 8px",
                              borderRadius: "6px",
                              fontWeight: "bold",
                              fontSize: "0.85rem",
                            }}
                          >
                            {store.store_code}
                          </span>
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "12px",
                      }}
                    >
                      <div
                        onClick={() =>
                          handlePendingPaymentsClick(store.store_name)
                        }
                        style={{
                          background: "rgba(255, 255, 255, 0.08)",
                          padding: "12px",
                          borderRadius: "12px",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background =
                            "rgba(255, 255, 255, 0.15)";
                          e.currentTarget.style.transform = "translateY(-2px)";
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background =
                            "rgba(255, 255, 255, 0.08)";
                          e.currentTarget.style.transform = "translateY(0)";
                        }}
                      >
                        <div
                          style={{
                            color: "rgba(255,255,255,0.6)",
                            fontSize: "0.85rem",
                            marginBottom: "4px",
                          }}
                        >
                          {language === "my"
                            ? "ယခုနှစ် ငွေကောက်ခံမှု စုစုပေါင်း"
                            : t.monthlyMerchantCollection}
                        </div>
                        <div
                          style={{
                            color: "white",
                            fontSize: "1.1rem",
                            fontWeight: "bold",
                          }}
                        >
                          {store.totalAmount.toLocaleString()}
                        </div>
                      </div>
                      <div
                        onClick={() =>
                          handleMerchantCollectionClick(store.store_name)
                        }
                        style={{
                          background: "rgba(239, 68, 68, 0.1)",
                          padding: "12px",
                          borderRadius: "12px",
                          border: "1px solid rgba(239, 68, 68, 0.3)",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background =
                            "rgba(239, 68, 68, 0.2)";
                          e.currentTarget.style.transform = "translateY(-2px)";
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background =
                            "rgba(239, 68, 68, 0.1)";
                          e.currentTarget.style.transform = "translateY(0)";
                        }}
                      >
                        <div
                          style={{
                            color: "#ef4444",
                            fontSize: "0.85rem",
                            marginBottom: "4px",
                          }}
                        >
                          {language === "my"
                            ? "ရှင်းလင်းရန် ကျန်ငွေ"
                            : t.pendingAmount}
                        </div>
                        <div
                          style={{
                            color: "#ef4444",
                            fontSize: "1.1rem",
                            fontWeight: "bold",
                          }}
                        >
                          {store.unclearedAmount.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        color: "rgba(255,255,255,0.6)",
                        fontSize: "0.9rem",
                      }}
                    >
                      {t.unsettledOrders}:{" "}
                      <span style={{ color: "white", fontWeight: "bold" }}>
                        {store.unclearedCount}
                      </span>{" "}
                      {language === "zh" ? "单" : ""}
                    </div>

                    {store.lastSettledAt && (
                      <div
                        style={{
                          color: "rgba(255,255,255,0.6)",
                          fontSize: "0.9rem",
                          marginTop: "4px",
                        }}
                      >
                        {t.lastSettled}:{" "}
                        <span style={{ color: "white", fontWeight: "500" }}>
                          {new Date(store.lastSettledAt).toLocaleString(
                            "zh-CN",
                            {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </span>
                      </div>
                    )}

                    {/* 🚀 新增：COD 结清日显示 */}
                    <div
                      style={{
                        marginTop: "8px",
                        padding: "10px 14px",
                        background: "rgba(59, 130, 246, 0.1)",
                        borderRadius: "12px",
                        border: "1px solid rgba(59, 130, 246, 0.2)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            color: "rgba(255,255,255,0.5)",
                            fontSize: "0.8rem",
                            fontWeight: "bold",
                          }}
                        >
                          {language === "zh"
                            ? "🗓️ COD 结清周期"
                            : language === "my"
                              ? "🗓️ COD ရှင်းလင်းရေးကာလ"
                              : "🗓️ COD Settlement Cycle"}
                        </span>
                        <span
                          style={{
                            color: "#60a5fa",
                            fontWeight: "800",
                            fontSize: "0.9rem",
                          }}
                        >
                          {store.cod_settlement_day || "7"}{" "}
                          {language === "zh" ? "天" : "Days"}
                        </span>
                      </div>

                      {(() => {
                        const days = parseInt(store.cod_settlement_day || "7");
                        const baseDate = store.lastSettledAt
                          ? new Date(store.lastSettledAt)
                          : new Date(store.created_at);
                        const nextDate = new Date(baseDate);
                        nextDate.setDate(baseDate.getDate() + days);

                        const isOverdue = new Date() > nextDate;

                        return (
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginTop: "4px",
                              paddingTop: "4px",
                              borderTop: "1px solid rgba(255,255,255,0.05)",
                            }}
                          >
                            <span
                              style={{
                                color: "rgba(255,255,255,0.5)",
                                fontSize: "0.8rem",
                                fontWeight: "bold",
                              }}
                            >
                              {language === "zh"
                                ? "🔔 下次结清日"
                                : language === "my"
                                  ? "🔔 နောက်တစ်ကြိမ်ရှင်းလင်းရမည့်ရက်"
                                  : "🔔 Next Settlement"}
                            </span>
                            <span
                              style={{
                                color: isOverdue ? "#ef4444" : "#10b981",
                                fontWeight: "900",
                                fontSize: "1rem",
                                textShadow: isOverdue
                                  ? "0 0 10px rgba(239, 68, 68, 0.3)"
                                  : "none",
                              }}
                            >
                              {nextDate.toLocaleDateString("zh-CN", {
                                month: "2-digit",
                                day: "2-digit",
                              })}
                              {isOverdue && (
                                <span
                                  style={{
                                    fontSize: "0.7rem",
                                    marginLeft: "4px",
                                  }}
                                >
                                  ({language === "zh" ? "逾期" : "Overdue"})
                                </span>
                              )}
                            </span>
                          </div>
                        );
                      })()}
                    </div>

                    {store.unclearedAmount > 0 && (
                      <button
                        onClick={() =>
                          !isRegionalUser &&
                          handleSettleMerchant(store.id, store.store_name)
                        }
                        disabled={isRegionalUser}
                        style={{
                          width: "100%",
                          padding: "12px",
                          borderRadius: "12px",
                          border: "none",
                          background: isRegionalUser
                            ? "rgba(255, 255, 255, 0.1)"
                            : "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
                          color: isRegionalUser
                            ? "rgba(255, 255, 255, 0.4)"
                            : "white",
                          fontWeight: "bold",
                          cursor: isRegionalUser ? "not-allowed" : "pointer",
                          marginTop: "auto",
                          boxShadow: isRegionalUser
                            ? "none"
                            : "0 4px 15px rgba(239, 68, 68, 0.4)",
                          transition: "all 0.3s ease",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "4px",
                        }}
                        onMouseOver={(e) => {
                          if (!isRegionalUser)
                            e.currentTarget.style.transform = "scale(1.02)";
                        }}
                        onMouseOut={(e) => {
                          if (!isRegionalUser)
                            e.currentTarget.style.transform = "scale(1)";
                        }}
                      >
                        <span>
                          {t.confirmSettle} (
                          {store.unclearedAmount.toLocaleString()} MMK)
                        </span>
                        {isRegionalUser && (
                          <span
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: "normal",
                              opacity: 0.8,
                            }}
                          >
                            🔒{" "}
                            {language === "zh"
                              ? "仅限总公司管理员操作"
                              : language === "my"
                                ? "ပင်မရုံးချုပ် စီမံခန့်ခွဲသူသာ ဆောင်ရွက်နိုင်သည်"
                                : "HQ Admin Only"}
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                ))}

                {merchantsCollectionStats.length === 0 && (
                  <div
                    style={{
                      gridColumn: "1 / -1",
                      textAlign: "center",
                      padding: "60px",
                      color: "rgba(255,255,255,0.5)",
                    }}
                  >
                    {language === "zh"
                      ? "暂无合伙店铺数据"
                      : language === "my"
                        ? "လုပ်ဖော်ကိုင်ဖက်ဆိုင် အချက်အလက် မရှိသေးပါ"
                        : "No merchants store data"}
                  </div>
                )}
              </div>
            )}
          </div>
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
              background: "linear-gradient(135deg, #1a365d 0%, #2c5282 100%)",
              borderRadius: "24px",
              width: "100%",
              maxWidth: "900px",
              maxHeight: "90vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "24px",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.5rem",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                {showMerchantSettledModal ? "🤝" : "⏳"} {modalTitle}
                <span
                  style={{
                    fontSize: "0.9rem",
                    background: "rgba(255,255,255,0.1)",
                    padding: "4px 12px",
                    borderRadius: "20px",
                    opacity: 0.8,
                  }}
                >
                  {filteredMerchantOrders.length}{" "}
                  {language === "zh" ? "单" : ""}
                </span>
              </h2>
              <button
                onClick={() => {
                  setShowMerchantSettledModal(false);
                  setShowPendingOrdersModal(false);
                }}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  color: "white",
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
                  (e.currentTarget.style.background = "rgba(255,255,255,0.2)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.1)")
                }
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
              {/* 筛选工具栏 */}
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  marginBottom: "20px",
                  flexWrap: "wrap",
                  background: "rgba(255, 255, 255, 0.08)",
                  padding: "16px",
                  borderRadius: "12px",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                }}
              >
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <label
                    style={{
                      display: "block",
                      color: "rgba(255,255,255,0.6)",
                      fontSize: "0.8rem",
                      marginBottom: "6px",
                    }}
                  >
                    {language === "zh" ? "商家筛选" : "Filter by Merchant"}
                  </label>
                  <select
                    value={merchantCollectionCustomerFilter}
                    onChange={(e) =>
                      setMerchantCollectionCustomerFilter(e.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255, 255, 255, 0.25)",
                      background: "rgba(7, 23, 53, 0.65)",
                      color: "white",
                      fontSize: "0.9rem",
                    }}
                  >
                    <option value="all">
                      {language === "zh" ? "所有商家" : "All Merchants"}
                    </option>
                    {merchantCustomerOptions.map((optionKey) => {
                      const [storeName, storeCode] = optionKey.split("||");
                      const label = storeCode
                        ? `${storeName}（${storeCode}）`
                        : storeName;
                      return (
                        <option key={optionKey} value={optionKey}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div style={{ flex: 1, minWidth: "200px" }}>
                  <label
                    style={{
                      display: "block",
                      color: "rgba(255,255,255,0.6)",
                      fontSize: "0.8rem",
                      marginBottom: "6px",
                    }}
                  >
                    {language === "zh" ? "按地区筛选" : "Filter by Region"}
                  </label>
                  <select
                    value={merchantCollectionRegionFilter}
                    onChange={(e) =>
                      setMerchantCollectionRegionFilter(e.target.value)
                    }
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255, 255, 255, 0.25)",
                      background: "rgba(7, 23, 53, 0.65)",
                      color: "white",
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
                {filteredMerchantOrders.map((pkg) => (
                  <div
                    key={pkg.id}
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      borderRadius: "16px",
                      padding: "16px",
                      border: "1px solid rgba(255,255,255,0.1)",
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
                        const platformAmount = getPlatformPaymentAmount(
                          pkg.description,
                        );
                        if (Number(pkg.cod_amount || 0) > 0) {
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
                        <span style={{ color: "white" }}>
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
                        <span style={{ color: "white" }}>
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
                          {language === "zh" ? "代收金额" : "COD"}:
                        </span>
                        <span style={{ fontWeight: "bold", color: "#ff7675" }}>
                          {Number(pkg.cod_amount || 0).toLocaleString()} MMK
                          {getPlatformPaymentAmount(pkg.description) > 0
                            ? language === "zh"
                              ? "（余额支付）"
                              : " (Balance Pay)"
                            : ""}
                        </span>
                      </div>

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
                            borderTop: "1px solid rgba(255,255,255,0.05)",
                            fontSize: "0.8rem",
                            opacity: 0.5,
                            textAlign: "right",
                          }}
                        >
                          {language === "zh" ? "结清时间" : "Settled at"}:{" "}
                          {new Date(pkg.cod_settled_at).toLocaleString("zh-CN")}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {filteredMerchantOrders.length === 0 && (
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
                        color: "rgba(255,255,255,0.5)",
                        fontSize: "1.1rem",
                      }}
                    >
                      {language === "zh"
                        ? "暂无相关订单记录"
                        : "No related orders found"}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "20px 24px",
                borderTop: "1px solid rgba(255,255,255,0.1)",
                textAlign: "right",
              }}
            >
              <button
                onClick={() => {
                  setShowMerchantSettledModal(false);
                  setShowPendingOrdersModal(false);
                }}
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
              background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
              borderRadius: "24px",
              width: "100%",
              maxWidth: "900px",
              maxHeight: "90vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                padding: "24px",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.5rem",
                  color: "white",
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
                    background: "rgba(255,255,255,0.1)",
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
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  color: "white",
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
                  (e.currentTarget.style.background = "rgba(255,255,255,0.2)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.1)")
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
                  background: "rgba(255, 255, 255, 0.08)",
                  padding: "16px",
                  borderRadius: "12px",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                }}
              >
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <label
                    style={{
                      display: "block",
                      color: "rgba(255,255,255,0.6)",
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
                      border: "1px solid rgba(255, 255, 255, 0.25)",
                      background: "rgba(7, 23, 53, 0.65)",
                      color: "white",
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
                      color: "rgba(255,255,255,0.6)",
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
                      border: "1px solid rgba(255, 255, 255, 0.25)",
                      background: "rgba(7, 23, 53, 0.65)",
                      color: "white",
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
                          background: "rgba(255,255,255,0.05)",
                          borderRadius: "16px",
                          padding: "16px",
                          border: "1px solid rgba(255,255,255,0.1)",
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
                            <span style={{ color: "white" }}>
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
                              <div style={{ color: "white" }}>{pkg.price}</div>
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
                              borderTop: "1px solid rgba(255,255,255,0.05)",
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
                        color: "rgba(255,255,255,0.5)",
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
                borderTop: "1px solid rgba(255,255,255,0.1)",
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
    </div>
  );
};

export default FinanceManagement;
