import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = '৳'): string {
  if (typeof amount !== 'number' || isNaN(amount)) return `${currency}0`;
  return `${currency}${amount.toLocaleString('en-US')}`;
}
