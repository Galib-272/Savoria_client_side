'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useCurrentUser } from '@/hooks/use-current-user';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  time?: string;
  createdAt?: string;
  orderId?: string;
  reservationId?: string;
  tableNumber?: number;
  targetRoles?: string[];
}

/** "Just now", "5 min ago", "2 hr ago", "Oct 21" */
export function formatNotificationTime(n: Pick<AppNotification, 'createdAt' | 'time'>, now: number = Date.now()): string {
  if (!n.createdAt) return n.time || '';
  const then = new Date(n.createdAt).getTime();
  if (Number.isNaN(then)) return n.time || '';
  const diff = Math.max(0, Math.floor((now - then) / 1000));
  if (diff < 45) return 'Just now';
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)} hr ago`;
  if (diff < 7 * 86400) return `${Math.round(diff / 86400)} day${diff >= 1.5 * 86400 ? 's' : ''} ago`;
  return new Date(then).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface Options {
  /** Optional action button on the live popup */
  toastAction?: (n: AppNotification) => { label: string; onClick: () => void } | undefined;
}

/**
 * The single source of notifications for a panel (dashboard header or customer bell).
 * - Loads only the signed-in user's notifications from the API
 * - Listens to the server's `notification` event exactly once and ignores repeated ids
 * - Is the ONLY place that shows a popup for a notification (pages just refresh their data)
 * - Read / clear are per user and sync across this user's open tabs
 */
export function useNotifications(options: Options = {}) {
  const user = useCurrentUser();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [, setTick] = useState(0);
  const seen = useRef<Set<string>>(new Set());
  const toastActionRef = useRef(options.toastAction);
  toastActionRef.current = options.toastAction;
  const userKey = user ? `${user.id || user._id}:${user.role}` : '';

  const load = useCallback(async () => {
    try {
      const data: AppNotification[] = await api.getNotifications();
      seen.current = new Set(data.map((n) => n.id));
      setItems(data);
    } catch {
      // handled globally (401 → login)
    }
  }, []);

  useEffect(() => {
    setItems([]);
    seen.current = new Set();
    if (!userKey) return;

    load();
    const socket = getSocket();
    if (!socket) return;

    const onNotification = (n: AppNotification) => {
      if (!n?.id || seen.current.has(n.id)) return; // never show the same notification twice
      seen.current.add(n.id);
      setItems((prev) => [{ ...n, read: false }, ...prev].slice(0, 50));
      toast(n.title, { description: n.message, duration: 6000, action: toastActionRef.current?.(n) });
    };
    const onReadOne = ({ id }: { id: string }) => setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    const onReadAll = () => setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    const onClearedAll = () => setItems([]);
    // After a reconnect (server restart / network drop) re-sync anything we missed
    const onReconnect = () => load();

    socket.on('notification', onNotification);
    socket.on('notification:read_one', onReadOne);
    socket.on('notification:read_all', onReadAll);
    socket.on('notification:cleared_all', onClearedAll);
    socket.io.on('reconnect', onReconnect);

    // refresh relative times ("5 min ago") every minute
    const timer = window.setInterval(() => setTick((t) => t + 1), 60000);

    return () => {
      socket.off('notification', onNotification);
      socket.off('notification:read_one', onReadOne);
      socket.off('notification:read_all', onReadAll);
      socket.off('notification:cleared_all', onClearedAll);
      socket.io.off('reconnect', onReconnect);
      window.clearInterval(timer);
    };
  }, [userKey, load]);

  const markRead = useCallback(async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await api.markNotificationRead(id);
    } catch {
      /* ignore */
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await api.markAllNotificationsRead();
    } catch {
      /* ignore */
    }
  }, []);

  const clearAll = useCallback(async () => {
    setItems([]);
    try {
      await api.clearAllNotifications();
    } catch {
      load();
    }
  }, [load]);

  return {
    user,
    notifications: items,
    unreadCount: items.filter((n) => !n.read).length,
    markRead,
    markAllRead,
    clearAll,
    reload: load,
  };
}
