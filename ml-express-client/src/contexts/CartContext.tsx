import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '../services/supabase';
import {
  buildProductForCart,
  cartLineKey,
  productHasVariants,
  resolveProductVariant,
} from '../utils/productVariants';

const PIECE_KEYCAP = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

function pieceKeycapLabel(index: number): string {
  return PIECE_KEYCAP[index] ?? `${index + 1}.`;
}

/** 多件备注压成一行，供购物车展示与订单 description */
export function summarizeCustomerRemarks(remarks: string[]): string | undefined {
  const parts = remarks
    .map((r, i) => (r.trim() ? `${pieceKeycapLabel(i)} ${r.trim()}` : ''))
    .filter(Boolean);
  return parts.length ? parts.join('；') : undefined;
}

function padRemarksToQuantity(remarks: string[], quantity: number): string[] {
  const next = remarks.slice(0, quantity);
  while (next.length < quantity) next.push('');
  return next;
}

function normalizeIncomingRemarks(
  quantity: number,
  input?: string | string[],
): string[] | undefined {
  if (input === undefined) return undefined;
  if (typeof input === 'string') {
    const t = input.trim();
    if (!t) return undefined;
    return padRemarksToQuantity([t], quantity);
  }
  return padRemarksToQuantity(
    input.map((x) => (typeof x === 'string' ? x : '')),
    quantity,
  );
}

export interface CartItem extends Product {
  quantity: number;
  variant_id?: string;
  variant_name?: string;
  customer_remark?: string;
  customer_remarks?: string[];
}

function legacyRemarksToArray(item: CartItem): string[] {
  if (item.customer_remarks && item.customer_remarks.length > 0) {
    return [...item.customer_remarks];
  }
  if (item.customer_remark?.trim()) {
    return padRemarksToQuantity([item.customer_remark.trim()], item.quantity);
  }
  return Array(item.quantity).fill('');
}

export function getCartItemLineKey(item: Pick<CartItem, 'id' | 'variant_id'>): string {
  return cartLineKey(item.id, item.variant_id);
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (
    product: Product,
    quantity: number,
    customerRemark?: string | string[],
    variantId?: string,
  ) => void;
  removeFromCart: (lineKey: string) => void;
  updateQuantity: (lineKey: string, quantity: number) => void;
  updateCartItemDetails: (lineKey: string, quantity: number, customerRemarks: string[]) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const loadCart = async () => {
      try {
        const savedCart = await AsyncStorage.getItem('ml-express-cart');
        if (savedCart) {
          setCartItems(JSON.parse(savedCart));
        }
      } catch (error) {
        console.error('Failed to load cart:', error);
      }
    };
    loadCart();
  }, []);

  useEffect(() => {
    const saveCart = async () => {
      try {
        await AsyncStorage.setItem('ml-express-cart', JSON.stringify(cartItems));
      } catch (error) {
        console.error('Failed to save cart:', error);
      }
    };
    saveCart();
  }, [cartItems]);

  const addToCart = (
    product: Product,
    quantity: number,
    customerRemark?: string | string[],
    variantId?: string,
  ) => {
    if (productHasVariants(product)) {
      if (!variantId) {
        console.warn('addToCart: variant required for multi-spec product', product.id);
        return;
      }
      if (!resolveProductVariant(product, variantId)) {
        console.warn('addToCart: unknown variant for product', product.id, variantId);
        return;
      }
    } else {
      variantId = undefined;
    }

    const variant = resolveProductVariant(product, variantId);
    const lineProduct = buildProductForCart(product, variantId);
    const lineKey = cartLineKey(product.id, variantId);

    setCartItems((prevItems) => {
      if (prevItems.length > 0 && prevItems[0].store_id !== product.store_id) {
        const line: CartItem = {
          ...lineProduct,
          quantity,
          variant_id: variantId,
          variant_name: variant?.name,
        };
        if (customerRemark !== undefined) {
          const remarks = normalizeIncomingRemarks(quantity, customerRemark)!;
          if (remarks.some((r) => r.trim())) {
            line.customer_remarks = remarks;
            line.customer_remark = summarizeCustomerRemarks(remarks);
          }
        }
        return [line];
      }

      const existingItem = prevItems.find((item) => getCartItemLineKey(item) === lineKey);
      if (existingItem) {
        const newQty = existingItem.quantity + quantity;
        return prevItems.map((item) => {
          if (getCartItemLineKey(item) !== lineKey) return item;
          if (customerRemark !== undefined) {
            const incoming = normalizeIncomingRemarks(quantity, customerRemark)!;
            const prevArr = legacyRemarksToArray(item);
            const merged = padRemarksToQuantity([...prevArr, ...incoming], newQty);
            const hasAny = merged.some((r) => r.trim());
            return {
              ...item,
              ...lineProduct,
              quantity: newQty,
              variant_id: variantId,
              variant_name: variant?.name,
              ...(hasAny
                ? {
                    customer_remarks: merged,
                    customer_remark: summarizeCustomerRemarks(merged),
                  }
                : { customer_remarks: undefined, customer_remark: undefined }),
            };
          }
          const prevArr = legacyRemarksToArray(item);
          const merged = padRemarksToQuantity(
            [...prevArr, ...Array(quantity).fill('')],
            newQty,
          );
          const hasAny = merged.some((r) => r.trim());
          return {
            ...item,
            ...lineProduct,
            quantity: newQty,
            variant_id: variantId,
            variant_name: variant?.name,
            ...(hasAny
              ? {
                  customer_remarks: merged,
                  customer_remark: summarizeCustomerRemarks(merged),
                }
              : { customer_remarks: undefined, customer_remark: undefined }),
          };
        });
      }

      const line: CartItem = {
        ...lineProduct,
        quantity,
        variant_id: variantId,
        variant_name: variant?.name,
      };
      if (customerRemark !== undefined) {
        const remarks = normalizeIncomingRemarks(quantity, customerRemark)!;
        if (remarks.some((r) => r.trim())) {
          line.customer_remarks = remarks;
          line.customer_remark = summarizeCustomerRemarks(remarks);
        }
      }
      return [...prevItems, line];
    });
  };

  const updateCartItemDetails = (
    lineKey: string,
    quantity: number,
    customerRemarks: string[],
  ) => {
    if (quantity <= 0) {
      removeFromCart(lineKey);
      return;
    }
    setCartItems((prevItems) =>
      prevItems.map((item) => {
        if (getCartItemLineKey(item) !== lineKey) return item;
        const padded = padRemarksToQuantity(customerRemarks, quantity);
        const hasAny = padded.some((r) => r.trim());
        return {
          ...item,
          quantity,
          ...(hasAny
            ? {
                customer_remarks: padded,
                customer_remark: summarizeCustomerRemarks(padded),
              }
            : { customer_remarks: undefined, customer_remark: undefined }),
        };
      }),
    );
  };

  const removeFromCart = (lineKey: string) => {
    setCartItems((prevItems) =>
      prevItems.filter((item) => getCartItemLineKey(item) !== lineKey),
    );
  };

  const updateQuantity = (lineKey: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(lineKey);
      return;
    }
    setCartItems((prevItems) =>
      prevItems.map((item) => {
        if (getCartItemLineKey(item) !== lineKey) return item;
        const prevArr = legacyRemarksToArray(item);
        const remarks = padRemarksToQuantity(prevArr, quantity);
        const hasAny = remarks.some((r) => r.trim());
        if (!hasAny) {
          return {
            ...item,
            quantity,
            customer_remarks: undefined,
            customer_remark: undefined,
          };
        }
        return {
          ...item,
          quantity,
          customer_remarks: remarks,
          customer_remark: summarizeCustomerRemarks(remarks),
        };
      }),
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const cartTotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        updateCartItemDetails,
        clearCart,
        cartTotal,
        cartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
