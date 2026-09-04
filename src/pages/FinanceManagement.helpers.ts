// FinanceManagement 页面的模块级纯逻辑、常量与类型。
// 从 FinanceManagement.tsx 抽出以缩减巨型组件文件；无 React、无组件状态依赖。

import { AdminAccount, FinanceRecord, Package } from "../services/supabase";
import { resolvePackageCodAmount } from "../utils/packageCodAmount";

export type FinanceStoreRef = {
  id?: string;
  store_name?: string;
};

export const REGIONS = [
  { id: "mandalay", name: "曼德勒", prefix: "MDY" },
  { id: "maymyo", name: "彬乌伦", prefix: "POL" },
  { id: "yangon", name: "仰光", prefix: "YGN" },
  { id: "naypyidaw", name: "内比都", prefix: "NPW" },
  { id: "taunggyi", name: "东枝", prefix: "TGI" },
  { id: "lashio", name: "腊戌", prefix: "LSO" },
  { id: "muse", name: "木姐", prefix: "MUSE" },
];

export const DEFAULT_PRICING_REGION_ID = "mandalay";
const PRICING_REGION_ID_SET = new Set(REGIONS.map((r) => r.id));

const normalizePackageRegionField = (raw?: string | null): string | null => {
  if (raw == null || !String(raw).trim()) return null;
  const s = String(raw).trim().toLowerCase();
  if (PRICING_REGION_ID_SET.has(s)) return s;
  const aliases: Record<string, string> = {
    mdy: "mandalay",
    ygn: "yangon",
    pol: "maymyo",
    npw: "naypyidaw",
    tgi: "taunggyi",
    lso: "lashio",
    muse: "muse",
  };
  const mapped = aliases[s];
  return mapped && PRICING_REGION_ID_SET.has(mapped) ? mapped : null;
};

/** 包裹计费领区：库里的 region → 单号前缀 → 默认曼德勒（与 Admin 分领区改价一致） */
export const resolvePackagePricingRegionId = (pkg: Package): string => {
  const fromField = normalizePackageRegionField(pkg.region);
  if (fromField) return fromField;
  const id = (pkg.id || "").toUpperCase();
  for (const r of REGIONS) {
    if (id.startsWith(r.prefix)) return r.id;
  }
  return DEFAULT_PRICING_REGION_ID;
};

export const getRegionalPricingForPackage = (
  pkg: Package,
  map: Record<string, Record<string, any>>,
): Record<string, any> => {
  const rid = resolvePackagePricingRegionId(pkg);
  return map[rid] || map[DEFAULT_PRICING_REGION_ID] || {};
};

export const getDateKey = (value?: string): string => {
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

export const getLocalDateYYYYMMDD = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const getLocalDateMinusDays = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/** 本地日历日加减，避免 `YYYY-MM-DD` + toISOString 在 UTC+6:30 跳日。 */
export const shiftLocalDateYYYYMMDD = (
  yyyyMmDd: string,
  days: number,
): string => {
  const parts = String(yyyyMmDd || "").split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (!y || !m || !d) return yyyyMmDd;
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};

export const getLocalMonthBounds = (
  yearMonth?: string,
  now: Date = new Date(),
): { start: string; end: string; yearMonth: string } => {
  const key =
    yearMonth ||
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) {
    return { start: "", end: "", yearMonth: key };
  }
  const last = new Date(y, m, 0).getDate();
  const mm = String(m).padStart(2, "0");
  return {
    yearMonth: key,
    start: `${y}-${mm}-01`,
    end: `${y}-${mm}-${String(last).padStart(2, "0")}`,
  };
};

export const isPackageInLocalMonth = (
  pkg: Package,
  yearMonth: string,
): boolean => {
  const dateKey = getDateKey(
    pkg.delivery_time || pkg.updated_at || pkg.created_at || pkg.create_time,
  );
  return Boolean(dateKey && yearMonth && dateKey.startsWith(yearMonth));
};

/** 生成本月工资：已送达 + 有骑手 + 送达日落在该本地月。 */
export const groupDeliveredPackagesForSalaryMonth = (
  packages: Package[],
  yearMonth: string,
): Record<string, Package[]> => {
  const groups: Record<string, Package[]> = {};
  packages.forEach((pkg) => {
    if (pkg.status !== "已送达") return;
    if (!pkg.courier || pkg.courier === "待分配") return;
    if (!isPackageInLocalMonth(pkg, yearMonth)) return;
    if (!groups[pkg.courier]) groups[pkg.courier] = [];
    groups[pkg.courier].push(pkg);
  });
  return groups;
};

export const isCompletedFinanceRecord = (r: { status?: string }): boolean =>
  r.status === "completed";

/**
 * 领区前缀：账号 region 字段优先，再按用户名从长到短匹配
 *（MUSE 先于 MDY）。认七城。
 */
export const detectFinanceRegionPrefix = (
  username?: string,
  accountRegion?: string,
): string => {
  const region = String(accountRegion || "").trim().toLowerCase();
  if (region) {
    const byId = REGIONS.find(
      (r) => r.id === region || r.prefix.toLowerCase() === region,
    );
    if (byId) return byId.prefix;
    const aliased = normalizePackageRegionField(region);
    if (aliased) {
      const mapped = REGIONS.find((r) => r.id === aliased);
      if (mapped) return mapped.prefix;
    }
  }
  const userUpper = String(username || "").toUpperCase();
  const byPrefix = [...REGIONS]
    .sort((a, b) => b.prefix.length - a.prefix.length)
    .find((r) => userUpper.startsWith(r.prefix));
  return byPrefix?.prefix || "";
};

export const packageMatchesRegionPrefix = (
  pkg: { id?: string },
  regionPrefix?: string,
): boolean => {
  if (!regionPrefix) return true;
  return (pkg.id || "")
    .toUpperCase()
    .startsWith(regionPrefix.toUpperCase());
};

export const parsePackagePriceMmk = (pkg: {
  price?: string | null;
}): number => parseFloat(String(pkg.price ?? "").replace(/[^\d.]/g, "") || "0");

/** 骑手分成用的起步价：有快照用下单时起步价，否则用当前系统设置（仅旧数据） */
export const getRiderShareBaseFeeMmk = (
  pkg: Package,
  settingsBaseFee: number,
): number => {
  const snap = pkg.pricing_base_fee_mmk;
  if (snap != null && Number.isFinite(Number(snap)) && Number(snap) >= 0) {
    return Number(snap);
  }
  return settingsBaseFee;
};

export const isWaySidePackage = (pkg: { package_type?: string | null }): boolean => {
  const t = (pkg.package_type || "").trim();
  return t === "顺路递" || t === "Eco Way" || t === "တန်တန်လေးပို့";
};

/** 顺路递对半：奇数余 1 MMK 归平台，两边相加等于实付 */
export const splitWaySideFiftyFifty = (
  priceMmk: number,
): { rider: number; platform: number } => {
  const price = Math.max(0, Math.round(Number(priceMmk) || 0));
  const rider = Math.floor(price / 2);
  return { rider, platform: price - rider };
};

/** 平台从该单跑腿费留下的部分：准时达等=起步价快照（不超过实付）；顺路递=实付一半 */
export const getPlatformDeliveryKeepMmk = (
  pkg: Package,
  settingsBaseFee: number,
): number => {
  const price = Math.max(0, parsePackagePriceMmk(pkg));
  if (isWaySidePackage(pkg)) {
    return splitWaySideFiftyFifty(price).platform;
  }
  return Math.min(getRiderShareBaseFeeMmk(pkg, settingsBaseFee), price);
};

/** 骑手实得跑腿分成：顺路递=实付一半；否则 跑腿费 − 起步价快照 */
export const getRiderDeliveryShareMmk = (
  pkg: Package,
  settingsBaseFee: number,
  _pricingSettings?: Record<string, any>,
): number => {
  const pkgPrice = parsePackagePriceMmk(pkg);
  if (isWaySidePackage(pkg)) {
    return splitWaySideFiftyFifty(pkgPrice).rider;
  }
  const baseForPkg = getRiderShareBaseFeeMmk(pkg, settingsBaseFee);
  return Math.max(0, pkgPrice - baseForPkg);
};

const WALLET_PAYMENT_TAG_RE =
  /\[(?:商品费用 \(仅余额支付\)|商品费用（仅余额支付）|Item Cost \(Balance Only\)|ကုန်ပစ္စည်းဖိုး \(လက်ကျန်ငွေဖြင့်သာ\)|平台支付|Platform Payment|ပလက်ဖောင်းမှ ပေးချေခြင်း|余额支付|Balance Payment|လက်ကျန်ငွေဖြင့် ပေးချေခြင်း): (.*?) MMK\]/g;

const parseMmkLabel = (raw?: string | null): number =>
  parseFloat(String(raw ?? "").replace(/[^\d.]/g, "") || "0") || 0;

/**
 * 钱包/平台已收的货款：余额支付、平台支付、商品费用（仅余额）。
 * 不含「付给商家 / 骑手代付」（那是现金代收）。同一描述里多条标签取最大，避免 8000+8000。
 */
export const getPlatformPaymentAmountFromDescription = (
  description?: string | null,
): number => {
  if (!description) return 0;
  let max = 0;
  const re = new RegExp(WALLET_PAYMENT_TAG_RE.source, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(description))) {
    const n = parseMmkLabel(match[1]);
    if (n > max) max = n;
  }
  return max;
};

const sameMoneyMmk = (a: number, b: number): boolean =>
  a > 0 && b > 0 && Math.round(a) === Math.round(b);

export type MerchantSettlementParts = {
  rawCodMmk: number;
  rawPlatformMmk: number;
  duplicate: boolean;
  countedCodMmk: number;
  countedPlatformMmk: number;
  pendingCodMmk: number;
  pendingPlatformMmk: number;
  unclearedMmk: number;
};

const emptyMerchantSettlementParts = (): MerchantSettlementParts => ({
  rawCodMmk: 0,
  rawPlatformMmk: 0,
  duplicate: false,
  countedCodMmk: 0,
  countedPlatformMmk: 0,
  pendingCodMmk: 0,
  pendingPlatformMmk: 0,
  unclearedMmk: 0,
});

export const isFinanceDeliveredStatus = (status?: string): boolean =>
  status === "已送达" || status === "已完成";

export const isMerchantFinancePackage = (
  pkg: Package,
  stores: FinanceStoreRef[],
): boolean => {
  if (pkg.delivery_store_id) return true;
  return stores.some(
    (store) =>
      store.store_name === pkg.sender_name ||
      Boolean(
        pkg.sender_name &&
          store.store_name &&
          pkg.sender_name.startsWith(store.store_name),
      ),
  );
};

/**
 * 商家结清单：代收与余额/平台是两条路。同一笔货款两处都写了时只计一次（优先平台，钱已在钱包）。
 */
export const getMerchantSettlementParts = (
  pkg: Package,
  stores: FinanceStoreRef[],
): MerchantSettlementParts => {
  if (!isMerchantFinancePackage(pkg, stores)) {
    return emptyMerchantSettlementParts();
  }
  if (!isFinanceDeliveredStatus(pkg.status)) {
    return emptyMerchantSettlementParts();
  }

  const rawCodMmk = resolvePackageCodAmount(pkg);
  const rawPlatformMmk = getPlatformPaymentAmountFromDescription(
    pkg.description,
  );
  const duplicate = sameMoneyMmk(rawCodMmk, rawPlatformMmk);
  const countedCodMmk = duplicate ? 0 : rawCodMmk;
  const countedPlatformMmk = rawPlatformMmk;
  const pendingCodMmk =
    !pkg.cod_settled && countedCodMmk > 0 && pkg.rider_settled
      ? countedCodMmk
      : 0;
  const pendingPlatformMmk = !pkg.cod_settled ? countedPlatformMmk : 0;

  return {
    rawCodMmk,
    rawPlatformMmk,
    duplicate,
    countedCodMmk,
    countedPlatformMmk,
    pendingCodMmk,
    pendingPlatformMmk,
    unclearedMmk: pendingCodMmk + pendingPlatformMmk,
  };
};

export const getMerchantRecordedAmountMmk = (
  pkg: Package,
  stores: FinanceStoreRef[],
): number => {
  const parts = getMerchantSettlementParts(pkg, stores);
  return parts.countedCodMmk + parts.countedPlatformMmk;
};

/** 与「商家COD明细」待结清金额同一口径：去重后的代收（须骑手已交）+ 余额/平台支付。 */
export const getMerchantUnclearedAmountMmk = (
  pkg: Package,
  stores: FinanceStoreRef[],
): number => getMerchantSettlementParts(pkg, stores).unclearedMmk;

export const getPackageFinanceDateKey = (pkg: Package): string =>
  getDateKey(
    pkg.delivery_time || pkg.updated_at || pkg.created_at || pkg.create_time,
  );

export type CashSettlementStatusFilter = "unsettled" | "settled" | "all";

export const matchesCashSettlementStatus = (
  pkg: { rider_settled?: boolean },
  status: CashSettlementStatusFilter,
): boolean => {
  if (status === "unsettled") return !pkg.rider_settled;
  if (status === "settled") return Boolean(pkg.rider_settled);
  return true;
};

/** 已送达现金单骑手应上缴：跑腿费 + 商家现金 COD。不含平台支付。 */
export const getRiderCashHandInAmountMmk = (
  pkg: Package,
  stores: FinanceStoreRef[],
): number => {
  if (pkg.payment_method !== "cash") return 0;
  if (!isFinanceDeliveredStatus(pkg.status)) return 0;
  const price = parsePackagePriceMmk(pkg);
  const cod = isMerchantFinancePackage(pkg, stores)
    ? Number(pkg.cod_amount || 0)
    : 0;
  return price + cod;
};

export const isRiderCashUnsettledPackage = (pkg: Package): boolean =>
  pkg.payment_method === "cash" &&
  isFinanceDeliveredStatus(pkg.status) &&
  !pkg.rider_settled;

/** 收款日骑手未交现金：已送达现金单的跑腿费 + 商家现金 COD。 */
export const getPendingRiderCashAmountMmk = (
  pkg: Package,
  cashCollectionDate: string,
  stores: FinanceStoreRef[],
): number => {
  if (!isRiderCashUnsettledPackage(pkg)) return 0;
  const dateKey = getPackageFinanceDateKey(pkg);
  if (!dateKey || dateKey !== cashCollectionDate) return 0;
  return getRiderCashHandInAmountMmk(pkg, stores);
};

export type RiderCashCollectionBreakdown = {
  selectedDayPackages: Package[];
  selectedDayCashMmk: number;
  selectedDayPlatformMmk: number;
  overduePackages: Package[];
  overdueCashMmk: number;
  earliestOverdueDate: string;
};

/**
 * 当日收款骑手行：所选日现金/平台按结清筛选项；往日未结现金始终露出，避免漏结。
 */
export const summarizeRiderCashCollection = ({
  packages,
  selectedDate,
  settlementStatus,
  stores,
  regionPrefix,
  courierName,
  getPlatformLineTotal,
}: {
  packages: Package[];
  selectedDate: string;
  settlementStatus: CashSettlementStatusFilter;
  stores: FinanceStoreRef[];
  regionPrefix?: string;
  courierName?: string;
  getPlatformLineTotal?: (pkg: Package) => number;
}): RiderCashCollectionBreakdown => {
  const selectedDayPackages: Package[] = [];
  const overduePackages: Package[] = [];
  let selectedDayCashMmk = 0;
  let selectedDayPlatformMmk = 0;
  let overdueCashMmk = 0;
  let earliestOverdueDate = "";
  const wantCourier = Boolean(courierName);
  const platformOf =
    getPlatformLineTotal ||
    ((pkg: Package) =>
      getPlatformPaymentAmountFromDescription(pkg.description));

  for (const pkg of packages) {
    if (!isFinanceDeliveredStatus(pkg.status)) continue;
    if (regionPrefix && !packageMatchesRegionPrefix(pkg, regionPrefix)) {
      continue;
    }
    if (
      wantCourier &&
      String(pkg.courier || "").trim() !== String(courierName).trim()
    ) {
      continue;
    }

    const dateKey = getPackageFinanceDateKey(pkg);
    if (
      dateKey &&
      dateKey === selectedDate &&
      matchesCashSettlementStatus(pkg, settlementStatus)
    ) {
      selectedDayPackages.push(pkg);
      selectedDayCashMmk += getRiderCashHandInAmountMmk(pkg, stores);
      selectedDayPlatformMmk += platformOf(pkg);
    }

    if (dateKey && dateKey < selectedDate && isRiderCashUnsettledPackage(pkg)) {
      overduePackages.push(pkg);
      overdueCashMmk += getRiderCashHandInAmountMmk(pkg, stores);
      if (!earliestOverdueDate || dateKey < earliestOverdueDate) {
        earliestOverdueDate = dateKey;
      }
    }
  }

  return {
    selectedDayPackages,
    selectedDayCashMmk,
    selectedDayPlatformMmk,
    overduePackages,
    overdueCashMmk,
    earliestOverdueDate,
  };
};

export type FinanceOverviewSummary = {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  pendingPayments: number;
  packageIncome: number;
  packageIncomeCash: number;
  packageIncomeBalance: number;
  packageIncomeCashCount: number;
  packageIncomeBalanceCount: number;
  packageCount: number;
  courierKmCost: number;
  totalKm: number;
  merchantsCollection: number;
  totalPlatformPayment: number;
  totalStartingFee: number;
  waySidePlatformKeep: number;
  waySideRiderShare: number;
  waySideOrderIncome: number;
  waySideCount: number;
  booksBalanced: boolean;
  monthlyRiderFee: number;
  monthlyRiderCount: number;
  dailyRiderFee: number;
  dailyRiderCount: number;
};

/** 财务总览九张卡的唯一计算入口。手工账只计 completed；包裹账与 COD 明细对齐。 */
export const calculateFinanceOverviewSummary = ({
  records,
  packages,
  stores,
  regionalPricingMap,
  cashCollectionDate,
  now = new Date(),
  regionPrefix,
}: {
  records: FinanceRecord[];
  packages: Package[];
  stores: FinanceStoreRef[];
  regionalPricingMap: Record<string, Record<string, any>>;
  cashCollectionDate: string;
  now?: Date;
  regionPrefix?: string;
}): FinanceOverviewSummary => {
  const scopedPackages = regionPrefix
    ? packages.filter((pkg) => packageMatchesRegionPrefix(pkg, regionPrefix))
    : packages;
  const completed = records.filter((r) => r.status === "completed");
  const totalIncome = completed
    .filter((r) => r.record_type === "income")
    .reduce((sum, record) => sum + (record.amount || 0), 0);
  const totalExpense = completed
    .filter((r) => r.record_type === "expense")
    .reduce((sum, record) => sum + (record.amount || 0), 0);

  const pendingPayments = scopedPackages.reduce(
    (sum, pkg) =>
      sum + getPendingRiderCashAmountMmk(pkg, cashCollectionDate, stores),
    0,
  );

  const deliveredPackages = scopedPackages.filter((pkg) =>
    isFinanceDeliveredStatus(pkg.status),
  );

  let packageIncome = 0;
  let packageIncomeCash = 0;
  let packageIncomeBalance = 0;
  let packageIncomeCashCount = 0;
  let packageIncomeBalanceCount = 0;
  let settledPackageCount = 0;
  let totalPlatformPayment = 0;
  let courierKmCost = 0;
  let totalKm = 0;
  let totalStartingFee = 0;
  let waySidePlatformKeep = 0;
  let waySideRiderShare = 0;
  let waySideOrderIncome = 0;
  let waySideCount = 0;
  let monthlyRiderFee = 0;
  let monthlyRiderCount = 0;
  let dailyRiderFee = 0;
  let dailyRiderCount = 0;

  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  deliveredPackages.forEach((pkg) => {
    const platformAmount = getPlatformPaymentAmountFromDescription(
      pkg.description,
    );
    if (platformAmount > 0) totalPlatformPayment += platformAmount;

    const price = parsePackagePriceMmk(pkg);
    const incomeRecognized =
      pkg.payment_method === "cash" ? !!pkg.rider_settled : true;
    if (incomeRecognized) {
      if (pkg.payment_method === "cash") {
        packageIncomeCash += price;
        packageIncomeCashCount += 1;
      } else {
        packageIncomeBalance += price;
        packageIncomeBalanceCount += 1;
      }
      packageIncome += price;
      settledPackageCount += 1;
    }

    const regional = getRegionalPricingForPackage(pkg, regionalPricingMap);
    const settingsBaseFee = regional.base_fee || 1500;
    const riderShare = getRiderDeliveryShareMmk(
      pkg,
      settingsBaseFee,
      regional,
    );
    const platformKeep = getPlatformDeliveryKeepMmk(pkg, settingsBaseFee);
    totalKm += pkg.delivery_distance || 0;

    const dateKey = getDateKey(
      pkg.delivery_time || pkg.updated_at || pkg.created_at,
    );
    if (dateKey && dateKey.startsWith(currentMonthKey)) {
      monthlyRiderFee += riderShare;
      monthlyRiderCount += 1;
    }
    if (dateKey && dateKey === cashCollectionDate) {
      dailyRiderFee += riderShare;
      dailyRiderCount += 1;
    }

    if (!incomeRecognized) return;

    courierKmCost += riderShare;
    if (isWaySidePackage(pkg)) {
      waySidePlatformKeep += platformKeep;
      waySideRiderShare += riderShare;
      waySideOrderIncome += price;
      waySideCount += 1;
    } else {
      totalStartingFee += platformKeep;
    }
  });

  const merchantsCollection = scopedPackages.reduce(
    (sum, pkg) => sum + getMerchantUnclearedAmountMmk(pkg, stores),
    0,
  );

  return {
    totalIncome,
    totalExpense,
    netProfit: totalIncome - totalExpense,
    pendingPayments,
    packageIncome,
    packageIncomeCash,
    packageIncomeBalance,
    packageIncomeCashCount,
    packageIncomeBalanceCount,
    packageCount: settledPackageCount,
    courierKmCost,
    totalKm,
    merchantsCollection,
    totalPlatformPayment,
    totalStartingFee,
    waySidePlatformKeep,
    waySideRiderShare,
    waySideOrderIncome,
    waySideCount,
    booksBalanced:
      totalStartingFee + waySidePlatformKeep + courierKmCost === packageIncome,
    monthlyRiderFee,
    monthlyRiderCount,
    dailyRiderFee,
    dailyRiderCount,
  };
};

export type TabKey =
  | "overview"
  | "records"
  | "analytics"
  | "package_records"
  | "courier_records"
  | "cash_collection"
  | "merchants_collection";
export type FilterStatus = "all" | FinanceRecord["status"];
export type FilterType = "all" | FinanceRecord["record_type"];

export interface FinanceForm {
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

export const defaultForm: FinanceForm = {
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

export const currencyOptions = ["MMK", "USD", "THB", "RMB"];
export const paymentOptions = [
  { value: "cash", label: "现金" },
  { value: "kbz_pay", label: "KBZ Pay" },
  { value: "wave_pay", label: "Wave Pay" },
  { value: "aya_pay", label: "AYA Pay" },
  { value: "uab_pay", label: "UAB Pay" },
  { value: "alipay", label: "支付宝" },
  { value: "bank_transfer", label: "银行转账" },
];

export const getCategoryOptions = (language: string) => {
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

export const statusColors: Record<FinanceRecord["status"], string> = {
  pending: "#f39c12",
  completed: "#27ae60",
  cancelled: "#e74c3c",
};

export const typeColors: Record<FinanceRecord["record_type"], string> = {
  income: "#2ecc71",
  expense: "#e74c3c",
};

export type FinanceTimePeriod = "7days" | "30days" | "90days" | "all";

export const getDaysFromPeriod = (period: FinanceTimePeriod): number | null => {
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

export const filterByTimePeriod = <
  T extends {
    record_date?: string;
    created_at?: string;
    create_time?: string;
  },
>(
  data: T[],
  period: FinanceTimePeriod,
  dateField: "record_date" | "created_at" | "create_time" = "record_date",
): T[] => {
  const days = getDaysFromPeriod(period);
  if (days === null) return data;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return data.filter((item) => {
    const dateStr = item[dateField];
    if (!dateStr) {
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

/** 财务「当日收款」骑手列表：账号系统（骑手/骑手队长）为准，再合并 couriers 表实时字段。勿改匹配字段。 */
export const combineRidersFromAdminAccounts = (
  accountsData: AdminAccount[],
  realTimeData: Array<Record<string, any>>,
) => {
  const riderAccounts = accountsData.filter(
    (acc) => acc.position === "骑手" || acc.position === "骑手队长",
  );

  return riderAccounts.map((acc) => {
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
};
