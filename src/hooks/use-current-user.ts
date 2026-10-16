'use client';

import { useState, useEffect } from 'react';
import { getStoredUser, type CurrentUser } from '@/lib/auth';

/**
 * Returns the currently logged-in user from localStorage.
 * Re-reads whenever localStorage changes (cross-tab) or on initial mount.
 */
export function useCurrentUser(): CurrentUser | null {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    // Initial read
    setUser(getStoredUser());

    // Keep in sync if another tab logs in/out
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'rms_user') {
        setUser(getStoredUser());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return user;
}
