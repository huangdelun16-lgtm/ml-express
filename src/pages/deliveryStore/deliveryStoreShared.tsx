import React from 'react';
import { formatVariantsForDisplay } from '../../utils/productVariants';
import {
  MERCHANT_STORE_TYPE_OPTIONS,
  buildMerchantStoreTypeLabelMap,
} from '../../constants/merchantStoreTypes';

export const REGIONS = [
  { id: 'mandalay', name: '曼德勒', prefix: 'MDY' },
  { id: 'maymyo', name: '彬乌伦', prefix: 'POL' },
  { id: 'yangon', name: '仰光', prefix: 'YGN' },
  { id: 'naypyidaw', name: '内比都', prefix: 'NPW' },
  { id: 'taunggyi', name: '东枝', prefix: 'TGI' },
  { id: 'lashio', name: '腊戌', prefix: 'LSO' },
  { id: 'muse', name: '木姐', prefix: 'MUSE' }
];

/** 表单 region → 列表城市筛选 key（与 myanmarCities 一致） */
export const regionToCityKey = (region?: string): string | null => {
  if (!region) return null;
  if (region === 'maymyo') return 'pyinoolwin';
  return region;
};

export const DEFAULT_OPERATING_HOURS = '08:00 - 22:00';

export const OPERATING_HOURS_PRESETS = [
  { label: '08:00 - 22:00', value: '08:00 - 22:00' },
  { label: '09:00 - 21:00', value: '09:00 - 21:00' },
  { label: '07:00 - 23:00', value: '07:00 - 23:00' },
  { label: '10:00 - 20:00', value: '10:00 - 20:00' },
];

export const PACKING_SLA_MINUTE_PRESETS = [8, 12, 15, 20, 30];

const normalizeOperatingTime = (value: string): string => {
  const trimmed = (value || '').trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return '';
  const hours = Math.min(23, Math.max(0, parseInt(match[1], 10)));
  const minutes = Math.min(59, Math.max(0, parseInt(match[2], 10)));
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

export const parseOperatingHours = (hours: string): { open: string; close: string } => {
  const parts = (hours || DEFAULT_OPERATING_HOURS).split(/\s*-\s*/);
  return {
    open: normalizeOperatingTime(parts[0] || '') || '08:00',
    close: normalizeOperatingTime(parts[1] || '') || '22:00',
  };
};

export const formatOperatingHours = (open: string, close: string): string =>
  `${normalizeOperatingTime(open) || '08:00'} - ${normalizeOperatingTime(close) || '22:00'}`;

export const getOperatingDurationLabel = (open: string, close: string): string => {
  const start = normalizeOperatingTime(open);
  const end = normalizeOperatingTime(close);
  if (!start || !end) return '';

  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);
  let startTotal = startHour * 60 + startMinute;
  let endTotal = endHour * 60 + endMinute;
  if (endTotal <= startTotal) endTotal += 24 * 60;

  const diffMinutes = endTotal - startTotal;
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  if (minutes === 0) return `共 ${hours} 小时`;
  return `共 ${hours} 小时 ${minutes} 分钟`;
};

export const STORE_TYPES = MERCHANT_STORE_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.zh }));
export const STORE_TYPE_LABELS = buildMerchantStoreTypeLabelMap();

// Google Maps API 配置
export const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
if (!GOOGLE_MAPS_API_KEY) {
  console.error('❌ Google Maps API Key 未配置！请检查环境变量 REACT_APP_GOOGLE_MAPS_API_KEY');
}

// 添加CSS动画样式
const spinAnimation = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// 注入CSS样式
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    ${spinAnimation}
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    select option {
      background-color: #1e293b;
      color: white;
      padding: 10px;
    }
    /* 优化滚动条样式 */
    ::-webkit-scrollbar {
      width: 8px;
    }
    ::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 10px;
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 10px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  `;
  document.head.appendChild(style);
}

// 错误边界组件
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Google Maps Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100%',
          height: '400px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: 'white'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗺️</div>
          <h3 style={{ margin: '0 0 0.5rem 0' }}>地图加载失败</h3>
          <p style={{ margin: '0', opacity: 0.8, textAlign: 'center' }}>
            Google Maps API 配置问题<br/>
            请检查 API Key 设置
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

/** 仅当明确为 approved 时视为已上架；null/undefined/空串 等均视为待审核（避免未跑迁移时误判为「已上架」） */
export function normalizeProductListingStatus(product: { listing_status?: string | null }): 'pending' | 'approved' | 'rejected' {
  const s = typeof product.listing_status === 'string' ? product.listing_status.trim() : '';
  if (s === 'approved') return 'approved';
  if (s === 'rejected') return 'rejected';
  return 'pending';
}

export function hasPendingProductUpdate(product: { pending_update?: Record<string, unknown> | null }): boolean {
  const pu = product.pending_update;
  if (!pu || typeof pu !== 'object') return false;
  return Object.keys(pu).some((k) => k !== 'submitted_at' && pu[k] !== undefined);
}

export function productNeedsAdminReview(product: {
  listing_status?: string | null;
  pending_update?: Record<string, unknown> | null;
}): boolean {
  return normalizeProductListingStatus(product) === 'pending' || hasPendingProductUpdate(product);
}

/** Admin 审核列表：已上架商品的待审修改用 pending_update 预览 */
export function adminProductDisplay(product: Record<string, unknown>) {
  if (normalizeProductListingStatus(product as { listing_status?: string | null }) === 'approved' && hasPendingProductUpdate(product as { pending_update?: Record<string, unknown> | null })) {
    return { ...product, ...(product.pending_update as Record<string, unknown>) };
  }
  return product;
}

export const ADMIN_PRODUCT_FIELD_LABELS: Record<string, string> = {
  name: '商品名称',
  description: '商品描述',
  price: '售价',
  original_price: '原价',
  variants: '规格与价格',
  image_url: '主图',
  detail_image_urls: '详细介绍图',
  stock: '库存',
  is_available: '上架状态',
};

export const ADMIN_PRODUCT_DIFF_KEYS = Object.keys(ADMIN_PRODUCT_FIELD_LABELS);

function adminProductValuesEqual(key: string, a: unknown, b: unknown): boolean {
  if (key === 'detail_image_urls' || key === 'variants') {
    return JSON.stringify(a ?? (key === 'variants' ? null : [])) === JSON.stringify(b ?? (key === 'variants' ? null : []));
  }
  if (key === 'original_price') {
    const na = a == null || a === '' ? null : Number(a);
    const nb = b == null || b === '' ? null : Number(b);
    return na === nb;
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

export function formatAdminProductFieldText(key: string, value: unknown): string {
  if (value === undefined || value === null || value === '') {
    return key === 'description' ? '无' : '—';
  }
  if (key === 'price' || key === 'original_price') {
    const n = Number(value);
    return Number.isFinite(n) ? `${n.toLocaleString()} MMK` : '—';
  }
  if (key === 'stock') return Number(value) === -1 ? '无限' : String(value);
  if (key === 'variants') return formatVariantsForDisplay(value);
  if (key === 'is_available') return value ? '在售' : '下架';
  if (key === 'detail_image_urls') {
    const arr = Array.isArray(value) ? value : [];
    return arr.length ? `${arr.length} 张` : '无';
  }
  if (key === 'image_url') return value ? '已上传' : '无';
  if (key === 'description') {
    const s = String(value).trim();
    return s || '无';
  }
  return String(value);
}

type AdminProductChangeRow = {
  key: string;
  label: string;
  before: unknown;
  after: unknown;
  changed: boolean;
  isNewProduct?: boolean;
};

export function buildAdminProductChanges(product: Record<string, unknown>): AdminProductChangeRow[] {
  const ls = normalizeProductListingStatus(product as { listing_status?: string | null });
  const pu = product.pending_update as Record<string, unknown> | null | undefined;
  const isEditPending = ls === 'approved' && hasPendingProductUpdate(product as { pending_update?: Record<string, unknown> | null });

  if (isEditPending && pu) {
    return ADMIN_PRODUCT_DIFF_KEYS.filter((key) => pu[key] !== undefined).map((key) => ({
      key,
      label: ADMIN_PRODUCT_FIELD_LABELS[key],
      before: product[key],
      after: pu[key],
      changed: !adminProductValuesEqual(key, product[key], pu[key]),
    }));
  }

  if (ls === 'pending') {
    return ADMIN_PRODUCT_DIFF_KEYS.map((key) => ({
      key,
      label: ADMIN_PRODUCT_FIELD_LABELS[key],
      before: null,
      after: product[key],
      changed: true,
      isNewProduct: true,
    }));
  }

  return [];
}

export function listingStatusLabel(status: 'pending' | 'approved' | 'rejected', isEditPending: boolean): string {
  if (isEditPending) return '修改待审';
  if (status === 'pending') return '待审核';
  if (status === 'rejected') return '已拒绝';
  return '已上架';
}

export const DEFAULT_ADMIN_PRODUCT_FORM = {
  name: '',
  description: '',
  price: '',
  image_url: '',
  detail_image_urls: [] as string[],
  use_variants: false,
  variants: [] as import('../../utils/productVariants').ProductVariant[],
};

