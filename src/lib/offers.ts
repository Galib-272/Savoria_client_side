import type { Coupon } from './types';

const COLORS = ['from-orange-500 to-red-500', 'from-amber-500 to-orange-500', 'from-green-500 to-teal-500', 'from-blue-500 to-cyan-500'];

export interface OfferCard {
  id: string;
  title: string;
  description: string;
  badge: string;
  color: string;
}

/** Offer banners are generated from the live coupons, so every advertised deal actually works at checkout. */
export const couponsToOffers = (coupons: Coupon[]): OfferCard[] =>
  coupons
    .filter((c) => c.active)
    .slice(0, 4)
    .map((c, i) => ({
      id: c.id || c.code,
      title: c.type === 'percentage' ? `${c.value}% OFF` : `৳${c.value} OFF`,
      description: `${c.minOrder ? `On orders over ৳${c.minOrder}` : 'On any order'}${c.maxDiscount ? ` · up to ৳${c.maxDiscount}` : ''} · valid till ${c.expiry}`,
      badge: `Code ${c.code}`,
      color: COLORS[i % COLORS.length],
    }));
