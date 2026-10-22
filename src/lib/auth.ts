/**
 * Auth utilities – role definitions and permission helpers.
 * The logged-in user is stored in localStorage as `rms_user` (JSON)
 * and the JWT token as `rms_token`.
 */
import { resetSocket } from './socket';

export type UserRole =
  | 'admin'
  | 'manager'
  | 'cashier'
  | 'kitchen'
  | 'waiter'
  | 'delivery'
  | 'customer';

export const STAFF_ROLES: UserRole[] = ['admin', 'manager', 'cashier', 'kitchen', 'waiter', 'delivery'];

export interface CurrentUser {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  joinDate?: string;
  isMainAdmin?: boolean;
  permissions?: string[];
}

/** Fired on the window whenever the signed-in user changes in this tab. */
export const AUTH_CHANGED_EVENT = 'rms_auth_changed';

/** Read the stored user from localStorage (client-side only). */
export function getStoredUser(): CurrentUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('rms_user');
    const token = localStorage.getItem('rms_token');
    if (!raw || !token) return null;
    return JSON.parse(raw) as CurrentUser;
  } catch {
    return null;
  }
}

export function setStoredAuth(token: string, user: CurrentUser) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('rms_token', token);
  localStorage.setItem('rms_user', JSON.stringify(user));
  resetSocket();
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function updateStoredUser(patch: Partial<CurrentUser>) {
  if (typeof window === 'undefined') return;
  const current = getStoredUser();
  if (!current) return;
  localStorage.setItem('rms_user', JSON.stringify({ ...current, ...patch }));
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

/** Remove auth data from localStorage (logout) and drop the realtime connection. */
export function clearAuth() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('rms_token');
  localStorage.removeItem('rms_user');
  localStorage.removeItem('rms_cart');
  localStorage.removeItem('rms_coupon');
  // legacy shared notification cache (no longer used)
  localStorage.removeItem('rms_customer_notifications');
  resetSocket();
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
  window.dispatchEvent(new Event('cart_updated'));
}

export const isStaff = (role?: string | null): boolean => !!role && (STAFF_ROLES as string[]).includes(role);

/**
 * Role-to-allowed-routes mapping.
 * Each role lists which dashboard paths it may visit.
 * `*` means full access (admin / manager).
 */
export const ROLE_ALLOWED_PATHS: Record<UserRole, string[] | '*'> = {
  admin: '*',
  manager: '*',
  cashier: ['/dashboard/pos', '/dashboard/orders'],
  kitchen: ['/dashboard/kitchen'],
  waiter: ['/dashboard/tables', '/dashboard/orders', '/dashboard/reservations'],
  delivery: ['/dashboard/delivery', '/dashboard/orders'],
  customer: [],
};

/** Pages only the Main Admin may open (managers are redirected). */
export const ADMIN_ONLY_PATHS = ['/dashboard/audit-logs'];

/** Returns true if the given role can access the given dashboard path. */
export function canAccess(role: UserRole, path: string): boolean {
  const allowed = ROLE_ALLOWED_PATHS[role];
  if (!allowed) return false; // unknown role → deny
  if (allowed === '*') {
    if (role === 'manager' && ADMIN_ONLY_PATHS.some((p) => path === p || path.startsWith(p + '/'))) return false;
    return true;
  }
  return allowed.some((p) => path === p || path.startsWith(p + '/'));
}

/** The default landing page for each role after login. */
export const ROLE_HOME: Record<UserRole, string> = {
  admin: '/dashboard',
  manager: '/dashboard',
  cashier: '/dashboard/pos',
  kitchen: '/dashboard/kitchen',
  waiter: '/dashboard/tables',
  delivery: '/dashboard/delivery',
  customer: '/',
};

/** Only allow same-site relative redirects like "/checkout" (blocks "//evil.com" and "/\\evil.com"). */
export function safeRedirect(target: string | null | undefined): string | null {
  if (!target) return null;
  if (!target.startsWith('/') || target.startsWith('//') || target.startsWith('/\\')) return null;
  return target;
}
