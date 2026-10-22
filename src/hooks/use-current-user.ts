'use client';

import { useState, useEffect } from 'react';
import { getStoredUser, AUTH_CHANGED_EVENT, type CurrentUser } from '@/lib/auth';

/**
 * Returns the currently logged-in user from localStorage.
 * Updates on login / logout / profile changes in this tab and in other tabs.
 */
export function useCurrentUser(): CurrentUser | null {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    const refresh = () => setUser(getStoredUser());
    refresh();

    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === 'rms_user' || e.key === 'rms_token') refresh();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(AUTH_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(AUTH_CHANGED_EVENT, refresh);
    };
  }, []);

  return user;
}
