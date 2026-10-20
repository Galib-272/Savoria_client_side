/**
 * Auth utilities – role definitions and permission helpers.
 * The logged-in user is stored in localStorage as `rms_user` (JSON)
 * and the JWT token as `rms_token`.
 */

export type UserRole =
  | 'admin'
  | 'manager'
  | 'cashier'
  | 'kitchen'
  | 'waiter'
  | 'delivery'
  | 'customer';

export interface CurrentUser {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  joinDate?: string;
}

/** Read the stored user from localStorage (client-side only). */
export function getStoredUser(): CurrentUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('rms_user');
    return raw ? (JSON.parse(raw) as CurrentUser) : null;
  } catch {
    return null;
  }
}

/** Remove auth data from localStorage (logout). */
export function clearAuth() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('rms_token');
  localStorage.removeItem('rms_user');
}

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

/** Returns true if the given role can access the given dashboard path. */
export function canAccess(role: UserRole, path: string): boolean {
  const allowed = ROLE_ALLOWED_PATHS[role];
  if (!allowed) return false; // unknown role → deny
  if (allowed === '*') return true;
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
