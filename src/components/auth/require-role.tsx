'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AUTH_CHANGED_EVENT, ROLE_HOME, getStoredUser, type UserRole } from '@/lib/auth';

/**
 * Client-side page guard.
 * - Not signed in → /login?redirect=<this page>
 * - Signed in with a role that may not use this page → that role's own home (staff → their panel)
 * Renders nothing until the check passes, so protected content never flashes.
 */
export function RequireRole({ roles, children }: { roles: UserRole[]; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const check = () => {
      const user = getStoredUser();
      if (!user) {
        setAllowed(false);
        const here = window.location.pathname + window.location.search;
        router.replace(`/login?redirect=${encodeURIComponent(here)}`);
        return;
      }
      if (!roles.includes(user.role)) {
        setAllowed(false);
        router.replace(ROLE_HOME[user.role] || '/');
        return;
      }
      setAllowed(true);
    };
    check();
    window.addEventListener(AUTH_CHANGED_EVENT, check);
    window.addEventListener('storage', check);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, check);
      window.removeEventListener('storage', check);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return allowed ? <>{children}</> : null;
}

/** For /login and /register: anyone already signed in is sent to their own home. */
export function RedirectIfSignedIn({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const user = getStoredUser();
    if (user) router.replace(ROLE_HOME[user.role] || '/');
    else setReady(true);
  }, [router]);
  return ready ? <>{children}</> : null;
}
