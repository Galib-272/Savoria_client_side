export interface CartModifier {
  name: string;
  price: number;
}

export interface CartItem {
  menuItemId: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  modifiers?: CartModifier[];
}

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('rms_cart');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
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
  if (!user) {
    return false;
  }

  const current = getCart();
  const effectivePrice = item.discountPrice !== undefined && item.discountPrice !== null ? item.discountPrice : item.price;
  const existingIndex = current.findIndex((c) => c.menuItemId === item.id);

  if (existingIndex > -1) {
    current[existingIndex].quantity += quantity;
  } else {
    current.push({
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
  window.dispatchEvent(new Event('cart_updated'));
}
