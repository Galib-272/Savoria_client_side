export interface CartModifier {
  name: string;
  price: number;
}

export interface CartItem {
  /** unique per item + chosen modifiers, so the same dish with different options stays on separate lines */
  key?: string;
  menuItemId: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  modifiers?: CartModifier[];
}

export const cartLineKey = (item: Pick<CartItem, 'menuItemId' | 'modifiers'>): string =>
  `${item.menuItemId}|${(item.modifiers || [])
    .map((m) => m.name)
    .sort()
    .join(',')}`;

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('rms_cart');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // drop leftovers from the old demo menu (ids like "mi-1") — they can't be ordered
    return parsed
      .filter((c: CartItem) => /^[0-9a-fA-F]{24}$/.test(String(c.menuItemId)))
      .map((c: CartItem) => ({ ...c, key: c.key || cartLineKey(c) }));
  } catch {
    return [];
  }
}

export function saveCart(cart: CartItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('rms_cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cart_updated'));
  } catch (err) {
    console.error('Failed to save cart to localStorage', err);
  }
}

import { getStoredUser } from './auth';

export function addToCart(
  item: { id: string; name: string; image: string; price: number; discountPrice?: number },
  quantity: number = 1,
  modifiers: CartModifier[] = []
): boolean {
  const user = getStoredUser();
  // Only customer accounts shop online; staff place orders through the POS
  if (!user || user.role !== 'customer') {
    return false;
  }

  const current = getCart();
  const effectivePrice = item.discountPrice !== undefined && item.discountPrice !== null && item.discountPrice > 0 ? item.discountPrice : item.price;
  const key = cartLineKey({ menuItemId: item.id, modifiers });
  const existingIndex = current.findIndex((c) => c.key === key);

  if (existingIndex > -1) {
    current[existingIndex].quantity = Math.min(99, current[existingIndex].quantity + quantity);
  } else {
    current.push({
      key,
      menuItemId: item.id,
      name: item.name,
      image: item.image,
      price: effectivePrice,
      quantity,
      modifiers,
    });
  }

  saveCart(current);
  return true;
}

export function clearCart() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('rms_cart');
  localStorage.removeItem('rms_coupon');
  window.dispatchEvent(new Event('cart_updated'));
}

// ── Coupon persistence ──
export interface SavedCoupon {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrder?: number;
  maxDiscount?: number;
  discountAmount: number;
}

export function saveCoupon(coupon: SavedCoupon) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('rms_coupon', JSON.stringify(coupon));
}

export function getSavedCoupon(): SavedCoupon | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('rms_coupon');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Minimum spend comes from the coupon itself (validated by the server) — no hard-coded codes in the app. */
export function getCouponMinSpend(_code?: string | null, explicitMinOrder?: number): number {
  return explicitMinOrder !== undefined && explicitMinOrder > 0 ? explicitMinOrder : 0;
}

/** Same discount math as the server (never more than the food subtotal). */
export function computeCouponDiscount(subtotal: number, type: 'percentage' | 'fixed', value: number, maxDiscount?: number): number {
  let d = type === 'percentage' ? Math.round((subtotal * value) / 100) : value;
  if (maxDiscount && d > maxDiscount) d = maxDiscount;
  return Math.max(0, Math.min(d, subtotal));
}

export function clearCoupon() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('rms_coupon');
}
