'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export interface RestaurantSettings {
  name: string;
  tagline?: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  hours?: string;
  currency?: string;
  taxRate: number;
  deliveryFee: number;
}

const DEFAULTS: RestaurantSettings = { name: 'Savoria', taxRate: 10, deliveryFee: 50 };

let cache: RestaurantSettings | null = null;
let inflight: Promise<RestaurantSettings> | null = null;

export const loadRestaurantSettings = (force = false): Promise<RestaurantSettings> => {
  if (cache && !force) return Promise.resolve(cache);
  if (inflight && !force) return inflight;
  const request: Promise<RestaurantSettings> = api
    .getSettings()
    .then((data: any) => {
      const next: RestaurantSettings = {
        ...DEFAULTS,
        ...(data || {}),
        taxRate: Number(data?.taxRate ?? DEFAULTS.taxRate),
        deliveryFee: Number(data?.deliveryFee ?? DEFAULTS.deliveryFee),
      };
      cache = next;
      return next;
    })
    .catch(() => cache || DEFAULTS)
    .finally(() => {
      inflight = null;
    });
  inflight = request;
  return request;
};

/** Restaurant settings (tax rate, delivery fee, contact info) — the same numbers the server uses for totals. */
export function useRestaurantSettings(): RestaurantSettings {
  const [settings, setSettings] = useState<RestaurantSettings>(cache || DEFAULTS);
  useEffect(() => {
    let alive = true;
    loadRestaurantSettings().then((s) => alive && setSettings(s));
    return () => {
      alive = false;
    };
  }, []);
  return settings;
}

/** Same rounding as the server */
export const calcTax = (subtotal: number, taxRate: number) => Math.round((subtotal * taxRate) / 100);
