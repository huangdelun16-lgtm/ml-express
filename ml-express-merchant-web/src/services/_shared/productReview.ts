// ⚠️ AUTO-GENERATED from /shared/src — 请勿在此文件直接修改。
// 修改请编辑 /shared/src 下的源文件，并运行 "npm run sync:shared"。

// 商品类型与上架审核辅助逻辑（多端共享单一源）
//
// 单一真源：/shared/src/productReview.ts
// 各 app 通过 sync 脚本复制到 src/services/_shared/ 后引用，请勿在副本中修改。

export type ProductVariant = {
  id: string;
  name: string;
  price: number;
  original_price?: number | null;
  stock: number;
  is_available?: boolean;
  sort_order?: number;
};

export interface Product {
  id: string;
  store_id: string;
  category_id?: string;
  name: string;
  description?: string;
  price: number;
  original_price?: number;
  image_url?: string;
  /** 商品详细介绍滚动图（纵向浏览） */
  detail_image_urls?: string[];
  /** 多规格 SKU；null 表示单一价格商品 */
  variants?: ProductVariant[] | null;
  stock: number;
  is_available: boolean;
  sales_count: number;
  /** 上架审核：pending 待审 / approved 已通过 / rejected 已拒绝（缺省按已通过处理） */
  listing_status?: "pending" | "approved" | "rejected" | null;
  /** 已上架商品的编辑待审快照；Admin 通过后合并到主字段 */
  pending_update?: ProductPendingUpdate | null;
  /** Admin 最近一次审核备注；拒绝时写入，商家端展示 */
  listing_review_notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

/** 商家编辑待审字段（不含 listing_status / sales_count） */
export type ProductPendingUpdate = {
  name?: string;
  description?: string;
  price?: number;
  original_price?: number | null;
  image_url?: string;
  detail_image_urls?: string[];
  variants?: ProductVariant[] | null;
  stock?: number;
  is_available?: boolean;
  submitted_at?: string;
};

export function isProductLiveApproved(listingStatus?: string | null): boolean {
  const s = (listingStatus ?? "approved").trim();
  return s === "approved" || s === "";
}

export function hasPendingProductUpdate(
  product: Pick<Product, "pending_update">,
): boolean {
  const pu = product.pending_update;
  if (!pu || typeof pu !== "object") return false;
  return Object.keys(pu).some(
    (k) => k !== "submitted_at" && (pu as Record<string, unknown>)[k] !== undefined,
  );
}

/** 编辑表单：有待审修改时展示商家最新提交的内容 */
export function productFormSource(product: Product): Product {
  if (isProductLiveApproved(product.listing_status) && hasPendingProductUpdate(product)) {
    const pu = product.pending_update!;
    return {
      ...product,
      ...pu,
      original_price: pu.original_price ?? undefined,
    };
  }
  return product;
}

export function productNeedsAdminReview(
  product: Pick<Product, "listing_status" | "pending_update">,
): boolean {
  const ls = (product.listing_status ?? "pending").trim();
  return ls === "pending" || hasPendingProductUpdate(product);
}

/**
 * 商品上架审核（商家 → Admin → 客户端）
 *
 * 1. 新建：listing_status=pending，客户端不可见
 * 2. 编辑已上架(approved)：改动写入 pending_update，客户端仍读主表旧数据
 * 3. 编辑待审/被拒：直接写主表，保持 pending，客户端仍不可见
 * 4. Admin「商家管理」通过：合并 pending_update 或首次上架 → listing_status=approved
 * 5. 客户端仅 getPublicStoreProducts：listing_status=approved 且 is_available=true
 */
export function pickProductReviewSnapshot(product: Product): ProductPendingUpdate {
  return {
    name: product.name,
    description: product.description,
    price: product.price,
    original_price: product.original_price ?? null,
    image_url: product.image_url,
    detail_image_urls: product.detail_image_urls,
    variants: product.variants ?? null,
    stock: product.stock,
    is_available: product.is_available,
  };
}

export function buildPendingUpdateFromProduct(
  product: Product,
  changes: Partial<ProductPendingUpdate>,
): ProductPendingUpdate {
  const base =
    isProductLiveApproved(product.listing_status) && hasPendingProductUpdate(product)
      ? { ...pickProductReviewSnapshot(product), ...product.pending_update! }
      : pickProductReviewSnapshot(product);
  return { ...base, ...changes };
}

export function normalizePendingPayload(
  raw: Partial<ProductPendingUpdate> & Record<string, unknown>,
): ProductPendingUpdate {
  return {
    name: raw.name as string | undefined,
    description: raw.description as string | undefined,
    price: raw.price as number | undefined,
    original_price: raw.original_price as number | null | undefined,
    image_url: raw.image_url as string | undefined,
    detail_image_urls: raw.detail_image_urls as string[] | undefined,
    variants: (raw.variants as ProductVariant[] | null | undefined) ?? undefined,
    stock: raw.stock as number | undefined,
    is_available: raw.is_available as boolean | undefined,
  };
}

export function toDirectProductPatch(snapshot: ProductPendingUpdate): Partial<Product> {
  return {
    name: snapshot.name,
    description: snapshot.description,
    price: snapshot.price,
    original_price: snapshot.original_price ?? undefined,
    image_url: snapshot.image_url,
    detail_image_urls: snapshot.detail_image_urls,
    variants: snapshot.variants ?? null,
    stock: snapshot.stock,
    is_available: snapshot.is_available,
  };
}
