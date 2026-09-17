import { supabase } from './supabaseClient';
import LoggerService from '../LoggerService';
import { deliveryStoreService } from './deliveryStoreService';
import { rewritePublicStorageUrl } from './nativeSupabaseUrl';
import { haversineMeters, toLatLng, type LatLng } from '../../utils/geoDistance';
import { productMeetsDiscountPercent, getProductDiscountPercent } from '../../utils/productVariants';
import type { Product } from './types';

export const NEARBY_DEAL_RADIUS_M = 1500;
export const NEARBY_DEAL_MIN_OFF_PERCENT = 30;
const MAX_DEALS = 12;
const STORE_ID_CHUNK = 40;

export type NearbyDealProduct = {
  id: string;
  name: string;
  image_url?: string;
  price: number;
  original_price?: number;
  stock?: number;
  variants?: Product['variants'];
  storeId: string;
  storeName: string;
  distanceM: number;
  discountPercent: number;
};

function chunkIds(ids: string[], size: number): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
  return out;
}

export async function fetchNearbyDiscountProducts(origin: LatLng): Promise<NearbyDealProduct[]> {
  try {
    const stores = await deliveryStoreService.getActiveStores();
    const nearby = stores
      .map((store) => {
        const coord = toLatLng(store);
        if (!coord) return null;
        const distanceM = haversineMeters(origin, coord);
        if (distanceM > NEARBY_DEAL_RADIUS_M) return null;
        return {
          id: String(store.id),
          storeName: String(store.store_name || ''),
          distanceM,
        };
      })
      .filter((row): row is { id: string; storeName: string; distanceM: number } => Boolean(row));

    if (nearby.length === 0) return [];

    const storeById = new Map(nearby.map((row) => [row.id, row]));
    const products: Product[] = [];

    for (const ids of chunkIds([...storeById.keys()], STORE_ID_CHUNK)) {
      const { data, error } = await supabase
        .from('products')
        .select('id, store_id, name, price, original_price, image_url, variants, is_available, listing_status, stock')
        .in('store_id', ids)
        .eq('is_available', true)
        .eq('listing_status', 'approved');

      if (error) {
        LoggerService.error('附近优惠商品查询失败:', error);
        continue;
      }
      products.push(...((data || []) as Product[]));
    }

    const deals: NearbyDealProduct[] = [];
    for (const product of products) {
      if (!productMeetsDiscountPercent(product, NEARBY_DEAL_MIN_OFF_PERCENT)) continue;
      const store = storeById.get(String(product.store_id));
      if (!store) continue;
      deals.push({
        id: String(product.id),
        name: String(product.name || ''),
        image_url: product.image_url ? rewritePublicStorageUrl(product.image_url) : product.image_url,
        price: product.price,
        original_price: product.original_price,
        stock: product.stock,
        variants: product.variants,
        storeId: store.id,
        storeName: store.storeName,
        distanceM: store.distanceM,
        discountPercent: getProductDiscountPercent(product),
      });
    }

    deals.sort((a, b) => {
      if (b.discountPercent !== a.discountPercent) return b.discountPercent - a.discountPercent;
      return a.distanceM - b.distanceM;
    });
    return deals.slice(0, MAX_DEALS);
  } catch (error) {
    LoggerService.error('加载附近优惠失败:', error);
    return [];
  }
}
