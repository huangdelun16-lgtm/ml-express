import type { Product } from '../services/supabase';
import { productFormSource } from '../services/supabase';
import {
  ProductVariant,
  normalizeProductVariants,
  productHasVariants,
  syncProductAggregateFromVariants,
  validateVariants,
} from './productVariants';

export type MerchantProductFormState = {
  name: string;
  description: string;
  price: string;
  discountPercent: string;
  stock: string;
  image_url: string;
  detail_image_urls: string[];
  is_available: boolean;
  use_variants: boolean;
  variants: ProductVariant[];
};

export function defaultMerchantProductForm(): MerchantProductFormState {
  return {
    name: '',
    description: '',
    price: '',
    discountPercent: '',
    stock: '-1',
    image_url: '',
    detail_image_urls: [],
    is_available: true,
    use_variants: false,
    variants: [],
  };
}

export function merchantProductFormFromProduct(product: Product): MerchantProductFormState {
  const src = productFormSource(product);
  const variants = normalizeProductVariants(src.variants);
  const hasVariants = variants.length > 0;

  let discountPercent = '';
  if (!hasVariants && src.original_price && src.original_price > src.price) {
    discountPercent = Math.round((1 - src.price / src.original_price) * 100).toString();
  }

  return {
    name: src.name,
    description: src.description || '',
    price: src.price.toString(),
    discountPercent,
    stock: src.stock.toString(),
    image_url: src.image_url || '',
    detail_image_urls: src.detail_image_urls || [],
    is_available: src.is_available,
    use_variants: hasVariants,
    variants: hasVariants ? variants : [],
  };
}

export function buildMerchantProductDraft(
  form: MerchantProductFormState,
): { draft: Record<string, unknown>; error?: string } {
  if (!form.name.trim()) {
    return { draft: {}, error: '请填写商品名称' };
  }

  if (form.use_variants) {
    const variants = normalizeProductVariants(form.variants);
    const variantError = validateVariants(variants);
    if (variantError) {
      return { draft: {}, error: variantError };
    }
    const agg = syncProductAggregateFromVariants(variants);
    return {
      draft: {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        price: agg.price,
        original_price: agg.original_price ?? null,
        stock: agg.stock,
        image_url: form.image_url || undefined,
        detail_image_urls: form.detail_image_urls,
        is_available: form.is_available,
        variants,
      },
    };
  }

  if (!form.price.trim()) {
    return { draft: {}, error: '请填写商品价格' };
  }

  const price = parseFloat(form.price);
  if (!Number.isFinite(price) || price <= 0) {
    return { draft: {}, error: '请输入有效的商品价格' };
  }

  const discountPercent = parseFloat(form.discountPercent);
  let originalPrice: number | undefined;
  if (!Number.isNaN(discountPercent) && discountPercent > 0 && discountPercent < 100) {
    originalPrice = Math.round(price / (1 - discountPercent / 100));
  }

  return {
    draft: {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price,
      original_price: originalPrice ?? null,
      stock: parseInt(form.stock, 10),
      image_url: form.image_url || undefined,
      detail_image_urls: form.detail_image_urls,
      is_available: form.is_available,
      variants: null,
    },
  };
}

export function merchantProductHasVariantsDisplay(product: Product): boolean {
  return productHasVariants(product);
}
