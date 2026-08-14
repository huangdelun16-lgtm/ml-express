// FinanceManagement 页面的模块级纯逻辑、常量与类型。
// 从 FinanceManagement.tsx 抽出以缩减巨型组件文件；无 React、无组件状态依赖。

import { AdminAccount, FinanceRecord, Package } from "../services/supabase";

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

const isWaySidePackage = (pkg: Package): boolean => {
  const t = pkg.package_type || "";
  return t === "顺路递" || t === "Eco Way" || t === "တန်တန်လေးပို့";
};

/** 骑手实得跑腿分成：顺路递且配置了固定骑手费时优先；否则 跑腿费 − 起步价快照 */
export const getRiderDeliveryShareMmk = (
  pkg: Package,
  settingsBaseFee: number,
  pricingSettings: Record<string, any>,
): number => {
  const pkgPrice = parseFloat(pkg.price?.replace(/[^\d.]/g, "") || "0");
  if (isWaySidePackage(pkg)) {
    const fixed =
      Number(
        pricingSettings.way_side_courier_per_order ??
          pricingSettings.waySideCourierPerOrder,
      ) || 0;
    if (fixed > 0) {
      return Math.min(pkgPrice, Math.max(0, fixed));
    }
  }
  const baseForPkg = getRiderShareBaseFeeMmk(pkg, settingsBaseFee);
  return Math.max(0, pkgPrice - baseForPkg);
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
